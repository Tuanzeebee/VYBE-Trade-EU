import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.translation import TranslationService, get_translation_service
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import require_role
from app.modules.messaging import conversation_service, quote_service, service
from app.modules.messaging.conversation_schemas import (
    ConversationOut,
    DirectConversationIn,
    MessageIn,
    MessageOut,
)
from app.modules.messaging.models import RfqStatus
from app.modules.messaging.schemas import (
    QuoteDecisionIn,
    QuoteIn,
    QuoteOut,
    RfqIn,
    RfqOut,
    RfqQuotaOut,
    RfqStatusIn,
)

router = APIRouter(tags=["messaging"])
DB = Annotated[AsyncSession, Depends(get_session)]
Buyer = Annotated[CurrentUser, Depends(require_role("buyer"))]
Exporter = Annotated[CurrentUser, Depends(require_role("exporter"))]
Member = Annotated[CurrentUser, Depends(require_role("buyer", "exporter"))]


@router.post("/api/buyer/rfqs", status_code=status.HTTP_201_CREATED)
async def create_rfq(data: RfqIn, user: Buyer, session: DB) -> RfqOut:
    return await service.create_rfq(session, user, data)


@router.get("/api/buyer/rfq-quota")
async def rfq_quota(user: Buyer, session: DB) -> RfqQuotaOut:
    return await service.rfq_quota(session, user)


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


# ── Báo giá RFQ (U8) ─────────────────────────────────────────────────────────
@router.post("/api/exporter/rfqs/{rfq_id}/quotes", status_code=status.HTTP_201_CREATED)
async def create_quote(rfq_id: uuid.UUID, data: QuoteIn, user: Exporter, session: DB) -> QuoteOut:
    return await quote_service.create_quote(session, user, rfq_id, data)


@router.get("/api/me/rfqs/{rfq_id}/quotes")
async def list_quotes(rfq_id: uuid.UUID, user: Member, session: DB) -> list[QuoteOut]:
    return await quote_service.list_quotes(session, user, rfq_id)


@router.post("/api/buyer/quotes/{quote_id}/decision")
async def decide_quote(
    quote_id: uuid.UUID, data: QuoteDecisionIn, user: Buyer, session: DB
) -> QuoteOut:
    return await quote_service.decide_quote(session, user, quote_id, data)


@router.post("/api/exporter/quotes/{quote_id}/withdraw")
async def withdraw_quote(quote_id: uuid.UUID, user: Exporter, session: DB) -> QuoteOut:
    return await quote_service.withdraw_quote(session, user, quote_id)


Translator = Annotated[TranslationService, Depends(get_translation_service)]


@router.get("/api/me/conversations")
async def list_my_conversations(user: Member, session: DB) -> list[ConversationOut]:
    return await conversation_service.list_conversations(session, user)


@router.post("/api/me/conversations", status_code=status.HTTP_201_CREATED)
async def start_direct_conversation(
    data: DirectConversationIn, user: Member, session: DB, translator: Translator
) -> ConversationOut:
    """U7: nhắn tin trực tiếp tới nhà cung cấp (không cần RFQ); đã có hội thoại thì gửi tiếp."""
    return await conversation_service.start_direct(
        session, user, data.supplier_slug, data.body, translator
    )


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
