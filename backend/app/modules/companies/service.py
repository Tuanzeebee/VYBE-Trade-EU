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
from app.modules.companies.events import CompanyUpdated
from app.modules.companies.models import (
    Company,
    CompanyExportMarket,
    CompanyLanguage,
    CompanyType,
)
from app.modules.companies.schemas import (
    CompanyFilters,
    CompanyIn,
    CompanyOut,
    CompanyPatch,
    PresignIn,
    PresignOut,
)

_EXTENSIONS = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
# B1 chỉ mở cho exporter; B2 thêm buyer.
_ALLOWED_ROLES = {"exporter": CompanyType.exporter}


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


def _set_lists(company: Company, markets: list[str] | None, langs: list[str] | None) -> None:
    if markets is not None:
        company.export_markets = [CompanyExportMarket(market=m) for m in markets]
    if langs is not None:
        company.languages = [CompanyLanguage(lang=lang) for lang in langs]


async def _save(session: AsyncSession, company: Company) -> CompanyOut:
    await session.commit()
    await session.refresh(company)
    await publish(CompanyUpdated(company_id=company.id))
    return _to_out(company)


async def get_my_company(session: AsyncSession, user: CurrentUser) -> CompanyOut:
    return _to_out(await _own_company(session, user))


async def create_company(session: AsyncSession, user: CurrentUser, data: CompanyIn) -> CompanyOut:
    company_type = _company_type(user)
    if await session.scalar(select(Company.id).where(Company.owner_user_id == user.id)):
        raise AppError("company_exists", "Company profile already exists", 409)
    fields: dict[str, Any] = data.model_dump(exclude={"export_markets", "languages_spoken"})
    company = Company(
        owner_user_id=user.id,
        type=company_type,
        slug=await _unique_slug(session, data.legal_name),
        **fields,
    )
    _set_lists(company, data.export_markets, data.languages_spoken)
    session.add(company)
    return await _save(session, company)


async def update_company(
    session: AsyncSession, user: CurrentUser, data: CompanyPatch
) -> CompanyOut:
    company = await _own_company(session, user)
    changes = data.model_dump(exclude_unset=True)
    logo_key = changes.get("logo_key")
    if logo_key is not None and not logo_key.startswith(f"logos/{company.id}/"):
        raise AppError("invalid_logo_key", "Logo does not belong to this company", 422)
    for field in ("legal_name", "country"):
        if field in changes and changes[field] is None:
            raise AppError("invalid_field", f"{field} cannot be empty", 422)
    _set_lists(company, changes.pop("export_markets", None), changes.pop("languages_spoken", None))
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
    return query.order_by(Company.legal_name)


async def list_companies(session: AsyncSession, filters: CompanyFilters) -> list[CompanyOut]:
    """Lọc theo trường có cấu trúc. Chưa lọc theo trạng thái xác minh — danh bạ công khai (E1)
    phải tự thêm điều kiện chỉ lấy công ty đã xác minh."""
    companies = (await session.scalars(_filtered(filters))).all()
    return [_to_out(c) for c in companies]


async def presign_logo(
    session: AsyncSession, user: CurrentUser, storage: Storage, data: PresignIn
) -> PresignOut:
    company = await _own_company(session, user)
    key = f"logos/{company.id}/{uuid.uuid4().hex}.{_EXTENSIONS[data.content_type]}"
    return PresignOut(upload_url=await storage.presign_put(key, data.content_type), key=key)
