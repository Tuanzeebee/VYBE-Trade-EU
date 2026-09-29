from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.modules.catalog import service
from app.modules.catalog.schemas import HsCodeOut

router = APIRouter(tags=["catalog"])


# Công khai (guest dùng máy tính). Rate limit áp ở J1 cho toàn bộ /api/public/*.
@router.get("/api/public/hs-codes")
async def search_hs_codes(
    session: Annotated[AsyncSession, Depends(get_session)],
    q: Annotated[str, Query(max_length=100)] = "",
) -> list[HsCodeOut]:
    return await service.search_hs_codes(session, q)
