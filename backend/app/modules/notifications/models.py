import datetime as dt
import uuid
from enum import StrEnum
from typing import Any

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, String, Uuid, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class NotificationType(StrEnum):
    """Năm loại của spec §4.9 (RFQ và tin nhắn do F1/F2 tạo; báo giá U8 dùng loại rfq) cùng ba loại
    của bản nâng cấp: ai đã xem hồ sơ (U9), cảnh báo ngành (U14), đơn hàng (U19)."""

    message = "message"
    rfq = "rfq"
    verification_status = "verification_status"
    new_match = "new_match"
    expiry_alert = "expiry_alert"
    profile_viewed = "profile_viewed"
    sector_alert = "sector_alert"
    order = "order"
    reengagement = "reengagement"


class Notification(Base):
    """Thông báo trong ứng dụng (H1). Không append-only: is_read đổi được, chỉ chủ sở hữu đọc."""

    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_read_created", "user_id", "is_read", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType, name="notification_type"))
    payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb")
    )
    link: Mapped[str] = mapped_column(String(255))  # đường dẫn tương đối, chưa có tiền tố ngôn ngữ
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
