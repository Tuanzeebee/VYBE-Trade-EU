"""RFQ có cấu trúc và theo dõi trạng thái (F1). Hai lớp phân quyền: router chọn vai trò, service
kiểm tra từng bản ghi thuộc về công ty của người gọi (buyer gửi, exporter nhận).
"""

import datetime as dt
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.events import publish
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import product_service
from app.modules.companies import service as companies
from app.modules.messaging import conversation_service
from app.modules.messaging.events import RfqCreated, RfqStatusChanged
from app.modules.messaging.models import Rfq, RfqStatus
from app.modules.messaging.schemas import RfqIn, RfqOut, RfqQuotaOut, RfqSummary

MAX_HORIZON_DAYS = 5 * 366  # ngày cần hàng không quá xa (chặn nhập nhầm năm)

# Chuyển trạng thái do exporter thực hiện; không quay lại "new", "closed" là cuối.
TRANSITIONS: dict[RfqStatus, set[RfqStatus]] = {
    RfqStatus.new: {RfqStatus.viewed, RfqStatus.quoted, RfqStatus.closed},
    RfqStatus.viewed: {RfqStatus.quoted, RfqStatus.closed},
    RfqStatus.quoted: {RfqStatus.closed},
    RfqStatus.closed: set(),
}


async def _my_company_id(session: AsyncSession, user: CurrentUser) -> uuid.UUID:
    company_id = await companies.get_company_id(session, user.id)
    if company_id is None:
        raise AppError("company_required", "Create your company profile first", 409)
    return company_id


async def _to_out(session: AsyncSession, rows: list[Rfq]) -> list[RfqOut]:
    company_ids = list({c for r in rows for c in (r.buyer_company_id, r.exporter_company_id)})
    names = await companies.get_company_summaries(session, company_ids)
    products = await product_service.get_product_names(session, [r.product_id for r in rows])
    return [
        RfqOut(
            id=r.id,
            product_id=r.product_id,
            product_name=products.get(r.product_id, ""),
            buyer_company_id=r.buyer_company_id,
            buyer_name=names[r.buyer_company_id].legal_name,
            buyer_verified=names[r.buyer_company_id].verification_status == "verified",
            exporter_company_id=r.exporter_company_id,
            exporter_name=names[r.exporter_company_id].legal_name,
            quantity=str(r.quantity),
            unit=r.unit,
            target_price=None if r.target_price is None else str(r.target_price),
            currency=r.currency,
            incoterms=r.incoterms,
            destination_country=r.destination_country,
            destination_port=r.destination_port,
            required_date=r.required_date,
            message=r.message,
            status=r.status,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


async def daily_limit_for(session: AsyncSession, company_id: uuid.UUID) -> int:
    """Buyer đã xác minh 5 RFQ/24h, chưa xác minh 3 (U6: không chặn buyer; cấu hình
    rfq_daily_limit_*, con số cuối do PO chốt)."""
    settings = get_settings()
    state = await companies.get_verification_state(session, company_id)
    verified = state.status == "verified"
    return settings.rfq_daily_limit_verified if verified else settings.rfq_daily_limit_unverified


async def _sent_last_24h(session: AsyncSession, company_id: uuid.UUID, moment: dt.datetime) -> int:
    sent = await session.scalar(
        select(func.count())
        .select_from(Rfq)
        .where(
            Rfq.buyer_company_id == company_id,
            Rfq.created_at > moment - dt.timedelta(hours=24),
        )
    )
    return sent or 0


async def rfq_quota(
    session: AsyncSession, user: CurrentUser, now: dt.datetime | None = None
) -> RfqQuotaOut:
    """Hạn mức còn lại để form RFQ báo trước cho buyer (thay vì chỉ báo lỗi 429 sau khi gửi)."""
    company_id = await _my_company_id(session, user)
    limit = await daily_limit_for(session, company_id)
    used = await _sent_last_24h(session, company_id, now or dt.datetime.now(dt.UTC))
    state = await companies.get_verification_state(session, company_id)
    return RfqQuotaOut(
        limit=limit,
        used=used,
        remaining=max(limit - used, 0),
        verified=state.status == "verified",
    )


async def create_rfq(
    session: AsyncSession, user: CurrentUser, data: RfqIn, now: dt.datetime | None = None
) -> RfqOut:
    moment = now or dt.datetime.now(dt.UTC)
    buyer_company_id = await _my_company_id(session, user)
    today = moment.date()
    if data.required_date < today:
        raise AppError("required_date_in_past", "Required date cannot be in the past", 422)
    if data.required_date > today + dt.timedelta(days=MAX_HORIZON_DAYS):
        raise AppError("required_date_too_far", "Required date is too far ahead", 422)
    product = await product_service.get_orderable_product(session, data.product_id, moment)
    if product is None:
        raise AppError("product_not_found", "Product not found", 404)

    limit = await daily_limit_for(session, buyer_company_id)
    if limit == 0:
        raise AppError("buyer_not_verified", "Verify your company to send quote requests", 403)
    if await _sent_last_24h(session, buyer_company_id, moment) >= limit:
        raise AppError("rfq_daily_limit", "Daily request limit reached. Try again tomorrow.", 429)

    rfq = Rfq(
        buyer_company_id=buyer_company_id,
        exporter_company_id=product.company_id,
        product_id=product.id,
        quantity=data.quantity,
        unit=data.unit,
        target_price=data.target_price,
        currency=data.currency,
        incoterms=data.incoterms,
        destination_country=data.destination_country,
        destination_port=data.destination_port,
        required_date=data.required_date,
        message=data.message,
    )
    session.add(rfq)
    await session.flush()
    conversation_service.open_for_rfq(session, rfq)
    out = (await _to_out(session, [rfq]))[0]
    await session.commit()
    await publish(
        RfqCreated(
            rfq_id=rfq.id,
            buyer_company_id=buyer_company_id,
            exporter_company_id=product.company_id,
            buyer_name=out.buyer_name,
            product_name=product.name,
        )
    )
    return out


async def list_my_rfqs(
    session: AsyncSession,
    user: CurrentUser,
    *,
    status: RfqStatus | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[RfqOut]:
    """Buyer thấy RFQ đã gửi; exporter thấy RFQ đã nhận. Chưa có công ty → danh sách rỗng."""
    company_id = await companies.get_company_id(session, user.id)
    if company_id is None:
        return []
    column = Rfq.buyer_company_id if user.role == "buyer" else Rfq.exporter_company_id
    query = select(Rfq).where(column == company_id)
    if status is not None:
        query = query.where(Rfq.status == status)
    rows = (
        await session.scalars(
            query.order_by(Rfq.created_at.desc(), Rfq.id).limit(limit).offset(offset)
        )
    ).all()
    return await _to_out(session, list(rows))


async def _participant_rfq(session: AsyncSession, user: CurrentUser, rfq_id: uuid.UUID) -> Rfq:
    """RFQ của công ty người gọi (bên gửi hoặc bên nhận); còn lại 404, không lộ sự tồn tại."""
    company_id = await companies.get_company_id(session, user.id)
    rfq = await session.get(Rfq, rfq_id)
    if rfq is None or company_id not in (rfq.buyer_company_id, rfq.exporter_company_id):
        raise AppError("rfq_not_found", "RFQ not found", 404)
    return rfq


async def get_rfq(session: AsyncSession, user: CurrentUser, rfq_id: uuid.UUID) -> RfqOut:
    """Exporter mở một RFQ mới lần đầu thì nó chuyển sang "đã xem" (buyer thấy thay đổi)."""
    rfq = await _participant_rfq(session, user, rfq_id)
    if user.role == "exporter" and rfq.status == RfqStatus.new:
        return await _change_status(session, rfq, RfqStatus.viewed)
    return (await _to_out(session, [rfq]))[0]


async def _change_status(session: AsyncSession, rfq: Rfq, new: RfqStatus) -> RfqOut:
    old = rfq.status
    rfq.status = new
    await session.flush()
    await session.refresh(rfq)  # updated_at do DB cập nhật
    out = (await _to_out(session, [rfq]))[0]
    await session.commit()
    await publish(
        RfqStatusChanged(
            rfq_id=rfq.id,
            buyer_company_id=rfq.buyer_company_id,
            exporter_company_id=rfq.exporter_company_id,
            exporter_name=out.exporter_name,
            product_name=out.product_name,
            old_status=old.value,
            new_status=new.value,
        )
    )
    return out


async def set_status(
    session: AsyncSession, user: CurrentUser, rfq_id: uuid.UUID, new: RfqStatus
) -> RfqOut:
    """Chỉ exporter nhận RFQ mới đổi được trạng thái (buyer cùng công ty gửi cũng không)."""
    company_id = await companies.get_company_id(session, user.id)
    rfq = await session.get(Rfq, rfq_id)
    if rfq is None or rfq.exporter_company_id != company_id:
        raise AppError("rfq_not_found", "RFQ not found", 404)
    if new not in TRANSITIONS[rfq.status]:
        raise AppError(
            "invalid_status_transition", f"Cannot change status from {rfq.status} to {new}", 409
        )
    return await _change_status(session, rfq, new)


async def summarize_rfqs(
    session: AsyncSession, user: CurrentUser, *, since: dt.datetime, limit: int = 3
) -> RfqSummary:
    """Buyer: RFQ đã gửi; exporter: RFQ đã nhận. Chưa có công ty → tóm tắt rỗng."""
    empty = {status.value: 0 for status in RfqStatus}
    company_id = await companies.get_company_id(session, user.id)
    if company_id is None:
        return RfqSummary(counts=empty, total=0, created_since=0, recent=[])
    column = Rfq.buyer_company_id if user.role == "buyer" else Rfq.exporter_company_id
    counted = await session.execute(
        select(Rfq.status, func.count()).where(column == company_id).group_by(Rfq.status)
    )
    counts = {**empty, **{status.value: n for status, n in counted}}
    created_since = await session.scalar(
        select(func.count()).select_from(Rfq).where(column == company_id, Rfq.created_at >= since)
    )
    rows = (
        await session.scalars(
            select(Rfq)
            .where(column == company_id)
            .order_by(Rfq.created_at.desc(), Rfq.id)
            .limit(limit)
        )
    ).all()
    return RfqSummary(
        counts=counts,
        total=sum(counts.values()),
        created_since=created_since or 0,
        recent=await _to_out(session, list(rows)),
    )
