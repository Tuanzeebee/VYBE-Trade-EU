import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.storage import Storage, get_storage
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import require_role
from app.modules.companies import product_service, service
from app.modules.companies.schemas import (
    CompanyIn,
    CompanyOut,
    CompanyPatch,
    PresignIn,
    PresignOut,
    ProductIn,
    ProductOut,
    ProductPatch,
    PublicCompanyOut,
)

router = APIRouter(tags=["companies"])
DB = Annotated[AsyncSession, Depends(get_session)]
Owner = Annotated[CurrentUser, Depends(require_role("exporter", "buyer"))]
Exporter = Annotated[CurrentUser, Depends(require_role("exporter"))]
Store = Annotated[Storage, Depends(get_storage)]


@router.get("/api/me/company")
async def get_my_company(user: Owner, session: DB) -> CompanyOut:
    return await service.get_my_company(session, user)


@router.post("/api/me/company", status_code=status.HTTP_201_CREATED)
async def create_my_company(data: CompanyIn, user: Owner, session: DB) -> CompanyOut:
    return await service.create_company(session, user, data)


@router.patch("/api/me/company")
async def update_my_company(data: CompanyPatch, user: Owner, session: DB) -> CompanyOut:
    return await service.update_company(session, user, data)


@router.post("/api/uploads/presign")
async def presign_upload(
    data: PresignIn,
    user: Owner,
    session: DB,
    storage: Annotated[Storage, Depends(get_storage)],
) -> PresignOut:
    return await service.presign_upload(session, user, storage, data)


@router.get("/api/exporter/products")
async def list_products(user: Exporter, session: DB, storage: Store) -> list[ProductOut]:
    return await product_service.list_products(session, user, storage)


@router.post("/api/exporter/products", status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductIn, user: Exporter, session: DB, storage: Store
) -> ProductOut:
    return await product_service.create_product(session, user, storage, data)


@router.get("/api/exporter/products/{product_id}")
async def get_product(
    product_id: uuid.UUID, user: Exporter, session: DB, storage: Store
) -> ProductOut:
    return await product_service.get_product(session, user, storage, product_id)


@router.patch("/api/exporter/products/{product_id}")
async def update_product(
    product_id: uuid.UUID, data: ProductPatch, user: Exporter, session: DB, storage: Store
) -> ProductOut:
    return await product_service.update_product(session, user, storage, product_id, data)


@router.delete(
    "/api/exporter/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_product(product_id: uuid.UUID, user: Exporter, session: DB) -> Response:
    await product_service.delete_product(session, user, product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Công khai (khách xem hồ sơ nhà xuất khẩu). Rate limit áp ở J1 cho toàn bộ /api/public/*.
@router.get("/api/public/companies/{slug}")
async def public_company(slug: str, session: DB, storage: Store) -> PublicCompanyOut:
    return await product_service.get_public_profile(session, storage, slug)
