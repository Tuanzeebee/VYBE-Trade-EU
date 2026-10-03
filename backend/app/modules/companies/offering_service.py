"""Dịch vụ của nhà cung cấp dịch vụ (U2) và danh mục ngành hàng / loại dịch vụ.

Nhà cung cấp dịch vụ (logistics, hải quan, kế toán-thuế…) là seller có offering_type = services hoặc
both. Một phần API công khai của module companies: module khác chỉ gọi các hàm ở đây.
"""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import completeness_service
from app.modules.companies.models import (
    Company,
    CompanyServiceOffering,
    CompanyType,
    IndustryCategory,
    ServiceCategory,
)
from app.modules.companies.schemas import (
    CatalogItemOut,
    ServiceOfferingIn,
    ServiceOfferingOut,
    ServiceOfferingPatch,
)
from app.modules.companies.service import _own_company

_NOT_NULL = ("category_code", "title", "coverage_countries", "is_active")


async def list_industries(session: AsyncSession) -> list[CatalogItemOut]:
    rows = await session.scalars(
        select(IndustryCategory)
        .where(IndustryCategory.is_active.is_(True))
        .order_by(IndustryCategory.sort_order, IndustryCategory.code)
    )
    return [CatalogItemOut(code=r.code, name_vi=r.name_vi, name_en=r.name_en) for r in rows]


async def list_service_categories(session: AsyncSession) -> list[CatalogItemOut]:
    rows = await session.scalars(
        select(ServiceCategory)
        .where(ServiceCategory.is_active.is_(True))
        .order_by(ServiceCategory.sort_order, ServiceCategory.code)
    )
    return [CatalogItemOut(code=r.code, name_vi=r.name_vi, name_en=r.name_en) for r in rows]


async def _category(session: AsyncSession, code: str) -> ServiceCategory:
    category = await session.get(ServiceCategory, code)
    if category is None or not category.is_active:
        raise AppError("invalid_service_category", "Unknown service category", 422)
    return category


async def _owned_seller(session: AsyncSession, user: CurrentUser) -> Company:
    """Lớp kiểm thứ hai (lớp một là require_role ở router): chỉ seller có dịch vụ."""
    if user.role != "exporter":
        raise AppError("forbidden", "Not allowed for this role", 403)
    company = await _own_company(session, user)
    if company.type is not CompanyType.exporter:
        raise AppError("forbidden", "Not allowed for this role", 403)
    return company


async def _to_out(session: AsyncSession, offering: CompanyServiceOffering) -> ServiceOfferingOut:
    category = await session.get(ServiceCategory, offering.category_code)
    return ServiceOfferingOut(
        id=offering.id,
        category_code=offering.category_code,
        category_name_vi=category.name_vi if category else offering.category_code,
        category_name_en=category.name_en if category else offering.category_code,
        title=offering.title,
        description_vi=offering.description_vi,
        description_en=offering.description_en,
        coverage_countries=list(offering.coverage_countries),
        is_active=offering.is_active,
        created_at=offering.created_at,
    )


async def _owned_offering(
    session: AsyncSession, company: Company, offering_id: uuid.UUID
) -> CompanyServiceOffering:
    offering = await session.get(CompanyServiceOffering, offering_id)
    # Dịch vụ của công ty khác trả 404, không để lộ là có tồn tại (IDOR).
    if offering is None or offering.company_id != company.id:
        raise AppError("service_not_found", "Service not found", 404)
    return offering


async def _commit(session: AsyncSession, company: Company) -> None:
    await session.flush()
    await completeness_service.refresh_score(session, company)
    await session.commit()


async def list_my_services(session: AsyncSession, user: CurrentUser) -> list[ServiceOfferingOut]:
    company = await _owned_seller(session, user)
    rows = await session.scalars(
        select(CompanyServiceOffering)
        .where(CompanyServiceOffering.company_id == company.id)
        .order_by(CompanyServiceOffering.created_at, CompanyServiceOffering.id)
    )
    return [await _to_out(session, r) for r in rows]


async def create_service(
    session: AsyncSession, user: CurrentUser, data: ServiceOfferingIn
) -> ServiceOfferingOut:
    company = await _owned_seller(session, user)
    await _category(session, data.category_code)
    offering = CompanyServiceOffering(company_id=company.id, **data.model_dump())
    session.add(offering)
    await _commit(session, company)
    await session.refresh(offering)
    return await _to_out(session, offering)


async def update_service(
    session: AsyncSession, user: CurrentUser, offering_id: uuid.UUID, data: ServiceOfferingPatch
) -> ServiceOfferingOut:
    company = await _owned_seller(session, user)
    offering = await _owned_offering(session, company, offering_id)
    changes: dict[str, Any] = data.model_dump(exclude_unset=True)
    for field in _NOT_NULL:
        if field in changes and changes[field] is None:
            raise AppError("invalid_field", f"{field} cannot be empty", 422)
    if "category_code" in changes:
        await _category(session, changes["category_code"])
    for field, value in changes.items():
        setattr(offering, field, value)
    await _commit(session, company)
    await session.refresh(offering)
    return await _to_out(session, offering)


async def delete_service(session: AsyncSession, user: CurrentUser, offering_id: uuid.UUID) -> None:
    company = await _owned_seller(session, user)
    offering = await _owned_offering(session, company, offering_id)
    await session.delete(offering)
    await _commit(session, company)


async def list_public_services(
    session: AsyncSession, company_id: uuid.UUID
) -> list[ServiceOfferingOut]:
    """Dịch vụ đang bật của một công ty — hồ sơ công khai tự kiểm công ty đã xác minh (§6.10)."""
    rows = await session.scalars(
        select(CompanyServiceOffering)
        .where(
            CompanyServiceOffering.company_id == company_id,
            CompanyServiceOffering.is_active.is_(True),
        )
        .order_by(CompanyServiceOffering.created_at, CompanyServiceOffering.id)
    )
    return [await _to_out(session, r) for r in rows]
