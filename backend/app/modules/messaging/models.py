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
    String,
    Text,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


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


class Conversation(Base):
    """Hội thoại giữa hai công ty, mở tự động cùng RFQ (F2). Mỗi RFQ đúng một hội thoại."""

    __tablename__ = "conversations"
    __table_args__ = (
        Index("ix_conversations_company_a", "company_a_id"),
        Index("ix_conversations_company_b", "company_b_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    rfq_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("rfqs.id"), unique=True)
    company_a_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))  # buyer
    company_b_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))  # exporter
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
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
