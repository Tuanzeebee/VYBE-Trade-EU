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
