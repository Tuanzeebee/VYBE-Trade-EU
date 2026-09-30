from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.spreadsheet import read_upload
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import require_role
from app.modules.markets import service
from app.modules.markets.schemas import PriorityProductOut, TradeImportBatchOut, TradeImportIn

router = APIRouter(tags=["markets"])
DB = Annotated[AsyncSession, Depends(get_session)]
Admin = Annotated[CurrentUser, Depends(require_role("admin"))]


# ── Admin: nạp thống kê thương mại (U15) ────────────────────────────────────
@router.get("/api/admin/trade-imports")
async def list_trade_imports(_: Admin, session: DB) -> list[TradeImportBatchOut]:
    return await service.list_batches(session)


@router.get("/api/admin/trade-imports/priority-products")
async def priority_products(_: Admin) -> list[PriorityProductOut]:
    return service.load_priority_products()


@router.post("/api/admin/trade-imports", status_code=202)
async def create_trade_import(
    data: TradeImportIn, admin: Admin, session: DB
) -> TradeImportBatchOut:
    return await service.create_import(session, admin, data)


@router.post("/api/admin/trade-imports/file", status_code=201)
async def upload_trade_file(
    file: UploadFile,
    admin: Admin,
    session: DB,
    source: Annotated[Literal["eurostat_comext", "curated"], Query()] = "curated",
) -> TradeImportBatchOut:
    return await service.import_file(session, admin, await read_upload(file), source)
