"""Hội thoại theo cặp công ty gắn với RFQ (F2) và dịch máy từng tin (F3).

Chỉ hai công ty của RFQ đọc và gửi được; người ngoài cuộc nhận 404. Lỗi dịch không chặn gửi:
tin nhắn đi bằng bản gốc, body_translated để trống và người nhận thấy bản gốc.
"""

import logging
import uuid

from sqlalchemy import func, select, tuple_, update
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.events import publish
from app.core.translation import TranslationService
from app.modules.auth import service as auth
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import product_service
from app.modules.companies import service as companies
from app.modules.messaging.conversation_schemas import ConversationOut, MessageOut
from app.modules.messaging.events import MessageSent
from app.modules.messaging.models import Conversation, Message, Rfq

log = logging.getLogger(__name__)
MAX_PAGE = 200


def open_for_rfq(session: AsyncSession, rfq: Rfq) -> Conversation:
    """Mỗi RFQ tự mở một hội thoại (gọi trong cùng transaction tạo RFQ)."""
    conversation = Conversation(
        rfq_id=rfq.id, company_a_id=rfq.buyer_company_id, company_b_id=rfq.exporter_company_id
    )
    session.add(conversation)
    return conversation


async def _participant(
    session: AsyncSession, user: CurrentUser, conversation_id: uuid.UUID
) -> tuple[Conversation, uuid.UUID]:
    company_id = await companies.get_company_id(session, user.id)
    conversation = await session.get(Conversation, conversation_id)
    if (
        conversation is None
        or company_id is None
        or company_id not in (conversation.company_a_id, conversation.company_b_id)
    ):
        raise AppError("conversation_not_found", "Conversation not found", 404)
    return conversation, company_id


def _view(message: Message, my_company_id: uuid.UUID) -> MessageOut:
    """Người gửi thấy bản mình viết; người nhận thấy bản dịch nếu có."""
    mine = message.sender_company_id == my_company_id
    translated = not mine and message.body_translated is not None
    shown = (
        message.body_translated if translated and message.body_translated else message.body_original
    )
    return MessageOut(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_company_id=message.sender_company_id,
        mine=mine,
        body=shown,
        body_original=message.body_original,
        translated=translated,
        original_language=message.original_language,
        translated_language=message.translated_language,
        sent_at=message.sent_at,
        read_at=message.read_at,
    )


async def list_conversations(session: AsyncSession, user: CurrentUser) -> list[ConversationOut]:
    company_id = await companies.get_company_id(session, user.id)
    if company_id is None:
        return []
    conversations = (
        await session.scalars(
            select(Conversation).where(
                (Conversation.company_a_id == company_id)
                | (Conversation.company_b_id == company_id)
            )
        )
    ).all()
    if not conversations:
        return []
    ids = [c.id for c in conversations]
    unread_rows = await session.execute(
        select(Message.conversation_id, func.count())
        .where(
            Message.conversation_id.in_(ids),
            Message.sender_company_id != company_id,
            Message.read_at.is_(None),
        )
        .group_by(Message.conversation_id)
    )
    unread = {row[0]: row[1] for row in unread_rows}
    last: dict[uuid.UUID, Message] = {}
    latest = await session.scalars(
        select(Message)
        .where(Message.conversation_id.in_(ids))
        .order_by(Message.conversation_id, Message.sent_at.desc(), Message.id.desc())
        .ext(distinct_on(Message.conversation_id))
    )
    for row in latest:
        last[row.conversation_id] = row
    rfqs = {
        r.id: r
        for r in await session.scalars(
            select(Rfq).where(Rfq.id.in_([c.rfq_id for c in conversations]))
        )
    }
    names = await companies.get_company_summaries(
        session, [c.company_a_id for c in conversations] + [c.company_b_id for c in conversations]
    )
    products = await product_service.get_product_names(
        session, [r.product_id for r in rfqs.values()]
    )
    out: list[ConversationOut] = []
    for c in conversations:
        other = c.company_b_id if c.company_a_id == company_id else c.company_a_id
        message = last.get(c.id)
        out.append(
            ConversationOut(
                id=c.id,
                rfq_id=c.rfq_id,
                product_name=products.get(rfqs[c.rfq_id].product_id, ""),
                counterpart_name=names[other].legal_name,
                last_message=_view(message, company_id).body if message else None,
                last_message_at=message.sent_at if message else c.created_at,
                unread_count=unread.get(c.id, 0),
            )
        )
    return sorted(out, key=lambda o: (o.last_message_at, str(o.id)), reverse=True)


async def list_messages(
    session: AsyncSession,
    user: CurrentUser,
    conversation_id: uuid.UUID,
    *,
    after: uuid.UUID | None = None,
    limit: int = 100,
) -> list[MessageOut]:
    """Theo thứ tự gửi. `after` = id tin đã có (polling chỉ lấy tin mới). Mở hội thoại đánh dấu
    tin của bên kia là đã đọc."""
    conversation, company_id = await _participant(session, user, conversation_id)
    query = select(Message).where(Message.conversation_id == conversation.id)
    if after is not None:
        ref = await session.get(Message, after)
        if ref is None or ref.conversation_id != conversation.id:
            raise AppError("message_not_found", "Message not found", 404)
        query = query.where(tuple_(Message.sent_at, Message.id) > tuple_(ref.sent_at, ref.id))
    rows = (
        await session.scalars(
            query.order_by(Message.sent_at, Message.id).limit(min(limit, MAX_PAGE))
        )
    ).all()
    unread = [m.id for m in rows if m.sender_company_id != company_id and m.read_at is None]
    if unread:
        await session.execute(
            update(Message).where(Message.id.in_(unread)).values(read_at=func.clock_timestamp())
        )
        await session.commit()
        for message in rows:
            await session.refresh(message)
    return [_view(m, company_id) for m in rows]


async def _translate(
    translator: TranslationService,
    session: AsyncSession,
    body: str,
    source: str,
    recipient_company_id: uuid.UUID,
) -> tuple[str | None, str | None]:
    """(bản dịch, ngôn ngữ đích), hoặc (None, None) khi cùng ngôn ngữ, không còn người nhận
    hay dịch lỗi — tin vẫn được gửi bằng bản gốc."""
    owner = await companies.get_owner_user_id(session, recipient_company_id)
    contact = await auth.get_contact(session, owner) if owner else None
    if contact is None or contact.preferred_language == source:
        return None, None
    try:
        text = await translator.translate(body, source, contact.preferred_language)
    except Exception:
        log.warning("Dịch tin nhắn thất bại; gửi bản gốc", exc_info=True)
        return None, None
    if not text.strip():
        return None, None
    return text, contact.preferred_language


async def send_message(
    session: AsyncSession,
    user: CurrentUser,
    conversation_id: uuid.UUID,
    body: str,
    translator: TranslationService,
) -> MessageOut:
    conversation, company_id = await _participant(session, user, conversation_id)
    recipient = (
        conversation.company_b_id
        if conversation.company_a_id == company_id
        else conversation.company_a_id
    )
    translated, target = await _translate(
        translator, session, body, user.preferred_language, recipient
    )
    message = Message(
        conversation_id=conversation.id,
        sender_company_id=company_id,
        body_original=body,
        body_translated=translated,
        original_language=user.preferred_language,
        translated_language=target,
    )
    session.add(message)
    await session.flush()
    await session.refresh(message)
    out = _view(message, company_id)
    names = await companies.get_company_summaries(session, [company_id])
    await session.commit()
    await publish(
        MessageSent(
            conversation_id=conversation.id,
            sender_company_id=company_id,
            recipient_company_id=recipient,
            sender_name=names[company_id].legal_name,
        )
    )
    return out
