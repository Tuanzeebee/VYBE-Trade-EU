"""Sản phẩm của exporter (B5) và hồ sơ công khai. Một phần API công khai của module companies."""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.storage import Storage
from app.modules.auth.schemas import CurrentUser
from app.modules.catalog.schemas import HsCodeOut
from app.modules.catalog.service import get_hs_code
from app.modules.companies import completeness_service
from app.modules.companies.models import (
    ApprovalStatus,
    Company,
    CompanyType,
    Product,
    ProductImage,
    VerificationStatus,
)
from app.modules.companies.schemas import (
    ProductImageOut,
    ProductIn,
    ProductOut,
    ProductPatch,
    PublicCompanyOut,
    PublicProductOut,
)
from app.modules.companies.service import _own_company

# Cột NOT NULL: gửi null tường minh khi sửa là lỗi.
_NOT_NULL = ("name", "hs_code", "currency", "is_active")


async def _owned_exporter(session: AsyncSession, user: CurrentUser) -> Company:
    """Lớp kiểm thứ hai (lớp một là require_role ở router): chỉ exporter có sản phẩm."""
    if user.role != "exporter":
        raise AppError("forbidden", "Not allowed for this role", 403)
    company = await _own_company(session, user)
    if company.type is not CompanyType.exporter:
        raise AppError("forbidden", "Not allowed for this role", 403)
    return company


async def _resolve_hs(session: AsyncSession, raw: str) -> HsCodeOut:
    hs = await get_hs_code(session, raw)
    if hs is None:
        raise AppError("invalid_hs_code", "HS code is not in the supported catalog", 422)
    return hs


def _check_image_keys(company_id: uuid.UUID, keys: list[str]) -> None:
    prefix = f"products/{company_id}/"
    if len(set(keys)) != len(keys):
        raise AppError("duplicate_image", "Duplicate image keys", 422)
    for key in keys:
        if not key.startswith(prefix) or len(key) == len(prefix) or ".." in key:
            raise AppError("invalid_image_key", "Image does not belong to this company", 422)


def _set_images(product: Product, keys: list[str]) -> None:
    """Giữ lại bản ghi ảnh đã có (tránh vi phạm unique khi đổi thứ tự), thêm mới, bỏ phần thừa."""
    existing = {image.key: image for image in product.images}
    images: list[ProductImage] = []
    for position, key in enumerate(keys):
        image = existing.get(key) or ProductImage(key=key)
        image.position = position
        images.append(image)
    product.images = images


async def _out(
    session: AsyncSession, storage: Storage, product: Product, cache: dict[str, HsCodeOut]
) -> ProductOut:
    hs = cache.get(product.hs_code) or await _resolve_hs(session, product.hs_code)
    cache[product.hs_code] = hs
    return ProductOut(
        id=product.id,
        name=product.name,
        hs_code=hs.code,
        hs_formatted=hs.formatted,
        hs_name_vi=hs.name_vi,
        hs_name_en=hs.name_en,
        description_vi=product.description_vi,
        description_en=product.description_en,
        price_min=product.price_min,
        price_max=product.price_max,
        currency=product.currency,
        unit=product.unit,
        moq=product.moq,
        moq_unit=product.moq_unit,
        is_active=product.is_active,
        approval_status=product.approval_status.value,
        images=[
            ProductImageOut(key=image.key, url=await storage.presign_get(image.key))
            for image in product.images
        ],
        created_at=product.created_at,
    )


async def _get_owned(session: AsyncSession, company: Company, product_id: uuid.UUID) -> Product:
    product = await session.scalar(
        select(Product).where(Product.id == product_id, Product.company_id == company.id)
    )
    if product is None:
        raise AppError("product_not_found", "Product not found", 404)
    return product


async def list_active_hs_codes(session: AsyncSession, company_id: uuid.UUID) -> list[str]:
    """Mã HS (không trùng) của các sản phẩm đang bật — module khác dùng để suy ra nhóm hàng."""
    rows = await session.scalars(
        select(Product.hs_code)
        .where(Product.company_id == company_id, Product.is_active.is_(True))
        .distinct()
    )
    return sorted(rows)


async def list_products(
    session: AsyncSession, user: CurrentUser, storage: Storage
) -> list[ProductOut]:
    company = await _owned_exporter(session, user)
    rows = (
        await session.scalars(
            select(Product)
            .where(Product.company_id == company.id)
            .order_by(Product.created_at, Product.id)
        )
    ).all()
    cache: dict[str, HsCodeOut] = {}
    return [await _out(session, storage, p, cache) for p in rows]


async def get_product(
    session: AsyncSession, user: CurrentUser, storage: Storage, product_id: uuid.UUID
) -> ProductOut:
    company = await _owned_exporter(session, user)
    return await _out(session, storage, await _get_owned(session, company, product_id), {})


async def create_product(
    session: AsyncSession, user: CurrentUser, storage: Storage, data: ProductIn
) -> ProductOut:
    company = await _owned_exporter(session, user)
    hs = await _resolve_hs(session, data.hs_code)
    _check_image_keys(company.id, data.image_keys)
    values: dict[str, Any] = data.model_dump(exclude={"hs_code", "image_keys"})
    product = Product(company_id=company.id, hs_code=hs.code, **values)
    _set_images(product, data.image_keys)
    session.add(product)
    await session.flush()
    await completeness_service.refresh_score(session, company)
    await session.commit()
    await session.refresh(product)
    return await _out(session, storage, product, {hs.code: hs})


async def update_product(
    session: AsyncSession,
    user: CurrentUser,
    storage: Storage,
    product_id: uuid.UUID,
    data: ProductPatch,
) -> ProductOut:
    company = await _owned_exporter(session, user)
    product = await _get_owned(session, company, product_id)
    changes = data.model_dump(exclude_unset=True)
    for field in _NOT_NULL:
        if field in changes and changes[field] is None:
            raise AppError("invalid_field", f"{field} cannot be empty", 422)
    if "hs_code" in changes:
        changes["hs_code"] = (await _resolve_hs(session, changes["hs_code"])).code
    keys = changes.pop("image_keys", None)
    if keys is not None:
        _check_image_keys(company.id, keys)
    low = changes.get("price_min", product.price_min)
    high = changes.get("price_max", product.price_max)
    if low is not None and high is not None and low > high:
        raise AppError("invalid_price_range", "price_min must not exceed price_max", 422)
    for field, value in changes.items():
        setattr(product, field, value)
    if keys is not None:
        _set_images(product, keys)
    await session.flush()
    await completeness_service.refresh_score(session, company)
    await session.commit()
    await session.refresh(product)
    return await _out(session, storage, product, {})


async def delete_product(session: AsyncSession, user: CurrentUser, product_id: uuid.UUID) -> None:
    company = await _owned_exporter(session, user)
    await session.delete(await _get_owned(session, company, product_id))
    await session.flush()
    await completeness_service.refresh_score(session, company)
    await session.commit()


async def get_public_profile(
    session: AsyncSession, storage: Storage, slug: str
) -> PublicCompanyOut:
    """Chỉ exporter đã xác minh, chưa bị ẩn, chưa hết hạn; chỉ sản phẩm đang bật và đã duyệt."""
    company = await session.scalar(
        select(Company).where(
            Company.slug == slug,
            Company.type == CompanyType.exporter,
            Company.verification_status == VerificationStatus.verified,
            Company.is_hidden.is_(False),
            or_(Company.expires_at.is_(None), Company.expires_at > datetime.now(UTC)),
        )
    )
    if company is None:
        raise AppError("company_not_found", "Company not found", 404)
    rows = (
        await session.scalars(
            select(Product)
            .where(
                Product.company_id == company.id,
                Product.is_active.is_(True),
                Product.approval_status == ApprovalStatus.approved,
            )
            .order_by(Product.created_at, Product.id)
        )
    ).all()
    cache: dict[str, HsCodeOut] = {}
    products: list[PublicProductOut] = []
    for row in rows:
        full = await _out(session, storage, row, cache)
        products.append(
            PublicProductOut(
                **full.model_dump(
                    exclude={"id", "is_active", "approval_status", "images", "created_at"}
                ),
                images=[image.url for image in full.images],
            )
        )
    return PublicCompanyOut(
        slug=company.slug,
        legal_name=company.legal_name,
        country=company.country,
        industry_sector=company.industry_sector,
        founded_year=company.founded_year,
        website=company.website,
        description_vi=company.description_vi,
        description_en=company.description_en,
        logo_url=await storage.presign_get(company.logo_key) if company.logo_key else None,
        export_markets=[m.market for m in company.export_markets],
        languages_spoken=[lang.lang for lang in company.languages],
        verification_level=company.verification_level.value,
        verified_at=company.verified_at,
        products=products,
    )
