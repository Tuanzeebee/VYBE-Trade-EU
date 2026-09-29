"""Phản ứng với event: xếp thư vào hàng đợi job (không gửi trực tiếp trong request)."""

import logging
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.db import get_sessionmaker
from app.core.events import subscribe
from app.modules.auth import service as auth
from app.modules.companies import service as companies
from app.modules.notifications import center
from app.modules.notifications.models import NotificationType
from app.modules.verification.events import VerificationStatusChanged

log = logging.getLogger(__name__)

Enqueuer = Callable[[dict[str, Any]], Awaitable[None]]

# Quyết định có gửi email cho doanh nghiệp (nộp yêu cầu và đồng bộ mức không cần email).
NOTIFY_DECISIONS = ("approve", "reject", "request_info", "expire")


async def _defer_send_email(payload: dict[str, Any]) -> None:
    """Đẩy job send_email vào Procrastinate. Lỗi hàng đợi không được làm hỏng request gốc."""
    try:
        from app.jobs.send_email import send_email

        await send_email.defer_async(payload=payload)
    except Exception:
        log.exception("Không xếp được job gửi email %s", payload.get("type"))


_enqueue: Enqueuer = _defer_send_email


def set_enqueuer(enqueuer: Enqueuer) -> Enqueuer:
    """Thay bộ xếp hàng (test dùng bản ghi trong bộ nhớ). Trả về bộ cũ để khôi phục."""
    global _enqueue
    previous, _enqueue = _enqueue, enqueuer
    return previous


_session_factory: Callable[[], async_sessionmaker[AsyncSession]] = get_sessionmaker


def set_session_factory(
    factory: Callable[[], async_sessionmaker[AsyncSession]],
) -> Callable[[], async_sessionmaker[AsyncSession]]:
    """Thay nơi lấy phiên DB cho thông báo trong ứng dụng (test dùng phiên rollback)."""
    global _session_factory
    previous, _session_factory = _session_factory, factory
    return previous


async def _record_in_app(
    notification_type: NotificationType, company_id: uuid.UUID, payload: dict[str, Any]
) -> None:
    """Tạo thông báo trong ứng dụng cho chủ công ty, cùng lúc với email. Lỗi chỉ ghi log."""
    try:
        async with _session_factory()() as session:
            user_id = await companies.get_owner_user_id(session, company_id)
            contact = await auth.get_contact(session, user_id) if user_id else None
            if user_id is None or contact is None:
                return
            await center.create_notification(
                session, user_id, notification_type, payload, role=contact.role
            )
    except Exception:
        log.exception("Không tạo được thông báo %s", notification_type.value)


async def on_verification_status_changed(event: VerificationStatusChanged) -> None:
    if event.decision not in NOTIFY_DECISIONS:
        return
    await _record_in_app(
        NotificationType.verification_status,
        event.company_id,
        {"outcome": event.decision, "reason": event.reason},
    )
    await _enqueue(
        {
            "type": "verification_status",
            "company_id": str(event.company_id),
            "context": {"outcome": event.decision, "reason": event.reason},
        }
    )


def register() -> None:
    subscribe(VerificationStatusChanged, on_verification_status_changed)
