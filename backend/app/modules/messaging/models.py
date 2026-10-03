import datetime as dt
import uuid
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    String,
    Text,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.modules.messaging.quote_logic import BalanceTerms, QuoteStatus


class Incoterm(StrEnum):
    """Incoterms 2020 (11 điều kiện của ICC). Danh sách áp dụng do PO chốt."""

    EXW = "EXW"
    FCA = "FCA"
    FAS = "FAS"
    FOB = "FOB"
    CFR = "CFR"
    CIF = "CIF"
    CPT = "CPT"
    CIP = "CIP"
    DAP = "DAP"
    DPU = "DPU"
    DDP = "DDP"


class RfqStatus(StrEnum):
    new = "new"
    viewed = "viewed"
    quoted = "quoted"
    closed = "closed"


class Rfq(Base):
    """Yêu cầu báo giá có cấu trúc từ buyer tới exporter (F1)."""

    __tablename__ = "rfqs"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="positive_quantity"),
        CheckConstraint("target_price IS NULL OR target_price > 0", name="positive_target_price"),
        CheckConstraint("buyer_company_id <> exporter_company_id", name="different_companies"),
        Index("ix_rfqs_buyer_created", "buyer_company_id", "created_at"),
        Index("ix_rfqs_exporter_status_created", "exporter_company_id", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    buyer_company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))
    exporter_company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    unit: Mapped[str] = mapped_column(String(32))
    target_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3), default="EUR", server_default="EUR")
    incoterms: Mapped[Incoterm] = mapped_column(Enum(Incoterm, name="incoterm"))
    destination_country: Mapped[str] = mapped_column(String(2))
    destination_port: Mapped[str | None] = mapped_column(String(100))
    required_date: Mapped[dt.date] = mapped_column(Date)
    message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[RfqStatus] = mapped_column(
        Enum(RfqStatus, name="rfq_status"), default=RfqStatus.new, server_default="new"
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        onupdate=text("clock_timestamp()"),
    )


class RfqQuote(Base):
    """Báo giá có cấu trúc của seller cho một RFQ (U8). Trạng thái đổi theo quote_logic."""

    __tablename__ = "rfq_quotes"
    __table_args__ = (
        CheckConstraint("unit_price > 0", name="positive_price"),
        CheckConstraint("quantity > 0", name="positive_quantity"),
        CheckConstraint("deposit_percent BETWEEN 0 AND 100", name="deposit_range"),
        CheckConstraint(
            "balance_terms IN ('tt_before_shipment', 'against_bl_copy', 'lc_at_sight', 'none')",
            name="balance",
        ),
        CheckConstraint(
            "(deposit_percent = 100) = (balance_terms = 'none')", name="balance_matches_deposit"
        ),
        CheckConstraint("lead_time_days BETWEEN 1 AND 365", name="lead_time_range"),
        CheckConstraint(
            "status IN ('sent', 'accepted', 'declined', 'withdrawn', 'superseded')", name="status"
        ),
        Index("ix_rfq_quotes_rfq_created", "rfq_id", "created_at"),
        Index(
            "uq_rfq_quotes_one_open",
            "rfq_id",
            unique=True,
            postgresql_where=text("status = 'sent'"),
        ),
        Index(
            "uq_rfq_quotes_one_accepted",
            "rfq_id",
            unique=True,
            postgresql_where=text("status = 'accepted'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    rfq_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("rfqs.id"))
    exporter_company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3))
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    unit: Mapped[str] = mapped_column(String(32))
    incoterm: Mapped[Incoterm] = mapped_column(Enum(Incoterm, name="incoterm"))
    named_place: Mapped[str | None] = mapped_column(String(100))
    deposit_percent: Mapped[int] = mapped_column(SmallInteger)
    balance_terms: Mapped[BalanceTerms] = mapped_column(
        Enum(BalanceTerms, native_enum=False, length=32, create_constraint=False)
    )
    lead_time_days: Mapped[int] = mapped_column(SmallInteger)
    valid_until: Mapped[dt.date] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[QuoteStatus] = mapped_column(
        Enum(QuoteStatus, native_enum=False, length=16, create_constraint=False),
        default=QuoteStatus.sent,
        server_default="sent",
    )
    decision_reason: Mapped[str | None] = mapped_column(Text)
    decided_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


class Conversation(Base):
    """Hội thoại giữa hai công ty (F2).

    - Theo RFQ: mở tự động cùng RFQ, mỗi RFQ đúng một hội thoại; a = buyer, b = exporter.
    - Trực tiếp (U7): rfq_id NULL; a = bên mở, b = nhà cung cấp. Mỗi cặp công ty tối đa MỘT hội
      thoại trực tiếp, không phân biệt chiều (unique index uq_conversations_direct_pair bên dưới).
    """

    __tablename__ = "conversations"
    __table_args__ = (
        CheckConstraint("company_a_id <> company_b_id", name="two_companies"),
        Index("ix_conversations_company_a", "company_a_id"),
        Index("ix_conversations_company_b", "company_b_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    rfq_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("rfqs.id"), unique=True)
    company_a_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))  # buyer / bên mở
    company_b_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))  # exporter
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )


Index(
    "uq_conversations_direct_pair",
    func.least(Conversation.company_a_id, Conversation.company_b_id),
    func.greatest(Conversation.company_a_id, Conversation.company_b_id),
    unique=True,
    postgresql_where=Conversation.rfq_id.is_(None),
)


class Message(Base):
    """Tin nhắn; lưu cả bản gốc và bản dịch cho người nhận (F3)."""

    __tablename__ = "messages"
    __table_args__ = (
        CheckConstraint("length(btrim(body_original)) > 0", name="body_not_blank"),
        CheckConstraint(
            "(body_translated IS NULL) = (translated_language IS NULL)",
            name="translation_and_language_together",
        ),
        Index("ix_messages_conversation_sent", "conversation_id", "sent_at", "id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id"))
    sender_company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))
    body_original: Mapped[str] = mapped_column(Text)
    body_translated: Mapped[str | None] = mapped_column(Text)
    original_language: Mapped[str] = mapped_column(String(2))
    translated_language: Mapped[str | None] = mapped_column(String(2))
    sent_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    read_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
