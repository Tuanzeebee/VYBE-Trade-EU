"""F1: RFQ có cấu trúc và trạng thái."""

import datetime as dt
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.modules.companies.tests.helpers import login_as
from app.modules.messaging.tests.conftest import make_buyer, make_exporter, rfq_body

URL = "/api/buyer/rfqs"


async def send(client: AsyncClient, product_id: str, email: str = "buyer@x.de", **over: Any) -> Any:
    await login_as(client, "buyer", email)
    return await client.post(URL, json=rfq_body(product_id, **over))


async def as_user(client: AsyncClient, role: str, email: str) -> None:
    await client.post("/api/auth/logout")
    await login_as(client, role, email)


async def test_buyer_sends_all_fields(api_client: AsyncClient, db_session: AsyncSession) -> None:
    """Xong khi F1: buyer gửi đủ trường."""
    exporter_id, product_id = await make_exporter(api_client, db_session)
    buyer_id = await make_buyer(api_client)
    r = await send(api_client, product_id)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["product_id"] == product_id
    assert body["product_name"] == "Gạo thơm Jasmine xuất khẩu"
    assert (body["buyer_company_id"], body["exporter_company_id"]) == (buyer_id, exporter_id)
    assert body["buyer_name"] == "Global Foods Trading GmbH"
    assert body["exporter_name"] == "Công ty TNHH Nông Sản Việt"
    assert (body["quantity"], body["unit"]) == ("500.50", "kg")
    assert (body["target_price"], body["currency"]) == ("2.35", "EUR")
    assert (body["incoterms"], body["destination_country"], body["destination_port"]) == (
        "CIF",
        "DE",
        "Hamburg",
    )
    assert body["required_date"] == (dt.date.today() + dt.timedelta(days=60)).isoformat()
    assert body["message"] == "Cần báo giá 10 container gạo thơm."
    assert body["status"] == "new"


async def test_exporter_delete_of_product_with_rfq_deactivates_it(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Sản phẩm đã có RFQ không xóa cứng được (FK) — chỉ ẩn, RFQ vẫn còn, không lỗi 500."""
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    rfq_id = (await send(api_client, product_id)).json()["id"]
    await as_user(api_client, "exporter", "exp@x.vn")
    assert (await api_client.delete(f"/api/exporter/products/{product_id}")).status_code == 204
    assert (await api_client.get(f"/api/exporter/products/{product_id}")).json()[
        "is_active"
    ] is False
    assert (await api_client.get(f"/api/me/rfqs/{rfq_id}")).status_code == 200


async def test_optional_fields_can_be_omitted(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    r = await send(api_client, product_id, target_price=None, destination_port=None, message=None)
    assert r.status_code == 201, r.text
    assert (r.json()["target_price"], r.json()["destination_port"], r.json()["message"]) == (
        None,
        None,
        None,
    )


async def test_send_requires_buyer_session(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    assert (await api_client.post(URL, json=rfq_body(product_id))).status_code == 401
    await login_as(api_client, "exporter", "exp2@x.vn")
    assert (await api_client.post(URL, json=rfq_body(product_id))).status_code == 403


async def test_buyer_without_company_is_asked_to_create_one(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    r = await send(api_client, product_id, email="nocompany@x.de")
    assert r.status_code == 409 and r.json()["error"]["code"] == "company_required"


@pytest.mark.parametrize(
    "override",
    [
        {"quantity": 500},  # số JSON, phải là chuỗi
        {"quantity": "0"},
        {"quantity": "-5"},
        {"quantity": "1e3"},
        {"target_price": "0"},
        {"target_price": 2.35},
        {"incoterms": "XYZ"},
        {"unit": "  "},
        {"currency": "eur"},
        {"destination_country": "de"},
        {"destination_country": "GER"},
        {"message": "x" * 2001},
        {"unknown_field": 1},
    ],
)
async def test_invalid_input_is_rejected(
    api_client: AsyncClient, db_session: AsyncSession, override: dict[str, Any]
) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    assert (await send(api_client, product_id, **override)).status_code == 422


async def test_required_date_cannot_be_in_the_past_or_absurdly_far(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    utc_today = dt.datetime.now(dt.UTC).date()  # máy chủ tính theo UTC
    yesterday = (utc_today - dt.timedelta(days=1)).isoformat()
    r = await send(api_client, product_id, required_date=yesterday)
    assert r.status_code == 422 and r.json()["error"]["code"] == "required_date_in_past"
    far = (utc_today + dt.timedelta(days=4000)).isoformat()
    assert (await send(api_client, product_id, required_date=far)).status_code == 422
    assert (
        await send(api_client, product_id, required_date=utc_today.isoformat())
    ).status_code == 201


@pytest.mark.parametrize("reason", ["unverified", "hidden", "product_off", "product_pending"])
async def test_cannot_request_a_quote_for_a_product_that_is_not_public(
    api_client: AsyncClient, db_session: AsyncSession, reason: str
) -> None:
    company_id, product_id = await make_exporter(
        api_client, db_session, verified=reason != "unverified"
    )
    if reason == "hidden":
        await db_session.execute(
            text("UPDATE companies SET is_hidden = true WHERE id = :id"), {"id": company_id}
        )
    if reason == "product_off":
        await db_session.execute(text("UPDATE products SET is_active = false"))
    if reason == "product_pending":
        await db_session.execute(text("UPDATE products SET approval_status = 'pending'"))
    await make_buyer(api_client)
    r = await send(api_client, product_id)
    assert r.status_code == 404 and r.json()["error"]["code"] == "product_not_found"


async def test_unknown_product_is_404(api_client: AsyncClient, db_session: AsyncSession) -> None:
    await make_buyer(api_client)
    r = await send(api_client, "00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404


# ── Xem và đổi trạng thái ──────────────────────────────────────────────────
async def test_only_recipient_exporter_changes_status(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    await make_exporter(api_client, db_session, "other@x.vn", legal_name="Công ty khác")
    await make_buyer(api_client)
    rfq_id = (await send(api_client, product_id)).json()["id"]
    path = f"/api/exporter/rfqs/{rfq_id}/status"

    assert (await api_client.patch(path, json={"status": "quoted"})).status_code == 403  # buyer
    await api_client.post("/api/auth/logout")
    assert (await api_client.patch(path, json={"status": "quoted"})).status_code == 401
    await login_as(api_client, "exporter", "other@x.vn")
    assert (await api_client.patch(path, json={"status": "quoted"})).status_code == 404
    await as_user(api_client, "exporter", "exp@x.vn")
    r = await api_client.patch(path, json={"status": "quoted"})
    assert r.status_code == 200 and r.json()["status"] == "quoted"


async def test_buyer_sees_status_change(api_client: AsyncClient, db_session: AsyncSession) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    rfq_id = (await send(api_client, product_id)).json()["id"]
    await as_user(api_client, "exporter", "exp@x.vn")
    await api_client.patch(f"/api/exporter/rfqs/{rfq_id}/status", json={"status": "quoted"})
    await as_user(api_client, "buyer", "buyer@x.de")
    listing = (await api_client.get("/api/me/rfqs")).json()
    assert [(r["id"], r["status"]) for r in listing] == [(rfq_id, "quoted")]
    assert (await api_client.get(f"/api/me/rfqs/{rfq_id}")).json()["status"] == "quoted"


@pytest.mark.parametrize(
    ("start", "target", "allowed"),
    [
        ("new", "viewed", True),
        ("new", "quoted", True),
        ("new", "closed", True),
        ("viewed", "quoted", True),
        ("quoted", "closed", True),
        ("viewed", "new", False),
        ("quoted", "viewed", False),
        ("closed", "quoted", False),
        ("new", "new", False),
    ],
)
async def test_status_transitions(
    api_client: AsyncClient, db_session: AsyncSession, start: str, target: str, allowed: bool
) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    rfq_id = (await send(api_client, product_id)).json()["id"]
    await db_session.execute(
        text("UPDATE rfqs SET status = CAST(:s AS rfq_status) WHERE id = CAST(:id AS uuid)"),
        {"s": start, "id": rfq_id},
    )
    await as_user(api_client, "exporter", "exp@x.vn")
    r = await api_client.patch(f"/api/exporter/rfqs/{rfq_id}/status", json={"status": target})
    assert r.status_code == (200 if allowed else 409), r.text


async def test_exporter_opening_a_new_rfq_marks_it_viewed(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    rfq_id = (await send(api_client, product_id)).json()["id"]
    # Buyer xem không đổi trạng thái.
    assert (await api_client.get(f"/api/me/rfqs/{rfq_id}")).json()["status"] == "new"
    await as_user(api_client, "exporter", "exp@x.vn")
    assert (await api_client.get(f"/api/me/rfqs/{rfq_id}")).json()["status"] == "viewed"
    await api_client.patch(f"/api/exporter/rfqs/{rfq_id}/status", json={"status": "quoted"})
    assert (await api_client.get(f"/api/me/rfqs/{rfq_id}")).json()[
        "status"
    ] == "quoted"  # không lùi


async def test_lists_are_scoped_to_the_callers_company(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    await make_exporter(api_client, db_session, "other@x.vn", legal_name="Công ty khác")
    await make_buyer(api_client)
    await make_buyer(api_client, "buyer2@x.de", legal_name="Buyer Two GmbH")
    rfq_id = (await send(api_client, product_id)).json()["id"]

    async def ids(role: str, email: str) -> list[str]:
        await as_user(api_client, role, email)
        return [r["id"] for r in (await api_client.get("/api/me/rfqs")).json()]

    assert await ids("buyer", "buyer@x.de") == [rfq_id]
    assert await ids("exporter", "exp@x.vn") == [rfq_id]
    assert await ids("buyer", "buyer2@x.de") == []
    assert await ids("exporter", "other@x.vn") == []
    # Người ngoài cuộc không đọc được chi tiết.
    assert (await api_client.get(f"/api/me/rfqs/{rfq_id}")).status_code == 404

    await as_user(api_client, "buyer", "buyer@x.de")
    assert (await api_client.get("/api/me/rfqs", params={"status": "closed"})).json() == []
    assert len((await api_client.get("/api/me/rfqs", params={"status": "new"})).json()) == 1
    assert (await api_client.get("/api/me/rfqs", params={"status": "bogus"})).status_code == 422
    assert (await api_client.get("/api/me/rfqs", params={"limit": 0})).status_code == 422


async def test_rfq_endpoints_need_a_session(api_client: AsyncClient) -> None:
    for method, url in [
        ("get", "/api/me/rfqs"),
        ("get", "/api/me/rfqs/00000000-0000-0000-0000-000000000000"),
    ]:
        assert (await api_client.request(method, url)).status_code == 401


# ── Giới hạn theo ngày ─────────────────────────────────────────────────────
async def test_rfq_daily_limit_is_lower_for_unverified_buyers(
    api_client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "rfq_daily_limit_unverified", 2)
    monkeypatch.setattr(settings, "rfq_daily_limit_verified", 3)
    _, product_id = await make_exporter(api_client, db_session)
    buyer_id = await make_buyer(api_client)
    assert (await send(api_client, product_id)).status_code == 201
    assert (await send(api_client, product_id)).status_code == 201
    r = await send(api_client, product_id)
    assert r.status_code == 429 and r.json()["error"]["code"] == "rfq_daily_limit"

    await db_session.execute(
        text("UPDATE companies SET verification_status = 'verified' WHERE id = CAST(:id AS uuid)"),
        {"id": buyer_id},
    )
    assert (await send(api_client, product_id)).status_code == 201  # ngưỡng của buyer đã xác minh
    assert (await send(api_client, product_id)).status_code == 429


async def test_rfq_daily_limit_counts_a_rolling_24_hours(
    api_client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(get_settings(), "rfq_daily_limit_unverified", 1)
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    assert (await send(api_client, product_id)).status_code == 201
    assert (await send(api_client, product_id)).status_code == 429
    await db_session.execute(text("UPDATE rfqs SET created_at = now() - interval '25 hours'"))
    assert (await send(api_client, product_id)).status_code == 201


# ── Thông báo ──────────────────────────────────────────────────────────────
async def test_rfq_triggers_notification_and_email(
    api_client: AsyncClient,
    db_session: AsyncSession,
    notifications_on: list[dict[str, Any]],
) -> None:
    exporter_id, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    rfq_id = (await send(api_client, product_id)).json()["id"]

    assert notifications_on == [
        {
            "type": "rfq",
            "company_id": exporter_id,
            "context": {
                "buyer_name": "Global Foods Trading GmbH",
                "product_name": "Gạo thơm Jasmine xuất khẩu",
            },
        }
    ]
    await as_user(api_client, "exporter", "exp@x.vn")
    items = (await api_client.get("/api/me/notifications")).json()
    assert len(items) == 1
    assert (items[0]["type"], items[0]["link"]) == ("rfq", "/exporter?tab=rfq")
    assert items[0]["payload"]["rfq_id"] == rfq_id and items[0]["payload"]["event"] == "created"


async def test_buyer_is_notified_when_the_exporter_changes_status(
    api_client: AsyncClient,
    db_session: AsyncSession,
    notifications_on: list[dict[str, Any]],
) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    rfq_id = (await send(api_client, product_id)).json()["id"]
    await as_user(api_client, "exporter", "exp@x.vn")
    await api_client.patch(f"/api/exporter/rfqs/{rfq_id}/status", json={"status": "quoted"})
    await as_user(api_client, "buyer", "buyer@x.de")
    items = (await api_client.get("/api/me/notifications")).json()
    assert len(items) == 1
    assert items[0]["payload"]["status"] == "quoted" and items[0]["link"] == "/buyer/rfqs"
    # Đổi trạng thái không gửi email (chỉ thông báo trong ứng dụng).
    assert [e["type"] for e in notifications_on] == ["rfq"]


async def test_default_policy_lets_unverified_buyers_send_within_a_lower_limit(
    api_client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    """U6/ADR-0004: buyer không bị chặn sau xác minh — chưa xác minh 3 RFQ/24h, đã xác minh 5."""
    settings = get_settings()
    from app.core.config import Settings

    fresh = Settings(_env_file=None)
    assert (fresh.rfq_daily_limit_verified, fresh.rfq_daily_limit_unverified) == (5, 3)
    monkeypatch.setattr(settings, "rfq_daily_limit_verified", 5)
    monkeypatch.setattr(settings, "rfq_daily_limit_unverified", 3)
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    for _ in range(3):
        assert (await send(api_client, product_id)).status_code == 201
    r = await send(api_client, product_id)
    assert r.status_code == 429 and r.json()["error"]["code"] == "rfq_daily_limit"


async def test_po_can_still_block_unverified_buyers_with_a_zero_limit(
    api_client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Hạn mức 0 chỉ khi PO yêu cầu: buyer chưa xác minh nhận 403 rõ lý do."""
    settings = get_settings()
    monkeypatch.setattr(settings, "rfq_daily_limit_verified", 5)
    monkeypatch.setattr(settings, "rfq_daily_limit_unverified", 0)
    _, product_id = await make_exporter(api_client, db_session)
    buyer_id = await make_buyer(api_client)
    r = await send(api_client, product_id)
    assert r.status_code == 403 and r.json()["error"]["code"] == "buyer_not_verified"
    count = await db_session.execute(text("SELECT count(*) FROM rfqs"))
    assert count.scalar_one() == 0

    await db_session.execute(
        text("UPDATE companies SET verification_status = 'verified' WHERE id = CAST(:id AS uuid)"),
        {"id": buyer_id},
    )
    for _ in range(5):
        assert (await send(api_client, product_id)).status_code == 201
    r = await send(api_client, product_id)
    assert r.status_code == 429 and r.json()["error"]["code"] == "rfq_daily_limit"


# ── U6: seller thấy trạng thái buyer, buyer thấy hạn mức còn lại ─────────────
async def test_seller_sees_whether_the_buyer_is_verified(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    buyer_id = await make_buyer(api_client)
    rfq_id = (await send(api_client, product_id)).json()["id"]
    await as_user(api_client, "exporter", "exp@x.vn")
    assert (await api_client.get(f"/api/me/rfqs/{rfq_id}")).json()["buyer_verified"] is False
    await db_session.execute(
        text("UPDATE companies SET verification_status = 'verified' WHERE id = CAST(:id AS uuid)"),
        {"id": buyer_id},
    )
    db_session.expire_all()  # UPDATE thô: bỏ bản Company cũ trong phiên dùng chung của test
    assert (await api_client.get("/api/me/rfqs")).json()[0]["buyer_verified"] is True


async def test_buyer_sees_remaining_quota(
    api_client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(get_settings(), "rfq_daily_limit_unverified", 3)
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    await login_as(api_client, "buyer", "buyer@x.de")
    quota = (await api_client.get("/api/buyer/rfq-quota")).json()
    assert quota == {"limit": 3, "used": 0, "remaining": 3, "verified": False}
    await send(api_client, product_id)
    quota = (await api_client.get("/api/buyer/rfq-quota")).json()
    assert (quota["used"], quota["remaining"]) == (1, 2)


async def test_rfq_quota_is_buyer_only(api_client: AsyncClient, db_session: AsyncSession) -> None:
    assert (await api_client.get("/api/buyer/rfq-quota")).status_code == 401
    await login_as(api_client, "exporter", "exp9@x.vn")
    assert (await api_client.get("/api/buyer/rfq-quota")).status_code == 403
    await as_user(api_client, "buyer", "nocompany@x.de")
    r = await api_client.get("/api/buyer/rfq-quota")
    assert r.status_code == 409 and r.json()["error"]["code"] == "company_required"


# ── N4: Request nhiều loại ───────────────────────────────────────────────────
def request_body(product_id: str, kind: str, **over: Any) -> dict[str, Any]:
    """Body cho loại Request không phải báo giá: chỉ cần sản phẩm, loại và nội dung."""
    body: dict[str, Any] = {"product_id": product_id, "kind": kind, "message": "Hẹn họp 15 phút"}
    body.update(over)
    return body


async def test_rfq_kind_defaults_to_quote(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    r = await send(api_client, product_id)
    assert r.status_code == 201, r.text
    assert r.json()["kind"] == "quote"


@pytest.mark.parametrize("kind", ["meeting", "packaging", "quality", "other"])
async def test_non_quote_request_needs_message_not_quantity(
    api_client: AsyncClient, db_session: AsyncSession, kind: str
) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    await login_as(api_client, "buyer", "buyer@x.de")
    r = await api_client.post(URL, json=request_body(product_id, kind))
    assert r.status_code == 201, r.text
    assert r.json()["kind"] == kind
    assert r.json()["message"] == "Hẹn họp 15 phút"


async def test_non_quote_request_without_message_is_rejected(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    await login_as(api_client, "buyer", "buyer@x.de")
    for message in (None, "", "   "):
        body = request_body(product_id, "packaging", message=message)
        assert (await api_client.post(URL, json=body)).status_code == 422


async def test_quote_request_still_requires_quantity(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    await login_as(api_client, "buyer", "buyer@x.de")
    body = rfq_body(product_id)
    del body["quantity"]
    assert (await api_client.post(URL, json=body)).status_code == 422


async def test_unknown_kind_is_rejected(api_client: AsyncClient, db_session: AsyncSession) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    await login_as(api_client, "buyer", "buyer@x.de")
    assert (await api_client.post(URL, json=request_body(product_id, "gift"))).status_code == 422


async def test_exporter_cannot_quote_a_non_quote_request(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    from app.modules.messaging.tests.test_quotes import quote_body

    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    await login_as(api_client, "buyer", "buyer@x.de")
    created = await api_client.post(URL, json=request_body(product_id, "quality"))
    rfq_id = created.json()["id"]
    await as_user(api_client, "exporter", "exp@x.vn")
    r = await api_client.post(f"/api/exporter/rfqs/{rfq_id}/quotes", json=quote_body())
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "rfq_not_quotable"
