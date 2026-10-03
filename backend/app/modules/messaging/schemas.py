import datetime as dt
import re
import uuid
from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.modules.messaging.models import Incoterm, RfqKind, RfqStatus
from app.modules.messaging.quote_logic import BalanceTerms

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
    kind: RfqKind = RfqKind.quote
    # Loại `quote` bắt buộc năm trường dưới đây; loại khác chỉ cần message (xem _by_kind).
    quantity: Decimal | None = None
    unit: (
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=32)] | None
    ) = None
    target_price: Decimal | None = None
    currency: Annotated[str, Field(pattern=r"^[A-Z]{3}$")] = "EUR"
    incoterms: Incoterm | None = None
    destination_country: Annotated[str, Field(pattern=r"^[A-Z]{2}$")] | None = None
    destination_port: Annotated[str | None, Field(max_length=100)] = None
    required_date: dt.date | None = None
    message: Annotated[str | None, Field(max_length=2000)] = None

    @field_validator("quantity", mode="before")
    @classmethod
    def _quantity(cls, value: Any) -> Decimal | None:
        return None if value is None else _amount(value)

    @model_validator(mode="after")
    def _by_kind(self) -> "RfqIn":
        if self.kind is RfqKind.quote:
            missing = [
                f
                for f in ("quantity", "unit", "incoterms", "destination_country", "required_date")
                if getattr(self, f) is None
            ]
            if missing:
                raise ValueError(f"quote request requires: {', '.join(missing)}")
        elif not (self.message and self.message.strip()):
            raise ValueError("message is required for this request type")
        return self

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
    # U6: seller thấy buyer đã xác minh hay chưa để chọn điều khoản thanh toán an toàn.
    buyer_verified: bool
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
    kind: RfqKind = RfqKind.quote
    created_at: dt.datetime
    updated_at: dt.datetime


class RfqQuotaOut(BaseModel):
    """Hạn mức RFQ 24 giờ của buyer (U6): buyer chưa xác minh vẫn gửi được, chỉ ít hơn."""

    limit: int
    used: int
    remaining: int
    verified: bool


class RfqSummary(BaseModel):
    """Tóm tắt RFQ của một công ty cho dashboard (G1, G2)."""

    counts: dict[str, int]  # số RFQ theo từng trạng thái (đủ bốn trạng thái)
    total: int
    created_since: int  # số RFQ tạo từ mốc `since`
    recent: list[RfqOut]


# ── Báo giá RFQ (U8) ─────────────────────────────────────────────────────────
class QuoteIn(BaseModel):
    """Seller báo giá: đơn giá, Incoterm, đặt cọc %, điều khoản phần còn lại, thời gian giao và
    hiệu lực. quantity / unit bỏ trống thì lấy theo RFQ.
    """

    model_config = ConfigDict(extra="forbid")

    unit_price: Decimal
    currency: Annotated[str, Field(pattern=r"^[A-Z]{3}$")] = "EUR"
    quantity: Decimal | None = None
    unit: Annotated[str | None, StringConstraints(strip_whitespace=True, max_length=32)] = None
    incoterm: Incoterm
    named_place: Annotated[str | None, Field(max_length=100)] = None
    deposit_percent: Annotated[int, Field(ge=0, le=100)]
    balance_terms: BalanceTerms
    lead_time_days: Annotated[int, Field(ge=1, le=365)]
    valid_until: dt.date
    notes: Annotated[str | None, Field(max_length=2000)] = None

    @field_validator("unit_price", mode="before")
    @classmethod
    def _price(cls, value: Any) -> Decimal:
        return _amount(value)

    @field_validator("quantity", mode="before")
    @classmethod
    def _quantity(cls, value: Any) -> Decimal | None:
        return None if value is None else _amount(value)

    @field_validator("named_place", "notes", "unit")
    @classmethod
    def _strip(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class QuoteDecisionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decision: Literal["accept", "decline"]
    reason: Annotated[str | None, Field(max_length=2000)] = None


class QuoteOut(BaseModel):
    id: uuid.UUID
    rfq_id: uuid.UUID
    unit_price: str
    currency: str
    quantity: str
    unit: str
    total_amount: str
    deposit_percent: int
    deposit_amount: str
    balance_terms: BalanceTerms
    incoterm: Incoterm
    named_place: str | None
    lead_time_days: int
    valid_until: dt.date
    notes: str | None
    # sent | accepted | declined | withdrawn | superseded | expired (sent quá hạn hiệu lực)
    status: str
    decision_reason: str | None
    decided_at: dt.datetime | None
    created_at: dt.datetime


class ResponseStats(BaseModel):
    """Thống kê phản hồi của seller trong một kỳ (U23) — module verification đọc qua service."""

    conversations: int
    replied: int
    median_reply_hours: Decimal | None
    rfqs: int
    quoted: int
