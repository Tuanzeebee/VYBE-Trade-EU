import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    EmailStr,
    Field,
    StringConstraints,
    field_validator,
)

# Tạm theo 6 nhóm ngành của giao diện cũ; B4 chuyển sang nhóm hàng theo mã HS.
Industry = Literal["agriculture", "seafood", "food_beverage", "textiles", "handicrafts", "spices"]
CountryCode = Annotated[str, StringConstraints(pattern=r"^[A-Z]{2}$")]
MarketCode = Annotated[str, StringConstraints(pattern=r"^(EU|ASEAN|[A-Z]{2})$")]
LangCode = Annotated[str, StringConstraints(pattern=r"^[a-z]{2}$")]


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


class CompanyIn(_CompanyFields):
    legal_name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)
    ]
    country: CountryCode = "VN"
    export_markets: list[MarketCode] = Field(default_factory=list, max_length=50)
    languages_spoken: list[LangCode] = Field(default_factory=list, max_length=20)

    _uniq = field_validator("export_markets", "languages_spoken")(_unique)


class CompanyPatch(_CompanyFields):
    """Chỉ các trường gửi lên mới được sửa; danh sách gửi lên thay thế danh sách cũ."""

    legal_name: (
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
        | None
    ) = None
    country: CountryCode | None = None
    export_markets: list[MarketCode] | None = Field(default=None, max_length=50)
    languages_spoken: list[LangCode] | None = Field(default=None, max_length=20)
    logo_key: Annotated[str, StringConstraints(max_length=255)] | None = None

    _uniq = field_validator("export_markets", "languages_spoken")(_unique)


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


class PresignIn(BaseModel):
    purpose: Literal["logo"]
    content_type: Literal["image/png", "image/jpeg", "image/webp"]


class PresignOut(BaseModel):
    upload_url: str
    key: str
