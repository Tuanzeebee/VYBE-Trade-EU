"""F2 (hội thoại theo cặp công ty) và F3 (dịch máy từng tin nhắn)."""

import uuid
from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.translation import FakeTranslation, TranslationError, get_translation_service
from app.modules.companies.tests.helpers import login_as
from app.modules.messaging.tests.conftest import make_buyer, make_exporter, rfq_body

CONVERSATIONS = "/api/me/conversations"


@pytest.fixture
async def translator() -> AsyncIterator[FakeTranslation]:
    from app.main import app

    fake = FakeTranslation()
    app.dependency_overrides[get_translation_service] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_translation_service, None)


async def as_user(client: AsyncClient, role: str, email: str, language: str = "vi") -> None:
    await client.post("/api/auth/logout")
    await login_as(client, role, email, language)


async def open_rfq(
    client: AsyncClient,
    session: AsyncSession,
    *,
    buyer_language: str = "vi",
    exporter_email: str = "exp@x.vn",
    buyer_email: str = "buyer@x.de",
    **exporter: Any,
) -> tuple[str, str]:
    """Exporter (vi) và buyer gửi một RFQ; trả (rfq_id, conversation_id). Kết thúc ở phiên buyer."""
    _, product_id = await make_exporter(client, session, exporter_email, **exporter)
    await make_buyer(client, buyer_email, buyer_language)
    await as_user(client, "buyer", buyer_email, buyer_language)
    rfq_id = (await client.post("/api/buyer/rfqs", json=rfq_body(product_id))).json()["id"]
    conversations = (await client.get(CONVERSATIONS)).json()
    return rfq_id, conversations[0]["id"]


async def say(client: AsyncClient, conversation_id: str, body: str) -> Any:
    return await client.post(f"{CONVERSATIONS}/{conversation_id}/messages", json={"body": body})


async def read(client: AsyncClient, conversation_id: str, **params: Any) -> list[dict[str, Any]]:
    r = await client.get(f"{CONVERSATIONS}/{conversation_id}/messages", params=params)
    assert r.status_code == 200, r.text
    return list(r.json())


# ── F2 ───────────────────────────────────────────────────────────────────────
async def test_rfq_opens_conversation(api_client: AsyncClient, db_session: AsyncSession) -> None:
    rfq_id, conversation_id = await open_rfq(api_client, db_session)
    buyer_view = (await api_client.get(CONVERSATIONS)).json()
    assert [(c["id"], c["rfq_id"]) for c in buyer_view] == [(conversation_id, rfq_id)]
    assert buyer_view[0]["counterpart_name"] == "Công ty TNHH Nông Sản Việt"
    assert buyer_view[0]["product_name"] == "Gạo thơm Jasmine xuất khẩu"
    assert (buyer_view[0]["last_message"], buyer_view[0]["unread_count"]) == (None, 0)
    await as_user(api_client, "exporter", "exp@x.vn")
    exporter_view = (await api_client.get(CONVERSATIONS)).json()
    assert [c["id"] for c in exporter_view] == [conversation_id]
    assert exporter_view[0]["counterpart_name"] == "Global Foods Trading GmbH"
    # Đúng một hội thoại cho mỗi RFQ.
    count = await db_session.execute(text("SELECT count(*) FROM conversations"))
    assert count.scalar_one() == 1


async def test_two_way_thread_is_ordered(api_client: AsyncClient, db_session: AsyncSession) -> None:
    """Xong khi F2: hai bên nhắn qua lại trong một luồng gắn với RFQ."""
    _, cid = await open_rfq(api_client, db_session)
    for body in ("một", "hai", "ba"):
        assert (await say(api_client, cid, body)).status_code == 201
    await as_user(api_client, "exporter", "exp@x.vn")
    await say(api_client, cid, "bốn")
    thread = await read(api_client, cid)
    assert [m["body_original"] for m in thread] == ["một", "hai", "ba", "bốn"]
    assert [m["mine"] for m in thread] == [False, False, False, True]
    # Polling: chỉ lấy tin sau một tin đã có.
    newer = await read(api_client, cid, after=thread[1]["id"])
    assert [m["body_original"] for m in newer] == ["ba", "bốn"]
    assert await read(api_client, cid, after=thread[3]["id"]) == []


async def test_after_cursor_must_belong_to_the_conversation(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, cid = await open_rfq(api_client, db_session)
    r = await api_client.get(f"{CONVERSATIONS}/{cid}/messages", params={"after": str(uuid.uuid4())})
    assert r.status_code == 404


async def test_non_participant_gets_404(api_client: AsyncClient, db_session: AsyncSession) -> None:
    _, cid = await open_rfq(api_client, db_session)
    await say(api_client, cid, "riêng tư")
    await make_exporter(api_client, db_session, "other@x.vn", legal_name="Công ty khác")
    await make_buyer(api_client, "buyer2@x.de", legal_name="Buyer Two GmbH")
    for role, email in (("exporter", "other@x.vn"), ("buyer", "buyer2@x.de")):
        await as_user(api_client, role, email)
        assert (await api_client.get(CONVERSATIONS)).json() == []
        assert (await api_client.get(f"{CONVERSATIONS}/{cid}/messages")).status_code == 404
        assert (await say(api_client, cid, "chen ngang")).status_code == 404
    # Người dùng chưa có công ty cũng không vào được.
    await as_user(api_client, "buyer", "nocompany@x.de")
    assert (await api_client.get(f"{CONVERSATIONS}/{cid}/messages")).status_code == 404
    assert (await api_client.get(f"{CONVERSATIONS}/{uuid.uuid4()}/messages")).status_code == 404
    count = await db_session.execute(text("SELECT count(*) FROM messages"))
    assert count.scalar_one() == 1  # tin chen ngang không được ghi


async def test_conversation_endpoints_need_a_session(api_client: AsyncClient) -> None:
    cid = uuid.uuid4()
    assert (await api_client.get(CONVERSATIONS)).status_code == 401
    assert (await api_client.get(f"{CONVERSATIONS}/{cid}/messages")).status_code == 401
    assert (
        await api_client.post(f"{CONVERSATIONS}/{cid}/messages", json={"body": "x"})
    ).status_code == 401


@pytest.mark.parametrize("body", ["", "   ", "x" * 4001])
async def test_invalid_bodies_are_rejected(
    api_client: AsyncClient, db_session: AsyncSession, body: str
) -> None:
    _, cid = await open_rfq(api_client, db_session)
    assert (await say(api_client, cid, body)).status_code == 422
    r = await api_client.post(f"{CONVERSATIONS}/{cid}/messages", json={"body": "ok", "extra": 1})
    assert r.status_code == 422


async def test_unread_counts_and_read_receipts(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, cid = await open_rfq(api_client, db_session)
    await say(api_client, cid, "một")
    await say(api_client, cid, "hai")
    assert (await api_client.get(CONVERSATIONS)).json()[0][
        "unread_count"
    ] == 0  # tin của chính mình

    await as_user(api_client, "exporter", "exp@x.vn")
    listing = (await api_client.get(CONVERSATIONS)).json()[0]
    assert (listing["unread_count"], listing["last_message"]) == (2, "hai")
    await read(api_client, cid)
    assert (await api_client.get(CONVERSATIONS)).json()[0]["unread_count"] == 0

    await as_user(api_client, "buyer", "buyer@x.de")
    thread = await read(api_client, cid)
    assert all(m["read_at"] is not None for m in thread)  # bên gửi thấy tin đã được đọc


async def test_conversations_are_listed_by_latest_activity(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, first = await open_rfq(api_client, db_session)
    _, product_two = await make_exporter(
        api_client, db_session, "exp2@x.vn", legal_name="Nông Sản Hai"
    )
    await as_user(api_client, "buyer", "buyer@x.de")
    await api_client.post("/api/buyer/rfqs", json=rfq_body(product_two))
    ids = [c["id"] for c in (await api_client.get(CONVERSATIONS)).json()]
    second = next(i for i in ids if i != first)
    assert ids[0] == second  # hội thoại mới hơn lên trước
    await say(api_client, first, "cập nhật")
    assert (await api_client.get(CONVERSATIONS)).json()[0]["id"] == first


# ── F3 ───────────────────────────────────────────────────────────────────────
async def test_vi_to_en_round_trip(
    api_client: AsyncClient, db_session: AsyncSession, translator: FakeTranslation
) -> None:
    """Xong khi F3: người chỉ biết tiếng Việt và người chỉ biết tiếng Anh hoàn tất một vòng."""
    _, cid = await open_rfq(api_client, db_session, buyer_language="en")
    sent = (await say(api_client, cid, "Please quote 10 containers.")).json()
    assert (sent["body"], sent["translated"]) == (
        "Please quote 10 containers.",
        False,
    )  # người gửi thấy bản mình viết

    await as_user(api_client, "exporter", "exp@x.vn", "vi")
    inbox = (await read(api_client, cid))[0]
    assert inbox["body"] == "[vi] Please quote 10 containers."
    assert inbox["translated"] is True
    assert inbox["body_original"] == "Please quote 10 containers."
    assert (inbox["original_language"], inbox["translated_language"]) == ("en", "vi")

    reply = (await say(api_client, cid, "Chào bạn, giá 2,3 EUR/kg.")).json()
    assert reply["body"] == "Chào bạn, giá 2,3 EUR/kg."
    await as_user(api_client, "buyer", "buyer@x.de", "en")
    back = (await read(api_client, cid))[-1]
    assert back["body"] == "[en] Chào bạn, giá 2,3 EUR/kg."
    assert back["body_original"] == "Chào bạn, giá 2,3 EUR/kg."
    assert translator.calls == [
        ("Please quote 10 containers.", "en", "vi"),
        ("Chào bạn, giá 2,3 EUR/kg.", "vi", "en"),
    ]
    # Cả hai bản và hai ngôn ngữ đều được lưu.
    rows = (
        await db_session.execute(
            text(
                "SELECT body_original, body_translated, original_language, translated_language "
                "FROM messages ORDER BY sent_at"
            )
        )
    ).all()
    assert [tuple(r) for r in rows] == [
        ("Please quote 10 containers.", "[vi] Please quote 10 containers.", "en", "vi"),
        ("Chào bạn, giá 2,3 EUR/kg.", "[en] Chào bạn, giá 2,3 EUR/kg.", "vi", "en"),
    ]


async def test_translation_failure_still_sends(
    api_client: AsyncClient, db_session: AsyncSession, translator: FakeTranslation
) -> None:
    def boom(text_: str, source: str, target: str) -> str:
        raise TranslationError("provider down")

    translator.responder = boom
    _, cid = await open_rfq(api_client, db_session, buyer_language="en")
    r = await say(api_client, cid, "Hello")
    assert r.status_code == 201
    await as_user(api_client, "exporter", "exp@x.vn")
    message = (await read(api_client, cid))[0]
    assert (message["body"], message["translated"], message["translated_language"]) == (
        "Hello",
        False,
        None,
    )
    row = (
        await db_session.execute(text("SELECT body_translated, translated_language FROM messages"))
    ).one()
    assert tuple(row) == (None, None)


async def test_blank_translation_is_treated_as_failure(
    api_client: AsyncClient, db_session: AsyncSession, translator: FakeTranslation
) -> None:
    translator.responder = lambda *_: "   "
    _, cid = await open_rfq(api_client, db_session, buyer_language="en")
    await say(api_client, cid, "Hello")
    await as_user(api_client, "exporter", "exp@x.vn")
    assert (await read(api_client, cid))[0]["translated"] is False


async def test_same_language_skips_translation(
    api_client: AsyncClient, db_session: AsyncSession, translator: FakeTranslation
) -> None:
    _, cid = await open_rfq(api_client, db_session, buyer_language="vi")
    await say(api_client, cid, "Xin chào")
    await as_user(api_client, "exporter", "exp@x.vn")
    message = (await read(api_client, cid))[0]
    assert (message["body"], message["translated"]) == ("Xin chào", False)
    assert translator.calls == []


async def test_default_provider_is_unavailable_and_message_still_goes_through(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Chưa chốt nhà cung cấp dịch (Q5): tin vẫn gửi bằng bản gốc, không dịch giả."""
    _, cid = await open_rfq(api_client, db_session, buyer_language="en")
    assert (await say(api_client, cid, "Hello")).status_code == 201
    await as_user(api_client, "exporter", "exp@x.vn")
    message = (await read(api_client, cid))[0]
    assert (message["body"], message["translated"]) == ("Hello", False)


# ── Thông báo ────────────────────────────────────────────────────────────────
async def test_message_triggers_notification_and_email(
    api_client: AsyncClient,
    db_session: AsyncSession,
    notifications_on: list[dict[str, Any]],
) -> None:
    exporter_id, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    await as_user(api_client, "buyer", "buyer@x.de")
    await api_client.post("/api/buyer/rfqs", json=rfq_body(product_id))
    cid = (await api_client.get(CONVERSATIONS)).json()[0]["id"]
    notifications_on.clear()  # bỏ email của RFQ
    await say(api_client, cid, "Xin chào, nội dung không được lộ trong email")
    assert notifications_on == [
        {
            "type": "message",
            "company_id": exporter_id,
            "context": {"sender_name": "Global Foods Trading GmbH"},
        }
    ]
    await as_user(api_client, "exporter", "exp@x.vn")
    items = [
        i for i in (await api_client.get("/api/me/notifications")).json() if i["type"] == "message"
    ]
    assert len(items) == 1
    assert items[0]["link"] == "/conversations"
    assert items[0]["payload"]["conversation_id"] == cid
    assert "Xin chào" not in str(items[0])
