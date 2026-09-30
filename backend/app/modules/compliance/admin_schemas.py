"""Schema cho màn hình admin nhập + duyệt dữ liệu tuân thủ (C1, C4).

Thuế suất và ngưỡng nhận dạng CHUỖI JSON (không nhận số) để không đi qua float.
"""

import datetime as dt
import re
import uuid
from decimal import Decimal
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.catalog.service import normalize_code
from app.modules.compliance.calculators import EU_MEMBERS
from app.modules.compliance.models import DutyType, RuleType

_RATE = re.compile(r"[0-9]{1,3}(\.[0-9]{1,4})?")
_THRESHOLD = re.compile(r"[0-9]{1,3}(\.[0-9]{1,2})?")
HUNDRED = Decimal(100)
DESTINATIONS = EU_MEMBERS | {"EU"}  # 'EU' = biểu thuế chung của liên minh thuế quan

Text = Annotated[str | None, Field(max_length=4000)]
Url = Annotated[str | None, Field(max_length=1024)]


def _percentage(value: Any, pattern: re.Pattern[str]) -> Decimal | None:
    if value is None:
        return None
    if not isinstance(value, str) or not pattern.fullmatch(value):
        raise ValueError("must be a decimal string, e.g. '12.5'")
    number = Decimal(value)
    if number > HUNDRED:
        raise ValueError("must be between 0 and 100")
    return number


def _hs(value: str) -> str:
    code = normalize_code(value)
    if code is None:
        raise ValueError("hs_code must be 6 to 8 digits")
    return code


def _destination(value: str) -> str:
    upper = value.strip().upper()
    if upper not in DESTINATIONS:
        raise ValueError("destination must be an EU member state or 'EU'")
    return upper


class TariffLineIn(BaseModel):
    hs_code: str
    destination: str
    duty_type: DutyType
    mfn_rate: Decimal | None = None
    mfn_specific: Annotated[str | None, Field(max_length=255)] = None
    evfta_rate_current: Decimal | None = None
    staging_category: Annotated[str | None, Field(max_length=16)] = None
    zero_from: dt.date | None = None
    quota_required: bool = False
    quota_note: Text = None
    condition_note: Text = None
    source_url: Url = None
    valid_from: dt.date
    valid_until: dt.date | None = None

    _hs_code = field_validator("hs_code")(_hs)
    _dest = field_validator("destination")(_destination)

    @field_validator("mfn_rate", "evfta_rate_current", mode="before")
    @classmethod
    def _rate(cls, value: Any) -> Decimal | None:
        return _percentage(value, _RATE)


class TariffLinePatch(BaseModel):
    """Mọi trường tùy chọn; chỉ trường được gửi mới đổi (kể cả gửi null để xóa)."""

    hs_code: str | None = None
    destination: str | None = None
    duty_type: DutyType | None = None
    mfn_rate: Decimal | None = None
    mfn_specific: Annotated[str | None, Field(max_length=255)] = None
    evfta_rate_current: Decimal | None = None
    staging_category: Annotated[str | None, Field(max_length=16)] = None
    zero_from: dt.date | None = None
    quota_required: bool | None = None
    quota_note: Text = None
    condition_note: Text = None
    source_url: Url = None
    valid_from: dt.date | None = None
    valid_until: dt.date | None = None

    @field_validator("hs_code")
    @classmethod
    def _hs_code(cls, value: str | None) -> str | None:
        return None if value is None else _hs(value)

    @field_validator("destination")
    @classmethod
    def _dest(cls, value: str | None) -> str | None:
        return None if value is None else _destination(value)

    @field_validator("mfn_rate", "evfta_rate_current", mode="before")
    @classmethod
    def _rate(cls, value: Any) -> Decimal | None:
        return _percentage(value, _RATE)


class TariffLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    hs_code: str
    destination: str
    duty_type: DutyType
    mfn_rate: Decimal | None
    mfn_specific: str | None
    evfta_rate_current: Decimal | None
    staging_category: str | None
    zero_from: dt.date | None
    quota_required: bool
    quota_note: str | None
    condition_note: str | None
    source_url: str | None
    valid_from: dt.date
    valid_until: dt.date | None
    reviewed_by: uuid.UUID | None
    reviewed_at: dt.datetime | None


class RooRuleIn(BaseModel):
    hs_code: str
    rule_type: RuleType
    threshold_pct: Decimal | None = None
    rule_text: Text = None
    requires_expert: bool = False
    source: Url = None
    valid_from: dt.date
    valid_until: dt.date | None = None

    _hs_code = field_validator("hs_code")(_hs)

    @field_validator("threshold_pct", mode="before")
    @classmethod
    def _threshold(cls, value: Any) -> Decimal | None:
        return _percentage(value, _THRESHOLD)


class RooRulePatch(BaseModel):
    hs_code: str | None = None
    rule_type: RuleType | None = None
    threshold_pct: Decimal | None = None
    rule_text: Text = None
    requires_expert: bool | None = None
    source: Url = None
    valid_from: dt.date | None = None
    valid_until: dt.date | None = None

    @field_validator("hs_code")
    @classmethod
    def _hs_code(cls, value: str | None) -> str | None:
        return None if value is None else _hs(value)

    @field_validator("threshold_pct", mode="before")
    @classmethod
    def _threshold(cls, value: Any) -> Decimal | None:
        return _percentage(value, _THRESHOLD)


class RooRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    hs_code: str
    rule_type: RuleType
    threshold_pct: Decimal | None
    rule_text: str | None
    requires_expert: bool
    source: str | None
    valid_from: dt.date
    valid_until: dt.date | None
    reviewed_by: uuid.UUID | None
    reviewed_at: dt.datetime | None
