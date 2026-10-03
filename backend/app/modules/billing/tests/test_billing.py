"""U19: thanh toán tối giản — đặt mua, hướng dẫn chuyển khoản, admin xác nhận (idempotent, audit),
cấp và gia hạn quyền dùng, quyền mở khoá tính năng ở module khác, phân quyền và IDOR."""

import datetime as dt
import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import entitlements
from app.core.audit import AuditLog
from app.modules.auth.service import create_admin
from app.modules.billing import service
from app.modules.billing.logic import (
    REFERENCE_ALPHABET,
    entitlement_window,
    new_reference,
    next_status,
)
from app.modules.billing.models import Entitlement
from app.modules.companies.tests.helpers import PASSWORD, company_body, login_as
from app.modules.messaging.tests.conftest import (  # noqa: F401 — dùng lại fixture
    make_buyer,
    notifications_on,
)
from app.modules.notifications.models import Notification

ORDERS = "/api/me/orders"
NOW = dt.datetime(2026, 10, 2, 9, tzinfo=dt.UTC)


# ── Hàm thuần ─────────────────────────────────────────────────────────────────
def test_reference_is_readable_and_unambiguous() -> None:
    ref = new_reference()
    assert ref.startswith("VYBE") and len(ref) == 10
    assert all(c in REFERENCE_ALPHABET for c in ref[4:])
    assert not set("01OIL") & set(ref[4:])


def test_order_transitions() -> None:
    assert next_status("pending", "confirm_payment") == "paid"
    assert next_status("pending", "cancel") == "cancelled"
    assert next_status("paid", "cancel") is None
    assert next_status("cancelled", "confirm_payment") is None


def test_renewal_continues_from_current_expiry() -> None:
    assert entitlement_window(NOW, 90, None) == (NOW, NOW + dt.timedelta(days=90))
    later = NOW + dt.timedelta(days=30)
    assert entitlement_window(NOW, 90, later) == (later, later + dt.timedelta(days=90))
    expired = NOW - dt.timedelta(days=1)
    assert entitlement_window(NOW, 90, expired)[0] == NOW  # quyền cũ đã hết → tính từ hôm nay
    assert entitlement_window(NOW, None, None) == (NOW, None)


# ── API ───────────────────────────────────────────────────────────────────────
async def exporter(client: AsyncClient, email: str = "exp@x.vn") -> str:
    await client.post("/api/auth/logout")
    await login_as(client, "exporter", email)
    r = await client.post("/api/me/company", json=company_body())
    if r.status_code == 201:
        return str(r.json()["id"])
    return str((await client.get("/api/me/company")).json()["id"])


async def admin(client: AsyncClient, session: AsyncSession) -> None:
    await client.post("/api/auth/logout")
    exists = await session.scalar(text("SELECT 1 FROM users WHERE email = 'admin@evfta.eu'"))
    if not exists:
        await create_admin(session, "admin@evfta.eu", PASSWORD)
    login = {"email": "admin@evfta.eu", "password": PASSWORD}
    assert (await client.post("/api/auth/login", json=login)).status_code == 200


async def order(client: AsyncClient, item: str = "gtm_report_full", **over: Any) -> dict[str, Any]:
    r = await client.post(ORDERS, json={"item_code": item, **over})
    assert r.status_code == 201, r.text
    return dict(r.json())


async def test_pricing_is_public_and_marked_placeholder(api_client: AsyncClient) -> None:
    r = await api_client.get("/api/public/billing-items")
    assert r.status_code == 200
    items = r.json()
    assert [i["code"] for i in items] == [
        "verification_enhanced",
        "gtm_report_full",
        "profile_viewers_full",
        "products_plus",
    ]
    assert all(i["price_is_placeholder"] and i["audience"] == "exporter" for i in items)
    assert items[1]["price"] == "1500000.00" and items[1]["duration_days"] == 90


async def test_order_shows_bank_transfer_and_is_not_duplicated(api_client: AsyncClient) -> None:
    await exporter(api_client)
    invoice = {"company_name": "Công ty TNHH Nông Sản Việt", "tax_code": "0314892345"}
    first = await order(api_client, invoice_info=invoice)
    assert (first["status"], first["amount"], first["currency"]) == ("pending", "1500000.00", "VND")
    bank = first["bank_transfer"]
    assert bank["transfer_note"] == first["reference"] and bank["is_demo_account"] is True
    assert first["invoice_info"]["tax_code"] == "0314892345"
    again = await order(api_client)
    assert again["id"] == first["id"]  # đơn đang chờ cùng mục → trả lại, không tạo trùng
    assert [o["id"] for o in (await api_client.get(ORDERS)).json()] == [first["id"]]
    assert (await api_client.get(f"{ORDERS}/{first['id']}")).json()["reference"] == first[
        "reference"
    ]
    r = await api_client.post(ORDERS, json={"item_code": "khong_co"})
    assert r.status_code == 404


async def test_confirm_payment_grants_entitlement_once(
    api_client: AsyncClient,
    db_session: AsyncSession,
    notifications_on: list[dict[str, Any]],  # noqa: F811
) -> None:
    company_id = uuid.UUID(await exporter(api_client))
    placed = await order(api_client)
    assert not await entitlements.has_feature(db_session, company_id, "gtm_report_full")
    await admin(api_client, db_session)
    pending = (await api_client.get("/api/admin/orders", params={"status": "pending"})).json()
    assert [(o["reference"], o["company_name"]) for o in pending] == [
        (placed["reference"], company_body()["legal_name"])
    ]
    url = f"/api/admin/orders/{placed['id']}/confirm-payment"
    first = await api_client.post(url, json={"note": "Sao kê VCB 02/10"})
    assert first.status_code == 200, first.text
    assert (first.json()["status"], first.json()["bank_transfer"]) == ("paid", None)
    second = await api_client.post(url, json={})
    assert (second.status_code, second.json()["paid_at"]) == (200, first.json()["paid_at"])

    db_session.expire_all()
    grants = (await db_session.scalars(select(Entitlement))).all()
    assert len(grants) == 1 and grants[0].feature == "gtm_report_full"
    assert grants[0].valid_until is not None
    assert grants[0].valid_until - grants[0].valid_from == dt.timedelta(days=90)
    assert await entitlements.has_feature(db_session, company_id, "gtm_report_full")
    assert not await entitlements.has_feature(db_session, company_id, "profile_viewers_full")
    audits = await db_session.scalar(
        select(func.count())
        .select_from(AuditLog)
        .where(AuditLog.action_type == "order.confirm_payment")
    )
    assert audits == 1
    note = await db_session.scalar(select(Notification).where(Notification.type == "order"))
    assert note is not None and note.payload["reference"] == placed["reference"]

    await exporter(api_client)
    mine = (await api_client.get("/api/me/entitlements")).json()
    assert [e["feature"] for e in mine] == ["gtm_report_full"]
    r = await api_client.post(f"{ORDERS}/{placed['id']}/cancel")
    assert (r.status_code, r.json()["error"]["code"]) == (409, "order_not_pending")


async def test_renewal_extends_and_cancelled_orders_cannot_be_paid(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await exporter(api_client)
    first = await order(api_client, "profile_viewers_full")
    await admin(api_client, db_session)
    await api_client.post(f"/api/admin/orders/{first['id']}/confirm-payment", json={})
    await exporter(api_client)
    second = await order(api_client, "profile_viewers_full")
    assert second["id"] != first["id"]
    await admin(api_client, db_session)
    await api_client.post(f"/api/admin/orders/{second['id']}/confirm-payment", json={})
    db_session.expire_all()
    grants = (await db_session.scalars(select(Entitlement).order_by(Entitlement.valid_from))).all()
    assert grants[1].valid_from == grants[0].valid_until  # nối tiếp, không mất ngày đã trả

    await exporter(api_client)
    third = await order(api_client)
    cancelled = await api_client.post(f"{ORDERS}/{third['id']}/cancel")
    assert cancelled.json()["status"] == "cancelled"
    await admin(api_client, db_session)
    r = await api_client.post(f"/api/admin/orders/{third['id']}/confirm-payment", json={})
    assert (r.status_code, r.json()["error"]["code"]) == (409, "order_not_pending")


async def test_roles_and_ownership(api_client: AsyncClient, db_session: AsyncSession) -> None:
    assert (await api_client.get(ORDERS)).status_code == 401
    assert (await api_client.post(ORDERS, json={"item_code": "gtm_report_full"})).status_code == 401
    await exporter(api_client, "a@x.vn")
    mine = await order(api_client)
    await exporter(api_client, "b@x.vn")
    assert (await api_client.get(f"{ORDERS}/{mine['id']}")).status_code == 404
    assert (await api_client.post(f"{ORDERS}/{mine['id']}/cancel")).status_code == 404
    assert (await api_client.get(ORDERS)).json() == []
    assert (await api_client.get("/api/admin/orders")).status_code == 403
    confirm = await api_client.post(f"/api/admin/orders/{mine['id']}/confirm-payment", json={})
    assert confirm.status_code == 403
    await api_client.post("/api/auth/logout")
    await make_buyer(api_client, "buyer@x.de")
    await login_as(api_client, "buyer", "buyer@x.de")
    r = await api_client.post(ORDERS, json={"item_code": "gtm_report_full"})
    assert (r.status_code, r.json()["error"]["code"]) == (403, "item_not_for_role")
    await admin(api_client, db_session)
    assert (await api_client.post(ORDERS, json={"item_code": "gtm_report_full"})).status_code == 403


async def test_admin_edits_price_with_audit(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await admin(api_client, db_session)
    url = "/api/admin/billing-items/gtm_report_full"
    assert (await api_client.patch(url, json={"price": 990000})).status_code == 422  # số JSON
    r = await api_client.patch(url, json={"price": "990000", "price_is_placeholder": False})
    assert r.status_code == 200, r.text
    assert (r.json()["price"], r.json()["price_is_placeholder"]) == ("990000.00", False)
    r = await api_client.patch(
        "/api/admin/billing-items/profile_viewers_full", json={"is_active": False}
    )
    assert r.json()["is_active"] is False
    public = (await api_client.get("/api/public/billing-items")).json()
    assert "profile_viewers_full" not in [i["code"] for i in public]
    audit = await db_session.scalar(select(AuditLog).where(AuditLog.entity_id == "gtm_report_full"))
    assert audit is not None and audit.after_state == {
        "price": "990000",
        "price_is_placeholder": "False",
    }
    await exporter(api_client)
    assert (await api_client.patch(url, json={"price": "1"})).status_code == 403


@pytest.mark.parametrize("paid", [False, True])
async def test_profile_viewers_list_is_capped_without_entitlement(
    api_client: AsyncClient, db_session: AsyncSession, paid: bool
) -> None:
    company_id = uuid.UUID(await exporter(api_client))
    slug = (await api_client.get("/api/me/company")).json()["slug"]
    await db_session.execute(
        text(
            "UPDATE companies SET verification_status = 'verified', verified_at = now() "
            "WHERE id = CAST(:id AS uuid)"
        ),
        {"id": str(company_id)},
    )
    for i in range(5):
        buyer_id = await make_buyer(api_client, f"b{i}@x.de", legal_name=f"Buyer {i} GmbH")
        await db_session.execute(
            text(
                "UPDATE companies SET verification_status = 'verified' WHERE id = CAST(:id AS uuid)"
            ),
            {"id": buyer_id},
        )
        await login_as(api_client, "buyer", f"b{i}@x.de")
        assert (await api_client.post(f"/api/public/companies/{slug}/view")).status_code == 204
        await api_client.post("/api/auth/logout")
    if paid:
        await exporter(api_client)
        placed = await order(api_client, "profile_viewers_full")
        await admin(api_client, db_session)
        await api_client.post(f"/api/admin/orders/{placed['id']}/confirm-payment", json={})
    await exporter(api_client)
    body = (await api_client.get("/api/exporter/profile-viewers")).json()
    assert body["total_views"] == 5
    assert (len(body["viewers"]), body["hidden_viewers"], body["full"]) == (
        (5, 0, True) if paid else (3, 2, False)
    )
    assert await service.has_entitlement(db_session, company_id, "profile_viewers_full") is paid
