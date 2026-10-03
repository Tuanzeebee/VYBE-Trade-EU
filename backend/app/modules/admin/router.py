import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import list_audit_logs
from app.core.db import get_session
from app.modules.admin import service
from app.modules.admin.schemas import AuditLogOut, StatsOut
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import require_role
from app.modules.companies import product_service
from app.modules.companies import service as companies
from app.modules.companies.schemas import (
    AdminCompanyOut,
    AdminCompanyPatch,
    AdminProductOut,
    AdminProductPatch,
)

router = APIRouter(tags=["admin"])

Admin = Annotated[CurrentUser, Depends(require_role("admin"))]
DB = Annotated[AsyncSession, Depends(get_session)]
Limit = Annotated[int, Query(ge=1, le=100)]
Offset = Annotated[int, Query(ge=0)]


@router.get("/api/admin/companies")
async def list_companies(
    _: Admin,
    session: DB,
    q: Annotated[str | None, Query(max_length=100)] = None,
    status: Literal["unverified", "pending", "verified", "rejected"] | None = None,
    hidden: bool | None = None,
    limit: Limit = 50,
    offset: Offset = 0,
) -> list[AdminCompanyOut]:
    return await companies.admin_list_companies(
        session, q=q, status=status, hidden=hidden, limit=limit, offset=offset
    )


@router.patch("/api/admin/companies/{company_id}")
async def update_company(
    company_id: uuid.UUID, data: AdminCompanyPatch, admin: Admin, session: DB
) -> AdminCompanyOut:
    return await companies.admin_update_company(session, admin, company_id, data)


@router.get("/api/admin/products")
async def list_products(
    _: Admin,
    session: DB,
    company_id: uuid.UUID | None = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    limit: Limit = 50,
    offset: Offset = 0,
    recent_days: Annotated[int | None, Query(ge=1, le=90)] = None,
) -> list[AdminProductOut]:
    return await product_service.admin_list_products(
        session, company_id=company_id, q=q, limit=limit, offset=offset, recent_days=recent_days
    )


@router.patch("/api/admin/products/{product_id}")
async def update_product(
    product_id: uuid.UUID, data: AdminProductPatch, admin: Admin, session: DB
) -> AdminProductOut:
    return await product_service.admin_update_product(session, admin, product_id, data)


@router.get("/api/admin/audit-logs")
async def audit_logs(
    _: Admin,
    session: DB,
    entity_type: Annotated[str | None, Query(max_length=64)] = None,
    entity_id: Annotated[str | None, Query(max_length=64)] = None,
    action_type: Annotated[str | None, Query(max_length=64)] = None,
    limit: Limit = 50,
    offset: Offset = 0,
) -> list[AuditLogOut]:
    rows = await list_audit_logs(
        session,
        entity_type=entity_type,
        entity_id=entity_id,
        action_type=action_type,
        limit=limit,
        offset=offset,
    )
    return [AuditLogOut.model_validate(r) for r in rows]


@router.get("/api/admin/stats")
async def stats(_: Admin, session: DB) -> StatsOut:
    return await service.stats(session)
