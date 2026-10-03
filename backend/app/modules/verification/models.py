import datetime as dt
import uuid
from decimal import Decimal
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
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
    tier_up = "tier_up"  # U20: admin nâng cấp xác minh (Cơ bản → Nâng cao → Chuyên sâu)
    tier_down = "tier_down"  # U20: admin hạ cấp (có lý do) hoặc hệ thống khi cấp hết hạn


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
    from_tier: Mapped[int | None] = mapped_column(SmallInteger)
    to_tier: Mapped[int | None] = mapped_column(SmallInteger)
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
    # U4: không bắt buộc — seller chỉ cần loại + file; admin nhập ngày khi duyệt loại có hạn dùng.
    issued_at: Mapped[dt.date | None] = mapped_column(Date)
    expires_at: Mapped[dt.date | None] = mapped_column(Date)  # ngày ĐÃ hết hiệu lực
    # Loại "Khác": tên giấy tờ do seller tự ghi.
    custom_type_name: Mapped[str | None] = mapped_column(String(255))
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
    """Yêu cầu xác minh của công ty (I1). Trạng thái xác minh vẫn chỉ đổi qua decide().
    target_tier 1 = xác minh lần đầu; 2–3 = xin lên cấp Nâng cao / Chuyên sâu (U20)."""

    __tablename__ = "verification_requests"
    __table_args__ = (CheckConstraint("target_tier BETWEEN 1 AND 3", name="target_tier_range"),)

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
    decision_reason: Mapped[str | None] = mapped_column(Text)  # lý do từ chối / yêu cầu bổ sung
    target_tier: Mapped[int] = mapped_column(SmallInteger, default=1, server_default="1")


class TierRequirement(Base):
    """Yêu cầu của một cấp xác minh theo loại công ty (U20) — DỮ LIỆU luật TM duyệt. Dòng chưa có
    reviewed_by là nháp: chỉ hiện làm hướng dẫn, không làm job tự hạ cấp."""

    __tablename__ = "tier_requirements"
    __table_args__ = (
        CheckConstraint(
            "company_kind IN ('product_seller', 'service_provider', 'buyer')", name="company_kind"
        ),
        CheckConstraint("tier BETWEEN 1 AND 3", name="tier"),
        CheckConstraint("kind IN ('evidence', 'check', 'manual')", name="kind"),
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
        UniqueConstraint("company_kind", "tier", "code", name="kind_tier_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    company_kind: Mapped[str] = mapped_column(String(20))
    tier: Mapped[int] = mapped_column(SmallInteger)
    kind: Mapped[str] = mapped_column(String(16))  # evidence (mã loại bằng chứng) | check | manual
    code: Mapped[str] = mapped_column(String(64))
    label_vi: Mapped[str] = mapped_column(String(255))
    label_en: Mapped[str] = mapped_column(String(255))
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    source: Mapped[str | None] = mapped_column(Text)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))


class VerificationCheck(Base):
    """Kết quả một lần kiểm (U21, ADR-0003). Tín hiệu cho admin — không bao giờ đổi trạng thái xác
    minh. checked_by NULL = hệ thống; có giá trị = admin kiểm tay."""

    __tablename__ = "verification_checks"
    __table_args__ = (
        CheckConstraint("status IN ('pass', 'fail', 'warning', 'unknown')", name="status"),
        Index("ix_verification_checks_company_code", "company_id", "check_code", "checked_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))
    check_code: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(16))
    detail: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb")
    )
    source: Mapped[str] = mapped_column(String(64))
    checked_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    checked_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


class ApprovedEstablishment(Base):
    """Cơ sở được EU cấp phép (TRACES-NT), admin nạp từ file CSV (U21)."""

    __tablename__ = "approved_establishments"
    __table_args__ = (
        UniqueConstraint("list_code", "country", "approval_number", name="list_country_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    list_code: Mapped[str] = mapped_column(
        String(32), default="traces_nt", server_default="traces_nt"
    )
    country: Mapped[str] = mapped_column(String(2))
    approval_number: Mapped[str] = mapped_column(String(64))
    name: Mapped[str | None] = mapped_column(String(255))
    section: Mapped[str | None] = mapped_column(String(128))
    source: Mapped[str | None] = mapped_column(Text)
    imported_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    imported_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


class TrustCriterion(Base):
    """Tiêu chí điểm tín nhiệm seller (U23, ADR-0004) — DỮ LIỆU có người duyệt. Chưa duyệt thì bỏ
    qua; is_demo chỉ dùng được khi bật DEMO ngoài production."""

    __tablename__ = "trust_criteria"
    __table_args__ = (
        CheckConstraint("component IN ('documents', 'automated', 'behaviour')", name="component"),
        CheckConstraint("weight >= 0", name="weight_non_negative"),
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    component: Mapped[str] = mapped_column(String(16))
    fact_key: Mapped[str] = mapped_column(String(64), unique=True)
    label_vi: Mapped[str] = mapped_column(String(255))
    label_en: Mapped[str] = mapped_column(String(255))
    weight: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))


class EvidenceExtraction(Base):
    """AI đọc chứng nhận (U24) — CHỈ gợi ý. Seller xác nhận mới áp vào bằng chứng; admin thấy so
    sánh khi duyệt. Không đổi approval_status, không gọi decide()."""

    __tablename__ = "evidence_extractions"
    __table_args__ = (
        CheckConstraint(
            "status IN ('queued', 'running', 'ready', 'failed', 'skipped')", name="status"
        ),
        CheckConstraint("method IS NULL OR method IN ('text', 'vision')", name="method"),
        Index("ix_evidence_extractions_company", "company_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    evidence_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("evidences.id", ondelete="CASCADE"), unique=True
    )
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))
    status: Mapped[str] = mapped_column(String(16), default="queued", server_default="queued")
    method: Mapped[str | None] = mapped_column(String(16))
    model: Mapped[str | None] = mapped_column(String(64))
    fields: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb")
    )
    error: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    finished_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    applied_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
