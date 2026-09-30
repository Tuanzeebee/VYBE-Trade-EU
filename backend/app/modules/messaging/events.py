import uuid
from dataclasses import dataclass

from app.core.events import Event


@dataclass(frozen=True)
class RfqCreated(Event):
    """Buyer gửi RFQ: thông báo trong ứng dụng và email cho exporter (H1, H2)."""

    rfq_id: uuid.UUID
    buyer_company_id: uuid.UUID
    exporter_company_id: uuid.UUID
    buyer_name: str
    product_name: str


@dataclass(frozen=True)
class RfqStatusChanged(Event):
    """Exporter đổi trạng thái: buyer thấy thông báo trong ứng dụng."""

    rfq_id: uuid.UUID
    buyer_company_id: uuid.UUID
    exporter_company_id: uuid.UUID
    exporter_name: str
    product_name: str
    old_status: str
    new_status: str


@dataclass(frozen=True)
class MessageSent(Event):
    """Có tin nhắn mới: thông báo trong ứng dụng và email cho công ty nhận (H1, H2)."""

    conversation_id: uuid.UUID
    sender_company_id: uuid.UUID
    recipient_company_id: uuid.UUID
    sender_name: str


@dataclass(frozen=True)
class QuoteSent(Event):
    """Seller gửi báo giá (U8): buyer thấy thông báo trong ứng dụng."""

    rfq_id: uuid.UUID
    quote_id: uuid.UUID
    buyer_company_id: uuid.UUID
    exporter_name: str
    product_name: str


@dataclass(frozen=True)
class QuoteDecided(Event):
    """Buyer chấp nhận / từ chối báo giá (U8): seller thấy thông báo trong ứng dụng."""

    rfq_id: uuid.UUID
    quote_id: uuid.UUID
    exporter_company_id: uuid.UUID
    buyer_name: str
    product_name: str
    decision: str  # accepted | declined
