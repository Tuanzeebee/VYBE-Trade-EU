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
# decision → (trạng thái đầu bắt buộc, trạng thái đích)
_TRANSITIONS = {
    Decision.approve: ("pending", "verified"),
    Decision.reject: ("pending", "rejected"),
    Decision.request_info: ("pending", "unverified"),
    Decision.expire: ("verified", "unverified"),
}
_REASON_REQUIRED = (Decision.reject, Decision.request_info)


async def decide(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    decision: Decision,
    reviewer: CurrentUser | None,
    reason: str | None = None,
    now: dt.datetime | None = None,
    commit: bool = True,
) -> None:
    """Áp một quyết định xác minh: đổi trạng thái + ghi verification_decisions + audit + phát event.

    - approve, reject, request_info: chỉ admin, chỉ từ `pending`; hai loại sau bắt buộc có lý do.
    - expire: chỉ hệ thống (reviewer None), chỉ từ `verified` → `unverified` + mức `basic`.
    """
    is_system = decision is Decision.expire
    if is_system != (reviewer is None) or (reviewer is not None and reviewer.role != "admin"):
        raise AppError("forbidden", "Not allowed", 403)
    cleaned = (reason or "").strip() or None
    if decision in _REASON_REQUIRED and cleaned is None:
        raise AppError("reason_required", "A reason is required for this decision", 422)

    now = now or dt.datetime.now(dt.UTC)
    required_from, to_status = _TRANSITIONS[decision]
    current = await companies.get_verification_state(session, company_id)
    if current.status != required_from:
        raise AppError(
            "invalid_transition", f"Cannot {decision.value} a company that is {current.status}", 409
        )

    if decision is Decision.approve:
        # Mức evfta_verified do C6 nâng sau khi đủ bằng chứng bắt buộc còn hạn; ở đây luôn là basic.
        level = BASIC
        verified_at: dt.datetime | None = now
        expires_at: dt.datetime | None = now + dt.timedelta(
            days=get_settings().verification_valid_days
        )
    elif decision is Decision.expire:
        level, verified_at, expires_at = BASIC, current.verified_at, current.expires_at
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
            reason="expired" if decision is Decision.expire else cleaned,
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
    if commit:
        await session.commit()
    await publish(
        VerificationStatusChanged(
            company_id=company_id,
            old_status=current.status,
            new_status=to_status,
            old_level=current.level,
            new_level=level,
        )
    )


async def expire_due(session: AsyncSession, now: dt.datetime) -> int:
    """Hạ mọi công ty verified đã tới hạn (expires_at <= now). Trả số công ty bị hạ. Idempotent."""
    ids = await companies.list_expired_verified(session, now)
    for company_id in ids:
        await decide(
            session,
            company_id=company_id,
            decision=Decision.expire,
            reviewer=None,
            now=now,
            commit=False,
        )
    if ids:
        await session.commit()
    return len(ids)
