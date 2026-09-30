import datetime as dt
import uuid
from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

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
