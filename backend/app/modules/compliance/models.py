import datetime as dt
import uuid
from decimal import Decimal
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class DutyType(StrEnum):
    ad_valorem = "ad_valorem"
    specific = "specific"
    mixed = "mixed"


class RuleType(StrEnum):
    WO = "WO"  # xuất xứ thuần túy
    CTH = "CTH"  # chuyển đổi nhóm HS (4 số)
    MaxNOM = "MaxNOM"  # nguyên liệu không xuất xứ tối đa % giá xuất xưởng
    CTH_OR_MaxNOM = "CTH_OR_MaxNOM"  # CTH hoặc MaxNOM — đạt một trong hai


class CheckType(StrEnum):
    tariff = "tariff"
    roo = "roo"


class ComplianceCheck(Base):
    """Nhật ký MỖI lần chạy máy tính (kể cả khách). Append-only: trigger forbid_mutation() chặn
    UPDATE/DELETE/TRUNCATE (migration 0010). Chỉ compliance.service.log_check được ghi.

    rule_id chưa có khóa ngoại tới product_specific_rules (bảng đó tạo ở C4).
    """

    __tablename__ = "compliance_checks"
    __table_args__ = (
        CheckConstraint("hs_code ~ '^[0-9]{6,8}$'", name="hs_code_format"),
        CheckConstraint("destination_country ~ '^[A-Z]{2}$'", name="destination_iso2"),
        CheckConstraint("product_value IS NULL OR product_value > 0", name="positive_value"),
        CheckConstraint(
            "(check_type = 'tariff' AND status IN ('ok', 'unsupported', 'needs_review'))"
            " OR (check_type = 'roo'"
            " AND status IN ('pass', 'fail', 'inconclusive', 'unsupported'))",
            name="status_matches_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("companies.id"), index=True)
    check_type: Mapped[CheckType] = mapped_column(Enum(CheckType, name="check_type"))
    hs_code: Mapped[str] = mapped_column(String(8))
    product_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    origin_country: Mapped[str | None] = mapped_column(String(2))
    destination_country: Mapped[str] = mapped_column(String(2))
    mfn_duty_rate: Mapped[Decimal | None] = mapped_column(Numeric(7, 4))
    evfta_duty_rate: Mapped[Decimal | None] = mapped_column(Numeric(7, 4))
    savings_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    regional_value_content_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    originating_status: Mapped[str | None] = mapped_column(String(16))
    tariff_line_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tariff_lines.id"))
    rule_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    agreement_code: Mapped[str | None] = mapped_column(String(16))  # U12
    status: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


class DocumentType(StrEnum):
    eur1_draft = "eur1_draft"


class DocumentStatus(StrEnum):
    queued = "queued"
    ready = "ready"
    failed = "failed"


class Document(Base):
    """Tài liệu hệ thống sinh cho công ty (C5: bản NHÁP EUR.1). Chỉ sinh khi RoO = pass."""

    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), index=True)
    requested_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    document_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType, name="document_type"))
    compliance_check_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("compliance_checks.id"))
    input_data: Mapped[dict[str, Any]] = mapped_column(JSONB)  # dữ liệu hóa đơn người dùng nhập
    file_key: Mapped[str | None] = mapped_column(String(512))
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, name="document_status"),
        default=DocumentStatus.queued,
        server_default="queued",
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class TradeAgreement(Base):
    """Hiệp định thương mại tự do (U12). Chỉ để hiển thị tên/đối tác: hiệp định nào áp dụng cho một
    thị trường luôn suy ra từ dòng thuế ĐÃ DUYỆT, không bao giờ từ bảng này."""

    __tablename__ = "trade_agreements"
    __table_args__ = (
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
        CheckConstraint("code ~ '^[A-Z0-9_]{2,16}$'", name="code_format"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    code: Mapped[str] = mapped_column(String(16), unique=True)
    name_vi: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str] = mapped_column(String(255))
    partners: Mapped[list[str]] = mapped_column(
        ARRAY(String(2)), default=list, server_default=text("'{}'")
    )
    in_force_from: Mapped[dt.date | None] = mapped_column(Date)
    source_url: Mapped[str | None] = mapped_column(String(1024))
    note: Mapped[str | None] = mapped_column(Text)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class TariffLine(Base):
    """Dòng thuế (MFN / thuế ưu đãi theo hiệp định) do người duyệt luật TM nhập và duyệt.

    U12: `agreement_code` (mặc định EVFTA) và `destination` là ISO-2 hoặc 'EU' (biểu thuế chung
    của liên minh thuế quan). Cột evfta_rate_current giữ tên cũ, nghĩa là thuế ưu đãi của hiệp định.

    Dòng chưa có reviewed_by không bao giờ được trả ra ngoài: mọi truy vấn đi qua
    compliance.service._reviewed_lines. Thuế suất là % (numeric, không float).
    """

    __tablename__ = "tariff_lines"
    __table_args__ = (
        CheckConstraint("valid_until IS NULL OR valid_until > valid_from", name="valid_window"),
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
        CheckConstraint(
            "(mfn_rate IS NULL OR mfn_rate BETWEEN 0 AND 100)"
            " AND (evfta_rate_current IS NULL OR evfta_rate_current BETWEEN 0 AND 100)",
            name="rates_are_percentages",
        ),
        CheckConstraint("destination ~ '^[A-Z]{2}$'", name="destination_iso2"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    hs_code: Mapped[str] = mapped_column(ForeignKey("hs_codes.code"), index=True)
    destination: Mapped[str] = mapped_column(String(2))  # ISO-2 hoặc 'EU'
    agreement_code: Mapped[str] = mapped_column(
        ForeignKey("trade_agreements.code"), default="EVFTA", server_default="EVFTA"
    )
    duty_type: Mapped[DutyType] = mapped_column(Enum(DutyType, name="duty_type"))
    mfn_rate: Mapped[Decimal | None] = mapped_column(Numeric(7, 4))
    mfn_specific: Mapped[str | None] = mapped_column(
        String(255)
    )  # thuế tuyệt đối/hỗn hợp, dạng văn bản
    evfta_rate_current: Mapped[Decimal | None] = mapped_column(Numeric(7, 4))
    staging_category: Mapped[str | None] = mapped_column(String(16))
    zero_from: Mapped[dt.date | None] = mapped_column(Date)
    quota_required: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    quota_note: Mapped[str | None] = mapped_column(Text)
    condition_note: Mapped[str | None] = mapped_column(Text)
    quota_note_en: Mapped[str | None] = mapped_column(Text)
    condition_note_en: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(String(1024))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    valid_from: Mapped[dt.date] = mapped_column(Date)
    valid_until: Mapped[dt.date | None] = mapped_column(Date)  # ngày này đã hết hiệu lực
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ProductSpecificRule(Base):
    """Quy tắc xuất xứ theo mặt hàng (PSR) do luật TM nhập và duyệt. Dòng thiếu reviewed_by không
    bao giờ được dùng: mọi truy vấn đi qua compliance.service._reviewed_rules."""

    __tablename__ = "product_specific_rules"
    __table_args__ = (
        CheckConstraint("valid_until IS NULL OR valid_until > valid_from", name="valid_window"),
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
        # Ngưỡng % bắt buộc với quy tắc có nhánh MaxNOM, và chỉ với các quy tắc đó.
        CheckConstraint(
            "(rule_type IN ('MaxNOM', 'CTH_OR_MaxNOM')"
            " AND threshold_pct IS NOT NULL AND threshold_pct > 0 AND threshold_pct <= 100)"
            " OR (rule_type IN ('WO', 'CTH') AND threshold_pct IS NULL)",
            name="threshold_matches_rule_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    hs_code: Mapped[str] = mapped_column(ForeignKey("hs_codes.code"), index=True)
    rule_type: Mapped[RuleType] = mapped_column(Enum(RuleType, name="rule_type"))
    threshold_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    rule_text: Mapped[str | None] = mapped_column(Text)
    requires_expert: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    source: Mapped[str | None] = mapped_column(String(1024))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    valid_from: Mapped[dt.date] = mapped_column(Date)
    valid_until: Mapped[dt.date | None] = mapped_column(Date)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ImportCountryTerm(Base):
    """VAT nhập khẩu, ngôn ngữ nhãn và lưu ý theo (mã HS, nước EU) do luật TM nhập và duyệt.

    Dòng chưa có reviewed_by không bao giờ được dùng: mọi truy vấn đi qua
    compliance.service._reviewed_terms. vat_rate là % (numeric, không float).
    """

    __tablename__ = "import_country_terms"
    __table_args__ = (
        CheckConstraint("valid_until IS NULL OR valid_until > valid_from", name="valid_window"),
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
        CheckConstraint("vat_rate BETWEEN 0 AND 100", name="vat_is_percentage"),
        CheckConstraint("country ~ '^[A-Z]{2}$'", name="country_iso2"),
        UniqueConstraint("hs_code", "country", "valid_from", name="hs_country_from"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    hs_code: Mapped[str] = mapped_column(ForeignKey("hs_codes.code"), index=True)
    country: Mapped[str] = mapped_column(String(2))  # ISO-2 nước EU
    vat_rate: Mapped[Decimal] = mapped_column(Numeric(7, 4))
    label_languages: Mapped[str | None] = mapped_column(String(64))
    note: Mapped[str | None] = mapped_column(Text)
    note_en: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str | None] = mapped_column(Text)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    valid_from: Mapped[dt.date] = mapped_column(Date)
    valid_until: Mapped[dt.date | None] = mapped_column(Date)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
