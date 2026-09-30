"""Sản phẩm của exporter (B5) và hồ sơ công khai. Một phần API công khai của module companies."""

import logging
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import Select, and_, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.errors import AppError
from app.core.storage import Storage
from app.core.translation import TranslationError, TranslationService
from app.modules.auth.schemas import CurrentUser
from app.modules.catalog.schemas import HsCodeOut
from app.modules.catalog.service import categories_for_codes, get_hs_code
from app.modules.companies import completeness_service
from app.modules.companies.models import (
    ApprovalStatus,
    Company,
    CompanySourcingCategory,
    CompanyType,
    Product,
    ProductImage,
    ProductPackaging,
    ProductPriceTier,
    VerificationStatus,
)
from app.modules.companies.schemas import (
    AdminProductOut,
    AdminProductPatch,
    ExporterCardOut,
    ExporterPage,
    OrderableProduct,
    PackagingIn,
    PackagingOut,
    PriceTierIn,
    PriceTierOut,
    ProductImageOut,
    ProductIn,
    ProductOut,
    ProductPatch,
    PublicCompanyOut,
    PublicCompanyRef,
    PublicProductOut,
    ReviewProductOut,
)
from app.modules.companies.service import _own_company

# Cột NOT NULL: gửi null tường minh khi sửa là lỗi.
_NOT_NULL = ("name", "hs_code", "currency", "is_active", "packagings", "price_tiers")
_LIST_FIELDS = ("image_keys", "packagings", "price_tiers")

log = logging.getLogger(__name__)

# ── Dịch mô tả sản phẩm (U3): chỉ bắt buộc một ngôn ngữ, bản kia dịch máy bằng job nền ─────────
TranslationEnqueuer = Callable[[uuid.UUID], Awaitable[None]]


async def _defer_translation(product_id: uuid.UUID) -> None:
    """Đẩy job dịch mô tả. Lỗi hàng đợi không làm hỏng việc lưu sản phẩm."""
    try:
        from app.jobs.translate_product import translate_product

        await translate_product.defer_async(product_id=str(product_id))
    except Exception:
        log.exception("Không xếp được job dịch mô tả cho sản phẩm %s", product_id)


_enqueue_translation: TranslationEnqueuer = _defer_translation


def set_translation_enqueuer(enqueuer: TranslationEnqueuer) -> TranslationEnqueuer:
    """Thay bộ xếp hàng (test). Trả về bộ cũ để khôi phục."""
    global _enqueue_translation
    previous, _enqueue_translation = _enqueue_translation, enqueuer
    return previous


def _needs_translation(product: Product) -> bool:
    """Có đúng một bản do người viết, bản còn lại trống hoặc là bản dịch máy cũ."""
    vi = (product.description_vi or "").strip()
    en = (product.description_en or "").strip()
    vi_human = bool(vi) and not product.description_vi_machine
    en_human = bool(en) and not product.description_en_machine
    return vi_human != en_human


def _mark_human_edits(product: Product, changes: dict[str, Any]) -> None:
    """Người dùng tự gửi mô tả ở ngôn ngữ nào thì bản đó là của người, không còn là dịch máy."""
    for lang in ("vi", "en"):
        field = f"description_{lang}"
        if field in changes:
            setattr(product, f"{field}_machine", False)


async def translate_missing_description(
    session: AsyncSession, translator: TranslationService, product_id: uuid.UUID
) -> bool:
    """Dịch mô tả sang ngôn ngữ còn thiếu (job gọi). Trả True nếu đã ghi bản dịch.

    Không bao giờ ghi đè bản do người viết; lỗi dịch thì để trống (không dịch giả).
    """
    product = await session.get(Product, product_id)
    if product is None or not _needs_translation(product):
        return False
    vi_human = bool((product.description_vi or "").strip()) and not product.description_vi_machine
    source, target = ("vi", "en") if vi_human else ("en", "vi")
    text = getattr(product, f"description_{source}") or ""
    try:
        translated = (await translator.translate(text, source, target)).strip()
    except TranslationError:
        log.info("Chưa dịch được mô tả sản phẩm %s (%s→%s)", product_id, source, target)
        return False
    if not translated:
        return False
    setattr(product, f"description_{target}", translated[:5000])
    setattr(product, f"description_{target}_machine", True)
    await session.commit()
    return True


def _set_packagings(product: Product, packagings: list[PackagingIn]) -> None:
    product.packagings = [
        ProductPackaging(
            pack_size=p.pack_size,
            pack_unit=p.pack_unit,
            pack_type=p.pack_type,
            channel=p.channel,
            position=index,
        )
        for index, p in enumerate(packagings)
    ]


def _set_tiers(product: Product, tiers: list[PriceTierIn]) -> None:
    """Bậc giá thay cho giá thấp/cao nhất (demo 30/9). Khi có bậc giá, price_min/price_max là
    tóm tắt suy ra từ bậc giá để thẻ danh bạ, RFQ và hồ sơ công khai vẫn đọc được như cũ; MOQ mặc
    định bằng số lượng của bậc đầu tiên nếu người dùng chưa khai."""
    product.price_tiers = [
        ProductPriceTier(min_quantity=t.min_quantity, unit_price=t.unit_price) for t in tiers
    ]
    if tiers:
        prices = [t.unit_price for t in tiers]
        product.price_min, product.price_max = min(prices), max(prices)
        if product.moq is None:
            product.moq = tiers[0].min_quantity


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
        brand_model=product.brand_model,
        description_source_lang=product.description_source_lang,
        description_vi_machine=product.description_vi_machine,
        description_en_machine=product.description_en_machine,
        packagings=[
            PackagingOut(
                pack_size=p.pack_size,
                pack_unit=p.pack_unit,
                pack_type=p.pack_type,
                channel=p.channel,
            )
            for p in product.packagings
        ],
        price_tiers=[
            PriceTierOut(min_quantity=t.min_quantity, unit_price=t.unit_price)
            for t in product.price_tiers
        ],
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


async def list_products_for_review(
    session: AsyncSession, company_id: uuid.UUID
) -> list[ReviewProductOut]:
    """Sản phẩm của một công ty cho admin duyệt xác minh. Router phải giới hạn vai trò admin."""
    rows = await session.scalars(
        select(Product)
        .where(Product.company_id == company_id)
        .order_by(Product.created_at, Product.id)
    )
    cache: dict[str, HsCodeOut | None] = {}
    out: list[ReviewProductOut] = []
    for p in rows:
        if p.hs_code not in cache:
            cache[p.hs_code] = await get_hs_code(session, p.hs_code)
        hs = cache[p.hs_code]
        out.append(
            ReviewProductOut(
                id=p.id,
                name=p.name,
                hs_code=p.hs_code,
                hs_formatted=hs.formatted if hs else p.hs_code,
                hs_name_vi=hs.name_vi if hs else None,
                hs_name_en=hs.name_en if hs else None,
                price_min=p.price_min,
                price_max=p.price_max,
                currency=p.currency,
                unit=p.unit,
                moq=p.moq,
                moq_unit=p.moq_unit,
                is_active=p.is_active,
            )
        )
    return out


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
    values: dict[str, Any] = data.model_dump(exclude={"hs_code", *_LIST_FIELDS})
    product = Product(company_id=company.id, hs_code=hs.code, **values)
    _set_images(product, data.image_keys)
    _set_packagings(product, data.packagings)
    _set_tiers(product, data.price_tiers)
    session.add(product)
    await session.flush()
    await completeness_service.refresh_score(session, company)
    await session.commit()
    await session.refresh(product)
    if _needs_translation(product):
        await _enqueue_translation(product.id)
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
    changes.pop("packagings", None)
    changes.pop("price_tiers", None)
    low = changes.get("price_min", product.price_min)
    high = changes.get("price_max", product.price_max)
    if low is not None and high is not None and low > high:
        raise AppError("invalid_price_range", "price_min must not exceed price_max", 422)
    _mark_human_edits(product, changes)
    for field, value in changes.items():
        setattr(product, field, value)
    if keys is not None:
        _set_images(product, keys)
    if data.packagings is not None:
        _set_packagings(product, data.packagings)
    if data.price_tiers is not None:
        _set_tiers(product, data.price_tiers)
    await session.flush()
    await completeness_service.refresh_score(session, company)
    await session.commit()
    await session.refresh(product)
    if _needs_translation(product):
        await _enqueue_translation(product.id)
    return await _out(session, storage, product, {})


async def delete_product(session: AsyncSession, user: CurrentUser, product_id: uuid.UUID) -> None:
    company = await _owned_exporter(session, user)
    await session.delete(await _get_owned(session, company, product_id))
    await session.flush()
    await completeness_service.refresh_score(session, company)
    await session.commit()


def verified_exporter_conditions(now: datetime) -> list[Any]:
    """Điều kiện DUY NHẤT để công ty được hiện ra công khai (danh bạ và hồ sơ) — AGENTS.md §6.10:
    đã xác minh, chưa bị ẩn, chưa hết hạn."""
    return [
        Company.type == CompanyType.exporter,
        Company.verification_status == VerificationStatus.verified,
        Company.is_hidden.is_(False),
        or_(Company.expires_at.is_(None), Company.expires_at > now),
    ]


def _public_product_conditions() -> list[Any]:
    return [Product.is_active.is_(True), Product.approval_status == ApprovalStatus.approved]


def _literal_like(token: str) -> str:
    escaped = token.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


@dataclass(frozen=True)
class SearchTerm:
    """Một từ khóa và các nơi khác (do module khác cung cấp) mà nó có thể khớp:
    mã HS có tên khớp, công ty có chứng nhận khớp."""

    token: str
    hs_codes: Select[str]
    company_ids: Select[uuid.UUID]


async def search_verified_exporters(
    session: AsyncSession,
    storage: Storage,
    *,
    terms: list[SearchTerm],
    hs_prefix: str | None,
    country: str | None,
    category_codes: Select[str] | None,
    certified_ids: Select[uuid.UUID] | None,
    page: int,
    page_size: int,
    now: datetime,
) -> ExporterPage:
    """Hàm truy vấn danh bạ DUY NHẤT. Mọi từ khóa phải khớp (AND); mỗi từ khớp nếu có ở tên công ty,
    tên sản phẩm đang hiển thị, mã HS (kể cả theo tên HS) hoặc chứng nhận còn hạn."""
    live_product = and_(Product.company_id == Company.id, *_public_product_conditions())
    conditions: list[Any] = verified_exporter_conditions(now)
    for term in terms:
        pattern = _literal_like(term.token)
        name_like = func.immutable_unaccent(func.lower(Company.legal_name)).like(
            func.immutable_unaccent(func.lower(pattern)), escape="\\"
        )
        product_like = func.immutable_unaccent(func.lower(Product.name)).like(
            func.immutable_unaccent(func.lower(pattern)), escape="\\"
        )
        conditions.append(
            or_(
                name_like,
                exists().where(live_product, or_(product_like, Product.hs_code.in_(term.hs_codes))),
                Company.id.in_(term.company_ids),
            )
        )
    if hs_prefix:
        conditions.append(exists().where(live_product, Product.hs_code.like(f"{hs_prefix}%")))
    if country:
        conditions.append(Company.country == country)
    if category_codes is not None:
        conditions.append(exists().where(live_product, Product.hs_code.in_(category_codes)))
    if certified_ids is not None:
        conditions.append(Company.id.in_(certified_ids))

    total = await session.scalar(select(func.count()).select_from(Company).where(*conditions)) or 0
    companies = (
        await session.scalars(
            select(Company)
            .where(*conditions)
            .order_by(Company.legal_name, Company.id)
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
    ).all()
    products: dict[uuid.UUID, list[Product]] = {c.id: [] for c in companies}
    if companies:
        rows = await session.scalars(
            select(Product)
            .where(Product.company_id.in_(products), *_public_product_conditions())
            .order_by(Product.created_at, Product.id)
        )
        for row in rows:
            products[row.company_id].append(row)
    items = [
        ExporterCardOut(
            slug=c.slug,
            legal_name=c.legal_name,
            country=c.country,
            industry_sector=c.industry_sector,
            verification_level=c.verification_level.value,
            verified_at=c.verified_at,
            description_vi=c.description_vi,
            description_en=c.description_en,
            logo_url=await storage.presign_get(c.logo_key) if c.logo_key else None,
            product_names=[p.name for p in products[c.id][:3]],
            product_count=len(products[c.id]),
            hs_codes=list(dict.fromkeys(p.hs_code for p in products[c.id])),
        )
        for c in companies
    ]
    return ExporterPage(items=items, total=total, page=page, page_size=page_size)


async def get_product_names(
    session: AsyncSession, product_ids: list[uuid.UUID]
) -> dict[uuid.UUID, str]:
    """Tên sản phẩm theo id (cho RFQ đã gửi: hiển thị kể cả khi sản phẩm sau đó bị tắt)."""
    if not product_ids:
        return {}
    rows = await session.execute(
        select(Product.id, Product.name).where(Product.id.in_(product_ids))
    )
    return {row.id: row.name for row in rows}


async def resolve_visible_company(
    session: AsyncSession, slug: str, now: datetime
) -> uuid.UUID | None:
    """Id của công ty đang hiển thị công khai theo slug (cùng điều kiện với danh bạ) hoặc None."""
    found: uuid.UUID | None = await session.scalar(
        select(Company.id).where(Company.slug == slug, *verified_exporter_conditions(now))
    )
    return found


def _ref(company: Company) -> PublicCompanyRef:
    return PublicCompanyRef(
        id=company.id,
        slug=company.slug,
        legal_name=company.legal_name,
        country=company.country,
        verified_at=company.verified_at,
    )


async def get_visible_refs(
    session: AsyncSession, company_ids: list[uuid.UUID], now: datetime
) -> dict[uuid.UUID, PublicCompanyRef]:
    """Chỉ những công ty còn hiển thị công khai; công ty bị ẩn/hết hạn/xóa thì vắng mặt."""
    if not company_ids:
        return {}
    rows = await session.scalars(
        select(Company).where(Company.id.in_(company_ids), *verified_exporter_conditions(now))
    )
    return {c.id: _ref(c) for c in rows}


async def list_recently_verified(
    session: AsyncSession,
    *,
    industries: list[str],
    since: datetime,
    now: datetime,
    limit: int = 5,
) -> list[PublicCompanyRef]:
    """Công ty xác minh từ `since` thuộc các nhóm hàng (industry_sector) đã cho, mới nhất trước."""
    if not industries:
        return []
    rows = await session.scalars(
        select(Company)
        .where(
            Company.industry_sector.in_(industries),
            Company.verified_at >= since,
            *verified_exporter_conditions(now),
        )
        .order_by(Company.verified_at.desc(), Company.id)
        .limit(limit)
    )
    return [_ref(c) for c in rows]


async def find_buyers_for_new_supplier(
    session: AsyncSession, company_id: uuid.UUID, now: datetime
) -> tuple[PublicCompanyRef, list[uuid.UUID]] | None:
    """Exporter còn hiển thị công khai (cùng điều kiện với danh bạ) và `owner_user_id` của các
    buyer có nhóm hàng quan tâm trùng ngành của nó. None nếu công ty không hiển thị hoặc chưa
    khai ngành."""
    company = await session.scalar(
        select(Company).where(Company.id == company_id, *verified_exporter_conditions(now))
    )
    if company is None or company.industry_sector is None:
        return None
    owners = await session.scalars(
        select(Company.owner_user_id)
        .join(CompanySourcingCategory, CompanySourcingCategory.company_id == Company.id)
        .where(
            Company.type == CompanyType.buyer,
            Company.is_hidden.is_(False),
            CompanySourcingCategory.category == company.industry_sector,
        )
        .order_by(Company.id)
    )
    return _ref(company), list(owners)


async def get_orderable_product(
    session: AsyncSession, product_id: uuid.UUID, now: datetime
) -> OrderableProduct | None:
    """Sản phẩm công khai của exporter đã xác minh (cùng điều kiện với danh bạ) hoặc None.
    Buyer không gửi RFQ được cho sản phẩm ẩn, bị tắt, chưa duyệt hay của công ty không hiển thị."""
    row = (
        await session.execute(
            select(Product.id, Product.name, Product.company_id, Product.unit)
            .join(Company, Company.id == Product.company_id)
            .where(
                Product.id == product_id,
                *_public_product_conditions(),
                *verified_exporter_conditions(now),
            )
        )
    ).one_or_none()
    if row is None:
        return None
    return OrderableProduct(id=row.id, name=row.name, company_id=row.company_id, unit=row.unit)


async def get_public_profile(
    session: AsyncSession, storage: Storage, slug: str
) -> PublicCompanyOut:
    """Chỉ exporter đã xác minh, chưa bị ẩn, chưa hết hạn; chỉ sản phẩm đang bật và đã duyệt."""
    company = await session.scalar(
        select(Company).where(
            Company.slug == slug, *verified_exporter_conditions(datetime.now(UTC))
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
                **full.model_dump(exclude={"is_active", "approval_status", "images", "created_at"}),
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


# ── Admin kiểm duyệt (I4): mỗi thao tác ghi audit before/after ─────────────────────────────
_ADMIN_TEXT_FIELDS = ("name", "description_vi", "description_en", "is_active")


async def _to_admin_out(session: AsyncSession, product: Product) -> AdminProductOut:
    company = await session.get_one(Company, product.company_id)
    category = (await categories_for_codes(session, [product.hs_code])).get(product.hs_code)
    # Chỉ so khi cả hai đều rõ ràng; ngành "Khác" hoặc mã HS chưa có nhóm hàng thì không gắn cờ.
    mismatch = bool(
        category
        and company.industry_sector
        and company.industry_sector != "other"
        and category != company.industry_sector
    )
    return AdminProductOut(
        id=product.id,
        company_id=product.company_id,
        company_name=company.legal_name,
        name=product.name,
        hs_code=product.hs_code,
        description_vi=product.description_vi,
        description_en=product.description_en,
        is_active=product.is_active,
        approval_status=product.approval_status.value,
        created_at=product.created_at,
        industry_mismatch=mismatch,
    )


async def admin_list_products(
    session: AsyncSession,
    *,
    company_id: uuid.UUID | None,
    q: str | None,
    limit: int,
    offset: int,
    recent_days: int | None = None,
) -> list[AdminProductOut]:
    """recent_days: chỉ sản phẩm đăng trong N ngày (U3 hậu kiểm sản phẩm mới), mới nhất trước."""
    query = select(Product)
    if company_id is not None:
        query = query.where(Product.company_id == company_id)
    if q:
        query = query.where(Product.name.ilike(f"%{q.strip()}%"))
    if recent_days is not None:
        since = datetime.now(UTC) - timedelta(days=recent_days)
        query = query.where(Product.created_at >= since).order_by(
            Product.created_at.desc(), Product.id
        )
    else:
        query = query.order_by(Product.created_at, Product.id)
    rows = await session.scalars(query.limit(limit).offset(offset))
    return [await _to_admin_out(session, p) for p in rows]


async def admin_update_product(
    session: AsyncSession, actor: CurrentUser, product_id: uuid.UUID, patch: AdminProductPatch
) -> AdminProductOut:
    product = await session.get(Product, product_id)
    if product is None:
        raise AppError("product_not_found", "Product not found", 404)
    fields = patch.model_fields_set
    for required in ("name", "is_active", "approval_status"):
        if required in fields and getattr(patch, required) is None:
            raise AppError("invalid_field", f"{required} cannot be null", 422)

    before: dict[str, Any] = {}
    after: dict[str, Any] = {}
    for name in _ADMIN_TEXT_FIELDS:
        if name in fields and getattr(patch, name) != getattr(product, name):
            before[name], after[name] = getattr(product, name), getattr(patch, name)
    status_change = (
        "approval_status" in fields and patch.approval_status != product.approval_status.value
    )
    status_before = product.approval_status.value

    for name, value in after.items():
        setattr(product, name, value)
    if status_change and patch.approval_status is not None:
        product.approval_status = ApprovalStatus(patch.approval_status)
    if before:
        await record(
            session,
            actor_id=actor.id,
            action_type="product.update",
            entity_type="product",
            entity_id=str(product.id),
            before=before,
            after=after,
        )
    if status_change:
        await record(
            session,
            actor_id=actor.id,
            action_type="product.hide" if patch.approval_status == "hidden" else "product.unhide",
            entity_type="product",
            entity_id=str(product.id),
            before={"approval_status": status_before},
            after={"approval_status": patch.approval_status},
        )
    company = await session.get_one(Company, product.company_id)
    await completeness_service.refresh_score(session, company)
    await session.commit()
    await session.refresh(product)
    return await _to_admin_out(session, product)
