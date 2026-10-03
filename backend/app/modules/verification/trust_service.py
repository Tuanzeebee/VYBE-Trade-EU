"""Điểm tín nhiệm seller (U23, ADR-0004): gom dữ kiện rồi áp hàm thuần trust.compute().

- Chủ hồ sơ và admin luôn xem được; công khai trên hồ sơ chỉ khi TRUST_SCORE_PUBLIC bật.
- Không bao giờ là đầu vào của decide() và không dùng để xếp thứ tự danh bạ.
"""

import datetime as dt
import uuid

from sqlalchemy import ColumnElement, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import product_service
from app.modules.companies import service as companies
from app.modules.compliance.service import demo_enabled
from app.modules.messaging import service as messaging
from app.modules.verification import checks_service, evidence_service
from app.modules.verification.consistency import EXPORT_EVIDENCE_TYPES
from app.modules.verification.models import EvidenceType, TrustCriterion
from app.modules.verification.schemas import (
    TrustComponentOut,
    TrustCriterionOut,
    TrustScoreOut,
)
from app.modules.verification.trust import Criterion, TrustFacts, compute

BEHAVIOUR_WINDOW = dt.timedelta(days=90)
CERTIFICATE_GROUPS = ("quality", "social", "technical", "lab")
METHOD_URL = "/trust-score"
DISCLAIMER_VI = (
    "Điểm do hệ thống VYBE Trade tính theo phương pháp công bố. Không phải chứng nhận hay xếp hạng "
    "tín dụng."
)
DISCLAIMER_EN = (
    "Score computed by VYBE Trade using a published method. Not a certification or credit rating."
)
COMPONENT_LABELS = {
    "documents": ("Giấy tờ đã kiểm", "Checked documents"),
    "automated": ("Kiểm tự động", "Automated checks"),
    "behaviour": ("Hành vi trên nền tảng", "Platform behaviour"),
}


async def usable_criteria(session: AsyncSession) -> list[Criterion]:
    """Tiêu chí đã duyệt; thêm tiêu chí minh hoạ (is_demo) khi bật DEMO ngoài production."""
    condition: ColumnElement[bool] = TrustCriterion.reviewed_by.is_not(None)
    if demo_enabled():
        condition = or_(condition, TrustCriterion.is_demo.is_(True))
    rows = await session.scalars(
        select(TrustCriterion)
        .where(TrustCriterion.is_active.is_(True), condition)
        .order_by(TrustCriterion.component, TrustCriterion.sort_order)
    )
    return [
        Criterion(
            component=r.component,
            fact_key=r.fact_key,
            label_vi=r.label_vi,
            label_en=r.label_en,
            weight=r.weight,
            draft=r.reviewed_by is None,
        )
        for r in rows
    ]


async def _facts(session: AsyncSession, company_id: uuid.UUID, now: dt.datetime) -> TrustFacts:
    company = await companies.get_company_for_review(session, company_id)
    states = await evidence_service.evidence_states(session, company_id, now.date())
    groups: dict[str, str] = {
        code: group
        for code, group in await session.execute(select(EvidenceType.code, EvidenceType.group))
    }
    approved = {code for code, state in states.items() if state == "approved"}
    stats = await messaging.seller_response_stats(session, company_id, now - BEHAVIOUR_WINDOW)
    self_declared = [
        key
        for key, present in (
            ("capacity", company.capacity_value is not None),
            ("main_customers", bool(company.main_customers)),
            ("export_markets", bool(company.export_markets)),
            ("products", bool(await product_service.list_active_hs_codes(session, company_id))),
        )
        if present
    ]
    return TrustFacts(
        verified=company.verification_status == "verified",
        tier=company.verification_tier if company.verification_status == "verified" else 0,
        valid_certificates=sum(1 for c in approved if groups.get(c) in CERTIFICATE_GROUPS),
        export_evidence=bool(approved & EXPORT_EVIDENCE_TYPES),
        passed_checks=await checks_service.passed_check_codes(session, company_id),
        conversations=stats.conversations,
        replied=stats.replied,
        median_reply_hours=stats.median_reply_hours,
        rfqs=stats.rfqs,
        quoted=stats.quoted,
        self_declared=self_declared,
    )


async def score_for(
    session: AsyncSession, company_id: uuid.UUID, now: dt.datetime | None = None
) -> TrustScoreOut:
    moment = now or dt.datetime.now(dt.UTC)
    facts = await _facts(session, company_id, moment)
    result = compute(await usable_criteria(session), facts)
    return TrustScoreOut(
        score=result.score,
        computed_at=moment,
        new_on_platform=result.new_on_platform,
        uses_draft_criteria=result.uses_draft_criteria,
        method_url=METHOD_URL,
        disclaimer_vi=DISCLAIMER_VI,
        disclaimer_en=DISCLAIMER_EN,
        components=[
            TrustComponentOut(
                component=c.component,
                label_vi=COMPONENT_LABELS[c.component][0],
                label_en=COMPONENT_LABELS[c.component][1],
                score=c.score,
                criteria=[
                    TrustCriterionOut(
                        fact_key=r.criterion.fact_key,
                        label_vi=r.criterion.label_vi,
                        label_en=r.criterion.label_en,
                        weight=r.criterion.weight,
                        value=r.value,
                        draft=r.criterion.draft,
                    )
                    for r in c.criteria
                ],
            )
            for c in result.components
        ],
        self_declared=facts.self_declared,
    )


async def my_score(session: AsyncSession, user: CurrentUser) -> TrustScoreOut:
    if user.role != "exporter":
        raise AppError("forbidden", "Trust scores are for sellers only", 403)
    company_id = await companies.get_company_id(session, user.id)
    if company_id is None:
        raise AppError("company_not_found", "Company profile not created yet", 404)
    return await score_for(session, company_id)


async def public_score(session: AsyncSession, slug: str) -> TrustScoreOut:
    """Công khai chỉ khi TRUST_SCORE_PUBLIC bật (staging); production chờ pháp lý/GDPR duyệt."""
    if not get_settings().trust_score_public:
        raise AppError("trust_score_not_public", "Trust score is not public", 404)
    moment = dt.datetime.now(dt.UTC)
    company_id = await product_service.resolve_visible_company(session, slug, moment)
    if company_id is None:
        raise AppError("company_not_found", "Company not found", 404)
    return await score_for(session, company_id, moment)


async def public_criteria(session: AsyncSession) -> list[TrustCriterionOut]:
    """Phương pháp công bố (/trust-score): tiêu chí và trọng số đang dùng."""
    return [
        TrustCriterionOut(
            fact_key=c.fact_key,
            label_vi=c.label_vi,
            label_en=c.label_en,
            weight=c.weight,
            value=None,
            draft=c.draft,
            component=c.component,
        )
        for c in await usable_criteria(session)
    ]
