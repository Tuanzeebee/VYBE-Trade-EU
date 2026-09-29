import datetime as dt
import uuid
from enum import StrEnum

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Decision(StrEnum):
    approve = "approve"
    reject = "reject"
    request_info = "request_info"
    expire = "expire"  # chỉ hệ thống (job hết hạn), không có reviewer
    level_up = "level_up"  # chỉ hệ thống: đủ bằng chứng bắt buộc còn hạn → evfta_verified
    level_down = "level_down"  # chỉ hệ thống: thiếu/hết hạn bằng chứng → basic
    submit = "submit"  # chủ công ty nộp yêu cầu xác minh (unverified/rejected → pending)


class VerificationDecision(Base):
    """Mỗi quyết định xác minh. Append-only: trigger forbid_mutation() chặn UPDATE/DELETE/TRUNCATE
    (migration 0012). Chỉ verification.service.decide() được ghi."""

    __tablename__ = "verification_decisions"
    __table_args__ = (
        # Từ chối / yêu cầu bổ sung bắt buộc có lý do (AGENTS.md, spec I2).
        CheckConstraint(
            "decision NOT IN ('reject', 'request_info')"
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


class ApprovalStatus(StrEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class EvidenceType(Base):
    """Loại bằng chứng — DỮ LIỆU do luật TM duyệt (AGENTS.md §5.6), không viết cứng trong code.
    Loại chưa có reviewed_by không được nộp và không tính vào danh sách kiểm."""

    __tablename__ = "evidence_types"
    __table_args__ = (
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
        CheckConstraint("validity_months IS NULL OR validity_months > 0", name="positive_validity"),
    )

    code: Mapped[str] = mapped_column(String(64), primary_key=True)
    name_vi: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str] = mapped_column(String(255))
    group: Mapped[str] = mapped_column(
        String(32)
    )  # origin | quality | social | technical | lab | ...
    validity_months: Mapped[int | None] = mapped_column(
        Integer
    )  # xuất xứ: 12 (hạn do hệ thống tính)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    source: Mapped[str | None] = mapped_column(Text)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))


class Evidence(Base):
    __tablename__ = "evidences"
    __table_args__ = (
        CheckConstraint("expires_at IS NULL OR expires_at > issued_at", name="valid_window"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), index=True)
    type_code: Mapped[str] = mapped_column(ForeignKey("evidence_types.code"))
    file_key: Mapped[str] = mapped_column(String(512))
    certificate_number: Mapped[str | None] = mapped_column(String(128))
    issuer: Mapped[str | None] = mapped_column(String(255))
    issued_at: Mapped[dt.date] = mapped_column(Date)
    expires_at: Mapped[dt.date | None] = mapped_column(Date)  # ngày ĐÃ hết hiệu lực
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus, name="evidence_approval_status"),
        default=ApprovalStatus.pending,
        server_default="pending",
    )
    reject_reason: Mapped[str | None] = mapped_column(Text)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class RequiredEvidenceRule(Base):
    """Nhóm hàng → loại bằng chứng bắt buộc hoặc chỉ nhắc (is_required=false). Dữ liệu luật TM."""

    __tablename__ = "required_evidence_rules"
    __table_args__ = (
        UniqueConstraint("category", "evidence_type_code", name="category_type"),
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    category: Mapped[str] = mapped_column(String(32), index=True)  # hs_codes.category
    evidence_type_code: Mapped[str] = mapped_column(ForeignKey("evidence_types.code"))
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    note: Mapped[str | None] = mapped_column(Text)  # lời nhắc hiển thị (vd EUDR cho cà phê)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))


class RequestStatus(StrEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    info_requested = "info_requested"


class VerificationRequest(Base):
    """Yêu cầu xác minh của công ty (I1). Trạng thái xác minh vẫn chỉ đổi qua decide()."""

    __tablename__ = "verification_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), index=True)
    submitted_evidence_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(Uuid), default=list, server_default=text("'{}'::uuid[]")
    )
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus, name="verification_request_status"),
        default=RequestStatus.pending,
        server_default="pending",
        index=True,
    )
    submitted_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
