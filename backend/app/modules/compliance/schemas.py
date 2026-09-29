import re
from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.compliance.calculators import EU_MEMBERS

MAX_VALUE = Decimal("999999999999.99")  # vừa khít numeric(14,2) của cột product_value
_AMOUNT = re.compile(r"[0-9]{1,12}(\.[0-9]{1,2})?")


class TariffIn(BaseModel):
    """Số tiền nhận dạng CHUỖI JSON (không nhận số) để không bao giờ đi qua float."""

    model_config = ConfigDict(strict=True)

    hs_code: Annotated[str, Field(max_length=32)]
    destination: str
    product_value: Decimal
    shipments_per_year: Annotated[int | None, Field(ge=1, le=10_000)] = None

    @field_validator("product_value", mode="before")
    @classmethod
    def _amount(cls, value: Any) -> Decimal:
        if not isinstance(value, str) or not _AMOUNT.fullmatch(value):
            raise ValueError("product_value must be a decimal string with at most 2 decimals")
        amount = Decimal(value)
        if amount <= 0 or amount > MAX_VALUE:
            raise ValueError("product_value must be greater than 0 and below 10^12")
        return amount

    @field_validator("destination")
    @classmethod
    def _destination(cls, value: str) -> str:
        upper = value.strip().upper()
        if upper not in EU_MEMBERS:
            raise ValueError("destination must be an EU member state (ISO 3166-1 alpha-2)")
        return upper


class TariffOut(BaseModel):
    check_id: str
    status: Literal["ok", "unsupported", "needs_review"]
    hs_code: str
    hs_formatted: str
    destination: str
    product_value: Decimal
    mfn_rate: Decimal | None
    evfta_rate: Decimal | None
    mfn_duty: Decimal | None
    evfta_duty: Decimal | None
    savings: Decimal | None
    annual_savings: Decimal | None
    quota_note: str | None
    condition_note: str | None
