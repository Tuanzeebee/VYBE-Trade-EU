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
