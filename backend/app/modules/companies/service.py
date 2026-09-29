"""API công khai của module companies. Module khác chỉ gọi các hàm ở đây và dùng schemas."""

import re
import unicodedata
import uuid
from typing import Any

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.events import publish
from app.core.storage import Storage
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import completeness_service
from app.modules.companies.completeness import BUSINESS_MODELS
from app.modules.companies.events import CompanyUpdated
from app.modules.companies.models import (
    Company,
    CompanyExportMarket,
    CompanyLanguage,
    CompanySourcingCategory,
    CompanyType,
)
from app.modules.companies.schemas import (
    CompanyFilters,
    CompanyIn,
    CompanyOut,
    CompanyPatch,
    CompletenessOut,
    MissingOut,
    PresignIn,
    PresignOut,
)

_EXTENSIONS = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
_ALLOWED_ROLES = {"exporter": CompanyType.exporter, "buyer": CompanyType.buyer}
# Trường chỉ một loại công ty được đặt; loại kia gửi giá trị thật → 422.
_ONLY_EXPORTER = ("export_markets", "languages_spoken")
_ONLY_BUYER = (
    "company_size",
    "procurement_estimate",
    "vat_number",
    "eori_number",
    "sourcing_categories",
)


def slugify(name: str) -> str:
    text = unicodedata.normalize("NFKD", name.replace("đ", "d").replace("Đ", "D"))
    text = "".join(ch for ch in text if not unicodedata.combining(ch)).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:100].strip("-")
    return slug or "company"


async def _unique_slug(session: AsyncSession, name: str) -> str:
    base = slugify(name)
    slug, n = base, 1
    while await session.scalar(select(Company.id).where(Company.slug == slug)):
        n += 1
        slug = f"{base}-{n}"
    return slug


def _to_out(company: Company) -> CompanyOut:
    return CompanyOut.model_validate(
        {
            **{c.name: getattr(company, c.name) for c in Company.__table__.columns},
            "type": company.type.value,
            "verification_status": company.verification_status.value,
            "verification_level": company.verification_level.value,
            "export_markets": [m.market for m in company.export_markets],
            "languages_spoken": [lang.lang for lang in company.languages],
            "sourcing_categories": [c.category for c in company.sourcing_categories],
        }
    )


def _company_type(user: CurrentUser) -> CompanyType:
    company_type = _ALLOWED_ROLES.get(user.role)
    if company_type is None:
        raise AppError("forbidden", "Not allowed for this role", 403)
    return company_type


async def _own_company(session: AsyncSession, user: CurrentUser) -> Company:
    _company_type(user)
    company = await session.scalar(select(Company).where(Company.owner_user_id == user.id))
    if company is None:
        raise AppError("company_not_found", "Company profile not created yet", 404)
    return company


def _reject_foreign_fields(company_type: CompanyType, values: dict[str, Any]) -> None:
    foreign = _ONLY_BUYER if company_type is CompanyType.exporter else _ONLY_EXPORTER
    for field in foreign:
        if values.get(field):
            raise AppError(
                "field_not_allowed", f"{field} is not allowed for {company_type.value}", 422
            )
    # Exporter: mô hình kinh doanh là giá trị cố định (buyer để nhập tự do như trước).
    model = values.get("business_type")
    if company_type is CompanyType.exporter and model is not None and model not in BUSINESS_MODELS:
        raise AppError(
            "invalid_business_type", f"business_type must be one of {BUSINESS_MODELS}", 422
        )


def _set_lists(company: Company, values: dict[str, Any]) -> None:
    """Lấy các trường danh sách ra khỏi values và gán vào bảng N-N tương ứng."""
    if (markets := values.pop("export_markets", None)) is not None:
        company.export_markets = [CompanyExportMarket(market=m) for m in markets]
    if (langs := values.pop("languages_spoken", None)) is not None:
        company.languages = [CompanyLanguage(lang=lang) for lang in langs]
    if (cats := values.pop("sourcing_categories", None)) is not None:
        company.sourcing_categories = [CompanySourcingCategory(category=c) for c in cats]


async def _save(session: AsyncSession, company: Company) -> CompanyOut:
    await session.flush()
    await completeness_service.refresh_score(session, company)  # cùng transaction với thay đổi
    await session.commit()
    await session.refresh(company)
    await publish(CompanyUpdated(company_id=company.id))
    return _to_out(company)


async def get_my_company(session: AsyncSession, user: CurrentUser) -> CompanyOut:
    return _to_out(await _own_company(session, user))


async def get_completeness(session: AsyncSession, user: CurrentUser) -> CompletenessOut:
    """Điểm hoàn thiện và danh sách còn thiếu (tính mới theo bảng trọng số hiện hành)."""
    company = await _own_company(session, user)
    result = await completeness_service.compute_for(session, company)
    return CompletenessOut(
        score=result.score,
        missing=[
            MissingOut(field=m.field_key, group=m.group_key, weight=m.weight)
            for m in result.missing
        ],
    )


async def create_company(session: AsyncSession, user: CurrentUser, data: CompanyIn) -> CompanyOut:
    company_type = _company_type(user)
    if await session.scalar(select(Company.id).where(Company.owner_user_id == user.id)):
        raise AppError("company_exists", "Company profile already exists", 409)
    values: dict[str, Any] = data.model_dump()
    _reject_foreign_fields(company_type, values)
    lists = {
        key: values.pop(key)
        for key in ("export_markets", "languages_spoken", "sourcing_categories")
    }
    company = Company(
        owner_user_id=user.id,
        type=company_type,
        slug=await _unique_slug(session, data.legal_name),
        **values,
    )
    _set_lists(company, lists)
    session.add(company)
    return await _save(session, company)


async def update_company(
    session: AsyncSession, user: CurrentUser, data: CompanyPatch
) -> CompanyOut:
    company = await _own_company(session, user)
    changes = data.model_dump(exclude_unset=True)
    _reject_foreign_fields(company.type, changes)
    logo_key = changes.get("logo_key")
    if logo_key is not None and not logo_key.startswith(f"logos/{company.id}/"):
        raise AppError("invalid_logo_key", "Logo does not belong to this company", 422)
    for field in ("legal_name", "country"):
        if field in changes and changes[field] is None:
            raise AppError("invalid_field", f"{field} cannot be empty", 422)
    _set_lists(company, changes)
    for field, value in changes.items():
        setattr(company, field, value)
    return await _save(session, company)


def _filtered(filters: CompanyFilters) -> Select[Company]:
    query = select(Company)
    if filters.country:
        query = query.where(Company.country == filters.country)
    if filters.industry:
        query = query.where(Company.industry_sector == filters.industry)
    if filters.market:
        query = query.where(
            Company.id.in_(
                select(CompanyExportMarket.company_id).where(
                    CompanyExportMarket.market == filters.market
                )
            )
        )
    if filters.language:
        query = query.where(
            Company.id.in_(
                select(CompanyLanguage.company_id).where(CompanyLanguage.lang == filters.language)
            )
        )
    if filters.sourcing:
        query = query.where(
            Company.id.in_(
                select(CompanySourcingCategory.company_id).where(
                    CompanySourcingCategory.category == filters.sourcing
                )
            )
        )
    return query.order_by(Company.legal_name)


async def list_companies(session: AsyncSession, filters: CompanyFilters) -> list[CompanyOut]:
    """Lọc theo trường có cấu trúc. Chưa lọc theo trạng thái xác minh — danh bạ công khai (E1)
    phải tự thêm điều kiện chỉ lấy công ty đã xác minh."""
    companies = (await session.scalars(_filtered(filters))).all()
    return [_to_out(c) for c in companies]


async def presign_upload(
    session: AsyncSession, user: CurrentUser, storage: Storage, data: PresignIn
) -> PresignOut:
    """URL tải lên có hạn ngắn; khóa file luôn nằm dưới thư mục của công ty mình."""
    if data.purpose == "product_image" and user.role != "exporter":
        raise AppError("forbidden", "Not allowed for this role", 403)
    company = await _own_company(session, user)
    folder = "products" if data.purpose == "product_image" else "logos"
    key = f"{folder}/{company.id}/{uuid.uuid4().hex}.{_EXTENSIONS[data.content_type]}"
    return PresignOut(upload_url=await storage.presign_put(key, data.content_type), key=key)
