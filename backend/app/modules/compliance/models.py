import datetime as dt
import uuid
from decimal import Decimal
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    SmallInteger,
    String,
    Table,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

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
    # SPEC_compliance_data_20_codes: quy tắc Chương 3/7/8, tham số nằm ở cột params (jsonb)
    WO_PRODUCT = "WO_PRODUCT"
    WO_PRODUCT_VESSEL = "WO_PRODUCT_VESSEL"
    WO_MATERIALS = "WO_MATERIALS"
    WO_MATERIALS_VESSEL = "WO_MATERIALS_VESSEL"
    WO_MATERIALS_TOLERANCE = "WO_MATERIALS_TOLERANCE"
    WO_MATERIALS_SUGAR_CAP = "WO_MATERIALS_SUGAR_CAP"


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
            "(check_type = 'tariff'"
            " AND status IN ('ok', 'unsupported', 'needs_review', 'quota_scenarios'))"
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
    # U13/U14: data_status = reviewed | demo_unreviewed; scenario = đầu vào kịch bản hạn ngạch
    data_status: Mapped[str | None] = mapped_column(String(24))
    scenario: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    # SPEC_compliance_data_20_codes §6.2: REVIEWED | UNREVIEWED + thành phần chưa duyệt
    review_state: Mapped[str | None] = mapped_column(String(16))
    unreviewed_components: Mapped[list[str] | None] = mapped_column(JSONB)
    data_version: Mapped[str | None] = mapped_column(String(32))
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
    # SPEC_compliance_data_20_codes: thuế cơ sở lộ trình (%), nguồn MFN, cờ đã đối chiếu TARIC
    base_rate: Mapped[Decimal | None] = mapped_column(Numeric(7, 4))
    mfn_source: Mapped[str | None] = mapped_column(String(24))
    mfn_verified_taric: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    data_version: Mapped[str | None] = mapped_column(String(32))
    # U14: dữ liệu minh hoạ (AGENTS.md §6.2 sửa đổi) — chỉ dùng khi cờ bật và không phải prod.
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
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
            " OR (rule_type NOT IN ('MaxNOM', 'CTH_OR_MaxNOM') AND threshold_pct IS NULL)",
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
    # SPEC_compliance_data_20_codes: tham số theo rule_type (kiểm bằng rule_params), văn bản vi/en
    params: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    rule_text_en: Mapped[str | None] = mapped_column(Text)
    insufficient_operations_vi: Mapped[str | None] = mapped_column(Text)
    tolerance_note_vi: Mapped[str | None] = mapped_column(Text)
    risk_note_vi: Mapped[str | None] = mapped_column(Text)
    requires_expert_reason: Mapped[str | None] = mapped_column(Text)
    data_version: Mapped[str | None] = mapped_column(String(32))
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
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
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


# ── Hạn ngạch thuế quan (U13) ────────────────────────────────────────────────
tariff_quota_subtypes = Table(
    "tariff_quota_subtypes",
    Base.metadata,
    Column("quota_id", ForeignKey("tariff_quotas.id", ondelete="CASCADE"), primary_key=True),
    Column("subtype_code", ForeignKey("product_subtypes.code"), primary_key=True),
)


class ProductSubtype(Base):
    """Phân nhóm sản phẩm do luật TM nhập và duyệt (vd gạo thơm theo danh sách giống). Chưa duyệt
    thì không bao giờ được đưa ra lựa chọn công khai hay dùng để tính (U14: trừ DEMO khi cờ bật)."""

    __tablename__ = "product_subtypes"
    __table_args__ = (
        CheckConstraint("code ~ '^[a-z0-9_]{2,40}$'", name="code_format"),
        CheckConstraint("hs_prefix ~ '^[0-9]{4,8}$'", name="hs_prefix_format"),
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    code: Mapped[str] = mapped_column(String(40), unique=True)
    hs_prefix: Mapped[str] = mapped_column(String(8))
    name_vi: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str] = mapped_column(String(255))
    description_vi: Mapped[str | None] = mapped_column(Text)
    description_en: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str | None] = mapped_column(Text)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class TariffQuota(Base):
    """Hạn ngạch thuế quan theo (hiệp định, nơi đến, tiền tố HS). Dòng chưa duyệt không bao giờ được
    dùng để tính kịch bản (AGENTS.md §6.4 sửa đổi; U14: trừ DEMO khi cờ bật và không phải prod)."""

    __tablename__ = "tariff_quotas"
    __table_args__ = (
        CheckConstraint("destination ~ '^[A-Z]{2}$'", name="destination_iso2"),
        CheckConstraint("hs_prefix ~ '^[0-9]{4,8}$'", name="hs_prefix_format"),
        CheckConstraint("volume > 0", name="positive_volume"),
        CheckConstraint("volume_unit IN ('tonne', 'kg', 'piece', 'liter')", name="volume_unit"),
        CheckConstraint("valid_until IS NULL OR valid_until > valid_from", name="valid_window"),
        CheckConstraint(
            "period_start IS NULL OR period_end IS NULL OR period_end > period_start",
            name="period_window",
        ),
        CheckConstraint(
            "allocation_method IS NULL OR allocation_method IN "
            "('IMPORTER_FIRST_COME', 'IMPORT_LICENCE', 'EXPORT_LICENCE', 'ALLOCATION', 'OTHER')",
            name="allocation_method_values",
        ),
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    agreement_code: Mapped[str] = mapped_column(ForeignKey("trade_agreements.code"))
    destination: Mapped[str] = mapped_column(String(2))
    hs_prefix: Mapped[str] = mapped_column(String(8))
    quota_code: Mapped[str | None] = mapped_column(String(32))
    quota_year: Mapped[int | None] = mapped_column(SmallInteger)
    volume: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    volume_unit: Mapped[str] = mapped_column(String(16), default="tonne", server_default="tonne")
    in_quota_duty_type: Mapped[DutyType] = mapped_column(Enum(DutyType, name="duty_type"))
    in_quota_rate: Mapped[Decimal | None] = mapped_column(Numeric(7, 4))
    in_quota_specific: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    out_quota_duty_type: Mapped[DutyType] = mapped_column(Enum(DutyType, name="duty_type"))
    out_quota_rate: Mapped[Decimal | None] = mapped_column(Numeric(7, 4))
    out_quota_specific: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    specific_unit: Mapped[str | None] = mapped_column(String(16))
    licence_note_vi: Mapped[str | None] = mapped_column(Text)
    licence_note_en: Mapped[str | None] = mapped_column(Text)
    allocation_note_vi: Mapped[str | None] = mapped_column(Text)
    allocation_note_en: Mapped[str | None] = mapped_column(Text)
    # C2-C: chu kỳ hạn ngạch (khác hiệu lực pháp lý valid_from/valid_until), cách phân bổ
    period_start: Mapped[dt.date | None] = mapped_column(Date)
    period_end: Mapped[dt.date | None] = mapped_column(Date)
    allocation_method: Mapped[str | None] = mapped_column(String(24))
    licence_required: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    licence_issuer_vi: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(String(1024))
    valid_from: Mapped[dt.date] = mapped_column(Date)
    valid_until: Mapped[dt.date | None] = mapped_column(Date)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    eligible_subtypes: Mapped[list[ProductSubtype]] = relationship(
        secondary=tariff_quota_subtypes, lazy="selectin", order_by=ProductSubtype.code
    )


class SectorAlert(Base):
    """Cảnh báo ngành theo tiền tố HS (U14), vd thẻ vàng IUU cho thủy sản khai thác. Do luật TM
    nhập và duyệt; chưa duyệt không bao giờ hiện công khai (trừ DEMO khi cờ bật, ngoài prod)."""

    __tablename__ = "sector_alerts"
    __table_args__ = (
        CheckConstraint("code ~ '^[a-z0-9_]{2,40}$'", name="code_format"),
        CheckConstraint("severity IN ('info', 'warning', 'critical')", name="severity"),
        CheckConstraint("cardinality(hs_prefixes) > 0", name="has_prefixes"),
        CheckConstraint("valid_until IS NULL OR valid_until > valid_from", name="valid_window"),
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    code: Mapped[str] = mapped_column(String(40), unique=True)
    hs_prefixes: Mapped[list[str]] = mapped_column(
        ARRAY(String(8)), default=list, server_default=text("'{}'")
    )
    severity: Mapped[str] = mapped_column(String(16), default="warning", server_default="warning")
    title_vi: Mapped[str] = mapped_column(String(255))
    title_en: Mapped[str] = mapped_column(String(255))
    body_vi: Mapped[str | None] = mapped_column(Text)
    body_en: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(String(1024))
    valid_from: Mapped[dt.date] = mapped_column(Date)
    valid_until: Mapped[dt.date | None] = mapped_column(Date)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# --- SPEC_compliance_data_20_codes: lớp dữ liệu cho 20 mã Chương 3/7/8 ---
# Tên bảng bằng chứng có tiền tố compliance_ vì evidence_types đã thuộc module verification.


class EvidenceLayer(StrEnum):
    TARIFF = "TARIFF"
    ORIGIN_RECORD = "ORIGIN_RECORD"
    MARKET_ACCESS = "MARKET_ACCESS"
    PLATFORM_BADGE = "PLATFORM_BADGE"


class EvidenceScope(StrEnum):
    SHIPMENT = "SHIPMENT"
    COMPANY = "COMPANY"


class EvidenceBlocks(StrEnum):
    TARIFF_PREFERENCE = "TARIFF_PREFERENCE"
    IMPORT = "IMPORT"
    NONE = "NONE"


class EvidenceLegalStatus(StrEnum):
    VERIFIED = "VERIFIED"
    TO_VERIFY = "TO_VERIFY"
    PLATFORM_RULE = "PLATFORM_RULE"


class EvidenceCondition(StrEnum):
    """Enum đóng (evidence_conditions.json): không cho thêm điều kiện tự do."""

    ALWAYS = "ALWAYS"
    CONSIGNMENT_GT_6000 = "CONSIGNMENT_GT_6000"
    CONSIGNMENT_LE_6000 = "CONSIGNMENT_LE_6000"
    IF_TRANSIT_THIRD_COUNTRY = "IF_TRANSIT_THIRD_COUNTRY"
    IF_WILD_CAUGHT = "IF_WILD_CAUGHT"
    IF_AQUACULTURE = "IF_AQUACULTURE"
    IF_LISTED_2019_1793 = "IF_LISTED_2019_1793"
    IF_NOT_PHYTO_EXEMPT = "IF_NOT_PHYTO_EXEMPT"
    IF_FRESH_AND_NOT_PHYTO_EXEMPT = "IF_FRESH_AND_NOT_PHYTO_EXEMPT"


class HsCodeCompliance(Base):
    """Phần tuân thủ của một mã HS/CN (catalog giữ danh mục, module này giữ phần tuân thủ).
    cn_mapping_verified=false: mã CN 2012 chưa đối chiếu CN 2026 → kết quả kèm lưu ý chưa duyệt."""

    __tablename__ = "hs_code_compliance"

    hs_code: Mapped[str] = mapped_column(ForeignKey("hs_codes.code"), primary_key=True)
    cn_code_current: Mapped[str | None] = mapped_column(String(8))
    cn_mapping_verified: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    product_group_vi: Mapped[str | None] = mapped_column(String(255))
    evidence_group: Mapped[str | None] = mapped_column(String(32))
    data_version: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


class StagingCategory(Base):
    """Nhóm lộ trình cắt giảm thuế (A, B3, B5, B7): số bậc và ngày về 0."""

    __tablename__ = "staging_categories"
    __table_args__ = (CheckConstraint("stages >= 1", name="stages_positive"),)

    code: Mapped[str] = mapped_column(String(16), primary_key=True)
    stages: Mapped[int] = mapped_column(SmallInteger)
    zero_from: Mapped[dt.date] = mapped_column(Date)
    data_version: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


class RooQuestion(Base):
    """Câu hỏi hiển thị theo mã (văn bản hiển thị, không dùng làm logic)."""

    __tablename__ = "roo_questions"
    __table_args__ = (UniqueConstraint("hs_code", "position", name="hs_code_position"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    hs_code: Mapped[str] = mapped_column(ForeignKey("hs_codes.code"), index=True)
    position: Mapped[int] = mapped_column(SmallInteger)
    text_vi: Mapped[str] = mapped_column(Text)
    text_en: Mapped[str | None] = mapped_column(Text)
    data_version: Mapped[str | None] = mapped_column(String(32))


class ComplianceEvidenceType(Base):
    __tablename__ = "compliance_evidence_types"
    __table_args__ = (
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
    )

    code: Mapped[str] = mapped_column(String(40), primary_key=True)
    layer: Mapped[EvidenceLayer] = mapped_column(Enum(EvidenceLayer, name="evidence_layer"))
    scope: Mapped[EvidenceScope] = mapped_column(Enum(EvidenceScope, name="evidence_scope"))
    name_vi: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str | None] = mapped_column(String(255))
    issuer_vi: Mapped[str | None] = mapped_column(String(255))
    validity_months: Mapped[int | None] = mapped_column(SmallInteger)
    retention_years: Mapped[int | None] = mapped_column(SmallInteger)
    blocks: Mapped[EvidenceBlocks] = mapped_column(Enum(EvidenceBlocks, name="evidence_blocks"))
    legal_basis: Mapped[str | None] = mapped_column(Text)
    legal_status: Mapped[EvidenceLegalStatus] = mapped_column(
        Enum(EvidenceLegalStatus, name="evidence_legal_status")
    )
    source: Mapped[str | None] = mapped_column(String(1024))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    valid_from: Mapped[dt.date] = mapped_column(Date)
    valid_until: Mapped[dt.date | None] = mapped_column(Date)
    data_version: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


class ComplianceEvidenceRequirement(Base):
    """Một dòng mã HS × loại bằng chứng × điều kiện; mỗi dòng được duyệt riêng."""

    __tablename__ = "compliance_evidence_requirements"
    __table_args__ = (
        UniqueConstraint(
            "hs_code", "evidence_type", "condition", "valid_from", name="hs_type_condition_from"
        ),
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    hs_code: Mapped[str] = mapped_column(ForeignKey("hs_codes.code"), index=True)
    evidence_type: Mapped[str] = mapped_column(ForeignKey("compliance_evidence_types.code"))
    condition: Mapped[EvidenceCondition] = mapped_column(
        Enum(EvidenceCondition, name="evidence_condition")
    )
    source: Mapped[str | None] = mapped_column(String(1024))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    valid_from: Mapped[dt.date] = mapped_column(Date)
    valid_until: Mapped[dt.date | None] = mapped_column(Date)
    data_version: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


class EvidenceTypeMapping(Base):
    """Ánh xạ loại bằng chứng cấp công ty của compliance → loại bằng chứng công ty nộp ở
    verification (hai danh mục có mã khác nhau). Dữ liệu luật TM duyệt; chưa duyệt vẫn dùng được
    nhưng kết quả kèm lưu ý (unreviewed_components có evidence_mapping)."""

    __tablename__ = "evidence_type_mappings"
    __table_args__ = (
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
    )

    compliance_code: Mapped[str] = mapped_column(
        ForeignKey("compliance_evidence_types.code"), primary_key=True
    )
    verification_code: Mapped[str] = mapped_column(String(64))
    note: Mapped[str | None] = mapped_column(Text)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    data_version: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


class CompanyBadge(Base):
    """Huy hiệu EVFTA-verified theo nhóm hàng (hs_codes.category) của một công ty (SPEC §5.4).

    Văn bản hiển thị: "Đã được cấp C/O EUR.1 cho nhóm hàng này trong 12 tháng gần nhất" — KHÔNG
    được diễn đạt thành "hàng đạt xuất xứ EVFTA". Chỉ job/badge service ghi; đổi trạng thái ghi
    audit_logs. Song song với mức xác minh `evfta_verified` của verification, không thay thế."""

    __tablename__ = "company_badges"
    __table_args__ = (UniqueConstraint("company_id", "category", name="company_category"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), index=True)
    category: Mapped[str] = mapped_column(String(32))
    is_active: Mapped[bool] = mapped_column(Boolean)
    granted_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    review_state: Mapped[str] = mapped_column(String(16))
    unreviewed_components: Mapped[list[str]] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb")
    )
    missing: Mapped[list[str]] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb")
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ComplianceReviewIssue(Base):
    """Hàng đợi admin: luật sư trả "SUA" (cần sửa) cho một dòng dữ liệu tuân thủ. Dòng đó KHÔNG được
    duyệt; admin sửa dữ liệu rồi đánh dấu đã xử lý."""

    __tablename__ = "compliance_review_issues"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    entity_type: Mapped[str] = mapped_column(String(48))
    entity_id: Mapped[str] = mapped_column(String(96))
    label: Mapped[str] = mapped_column(String(255))  # mô tả dòng để admin tìm (mã HS · loại · ĐK)
    note: Mapped[str] = mapped_column(Text)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    resolved_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))


class CustomsValuationRule(Base):
    """Cơ sở tính trị giá hải quan theo nước đến (CIF hoặc FOB). Là dữ liệu do luật TM duyệt, không
    viết cứng trong code (AGENTS.md §5.6): không phải nước nào cũng tính thuế trên giá CIF.
    Nước chưa có dòng nào thì máy tính dùng nguyên giá hóa đơn kèm cảnh báo."""

    __tablename__ = "customs_valuation_rules"
    __table_args__ = (
        UniqueConstraint("country", "valid_from", name="country_from"),
        CheckConstraint("basis IN ('CIF', 'FOB')", name="basis_values"),
        CheckConstraint("country ~ '^[A-Z]{2}$'", name="country_iso2"),
        CheckConstraint("valid_until IS NULL OR valid_until > valid_from", name="valid_window"),
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    country: Mapped[str] = mapped_column(String(2))
    basis: Mapped[str] = mapped_column(String(3))
    note_vi: Mapped[str | None] = mapped_column(Text)
    note_en: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str | None] = mapped_column(String(1024))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    valid_from: Mapped[dt.date] = mapped_column(Date)
    valid_until: Mapped[dt.date | None] = mapped_column(Date)
    data_version: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


class TariffQuotaBalance(Base):
    """Khối lượng hạn ngạch đã dùng tại một ngày (số liệu thực tế từ nguồn chính thức, admin nhập).

    Không cần luật sư duyệt từng lần (số liệu biến động hằng ngày) nhưng BẮT BUỘC có ngày và nguồn;
    cũ hơn ngưỡng thì hiển thị kèm cảnh báo. Chưa có dòng nào → trạng thái "chưa biết số dư"."""

    __tablename__ = "tariff_quota_balances"
    __table_args__ = (
        UniqueConstraint("quota_id", "as_of", name="quota_as_of"),
        CheckConstraint("used_volume >= 0", name="non_negative_used"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    quota_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tariff_quotas.id", ondelete="CASCADE"), index=True
    )
    as_of: Mapped[dt.date] = mapped_column(Date)
    used_volume: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    source: Mapped[str] = mapped_column(String(1024))
    entered_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


class FreightBenchmark(Base):
    """Giá cước tham khảo theo tuyến/loại container (N6a). Dữ liệu do người duyệt nhập, không viết
    cứng trong code (AGENTS.md §5.6). Chỉ dòng có reviewed_by và còn hạn mới lộ ra giao diện."""

    __tablename__ = "freight_benchmarks"
    __table_args__ = (
        CheckConstraint("dest_country ~ '^[A-Z]{2}$'", name="dest_country_iso2"),
        CheckConstraint(
            "container_type IN ('20GP', '40GP', '40HC', '20RF', '40RF')", name="container_values"
        ),
        CheckConstraint("cargo_class IN ('dry', 'reefer', 'hazard')", name="cargo_class_values"),
        CheckConstraint(
            "price_low <= price_typical AND price_typical <= price_high", name="price_order"
        ),
        CheckConstraint("valid_until >= valid_from", name="valid_window"),
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    origin_port: Mapped[str] = mapped_column(String(64))
    dest_country: Mapped[str] = mapped_column(String(2), index=True)
    dest_port: Mapped[str | None] = mapped_column(String(64))
    container_type: Mapped[str] = mapped_column(String(16))
    cargo_class: Mapped[str] = mapped_column(String(16))
    price_low: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    price_typical: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    price_high: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3))
    valid_from: Mapped[dt.date] = mapped_column(Date)
    valid_until: Mapped[dt.date] = mapped_column(Date)
    source: Mapped[str] = mapped_column(String(255))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


class InsuranceBenchmark(Base):
    """Tỷ lệ phí bảo hiểm hàng hóa tham khảo theo loại hàng (N6a). Cùng quy tắc duyệt như cước."""

    __tablename__ = "insurance_benchmarks"
    __table_args__ = (
        CheckConstraint("cargo_class IN ('dry', 'reefer', 'hazard')", name="cargo_class_values"),
        CheckConstraint("basis IN ('cif', 'invoice')", name="basis_values"),
        CheckConstraint("rate_percent >= 0 AND rate_percent <= 100", name="rate_range"),
        CheckConstraint("valid_until >= valid_from", name="valid_window"),
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    cargo_class: Mapped[str] = mapped_column(String(16), index=True)
    rate_percent: Mapped[Decimal] = mapped_column(Numeric(6, 4))
    basis: Mapped[str] = mapped_column(String(8))
    source: Mapped[str] = mapped_column(String(255))
    valid_from: Mapped[dt.date] = mapped_column(Date)
    valid_until: Mapped[dt.date] = mapped_column(Date)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
