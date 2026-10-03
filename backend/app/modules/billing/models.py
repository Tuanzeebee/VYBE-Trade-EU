"""Thanh toán tối giản (U19, ADR-0005): mục thu phí, đơn chuyển khoản, quyền dùng."""

import datetime as dt
import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class BillingItem(Base):
    """Mục thu phí là dữ liệu; giá khởi tạo là placeholder chờ khách chốt."""

    __tablename__ = "billing_items"
    __table_args__ = (
        CheckConstraint("audience IN ('exporter', 'buyer')", name="audience"),
        CheckConstraint("price >= 0", name="price_non_negative"),
        CheckConstraint("currency IN ('VND', 'EUR', 'USD')", name="currency"),
        CheckConstraint("duration_days IS NULL OR duration_days > 0", name="duration"),
    )

    code: Mapped[str] = mapped_column(String(64), primary_key=True)
    name_vi: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str] = mapped_column(String(255))
    description_vi: Mapped[str | None] = mapped_column(Text)
    description_en: Mapped[str | None] = mapped_column(Text)
    audience: Mapped[str] = mapped_column(String(16))
    feature: Mapped[str] = mapped_column(String(64))
    price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3), default="VND", server_default="VND")
    duration_days: Mapped[int | None] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    price_is_placeholder: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true")
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    updated_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    updated_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))


class PlanLimit(Base):
    """Giới hạn số lượng của gói miễn phí (N8), ví dụ max_products = 3. Là dữ liệu cấu hình."""

    __tablename__ = "plan_limits"
    __table_args__ = (CheckConstraint("free_limit >= 0", name="free_limit_non_negative"),)

    key: Mapped[str] = mapped_column(String(32), primary_key=True)
    free_limit: Mapped[int] = mapped_column(Integer)


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'paid', 'cancelled')", name="status"),
        CheckConstraint("amount >= 0", name="amount_non_negative"),
        Index("ix_orders_company_created", "company_id", "created_at"),
        Index(
            "uq_orders_pending_item",
            "company_id",
            "item_code",
            unique=True,
            postgresql_where=text("status = 'pending'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))
    item_code: Mapped[str] = mapped_column(ForeignKey("billing_items.code"))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3))
    reference: Mapped[str] = mapped_column(String(20), unique=True)
    status: Mapped[str] = mapped_column(String(16), default="pending", server_default="pending")
    invoice_info: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb")
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    paid_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    confirmed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    cancelled_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    admin_note: Mapped[str | None] = mapped_column(Text)


class Entitlement(Base):
    """Quyền dùng có hạn; một đơn cấp tối đa một quyền (unique order_id)."""

    __tablename__ = "entitlements"
    __table_args__ = (
        CheckConstraint("valid_until IS NULL OR valid_until > valid_from", name="window"),
        Index("ix_entitlements_company_feature", "company_id", "feature", "valid_until"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))
    feature: Mapped[str] = mapped_column(String(64))
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), unique=True)
    valid_from: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    valid_until: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
