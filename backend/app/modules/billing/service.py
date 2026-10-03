"""Thanh toán tối giản (U19, ADR-0005): đặt mua → hướng dẫn chuyển khoản → admin xác nhận đã nhận
tiền → cấp quyền dùng có hạn. Không cổng thanh toán, không escrow.

Xác nhận là thao tác nhạy cảm: ghi audit trước/sau; xác nhận lần hai không có tác dụng. Quyền dùng
được kiểm ở service của module dùng nó qua core.entitlements (billing đăng ký has_entitlement).
"""

import datetime as dt
import uuid

from sqlalchemy import ColumnElement, and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import entitlements
from app.core.audit import record
from app.core.config import DEMO_BANK_ACCOUNT, get_settings
from app.core.errors import AppError
from app.core.events import publish
from app.modules.auth.schemas import CurrentUser
from app.modules.billing.events import OrderPaid
from app.modules.billing.logic import entitlement_window, new_reference, next_status
from app.modules.billing.models import BillingItem, Entitlement, Order, PlanLimit
from app.modules.billing.schemas import (
    AdminBillingItemOut,
    AdminOrderOut,
    BankTransferOut,
    BillingItemOut,
    BillingItemPatch,
    EntitlementOut,
    OrderDecisionIn,
    OrderIn,
    OrderOut,
)
from app.modules.companies import service as companies

REFERENCE_ATTEMPTS = 5


def _now() -> dt.datetime:
    return dt.datetime.now(dt.UTC)


# ── Mục thu phí ───────────────────────────────────────────────────────────────
async def list_items(session: AsyncSession) -> list[BillingItemOut]:
    rows = await session.scalars(
        select(BillingItem)
        .where(BillingItem.is_active.is_(True))
        .order_by(BillingItem.sort_order, BillingItem.code)
    )
    return [BillingItemOut.model_validate(r) for r in rows]


async def admin_list_items(session: AsyncSession) -> list[AdminBillingItemOut]:
    rows = await session.scalars(select(BillingItem).order_by(BillingItem.sort_order))
    return [AdminBillingItemOut.model_validate(r) for r in rows]


async def admin_update_item(
    session: AsyncSession, admin: CurrentUser, code: str, data: BillingItemPatch
) -> AdminBillingItemOut:
    item = await session.get(BillingItem, code)
    if item is None:
        raise AppError("item_not_found", "Billing item not found", 404)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    before = {key: str(getattr(item, key)) for key in changes}
    for key, value in changes.items():
        setattr(item, key, value)
    item.updated_by, item.updated_at = admin.id, _now()
    await session.flush()
    await record(
        session,
        actor_id=admin.id,
        action_type="billing_item.update",
        entity_type="billing_item",
        entity_id=code,
        before=before,
        after={key: str(value) for key, value in changes.items()},
    )
    await session.commit()
    await session.refresh(item)
    return AdminBillingItemOut.model_validate(item)


# ── Đơn của công ty ───────────────────────────────────────────────────────────
async def _company_id(session: AsyncSession, user: CurrentUser) -> uuid.UUID:
    if user.role not in ("exporter", "buyer"):
        raise AppError("forbidden", "Not allowed for this role", 403)
    company_id = await companies.get_company_id(session, user.id)
    if company_id is None:
        raise AppError("company_not_found", "Company profile not created yet", 404)
    return company_id


def _bank_transfer(order: Order) -> BankTransferOut | None:
    if order.status != "pending":
        return None
    s = get_settings()
    return BankTransferOut(
        bank_name=s.bank_transfer_bank_name,
        account_name=s.bank_transfer_account_name,
        account_number=s.bank_transfer_account_number,
        iban=s.bank_transfer_iban,
        swift=s.bank_transfer_swift,
        transfer_note=order.reference,
        is_demo_account=s.bank_transfer_account_number == DEMO_BANK_ACCOUNT,
    )


def _order_out(order: Order, item: BillingItem) -> OrderOut:
    return OrderOut(
        id=order.id,
        item_code=item.code,
        item_name_vi=item.name_vi,
        item_name_en=item.name_en,
        feature=item.feature,
        amount=order.amount,
        currency=order.currency,
        reference=order.reference,
        status=order.status,
        invoice_info=order.invoice_info,
        created_at=order.created_at,
        paid_at=order.paid_at,
        cancelled_at=order.cancelled_at,
        bank_transfer=_bank_transfer(order),
    )


async def _items(session: AsyncSession, codes: set[str]) -> dict[str, BillingItem]:
    rows = await session.scalars(select(BillingItem).where(BillingItem.code.in_(codes)))
    return {r.code: r for r in rows}


async def _unique_reference(session: AsyncSession) -> str:
    for _ in range(REFERENCE_ATTEMPTS):
        reference = new_reference()
        taken = await session.scalar(select(Order.id).where(Order.reference == reference))
        if taken is None:
            return reference
    raise AppError("reference_unavailable", "Could not allocate an order reference", 503)


async def create_order(session: AsyncSession, user: CurrentUser, data: OrderIn) -> OrderOut:
    """Đặt mua. Đã có đơn đang chờ cho cùng mục → trả lại đơn đó (không tạo trùng)."""
    company_id = await _company_id(session, user)
    item = await session.get(BillingItem, data.item_code)
    if item is None or not item.is_active:
        raise AppError("item_not_found", "Billing item not found", 404)
    if item.audience != user.role:
        raise AppError("item_not_for_role", "This item is not available for your account", 403)
    pending = await session.scalar(
        select(Order).where(
            Order.company_id == company_id,
            Order.item_code == item.code,
            Order.status == "pending",
        )
    )
    if pending is not None:
        return _order_out(pending, item)
    order = Order(
        company_id=company_id,
        item_code=item.code,
        amount=item.price,
        currency=item.currency,
        reference=await _unique_reference(session),
        invoice_info=data.invoice_info.model_dump(mode="json"),
        created_by=user.id,
    )
    session.add(order)
    await session.flush()
    await record(
        session,
        actor_id=user.id,
        action_type="order.create",
        entity_type="order",
        entity_id=str(order.id),
        before=None,
        after={"item": item.code, "amount": str(item.price), "currency": item.currency},
    )
    await session.commit()
    await session.refresh(order)
    return _order_out(order, item)


async def list_my_orders(session: AsyncSession, user: CurrentUser) -> list[OrderOut]:
    company_id = await _company_id(session, user)
    orders = list(
        await session.scalars(
            select(Order)
            .where(Order.company_id == company_id)
            .order_by(Order.created_at.desc())
            .limit(100)
        )
    )
    items = await _items(session, {o.item_code for o in orders})
    return [_order_out(o, items[o.item_code]) for o in orders]


async def _own_order(session: AsyncSession, user: CurrentUser, order_id: uuid.UUID) -> Order:
    company_id = await _company_id(session, user)
    order = await session.get(Order, order_id)
    if order is None or order.company_id != company_id:
        raise AppError("order_not_found", "Order not found", 404)
    return order


async def get_my_order(session: AsyncSession, user: CurrentUser, order_id: uuid.UUID) -> OrderOut:
    order = await _own_order(session, user, order_id)
    return _order_out(order, await session.get_one(BillingItem, order.item_code))


async def cancel_my_order(
    session: AsyncSession, user: CurrentUser, order_id: uuid.UUID
) -> OrderOut:
    order = await _own_order(session, user, order_id)
    return await _cancel(session, user, order, note=None)


async def _cancel(
    session: AsyncSession, actor: CurrentUser, order: Order, note: str | None
) -> OrderOut:
    if next_status(order.status, "cancel") is None:
        raise AppError("order_not_pending", "Only pending orders can be cancelled", 409)
    order.status = "cancelled"
    order.cancelled_at = _now()
    if note:
        order.admin_note = note
    await session.flush()
    await record(
        session,
        actor_id=actor.id,
        action_type="order.cancel",
        entity_type="order",
        entity_id=str(order.id),
        before={"status": "pending"},
        after={"status": "cancelled"},
    )
    await session.commit()
    await session.refresh(order)
    return _order_out(order, await session.get_one(BillingItem, order.item_code))


# ── Quyền dùng ────────────────────────────────────────────────────────────────
def _active(company_id: uuid.UUID, now: dt.datetime) -> ColumnElement[bool]:
    return and_(
        Entitlement.company_id == company_id,
        Entitlement.valid_from <= now,
        or_(Entitlement.valid_until.is_(None), Entitlement.valid_until > now),
    )


async def has_entitlement(session: AsyncSession, company_id: uuid.UUID, feature: str) -> bool:
    found = await session.scalar(
        select(Entitlement.id).where(_active(company_id, _now()), Entitlement.feature == feature)
    )
    return found is not None


async def limit_for(session: AsyncSession, company_id: uuid.UUID, key: str) -> int | None:
    """None = không giới hạn: công ty có quyền `more_products` hoặc `key` chưa được cấu hình."""
    if key == entitlements.MAX_PRODUCTS and await has_entitlement(
        session, company_id, entitlements.MORE_PRODUCTS
    ):
        return None
    row = await session.get(PlanLimit, key)
    return row.free_limit if row else None


async def my_entitlements(session: AsyncSession, user: CurrentUser) -> list[EntitlementOut]:
    company_id = await _company_id(session, user)
    rows = await session.scalars(
        select(Entitlement)
        .where(
            Entitlement.company_id == company_id,
            or_(Entitlement.valid_until.is_(None), Entitlement.valid_until > _now()),
        )
        .order_by(Entitlement.feature, Entitlement.valid_from)
    )
    return [EntitlementOut.model_validate(r) for r in rows]


# ── Admin ─────────────────────────────────────────────────────────────────────
async def admin_list_orders(
    session: AsyncSession, status: str | None = None
) -> list[AdminOrderOut]:
    stmt = select(Order).order_by(Order.created_at.desc()).limit(200)
    if status:
        stmt = stmt.where(Order.status == status)
    orders = list(await session.scalars(stmt))
    items = await _items(session, {o.item_code for o in orders})
    names = await companies.get_company_summaries(session, list({o.company_id for o in orders}))
    return [
        AdminOrderOut(
            **_order_out(o, items[o.item_code]).model_dump(),
            company_id=o.company_id,
            company_name=names[o.company_id].legal_name if o.company_id in names else "",
            admin_note=o.admin_note,
        )
        for o in orders
    ]


async def admin_confirm_payment(
    session: AsyncSession, admin: CurrentUser, order_id: uuid.UUID, data: OrderDecisionIn
) -> OrderOut:
    """Đã nhận chuyển khoản → paid + cấp quyền dùng. Đơn đã paid → trả nguyên trạng (idempotent)."""
    order = await session.get(Order, order_id, with_for_update=True)
    if order is None:
        raise AppError("order_not_found", "Order not found", 404)
    item = await session.get_one(BillingItem, order.item_code)
    if order.status == "paid":
        return _order_out(order, item)
    if next_status(order.status, "confirm_payment") is None:
        raise AppError("order_not_pending", "Only pending orders can be confirmed", 409)
    now = _now()
    current_until = await session.scalar(
        select(func.max(Entitlement.valid_until)).where(
            _active(order.company_id, now), Entitlement.feature == item.feature
        )
    )
    valid_from, valid_until = entitlement_window(now, item.duration_days, current_until)
    order.status, order.paid_at, order.confirmed_by = "paid", now, admin.id
    if data.note:
        order.admin_note = data.note
    session.add(
        Entitlement(
            company_id=order.company_id,
            feature=item.feature,
            order_id=order.id,
            valid_from=valid_from,
            valid_until=valid_until,
        )
    )
    await session.flush()
    await record(
        session,
        actor_id=admin.id,
        action_type="order.confirm_payment",
        entity_type="order",
        entity_id=str(order.id),
        before={"status": "pending"},
        after={
            "status": "paid",
            "amount": str(order.amount),
            "currency": order.currency,
            "reference": order.reference,
            "feature": item.feature,
            "valid_until": valid_until.isoformat() if valid_until else None,
        },
    )
    await session.commit()
    await session.refresh(order)
    await publish(
        OrderPaid(
            company_id=order.company_id,
            order_id=order.id,
            reference=order.reference,
            item_name_vi=item.name_vi,
            item_name_en=item.name_en,
        )
    )
    return _order_out(order, item)


async def admin_cancel_order(
    session: AsyncSession, admin: CurrentUser, order_id: uuid.UUID, data: OrderDecisionIn
) -> OrderOut:
    order = await session.get(Order, order_id)
    if order is None:
        raise AppError("order_not_found", "Order not found", 404)
    return await _cancel(session, admin, order, note=data.note)
