import datetime as dt
import re
import uuid
from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

_PRICE = re.compile(r"[0-9]{1,12}(\.[0-9]{1,2})?")

OrderStatus = Literal["pending", "paid", "cancelled"]


class BillingItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name_vi: str
    name_en: str
    description_vi: str | None
    description_en: str | None
    audience: Literal["exporter", "buyer"]
    feature: str
    price: Decimal
    currency: str
    duration_days: int | None
    price_is_placeholder: bool


class AdminBillingItemOut(BillingItemOut):
    is_active: bool
    sort_order: int
    updated_at: dt.datetime | None


class BillingItemPatch(BaseModel):
    """Admin chỉnh giá / bật tắt mục thu phí. Tiền nhận CHUỖI JSON (strict), không nhận số."""

    model_config = ConfigDict(strict=True)

    price: Decimal | None = None
    currency: Literal["VND", "EUR", "USD"] | None = None
    duration_days: Annotated[int, Field(gt=0, le=3650)] | None = None
    is_active: bool | None = None
    price_is_placeholder: bool | None = None

    @field_validator("price", mode="before")
    @classmethod
    def _price(cls, value: Any) -> Decimal | None:
        if value is None:
            return None
        if not isinstance(value, str) or not _PRICE.fullmatch(value):
            raise ValueError("price must be a decimal string (>= 0, at most 2 decimals)")
        return Decimal(value)


class InvoiceInfo(BaseModel):
    """Thông tin xuất hoá đơn VAT (xuất ngoài hệ thống, ADR-0005). Tuỳ chọn."""

    company_name: Annotated[str, Field(max_length=255)] | None = None
    tax_code: Annotated[str, Field(max_length=32)] | None = None
    address: Annotated[str, Field(max_length=500)] | None = None
    email: EmailStr | None = None


class OrderIn(BaseModel):
    item_code: Annotated[str, Field(min_length=1, max_length=64)]
    invoice_info: InvoiceInfo = Field(default_factory=InvoiceInfo)


class BankTransferOut(BaseModel):
    bank_name: str
    account_name: str
    account_number: str
    iban: str | None
    swift: str | None
    transfer_note: str  # = mã tham chiếu đơn; admin đối soát bằng mã này
    is_demo_account: bool


class OrderOut(BaseModel):
    id: uuid.UUID
    item_code: str
    item_name_vi: str
    item_name_en: str
    feature: str
    amount: Decimal
    currency: str
    reference: str
    status: OrderStatus
    invoice_info: dict[str, str | None]
    created_at: dt.datetime
    paid_at: dt.datetime | None
    cancelled_at: dt.datetime | None
    bank_transfer: BankTransferOut | None  # chỉ khi đơn đang chờ chuyển khoản


class AdminOrderOut(OrderOut):
    company_id: uuid.UUID
    company_name: str
    admin_note: str | None


class OrderDecisionIn(BaseModel):
    note: Annotated[str | None, Field(max_length=1000)] = None


class EntitlementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    feature: str
    valid_from: dt.datetime
    valid_until: dt.datetime | None
    order_id: uuid.UUID
