"""Nhật ký kiểm toán dùng chung. Append-only: trigger DB chặn UPDATE/DELETE/TRUNCATE."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Index, String, func
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


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
