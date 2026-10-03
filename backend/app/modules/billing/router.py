import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import get_current_user, require_role
from app.modules.billing import service
from app.modules.billing.schemas import (
    AdminBillingItemOut,
    AdminOrderOut,
    BillingItemOut,
    BillingItemPatch,
    EntitlementOut,
    OrderDecisionIn,
    OrderIn,
    OrderOut,
)

router = APIRouter(tags=["billing"])
DB = Annotated[AsyncSession, Depends(get_session)]
User = Annotated[CurrentUser, Depends(get_current_user)]
Admin = Annotated[CurrentUser, Depends(require_role("admin"))]


# ── Công khai: bảng giá ───────────────────────────────────────────────────────
@router.get("/api/public/billing-items")
async def list_billing_items(session: DB) -> list[BillingItemOut]:
    return await service.list_items(session)


# ── Công ty: đơn chuyển khoản và quyền dùng. Service kiểm vai trò và công ty sở hữu. ─────────
@router.post("/api/me/orders", status_code=201)
async def create_order(data: OrderIn, user: User, session: DB) -> OrderOut:
    return await service.create_order(session, user, data)


@router.get("/api/me/orders")
async def list_my_orders(user: User, session: DB) -> list[OrderOut]:
    return await service.list_my_orders(session, user)


@router.get("/api/me/orders/{order_id}")
async def get_my_order(order_id: uuid.UUID, user: User, session: DB) -> OrderOut:
    return await service.get_my_order(session, user, order_id)


@router.post("/api/me/orders/{order_id}/cancel")
async def cancel_my_order(order_id: uuid.UUID, user: User, session: DB) -> OrderOut:
    return await service.cancel_my_order(session, user, order_id)


@router.get("/api/me/entitlements")
async def my_entitlements(user: User, session: DB) -> list[EntitlementOut]:
    return await service.my_entitlements(session, user)


# ── Admin ─────────────────────────────────────────────────────────────────────
@router.get("/api/admin/orders")
async def admin_list_orders(
    _: Admin,
    session: DB,
    status: Annotated[Literal["pending", "paid", "cancelled"] | None, Query()] = None,
) -> list[AdminOrderOut]:
    return await service.admin_list_orders(session, status)


@router.post("/api/admin/orders/{order_id}/confirm-payment")
async def confirm_payment(
    order_id: uuid.UUID, data: OrderDecisionIn, admin: Admin, session: DB
) -> OrderOut:
    return await service.admin_confirm_payment(session, admin, order_id, data)


@router.post("/api/admin/orders/{order_id}/cancel")
async def admin_cancel_order(
    order_id: uuid.UUID, data: OrderDecisionIn, admin: Admin, session: DB
) -> OrderOut:
    return await service.admin_cancel_order(session, admin, order_id, data)


@router.get("/api/admin/billing-items")
async def admin_list_items(_: Admin, session: DB) -> list[AdminBillingItemOut]:
    return await service.admin_list_items(session)


@router.patch("/api/admin/billing-items/{code}")
async def admin_update_item(
    code: str, data: BillingItemPatch, admin: Admin, session: DB
) -> AdminBillingItemOut:
    return await service.admin_update_item(session, admin, code, data)
