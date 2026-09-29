import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated, Literal, Self

from pydantic import (
    AfterValidator,
    BaseModel,
    EmailStr,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

# Tạm theo 6 nhóm ngành của giao diện cũ; B4 chuyển sang nhóm hàng theo mã HS.
Industry = Literal["agriculture", "seafood", "food_beverage", "textiles", "handicrafts", "spices"]
CountryCode = Annotated[str, StringConstraints(pattern=r"^[A-Z]{2}$")]
MarketCode = Annotated[str, StringConstraints(pattern=r"^(EU|ASEAN|[A-Z]{2})$")]
LangCode = Annotated[str, StringConstraints(pattern=r"^[a-z]{2}$")]
# Trường chỉ buyer dùng (B2). Giá trị cố định để lọc/ghép được.
CompanySize = Literal["1_10", "11_50", "51_200", "201_500", "gt_500"]
ProcurementEstimate = Literal["lt_100k", "100k_500k", "500k_2m", "2m_10m", "gt_10m"]  # EUR/năm


def _check_year(year: int | None) -> int | None:
    if year is not None and not 1800 <= year <= datetime.now(UTC).year:
        raise ValueError("founded_year out of range")
    return year


def _check_website(url: str | None) -> str | None:
    if url is not None and not url.lower().startswith(("http://", "https://")):
        raise ValueError("website must start with http:// or https://")
    return url


def _unique(values: list[str] | None) -> list[str] | None:
    return None if values is None else sorted(set(values))


Year = Annotated[int, AfterValidator(_check_year)]
Website = Annotated[str, StringConstraints(max_length=255), AfterValidator(_check_website)]
Text = Annotated[str, StringConstraints(max_length=5000)]


class _CompanyFields(BaseModel):
    registration_number: Annotated[str, StringConstraints(max_length=64)] | None = None
    tax_id: Annotated[str, StringConstraints(max_length=32)] | None = None
    business_type: Annotated[str, StringConstraints(max_length=64)] | None = None
    industry_sector: Industry | None = None
    founded_year: Year | None = None
    address: Annotated[str, StringConstraints(max_length=500)] | None = None
    website: Website | None = None
    contact_email: EmailStr | None = None
    description_vi: Text | None = None
    description_en: Text | None = None
    company_size: CompanySize | None = None
    procurement_estimate: ProcurementEstimate | None = None
    vat_number: Annotated[str, StringConstraints(max_length=32)] | None = None
    eori_number: Annotated[str, StringConstraints(max_length=20)] | None = None


class CompanyIn(_CompanyFields):
    legal_name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)
    ]
    country: CountryCode = "VN"
    export_markets: list[MarketCode] = Field(default_factory=list, max_length=50)
    languages_spoken: list[LangCode] = Field(default_factory=list, max_length=20)
    sourcing_categories: list[Industry] = Field(default_factory=list, max_length=20)

    _uniq = field_validator("export_markets", "languages_spoken", "sourcing_categories")(_unique)


class CompanyPatch(_CompanyFields):
    """Chỉ các trường gửi lên mới được sửa; danh sách gửi lên thay thế danh sách cũ."""

    legal_name: (
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
        | None
    ) = None
    country: CountryCode | None = None
    export_markets: list[MarketCode] | None = Field(default=None, max_length=50)
    languages_spoken: list[LangCode] | None = Field(default=None, max_length=20)
    sourcing_categories: list[Industry] | None = Field(default=None, max_length=20)
    logo_key: Annotated[str, StringConstraints(max_length=255)] | None = None

    _uniq = field_validator("export_markets", "languages_spoken", "sourcing_categories")(_unique)


class CompanyOut(BaseModel):
    id: uuid.UUID
    slug: str
    type: Literal["exporter", "buyer"]
    legal_name: str
    registration_number: str | None
    tax_id: str | None
    business_type: str | None
    country: str
    industry_sector: str | None
    founded_year: int | None
    address: str | None
    website: str | None
    contact_email: str | None
    description_vi: str | None
    description_en: str | None
    logo_key: str | None
    export_markets: list[str]
    languages_spoken: list[str]
    company_size: str | None
    procurement_estimate: str | None
    vat_number: str | None
    eori_number: str | None
    sourcing_categories: list[str]
    verification_status: Literal["unverified", "pending", "verified", "rejected"]
    verification_level: Literal["basic", "evfta_verified"]
    verified_at: datetime | None
    expires_at: datetime | None
    profile_completeness_score: Decimal
    created_at: datetime
    updated_at: datetime


class CompanyFilters(BaseModel):
    """Bộ lọc có cấu trúc — dùng lại cho danh bạ (E2) và admin (I4)."""

    country: CountryCode | None = None
    market: MarketCode | None = None
    industry: Industry | None = None
    language: LangCode | None = None
    sourcing: Industry | None = None  # nhóm hàng buyer quan tâm


class PresignIn(BaseModel):
    purpose: Literal["logo", "product_image", "evidence"]
    content_type: Literal["image/png", "image/jpeg", "image/webp", "application/pdf"]

    @model_validator(mode="after")
    def _content_type_matches_purpose(self) -> Self:
        """Logo/ảnh sản phẩm chỉ nhận ảnh; bằng chứng nhận PDF hoặc ảnh chụp (png/jpeg)."""
        allowed = {
            "logo": ("image/png", "image/jpeg", "image/webp"),
            "product_image": ("image/png", "image/jpeg", "image/webp"),
            "evidence": ("application/pdf", "image/png", "image/jpeg"),
        }[self.purpose]
        if self.content_type not in allowed:
            raise ValueError(f"content_type {self.content_type} is not allowed for {self.purpose}")
        return self


class PresignOut(BaseModel):
    upload_url: str
    key: str


# ── Sản phẩm (B5) ─────────────────────────────────────────────────────────────
Currency = Literal["USD", "EUR", "VND"]
Unit = Literal["kg", "tonne", "piece", "carton", "liter", "container_20ft", "container_40ft"]
# Numeric(14, 2): tối đa 12 chữ số nguyên + 2 thập phân; Decimal, không bao giờ float.
Amount = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)]
ProductName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
HsCodeInput = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=16)]
ImageKey = Annotated[str, StringConstraints(min_length=1, max_length=255)]
MAX_IMAGES = 10


def _check_price_order(low: Decimal | None, high: Decimal | None) -> None:
    if low is not None and high is not None and low > high:
        raise ValueError("price_min must not exceed price_max")


class ProductIn(BaseModel):
    name: ProductName
    hs_code: (
        HsCodeInput  # bắt buộc; service chuẩn hóa '1006.30' → '100630' và kiểm có trong danh mục
    )
    description_vi: Text | None = None
    description_en: Text | None = None
    price_min: Amount | None = None
    price_max: Amount | None = None
    currency: Currency = "USD"
    unit: Unit | None = None
    moq: Amount | None = None
    moq_unit: Unit | None = None
    is_active: bool = True
    image_keys: list[ImageKey] = Field(default_factory=list, max_length=MAX_IMAGES)

    @model_validator(mode="after")
    def _prices(self) -> "ProductIn":
        _check_price_order(self.price_min, self.price_max)
        return self


class ProductPatch(BaseModel):
    """Chỉ các trường gửi lên mới được sửa; image_keys gửi lên thay thế toàn bộ ảnh."""

    name: ProductName | None = None
    hs_code: HsCodeInput | None = None
    description_vi: Text | None = None
    description_en: Text | None = None
    price_min: Amount | None = None
    price_max: Amount | None = None
    currency: Currency | None = None
    unit: Unit | None = None
    moq: Amount | None = None
    moq_unit: Unit | None = None
    is_active: bool | None = None
    image_keys: list[ImageKey] | None = Field(default=None, max_length=MAX_IMAGES)

    @model_validator(mode="after")
    def _prices(self) -> "ProductPatch":
        _check_price_order(self.price_min, self.price_max)
        return self


class ProductImageOut(BaseModel):
    key: str
    url: str


class ProductOut(BaseModel):
    id: uuid.UUID
    name: str
    hs_code: str
    hs_formatted: str
    hs_name_vi: str
    hs_name_en: str
    description_vi: str | None
    description_en: str | None
    price_min: Decimal | None
    price_max: Decimal | None
    currency: str
    unit: str | None
    moq: Decimal | None
    moq_unit: str | None
    is_active: bool
    approval_status: Literal["pending", "approved", "hidden"]
    images: list[ProductImageOut]
    created_at: datetime


class PublicProductOut(BaseModel):
    """Sản phẩm trên hồ sơ công khai — không lộ id nội bộ, trạng thái duyệt hay khóa ảnh."""

    name: str
    hs_code: str
    hs_formatted: str
    hs_name_vi: str
    hs_name_en: str
    description_vi: str | None
    description_en: str | None
    price_min: Decimal | None
    price_max: Decimal | None
    currency: str
    unit: str | None
    moq: Decimal | None
    moq_unit: str | None
    images: list[str]


class PublicCompanyOut(BaseModel):
    """Hồ sơ công khai của exporter đã xác minh. Không có email liên hệ, mã số thuế,
    số đăng ký kinh doanh hay địa chỉ chi tiết."""

    slug: str
    legal_name: str
    country: str
    industry_sector: str | None
    founded_year: int | None
    website: str | None
    description_vi: str | None
    description_en: str | None
    logo_url: str | None
    export_markets: list[str]
    languages_spoken: list[str]
    verification_level: Literal["basic", "evfta_verified"]
    verified_at: datetime | None
    products: list[PublicProductOut]


# ── Điểm hoàn thiện hồ sơ (B3) ────────────────────────────────────────────────
class MissingOut(BaseModel):
    field: str
    group: str
    weight: Decimal


class CompletenessOut(BaseModel):
    """Chỉ điểm và danh sách còn thiếu — cố ý KHÔNG chứa trạng thái xác minh (khái niệm khác)."""

    score: Decimal
    missing: list[MissingOut]


class CompanySummary(BaseModel):
    """Thông tin tối thiểu về công ty cho màn hình admin (hàng đợi xác minh)."""

    id: uuid.UUID
    legal_name: str
    tax_id: str | None
    country: str


class VerificationState(BaseModel):
    """Trạng thái xác minh hiện tại của công ty — module verification đọc/ghi qua service."""

    status: str
    level: str
    verified_at: datetime | None
    expires_at: datetime | None
