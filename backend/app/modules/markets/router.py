import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.spreadsheet import read_upload
from app.core.storage import Storage, get_storage
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import require_role
from app.modules.markets import recommendation, report_service, service
from app.modules.markets.schemas import (
    AdminConsultingLeadOut,
    ConsultingLeadIn,
    ConsultingLeadOut,
    ConsultingLeadPatch,
    MarketRecommendationOut,
    PriceReferenceOut,
    PriorityProductOut,
    ReportIn,
    ReportListItemOut,
    ReportOut,
    TradeImportBatchOut,
    TradeImportIn,
)

router = APIRouter(tags=["markets"])
DB = Annotated[AsyncSession, Depends(get_session)]
Admin = Annotated[CurrentUser, Depends(require_role("admin"))]
Exporter = Annotated[CurrentUser, Depends(require_role("exporter"))]
Store = Annotated[Storage, Depends(get_storage)]


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


# ── Báo cáo go-to-market (U18). Service kiểm lại vai trò và công ty sở hữu. ──────────────────
@router.post("/api/exporter/market-reports", status_code=202)
async def create_market_report(
    data: ReportIn, user: Exporter, session: DB, storage: Store
) -> ReportOut:
    return await report_service.create_report(session, user, data, storage)


@router.get("/api/exporter/market-reports")
async def list_market_reports(user: Exporter, session: DB) -> list[ReportListItemOut]:
    return await report_service.list_reports(session, user)


@router.get("/api/exporter/market-reports/{report_id}")
async def get_market_report(
    report_id: uuid.UUID, user: Exporter, session: DB, storage: Store
) -> ReportOut:
    return await report_service.get_report(session, user, storage, report_id)


@router.post("/api/exporter/consulting-leads", status_code=201)
async def create_consulting_lead(
    data: ConsultingLeadIn, user: Exporter, session: DB
) -> ConsultingLeadOut:
    return await report_service.create_lead(session, user, data)


@router.get("/api/admin/consulting-leads")
async def list_consulting_leads(
    _: Admin,
    session: DB,
    status: Annotated[Literal["new", "contacted", "closed"] | None, Query()] = None,
) -> list[AdminConsultingLeadOut]:
    return await report_service.admin_list_leads(session, status)


@router.patch("/api/admin/consulting-leads/{lead_id}")
async def update_consulting_lead(
    lead_id: uuid.UUID, data: ConsultingLeadPatch, admin: Admin, session: DB
) -> ConsultingLeadOut:
    return await report_service.admin_update_lead(session, admin, lead_id, data)
