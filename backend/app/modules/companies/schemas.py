import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated, Literal, Self

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

# Ngành hàng: khớp bảng industries (migration 0030, có "other"); test giữ hai danh sách trùng nhau.
Industry = Literal[
    "agriculture",
    "fruits_vegetables",
    "coffee_tea",
    "seafood",
    "food_beverage",
    "spices",
    "textiles",
    "handicrafts",
    "other",
]
CountryCode = Annotated[str, StringConstraints(pattern=r"^[A-Z]{2}$")]
# Thị trường đã xuất khẩu: mọi nước (ISO-2) hoặc khối EU / ASEAN. Demo 30/9: khách yêu cầu không
# giới hạn ở EU — exporter Việt Nam bán đi Mỹ, Nhật, Hàn… cũng là năng lực buyer cần thấy.
MarketCode = Annotated[str, StringConstraints(pattern=r"^(EU|ASEAN|[A-Z]{2})$")]
ExportMarketCode = MarketCode
LangCode = Annotated[str, StringConstraints(pattern=r"^[a-z]{2}$")]
# Quy mô nhân sự: buyer (B2) và seller (U2). Giá trị cố định để lọc/ghép được.
CompanySize = Literal["1_10", "11_50", "51_200", "201_500", "gt_500"]
OfferingType = Literal["products", "services", "both"]
FacilityCodeType = Literal["growing_area", "packing_facility", "establishment", "other"]
CapacityUnit = Literal[
    "kg", "tonne", "piece", "carton", "liter", "container_20ft", "container_40ft"
]
CapacityPeriod = Literal["month", "year"]
Capacity = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)]
Phone = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^[0-9+().\s-]{6,40}$")]
ShortText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=255)]
Title = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)]
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


class FacilityCodeIn(BaseModel):
    code_type: FacilityCodeType
    code: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]


class FacilityCodeOut(BaseModel):
    code_type: str
    code: str


def _unique_facility_codes(values: list[FacilityCodeIn] | None) -> list[FacilityCodeIn] | None:
    if values is None:
        return None
    seen: dict[tuple[str, str], FacilityCodeIn] = {}
    for v in values:
        seen.setdefault((v.code_type, v.code), v)
    return list(seen.values())


class _CompanyFields(BaseModel):
    registration_number: Annotated[str, StringConstraints(max_length=64)] | None = None
    tax_id: Annotated[str, StringConstraints(max_length=32)] | None = None
    business_type: Annotated[str, StringConstraints(max_length=64)] | None = None
    industry_sector: Industry | None = None
    industry_other: Title | None = None
    founded_year: Year | None = None
    address: Annotated[str, StringConstraints(max_length=500)] | None = None
    website: Website | None = None
    contact_email: EmailStr | None = None
    phone: Phone | None = None
    contact_name: ShortText | None = None
    city: Title | None = None
    legal_rep_name: ShortText | None = None
    legal_rep_title: Title | None = None
    # Lưu đúng như in trên ĐKKD; giao diện hiển thị tên cơ quan hiện hành (Sở KH&ĐT → Sở Tài chính).
    issuing_authority: ShortText | None = None
    description_vi: Text | None = None
    description_en: Text | None = None
    # Seller (U2)
    offering_type: OfferingType | None = None
    factory_address: Annotated[str, StringConstraints(max_length=500)] | None = None
    capacity_value: Capacity | None = None
    capacity_unit: CapacityUnit | None = None
    capacity_period: CapacityPeriod | None = None
    main_customers: Annotated[str, StringConstraints(max_length=2000)] | None = None
    location_public: bool | None = None
    company_size: CompanySize | None = None
    procurement_estimate: ProcurementEstimate | None = None
    vat_number: Annotated[str, StringConstraints(max_length=32)] | None = None
    eori_number: Annotated[str, StringConstraints(max_length=20)] | None = None
    hide_profile_views: bool | None = None  # buyer (U9)


class CompanyIn(_CompanyFields):
    legal_name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)
    ]
    country: CountryCode = "VN"
    export_markets: list[ExportMarketCode] = Field(default_factory=list, max_length=50)
    languages_spoken: list[LangCode] = Field(default_factory=list, max_length=20)
    sourcing_categories: list[Industry] = Field(default_factory=list, max_length=20)
    facility_codes: list[FacilityCodeIn] = Field(default_factory=list, max_length=30)

    _uniq = field_validator("export_markets", "languages_spoken", "sourcing_categories")(_unique)
    _uniq_codes = field_validator("facility_codes")(_unique_facility_codes)


class CompanyPatch(_CompanyFields):
    """Chỉ các trường gửi lên mới được sửa; danh sách gửi lên thay thế danh sách cũ."""

    legal_name: (
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
        | None
    ) = None
    country: CountryCode | None = None
    export_markets: list[ExportMarketCode] | None = Field(default=None, max_length=50)
    languages_spoken: list[LangCode] | None = Field(default=None, max_length=20)
    sourcing_categories: list[Industry] | None = Field(default=None, max_length=20)
    facility_codes: list[FacilityCodeIn] | None = Field(default=None, max_length=30)
    logo_key: Annotated[str, StringConstraints(max_length=255)] | None = None

    _uniq = field_validator("export_markets", "languages_spoken", "sourcing_categories")(_unique)
    _uniq_codes = field_validator("facility_codes")(_unique_facility_codes)


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
    industry_other: str | None
    founded_year: int | None
    address: str | None
    website: str | None
    contact_email: str | None
    phone: str | None
    contact_name: str | None = None
    city: str | None = None
    legal_rep_name: str | None
    legal_rep_title: str | None
    issuing_authority: str | None
    description_vi: str | None
    description_en: str | None
    logo_key: str | None
    # Chỉ seller: None với buyer.
    offering_type: Literal["products", "services", "both"] | None
    factory_address: str | None
    capacity_value: Decimal | None
    capacity_unit: str | None
    capacity_period: str | None
    main_customers: str | None
    location_public: bool
    latitude: Decimal | None = None  # U21: định vị khi chủ hồ sơ bật location_public
    longitude: Decimal | None = None
    facility_codes: list[FacilityCodeOut]
    export_markets: list[str]
    languages_spoken: list[str]
    company_size: str | None
    procurement_estimate: str | None
    vat_number: str | None
    eori_number: str | None
    hide_profile_views: bool
    sourcing_categories: list[str]
    verification_status: Literal["unverified", "pending", "verified", "rejected"]
    verification_level: Literal["basic", "evfta_verified"]
    verified_at: datetime | None
    expires_at: datetime | None
    # U20: cấp xác minh 0–3 (0 khi chưa verified); cấp 2–3 có hạn riêng.
    verification_tier: int = 0
    tier_reviewed_at: datetime | None = None
    tier_expires_at: datetime | None = None
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


# U3: quy cách đóng gói, bậc giá theo số lượng, OEM / thương hiệu riêng
BrandModel = Literal["oem", "own_brand", "both"]
SourceLang = Literal["vi", "en"]
PackUnit = Literal["g", "kg", "tonne", "ml", "liter", "piece"]
PackType = Literal["bag", "sack", "carton", "box", "can", "bottle", "jar", "bulk", "other"]
Channel = Literal["horeca", "retail", "industrial", "any"]
PackSize = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=3)]
MAX_PACKAGINGS = 10
MAX_PRICE_TIERS = 6


class PackagingIn(BaseModel):
    pack_size: PackSize
    pack_unit: PackUnit
    pack_type: PackType
    channel: Channel = "any"


class PackagingOut(BaseModel):
    pack_size: Decimal
    pack_unit: str
    pack_type: str
    channel: str


class PriceTierIn(BaseModel):
    """Từ min_quantity (cùng đơn vị với MOQ) trở lên thì đơn giá là unit_price (theo đơn vị giá)."""

    min_quantity: Amount
    unit_price: Amount


class PriceTierOut(BaseModel):
    min_quantity: Decimal
    unit_price: Decimal


def _check_tiers(tiers: list[PriceTierIn] | None) -> list[PriceTierIn] | None:
    """Bậc giá sắp theo số lượng tăng dần; không được trùng số lượng."""
    if tiers is None:
        return None
    ordered = sorted(tiers, key=lambda t: t.min_quantity)
    quantities = [t.min_quantity for t in ordered]
    if len(set(quantities)) != len(quantities):
        raise ValueError("price tiers must have distinct min_quantity")
    return ordered


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
    brand_model: BrandModel | None = None
    description_source_lang: SourceLang | None = None
    packagings: list[PackagingIn] = Field(default_factory=list, max_length=MAX_PACKAGINGS)
    price_tiers: list[PriceTierIn] = Field(default_factory=list, max_length=MAX_PRICE_TIERS)

    _tiers = field_validator("price_tiers")(_check_tiers)

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
    brand_model: BrandModel | None = None
    description_source_lang: SourceLang | None = None
    packagings: list[PackagingIn] | None = Field(default=None, max_length=MAX_PACKAGINGS)
    price_tiers: list[PriceTierIn] | None = Field(default=None, max_length=MAX_PRICE_TIERS)

    _tiers = field_validator("price_tiers")(_check_tiers)

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
    brand_model: str | None = None
    description_source_lang: str | None = None
    description_vi_machine: bool = False
    description_en_machine: bool = False
    packagings: list[PackagingOut] = Field(default_factory=list)
    price_tiers: list[PriceTierOut] = Field(default_factory=list)


class ReviewProductOut(BaseModel):
    """Sản phẩm exporter đã khai, để admin đối chiếu khi duyệt xác minh (chỉ đọc)."""

    id: uuid.UUID
    name: str
    hs_code: str
    hs_formatted: str
    hs_name_vi: str | None
    hs_name_en: str | None
    price_min: Decimal | None
    price_max: Decimal | None
    currency: str
    unit: str | None
    moq: Decimal | None
    moq_unit: str | None
    is_active: bool


class PublicProductOut(BaseModel):
    """Sản phẩm trên hồ sơ công khai — không lộ trạng thái duyệt hay khóa ảnh. `id` cần để buyer
    gắn RFQ (F1); id sản phẩm không nhạy cảm, còn id công ty vẫn không lộ."""

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
    images: list[str]
    brand_model: str | None = None
    description_vi_machine: bool = False
    description_en_machine: bool = False
    packagings: list[PackagingOut] = Field(default_factory=list)
    price_tiers: list[PriceTierOut] = Field(default_factory=list)


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
    verification_tier: int = 1  # U20: hồ sơ công khai luôn đã xác minh (cấp ≥ 1)
    # U10: hồ sơ công khai đầy đủ hơn. Địa chỉ nhà máy / toạ độ chỉ có khi chủ hồ sơ đồng ý
    # (location_public); mặc định bản đồ chỉ ở mức tỉnh/thành (city).
    offering_type: Literal["products", "services", "both"] = "products"
    city: str | None = None
    company_size: str | None = None
    capacity_value: Decimal | None = None
    capacity_unit: str | None = None
    capacity_period: str | None = None
    facility_codes: list[FacilityCodeOut] = Field(default_factory=list)
    location_public: bool = False
    factory_address: str | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    services: list["ServiceOfferingOut"] = Field(default_factory=list)


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
    address: str | None = None
    verification_status: str = "unverified"


class ViewerIdentity(BaseModel):
    """Công ty đã xem một hồ sơ (U9). `identifiable` = seller được thấy tên: buyer đã xác minh, còn
    hạn và không bật ẩn danh. Không identifiable thì seller chỉ thấy số đếm."""

    id: uuid.UUID
    legal_name: str
    country: str
    business_type: str | None
    identifiable: bool


class CompanyIdentityFacts(BaseModel):
    """Định danh của một công ty cho việc gom cụm chống mạo danh (I11, module verification)."""

    id: uuid.UUID
    legal_name: str
    type: str
    tax_id: str | None
    website: str | None
    contact_email: str | None
    founded_year: int | None
    owner_user_id: uuid.UUID


class VerificationState(BaseModel):
    """Trạng thái xác minh hiện tại của công ty — module verification đọc/ghi qua service."""

    status: str
    level: str
    verified_at: datetime | None
    expires_at: datetime | None
    tier: int = 0
    tier_reviewed_at: datetime | None = None
    tier_expires_at: datetime | None = None


# ── Admin kiểm duyệt (I4) ─────────────────────────────────────────────────────
class AdminCompanyOut(BaseModel):
    id: uuid.UUID
    slug: str
    type: Literal["exporter", "buyer"]
    legal_name: str
    country: str
    tax_id: str | None
    website: str | None
    address: str | None
    contact_email: str | None
    description_vi: str | None
    description_en: str | None
    verification_status: Literal["unverified", "pending", "verified", "rejected"]
    verification_level: Literal["basic", "evfta_verified"]
    verification_tier: int = 0  # U20
    is_hidden: bool
    profile_completeness_score: Decimal
    owner_email: str | None
    created_at: datetime


class AdminCompanyPatch(BaseModel):
    """Chỉ nội dung và cờ ẩn. Trạng thái xác minh, chủ sở hữu, MST KHÔNG sửa được ở đây."""

    model_config = ConfigDict(extra="forbid", strict=True)

    legal_name: (
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
        | None
    ) = None
    description_vi: Text | None = None
    description_en: Text | None = None
    website: Website | None = None
    address: Annotated[str, StringConstraints(max_length=500)] | None = None
    contact_email: EmailStr | None = None
    is_hidden: bool | None = None


class AdminProductOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    company_name: str
    name: str
    hs_code: str
    description_vi: str | None
    description_en: str | None
    is_active: bool
    approval_status: Literal["pending", "approved", "hidden"]
    created_at: datetime | None = None
    # U3: nhóm hàng của mã HS khác ngành công ty khai → cờ để admin xem lại (không tự ẩn).
    industry_mismatch: bool = False


class AdminProductPatch(BaseModel):
    """Kiểm duyệt: sửa chữ, ẩn/hiện. Không đổi mã HS, giá hay MOQ của exporter."""

    model_config = ConfigDict(extra="forbid", strict=True)

    name: (
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
        | None
    ) = None
    description_vi: Text | None = None
    description_en: Text | None = None
    is_active: bool | None = None
    approval_status: Literal["approved", "hidden"] | None = None


class ExporterCardOut(BaseModel):
    """Một dòng danh bạ công khai: chỉ trường được phép lộ (không email, mã số thuế, địa chỉ)."""

    slug: str
    legal_name: str
    country: str
    industry_sector: str | None
    verification_level: Literal["basic", "evfta_verified"]
    verified_at: datetime | None
    description_vi: str | None
    description_en: str | None
    logo_url: str | None
    product_names: list[str]  # tối đa 3 sản phẩm, sản phẩm khớp từ khóa trước
    verification_tier: int = 1  # U20
    product_count: int
    hs_codes: list[str]  # mã HS của các sản phẩm đang hiển thị (không trùng)
    # U10: sản phẩm khớp từ khóa (để giao diện làm nổi bật), loại hình cung cấp và dịch vụ.
    matched_product_names: list[str] = Field(default_factory=list)
    offering_type: Literal["products", "services", "both"] = "products"
    city: str | None = None
    service_titles: list[str] = Field(default_factory=list)  # tối đa 3
    service_categories: list[str] = Field(default_factory=list)


class ExporterPage(BaseModel):
    items: list[ExporterCardOut]
    total: int
    page: int
    page_size: int


class OrderableProduct(BaseModel):
    """Sản phẩm mà buyer được phép gửi RFQ: đang hiển thị công khai của một exporter đã xác minh."""

    id: uuid.UUID
    name: str
    company_id: uuid.UUID
    unit: str | None


class PublicCompanyRef(BaseModel):
    """Tham chiếu tối thiểu tới một công ty đang hiển thị công khai (dashboard)."""

    id: uuid.UUID
    slug: str
    legal_name: str
    country: str
    verified_at: datetime | None


# ── Danh mục và dịch vụ của nhà cung cấp dịch vụ (U2) ─────────────────────────────────────
CategoryCode = Annotated[str, StringConstraints(pattern=r"^[a-z_]{2,32}$")]


class CatalogItemOut(BaseModel):
    """Một dòng danh mục (ngành hàng, loại dịch vụ) — tên hai ngôn ngữ lấy từ DB."""

    code: str
    name_vi: str
    name_en: str


class ServiceOfferingIn(BaseModel):
    category_code: CategoryCode
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
    description_vi: Text | None = None
    description_en: Text | None = None
    coverage_countries: list[CountryCode] = Field(default_factory=list, max_length=60)
    is_active: bool = True

    _uniq = field_validator("coverage_countries")(_unique)


class ServiceOfferingPatch(BaseModel):
    category_code: CategoryCode | None = None
    title: (
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
        | None
    ) = None
    description_vi: Text | None = None
    description_en: Text | None = None
    coverage_countries: list[CountryCode] | None = Field(default=None, max_length=60)
    is_active: bool | None = None

    _uniq = field_validator("coverage_countries")(_unique)


class ServiceOfferingOut(BaseModel):
    id: uuid.UUID
    category_code: str
    category_name_vi: str
    category_name_en: str
    title: str
    description_vi: str | None
    description_en: str | None
    coverage_countries: list[str]
    is_active: bool
    created_at: datetime


# ── Nhu cầu mua hàng của buyer (U5) ───────────────────────────────────────────────────────
Frequency = Literal["one_off", "monthly", "quarterly", "yearly"]
IncotermCode = Literal["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FAS", "FOB", "CFR", "CIF"]
BudgetCurrency = Literal["EUR", "USD"]


class SourcingNeedsIn(BaseModel):
    """Thay toàn bộ nhu cầu (PUT). Mọi trường tùy chọn — buyer bổ sung dần ở "Hoàn thiện hồ sơ"."""

    products_text: Annotated[str, StringConstraints(max_length=2000)] | None = None
    quantity: Amount | None = None
    quantity_unit: Unit | None = None
    frequency: Frequency | None = None
    certifications_wanted: list[Annotated[str, StringConstraints(max_length=64)]] = Field(
        default_factory=list, max_length=20
    )
    min_supplier_tier: Annotated[int, Field(ge=0, le=3)] | None = None
    destination_country: CountryCode | None = None
    destination_port: Title | None = None
    incoterm: IncotermCode | None = None
    budget_amount: Amount | None = None
    budget_currency: BudgetCurrency = "EUR"
    notes: Annotated[str, StringConstraints(max_length=2000)] | None = None

    _uniq = field_validator("certifications_wanted")(_unique)


class SourcingNeedsOut(SourcingNeedsIn):
    updated_at: datetime | None = None


PublicCompanyOut.model_rebuild()
