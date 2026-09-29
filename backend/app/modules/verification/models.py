import datetime as dt
import uuid
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, String, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Decision(StrEnum):
    approve = "approve"
    reject = "reject"
    request_info = "request_info"
    expire = "expire"  # chỉ hệ thống (job hết hạn), không có reviewer


class VerificationDecision(Base):
    """Mỗi quyết định xác minh. Append-only: trigger forbid_mutation() chặn UPDATE/DELETE/TRUNCATE
    (migration 0012). Chỉ verification.service.decide() được ghi."""

    __tablename__ = "verification_decisions"
    __table_args__ = (
        # Từ chối / yêu cầu bổ sung bắt buộc có lý do (AGENTS.md, spec I2).
        CheckConstraint(
            "decision IN ('approve', 'expire')"
            " OR (reason IS NOT NULL AND length(btrim(reason)) > 0)",
            name="reason_required",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), index=True)
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))  # NULL = hệ thống
    decision: Mapped[Decision] = mapped_column(Enum(Decision, name="verification_decision"))
    reason: Mapped[str | None] = mapped_column(Text)
    from_status: Mapped[str] = mapped_column(String(16))
    to_status: Mapped[str] = mapped_column(String(16))
    from_level: Mapped[str] = mapped_column(String(16), default="basic")
    to_level: Mapped[str] = mapped_column(String(16), default="basic")
    decided_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
