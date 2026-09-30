"""Cấp xác minh (U20, ADR-0004): tổng quan cấp của công ty, yêu cầu lên cấp, admin hạ cấp, job
đồng bộ cấp. Cấp chỉ đổi qua service.decide(); kiểm tự động (U21) chỉ là tín hiệu cho admin.
"""

import datetime as dt
import uuid
from collections.abc import Awaitable, Callable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import entitlements
from app.core.errors import AppError
from app.core.events import publish
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import service as companies
from app.modules.companies.schemas import CompanyOut
from app.modules.verification import evidence_service
from app.modules.verification.events import VerificationStatusChanged
from app.modules.verification.models import (
    ApprovalStatus,
    Decision,
    Evidence,
    RequestStatus,
    TierRequirement,
    VerificationRequest,
)
from app.modules.verification.schemas import (
    TierDownIn,
    TierOverviewOut,
    TierRequestIn,
    TierRequirementOut,
    VerificationRequestOut,
)
from app.modules.verification.service import decide, expire_tiers_due
from app.modules.verification.tiers import (
    MAX_TIER,
    PAID_TIERS,
    TIER_NAMES,
    Requirement,
    company_kind,
    expired_reviewed_evidence,
    requirement_state,
    tier_request_error,
)

# Kiểm tự động đã đạt (U21 đăng ký nguồn thật); mặc định chưa có kiểm nào.
PassedChecks = Callable[[AsyncSession, uuid.UUID], Awaitable[set[str]]]


async def _no_checks(session: AsyncSession, company_id: uuid.UUID) -> set[str]:
    return set()


_passed_checks: PassedChecks = _no_checks


def set_passed_checks(source: PassedChecks) -> PassedChecks:
    global _passed_checks
    previous, _passed_checks = _passed_checks, source
    return previous


def _kind(company: CompanyOut) -> str:
    return company_kind(company.type, company.offering_type)


async def _requirements(session: AsyncSession, kind: str) -> list[Requirement]:
    rows = await session.scalars(
        select(TierRequirement)
        .where(TierRequirement.company_kind == kind)
        .order_by(TierRequirement.tier, TierRequirement.sort_order, TierRequirement.code)
    )
    return [
        Requirement(
            tier=r.tier,
            kind=r.kind,
            code=r.code,
            label_vi=r.label_vi,
            label_en=r.label_en,
            is_required=r.is_required,
            reviewed=r.reviewed_by is not None,
        )
        for r in rows
    ]


async def requirements_for(
    session: AsyncSession, company: CompanyOut, up_to_tier: int
) -> list[TierRequirementOut]:
    """Danh sách kiểm các cấp 1..up_to_tier kèm trạng thái hiện tại của công ty."""
    states = await evidence_service.evidence_states(session, company.id)
    checks = await _passed_checks(session, company.id)
    return [
        TierRequirementOut(
            tier=r.tier,
            kind=r.kind,
            code=r.code,
            label_vi=r.label_vi,
            label_en=r.label_en,
            is_required=r.is_required,
            reviewed=r.reviewed,
            state=requirement_state(r, states, checks),
        )
        for r in await _requirements(session, _kind(company))
        if r.tier <= up_to_tier
    ]


async def _owner(session: AsyncSession, user: CurrentUser) -> CompanyOut:
    if user.role not in ("exporter", "buyer"):
        raise AppError("forbidden", "Not allowed for this role", 403)
    company_id = await companies.get_company_id(session, user.id)
    if company_id is None:
        raise AppError("company_not_found", "Company profile not created yet", 404)
    return await companies.get_company_for_review(session, company_id)


async def _pending_tier_request(session: AsyncSession, company_id: uuid.UUID) -> bool:
    found = await session.scalar(
        select(VerificationRequest.id).where(
            VerificationRequest.company_id == company_id,
            VerificationRequest.status == RequestStatus.pending,
            VerificationRequest.target_tier >= 2,
        )
    )
    return found is not None


def _max_tier(kind: str) -> int:
    return {"buyer": 1, "service_provider": 2}.get(kind, MAX_TIER)


async def overview(session: AsyncSession, user: CurrentUser) -> TierOverviewOut:
    company = await _owner(session, user)
    kind = _kind(company)
    tier = company.verification_tier if company.verification_status == "verified" else 0
    next_tier = tier + 1 if 1 <= tier < _max_tier(kind) else None
    entitled = await entitlements.has_feature(
        session, company.id, entitlements.VERIFICATION_ENHANCED
    )
    pending = await _pending_tier_request(session, company.id)
    error = (
        tier_request_error(
            company.verification_status, tier, next_tier, entitled=entitled, pending=pending
        )
        if next_tier
        else None
    )
    return TierOverviewOut(
        company_kind=kind,
        status=company.verification_status,
        tier=tier,
        tier_name_vi=TIER_NAMES[tier][0],
        tier_name_en=TIER_NAMES[tier][1],
        verified_at=company.verified_at,
        tier_reviewed_at=company.tier_reviewed_at,
        tier_expires_at=company.tier_expires_at,
        expires_at=company.expires_at,
        next_tier=next_tier,
        next_tier_paid=next_tier in PAID_TIERS,
        entitled=entitled,
        pending_tier_request=pending,
        request_error=error,
        requirements=await requirements_for(session, company, _max_tier(kind)),
    )


async def request_tier(
    session: AsyncSession, user: CurrentUser, data: TierRequestIn
) -> VerificationRequestOut:
    """Seller xin lên cấp: cấp Nâng cao cần quyền đã trả phí. Không đổi trạng thái công ty; admin
    quyết định trên hàng đợi (decide tier_up)."""
    from app.modules.verification.request_service import _out

    company = await _owner(session, user)
    kind = _kind(company)
    if data.target_tier > _max_tier(kind):
        raise AppError("invalid_target", "This tier is not available for your company", 422)
    tier = company.verification_tier if company.verification_status == "verified" else 0
    entitled = await entitlements.has_feature(
        session, company.id, entitlements.VERIFICATION_ENHANCED
    )
    error = tier_request_error(
        company.verification_status,
        tier,
        data.target_tier,
        entitled=entitled,
        pending=await _pending_tier_request(session, company.id),
    )
    if error is not None:
        status = {"entitlement_required": 402, "request_pending": 409}.get(error, 422)
        raise AppError(error, "Cannot request this verification tier now", status)
    evidence_ids = list(
        await session.scalars(
            select(Evidence.id)
            .where(
                Evidence.company_id == company.id,
                Evidence.approval_status != ApprovalStatus.rejected,
            )
            .order_by(Evidence.created_at)
        )
    )
    row = VerificationRequest(
        company_id=company.id, submitted_evidence_ids=evidence_ids, target_tier=data.target_tier
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return _out(row)


async def admin_tier_down(
    session: AsyncSession, admin: CurrentUser, company_id: uuid.UUID, data: TierDownIn
) -> None:
    """Admin hạ một cấp (bắt buộc lý do), vd chứng nhận bị tổ chức cấp thu hồi."""
    await decide(
        session,
        company_id=company_id,
        decision=Decision.tier_down,
        reviewer=admin,
        reason=data.reason,
    )


async def sync_tiers(session: AsyncSession, now: dt.datetime) -> int:
    """Job hằng ngày: hạ cấp khi hạn cấp đã qua, hoặc bằng chứng bắt buộc ĐÃ DUYỆT của cấp không
    còn hợp lệ. Trả số lần hạ cấp. Nháp chưa duyệt không làm hạ cấp."""
    lowered = await expire_tiers_due(session, now)
    events: list[VerificationStatusChanged] = []
    for company_id, company_type, offering, tier in await companies.list_companies_at_tier(
        session, 2
    ):
        requirements = await _requirements(session, company_kind(company_type, offering))
        states = await evidence_service.evidence_states(session, company_id, now.date())
        if expired_reviewed_evidence(requirements, states, tier):
            await decide(
                session,
                company_id=company_id,
                decision=Decision.tier_down,
                reviewer=None,
                reason="evidence_missing_or_expired",
                now=now,
                commit=False,
                events=events,
            )
            lowered += 1
    if events:
        await session.commit()
    for event in events:
        await publish(event)
    return lowered
