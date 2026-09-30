import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.storage import Storage, get_storage
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import require_role
from app.modules.companies import offering_service, product_service, service
from app.modules.companies.schemas import (
    CatalogItemOut,
    CompanyIn,
    CompanyOut,
    CompanyPatch,
    CompletenessOut,
    PresignIn,
    PresignOut,
    ProductIn,
    ProductOut,
    ProductPatch,
    PublicCompanyOut,
    ServiceOfferingIn,
    ServiceOfferingOut,
    ServiceOfferingPatch,
    SourcingNeedsIn,
    SourcingNeedsOut,
)

router = APIRouter(tags=["companies"])
DB = Annotated[AsyncSession, Depends(get_session)]
Owner = Annotated[CurrentUser, Depends(require_role("exporter", "buyer"))]
Exporter = Annotated[CurrentUser, Depends(require_role("exporter"))]
Buyer = Annotated[CurrentUser, Depends(require_role("buyer"))]
Store = Annotated[Storage, Depends(get_storage)]


@router.get("/api/me/company")
async def get_my_company(user: Owner, session: DB) -> CompanyOut:
    return await service.get_my_company(session, user)


@router.get("/api/me/company/completeness")
async def get_my_completeness(user: Owner, session: DB) -> CompletenessOut:
    return await service.get_completeness(session, user)


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


@router.get("/api/buyer/sourcing-needs")
async def get_sourcing_needs(user: Buyer, session: DB) -> SourcingNeedsOut:
    return await service.get_sourcing_needs(session, user)


@router.put("/api/buyer/sourcing-needs")
async def put_sourcing_needs(data: SourcingNeedsIn, user: Buyer, session: DB) -> SourcingNeedsOut:
    return await service.put_sourcing_needs(session, user, data)


@router.get("/api/exporter/services")
async def list_services(user: Exporter, session: DB) -> list[ServiceOfferingOut]:
    return await offering_service.list_my_services(session, user)


@router.post("/api/exporter/services", status_code=status.HTTP_201_CREATED)
async def create_service(
    data: ServiceOfferingIn, user: Exporter, session: DB
) -> ServiceOfferingOut:
    return await offering_service.create_service(session, user, data)


@router.patch("/api/exporter/services/{service_id}")
async def update_service(
    service_id: uuid.UUID, data: ServiceOfferingPatch, user: Exporter, session: DB
) -> ServiceOfferingOut:
    return await offering_service.update_service(session, user, service_id, data)


@router.delete(
    "/api/exporter/services/{service_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_service(service_id: uuid.UUID, user: Exporter, session: DB) -> Response:
    await offering_service.delete_service(session, user, service_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Công khai (khách xem hồ sơ nhà xuất khẩu). Rate limit áp ở J1 cho toàn bộ /api/public/*.
@router.get("/api/public/companies/{slug}")
async def public_company(slug: str, session: DB, storage: Store) -> PublicCompanyOut:
    return await product_service.get_public_profile(session, storage, slug)


@router.get("/api/public/industries")
async def industries(session: DB) -> list[CatalogItemOut]:
    return await offering_service.list_industries(session)


@router.get("/api/public/service-categories")
async def service_categories(session: DB) -> list[CatalogItemOut]:
    return await offering_service.list_service_categories(session)
