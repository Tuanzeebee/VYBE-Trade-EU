import datetime as dt
import re
import uuid
from decimal import Decimal
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.modules.messaging.models import Incoterm, RfqStatus

_AMOUNT = re.compile(r"[0-9]{1,12}(\.[0-9]{1,2})?")
_MAX = Decimal(10) ** 12


def _amount(value: Any) -> Decimal:
    """Số tiền và số lượng nhận CHUỖI (không nhận số JSON), > 0, tối đa 2 chữ số thập phân."""
    if not isinstance(value, str) or not _AMOUNT.fullmatch(value):
        raise ValueError("must be a decimal string with at most 2 decimals")
    amount = Decimal(value)
    if amount <= 0 or amount >= _MAX:
        raise ValueError("must be greater than 0 and below 10^12")
    return amount


class RfqIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: uuid.UUID
    quantity: Decimal
    unit: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=32)]
    target_price: Decimal | None = None
    currency: Annotated[str, Field(pattern=r"^[A-Z]{3}$")] = "EUR"
    incoterms: Incoterm
    destination_country: Annotated[str, Field(pattern=r"^[A-Z]{2}$")]
    destination_port: Annotated[str | None, Field(max_length=100)] = None
    required_date: dt.date
    message: Annotated[str | None, Field(max_length=2000)] = None

    @field_validator("quantity", mode="before")
    @classmethod
    def _quantity(cls, value: Any) -> Decimal:
        return _amount(value)

    @field_validator("target_price", mode="before")
    @classmethod
    def _target_price(cls, value: Any) -> Decimal | None:
        return None if value is None else _amount(value)

    @field_validator("destination_port", "message")
    @classmethod
    def _strip(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class RfqStatusIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: RfqStatus


class RfqOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    buyer_company_id: uuid.UUID
    buyer_name: str
    exporter_company_id: uuid.UUID
    exporter_name: str
    quantity: str  # chuỗi thập phân, không qua float
    unit: str
    target_price: str | None
    currency: str
    incoterms: Incoterm
    destination_country: str
    destination_port: str | None
    required_date: dt.date
    message: str | None
    status: RfqStatus
    created_at: dt.datetime
    updated_at: dt.datetime


class RfqSummary(BaseModel):
    """Tóm tắt RFQ của một công ty cho dashboard (G1, G2)."""

    counts: dict[str, int]  # số RFQ theo từng trạng thái (đủ bốn trạng thái)
    total: int
    created_since: int  # số RFQ tạo từ mốc `since`
    recent: list[RfqOut]
