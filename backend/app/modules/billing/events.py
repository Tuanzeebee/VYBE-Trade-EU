import uuid
from dataclasses import dataclass

from app.core.events import Event


@dataclass(frozen=True)
class OrderPaid(Event):
    """Admin xác nhận đã nhận chuyển khoản (U19): công ty nhận thông báo, quyền dùng đã được cấp."""

    company_id: uuid.UUID
    order_id: uuid.UUID
    reference: str
    item_name_vi: str
    item_name_en: str
