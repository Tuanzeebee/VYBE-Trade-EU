"""Báo giá RFQ (U8): seller báo giá, buyer chấp nhận / từ chối, seller rút hoặc gửi bản mới.

Hai lớp phân quyền: router chọn vai trò; ở đây mỗi bản ghi phải thuộc công ty người gọi (seller nhận
RFQ, buyer gửi RFQ) — còn lại 404, không lộ sự tồn tại. Luật chuyển trạng thái nằm ở quote_logic.
Thanh toán vẫn diễn ra ngoài nền tảng (GĐ2 mới có thanh toán qua nền tảng).
"""

import datetime as dt
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.events import publish
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import product_service
from app.modules.companies import service as companies
from app.modules.messaging import quote_logic
from app.modules.messaging.events import QuoteDecided, QuoteSent
from app.modules.messaging.models import Rfq, RfqQuote, RfqStatus
from app.modules.messaging.quote_logic import QuoteStatus
from app.modules.messaging.schemas import QuoteDecisionIn, QuoteIn, QuoteOut


def _today(now: dt.datetime | None) -> dt.date:
    return (now or dt.datetime.now(dt.UTC)).date()


def _out(quote: RfqQuote, today: dt.date) -> QuoteOut:
    total, deposit = quote_logic.amounts(quote.unit_price, quote.quantity, quote.deposit_percent)
    return QuoteOut(
        id=quote.id,
        rfq_id=quote.rfq_id,
        unit_price=str(quote.unit_price),
        currency=quote.currency,
        quantity=str(quote.quantity),
        unit=quote.unit,
        total_amount=str(total),
        deposit_percent=quote.deposit_percent,
        deposit_amount=str(deposit),
        balance_terms=quote.balance_terms,
        incoterm=quote.incoterm,
        named_place=quote.named_place,
        lead_time_days=quote.lead_time_days,
        valid_until=quote.valid_until,
        notes=quote.notes,
        status=quote_logic.effective_status(quote.status, quote.valid_until, today),
        decision_reason=quote.decision_reason,
        decided_at=quote.decided_at,
        created_at=quote.created_at,
    )


async def _my_company(session: AsyncSession, user: CurrentUser) -> uuid.UUID | None:
    return await companies.get_company_id(session, user.id)


async def _rfq_for(session: AsyncSession, user: CurrentUser, rfq_id: uuid.UUID) -> Rfq:
    """RFQ mà công ty người gọi là bên gửi hoặc bên nhận; còn lại 404."""
    company_id = await _my_company(session, user)
    rfq = await session.get(Rfq, rfq_id)
    if rfq is None or company_id not in (rfq.buyer_company_id, rfq.exporter_company_id):
        raise AppError("rfq_not_found", "RFQ not found", 404)
    return rfq


async def create_quote(
    session: AsyncSession,
    user: CurrentUser,
    rfq_id: uuid.UUID,
    data: QuoteIn,
    now: dt.datetime | None = None,
) -> QuoteOut:
    """Chỉ seller nhận RFQ. Báo giá đang mở trước đó (nếu có) chuyển "superseded"; RFQ mới/đã xem
    chuyển "quoted" (buyer nhận một thông báo báo giá, không kèm thông báo đổi trạng thái)."""
    today = _today(now)
    company_id = await _my_company(session, user)
    rfq = await session.get(Rfq, rfq_id)
    if rfq is None or rfq.exporter_company_id != company_id:
        raise AppError("rfq_not_found", "RFQ not found", 404)
    if rfq.status is RfqStatus.closed:
        raise AppError("rfq_closed", "This RFQ is closed", 409)
    for code in (
        quote_logic.terms_error(data.deposit_percent, data.balance_terms),
        quote_logic.validity_error(data.valid_until, today),
    ):
        if code:
            raise AppError(code, "Invalid quote terms", 422)

    existing = list(await session.scalars(select(RfqQuote).where(RfqQuote.rfq_id == rfq.id)))
    if any(q.status is QuoteStatus.accepted for q in existing):
        raise AppError("quote_already_accepted", "A quote was already accepted", 409)
    for previous in existing:
        if previous.status is QuoteStatus.sent:
            previous.status = QuoteStatus.superseded
    await session.flush()  # giải phóng unique "một báo giá đang mở" trước khi thêm bản mới

    quote = RfqQuote(
        rfq_id=rfq.id,
        exporter_company_id=rfq.exporter_company_id,
        unit_price=data.unit_price,
        currency=data.currency,
        quantity=data.quantity or rfq.quantity,
        unit=data.unit or rfq.unit,
        incoterm=data.incoterm,
        named_place=data.named_place,
        deposit_percent=data.deposit_percent,
        balance_terms=data.balance_terms,
        lead_time_days=data.lead_time_days,
        valid_until=data.valid_until,
        notes=data.notes,
    )
    session.add(quote)
    if rfq.status in (RfqStatus.new, RfqStatus.viewed):
        rfq.status = RfqStatus.quoted
    await session.flush()
    await session.refresh(quote)
    names = await companies.get_company_summaries(session, [rfq.exporter_company_id])
    products = await product_service.get_product_names(session, [rfq.product_id])
    out = _out(quote, today)
    await session.commit()
    await publish(
        QuoteSent(
            rfq_id=rfq.id,
            quote_id=quote.id,
            buyer_company_id=rfq.buyer_company_id,
            exporter_name=names[rfq.exporter_company_id].legal_name,
            product_name=products.get(rfq.product_id, ""),
        )
    )
    return out


async def list_quotes(
    session: AsyncSession, user: CurrentUser, rfq_id: uuid.UUID, now: dt.datetime | None = None
) -> list[QuoteOut]:
    """Hai bên của RFQ thấy mọi báo giá (mới nhất trước)."""
    rfq = await _rfq_for(session, user, rfq_id)
    rows = await session.scalars(
        select(RfqQuote)
        .where(RfqQuote.rfq_id == rfq.id)
        .order_by(RfqQuote.created_at.desc(), RfqQuote.id)
    )
    today = _today(now)
    return [_out(q, today) for q in rows]


async def _quote_for(
    session: AsyncSession, company_id: uuid.UUID | None, quote_id: uuid.UUID, side: str
) -> tuple[RfqQuote, Rfq]:
    quote = await session.get(RfqQuote, quote_id)
    rfq = await session.get(Rfq, quote.rfq_id) if quote else None
    owner = None
    if rfq is not None:
        owner = rfq.buyer_company_id if side == "buyer" else rfq.exporter_company_id
    if quote is None or rfq is None or company_id is None or owner != company_id:
        raise AppError("quote_not_found", "Quote not found", 404)
    return quote, rfq


def _apply(quote: RfqQuote, target: QuoteStatus, actor: str, today: dt.date) -> None:
    code = quote_logic.transition_error(quote.status, target, actor, quote.valid_until, today)
    if code == "quote_expired":
        raise AppError(code, "This quote has expired", 409)
    if code:
        raise AppError(code, f"Cannot change quote from {quote.status} to {target}", 409)
    quote.status = target


async def decide_quote(
    session: AsyncSession,
    user: CurrentUser,
    quote_id: uuid.UUID,
    data: QuoteDecisionIn,
    now: dt.datetime | None = None,
) -> QuoteOut:
    """Chỉ buyer gửi RFQ. Chấp nhận = đồng ý điều khoản; hai bên hoàn tất hợp đồng và thanh toán
    ngoài nền tảng."""
    moment = now or dt.datetime.now(dt.UTC)
    company_id = await _my_company(session, user)
    quote, rfq = await _quote_for(session, company_id, quote_id, "buyer")
    target = QuoteStatus.accepted if data.decision == "accept" else QuoteStatus.declined
    _apply(quote, target, "buyer", moment.date())
    quote.decided_at = moment
    quote.decision_reason = (data.reason or "").strip() or None
    await session.flush()
    names = await companies.get_company_summaries(session, [rfq.buyer_company_id])
    products = await product_service.get_product_names(session, [rfq.product_id])
    out = _out(quote, moment.date())
    await session.commit()
    await publish(
        QuoteDecided(
            rfq_id=rfq.id,
            quote_id=quote.id,
            exporter_company_id=rfq.exporter_company_id,
            buyer_name=names[rfq.buyer_company_id].legal_name,
            product_name=products.get(rfq.product_id, ""),
            decision=target.value,
        )
    )
    return out


async def withdraw_quote(
    session: AsyncSession, user: CurrentUser, quote_id: uuid.UUID, now: dt.datetime | None = None
) -> QuoteOut:
    """Chỉ seller đã gửi báo giá; chỉ báo giá đang mở (kể cả đã quá hiệu lực)."""
    today = _today(now)
    company_id = await _my_company(session, user)
    quote, _ = await _quote_for(session, company_id, quote_id, "exporter")
    _apply(quote, QuoteStatus.withdrawn, "exporter", today)
    await session.flush()
    out = _out(quote, today)
    await session.commit()
    return out
