"""Xác minh doanh nghiệp. `decide()` là nơi DUY NHẤT đổi trạng thái xác minh (AGENTS.md §6.9).

AI, máy tính tuân thủ, điểm hoàn thiện… không bao giờ gọi vào đây: chỉ admin bấm quyết định, hoặc
job hết hạn (reviewer None, decision expire).
"""

import datetime as dt
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.events import publish
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import service as companies
from app.modules.verification.events import VerificationStatusChanged
from app.modules.verification.models import Decision, VerificationDecision

BASIC = "basic"
EVFTA_VERIFIED = "evfta_verified"
# decision → (trạng thái đầu bắt buộc, trạng thái đích); submit cũng nhận từ rejected
_TRANSITIONS = {
    Decision.approve: ("pending", "verified"),
    Decision.reject: ("pending", "rejected"),
    Decision.request_info: ("pending", "unverified"),
    Decision.expire: ("verified", "unverified"),
    Decision.level_up: ("verified", "verified"),
    Decision.level_down: ("verified", "verified"),
    Decision.submit: ("unverified", "pending"),
}
_SYSTEM = (Decision.expire, Decision.level_up, Decision.level_down)
_ALSO_FROM = {Decision.submit: ("rejected",)}
_SYSTEM_REASON = {
    Decision.expire: "expired",
    Decision.level_up: "evidence_complete",
    Decision.level_down: "evidence_missing_or_expired",
}
_REASON_REQUIRED = (Decision.reject, Decision.request_info)


async def _authorize(
    session: AsyncSession,
    company_id: uuid.UUID,
    decision: Decision,
    reviewer: CurrentUser | None,
) -> None:
    """Ai được đưa ra quyết định nào (403 nếu sai)."""
    if decision in _SYSTEM:
        allowed = reviewer is None
    elif decision is Decision.submit:
        allowed = (
            reviewer is not None
            and reviewer.role in ("exporter", "buyer")
            and await companies.get_company_id(session, reviewer.id) == company_id
        )
    else:
        allowed = reviewer is not None and reviewer.role == "admin"
    if not allowed:
        raise AppError("forbidden", "Not allowed", 403)


async def decide(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    decision: Decision,
    reviewer: CurrentUser | None,
    reason: str | None = None,
    now: dt.datetime | None = None,
    commit: bool = True,
    events: list[VerificationStatusChanged] | None = None,
) -> None:
    """Áp một quyết định xác minh: đổi trạng thái + ghi verification_decisions + audit + phát event.

    - approve, reject, request_info: chỉ admin, chỉ từ `pending`; hai loại sau bắt buộc có lý do.
    - expire: chỉ hệ thống (reviewer None), chỉ từ `verified` → `unverified` + mức `basic`.
    - level_up / level_down: chỉ hệ thống, công ty `verified`, đổi mức basic ↔ evfta_verified (C6).
    - submit: chỉ chủ công ty (exporter, hoặc buyer xin xác minh tùy chọn B1 — ADR-0004), từ
      `unverified` hoặc `rejected` → `pending` (I1).

    Event được phát SAU commit. commit=False: nếu có `events` thì dồn vào đó để người gọi phát sau
    khi commit; không có thì phát ngay.
    """
    await _authorize(session, company_id, decision, reviewer)
    cleaned = (reason or "").strip() or None
    if decision in _REASON_REQUIRED and cleaned is None:
        raise AppError("reason_required", "A reason is required for this decision", 422)

    now = now or dt.datetime.now(dt.UTC)
    required_from, to_status = _TRANSITIONS[decision]
    current = await companies.get_verification_state(session, company_id)
    if current.status != required_from and current.status not in _ALSO_FROM.get(decision, ()):
        raise AppError(
            "invalid_transition", f"Cannot {decision.value} a company that is {current.status}", 409
        )

    if decision is Decision.level_up and current.level != BASIC:
        raise AppError("invalid_transition", "Company is already evfta_verified", 409)
    if decision is Decision.level_down and current.level != EVFTA_VERIFIED:
        raise AppError("invalid_transition", "Company is not evfta_verified", 409)

    if decision is Decision.approve:
        # Mức evfta_verified do C6 nâng sau khi đủ bằng chứng bắt buộc còn hạn; ở đây luôn là basic.
        level = BASIC
        verified_at: dt.datetime | None = now
        expires_at: dt.datetime | None = now + dt.timedelta(
            days=get_settings().verification_valid_days
        )
    elif decision in _SYSTEM:
        level = EVFTA_VERIFIED if decision is Decision.level_up else BASIC
        verified_at, expires_at = current.verified_at, current.expires_at
    else:
        level, verified_at, expires_at = BASIC, None, None

    await companies.set_verification_state(
        session,
        company_id,
        status=to_status,
        level=level,
        verified_at=verified_at,
        expires_at=expires_at,
    )
    session.add(
        VerificationDecision(
            company_id=company_id,
            reviewer_id=reviewer.id if reviewer else None,
            decision=decision,
            reason=_SYSTEM_REASON.get(decision, cleaned),
            from_status=current.status,
            to_status=to_status,
            from_level=current.level,
            to_level=level,
        )
    )
    await record(
        session,
        actor_id=reviewer.id if reviewer else None,
        action_type=f"verification.{decision.value}",
        entity_type="company",
        entity_id=str(company_id),
        before={"status": current.status, "level": current.level},
        after={"status": to_status, "level": level, "reason": cleaned},
    )
    await session.flush()
    event = VerificationStatusChanged(
        company_id=company_id,
        old_status=current.status,
        new_status=to_status,
        old_level=current.level,
        new_level=level,
        decision=decision.value,
        reason=cleaned,
    )
    if commit:
        await session.commit()
    elif events is not None:
        events.append(event)
        return
    await publish(event)


async def expire_due(session: AsyncSession, now: dt.datetime) -> int:
    """Hạ mọi công ty verified đã tới hạn (expires_at <= now). Trả số công ty bị hạ. Idempotent."""
    ids = await companies.list_expired_verified(session, now)
    events: list[VerificationStatusChanged] = []
    for company_id in ids:
        await decide(
            session,
            company_id=company_id,
            decision=Decision.expire,
            reviewer=None,
            now=now,
            commit=False,
            events=events,
        )
    if ids:
        await session.commit()
    for event in events:
        await publish(event)
    return len(ids)
