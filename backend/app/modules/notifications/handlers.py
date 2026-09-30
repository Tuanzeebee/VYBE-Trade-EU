"""Phản ứng với event: xếp thư vào hàng đợi job (không gửi trực tiếp trong request)."""

import datetime as dt
import logging
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.db import get_sessionmaker
from app.core.events import subscribe
from app.modules.auth import service as auth
from app.modules.companies import product_service
from app.modules.companies import service as companies
from app.modules.messaging.events import MessageSent, RfqCreated, RfqStatusChanged
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


async def on_new_supplier_verified(event: VerificationStatusChanged) -> None:
    """Exporter vừa chuyển sang `verified`: gợi ý cho buyer có nhóm hàng quan tâm trùng ngành
    (chỉ thông báo trong ứng dụng). Lỗi chỉ ghi log, không làm hỏng quyết định xác minh."""
    if event.new_status != "verified" or event.old_status == "verified":
        return
    try:
        async with _session_factory()() as session:
            found = await product_service.find_buyers_for_new_supplier(
                session, event.company_id, dt.datetime.now(dt.UTC)
            )
            if found is None:
                return
            supplier, buyer_user_ids = found
            for user_id in buyer_user_ids:
                if await center.has_new_match(session, user_id, supplier.id):
                    continue
                await center.create_notification(
                    session,
                    user_id,
                    NotificationType.new_match,
                    {
                        "company_id": str(supplier.id),
                        "company_name": supplier.legal_name,
                        "slug": supplier.slug,
                    },
                    role="buyer",
                    link=f"/suppliers/{supplier.slug}",
                    commit=False,
                )
            await session.commit()
    except Exception:
        log.exception("Không tạo được thông báo new_match cho công ty %s", event.company_id)


async def on_rfq_created(event: RfqCreated) -> None:
    """Exporter nhận thông báo trong ứng dụng và email khi có RFQ mới."""
    await _record_in_app(
        NotificationType.rfq,
        event.exporter_company_id,
        {
            "event": "created",
            "rfq_id": str(event.rfq_id),
            "buyer_name": event.buyer_name,
            "product_name": event.product_name,
        },
    )
    await _enqueue(
        {
            "type": "rfq",
            "company_id": str(event.exporter_company_id),
            "context": {"buyer_name": event.buyer_name, "product_name": event.product_name},
        }
    )


async def on_rfq_status_changed(event: RfqStatusChanged) -> None:
    """Buyer thấy exporter đã xem, báo giá hoặc đóng RFQ (chỉ thông báo trong ứng dụng)."""
    await _record_in_app(
        NotificationType.rfq,
        event.buyer_company_id,
        {
            "event": "status",
            "rfq_id": str(event.rfq_id),
            "status": event.new_status,
            "exporter_name": event.exporter_name,
            "product_name": event.product_name,
        },
    )


async def on_message_sent(event: MessageSent) -> None:
    """Bên nhận thấy tin mới trong ứng dụng và nhận email (không kèm nội dung tin)."""
    await _record_in_app(
        NotificationType.message,
        event.recipient_company_id,
        {"conversation_id": str(event.conversation_id), "sender_name": event.sender_name},
    )
    await _enqueue(
        {
            "type": "message",
            "company_id": str(event.recipient_company_id),
            "context": {"sender_name": event.sender_name},
        }
    )


def register() -> None:
    subscribe(VerificationStatusChanged, on_verification_status_changed)
    subscribe(VerificationStatusChanged, on_new_supplier_verified)
    subscribe(RfqCreated, on_rfq_created)
    subscribe(RfqStatusChanged, on_rfq_status_changed)
    subscribe(MessageSent, on_message_sent)
