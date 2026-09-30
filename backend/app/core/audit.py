"""Nhật ký kiểm toán dùng chung. Append-only: trigger DB chặn UPDATE/DELETE/TRUNCATE."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Index, String, select, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (Index("ix_audit_logs_entity", "entity_type", "entity_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # Không FK tới users: xóa tài khoản (J2) ẩn danh hóa user nhưng giữ nguyên audit.
    actor_id: Mapped[uuid.UUID | None]
    action_type: Mapped[str] = mapped_column(String(64))
    entity_type: Mapped[str] = mapped_column(String(64))
    entity_id: Mapped[str] = mapped_column(String(64))
    before_state: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    after_state: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


async def record(
    session: AsyncSession,
    *,
    actor_id: uuid.UUID | None,
    action_type: str,
    entity_type: str,
    entity_id: str,
    before: dict[str, Any] | None,
    after: dict[str, Any] | None,
) -> None:
    """Ghi một dòng audit trong transaction hiện tại. Không log mật khẩu/token/nội dung file."""
    session.add(
        AuditLog(
            actor_id=actor_id,
            action_type=action_type,
            entity_type=entity_type,
            entity_id=entity_id,
            before_state=before,
            after_state=after,
        )
    )


async def list_audit_logs(
    session: AsyncSession,
    *,
    entity_type: str | None = None,
    entity_id: str | None = None,
    action_type: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[AuditLog]:
    """Tra nhật ký (mới nhất trước). Chỉ đọc — bảng append-only."""
    query = select(AuditLog)
    if entity_type is not None:
        query = query.where(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        query = query.where(AuditLog.entity_id == entity_id)
    if action_type is not None:
        query = query.where(AuditLog.action_type == action_type)
    rows = await session.scalars(
        query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(limit).offset(offset)
    )
    return list(rows)
