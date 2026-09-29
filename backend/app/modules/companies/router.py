from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.storage import Storage, get_storage
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import require_role
from app.modules.companies import service
from app.modules.companies.schemas import (
    CompanyIn,
    CompanyOut,
    CompanyPatch,
    PresignIn,
    PresignOut,
)

router = APIRouter(tags=["companies"])
DB = Annotated[AsyncSession, Depends(get_session)]
Owner = Annotated[CurrentUser, Depends(require_role("exporter", "buyer"))]


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
    return await service.presign_logo(session, user, storage, data)
