import datetime as dt
import uuid
from decimal import Decimal
from enum import StrEnum

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
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class DutyType(StrEnum):
    ad_valorem = "ad_valorem"
    specific = "specific"
    mixed = "mixed"


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
    status: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


class TariffLine(Base):
    """Dòng thuế EU (MFN / EVFTA) do người duyệt luật TM nhập và duyệt.

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
    destination: Mapped[str] = mapped_column(String(2))  # ISO-2 nước EU
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
