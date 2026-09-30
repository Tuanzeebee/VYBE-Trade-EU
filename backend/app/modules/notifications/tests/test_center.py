"""H1: trung tâm thông báo — mỗi người chỉ thấy và đánh dấu thông báo của mình."""

import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import clear_subscribers
from app.modules.companies.tests.helpers import company_body, login_as
from app.modules.notifications import center, handlers
from app.modules.notifications.models import NotificationType
from app.modules.verification.events import VerificationStatusChanged

URL = "/api/me/notifications"


async def user_id(session: AsyncSession, email: str) -> uuid.UUID:
    row = await session.execute(text("SELECT id FROM users WHERE email = :e"), {"e": email})
    return row.scalar_one()


async def notify(
    session: AsyncSession,
    email: str,
    kind: NotificationType,
    role: str = "exporter",
    **payload: Any,
) -> uuid.UUID:
    out = await center.create_notification(
        session, await user_id(session, email), kind, payload, role=role
    )
    return out.id


@pytest.mark.parametrize(
    "call",
    [
        ("get", URL),
        ("get", f"{URL}/unread-count"),
        ("post", f"{URL}/read-all"),
        ("post", f"{URL}/{uuid.uuid4()}/read"),
    ],
)
async def test_requires_a_session(api_client: AsyncClient, call: tuple[str, str]) -> None:
    method, url = call
    assert (await api_client.request(method, url)).status_code == 401


@pytest.mark.parametrize(
    ("kind", "role", "link"),
    [
        (NotificationType.verification_status, "exporter", "/exporter?tab=verification"),
        (NotificationType.expiry_alert, "exporter", "/exporter?tab=verification"),
        (NotificationType.rfq, "exporter", "/exporter?tab=rfq"),
        (NotificationType.rfq, "buyer", "/buyer/rfqs"),
        (NotificationType.message, "exporter", "/conversations"),
        (NotificationType.message, "buyer", "/conversations"),
        (NotificationType.new_match, "buyer", "/suppliers"),
    ],
)
async def test_each_type_links_to_right_page(
    api_client: AsyncClient, db_session: AsyncSession, kind: NotificationType, role: str, link: str
) -> None:
    await login_as(api_client, role, "u@x.vn")
    await notify(db_session, "u@x.vn", kind, role)
    item = (await api_client.get(URL)).json()[0]
    assert (item["type"], item["link"]) == (kind.value, link)
    assert center.link_for(kind, role) == link


async def test_list_is_newest_first_with_unread_count_and_read_flow(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_as(api_client, "exporter", "a@x.vn")
    first = await notify(db_session, "a@x.vn", NotificationType.rfq, n=1)
    await notify(db_session, "a@x.vn", NotificationType.message, n=2)
    items = (await api_client.get(URL)).json()
    assert [i["payload"]["n"] for i in items] == [2, 1]
    assert (await api_client.get(f"{URL}/unread-count")).json() == {"count": 2}

    r = await api_client.post(f"{URL}/{first}/read")
    assert r.status_code == 200 and r.json()["is_read"] is True
    assert (await api_client.get(f"{URL}/unread-count")).json() == {"count": 1}
    unread = (await api_client.get(URL, params={"unread_only": "true"})).json()
    assert [i["payload"]["n"] for i in unread] == [2]
    assert (await api_client.post(f"{URL}/{first}/read")).status_code == 200  # idempotent

    assert (await api_client.post(f"{URL}/read-all")).json() == {"count": 0}
    assert (await api_client.get(f"{URL}/unread-count")).json() == {"count": 0}


async def test_user_cannot_read_others_notifications(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_as(api_client, "exporter", "owner@x.vn")
    theirs = await notify(db_session, "owner@x.vn", NotificationType.rfq)
    await api_client.post("/api/auth/logout")
    await login_as(api_client, "buyer", "other@x.de")
    assert (await api_client.get(URL)).json() == []  # không thấy của người khác
    assert (await api_client.get(f"{URL}/unread-count")).json() == {"count": 0}
    assert (await api_client.post(f"{URL}/{theirs}/read")).status_code == 404
    assert (await api_client.post(f"{URL}/read-all")).status_code == 200
    # read-all của người khác không đụng tới thông báo của chủ.
    await api_client.post("/api/auth/logout")
    await login_as(api_client, "exporter", "owner@x.vn")
    assert (await api_client.get(f"{URL}/unread-count")).json() == {"count": 1}


async def test_paging_limits_are_validated(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_as(api_client, "exporter", "a@x.vn")
    for n in range(3):
        await notify(db_session, "a@x.vn", NotificationType.rfq, n=n)
    assert len((await api_client.get(URL, params={"limit": 2})).json()) == 2
    assert len((await api_client.get(URL, params={"limit": 2, "offset": 2})).json()) == 1
    assert (await api_client.get(URL, params={"limit": 0})).status_code == 422
    assert (await api_client.get(URL, params={"limit": 1000})).status_code == 422


class _Session:
    """Dùng phiên của test làm phiên của handler (để rollback cùng test)."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def __call__(self) -> "_Session":
        return self

    async def __aenter__(self) -> AsyncSession:
        return self.session

    async def __aexit__(self, *_: object) -> bool:
        return False


def event(
    company_id: uuid.UUID, decision: str, reason: str | None = None
) -> VerificationStatusChanged:
    return VerificationStatusChanged(
        company_id=company_id,
        old_status="pending",
        new_status="rejected",
        old_level="basic",
        new_level="basic",
        decision=decision,
        reason=reason,
    )


async def test_verification_decision_creates_in_app_notification_for_owner(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    company = (await api_client.post("/api/me/company", json=company_body())).json()
    company_id = uuid.UUID(company["id"])
    previous = handlers.set_session_factory(lambda: _Session(db_session))  # type: ignore[arg-type,return-value]
    clear_subscribers()
    try:
        await handlers.on_verification_status_changed(
            event(company_id, "reject", "Thiếu giấy phép")
        )
        # Nộp yêu cầu / đồng bộ mức không tạo thông báo.
        await handlers.on_verification_status_changed(event(company_id, "submit"))
    finally:
        handlers.set_session_factory(previous)
        clear_subscribers()
    items = (await api_client.get(URL)).json()
    assert len(items) == 1
    assert items[0]["type"] == "verification_status"
    assert items[0]["payload"] == {"outcome": "reject", "reason": "Thiếu giấy phép"}
    assert items[0]["link"] == "/exporter?tab=verification"


async def test_notification_for_unknown_company_is_ignored(db_session: AsyncSession) -> None:
    previous = handlers.set_session_factory(lambda: _Session(db_session))  # type: ignore[arg-type,return-value]
    try:
        await handlers.on_verification_status_changed(event(uuid.uuid4(), "approve"))
    finally:
        handlers.set_session_factory(previous)
    count = await db_session.execute(text("SELECT count(*) FROM notifications"))
    assert count.scalar_one() == 0
