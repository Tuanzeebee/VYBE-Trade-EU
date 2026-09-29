"""Trung tâm thông báo trong ứng dụng (H1). Mỗi người chỉ thấy và đánh dấu thông báo của mình.

Giao diện dựng nội dung từ (type, payload) theo ngôn ngữ người dùng; ở đây chỉ lưu dữ liệu.
"""

import uuid
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.modules.auth.schemas import CurrentUser
from app.modules.notifications.models import Notification, NotificationType
from app.modules.notifications.schemas import NotificationOut

# Trang đích theo loại và vai trò nhận. Buyer không có tab xác minh nên về trang chủ buyer.
_EXPORTER_LINKS: dict[NotificationType, str] = {
    NotificationType.verification_status: "/exporter?tab=verification",
    NotificationType.expiry_alert: "/exporter?tab=verification",
    NotificationType.rfq: "/exporter?tab=rfq",
    NotificationType.message: "/exporter?tab=messages",
    NotificationType.new_match: "/suppliers",
}
_BUYER_LINKS: dict[NotificationType, str] = {
    NotificationType.verification_status: "/buyer",
    NotificationType.expiry_alert: "/buyer",
    NotificationType.rfq: "/buyer/rfqs",
    NotificationType.message: "/buyer?tab=messages",
    NotificationType.new_match: "/suppliers",
}

MAX_LIMIT = 100


def link_for(notification_type: NotificationType, role: str) -> str:
    return (_BUYER_LINKS if role == "buyer" else _EXPORTER_LINKS)[notification_type]


async def create_notification(
    session: AsyncSession,
    user_id: uuid.UUID,
    notification_type: NotificationType,
    payload: dict[str, Any],
    *,
    role: str,
    link: str | None = None,
    commit: bool = True,
) -> NotificationOut:
    row = Notification(
        user_id=user_id,
        type=notification_type,
        payload=payload,
        link=link or link_for(notification_type, role),
    )
    session.add(row)
    await session.flush()
    out = NotificationOut.model_validate(row)
    if commit:
        await session.commit()
    return out


async def list_notifications(
    session: AsyncSession,
    user: CurrentUser,
    *,
    unread_only: bool = False,
    limit: int = 30,
    offset: int = 0,
) -> list[NotificationOut]:
    query = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        query = query.where(Notification.is_read.is_(False))
    rows = await session.scalars(
        query.order_by(Notification.created_at.desc(), Notification.id)
        .limit(min(limit, MAX_LIMIT))
        .offset(offset)
    )
    return [NotificationOut.model_validate(r) for r in rows]


async def count_unread(session: AsyncSession, user: CurrentUser) -> int:
    return (
        await session.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        )
        or 0
    )


async def mark_read(
    session: AsyncSession, user: CurrentUser, notification_id: uuid.UUID
) -> NotificationOut:
    """Thông báo của người khác hoặc không tồn tại đều 404 (không lộ sự tồn tại)."""
    row = await session.scalar(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user.id
        )
    )
    if row is None:
        raise AppError("notification_not_found", "Notification not found", 404)
    row.is_read = True
    await session.commit()
    return NotificationOut.model_validate(row)


async def mark_all_read(session: AsyncSession, user: CurrentUser) -> int:
    result = await session.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    await session.commit()
    return int(result.rowcount or 0)  # type: ignore[attr-defined]
