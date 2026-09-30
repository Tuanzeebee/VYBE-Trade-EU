from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.spreadsheet import read_upload
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import require_role
from app.modules.markets import recommendation, service
from app.modules.markets.schemas import (
    MarketRecommendationOut,
    PriceReferenceOut,
    PriorityProductOut,
    TradeImportBatchOut,
    TradeImportIn,
)

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


# ── Công khai: gợi ý thị trường (U16). Rate limit áp cho toàn bộ /api/public/*. ─────────────
@router.get("/api/public/markets/recommendation")
async def market_recommendation(
    session: DB,
    q: Annotated[str, Query(max_length=100)] = "",
    hs: Annotated[str | None, Query(pattern=r"^[0-9]{4,8}$")] = None,
) -> MarketRecommendationOut:
    return await recommendation.market_recommendation(session, q, hs)


@router.get("/api/public/markets/price-reference")
async def price_reference(
    session: DB, hs: Annotated[str, Query(pattern=r"^[0-9]{6,8}$")]
) -> PriceReferenceOut:
    """U17: đơn giá nhập khẩu EU tham khảo cho form sản phẩm (không phải giá sàn)."""
    return await recommendation.price_reference(session, hs)
