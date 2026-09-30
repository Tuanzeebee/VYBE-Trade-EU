import datetime as dt
import re
import uuid
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
    """Số tiền nhận dạng CHUỖI JSON (không nhận số) để không bao giờ đi qua float.

    U12: `destination` là mọi nước ISO-2; `agreement` bỏ trống thì nước EU dùng EVFTA, nước khác
    dùng hiệp định duy nhất có dữ liệu đã duyệt (nhiều hơn một → phải chọn).
    """

    model_config = ConfigDict(strict=True)

    hs_code: Annotated[str, Field(max_length=32)]
    destination: str
    product_value: Decimal
    shipments_per_year: Annotated[int | None, Field(ge=1, le=10_000)] = None
    agreement: Annotated[str | None, Field(pattern=r"^[A-Z0-9_]{2,16}$")] = None
    # U13: hàng có hạn ngạch — phân nhóm, khối lượng (theo đơn vị thuế tuyệt đối, thường là tấn)
    # và câu trả lời "đã được phân bổ hạn ngạch chưa" (chỉ để hiển thị, không đổi con số).
    subtype_code: Annotated[str | None, Field(pattern=r"^[a-z0-9_]{2,40}$")] = None
    quantity: Decimal | None = None
    quota_allocated: Literal["yes", "no", "unknown"] | None = None

    @field_validator("quantity", mode="before")
    @classmethod
    def _quantity(cls, value: Any) -> Decimal | None:
        return None if value is None else parse_amount(value)

    @field_validator("product_value", mode="before")
    @classmethod
    def _amount(cls, value: Any) -> Decimal:
        return parse_amount(value)

    @field_validator("destination")
    @classmethod
    def _destination(cls, value: str) -> str:
        upper = value.strip().upper()
        if not _COUNTRY.fullmatch(upper) or upper in ("VN", "EU"):
            raise ValueError("destination must be an import country (ISO 3166-1 alpha-2)")
        return upper


class AgreementOut(BaseModel):
    code: str
    name_vi: str
    name_en: str


class SubtypeOut(BaseModel):
    code: str
    name_vi: str
    name_en: str
    description_vi: str | None
    description_en: str | None


class QuotaInfoOut(BaseModel):
    """Thông tin hạn ngạch đã duyệt (hiển thị kèm kịch bản)."""

    quota_code: str | None
    quota_year: int | None
    volume: Decimal
    volume_unit: str
    specific_unit: str | None
    licence_note_vi: str | None
    licence_note_en: str | None
    allocation_note_vi: str | None
    allocation_note_en: str | None
    source_url: str | None


class ScenarioOut(BaseModel):
    kind: Literal["in_quota", "out_of_quota"]
    duty_type: Literal["ad_valorem", "specific", "mixed"]
    rate: Decimal | None
    specific: Decimal | None
    duty: Decimal


class TariffOptionsOut(BaseModel):
    """Lựa chọn cho form tính thuế: hiệp định có dữ liệu cho (mã HS, thị trường); U13: phân nhóm
    đã duyệt của mã HS và các hiệp định có hạn ngạch đã duyệt."""

    hs_code: str
    destination: str
    agreements: list[AgreementOut]
    subtypes: list[SubtypeOut] = Field(default_factory=list)
    quota_agreements: list[str] = Field(default_factory=list)


class TariffOut(BaseModel):
    check_id: str
    status: Literal["ok", "unsupported", "needs_review", "quota_scenarios"]
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
    quota_note_en: str | None
    condition_note_en: str | None
    # U12: hiệp định của kết quả. evfta_rate/evfta_duty giữ tên cũ (tương thích) và bằng
    # preferential_rate/preferential_duty — thuế ưu đãi theo hiệp định đã chọn.
    agreement: AgreementOut | None = None
    preferential_rate: Decimal | None = None
    preferential_duty: Decimal | None = None
    # U13: kịch bản hạn ngạch. needs_review có review_reason (mã) nhưng KHÔNG có con số.
    data_status: Literal["reviewed", "demo_unreviewed"] | None = None
    review_reason: str | None = None
    scenarios: list[ScenarioOut] = Field(default_factory=list)
    quota: QuotaInfoOut | None = None
    subtype: SubtypeOut | None = None
    subtypes: list[SubtypeOut] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)  # origin | allocation | subtype | licence
    quantity: Decimal | None = None
    quota_allocated: Literal["yes", "no", "unknown"] | None = None


class TariffPreviewOut(BaseModel):
    """Xem thuế tại sản phẩm (chỉ đọc). `unsupported` và `needs_review` không có con số nào."""

    status: Literal["ok", "unsupported", "needs_review"]
    hs_code: str
    hs_formatted: str
    mfn_rate: Decimal | None
    evfta_rate: Decimal | None
    staging_category: str | None
    zero_from: dt.date | None
    quota_note: str | None
    condition_note: str | None
    quota_note_en: str | None
    condition_note_en: str | None
    source_url: str | None


class MarketsIn(BaseModel):
    """Số tiền nhận dạng CHUỖI JSON (không nhận số). roo_status lấy từ máy tính xuất xứ."""

    model_config = ConfigDict(strict=True)

    hs_code: Annotated[str, Field(max_length=32)]
    product_value: Decimal
    roo_status: Literal["pass", "fail", "inconclusive"] | None = None

    @field_validator("product_value", mode="before")
    @classmethod
    def _amount(cls, value: Any) -> Decimal:
        return parse_amount(value)


class MarketRowOut(BaseModel):
    country: str
    status: Literal["ranked", "no_data"]
    rank: int | None
    duty: Decimal | None
    vat_rate: Decimal | None
    vat: Decimal | None
    total: Decimal | None
    label_languages: str | None
    note: str | None
    note_en: str | None


class MarketsOut(BaseModel):
    check_id: str
    status: Literal["ok", "unsupported", "needs_review"]
    basis: Literal["evfta", "mfn"] | None
    hs_code: str
    hs_formatted: str
    product_value: Decimal
    duty_rate: Decimal | None
    rows: list[MarketRowOut]


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


# ── Bản nháp EUR.1 (C5) ─────────────────────────────────────────────────────
class Eur1In(BaseModel):
    """Dữ liệu hóa đơn để phủ lên bản nháp EUR.1. Khối lượng là CHUỖI JSON."""

    model_config = ConfigDict(strict=True)

    compliance_check_id: uuid.UUID
    consignee_name: Annotated[str, Field(min_length=1, max_length=255)]
    consignee_address: Annotated[str, Field(min_length=1, max_length=500)]
    consignee_country: str
    invoice_number: Annotated[str, Field(min_length=1, max_length=64)]
    invoice_date: dt.date
    goods_description: Annotated[str, Field(min_length=1, max_length=2000)]
    packages: Annotated[str, Field(min_length=1, max_length=255)]
    gross_mass_kg: Decimal
    transport_details: Annotated[str | None, Field(max_length=500)] = None
    remarks: Annotated[str | None, Field(max_length=500)] = None

    @field_validator("compliance_check_id", mode="before")
    @classmethod
    def _uuid(cls, value: Any) -> uuid.UUID:
        return uuid.UUID(str(value))

    @field_validator("invoice_date", mode="before")
    @classmethod
    def _date(cls, value: Any) -> dt.date:
        if isinstance(value, dt.date):
            return value
        return dt.date.fromisoformat(str(value))

    @field_validator("consignee_country")
    @classmethod
    def _country(cls, value: str) -> str:
        upper = value.strip().upper()
        if upper not in EU_MEMBERS:
            raise ValueError("consignee_country must be an EU member state (ISO 3166-1 alpha-2)")
        return upper

    @field_validator("invoice_date")
    @classmethod
    def _not_future(cls, value: dt.date) -> dt.date:
        if value > dt.datetime.now(dt.UTC).date():
            raise ValueError("invoice_date cannot be in the future")
        return value

    @field_validator("gross_mass_kg", mode="before")
    @classmethod
    def _mass(cls, value: Any) -> Decimal:
        return parse_amount(value)


class DocumentOut(BaseModel):
    id: uuid.UUID
    document_type: Literal["eur1_draft"]
    compliance_check_id: uuid.UUID
    status: Literal["queued", "ready", "failed"]
    created_at: dt.datetime
    file_url: str | None  # URL ký sẵn ngắn hạn, chỉ khi ready
