import datetime as dt
import uuid
from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.modules.markets.orientation import SalesOrientation, budget_required

HsCode = Annotated[str, Field(pattern=r"^[0-9]{2,8}$")]


class PriorityProductOut(BaseModel):
    hs_code: str
    family: str
    name_vi: str
    name_en: str
    keywords: list[str]


class TradeImportIn(BaseModel):
    """Nạp từ Eurostat Comext. Bỏ trống products = danh sách mã ưu tiên; năm mặc định 6 năm gần
    nhất."""

    model_config = ConfigDict(extra="forbid")

    products: Annotated[list[HsCode], Field(max_length=50)] = Field(default_factory=list)
    year_from: Annotated[int | None, Field(ge=2000, le=2100)] = None
    year_to: Annotated[int | None, Field(ge=2000, le=2100)] = None

    @field_validator("products")
    @classmethod
    def _unique(cls, values: list[str]) -> list[str]:
        return list(dict.fromkeys(values))


class TradeImportBatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source: str
    params: dict[str, Any]
    status: str
    rows_imported: int
    error: str | None
    created_at: dt.datetime
    finished_at: dt.datetime | None


# ── Gợi ý thị trường (U16) ───────────────────────────────────────────────────
class ReasonOut(BaseModel):
    """Lý do bằng số: code để giao diện dựng câu, value/year là số đã tính từ thống kê."""

    code: str
    value: Decimal | None = None
    year: int | None = None


class MarketOut(BaseModel):
    country: str
    score: Decimal
    import_value: Decimal
    import_cagr: Decimal | None
    vn_value: Decimal
    vn_share: Decimal
    vn_cagr: Decimal | None
    world_unit_price: Decimal | None
    vn_unit_price: Decimal | None
    reasons: list[ReasonOut] = Field(default_factory=list)


class CompetitorOut(BaseModel):
    partner: str
    value: Decimal
    share: Decimal
    unit_price: Decimal | None


class FamilyOut(BaseModel):
    family: str
    name_vi: str
    name_en: str
    products: list[str]


class MarketRecommendationOut(BaseModel):
    status: Literal["ok", "no_data"]
    query: str
    family: FamilyOut | None
    year: int | None
    source: str
    retrieved_at: dt.datetime | None
    top_markets: list[MarketOut]
    potential_markets: list[MarketOut]
    countries: list[MarketOut]
    competitors: list[CompetitorOut]
    vn_extra_eu_share: Decimal | None
    vn_rank: int | None
    hhi: Decimal | None
    weights: dict[str, Decimal]
    suggestions: list[FamilyOut] = Field(default_factory=list)


# ── Giá tham khảo (U17) ──────────────────────────────────────────────────────
class PricePointOut(BaseModel):
    partner: str  # VN, EXT_EU27_2020 (trung bình ngoài EU) hoặc mã nước đối thủ
    unit_price: Decimal  # EUR/kg
    value: Decimal


class PriceReferenceOut(BaseModel):
    """Đơn giá nhập khẩu vào EU (EUR/kg) — CHỈ THAM KHẢO, không phải giá sàn hay giá chống bán
    phá giá."""

    status: Literal["ok", "no_data"]
    hs_code: str
    year: int | None
    source: str
    vietnam: PricePointOut | None
    extra_eu_average: PricePointOut | None
    competitors: list[PricePointOut] = Field(default_factory=list)


# ── Báo cáo go-to-market (U18) ───────────────────────────────────────────────
Money = Annotated[Decimal, Field(ge=0, le=Decimal("1e12"), max_digits=15, decimal_places=2)]


class ReportIn(BaseModel):
    """Chọn sản phẩm của công ty (product_id) hoặc nhập tên/mã HS. Ngân sách là tuỳ chọn, dùng cho
    phần "OEM hay thương hiệu riêng"."""

    product_id: uuid.UUID | None = None
    q: Annotated[str, Field(max_length=100)] = ""
    hs: Annotated[str | None, Field(pattern=r"^[0-9]{6,8}$")] = None
    language: Literal["vi", "en"] = "vi"
    marketing_budget: Money | None = None
    expected_revenue: Money | None = None
    brand_model: Literal["oem", "own_brand", "both"] | None = None
    # N5: hỏi theo bước. Không gửi sales_orientation thì hành xử như cũ.
    target_market: Annotated[str | None, Field(pattern=r"^([A-Z]{2}|EU)$")] = None
    sales_orientation: SalesOrientation | None = None
    other_text: Annotated[str | None, Field(max_length=200)] = None
    annual_volume: Money | None = None
    budget: Money | None = None

    @model_validator(mode="after")
    def _has_subject(self) -> "ReportIn":
        if self.product_id is None and not self.q.strip() and self.hs is None:
            raise ValueError("Choose a product or enter a product name / HS code")
        return self

    @model_validator(mode="after")
    def _orientation_rules(self) -> "ReportIn":
        if self.sales_orientation is None:
            return self
        if not self.expected_revenue or self.expected_revenue <= 0:
            raise ValueError("expected_revenue is required and must be greater than 0")
        if budget_required(self.sales_orientation) and (not self.budget or self.budget <= 0):
            raise ValueError("budget is required for own brand")
        if self.sales_orientation == "other" and not (self.other_text or "").strip():
            raise ValueError("other_text is required when orientation is other")
        return self


class ReportSectionOut(BaseModel):
    key: str
    title: str
    text: str  # rỗng khi locked
    locked: bool


class ReportTableRowOut(BaseModel):
    country: str
    value: Decimal
    share: Decimal | None
    growth: Decimal | None = None
    unit_price: Decimal | None = None


class ReportListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    query: str
    language: str
    status: Literal["queued", "running", "ready", "failed"]
    product_id: uuid.UUID | None
    created_at: dt.datetime
    finished_at: dt.datetime | None


class PositioningOut(BaseModel):
    score: Decimal
    axes: dict[str, Decimal]


class ReportOut(ReportListItemOut):
    """full = công ty có quyền xem bản đầy đủ. Bản tóm tắt: chỉ phần summary/recommendations có
    lời văn, bảng đối thủ và file PDF bị khoá."""

    full: bool
    product_name: str | None = None
    year: int | None = None
    source: str | None = None
    narrative_source: Literal["model", "template"] | None = None
    tariff_data_status: Literal["reviewed", "demo_unreviewed"] | None = None
    sections: list[ReportSectionOut] = Field(default_factory=list)
    positioning: PositioningOut | None = None
    top_markets: list[ReportTableRowOut] = Field(default_factory=list)
    potential_markets: list[ReportTableRowOut] = Field(default_factory=list)
    competitors: list[ReportTableRowOut] = Field(default_factory=list)
    pdf_url: str | None = None
    error: str | None = None


class ConsultingLeadIn(BaseModel):
    report_id: uuid.UUID | None = None
    contact_name: Annotated[str, Field(min_length=1, max_length=255)]
    contact_email: EmailStr
    phone: Annotated[str | None, Field(max_length=40)] = None
    message: Annotated[str | None, Field(max_length=2000)] = None


class ConsultingLeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID
    report_id: uuid.UUID | None
    contact_name: str
    contact_email: str
    phone: str | None
    message: str | None
    status: Literal["new", "contacted", "closed"]
    handled_at: dt.datetime | None
    created_at: dt.datetime


class AdminConsultingLeadOut(ConsultingLeadOut):
    company_name: str
    report_query: str | None = None


class ConsultingLeadPatch(BaseModel):
    status: Literal["new", "contacted", "closed"]
