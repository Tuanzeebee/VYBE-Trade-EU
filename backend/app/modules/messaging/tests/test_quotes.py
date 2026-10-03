"""U8: báo giá RFQ qua API — seller báo giá, buyer chấp nhận / từ chối, không lộ dữ liệu chéo."""

import datetime as dt
from typing import Any

from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.tests.helpers import login_as
from app.modules.messaging.tests.conftest import make_buyer, make_exporter, rfq_body
from app.modules.messaging.tests.test_conversations import as_user

IN_30_DAYS = (dt.date.today() + dt.timedelta(days=30)).isoformat()


def quote_body(**over: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "unit_price": "2.35",
        "currency": "EUR",
        "incoterm": "FOB",
        "named_place": "Cát Lái, TP.HCM",
        "deposit_percent": 30,
        "balance_terms": "against_bl_copy",
        "lead_time_days": 21,
        "valid_until": IN_30_DAYS,
        "notes": "Đóng túi 1 kg, 20 tấn/container.",
    }
    body.update(over)
    return body


async def rfq_between(client: AsyncClient, session: AsyncSession) -> str:
    """Exporter exp@x.vn nhận một RFQ của buyer@x.de; kết thúc ở phiên exporter."""
    _, product_id = await make_exporter(client, session)
    await make_buyer(client)
    await as_user(client, "buyer", "buyer@x.de")
    rfq_id = str((await client.post("/api/buyer/rfqs", json=rfq_body(product_id))).json()["id"])
    await as_user(client, "exporter", "exp@x.vn")
    return rfq_id


async def send_quote(client: AsyncClient, rfq_id: str, **over: Any) -> Any:
    return await client.post(f"/api/exporter/rfqs/{rfq_id}/quotes", json=quote_body(**over))


async def test_seller_quotes_and_buyer_accepts(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    rfq_id = await rfq_between(api_client, db_session)
    r = await send_quote(api_client, rfq_id)
    assert r.status_code == 201, r.text
    quote = r.json()
    # quantity / unit lấy theo RFQ (500.50 kg); tổng và cọc tính bằng Decimal.
    assert (quote["quantity"], quote["unit"]) == ("500.50", "kg")
    assert (quote["total_amount"], quote["deposit_amount"]) == ("1176.18", "352.85")
    assert (quote["status"], quote["incoterm"], quote["named_place"]) == (
        "sent",
        "FOB",
        "Cát Lái, TP.HCM",
    )
    assert (await api_client.get(f"/api/me/rfqs/{rfq_id}")).json()["status"] == "quoted"

    await as_user(api_client, "buyer", "buyer@x.de")
    listed = (await api_client.get(f"/api/me/rfqs/{rfq_id}/quotes")).json()
    assert [q["id"] for q in listed] == [quote["id"]]
    decided = await api_client.post(
        f"/api/buyer/quotes/{quote['id']}/decision", json={"decision": "accept"}
    )
    assert decided.status_code == 200, decided.text
    assert decided.json()["status"] == "accepted" and decided.json()["decided_at"]

    await as_user(api_client, "exporter", "exp@x.vn")
    r = await send_quote(api_client, rfq_id)
    assert r.status_code == 409 and r.json()["error"]["code"] == "quote_already_accepted"


async def test_new_quote_supersedes_the_open_one_and_decline_keeps_reason(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    rfq_id = await rfq_between(api_client, db_session)
    first = (await send_quote(api_client, rfq_id)).json()
    second = (await send_quote(api_client, rfq_id, unit_price="2.20")).json()
    await as_user(api_client, "buyer", "buyer@x.de")
    listed = (await api_client.get(f"/api/me/rfqs/{rfq_id}/quotes")).json()
    assert [(q["id"], q["status"]) for q in listed] == [
        (second["id"], "sent"),
        (first["id"], "superseded"),
    ]
    r = await api_client.post(
        f"/api/buyer/quotes/{first['id']}/decision", json={"decision": "accept"}
    )
    assert r.status_code == 409 and r.json()["error"]["code"] == "invalid_quote_transition"
    r = await api_client.post(
        f"/api/buyer/quotes/{second['id']}/decision",
        json={"decision": "decline", "reason": "  Giá cao hơn ngân sách  "},
    )
    assert (r.json()["status"], r.json()["decision_reason"]) == (
        "declined",
        "Giá cao hơn ngân sách",
    )
    await as_user(api_client, "exporter", "exp@x.vn")
    assert (await send_quote(api_client, rfq_id, unit_price="2.05")).status_code == 201


async def test_expired_quote_cannot_be_accepted_and_seller_can_withdraw(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    rfq_id = await rfq_between(api_client, db_session)
    quote = (await send_quote(api_client, rfq_id)).json()
    await db_session.execute(
        text("UPDATE rfq_quotes SET valid_until = current_date - 1 WHERE id = CAST(:id AS uuid)"),
        {"id": quote["id"]},
    )
    db_session.expire_all()
    await as_user(api_client, "buyer", "buyer@x.de")
    assert (await api_client.get(f"/api/me/rfqs/{rfq_id}/quotes")).json()[0]["status"] == "expired"
    r = await api_client.post(
        f"/api/buyer/quotes/{quote['id']}/decision", json={"decision": "accept"}
    )
    assert r.status_code == 409 and r.json()["error"]["code"] == "quote_expired"
    await as_user(api_client, "exporter", "exp@x.vn")
    r = await api_client.post(f"/api/exporter/quotes/{quote['id']}/withdraw")
    assert r.status_code == 200 and r.json()["status"] == "withdrawn"


async def test_invalid_terms_are_rejected(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    rfq_id = await rfq_between(api_client, db_session)
    cases: list[tuple[dict[str, Any], str]] = [
        ({"deposit_percent": 100, "balance_terms": "lc_at_sight"}, "balance_terms_mismatch"),
        ({"deposit_percent": 30, "balance_terms": "none"}, "balance_terms_mismatch"),
        ({"valid_until": dt.date.today().replace(year=2020).isoformat()}, "valid_until_in_past"),
    ]
    for over, code in cases:
        r = await send_quote(api_client, rfq_id, **over)
        assert r.status_code == 422 and r.json()["error"]["code"] == code, (over, r.text)
    bad: list[dict[str, Any]] = [{"unit_price": 2.35}, {"unit_price": "0"}, {"lead_time_days": 0}]
    for over in bad:
        assert (await send_quote(api_client, rfq_id, **over)).status_code == 422
    assert (
        await send_quote(api_client, rfq_id, deposit_percent=100, balance_terms="none")
    ).status_code == 201


async def test_closed_rfq_cannot_be_quoted(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    rfq_id = await rfq_between(api_client, db_session)
    await api_client.patch(f"/api/exporter/rfqs/{rfq_id}/status", json={"status": "closed"})
    r = await send_quote(api_client, rfq_id)
    assert r.status_code == 409 and r.json()["error"]["code"] == "rfq_closed"


async def test_outsiders_and_wrong_side_get_404(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    rfq_id = await rfq_between(api_client, db_session)
    quote_id = (await send_quote(api_client, rfq_id)).json()["id"]
    # Seller không tự chấp nhận (route chỉ cho buyer), buyer không rút được.
    assert (
        await api_client.post(f"/api/buyer/quotes/{quote_id}/decision", json={"decision": "accept"})
    ).status_code == 403
    await as_user(api_client, "buyer", "buyer@x.de")
    assert (await api_client.post(f"/api/exporter/quotes/{quote_id}/withdraw")).status_code == 403

    await make_exporter(api_client, db_session, "other@x.vn", legal_name="Công ty Khác")
    await as_user(api_client, "exporter", "other@x.vn")
    assert (await send_quote(api_client, rfq_id)).status_code == 404
    assert (await api_client.get(f"/api/me/rfqs/{rfq_id}/quotes")).status_code == 404
    assert (await api_client.post(f"/api/exporter/quotes/{quote_id}/withdraw")).status_code == 404

    await make_buyer(api_client, "other@x.de", legal_name="Other Foods BV", country="NL")
    await as_user(api_client, "buyer", "other@x.de")
    assert (await api_client.get(f"/api/me/rfqs/{rfq_id}/quotes")).status_code == 404
    r = await api_client.post(f"/api/buyer/quotes/{quote_id}/decision", json={"decision": "accept"})
    assert r.status_code == 404


async def test_quote_routes_need_a_session(api_client: AsyncClient) -> None:
    nil = "00000000-0000-0000-0000-000000000000"
    for method, url in [
        ("post", f"/api/exporter/rfqs/{nil}/quotes"),
        ("get", f"/api/me/rfqs/{nil}/quotes"),
        ("post", f"/api/buyer/quotes/{nil}/decision"),
        ("post", f"/api/exporter/quotes/{nil}/withdraw"),
    ]:
        assert (await api_client.request(method, url)).status_code == 401


async def test_quote_notifications_reach_the_other_side(
    api_client: AsyncClient, db_session: AsyncSession, notifications_on: list[dict[str, Any]]
) -> None:
    rfq_id = await rfq_between(api_client, db_session)
    quote_id = (await send_quote(api_client, rfq_id)).json()["id"]
    await as_user(api_client, "buyer", "buyer@x.de")
    events = [n["payload"]["event"] for n in (await api_client.get("/api/me/notifications")).json()]
    assert events == ["quote_sent"]  # một thông báo, không kèm thông báo đổi trạng thái RFQ
    await api_client.post(f"/api/buyer/quotes/{quote_id}/decision", json={"decision": "accept"})
    await as_user(api_client, "exporter", "exp@x.vn")
    items = (await api_client.get("/api/me/notifications")).json()
    assert items[0]["payload"]["event"] == "quote_accepted"
    assert items[0]["payload"]["quote_id"] == quote_id
    await login_as(api_client, "exporter", "exp@x.vn")
