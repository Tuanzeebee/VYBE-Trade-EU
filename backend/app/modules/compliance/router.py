from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import require_role
from app.modules.compliance import service

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
