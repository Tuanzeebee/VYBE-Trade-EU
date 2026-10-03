"""Schema cho màn hình admin nhập + duyệt dữ liệu tuân thủ (C1, C4).

Thuế suất và ngưỡng nhận dạng CHUỖI JSON (không nhận số) để không đi qua float.
"""

import datetime as dt
import re
import uuid
from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.catalog.service import normalize_code
from app.modules.compliance.calculators import EU_MEMBERS
from app.modules.compliance.models import DutyType, RuleType

_RATE = re.compile(r"[0-9]{1,3}(\.[0-9]{1,4})?")
_THRESHOLD = re.compile(r"[0-9]{1,3}(\.[0-9]{1,2})?")
HUNDRED = Decimal(100)
DESTINATIONS = EU_MEMBERS | {"EU"}  # 'EU' = biểu thuế chung của liên minh thuế quan
_ISO2 = re.compile(r"[A-Z]{2}")
_AGREEMENT = re.compile(r"[A-Z0-9_]{2,16}")

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
    """U12: 'EU' (biểu thuế chung) hoặc mọi nước nhập khẩu ISO-2 (trừ VN)."""
    upper = value.strip().upper()
    if not _ISO2.fullmatch(upper) or upper == "VN":
        raise ValueError("destination must be 'EU' or an import country (ISO-2)")
    return upper


def _agreement(value: str) -> str:
    upper = value.strip().upper()
    if not _AGREEMENT.fullmatch(upper):
        raise ValueError("agreement_code must be 2-16 characters A-Z, 0-9 or _")
    return upper


class TariffLineIn(BaseModel):
    hs_code: str
    destination: str
    agreement_code: str = "EVFTA"
    duty_type: DutyType
    mfn_rate: Decimal | None = None
    mfn_specific: Annotated[str | None, Field(max_length=255)] = None
    evfta_rate_current: Decimal | None = None
    staging_category: Annotated[str | None, Field(max_length=16)] = None
    zero_from: dt.date | None = None
    quota_required: bool = False
    quota_note: Text = None
    condition_note: Text = None
    quota_note_en: Text = None
    condition_note_en: Text = None
    source_url: Url = None
    valid_from: dt.date
    valid_until: dt.date | None = None

    _hs_code = field_validator("hs_code")(_hs)
    _dest = field_validator("destination")(_destination)
    _agree = field_validator("agreement_code")(_agreement)

    @field_validator("mfn_rate", "evfta_rate_current", mode="before")
    @classmethod
    def _rate(cls, value: Any) -> Decimal | None:
        return _percentage(value, _RATE)


class TariffLinePatch(BaseModel):
    """Mọi trường tùy chọn; chỉ trường được gửi mới đổi (kể cả gửi null để xóa)."""

    hs_code: str | None = None
    destination: str | None = None
    agreement_code: str | None = None
    duty_type: DutyType | None = None
    mfn_rate: Decimal | None = None
    mfn_specific: Annotated[str | None, Field(max_length=255)] = None
    evfta_rate_current: Decimal | None = None
    staging_category: Annotated[str | None, Field(max_length=16)] = None
    zero_from: dt.date | None = None
    quota_required: bool | None = None
    quota_note: Text = None
    condition_note: Text = None
    quota_note_en: Text = None
    condition_note_en: Text = None
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

    @field_validator("agreement_code")
    @classmethod
    def _agree(cls, value: str | None) -> str | None:
        return None if value is None else _agreement(value)

    @field_validator("mfn_rate", "evfta_rate_current", mode="before")
    @classmethod
    def _rate(cls, value: Any) -> Decimal | None:
        return _percentage(value, _RATE)


class TariffLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    hs_code: str
    destination: str
    agreement_code: str
    duty_type: DutyType
    mfn_rate: Decimal | None
    mfn_specific: str | None
    evfta_rate_current: Decimal | None
    staging_category: str | None
    zero_from: dt.date | None
    quota_required: bool
    quota_note: str | None
    condition_note: str | None
    quota_note_en: str | None
    condition_note_en: str | None
    source_url: str | None
    valid_from: dt.date
    valid_until: dt.date | None
    is_demo: bool = False
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


def _eu_country(value: str) -> str:
    upper = value.strip().upper()
    if upper not in EU_MEMBERS:
        raise ValueError("country must be an EU member state (ISO 3166-1 alpha-2)")
    return upper


class CountryTermIn(BaseModel):
    hs_code: str
    country: str
    vat_rate: Decimal
    label_languages: Annotated[str | None, Field(max_length=64)] = None
    note: Text = None
    note_en: Text = None
    source: Text = None
    valid_from: dt.date
    valid_until: dt.date | None = None

    _hs_code = field_validator("hs_code")(_hs)
    _country = field_validator("country")(_eu_country)

    @field_validator("vat_rate", mode="before")
    @classmethod
    def _vat(cls, value: Any) -> Decimal:
        parsed = _percentage(value, _RATE)
        if parsed is None:
            raise ValueError("vat_rate is required")
        return parsed


class CountryTermPatch(BaseModel):
    hs_code: str | None = None
    country: str | None = None
    vat_rate: Decimal | None = None
    label_languages: Annotated[str | None, Field(max_length=64)] = None
    note: Text = None
    note_en: Text = None
    source: Text = None
    valid_from: dt.date | None = None
    valid_until: dt.date | None = None

    @field_validator("hs_code")
    @classmethod
    def _hs_code(cls, value: str | None) -> str | None:
        return None if value is None else _hs(value)

    @field_validator("country")
    @classmethod
    def _country(cls, value: str | None) -> str | None:
        return None if value is None else _eu_country(value)

    @field_validator("vat_rate", mode="before")
    @classmethod
    def _vat(cls, value: Any) -> Decimal | None:
        return _percentage(value, _RATE)


class CountryTermOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    hs_code: str
    country: str
    vat_rate: Decimal
    label_languages: str | None
    note: str | None
    note_en: str | None
    source: str | None
    valid_from: dt.date
    valid_until: dt.date | None
    reviewed_by: uuid.UUID | None
    reviewed_at: dt.datetime | None


# ── Hiệp định thương mại (U12) ───────────────────────────────────────────────
Partners = Annotated[list[str], Field(max_length=40)]


def _partners(values: list[str]) -> list[str]:
    cleaned = [v.strip().upper() for v in values if v.strip()]
    for v in cleaned:
        if not _ISO2.fullmatch(v):
            raise ValueError("partners must be ISO-2 codes or 'EU'")
    return list(dict.fromkeys(cleaned))


class TradeAgreementIn(BaseModel):
    code: str
    name_vi: Annotated[str, Field(min_length=1, max_length=255)]
    name_en: Annotated[str, Field(min_length=1, max_length=255)]
    partners: Partners = Field(default_factory=list)
    in_force_from: dt.date | None = None
    source_url: Url = None
    note: Text = None

    _code = field_validator("code")(_agreement)
    _partner_list = field_validator("partners")(_partners)


class TradeAgreementPatch(BaseModel):
    name_vi: Annotated[str | None, Field(min_length=1, max_length=255)] = None
    name_en: Annotated[str | None, Field(min_length=1, max_length=255)] = None
    partners: Partners | None = None
    in_force_from: dt.date | None = None
    source_url: Url = None
    note: Text = None

    @field_validator("partners")
    @classmethod
    def _partner_list(cls, value: list[str] | None) -> list[str] | None:
        return None if value is None else _partners(value)


class TradeAgreementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name_vi: str
    name_en: str
    partners: list[str]
    in_force_from: dt.date | None
    source_url: str | None
    note: str | None
    reviewed_by: uuid.UUID | None
    reviewed_at: dt.datetime | None


# ── Phân nhóm sản phẩm và hạn ngạch (U13) ──────────────────────────────────
_SUBTYPE = re.compile(r"[a-z0-9_]{2,40}")
_PREFIX = re.compile(r"[0-9]{4,8}")
_SPECIFIC = re.compile(r"[0-9]{1,8}(\.[0-9]{1,4})?")
_VOLUME = re.compile(r"[0-9]{1,11}(\.[0-9]{1,3})?")
VolumeUnit = Literal["tonne", "kg", "piece", "liter"]


def _subtype_code(value: str) -> str:
    code = value.strip().lower()
    if not _SUBTYPE.fullmatch(code):
        raise ValueError("code must be 2-40 characters a-z, 0-9 or _")
    return code


def _hs_prefix(value: str) -> str:
    digits = re.sub(r"[\s.]", "", value)
    if not _PREFIX.fullmatch(digits):
        raise ValueError("hs_prefix must be 4 to 8 digits")
    return digits


def _decimal(value: Any, pattern: re.Pattern[str], name: str) -> Decimal | None:
    if value is None:
        return None
    if not isinstance(value, str) or not pattern.fullmatch(value):
        raise ValueError(f"{name} must be a decimal string")
    return Decimal(value)


class ProductSubtypeIn(BaseModel):
    code: str
    hs_prefix: str
    name_vi: Annotated[str, Field(min_length=1, max_length=255)]
    name_en: Annotated[str, Field(min_length=1, max_length=255)]
    description_vi: Text = None
    description_en: Text = None
    source: Text = None

    _code = field_validator("code")(_subtype_code)
    _prefix = field_validator("hs_prefix")(_hs_prefix)


class ProductSubtypePatch(BaseModel):
    hs_prefix: str | None = None
    name_vi: Annotated[str | None, Field(min_length=1, max_length=255)] = None
    name_en: Annotated[str | None, Field(min_length=1, max_length=255)] = None
    description_vi: Text = None
    description_en: Text = None
    source: Text = None

    @field_validator("hs_prefix")
    @classmethod
    def _prefix(cls, value: str | None) -> str | None:
        return None if value is None else _hs_prefix(value)


class ProductSubtypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    hs_prefix: str
    name_vi: str
    name_en: str
    description_vi: str | None
    description_en: str | None
    source: str | None
    is_demo: bool
    reviewed_by: uuid.UUID | None
    reviewed_at: dt.datetime | None


AllocationMethod = Literal[
    "IMPORTER_FIRST_COME", "IMPORT_LICENCE", "EXPORT_LICENCE", "ALLOCATION", "OTHER"
]


class QuotaBalanceIn(BaseModel):
    """Khối lượng đã dùng tại một ngày; ngày và nguồn bắt buộc (số liệu thực tế)."""

    as_of: dt.date
    used_volume: Decimal
    source: Annotated[str, Field(min_length=3, max_length=1024)]

    @field_validator("as_of")
    @classmethod
    def _as_of(cls, value: dt.date) -> dt.date:
        if value > dt.datetime.now(dt.UTC).date():
            raise ValueError("as_of cannot be in the future")
        return value

    @field_validator("used_volume", mode="before")
    @classmethod
    def _used(cls, value: Any) -> Decimal:
        number = _decimal(value, _VOLUME, "used_volume")
        if number is None:
            raise ValueError("used_volume is required")
        return number


class QuotaBalanceOut(BaseModel):
    id: uuid.UUID
    quota_id: uuid.UUID
    as_of: dt.date
    used_volume: Decimal
    source: str
    entered_by: uuid.UUID | None


class _QuotaFields(BaseModel):
    in_quota_rate: Decimal | None = None
    in_quota_specific: Decimal | None = None
    out_quota_rate: Decimal | None = None
    out_quota_specific: Decimal | None = None

    @field_validator("in_quota_rate", "out_quota_rate", mode="before")
    @classmethod
    def _rate(cls, value: Any) -> Decimal | None:
        return _percentage(value, _RATE)

    @field_validator("in_quota_specific", "out_quota_specific", mode="before")
    @classmethod
    def _specific(cls, value: Any) -> Decimal | None:
        return _decimal(value, _SPECIFIC, "specific duty")


class TariffQuotaIn(_QuotaFields):
    agreement_code: str = "EVFTA"
    destination: str
    hs_prefix: str
    quota_code: Annotated[str | None, Field(max_length=32)] = None
    quota_year: Annotated[int | None, Field(ge=2000, le=2100)] = None
    volume: Decimal
    volume_unit: VolumeUnit = "tonne"
    in_quota_duty_type: DutyType
    out_quota_duty_type: DutyType
    specific_unit: VolumeUnit | None = None
    licence_note_vi: Text = None
    licence_note_en: Text = None
    allocation_note_vi: Text = None
    allocation_note_en: Text = None
    period_start: dt.date | None = None
    period_end: dt.date | None = None
    allocation_method: AllocationMethod | None = None
    licence_required: bool = False
    licence_issuer_vi: Text = None
    source_url: Url = None
    valid_from: dt.date
    valid_until: dt.date | None = None
    eligible_subtypes: Annotated[list[str], Field(max_length=50)] = Field(default_factory=list)

    _agree = field_validator("agreement_code")(_agreement)
    _dest = field_validator("destination")(_destination)
    _prefix = field_validator("hs_prefix")(_hs_prefix)

    @field_validator("volume", mode="before")
    @classmethod
    def _volume(cls, value: Any) -> Decimal:
        number = _decimal(value, _VOLUME, "volume")
        if number is None or number <= 0:
            raise ValueError("volume must be greater than 0")
        return number

    @field_validator("eligible_subtypes")
    @classmethod
    def _subtypes(cls, values: list[str]) -> list[str]:
        return list(dict.fromkeys(_subtype_code(v) for v in values))


class TariffQuotaPatch(_QuotaFields):
    agreement_code: str | None = None
    destination: str | None = None
    hs_prefix: str | None = None
    quota_code: Annotated[str | None, Field(max_length=32)] = None
    quota_year: Annotated[int | None, Field(ge=2000, le=2100)] = None
    volume: Decimal | None = None
    volume_unit: VolumeUnit | None = None
    in_quota_duty_type: DutyType | None = None
    out_quota_duty_type: DutyType | None = None
    specific_unit: VolumeUnit | None = None
    licence_note_vi: Text = None
    licence_note_en: Text = None
    allocation_note_vi: Text = None
    allocation_note_en: Text = None
    period_start: dt.date | None = None
    period_end: dt.date | None = None
    allocation_method: AllocationMethod | None = None
    licence_required: bool | None = None
    licence_issuer_vi: Text = None
    source_url: Url = None
    valid_from: dt.date | None = None
    valid_until: dt.date | None = None
    eligible_subtypes: Annotated[list[str] | None, Field(max_length=50)] = None

    @field_validator("agreement_code")
    @classmethod
    def _agree(cls, value: str | None) -> str | None:
        return None if value is None else _agreement(value)

    @field_validator("destination")
    @classmethod
    def _dest(cls, value: str | None) -> str | None:
        return None if value is None else _destination(value)

    @field_validator("hs_prefix")
    @classmethod
    def _prefix(cls, value: str | None) -> str | None:
        return None if value is None else _hs_prefix(value)

    @field_validator("volume", mode="before")
    @classmethod
    def _volume(cls, value: Any) -> Decimal | None:
        number = _decimal(value, _VOLUME, "volume")
        if number is not None and number <= 0:
            raise ValueError("volume must be greater than 0")
        return number

    @field_validator("eligible_subtypes")
    @classmethod
    def _subtypes(cls, values: list[str] | None) -> list[str] | None:
        return None if values is None else list(dict.fromkeys(_subtype_code(v) for v in values))


class TariffQuotaOut(BaseModel):
    id: uuid.UUID
    agreement_code: str
    destination: str
    hs_prefix: str
    quota_code: str | None
    quota_year: int | None
    volume: Decimal
    volume_unit: str
    in_quota_duty_type: DutyType
    in_quota_rate: Decimal | None
    in_quota_specific: Decimal | None
    out_quota_duty_type: DutyType
    out_quota_rate: Decimal | None
    out_quota_specific: Decimal | None
    specific_unit: str | None
    licence_note_vi: str | None
    licence_note_en: str | None
    allocation_note_vi: str | None
    allocation_note_en: str | None
    period_start: dt.date | None
    period_end: dt.date | None
    allocation_method: str | None
    licence_required: bool
    licence_issuer_vi: str | None
    source_url: str | None
    valid_from: dt.date
    valid_until: dt.date | None
    eligible_subtypes: list[str]
    is_demo: bool
    reviewed_by: uuid.UUID | None
    reviewed_at: dt.datetime | None


# ── Cảnh báo ngành (U14) ─────────────────────────────────────────────────────
Severity = Literal["info", "warning", "critical"]
Prefixes = Annotated[list[str], Field(min_length=1, max_length=40)]


def _prefixes(values: list[str]) -> list[str]:
    return list(dict.fromkeys(_hs_prefix_short(v) for v in values if v.strip()))


def _hs_prefix_short(value: str) -> str:
    """Tiền tố cảnh báo: 2–8 chữ số (chương 03 cũng hợp lệ)."""
    digits = re.sub(r"[\s.]", "", value)
    if not re.fullmatch(r"[0-9]{2,8}", digits):
        raise ValueError("hs_prefixes must be 2 to 8 digits each")
    return digits


class SectorAlertIn(BaseModel):
    code: str
    hs_prefixes: Prefixes
    severity: Severity = "warning"
    title_vi: Annotated[str, Field(min_length=1, max_length=255)]
    title_en: Annotated[str, Field(min_length=1, max_length=255)]
    body_vi: Text = None
    body_en: Text = None
    source_url: Url = None
    valid_from: dt.date
    valid_until: dt.date | None = None

    _code = field_validator("code")(_subtype_code)
    _prefix_list = field_validator("hs_prefixes")(_prefixes)


class SectorAlertPatch(BaseModel):
    hs_prefixes: Annotated[list[str] | None, Field(min_length=1, max_length=40)] = None
    severity: Severity | None = None
    title_vi: Annotated[str | None, Field(min_length=1, max_length=255)] = None
    title_en: Annotated[str | None, Field(min_length=1, max_length=255)] = None
    body_vi: Text = None
    body_en: Text = None
    source_url: Url = None
    valid_from: dt.date | None = None
    valid_until: dt.date | None = None

    @field_validator("hs_prefixes")
    @classmethod
    def _prefix_list(cls, values: list[str] | None) -> list[str] | None:
        return None if values is None else _prefixes(values)


class AdminSectorAlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    hs_prefixes: list[str]
    severity: str
    title_vi: str
    title_en: str
    body_vi: str | None
    body_en: str | None
    source_url: str | None
    valid_from: dt.date
    valid_until: dt.date | None
    is_demo: bool
    reviewed_by: uuid.UUID | None
    reviewed_at: dt.datetime | None
