"""U23: thống kê phản hồi của seller cho phần "hành vi" của điểm tín nhiệm (chỉ đọc)."""

import datetime as dt
import uuid
from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.tests.helpers import login_as
from app.modules.messaging.models import Conversation, Message
from app.modules.messaging.service import seller_response_stats
from app.modules.messaging.tests.conftest import make_buyer, make_exporter, rfq_body

T0 = dt.datetime(2026, 9, 20, 8, tzinfo=dt.UTC)


def message(conversation: uuid.UUID, sender: uuid.UUID, at: dt.datetime) -> Message:
    return Message(
        conversation_id=conversation,
        sender_company_id=sender,
        body_original="Xin chào",
        original_language="vi",
        sent_at=at,
    )


async def test_reply_rate_median_and_quote_rate(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    exporter_id, _ = await make_exporter(api_client, db_session)
    exporter = uuid.UUID(exporter_id)
    buyers = [
        uuid.UUID(await make_buyer(api_client, f"b{i}@x.de", legal_name=f"Buyer {i} GmbH"))
        for i in range(3)
    ]
    conversations = [
        Conversation(company_a_id=b, company_b_id=exporter, created_at=T0) for b in buyers
    ]
    db_session.add_all(conversations)
    await db_session.flush()
    fast, slow, silent = conversations
    db_session.add_all(
        [
            message(fast.id, buyers[0], T0),
            message(fast.id, exporter, T0 + dt.timedelta(hours=2)),
            message(slow.id, buyers[1], T0),
            message(slow.id, exporter, T0 + dt.timedelta(days=9)),  # quá 7 ngày
            message(silent.id, buyers[2], T0),
        ]
    )
    await db_session.flush()
    stats = await seller_response_stats(db_session, exporter, T0 - dt.timedelta(days=1))
    assert (stats.conversations, stats.replied) == (3, 1)
    assert stats.median_reply_hours == Decimal("109.0")  # trung vị của 2 giờ và 216 giờ
    assert (stats.rfqs, stats.quoted) == (0, 0)
    later = await seller_response_stats(db_session, exporter, T0 + dt.timedelta(days=1))
    assert later.conversations == 0


async def test_only_quote_requests_count_towards_quote_rate(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    """N4: Request hẹn meeting/hỏi đóng gói không bao giờ được báo giá nên không được kéo tụt tỷ lệ
    báo giá của seller trong điểm tín nhiệm."""
    exporter_id, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    await login_as(api_client, "buyer", "buyer@x.de")
    assert (await api_client.post("/api/buyer/rfqs", json=rfq_body(product_id))).status_code == 201
    meeting = {"product_id": product_id, "kind": "meeting", "message": "Hẹn họp 15 phút"}
    assert (await api_client.post("/api/buyer/rfqs", json=meeting)).status_code == 201
    since = dt.datetime.now(dt.UTC) - dt.timedelta(days=1)
    stats = await seller_response_stats(db_session, uuid.UUID(exporter_id), since)
    assert (stats.rfqs, stats.quoted) == (1, 0)
