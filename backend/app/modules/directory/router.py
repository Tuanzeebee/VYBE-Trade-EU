from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.storage import Storage, get_storage
from app.modules.directory import service
from app.modules.directory.schemas import FilterOptions, SupplierPage
from app.modules.directory.service import SupplierFilters

router = APIRouter(tags=["directory"])

DB = Annotated[AsyncSession, Depends(get_session)]
Store = Annotated[Storage, Depends(get_storage)]


# Công khai, không cần phiên. Rate limit áp ở J1 cho toàn bộ /api/public/*.
@router.get("/api/public/suppliers")
async def search_suppliers(
    session: DB,
    storage: Store,
    q: Annotated[str, Query(max_length=100)] = "",
    hs: Annotated[str | None, Query(pattern=r"^[0-9. ]{2,12}$")] = None,
    country: Annotated[str | None, Query(pattern=r"^[A-Za-z]{2}$")] = None,
    category: Annotated[str | None, Query(max_length=32)] = None,
    cert: Annotated[str | None, Query(max_length=64)] = None,
    page: Annotated[int, Query(ge=1, le=1000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 12,
) -> SupplierPage:
    return await service.search_verified(
        session,
        storage,
        SupplierFilters(
            q=q,
            hs=hs,
            country=country,
            category=category,
            cert=cert,
            page=page,
            page_size=page_size,
        ),
    )


@router.get("/api/public/suppliers/filters")
async def supplier_filters(session: DB) -> FilterOptions:
    return await service.filter_options(session)
