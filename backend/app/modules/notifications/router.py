import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import require_role
from app.modules.notifications import center
from app.modules.notifications.schemas import NotificationOut, UnreadCountOut

router = APIRouter(tags=["notifications"])
DB = Annotated[AsyncSession, Depends(get_session)]
Member = Annotated[CurrentUser, Depends(require_role("exporter", "buyer", "admin"))]


@router.get("/api/me/notifications")
async def list_my_notifications(
    user: Member,
    session: DB,
    unread_only: bool = False,
    limit: Annotated[int, Query(ge=1, le=center.MAX_LIMIT)] = 30,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[NotificationOut]:
    return await center.list_notifications(
        session, user, unread_only=unread_only, limit=limit, offset=offset
    )


@router.get("/api/me/notifications/unread-count")
async def unread_count(user: Member, session: DB) -> UnreadCountOut:
    return UnreadCountOut(count=await center.count_unread(session, user))


@router.post("/api/me/notifications/read-all")
async def read_all(user: Member, session: DB) -> UnreadCountOut:
    await center.mark_all_read(session, user)
    return UnreadCountOut(count=0)


@router.post("/api/me/notifications/{notification_id}/read")
async def read_one(notification_id: uuid.UUID, user: Member, session: DB) -> NotificationOut:
    return await center.mark_read(session, user, notification_id)
