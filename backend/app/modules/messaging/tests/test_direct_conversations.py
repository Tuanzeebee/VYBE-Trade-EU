"""U7: nhắn tin trực tiếp không cần RFQ — hội thoại theo cặp công ty, chống spam, không lộ dữ liệu."""

from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.modules.companies.tests.helpers import login_as
from app.modules.messaging.tests.conftest import make_buyer, make_exporter
from app.modules.messaging.tests.test_conversations import CONVERSATIONS, as_user, read, say


async def slug_of(session: AsyncSession, company_id: str) -> str:
    found = await session.scalar(
        text("SELECT slug FROM companies WHERE id = CAST(:id AS uuid)"), {"id": company_id}
    )
    assert found
    return str(found)


async def start(
    client: AsyncClient, slug: str, body: str = "Chào anh chị, cho tôi hỏi giá."
) -> Any:
    return await client.post(CONVERSATIONS, json={"supplier_slug": slug, "body": body})


async def test_buyer_messages_a_supplier_without_rfq_and_supplier_replies(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    exporter_id, _ = await make_exporter(api_client, db_session)
    buyer_id = await make_buyer(api_client)
    slug = await slug_of(db_session, exporter_id)
    await as_user(api_client, "buyer", "buyer@x.de")
    r = await start(api_client, slug)
    assert r.status_code == 201, r.text
    conversation = r.json()
    assert conversation["rfq_id"] is None and conversation["product_name"] == ""
    assert conversation["counterpart_company_id"] == exporter_id
    assert conversation["counterpart_name"] == "Công ty TNHH Nông Sản Việt"
    assert conversation["counterpart_verified"] is True
    assert conversation["last_message"] == "Chào anh chị, cho tôi hỏi giá."

    await as_user(api_client, "exporter", "exp@x.vn")
    mine = (await api_client.get(CONVERSATIONS)).json()
    assert [(c["id"], c["counterpart_company_id"]) for c in mine] == [
        (conversation["id"], buyer_id)
    ]
    assert mine[0]["counterpart_verified"] is False and mine[0]["unread_count"] == 1
    assert (
        await say(api_client, conversation["id"], "Chào anh, giá FOB 2.1 EUR/kg.")
    ).status_code == 201

    await as_user(api_client, "buyer", "buyer@x.de")
    bodies = [m["body"] for m in await read(api_client, conversation["id"])]
    assert bodies == ["Chào anh chị, cho tôi hỏi giá.", "Chào anh, giá FOB 2.1 EUR/kg."]


async def test_second_message_reuses_the_pair_conversation_in_either_direction(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    a_id, _ = await make_exporter(api_client, db_session, "a@x.vn", legal_name="Công ty A")
    b_id, _ = await make_exporter(
        api_client, db_session, "b@x.vn", legal_name="Công ty B Logistics"
    )
    await as_user(api_client, "exporter", "a@x.vn")
    first = (await start(api_client, await slug_of(db_session, b_id))).json()
    again = (await start(api_client, await slug_of(db_session, b_id), "Nhắc lại")).json()
    assert again["id"] == first["id"]
    await as_user(api_client, "exporter", "b@x.vn")
    reverse = (await start(api_client, await slug_of(db_session, a_id), "Trả lời")).json()
    assert reverse["id"] == first["id"]
    count = await db_session.scalar(text("SELECT count(*) FROM conversations"))
    assert count == 1
    assert len(await read(api_client, first["id"])) == 3


async def test_rfq_conversation_and_direct_conversation_coexist(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    exporter_id, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    await as_user(api_client, "buyer", "buyer@x.de")
    from app.modules.messaging.tests.conftest import rfq_body

    assert (await api_client.post("/api/buyer/rfqs", json=rfq_body(product_id))).status_code == 201
    direct = (await start(api_client, await slug_of(db_session, exporter_id))).json()
    kinds = sorted(c["rfq_id"] is None for c in (await api_client.get(CONVERSATIONS)).json())
    assert kinds == [False, True]
    assert direct["rfq_id"] is None


@pytest.mark.parametrize("state", ["unverified", "hidden", "expired"])
async def test_only_publicly_listed_suppliers_can_be_messaged(
    api_client: AsyncClient, db_session: AsyncSession, state: str
) -> None:
    exporter_id, _ = await make_exporter(api_client, db_session, verified=state != "unverified")
    if state == "hidden":
        await db_session.execute(
            text("UPDATE companies SET is_hidden = true WHERE id = CAST(:id AS uuid)"),
            {"id": exporter_id},
        )
    if state == "expired":
        await db_session.execute(
            text(
                "UPDATE companies SET expires_at = now() - interval '1 day' "
                "WHERE id = CAST(:id AS uuid)"
            ),
            {"id": exporter_id},
        )
    await make_buyer(api_client)
    await as_user(api_client, "buyer", "buyer@x.de")
    r = await start(api_client, await slug_of(db_session, exporter_id))
    assert r.status_code == 404 and r.json()["error"]["code"] == "supplier_not_found"


async def test_buyers_are_not_cold_messaged_and_self_message_is_rejected(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    exporter_id, _ = await make_exporter(api_client, db_session)
    buyer_id = await make_buyer(api_client)
    await as_user(api_client, "exporter", "exp@x.vn")
    r = await start(api_client, await slug_of(db_session, buyer_id))
    assert r.status_code == 404  # buyer không nằm trong danh bạ
    r = await start(api_client, await slug_of(db_session, exporter_id))
    assert r.status_code == 422 and r.json()["error"]["code"] == "cannot_message_self"


async def test_new_conversations_per_day_are_limited_but_existing_ones_are_not(
    api_client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(get_settings(), "direct_conversation_daily_limit", 1)
    a_id, _ = await make_exporter(api_client, db_session, "a@x.vn", legal_name="Công ty A")
    b_id, _ = await make_exporter(api_client, db_session, "b@x.vn", legal_name="Công ty B")
    await make_buyer(api_client)
    await as_user(api_client, "buyer", "buyer@x.de")
    assert (await start(api_client, await slug_of(db_session, a_id))).status_code == 201
    r = await start(api_client, await slug_of(db_session, b_id))
    assert r.status_code == 429 and r.json()["error"]["code"] == "conversation_daily_limit"
    assert (
        await start(api_client, await slug_of(db_session, a_id), "Nhắn tiếp")
    ).status_code == 201
    await db_session.execute(
        text("UPDATE conversations SET created_at = now() - interval '25 hours'")
    )
    assert (await start(api_client, await slug_of(db_session, b_id))).status_code == 201


async def test_outsiders_cannot_read_or_post_in_a_direct_conversation(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    exporter_id, _ = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    await make_buyer(api_client, "other@x.de", legal_name="Other Foods BV", country="NL")
    await as_user(api_client, "buyer", "buyer@x.de")
    conversation_id = (await start(api_client, await slug_of(db_session, exporter_id))).json()["id"]
    await as_user(api_client, "buyer", "other@x.de")
    url = f"{CONVERSATIONS}/{conversation_id}/messages"
    assert (await api_client.get(url)).status_code == 404
    assert (await say(api_client, conversation_id, "xin chào")).status_code == 404
    assert (await api_client.get(CONVERSATIONS)).json() == []


async def test_start_needs_a_member_with_a_company_and_a_body(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    exporter_id, _ = await make_exporter(api_client, db_session)
    slug = await slug_of(db_session, exporter_id)
    assert (await start(api_client, slug)).status_code == 401
    await login_as(api_client, "buyer", "nocompany@x.de")
    r = await start(api_client, slug)
    assert r.status_code == 409 and r.json()["error"]["code"] == "company_required"
    await make_buyer(api_client)
    await as_user(api_client, "buyer", "buyer@x.de")
    assert (await start(api_client, slug, "   ")).status_code == 422


async def test_database_keeps_one_direct_conversation_per_pair_and_two_distinct_companies(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    a_id, _ = await make_exporter(api_client, db_session, "a@x.vn", legal_name="Công ty A")
    b_id, _ = await make_exporter(api_client, db_session, "b@x.vn", legal_name="Công ty B")
    insert = text(
        "INSERT INTO conversations (company_a_id, company_b_id) "
        "VALUES (CAST(:a AS uuid), CAST(:b AS uuid))"
    )
    await db_session.execute(insert, {"a": a_id, "b": b_id})
    for pair in ({"a": b_id, "b": a_id}, {"a": a_id, "b": a_id}):
        with pytest.raises(IntegrityError):
            async with db_session.begin_nested():
                await db_session.execute(insert, pair)
