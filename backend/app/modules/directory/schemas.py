from typing import Literal

from pydantic import BaseModel

from app.modules.verification.schemas import PublicCertificateOut


class SupplierCardOut(BaseModel):
    """Thẻ nhà cung cấp trong danh bạ (E3): tên, huy hiệu, nhóm hàng, quốc gia, mô tả ngắn."""

    slug: str
    legal_name: str
    country: str
    industry_sector: str | None
    verification_level: Literal["basic", "evfta_verified"]
    description_vi: str | None
    description_en: str | None
    logo_url: str | None
    product_names: list[str]
    product_count: int
    categories: list[str]  # nhóm hàng (theo mã HS của sản phẩm), không trùng


class SupplierPage(BaseModel):
    items: list[SupplierCardOut]
    total: int
    page: int
    page_size: int


class FilterOptions(BaseModel):
    categories: list[str]
    certificates: list[PublicCertificateOut]
