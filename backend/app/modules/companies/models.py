import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class CompanyType(StrEnum):
    exporter = "exporter"
    buyer = "buyer"


class VerificationStatus(StrEnum):
    unverified = "unverified"
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class VerificationLevel(StrEnum):
    basic = "basic"
    evfta_verified = "evfta_verified"


class OfferingType(StrEnum):
    """Seller cung cấp (U2): sản phẩm, dịch vụ (logistics, hải quan, kế toán-thuế…) hoặc cả hai."""

    products = "products"
    services = "services"
    both = "both"


class FacilityCodeType(StrEnum):
    growing_area = "growing_area"  # mã số vùng trồng (PUC)
    packing_facility = "packing_facility"  # mã số cơ sở đóng gói (PHC)
    establishment = "establishment"  # mã cơ sở được EU cấp phép (TRACES-NT, thủy sản/thực phẩm)
    other = "other"


class IndustryCategory(Base):
    """Ngành hàng (U2) — dữ liệu; companies.industry_sector và nhóm hàng buyer tham chiếu tới."""

    __tablename__ = "industries"

    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    name_vi: Mapped[str] = mapped_column(String(120))
    name_en: Mapped[str] = mapped_column(String(120))
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0, server_default=text("0"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))


class ServiceCategory(Base):
    """Loại dịch vụ của nhà cung cấp dịch vụ (U2) — dữ liệu, admin thêm được mà không cần deploy."""

    __tablename__ = "service_categories"

    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    name_vi: Mapped[str] = mapped_column(String(120))
    name_en: Mapped[str] = mapped_column(String(120))
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0, server_default=text("0"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))


class Company(Base):
    __tablename__ = "companies"
    __table_args__ = (
        # Tìm tên công ty ở danh bạ (E2); biểu thức khớp product_service.search_verified_exporters.
        Index(
            "ix_companies_legal_name_trgm",
            text("immutable_unaccent(lower(legal_name)) gin_trgm_ops"),
            postgresql_using="gin",
        ),
        Index(
            "ix_companies_directory",
            "legal_name",
            "id",
            postgresql_where=text("verification_status = 'verified' AND NOT is_hidden"),
        ),
        CheckConstraint(
            "offering_type IN ('products', 'services', 'both')", name="offering_type_known"
        ),
        CheckConstraint("verification_tier BETWEEN 0 AND 3", name="verification_tier_range"),
        CheckConstraint(
            "capacity_period IS NULL OR capacity_period IN ('month', 'year')",
            name="capacity_period_known",
        ),
        CheckConstraint("capacity_value IS NULL OR capacity_value > 0", name="capacity_positive"),
        CheckConstraint("(latitude IS NULL) = (longitude IS NULL)", name="lat_lng_together"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # Mỗi tài khoản một công ty trong MVP. FK tới users (module auth) chỉ ở tầng DB.
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), unique=True
    )
    type: Mapped[CompanyType] = mapped_column(Enum(CompanyType, name="company_type"))
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    legal_name: Mapped[str] = mapped_column(String(255))
    registration_number: Mapped[str | None] = mapped_column(String(64))
    tax_id: Mapped[str | None] = mapped_column(String(32))
    business_type: Mapped[str | None] = mapped_column(String(64))
    country: Mapped[str] = mapped_column(String(2), index=True)
    industry_sector: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("industries.code", ondelete="RESTRICT"), index=True
    )
    # Ngành "Khác": tên ngành do doanh nghiệp tự ghi.
    industry_other: Mapped[str | None] = mapped_column(String(120))
    founded_year: Mapped[int | None] = mapped_column(SmallInteger)
    address: Mapped[str | None] = mapped_column(String(500))
    website: Mapped[str | None] = mapped_column(String(255))
    contact_email: Mapped[str | None] = mapped_column(String(320))
    phone: Mapped[str | None] = mapped_column(String(40))
    # U5: người liên hệ và thành phố (buyer chỉ khai thông tin cơ bản ở bước đầu).
    contact_name: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(120))
    # Người đại diện pháp luật và cơ quan cấp ĐKKD — lưu đúng như in trên giấy tờ (U2).
    legal_rep_name: Mapped[str | None] = mapped_column(String(255))
    legal_rep_title: Mapped[str | None] = mapped_column(String(120))
    issuing_authority: Mapped[str | None] = mapped_column(String(255))
    description_vi: Mapped[str | None] = mapped_column(Text)
    description_en: Mapped[str | None] = mapped_column(Text)
    logo_key: Mapped[str | None] = mapped_column(String(255))
    # Seller (U2): sản phẩm / dịch vụ / cả hai; năng lực nhà máy; khách hàng chính (tùy chọn)
    offering_type: Mapped[str] = mapped_column(
        String(16), default=OfferingType.products.value, server_default=OfferingType.products.value
    )
    factory_address: Mapped[str | None] = mapped_column(String(500))
    capacity_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    capacity_unit: Mapped[str | None] = mapped_column(String(32))
    capacity_period: Mapped[str | None] = mapped_column(String(8))
    main_customers: Mapped[str | None] = mapped_column(Text)
    # Toạ độ cho bản đồ hồ sơ: chỉ job geocode ghi (U21); chỉ hiện chính xác khi owner đồng ý.
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    location_public: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    # U9: buyer bật thì seller không thấy tên công ty khi buyer xem hồ sơ (chỉ được đếm ẩn danh).
    hide_profile_views: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    # Quy mô nhân sự: buyer (B2) và seller (U2) đều dùng
    company_size: Mapped[str | None] = mapped_column(String(16))
    procurement_estimate: Mapped[str | None] = mapped_column(String(16))
    vat_number: Mapped[str | None] = mapped_column(String(32))
    eori_number: Mapped[str | None] = mapped_column(String(20))
    # Mã LEI (ISO 17442) để đối chiếu GLEIF; tuỳ chọn, cho cả buyer và exporter.
    lei_code: Mapped[str | None] = mapped_column(String(20))
    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verification_status"),
        default=VerificationStatus.unverified,
        server_default=VerificationStatus.unverified.value,
        index=True,
    )
    verification_level: Mapped[VerificationLevel] = mapped_column(
        Enum(VerificationLevel, name="verification_level"),
        default=VerificationLevel.basic,
        server_default=VerificationLevel.basic.value,
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # U20 (ADR-0004): cấp xác minh 0–3; chỉ verification.decide() đổi. Cấp 2–3 có hạn riêng.
    verification_tier: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
    tier_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    tier_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    profile_completeness_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0"), server_default=text("0")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    export_markets: Mapped[list["CompanyExportMarket"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin", order_by="CompanyExportMarket.market"
    )
    languages: Mapped[list["CompanyLanguage"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin", order_by="CompanyLanguage.lang"
    )
    sourcing_categories: Mapped[list["CompanySourcingCategory"]] = relationship(
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="CompanySourcingCategory.category",
    )
    facility_codes: Mapped[list["CompanyFacilityCode"]] = relationship(
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="[CompanyFacilityCode.code_type, CompanyFacilityCode.code]",
    )


class BuyerSourcingNeeds(Base):
    """Nhu cầu mua hàng của buyer (U5): trước đây chỉ nằm trong trình duyệt; nay lưu server để
    seller và việc ghép nối đọc được. Mỗi buyer một dòng; mọi trường tùy chọn (hỏi sau bước đầu)."""

    __tablename__ = "buyer_sourcing_needs"
    __table_args__ = (
        CheckConstraint("quantity IS NULL OR quantity > 0", name="quantity_positive"),
        CheckConstraint("budget_amount IS NULL OR budget_amount > 0", name="budget_positive"),
        CheckConstraint(
            "min_supplier_tier IS NULL OR min_supplier_tier BETWEEN 0 AND 3", name="tier_range"
        ),
        CheckConstraint(
            "frequency IS NULL OR frequency IN ('one_off', 'monthly', 'quarterly', 'yearly')",
            name="frequency_known",
        ),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), primary_key=True
    )
    products_text: Mapped[str | None] = mapped_column(Text)
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    quantity_unit: Mapped[str | None] = mapped_column(String(32))
    frequency: Mapped[str | None] = mapped_column(String(16))
    certifications_wanted: Mapped[list[str]] = mapped_column(
        ARRAY(String(64)), default=list, server_default=text("'{}'")
    )
    min_supplier_tier: Mapped[int | None] = mapped_column(SmallInteger)
    destination_country: Mapped[str | None] = mapped_column(String(2))
    destination_port: Mapped[str | None] = mapped_column(String(120))
    incoterm: Mapped[str | None] = mapped_column(String(8))
    budget_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    budget_currency: Mapped[str] = mapped_column(String(3), default="EUR", server_default="EUR")
    notes: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CompanyFacilityCode(Base):
    """Mã vùng trồng, mã cơ sở đóng gói, mã cơ sở được EU cấp phép… doanh nghiệp tự khai (U2).

    Tự khai — kiểm chéo ở U22, đối chiếu danh sách TRACES-NT ở U21; không tự làm tăng cấp xác minh.
    """

    __tablename__ = "company_facility_codes"
    __table_args__ = (
        UniqueConstraint("company_id", "code_type", "code"),
        CheckConstraint(
            "code_type IN ('growing_area', 'packing_facility', 'establishment', 'other')",
            name="code_type_known",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), index=True
    )
    code_type: Mapped[str] = mapped_column(String(24))
    code: Mapped[str] = mapped_column(String(64))


class CompanyServiceOffering(Base):
    """Dịch vụ của nhà cung cấp dịch vụ (U2): loại dịch vụ, mô tả, phạm vi nước phục vụ."""

    __tablename__ = "company_service_offerings"
    __table_args__ = (
        Index(
            "ix_company_service_offerings_title_trgm",
            text("immutable_unaccent(lower(title)) gin_trgm_ops"),
            postgresql_using="gin",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), index=True
    )
    category_code: Mapped[str] = mapped_column(
        String(32), ForeignKey("service_categories.code", ondelete="RESTRICT"), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    description_vi: Mapped[str | None] = mapped_column(Text)
    description_en: Mapped[str | None] = mapped_column(Text)
    coverage_countries: Mapped[list[str]] = mapped_column(
        ARRAY(String(2)), default=list, server_default=text("'{}'")
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CompanyExportMarket(Base):
    """Thị trường đã xuất khẩu: mã ISO-2 hoặc khối EU / ASEAN."""

    __tablename__ = "company_export_markets"
    __table_args__ = (
        CheckConstraint(
            "trade_channel IS NULL OR trade_channel IN ('official', 'unofficial')",
            name="trade_channel_known",
        ),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), primary_key=True
    )
    market: Mapped[str] = mapped_column(String(8), primary_key=True, index=True)
    # B10: chính ngạch / tiểu ngạch, chủ hồ sơ tự khai cho từng thị trường (tuỳ chọn). Không vào
    # điểm tín nhiệm, cấp xác minh hay máy tính tuân thủ; không lộ ra hồ sơ công khai.
    trade_channel: Mapped[str | None] = mapped_column(String(16))


class CompanyLanguage(Base):
    """Ngôn ngữ nhân viên sử dụng: mã ISO-639-1."""

    __tablename__ = "company_languages"

    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), primary_key=True
    )
    lang: Mapped[str] = mapped_column(String(2), primary_key=True, index=True)


class CompanySourcingCategory(Base):
    """Nhóm hàng buyer quan tâm (dùng cho lưu tìm kiếm K1 và dashboard G2)."""

    __tablename__ = "company_sourcing_categories"

    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), primary_key=True
    )
    category: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("industries.code", ondelete="RESTRICT"),
        primary_key=True,
        index=True,
    )


class ApprovalStatus(StrEnum):
    pending = "pending"
    approved = "approved"
    hidden = "hidden"


class Product(Base):
    """Sản phẩm của exporter. hs_code bắt buộc (khóa ngoại tới danh mục HS của module catalog)."""

    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint(
            "price_min IS NULL OR price_max IS NULL OR price_min <= price_max", name="price_order"
        ),
        CheckConstraint(
            "(price_min IS NULL OR price_min > 0) AND (price_max IS NULL OR price_max > 0) "
            "AND (moq IS NULL OR moq > 0)",
            name="positive_amounts",
        ),
        Index(
            "ix_products_name_trgm",
            text("immutable_unaccent(lower(name)) gin_trgm_ops"),
            postgresql_using="gin",
        ),
        Index("ix_products_company_hs", "company_id", "hs_code"),
        CheckConstraint(
            "brand_model IS NULL OR brand_model IN ('oem', 'own_brand', 'both')",
            name="brand_model_known",
        ),
        CheckConstraint(
            "description_source_lang IS NULL OR description_source_lang IN ('vi', 'en')",
            name="source_lang_known",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), index=True
    )
    hs_code: Mapped[str] = mapped_column(
        String(8), ForeignKey("hs_codes.code", ondelete="RESTRICT"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    description_vi: Mapped[str | None] = mapped_column(Text)
    description_en: Mapped[str | None] = mapped_column(Text)
    price_min: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    price_max: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3), default="USD", server_default="USD")
    unit: Mapped[str | None] = mapped_column(String(32))
    moq: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    moq_unit: Mapped[str | None] = mapped_column(String(32))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus, name="approval_status"),
        default=ApprovalStatus.approved,
        server_default=ApprovalStatus.approved.value,
    )
    # U3: gia công OEM hay bán thương hiệu riêng; mô tả chỉ bắt buộc một ngôn ngữ, bản kia dịch máy.
    brand_model: Mapped[str | None] = mapped_column(String(16))
    description_source_lang: Mapped[str | None] = mapped_column(String(2))
    description_vi_machine: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    description_en_machine: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    # clock_timestamp() (không phải now()) để thứ tự tạo không trùng trong cùng một transaction.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    images: Mapped[list["ProductImage"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin", order_by="ProductImage.position"
    )
    packagings: Mapped[list["ProductPackaging"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin", order_by="ProductPackaging.position"
    )
    price_tiers: Mapped[list["ProductPriceTier"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin", order_by="ProductPriceTier.min_quantity"
    )


class ProductPackaging(Base):
    """Quy cách đóng gói (U3): 20 kg/bao, 1 kg/túi… và kênh (Horeca, siêu thị, công nghiệp)."""

    __tablename__ = "product_packagings"
    __table_args__ = (
        CheckConstraint("pack_size > 0", name="pack_size_positive"),
        CheckConstraint(
            "channel IN ('horeca', 'retail', 'industrial', 'any')", name="channel_known"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    pack_size: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    pack_unit: Mapped[str] = mapped_column(String(16))
    pack_type: Mapped[str] = mapped_column(String(16))
    channel: Mapped[str] = mapped_column(String(16), default="any", server_default="any")
    position: Mapped[int] = mapped_column(SmallInteger)


class ProductPriceTier(Base):
    """Bậc giá theo số lượng (U3, kiểu Alibaba): từ min_quantity (đơn vị MOQ) giá unit_price."""

    __tablename__ = "product_price_tiers"
    __table_args__ = (
        UniqueConstraint("product_id", "min_quantity"),
        CheckConstraint("min_quantity > 0 AND unit_price > 0", name="positive_amounts"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    min_quantity: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2))


class ProductImage(Base):
    __tablename__ = "product_images"
    __table_args__ = (UniqueConstraint("product_id", "key"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    key: Mapped[str] = mapped_column(String(255))
    position: Mapped[int] = mapped_column(SmallInteger)


class CompletenessWeight(Base):
    """Trọng số điểm hoàn thiện hồ sơ (B3) — dữ liệu cấu hình, không viết cứng trong code.

    field_key trùng khóa do completeness.build_facts() sinh ra; is_enabled=false cho dòng chưa có
    tính năng (logo, bằng chứng) — dòng tắt không nằm trong mẫu số.
    """

    __tablename__ = "completeness_weights"
    __table_args__ = (CheckConstraint("weight >= 0", name="weight_non_negative"),)

    company_type: Mapped[CompanyType] = mapped_column(
        Enum(CompanyType, name="company_type", create_type=False), primary_key=True
    )
    field_key: Mapped[str] = mapped_column(String(32), primary_key=True)
    group_key: Mapped[str] = mapped_column(String(32))
    weight: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
