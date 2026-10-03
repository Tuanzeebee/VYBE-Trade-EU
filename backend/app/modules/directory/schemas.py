import datetime as dt
from typing import Literal

from pydantic import BaseModel, Field

from app.modules.verification.schemas import PublicCertificateOut


class SupplierCardOut(BaseModel):
    """Thẻ nhà cung cấp trong danh bạ (E3): tên, huy hiệu, nhóm hàng, quốc gia, mô tả ngắn."""

    slug: str
    legal_name: str
    country: str
    industry_sector: str | None
    verification_level: Literal["basic", "evfta_verified"]
    verification_tier: int = 1  # U20
    description_vi: str | None
    description_en: str | None
    logo_url: str | None
    product_names: list[str]
    product_count: int
    categories: list[str]  # nhóm hàng (theo mã HS của sản phẩm), không trùng
    # U10
    matched_product_names: list[str] = Field(default_factory=list)
    offering_type: Literal["products", "services", "both"] = "products"
    city: str | None = None
    service_titles: list[str] = Field(default_factory=list)
    service_categories: list[str] = Field(default_factory=list)


class SupplierPage(BaseModel):
    items: list[SupplierCardOut]
    total: int
    page: int
    page_size: int


class FilterOptions(BaseModel):
    categories: list[str]
    certificates: list[PublicCertificateOut]
    service_categories: list[str] = Field(default_factory=list)  # U10


class VerifiedCertificateOut(BaseModel):
    """Chứng nhận đã duyệt, còn hạn, loại được phép công khai (không lộ file hay số chứng nhận)."""

    type_code: str
    name_vi: str
    name_en: str
    issuer: str | None
    expires_at: dt.date | None
    reviewed_at: dt.datetime | None


class SupplierCredentialsOut(BaseModel):
    """U10 "Dữ liệu đã kiểm" trên hồ sơ công khai: ai kiểm, lúc nào, còn hiệu lực đến bao giờ."""

    verified_at: dt.datetime | None
    expires_at: dt.datetime | None
    verified_by: str = "VYBE Trade"
    origin_evidence_complete: bool  # đủ bằng chứng xuất xứ bắt buộc (verification_level nội bộ)
    certificates: list[VerifiedCertificateOut]
    # U20: cấp xác minh công khai (1 Cơ bản, 2 Nâng cao, 3 Chuyên sâu), ngày duyệt và hạn của cấp.
    verification_tier: int = 1
    tier_reviewed_at: dt.datetime | None = None
    tier_expires_at: dt.datetime | None = None
