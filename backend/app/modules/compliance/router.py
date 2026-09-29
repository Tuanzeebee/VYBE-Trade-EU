from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import get_optional_user, require_role
from app.modules.compliance import service
from app.modules.compliance.schemas import RooIn, RooOut, TariffIn, TariffOut

router = APIRouter(tags=["compliance"])


@router.get("/api/admin/compliance-checks.csv")
async def export_compliance_checks(
    user: Annotated[CurrentUser, Depends(require_role("admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StreamingResponse:
    return StreamingResponse(
        service.export_checks_csv(session, actor_id=user.id),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="compliance-checks.csv"'},
    )


# Công khai (khách dùng không cần đăng nhập). Rate limit 30/phút áp ở mức app (J1).
@router.post("/api/public/tariff")
async def calculate_tariff(
    data: TariffIn,
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TariffOut:
    return await service.calculate_tariff(session, data, user)


@router.post("/api/public/roo")
async def calculate_roo(
    data: RooIn,
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> RooOut:
    return await service.calculate_roo(session, data, user)
