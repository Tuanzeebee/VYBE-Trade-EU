import re
from decimal import Decimal
from typing import Annotated, Any, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.modules.catalog.service import normalize_code
from app.modules.compliance.calculators import EU_MEMBERS

MAX_VALUE = Decimal("999999999999.99")  # vừa khít numeric(14,2) của cột product_value
_AMOUNT = re.compile(r"[0-9]{1,12}(\.[0-9]{1,2})?")
MAX_MATERIALS = 50
_COUNTRY = re.compile(r"[A-Z]{2}")


def parse_amount(value: Any) -> Decimal:
    """Số tiền chỉ nhận CHUỖI (không nhận số JSON), > 0, tối đa 2 chữ số thập phân, dưới 10^12."""
    if not isinstance(value, str) or not _AMOUNT.fullmatch(value):
        raise ValueError("amount must be a decimal string with at most 2 decimals")
    amount = Decimal(value)
    if amount <= 0 or amount > MAX_VALUE:
        raise ValueError("amount must be greater than 0 and below 10^12")
    return amount


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
        return parse_amount(value)

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


class MaterialIn(BaseModel):
    model_config = ConfigDict(strict=True)

    origin_country: str
    value: Decimal
    hs_code: str | None = None

    @field_validator("value", mode="before")
    @classmethod
    def _value(cls, value: Any) -> Decimal:
        return parse_amount(value)

    @field_validator("origin_country")
    @classmethod
    def _country(cls, value: str) -> str:
        upper = value.strip().upper()
        if not _COUNTRY.fullmatch(upper):
            raise ValueError("origin_country must be an ISO 3166-1 alpha-2 code")
        return upper

    @field_validator("hs_code")
    @classmethod
    def _hs(cls, value: str | None) -> str | None:
        if value is None:
            return None
        code = normalize_code(value)
        if code is None:
            raise ValueError("hs_code must be 6 to 8 digits")
        return code


class RooIn(BaseModel):
    """Xuất xứ hàng Việt Nam xuất sang EU. Mọi số tiền cùng một đơn vị tiền tệ, là CHUỖI JSON."""

    model_config = ConfigDict(strict=True)

    hs_code: Annotated[str, Field(max_length=32)]
    ex_works_value: Decimal | None = None
    materials_declared: bool
    materials: Annotated[list[MaterialIn], Field(max_length=MAX_MATERIALS)] = Field(
        default_factory=list
    )

    @field_validator("ex_works_value", mode="before")
    @classmethod
    def _ex_works(cls, value: Any) -> Decimal | None:
        return None if value is None else parse_amount(value)

    @model_validator(mode="after")
    def _declared_matches_list(self) -> Self:
        if not self.materials_declared and self.materials:
            raise ValueError("materials must be empty when materials_declared is false")
        return self


class RooOut(BaseModel):
    check_id: str
    status: Literal["pass", "fail", "inconclusive", "unsupported"]
    reason: str | None
    hs_code: str
    hs_formatted: str
    ex_works_value: Decimal | None
    nom_pct: Decimal | None
    rvc_pct: Decimal | None
    rule_type: str | None
    threshold_pct: Decimal | None
    rule_text: str | None
    source: str | None
