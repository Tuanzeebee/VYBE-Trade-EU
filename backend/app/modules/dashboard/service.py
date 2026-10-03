"""Dashboard exporter và buyer (G1, G2), đo tỷ lệ quay lại có thông tin mới (G3).

Mỗi ô là một hàm độc lập lấy số thật từ module sở hữu dữ liệu (chỉ qua service của họ). Mỗi lần
mở dashboard ghi một dashboard_events kèm dấu vân tay từng ô để so với lần mở trước.
"""

import datetime as dt
import hashlib
import json
import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import entitlements
from app.core.errors import AppError
from app.core.events import publish
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import product_service
from app.modules.companies import service as companies
from app.modules.compliance import service as compliance
from app.modules.copilot import service as copilot
from app.modules.dashboard.events import ProfileViewed
from app.modules.dashboard.journey import JourneyState, build_steps, next_step, track_progress
from app.modules.dashboard.models import DashboardEvent, ProfileView
from app.modules.dashboard.schemas import (
    BuyerDashboard,
    CompletenessData,
    CompletenessTile,
    CopilotTile,
    ExporterDashboard,
    JourneyOut,
    JourneyStepOut,
    MissingItem,
    ProfileViewerOut,
    ProfileViewersOut,
    ProfileViewsData,
    ProfileViewsTile,
    QuestionBrief,
    ReturnVisitStats,
    RfqBrief,
    RfqTile,
    RfqTileData,
    SavedSearchTile,
    SavingsData,
    SavingsTile,
    SupplierBrief,
    SupplierListTile,
    VerificationData,
    VerificationTile,
    WeekStat,
)
from app.modules.markets import report_service as markets
from app.modules.messaging import service as messaging

WEEK = dt.timedelta(days=7)
RECENT_LIMIT = 5
TARGET_RATIO = Decimal("0.90")  # spec §5.8: thông tin mới ở 90% lượt quay lại
VIEW_DEDUPE = dt.timedelta(hours=1)
FREE_VIEWERS = 3  # U19: số buyer hiện tên khi chưa mua "danh sách đầy đủ"


# ── Lượt xem hồ sơ (G1) ────────────────────────────────────────────────────────
async def record_profile_view(
    session: AsyncSession, slug: str, viewer: CurrentUser | None, now: dt.datetime | None = None
) -> None:
    """Ghi một lượt xem hồ sơ công khai. Công ty không hiển thị → 404. Chủ hồ sơ tự xem không tính;
    cùng một công ty xem lại trong vòng một giờ chỉ tính một lần."""
    moment = now or dt.datetime.now(dt.UTC)
    company_id = await product_service.resolve_visible_company(session, slug, moment)
    if company_id is None:
        raise AppError("company_not_found", "Company not found", 404)
    viewer_company = await companies.get_company_id(session, viewer.id) if viewer else None
    if viewer_company == company_id:
        return
    if viewer_company is not None:
        recent = await session.scalar(
            select(func.count())
            .select_from(ProfileView)
            .where(
                ProfileView.company_id == company_id,
                ProfileView.viewer_company_id == viewer_company,
                ProfileView.viewed_at > moment - VIEW_DEDUPE,
            )
        )
        if recent:
            return
    session.add(
        ProfileView(company_id=company_id, viewer_company_id=viewer_company, viewed_at=moment)
    )
    identity = None
    if viewer_company is not None:
        identity = (await companies.get_viewer_identities(session, [viewer_company], moment)).get(
            viewer_company
        )
    await session.commit()
    if identity is not None and identity.identifiable:
        await publish(
            ProfileViewed(
                company_id=company_id,
                viewer_company_id=identity.id,
                viewer_name=identity.legal_name,
                viewer_country=identity.country,
            )
        )


async def list_profile_viewers(
    session: AsyncSession, user: CurrentUser, days: int, now: dt.datetime | None = None
) -> ProfileViewersOut:
    """U9: ai đã xem hồ sơ của công ty người gọi trong `days` ngày. Chưa có công ty → rỗng.
    U19: tên đầy đủ cần quyền profile_viewers_full; chưa có thì chỉ FREE_VIEWERS tên gần nhất."""
    moment = now or dt.datetime.now(dt.UTC)
    empty = ProfileViewersOut(
        days=days, total_views=0, guest_views=0, anonymous_company_views=0, viewers=[]
    )
    company_id = await companies.get_company_id(session, user.id)
    if company_id is None:
        return empty
    rows = (
        await session.execute(
            select(
                ProfileView.viewer_company_id,
                func.count(),
                func.max(ProfileView.viewed_at),
            )
            .where(
                ProfileView.company_id == company_id,
                ProfileView.viewed_at > moment - dt.timedelta(days=days),
            )
            .group_by(ProfileView.viewer_company_id)
        )
    ).all()
    identities = await companies.get_viewer_identities(
        session, [r[0] for r in rows if r[0] is not None], moment
    )
    guests = anonymous = 0
    viewers: list[ProfileViewerOut] = []
    for viewer_id, views, last in rows:
        identity = identities.get(viewer_id) if viewer_id is not None else None
        if viewer_id is None:
            guests += views
        elif identity is None or not identity.identifiable:
            anonymous += views
        else:
            viewers.append(
                ProfileViewerOut(
                    legal_name=identity.legal_name,
                    country=identity.country,
                    business_type=identity.business_type,
                    views=views,
                    last_viewed_at=last,
                )
            )
    viewers.sort(key=lambda v: v.last_viewed_at, reverse=True)
    full = await entitlements.has_feature(session, company_id, entitlements.PROFILE_VIEWERS_FULL)
    shown = viewers if full else viewers[:FREE_VIEWERS]
    return ProfileViewersOut(
        days=days,
        total_views=guests + anonymous + sum(v.views for v in viewers),
        guest_views=guests,
        anonymous_company_views=anonymous,
        viewers=shown,
        full=full,
        hidden_viewers=len(viewers) - len(shown),
    )


# ── Dấu vân tay và ghi sự kiện (G3) ────────────────────────────────────────────
async def last_opened_at(
    session: AsyncSession, user_ids: list[uuid.UUID]
) -> dict[uuid.UUID, dt.datetime]:
    """Lần mở dashboard gần nhất của từng người (J4): tín hiệu "còn dùng" tốt hơn last_login_at vì
    phiên đăng nhập kéo dài. Người chưa từng mở thì vắng trong kết quả."""
    if not user_ids:
        return {}
    rows = await session.execute(
        select(DashboardEvent.user_id, func.max(DashboardEvent.opened_at))
        .where(DashboardEvent.user_id.in_(user_ids))
        .group_by(DashboardEvent.user_id)
    )
    return {uid: opened for uid, opened in rows.all()}


def _fingerprint(data: Any) -> str:
    raw = json.dumps(data, sort_keys=True, default=str, ensure_ascii=False)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


async def _record_open(
    session: AsyncSession,
    user: CurrentUser,
    fingerprints: dict[str, Any],
    now: dt.datetime,
) -> None:
    hashes = {name: _fingerprint(value) for name, value in fingerprints.items()}
    previous = await session.scalar(
        select(DashboardEvent)
        .where(DashboardEvent.user_id == user.id)
        .order_by(DashboardEvent.opened_at.desc(), DashboardEvent.id)
        .limit(1)
    )
    is_return = previous is not None
    session.add(
        DashboardEvent(
            user_id=user.id,
            role=user.role,
            opened_at=now,
            is_return_visit=is_return,
            had_new_info=is_return and previous is not None and previous.tile_hashes != hashes,
            tile_hashes=hashes,
        )
    )
    await session.commit()


def _rfq_tile(summary_counts: dict[str, int], data: RfqTileData, hint: str) -> RfqTile:
    return RfqTile(data=data, empty_hint_key=None if summary_counts and data.total else hint)


async def _rfq_tile_for(
    session: AsyncSession, user: CurrentUser, now: dt.datetime, hint: str
) -> RfqTile:
    summary = await messaging.summarize_rfqs(session, user, since=now - WEEK)
    counterpart = "buyer_name" if user.role == "exporter" else "exporter_name"
    data = RfqTileData(
        counts=summary.counts,
        total=summary.total,
        new_this_week=summary.created_since,
        recent=[
            RfqBrief(
                id=r.id,
                counterpart_name=getattr(r, counterpart),
                product_name=r.product_name,
                status=r.status.value,
                created_at=r.created_at,
            )
            for r in summary.recent
        ],
    )
    return _rfq_tile(summary.counts, data, hint)


# ── Exporter (G1) ──────────────────────────────────────────────────────────────
async def _completeness_tile(session: AsyncSession, user: CurrentUser) -> CompletenessTile:
    try:
        result = await companies.get_completeness(session, user)
    except AppError:
        return CompletenessTile(data=None, empty_hint_key="create_company")
    return CompletenessTile(
        data=CompletenessData(
            score=str(result.score),
            missing=[MissingItem(field=m.field, group=m.group) for m in result.missing],
        )
    )


async def _profile_views_tile(
    session: AsyncSession, company_id: uuid.UUID | None, now: dt.datetime
) -> ProfileViewsTile:
    if company_id is None:
        return ProfileViewsTile(data=None, empty_hint_key="create_company")

    async def count(start: dt.datetime, end: dt.datetime) -> int:
        return (
            await session.scalar(
                select(func.count())
                .select_from(ProfileView)
                .where(
                    ProfileView.company_id == company_id,
                    ProfileView.viewed_at > start,
                    ProfileView.viewed_at <= end,
                )
            )
            or 0
        )

    this_week = await count(now - WEEK, now)
    previous_week = await count(now - 2 * WEEK, now - WEEK)
    return ProfileViewsTile(
        data=ProfileViewsData(this_week=this_week, previous_week=previous_week),
        empty_hint_key=None if this_week or previous_week else "no_profile_views",
    )


async def _verification_tile(
    session: AsyncSession, company_id: uuid.UUID | None, now: dt.datetime
) -> VerificationTile:
    if company_id is None:
        return VerificationTile(data=None, empty_hint_key="create_company")
    state = await companies.get_verification_state(session, company_id)
    days_left = (
        max((state.expires_at - now).days, 0)
        if state.status == "verified" and state.expires_at
        else None
    )
    return VerificationTile(
        data=VerificationData(
            status=state.status,
            level=state.level,
            expires_at=state.expires_at,
            days_left=days_left,
        ),
        empty_hint_key="start_verification" if state.status in ("unverified", "rejected") else None,
    )


async def _savings_tile(session: AsyncSession, company_id: uuid.UUID | None) -> SavingsTile:
    if company_id is None:
        return SavingsTile(data=None, empty_hint_key="create_company")
    total, runs = await compliance.sum_tariff_savings(session, company_id)
    return SavingsTile(
        data=SavingsData(total_eur=str(total.quantize(Decimal("0.01"))), runs=runs),
        empty_hint_key=None if runs else "no_tariff_runs",
    )


async def _copilot_tile(session: AsyncSession, user: CurrentUser) -> CopilotTile:
    rows = await copilot.recent_questions(session, user.id, RECENT_LIMIT)
    items = [
        QuestionBrief(
            id=r.id, question=r.question, confidence=r.confidence, created_at=r.created_at
        )
        for r in rows
    ]
    return CopilotTile(data=items, empty_hint_key=None if items else "no_copilot_questions")


async def _journey(
    session: AsyncSession,
    company_id: uuid.UUID | None,
    completeness: CompletenessTile,
    verification: VerificationTile,
    savings: SavingsTile,
    rfqs: RfqTile,
) -> JourneyOut:
    score = Decimal(completeness.data.score) if completeness.data else Decimal(0)
    products = (
        await product_service.count_company_products(session, company_id) if company_id else 0
    )
    state = JourneyState(
        has_company=company_id is not None,
        completeness_score=score,
        product_count=products,
        verification_status=verification.data.status if verification.data else "unverified",
        gtm_report_count=await markets.count_reports(session, company_id) if company_id else 0,
        tariff_runs=savings.data.runs if savings.data else 0,
        rfq_total=rfqs.data.total if rfqs.data else 0,
    )
    steps = build_steps(state)
    product_done, product_total = track_progress(steps, "product")
    sales_done, sales_total = track_progress(steps, "sales")
    return JourneyOut(
        next_step=next_step(state),
        steps=[JourneyStepOut(key=s.key, track=s.track, done=s.done) for s in steps],
        product_done=product_done,
        product_total=product_total,
        sales_done=sales_done,
        sales_total=sales_total,
    )


async def exporter_dashboard(
    session: AsyncSession, user: CurrentUser, now: dt.datetime | None = None
) -> ExporterDashboard:
    moment = now or dt.datetime.now(dt.UTC)
    company_id = await companies.get_company_id(session, user.id)
    completeness = await _completeness_tile(session, user)
    rfqs = await _rfq_tile_for(session, user, moment, "no_rfqs_received")
    verification_tile = await _verification_tile(session, company_id, moment)
    savings = await _savings_tile(session, company_id)
    dashboard = ExporterDashboard(
        completeness=completeness,
        profile_views=await _profile_views_tile(session, company_id, moment),
        rfqs=rfqs,
        verification=verification_tile,
        tariff_savings=savings,
        copilot=await _copilot_tile(session, user),
        journey=await _journey(session, company_id, completeness, verification_tile, savings, rfqs),
    )
    verification = dashboard.verification.data
    await _record_open(
        session,
        user,
        {
            "completeness": dashboard.completeness.data,
            "profile_views": dashboard.profile_views.data,
            "rfqs": dashboard.rfqs.data,
            # Đếm ngược thay đổi mỗi ngày nên không tính là thông tin mới.
            "verification": verification.model_dump(exclude={"days_left"})
            if verification
            else None,
            "tariff_savings": dashboard.tariff_savings.data,
            "copilot": dashboard.copilot.data,
            "journey": dashboard.journey.model_dump(),
        },
        moment,
    )
    return dashboard


# ── Buyer (G2) ─────────────────────────────────────────────────────────────────
async def _recently_viewed_tile(
    session: AsyncSession, company_id: uuid.UUID | None, now: dt.datetime
) -> SupplierListTile:
    if company_id is None:
        return SupplierListTile(data=[], empty_hint_key="create_company")
    rows = (
        await session.execute(
            select(ProfileView.company_id, func.max(ProfileView.viewed_at).label("last"))
            .where(ProfileView.viewer_company_id == company_id)
            .group_by(ProfileView.company_id)
            .order_by(func.max(ProfileView.viewed_at).desc())
            .limit(RECENT_LIMIT * 3)  # dư để bù công ty đã bị ẩn
        )
    ).all()
    refs = await product_service.get_visible_refs(session, [r.company_id for r in rows], now)
    items = [
        SupplierBrief(
            slug=refs[r.company_id].slug,
            name=refs[r.company_id].legal_name,
            country=refs[r.company_id].country,
            at=r.last,
        )
        for r in rows
        if r.company_id in refs
    ][:RECENT_LIMIT]
    return SupplierListTile(data=items, empty_hint_key=None if items else "no_recent_suppliers")


async def _new_verified_tile(
    session: AsyncSession, company_id: uuid.UUID | None, now: dt.datetime
) -> SupplierListTile:
    if company_id is None:
        return SupplierListTile(data=[], empty_hint_key="create_company")
    categories = await companies.get_sourcing_categories(session, company_id)
    if not categories:
        return SupplierListTile(data=[], empty_hint_key="set_sourcing_categories")
    refs = await product_service.list_recently_verified(
        session, industries=categories, since=now - WEEK, now=now, limit=RECENT_LIMIT
    )
    items = [
        SupplierBrief(slug=r.slug, name=r.legal_name, country=r.country, at=r.verified_at)
        for r in refs
    ]
    return SupplierListTile(data=items, empty_hint_key=None if items else "no_new_verified")


async def buyer_dashboard(
    session: AsyncSession, user: CurrentUser, now: dt.datetime | None = None
) -> BuyerDashboard:
    moment = now or dt.datetime.now(dt.UTC)
    company_id = await companies.get_company_id(session, user.id)
    dashboard = BuyerDashboard(
        saved_searches=SavedSearchTile(data=[], empty_hint_key="saved_searches_coming_soon"),
        rfqs_sent=await _rfq_tile_for(session, user, moment, "no_rfqs_sent"),
        recently_viewed=await _recently_viewed_tile(session, company_id, moment),
        new_verified=await _new_verified_tile(session, company_id, moment),
    )
    await _record_open(
        session,
        user,
        {
            "saved_searches": dashboard.saved_searches.data,
            "rfqs_sent": dashboard.rfqs_sent.data,
            "recently_viewed": dashboard.recently_viewed.data,
            "new_verified": dashboard.new_verified.data,
        },
        moment,
    )
    return dashboard


# ── Đo tỷ lệ quay lại có thông tin mới (G3) ───────────────────────────────────────
def _ratio(part: int, whole: int) -> str | None:
    if whole == 0:
        return None
    return str((Decimal(part) / Decimal(whole)).quantize(Decimal("0.0001")))


async def return_visit_stats(
    session: AsyncSession, weeks: int = 8, now: dt.datetime | None = None
) -> ReturnVisitStats:
    """Theo tuần (bắt đầu thứ Hai, UTC): trong các lượt QUAY LẠI, bao nhiêu có ô thay đổi so với
    lần mở trước. Lần mở đầu tiên của một người không tính (chưa có gì để so)."""
    moment = now or dt.datetime.now(dt.UTC)
    week = func.date_trunc("week", DashboardEvent.opened_at)
    rows = (
        await session.execute(
            select(
                week.label("week"),
                func.count().label("returns"),
                func.count().filter(DashboardEvent.had_new_info).label("with_new"),
            )
            .where(
                DashboardEvent.is_return_visit.is_(True),
                DashboardEvent.opened_at >= moment - dt.timedelta(weeks=weeks),
            )
            .group_by(week)
            .order_by(week)
        )
    ).all()
    stats = [
        WeekStat(
            week_start=r.week.date(),
            return_visits=r.returns,
            with_new_info=r.with_new,
            ratio=_ratio(r.with_new, r.returns),
        )
        for r in rows
    ]
    total = sum(s.return_visits for s in stats)
    with_new = sum(s.with_new_info for s in stats)
    return ReturnVisitStats(
        weeks=stats, overall_ratio=_ratio(with_new, total), target_ratio=str(TARGET_RATIO)
    )
