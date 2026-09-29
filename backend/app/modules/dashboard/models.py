import datetime as dt
import uuid
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Uuid, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class ProfileView(Base):
    """Một lượt xem hồ sơ công khai của công ty (G1). Người xem có thể là khách (viewer NULL)."""

    __tablename__ = "profile_views"
    __table_args__ = (
        Index("ix_profile_views_company_viewed", "company_id", "viewed_at"),
        Index("ix_profile_views_viewer_viewed", "viewer_company_id", "viewed_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))
    viewer_company_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("companies.id"))
    viewed_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


class DashboardEvent(Base):
    """Mỗi lần mở dashboard (G3). `tile_hashes`: dấu vân tay từng ô để biết ô nào đổi so với lần
    mở trước; `is_return_visit`: đã từng mở; `had_new_info` chỉ có nghĩa với lần quay lại."""

    __tablename__ = "dashboard_events"
    __table_args__ = (Index("ix_dashboard_events_user_opened", "user_id", "opened_at"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    role: Mapped[str] = mapped_column(String(16))
    opened_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    is_return_visit: Mapped[bool] = mapped_column(Boolean)
    had_new_info: Mapped[bool] = mapped_column(Boolean)
    tile_hashes: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
