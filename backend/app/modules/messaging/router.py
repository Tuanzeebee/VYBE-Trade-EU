import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.translation import TranslationService, get_translation_service
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import require_role
from app.modules.messaging import conversation_service, service
from app.modules.messaging.conversation_schemas import ConversationOut, MessageIn, MessageOut
from app.modules.messaging.models import RfqStatus
from app.modules.messaging.schemas import RfqIn, RfqOut, RfqStatusIn

router = APIRouter(tags=["messaging"])
DB = Annotated[AsyncSession, Depends(get_session)]
Buyer = Annotated[CurrentUser, Depends(require_role("buyer"))]
Exporter = Annotated[CurrentUser, Depends(require_role("exporter"))]
Member = Annotated[CurrentUser, Depends(require_role("buyer", "exporter"))]


@router.post("/api/buyer/rfqs", status_code=status.HTTP_201_CREATED)
async def create_rfq(data: RfqIn, user: Buyer, session: DB) -> RfqOut:
    return await service.create_rfq(session, user, data)


@router.get("/api/me/rfqs")
async def list_my_rfqs(
    user: Member,
    session: DB,
    status: RfqStatus | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[RfqOut]:
    return await service.list_my_rfqs(session, user, status=status, limit=limit, offset=offset)


@router.get("/api/me/rfqs/{rfq_id}")
async def get_rfq(rfq_id: uuid.UUID, user: Member, session: DB) -> RfqOut:
    return await service.get_rfq(session, user, rfq_id)


@router.patch("/api/exporter/rfqs/{rfq_id}/status")
async def set_rfq_status(
    rfq_id: uuid.UUID, data: RfqStatusIn, user: Exporter, session: DB
) -> RfqOut:
    return await service.set_status(session, user, rfq_id, data.status)


Translator = Annotated[TranslationService, Depends(get_translation_service)]


@router.get("/api/me/conversations")
async def list_my_conversations(user: Member, session: DB) -> list[ConversationOut]:
    return await conversation_service.list_conversations(session, user)


@router.get("/api/me/conversations/{conversation_id}/messages")
async def list_messages(
    conversation_id: uuid.UUID,
    user: Member,
    session: DB,
    after: uuid.UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=conversation_service.MAX_PAGE)] = 100,
) -> list[MessageOut]:
    return await conversation_service.list_messages(
        session, user, conversation_id, after=after, limit=limit
    )


@router.post(
    "/api/me/conversations/{conversation_id}/messages", status_code=status.HTTP_201_CREATED
)
async def send_message(
    conversation_id: uuid.UUID, data: MessageIn, user: Member, session: DB, translator: Translator
) -> MessageOut:
    return await conversation_service.send_message(
        session, user, conversation_id, data.body, translator
    )
