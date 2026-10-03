import datetime as dt
import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class TradeImportBatch(Base):
    """Một lần nạp thống kê thương mại (U15): nguồn, tham số, trạng thái, số dòng, lỗi."""

    __tablename__ = "trade_import_batches"
    __table_args__ = (
        CheckConstraint("status IN ('queued', 'running', 'succeeded', 'failed')", name="status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    source: Mapped[str] = mapped_column(String(32))
    params: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb")
    )
    status: Mapped[str] = mapped_column(String(16), default="queued", server_default="queued")
    rows_imported: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    error: Mapped[str | None] = mapped_column(Text)
    started_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    finished_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))


class TradeFlow(Base):
    """Thống kê thương mại theo năm (U15).

    Khoá tự nhiên: (nguồn, nước báo cáo, đối tác, mã hàng, năm, chiều).
    """

    __tablename__ = "trade_flows"
    __table_args__ = (
        CheckConstraint("flow IN ('import', 'export')", name="flow"),
        CheckConstraint("product ~ '^[0-9]{2,8}$'", name="product_format"),
        CheckConstraint("year BETWEEN 1988 AND 2100", name="year_range"),
        UniqueConstraint("source", "reporter", "partner", "product", "year", "flow", name="key"),
        Index("ix_trade_flows_product_year", "product", "year"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    source: Mapped[str] = mapped_column(String(32))
    reporter: Mapped[str] = mapped_column(String(16))
    partner: Mapped[str] = mapped_column(String(16))
    product: Mapped[str] = mapped_column(String(8))
    year: Mapped[int] = mapped_column(SmallInteger)
    flow: Mapped[str] = mapped_column(String(8))
    value_eur: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    quantity_kg: Mapped[Decimal | None] = mapped_column(Numeric(18, 3))
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("trade_import_batches.id", ondelete="SET NULL")
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


class MarketReport(Base):
    """Báo cáo go-to-market (U18). metrics = ảnh chụp số liệu dùng cho lời văn; narrative = lời văn
    đã điền số (model chỉ viết placeholder, server điền và kiểm tra)."""

    __tablename__ = "market_reports"
    __table_args__ = (
        CheckConstraint("status IN ('queued', 'running', 'ready', 'failed')", name="status"),
        CheckConstraint(
            "narrative_source IS NULL OR narrative_source IN ('model', 'template')",
            name="narrative_source",
        ),
        CheckConstraint("language IN ('vi', 'en')", name="language"),
        Index("ix_market_reports_company_created", "company_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))
    requested_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL")
    )
    query: Mapped[str] = mapped_column(String(100))
    language: Mapped[str] = mapped_column(String(2), default="vi", server_default="vi")
    status: Mapped[str] = mapped_column(String(16), default="queued", server_default="queued")
    input: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb")
    )
    metrics: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    narrative: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    narrative_source: Mapped[str | None] = mapped_column(String(16))
    pdf_key: Mapped[str | None] = mapped_column(String(512))
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    finished_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))


class ConsultingLead(Base):
    """Yêu cầu tư vấn triển khai qua mạng lưới VBA (U18)."""

    __tablename__ = "consulting_leads"
    __table_args__ = (CheckConstraint("status IN ('new', 'contacted', 'closed')", name="status"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))
    report_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("market_reports.id", ondelete="SET NULL")
    )
    contact_name: Mapped[str] = mapped_column(String(255))
    contact_email: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(40))
    message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="new", server_default="new")
    handled_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    handled_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


class MarketInsight(Base):
    """Dữ kiện thị trường do người duyệt nhập (N5): phân khúc, nhóm tiêu dùng, rủi ro theo nước và
    nhóm hàng. Không do AI viết; thiếu reviewed_by thì không bao giờ lộ ra báo cáo."""

    __tablename__ = "market_insights"
    __table_args__ = (
        CheckConstraint("country ~ '^[A-Z]{2}$'", name="country_iso2"),
        CheckConstraint("hs_prefix ~ '^[0-9]{2,6}$'", name="hs_prefix_digits"),
        CheckConstraint(
            "segment IN ('horeca', 'retail', 'industrial_kitchen', 'consumer_asian', "
            "'consumer_european', 'general')",
            name="segment_values",
        ),
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    country: Mapped[str] = mapped_column(String(2), index=True)
    hs_prefix: Mapped[str] = mapped_column(String(6))
    segment: Mapped[str] = mapped_column(String(32))
    note_vi: Mapped[str] = mapped_column(Text)
    note_en: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(255))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
