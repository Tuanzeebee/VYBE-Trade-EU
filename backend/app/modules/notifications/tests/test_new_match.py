"""Exporter vừa được xác minh → buyer có nhóm hàng quan tâm trùng ngành nhận thông báo new_match."""

import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.messaging.tests.conftest import make_buyer, make_exporter
from app.modules.notifications import handlers
from app.modules.verification.events import VerificationStatusChanged

pytestmark = pytest.mark.usefixtures("notifications_on")


def verified(company_id: str, old: str = "pending") -> VerificationStatusChanged:
    return VerificationStatusChanged(
        company_id=uuid.UUID(company_id),
        old_status=old,
        new_status="verified",
        old_level="basic",
        new_level="basic",
        decision="approve",
    )


async def matches(session: AsyncSession, email: str) -> list[dict[str, Any]]:
    rows = await session.execute(
        text(
            "SELECT n.payload, n.link FROM notifications n JOIN users u ON u.id = n.user_id "
            "WHERE u.email = :e AND n.type = 'new_match' ORDER BY n.created_at"
        ),
        {"e": email},
    )
    return [{"payload": r.payload, "link": r.link} for r in rows]


async def test_matching_buyer_gets_one_notification_with_a_profile_link(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    exporter_id, _ = await make_exporter(
        api_client, db_session, legal_name="Nông sản mới", industry_sector="agriculture"
    )
    await make_buyer(api_client)  # buyer_body quan tâm agriculture và spices
    await handlers.on_new_supplier_verified(verified(exporter_id))
    [found] = await matches(db_session, "buyer@x.de")
    assert found["payload"]["company_name"] == "Nông sản mới"
    assert found["payload"]["company_id"] == exporter_id
    assert found["link"] == f"/suppliers/{found['payload']['slug']}"


async def test_buyer_with_other_categories_gets_nothing(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    exporter_id, _ = await make_exporter(api_client, db_session, industry_sector="seafood")
    await make_buyer(api_client, sourcing_categories=["textiles"])
    await handlers.on_new_supplier_verified(verified(exporter_id))
    assert await matches(db_session, "buyer@x.de") == []


async def test_buyer_without_categories_gets_nothing_and_no_error(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    exporter_id, _ = await make_exporter(api_client, db_session)
    await make_buyer(api_client, sourcing_categories=[])
    await handlers.on_new_supplier_verified(verified(exporter_id))
    assert await matches(db_session, "buyer@x.de") == []


async def test_replayed_event_does_not_duplicate(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    exporter_id, _ = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    await handlers.on_new_supplier_verified(verified(exporter_id))
    await handlers.on_new_supplier_verified(verified(exporter_id))
    assert len(await matches(db_session, "buyer@x.de")) == 1


@pytest.mark.parametrize(
    ("old", "new"), [("pending", "rejected"), ("verified", "verified"), ("unverified", "pending")]
)
async def test_only_a_fresh_transition_to_verified_notifies(
    api_client: AsyncClient, db_session: AsyncSession, old: str, new: str
) -> None:
    exporter_id, _ = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    event = VerificationStatusChanged(
        company_id=uuid.UUID(exporter_id),
        old_status=old,
        new_status=new,
        old_level="basic",
        new_level="basic",
        decision="approve",
    )
    await handlers.on_new_supplier_verified(event)
    assert await matches(db_session, "buyer@x.de") == []


async def test_hidden_or_expired_supplier_does_not_notify(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    hidden, _ = await make_exporter(api_client, db_session, "h@x.vn", legal_name="Ẩn")
    expired, _ = await make_exporter(api_client, db_session, "e@x.vn", legal_name="Hết hạn")
    await make_buyer(api_client)
    await db_session.execute(
        text("UPDATE companies SET is_hidden = true WHERE id = :id"), {"id": hidden}
    )
    await db_session.execute(
        text("UPDATE companies SET expires_at = now() - interval '1 day' WHERE id = :id"),
        {"id": expired},
    )
    await handlers.on_new_supplier_verified(verified(hidden))
    await handlers.on_new_supplier_verified(verified(expired))
    assert await matches(db_session, "buyer@x.de") == []


async def test_exporter_companies_never_receive_it(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    exporter_id, _ = await make_exporter(
        api_client, db_session, "a@x.vn", industry_sector="agriculture"
    )
    other_id, _ = await make_exporter(api_client, db_session, "b@x.vn", legal_name="Nhà B")
    await db_session.execute(
        text("INSERT INTO company_sourcing_categories (company_id, category) VALUES (:id, :cat)"),
        {"id": other_id, "cat": "agriculture"},
    )
    await handlers.on_new_supplier_verified(verified(exporter_id))
    assert await matches(db_session, "b@x.vn") == []


async def test_hidden_buyer_does_not_receive_it(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    exporter_id, _ = await make_exporter(api_client, db_session, industry_sector="agriculture")
    buyer_id = await make_buyer(api_client)
    await db_session.execute(
        text("UPDATE companies SET is_hidden = true WHERE id = :id"), {"id": buyer_id}
    )
    await handlers.on_new_supplier_verified(verified(exporter_id))
    assert await matches(db_session, "buyer@x.de") == []


async def test_full_flow_through_the_event_bus(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    from app.core.events import publish

    exporter_id, _ = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    await publish(verified(exporter_id))
    assert len(await matches(db_session, "buyer@x.de")) == 1
