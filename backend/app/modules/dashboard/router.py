from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import get_optional_user, require_role
from app.modules.dashboard import service
from app.modules.dashboard.schemas import BuyerDashboard, ExporterDashboard, ReturnVisitStats

router = APIRouter(tags=["dashboard"])
DB = Annotated[AsyncSession, Depends(get_session)]
Exporter = Annotated[CurrentUser, Depends(require_role("exporter"))]
Buyer = Annotated[CurrentUser, Depends(require_role("buyer"))]
Admin = Annotated[CurrentUser, Depends(require_role("admin"))]
MaybeUser = Annotated[CurrentUser | None, Depends(get_optional_user)]


# Công khai: khách và buyer xem hồ sơ. Rate limit áp ở J1 cho toàn bộ /api/public/*.
@router.post(
    "/api/public/companies/{slug}/view",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def record_view(slug: str, session: DB, viewer: MaybeUser) -> Response:
    await service.record_profile_view(session, slug, viewer)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/api/exporter/dashboard")
async def exporter_dashboard(user: Exporter, session: DB) -> ExporterDashboard:
    return await service.exporter_dashboard(session, user)


@router.get("/api/buyer/dashboard")
async def buyer_dashboard(user: Buyer, session: DB) -> BuyerDashboard:
    return await service.buyer_dashboard(session, user)


@router.get("/api/admin/stats/return-visits")
async def return_visits(
    _: Admin, session: DB, weeks: Annotated[int, Query(ge=1, le=52)] = 8
) -> ReturnVisitStats:
    return await service.return_visit_stats(session, weeks)
