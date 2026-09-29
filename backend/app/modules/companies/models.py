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
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
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


class Company(Base):
    __tablename__ = "companies"

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
    industry_sector: Mapped[str | None] = mapped_column(String(32), index=True)
    founded_year: Mapped[int | None] = mapped_column(SmallInteger)
    address: Mapped[str | None] = mapped_column(String(500))
    website: Mapped[str | None] = mapped_column(String(255))
    contact_email: Mapped[str | None] = mapped_column(String(320))
    description_vi: Mapped[str | None] = mapped_column(Text)
    description_en: Mapped[str | None] = mapped_column(Text)
    logo_key: Mapped[str | None] = mapped_column(String(255))
    # Chỉ buyer dùng (B2)
    company_size: Mapped[str | None] = mapped_column(String(16))
    procurement_estimate: Mapped[str | None] = mapped_column(String(16))
    vat_number: Mapped[str | None] = mapped_column(String(32))
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


class CompanyExportMarket(Base):
    """Thị trường đã xuất khẩu: mã ISO-2 hoặc khối EU / ASEAN."""

    __tablename__ = "company_export_markets"

    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), primary_key=True
    )
    market: Mapped[str] = mapped_column(String(8), primary_key=True, index=True)


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
    category: Mapped[str] = mapped_column(String(32), primary_key=True, index=True)


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


class ProductImage(Base):
    __tablename__ = "product_images"
    __table_args__ = (UniqueConstraint("product_id", "key"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    key: Mapped[str] = mapped_column(String(255))
    position: Mapped[int] = mapped_column(SmallInteger)
