"""Yêu cầu xác minh: exporter nộp, admin xem hàng đợi và quyết định (I1, I2).

Buyer cũng nộp được (xác minh tùy chọn B1, ADR-0004) nhưng không bao giờ BẮT BUỘC: buyer chưa
xác minh vẫn xem, nhắn tin và gửi RFQ trong hạn mức. Trạng thái xác minh của công ty chỉ đổi qua
service.decide(); ở đây chỉ điều phối bản ghi yêu cầu.
"""

import datetime as dt
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.errors import AppError
from app.core.events import publish
from app.core.storage import Storage
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import product_service
from app.modules.companies import service as companies
from app.modules.verification import (
    checks_service,
    consistency_service,
    evidence_service,
    identity_service,
    tier_service,
)
from app.modules.verification.events import VerificationStatusChanged
from app.modules.verification.identity import SEVERITY_RANK
from app.modules.verification.models import (
    ApprovalStatus,
    Decision,
    Evidence,
    RequestStatus,
    VerificationRequest,
)
from app.modules.verification.schemas import DecisionIn, QueueItem, VerificationRequestOut
from app.modules.verification.service import decide

_DECISIONS = {
    "approve": (Decision.approve, RequestStatus.approved),
    "reject": (Decision.reject, RequestStatus.rejected),
    "request_info": (Decision.request_info, RequestStatus.info_requested),
}


def _out(row: VerificationRequest) -> VerificationRequestOut:
    return VerificationRequestOut(
        id=row.id,
        company_id=row.company_id,
        status=row.status.value,
        evidence_ids=list(row.submitted_evidence_ids),
        submitted_at=row.submitted_at,
        reviewed_at=row.reviewed_at,
        decision_reason=row.decision_reason,
        target_tier=row.target_tier,
    )


async def _owner_company_id(session: AsyncSession, user: CurrentUser) -> uuid.UUID:
    if user.role not in ("exporter", "buyer"):
        raise AppError("forbidden", "Not allowed for this role", 403)
    company_id = await companies.get_company_id(session, user.id)
    if company_id is None:
        raise AppError("company_not_found", "Company profile not created yet", 404)
    return company_id


async def _check_buyer_identifiers(session: AsyncSession, company_id: uuid.UUID) -> None:
    """KYB nhẹ của buyer cần ít nhất một định danh để admin đối chiếu (VIES với VAT, sổ đăng ký)."""
    company = await companies.get_company_for_review(session, company_id)
    if not (company.vat_number or company.registration_number):
        raise AppError(
            "identifier_required",
            "Add your VAT number or company registration number before requesting verification",
            422,
        )


async def submit_request(session: AsyncSession, user: CurrentUser) -> VerificationRequestOut:
    """Chủ công ty nộp yêu cầu xác minh: công ty → pending (qua decide), chụp bằng chứng."""
    company_id = await _owner_company_id(session, user)
    if user.role == "buyer":
        await _check_buyer_identifiers(session, company_id)
    evidence_ids = list(
        await session.scalars(
            select(Evidence.id)
            .where(
                Evidence.company_id == company_id,
                Evidence.approval_status != ApprovalStatus.rejected,
            )
            .order_by(Evidence.created_at)
        )
    )
    events: list[VerificationStatusChanged] = []
    await decide(
        session,
        company_id=company_id,
        decision=Decision.submit,
        reviewer=user,
        commit=False,
        events=events,
    )
    row = VerificationRequest(company_id=company_id, submitted_evidence_ids=evidence_ids)
    session.add(row)
    await session.commit()
    await session.refresh(row)
    for event in events:
        await publish(event)
    await checks_service.enqueue_checks(company_id)
    return _out(row)


async def list_my_requests(
    session: AsyncSession, user: CurrentUser
) -> list[VerificationRequestOut]:
    company_id = await _owner_company_id(session, user)
    rows = await session.scalars(
        select(VerificationRequest)
        .where(VerificationRequest.company_id == company_id)
        .order_by(VerificationRequest.submitted_at.desc())
    )
    return [_out(r) for r in rows]


async def queue(session: AsyncSession, storage: Storage) -> list[QueueItem]:
    """Yêu cầu đang chờ, cũ nhất trước, kèm bằng chứng và URL xem file có hạn ngắn."""
    requests = list(
        await session.scalars(
            select(VerificationRequest)
            .where(VerificationRequest.status == RequestStatus.pending)
            .order_by(VerificationRequest.submitted_at, VerificationRequest.id)
        )
    )
    summaries = await companies.get_company_summaries(session, [r.company_id for r in requests])
    flags = await identity_service.signals_for(session, [r.company_id for r in requests])
    items: list[QueueItem] = []
    for request in requests:
        summary = summaries[request.company_id]
        company = await companies.get_company_for_review(session, request.company_id)
        evidence_rows = list(
            await session.scalars(
                select(Evidence)
                .where(Evidence.id.in_(request.submitted_evidence_ids or [uuid.uuid4()]))
                .order_by(Evidence.created_at)
            )
        )
        items.append(
            QueueItem(
                request_id=request.id,
                company_id=request.company_id,
                legal_name=summary.legal_name,
                tax_id=summary.tax_id,
                country=summary.country,
                submitted_at=request.submitted_at,
                evidences=[
                    await evidence_service.to_out(session, storage, e) for e in evidence_rows
                ],
                company=company,
                products=await product_service.list_products_for_review(
                    session, request.company_id
                ),
                target_tier=request.target_tier,
                current_tier=company.verification_tier,
                tier_requirements=await tier_service.requirements_for(
                    session, company, request.target_tier
                ),
                checks=await checks_service.latest_checks(session, request.company_id),
                findings=await consistency_service.findings_for(session, request.company_id),
                signals=flags[request.company_id],
                ownership_proven=await evidence_service.ownership_proven_for(
                    session, request.company_id
                ),
            )
        )
    # I11: cờ danh tính chỉ đẩy hồ sơ lên đầu (mức cao nhất trước), không tự quyết định gì.
    # sorted ổn định → cùng mức giữ thứ tự cũ nhất trước.
    return sorted(
        items, key=lambda i: -max((SEVERITY_RANK[s.severity] for s in i.signals), default=0)
    )


async def decide_request(
    session: AsyncSession, admin: CurrentUser, request_id: uuid.UUID, data: DecisionIn
) -> VerificationRequestOut:
    """Admin duyệt / từ chối / yêu cầu bổ sung một yêu cầu đang chờ (lý do bắt buộc khi từ chối hoặc
    yêu cầu bổ sung). Duyệt xong thì mức EVFTA-verified được đồng bộ theo bằng chứng."""
    row = await session.get(VerificationRequest, request_id)
    if row is None:
        raise AppError("request_not_found", "Verification request not found", 404)
    if row.status is not RequestStatus.pending:
        raise AppError("request_already_decided", "This request was already decided", 409)
    if row.target_tier >= 2:
        return await _decide_tier_request(session, admin, row, data)
    decision, request_status = _DECISIONS[data.decision]
    events: list[VerificationStatusChanged] = []
    await decide(
        session,
        company_id=row.company_id,
        decision=decision,
        reviewer=admin,
        reason=data.reason,
        commit=False,
        events=events,
    )
    row.status = request_status
    row.reviewed_at = dt.datetime.now(dt.UTC)
    row.decision_reason = (data.reason or "").strip() or None
    if decision is Decision.approve:
        await evidence_service.sync_level(session, row.company_id, commit=False)
    await session.commit()
    await session.refresh(row)
    for event in events:
        await publish(event)
    return _out(row)


async def _decide_tier_request(
    session: AsyncSession, admin: CurrentUser, row: VerificationRequest, data: DecisionIn
) -> VerificationRequestOut:
    """U20: duyệt yêu cầu lên cấp → decide(tier_up). Từ chối / yêu cầu bổ sung không đổi trạng thái
    xác minh của công ty (vẫn verified ở cấp cũ), chỉ cập nhật yêu cầu và ghi audit."""
    reason = (data.reason or "").strip() or None
    events: list[VerificationStatusChanged] = []
    if data.decision == "approve":
        state = await companies.get_verification_state(session, row.company_id)
        if state.tier != row.target_tier - 1:
            raise AppError("tier_changed", "The company tier changed since the request", 409)
        await decide(
            session,
            company_id=row.company_id,
            decision=Decision.tier_up,
            reviewer=admin,
            reason=reason,
            commit=False,
            events=events,
        )
    else:
        if reason is None:
            raise AppError("reason_required", "A reason is required for this decision", 422)
        await record(
            session,
            actor_id=admin.id,
            action_type=f"verification.tier_request_{data.decision}",
            entity_type="verification_request",
            entity_id=str(row.id),
            before={"status": "pending", "target_tier": row.target_tier},
            after={"status": data.decision, "reason": reason},
        )
    row.status = _DECISIONS[data.decision][1]
    row.reviewed_at = dt.datetime.now(dt.UTC)
    row.decision_reason = reason
    await session.commit()
    await session.refresh(row)
    for event in events:
        await publish(event)
    return _out(row)
