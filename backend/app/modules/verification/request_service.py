"""Yêu cầu xác minh: exporter nộp, admin xem hàng đợi và quyết định (I1, I2).

Trạng thái xác minh của công ty chỉ đổi qua service.decide(); ở đây chỉ điều phối bản ghi yêu cầu.
"""

import datetime as dt
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.events import publish
from app.core.storage import Storage
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import service as companies
from app.modules.verification import evidence_service
from app.modules.verification.events import VerificationStatusChanged
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
    )


async def _exporter_company_id(session: AsyncSession, user: CurrentUser) -> uuid.UUID:
    if user.role != "exporter":
        raise AppError("forbidden", "Not allowed for this role", 403)
    company_id = await companies.get_company_id(session, user.id)
    if company_id is None:
        raise AppError("company_not_found", "Company profile not created yet", 404)
    return company_id


async def submit_request(session: AsyncSession, user: CurrentUser) -> VerificationRequestOut:
    """Chủ công ty nộp yêu cầu xác minh: công ty → pending (qua decide), chụp bằng chứng."""
    company_id = await _exporter_company_id(session, user)
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
    return _out(row)


async def list_my_requests(
    session: AsyncSession, user: CurrentUser
) -> list[VerificationRequestOut]:
    company_id = await _exporter_company_id(session, user)
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
    items: list[QueueItem] = []
    for request in requests:
        summary = summaries[request.company_id]
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
            )
        )
    return items


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
    if decision is Decision.approve:
        await evidence_service.sync_level(session, row.company_id, commit=False)
    await session.commit()
    await session.refresh(row)
    for event in events:
        await publish(event)
    return _out(row)
