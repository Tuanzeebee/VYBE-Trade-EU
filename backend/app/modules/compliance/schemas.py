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


IMPORT_DATE_MIN = dt.date(2020, 8, 1)  # ngày EVFTA có hiệu lực
IMPORT_DATE_MAX_YEARS = 3
Incoterm = Literal["EXW", "FCA", "FAS", "FOB", "CFR", "CPT", "CIF", "CIP", "DAP", "DPU", "DDP"]


def parse_cost(value: Any) -> Decimal | None:
    """Chi phí (cước, bảo hiểm, chi phí sau cửa khẩu): chuỗi số >= 0, tối đa 2 chữ số thập phân,
    dưới 10^12. None = chưa khai (khác với "0" = đã khai là không có chi phí)."""
    if value is None:
        return None
    if not isinstance(value, str) or not _AMOUNT.fullmatch(value):
        raise ValueError("cost must be a decimal string with at most 2 decimals")
    amount = Decimal(value)
    if amount > MAX_VALUE:
        raise ValueError("cost must be below 10^12")
    return amount


def parse_import_date(value: Any) -> dt.date | None:
    if value is None:
        return None
    try:
        day = value if isinstance(value, dt.date) else dt.date.fromisoformat(str(value))
    except ValueError as error:
        raise ValueError("import_date must be an ISO date (YYYY-MM-DD)") from error
    today = dt.datetime.now(dt.UTC).date()
    latest = today.replace(year=today.year + IMPORT_DATE_MAX_YEARS)
    if not IMPORT_DATE_MIN <= day <= latest:
        raise ValueError("import_date must be between 2020-08-01 and 3 years from today")
    return day


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
    # C2-C: đơn vị của `quantity` (mặc định: đơn vị thuế của hạn ngạch) và chi phí để có hạn ngạch
    quantity_unit: Literal["kg", "tonne", "piece", "liter"] | None = None
    quota_access_cost: Decimal | None = None
    # C2-A: trị giá tính thuế. Không khai Incoterm = lấy giá hóa đơn làm trị giá (có cảnh báo).
    # Mọi số tiền cùng một đơn vị tiền tệ (`currency` chỉ để hiển thị), không quy đổi.
    incoterm: Incoterm | None = None
    currency: Annotated[str | None, Field(pattern=r"^[A-Z]{3}$")] = None
    freight: Decimal | None = None
    insurance: Decimal | None = None
    post_border_costs: Decimal | None = None
    import_date: dt.date | None = None

    @field_validator(
        "freight", "insurance", "post_border_costs", "quota_access_cost", mode="before"
    )
    @classmethod
    def _cost(cls, value: Any) -> Decimal | None:
        return parse_cost(value)

    @field_validator("import_date", mode="before")
    @classmethod
    def _import_date(cls, value: Any) -> dt.date | None:
        return parse_import_date(value)

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


class QuotaBalanceStateOut(BaseModel):
    """Số dư hạn ngạch. status = unknown khi chưa có số liệu: KHÔNG được hiểu là còn hạn ngạch."""

    status: Literal["unknown", "open", "low", "exhausted"]
    as_of: dt.date | None = None
    used: Decimal | None = None
    remaining: Decimal | None = None
    remaining_pct: Decimal | None = None
    stale: bool = False
    source: str | None = None


class QuotaEconomicsOut(BaseModel):
    """Giá trị kinh tế của hạn ngạch cho lô hàng và điểm hòa vốn so với chi phí người dùng nhập."""

    savings: Decimal
    savings_per_unit: Decimal | None
    savings_pct_of_value: Decimal
    access_cost: Decimal | None
    net_benefit: Decimal | None
    worthwhile: bool | None


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
    # C2-C: chu kỳ, cách phân bổ, số dư, tỷ trọng lô và giá trị kinh tế
    period_start: dt.date | None = None
    period_end: dt.date | None = None
    days_left: int | None = None
    in_period: bool | None = None  # None = hạn ngạch không khai chu kỳ
    allocation_method: str | None = None
    licence_required: bool = False
    licence_issuer_vi: str | None = None
    balance: QuotaBalanceStateOut | None = None
    share_pct: Decimal | None = None
    economics: QuotaEconomicsOut | None = None


class SectorAlertOut(BaseModel):
    """Cảnh báo ngành áp cho mã HS (U14). data_status = demo_unreviewed với dữ liệu minh hoạ."""

    code: str
    severity: Literal["info", "warning", "critical"]
    title_vi: str
    title_en: str
    body_vi: str | None
    body_en: str | None
    source_url: str | None
    data_status: Literal["reviewed", "demo_unreviewed"]


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


class ValueStepOut(BaseModel):
    """Một bước từ giá hóa đơn đến trị giá tính thuế; amount có dấu (trừ là số âm)."""

    code: Literal["invoice", "freight", "insurance", "post_border"]
    amount: Decimal


class ValuationOut(BaseModel):
    incoterm: str | None
    currency: str | None
    basis: Literal["CIF", "FOB"] | None  # None = nước chưa có quy tắc trị giá
    invoice_value: Decimal
    customs_value: Decimal | None
    steps: list[ValueStepOut]
    warnings: list[str]  # mã cảnh báo, giao diện dịch thành chữ


class StagingOut(BaseModel):
    """Bậc cắt giảm thuế EVFTA đang áp dụng tại ngày tính."""

    category: str
    stage: int
    stages: int
    zero_from: dt.date | None


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
    # SPEC_compliance_data_20_codes §2/§6.2: dữ liệu chưa duyệt vẫn trả số kèm lưu ý
    review_state: Literal["REVIEWED", "UNREVIEWED"] = "REVIEWED"
    unreviewed_components: list[str] = Field(default_factory=list)
    disclaimer: str | None = None
    reasons: list[str] = Field(default_factory=list)
    # C2-A: trị giá tính thuế, bảng phân rã và ngày/bậc thuế áp dụng
    customs_value: Decimal | None = None
    valuation: ValuationOut | None = None
    rate_date: dt.date | None = None
    staging: StagingOut | None = None
    review_reason: str | None = None
    scenarios: list[ScenarioOut] = Field(default_factory=list)
    quota: QuotaInfoOut | None = None
    subtype: SubtypeOut | None = None
    subtypes: list[SubtypeOut] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)  # origin | allocation | subtype | licence
    quantity: Decimal | None = None
    quota_allocated: Literal["yes", "no", "unknown"] | None = None
    alerts: list[SectorAlertOut] = Field(default_factory=list)  # U14


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
    data_status: Literal["reviewed", "demo_unreviewed"] | None = None  # U14
    review_state: Literal["REVIEWED", "UNREVIEWED"] = "REVIEWED"
    unreviewed_components: list[str] = Field(default_factory=list)
    disclaimer: str | None = None
    alerts: list[SectorAlertOut] = Field(default_factory=list)


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


# ── Máy tính xuất xứ Chương 3/7/8 (SPEC_compliance_data_20_codes §5.2, §7) ─────────────
_PERCENT = re.compile(r"(100(\.0{1,2})?|[0-9]{1,2}(\.[0-9]{1,2})?)")


def parse_percent(value: Any) -> Decimal | None:
    """Tỷ lệ % nhận CHUỖI JSON (0–100, tối đa 2 chữ số thập phân); None = chưa trả lời."""
    if value is None:
        return None
    if not isinstance(value, str) or not _PERCENT.fullmatch(value):
        raise ValueError("percent must be a decimal string between 0 and 100")
    return Decimal(value)


class OriginIn(BaseModel):
    """Câu trả lời cho máy tính xuất xứ. Trường bỏ trống = chưa trả lời (→ inconclusive)."""

    model_config = ConfigDict(strict=True)

    hs_code: Annotated[str, Field(max_length=32)]
    consignment_value_eur: Decimal | None = None
    transit_third_country: bool | None = None
    transit_handling: Literal["STORAGE_UNDER_CUSTOMS", "PROCESSED"] | None = None
    only_article6_operations: bool | None = None
    sourcing: (
        Literal["FARMED_IN_VN", "CAUGHT_IN_VN_TERRITORIAL_SEA", "CAUGHT_BY_VESSEL", "IMPORTED"]
        | None
    ) = None
    vessel_registered_vn_eu: bool | None = None
    vessel_flag_vn_eu: bool | None = None
    vessel_ownership_pct: Decimal | None = None
    materials_outside_territorial_sea: bool | None = None
    restricted_nonorig_pct_weight: Decimal | None = None
    restricted_nonorig_pct_value: Decimal | None = None
    sugar_pct_weight: Decimal | None = None
    # Thông tin lô để lập danh sách bằng chứng (SPEC §5.3)
    raw_material_source: Literal["AQUACULTURE", "WILD_CAUGHT", "GROWN"] | None = None
    is_fresh: bool | None = None

    @field_validator("consignment_value_eur", mode="before")
    @classmethod
    def _value(cls, value: Any) -> Decimal | None:
        return None if value is None else parse_amount(value)

    @field_validator(
        "vessel_ownership_pct",
        "restricted_nonorig_pct_weight",
        "restricted_nonorig_pct_value",
        "sugar_pct_weight",
        mode="before",
    )
    @classmethod
    def _pct(cls, value: Any) -> Decimal | None:
        return parse_percent(value)


class OriginReasonOut(BaseModel):
    code: str
    vi: str
    en: str


class EvidenceItemOut(BaseModel):
    code: str
    name_vi: str
    name_en: str | None
    layer: str
    scope: str
    blocks: Literal["IMPORT", "TARIFF_PREFERENCE", "NONE"]
    legal_status: str
    # REQUIRED | NEEDS_INPUT (thiếu câu trả lời) | CHECK_REQUIRED (chưa có dữ liệu danh mục)
    status: Literal["REQUIRED", "NEEDS_INPUT", "CHECK_REQUIRED"]
    conditions: list[str]
    review_state: Literal["REVIEWED", "UNREVIEWED"]


class RequiredEvidenceOut(BaseModel):
    """Danh sách bằng chứng cho lô, sắp IMPORT → TARIFF_PREFERENCE → NONE. Có dòng chưa duyệt thì
    review_state = UNREVIEWED và disclaimer hiển thị ở đầu danh sách."""

    items: list[EvidenceItemOut]
    review_state: Literal["REVIEWED", "UNREVIEWED"]
    disclaimer: str | None


class BadgeOut(BaseModel):
    """Huy hiệu EVFTA-verified theo nhóm hàng. Văn bản chỉ nói về C/O EUR.1 đã cấp trong 12 tháng
    gần nhất, không nói hàng đạt xuất xứ EVFTA."""

    category: str
    granted: bool
    text_vi: str | None
    text_en: str | None
    # COMPANY_NOT_VERIFIED | NO_BADGE_BASIS | MISSING_EVIDENCE | None khi đã cấp
    reason: str | None
    missing: list[str]


class CompanyChecklistItemOut(BaseModel):
    code: str
    name_vi: str
    name_en: str | None
    blocks: Literal["IMPORT", "TARIFF_PREFERENCE", "NONE"]
    legal_status: str
    verification_type_code: str | None  # loại bằng chứng tương ứng công ty nộp ở verification
    # approved | pending | expired | rejected | missing | not_mapped
    state: Literal["approved", "pending", "expired", "rejected", "missing", "not_mapped"]
    review_state: Literal["REVIEWED", "UNREVIEWED"]


class CompanyChecklistOut(BaseModel):
    hs_code: str
    hs_formatted: str
    category: str | None
    items: list[CompanyChecklistItemOut]
    badge: BadgeOut | None
    review_state: Literal["REVIEWED", "UNREVIEWED"]
    unreviewed_components: list[str]
    disclaimer: str | None


class ReviewIssueOut(BaseModel):
    """Hàng đợi admin: dòng luật sư trả "SUA" (cần sửa), chưa được duyệt."""

    id: uuid.UUID
    entity_type: str
    entity_id: str
    label: str
    note: str
    created_by: uuid.UUID
    created_at: dt.datetime
    resolved_at: dt.datetime | None


class ProductRequirementsOut(BaseModel):
    hs_code: str
    hs_formatted: str
    name_vi: str
    name_en: str
    items: list[EvidenceItemOut]


class ExporterRequirementsOut(BaseModel):
    """Bằng chứng cần chuẩn bị theo từng mã HS sản phẩm công ty đang bán (chưa biết trị giá lô,
    nguồn nguyên liệu: dòng có điều kiện kèm danh sách điều kiện để người dùng tự đối chiếu)."""

    eur1_threshold_eur: Decimal
    products: list[ProductRequirementsOut]
    review_state: Literal["REVIEWED", "UNREVIEWED"]
    disclaimer: str | None


class OriginOut(BaseModel):
    check_id: str
    status: Literal["pass", "fail", "inconclusive", "unsupported"]
    reasons: list[OriginReasonOut]
    inputs_missing: list[str]
    additional_evidence: list[str]  # vd TRANSPORT_DOC khi hàng quá cảnh
    required_evidence: RequiredEvidenceOut | None = None
    hs_code: str
    hs_formatted: str
    rule_type: str | None
    rule_text_vi: str | None
    rule_text_en: str | None
    insufficient_operations_vi: str | None
    tolerance_note_vi: str | None
    risk_note_vi: str | None
    requires_expert: bool
    # Hưởng ưu đãi chỉ khi pass. savings: 0 khi fail; con số khi pass + có trị giá lô và dòng thuế.
    preference_applicable: bool
    savings: Decimal | None
    review_state: Literal["REVIEWED", "UNREVIEWED"]
    unreviewed_components: list[str]
    disclaimer: str | None


class OriginInputOut(BaseModel):
    name: str
    kind: Literal["boolean", "percent", "enum"]
    options: list[str]
    required_if: str | None


class OriginQuestionOut(BaseModel):
    order: int
    text_vi: str
    text_en: str | None


class OriginQuestionsOut(BaseModel):
    """Câu hỏi hiển thị + các trường trả lời theo rule_type. `unsupported` thì không có gì."""

    status: Literal["ok", "unsupported"]
    hs_code: str
    hs_formatted: str
    rule_type: str | None
    requires_expert: bool
    questions: list[OriginQuestionOut]
    inputs: list[OriginInputOut]
    review_state: Literal["REVIEWED", "UNREVIEWED"]
    unreviewed_components: list[str]
    disclaimer: str | None


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
