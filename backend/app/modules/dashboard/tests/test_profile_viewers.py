"""U9: "ai đã xem hồ sơ" — chỉ lộ tên buyer đã xác minh và không bật ẩn danh; còn lại chỉ đếm."""

from typing import Any

from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.tests.helpers import login_as
from app.modules.dashboard.tests.test_exporter_dashboard import as_user, slug_of
from app.modules.messaging.tests.conftest import make_buyer, make_exporter

URL = "/api/exporter/profile-viewers"


async def verify(session: AsyncSession, company_id: str) -> None:
    await session.execute(
        text(
            "UPDATE companies SET verification_status = 'verified', verified_at = now() "
            "WHERE id = CAST(:id AS uuid)"
        ),
        {"id": company_id},
    )
    session.expire_all()


async def view(client: AsyncClient, slug: str, role: str | None, email: str = "") -> None:
    await client.post("/api/auth/logout")
    if role:
        await login_as(client, role, email)
    assert (await client.post(f"/api/public/companies/{slug}/view")).status_code == 204


async def viewers(client: AsyncClient, **params: Any) -> dict[str, Any]:
    await as_user(client, "exporter", "exp@x.vn")
    r = await client.get(URL, params=params)
    assert r.status_code == 200, r.text
    return dict(r.json())


async def test_only_verified_non_anonymous_buyers_are_named(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_exporter(api_client, db_session)
    await make_exporter(api_client, db_session, "rival@x.vn", legal_name="Đối Thủ", verified=True)
    named = await make_buyer(api_client, "named@x.de", legal_name="Named Foods GmbH")
    hidden = await make_buyer(api_client, "hidden@x.de", legal_name="Hidden Foods BV")
    await make_buyer(api_client, "unverified@x.de", legal_name="Unverified Ltd")
    await verify(db_session, named)
    await verify(db_session, hidden)
    await as_user(api_client, "buyer", "hidden@x.de")
    r = await api_client.patch("/api/me/company", json={"hide_profile_views": True})
    assert r.status_code == 200 and r.json()["hide_profile_views"] is True

    slug = await slug_of(api_client)
    await view(api_client, slug, None)
    await view(api_client, slug, "buyer", "named@x.de")
    await view(api_client, slug, "buyer", "hidden@x.de")
    await view(api_client, slug, "buyer", "unverified@x.de")
    await view(api_client, slug, "exporter", "rival@x.vn")

    body = await viewers(api_client)
    assert (body["total_views"], body["guest_views"], body["anonymous_company_views"]) == (5, 1, 3)
    assert [(v["legal_name"], v["country"], v["views"]) for v in body["viewers"]] == [
        ("Named Foods GmbH", "DE", 1)
    ]
    for secret in ("Hidden Foods", "Unverified Ltd", "Đối Thủ"):
        assert secret not in str(body)


async def test_window_in_days(api_client: AsyncClient, db_session: AsyncSession) -> None:
    await make_exporter(api_client, db_session)
    slug = await slug_of(api_client)
    await view(api_client, slug, None)
    await db_session.execute(
        text("UPDATE profile_views SET viewed_at = now() - interval '40 days'")
    )
    await view(api_client, slug, None)
    assert (await viewers(api_client))["total_views"] == 1
    assert (await viewers(api_client, days=90))["total_views"] == 2
    assert (await api_client.get(URL, params={"days": 91})).status_code == 422


async def test_only_exporters_see_their_own_viewers(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    assert (await api_client.get(URL)).status_code == 401
    await make_buyer(api_client)
    await login_as(api_client, "buyer", "buyer@x.de")
    assert (await api_client.get(URL)).status_code == 403
    await as_user(api_client, "exporter", "nocompany@x.vn")
    empty = (await api_client.get(URL)).json()
    assert (empty["total_views"], empty["viewers"]) == (0, [])


async def test_named_view_notifies_the_seller_once_a_day(
    api_client: AsyncClient, db_session: AsyncSession, notifications_on: list[dict[str, Any]]
) -> None:
    await make_exporter(api_client, db_session)
    named = await make_buyer(api_client, "named@x.de", legal_name="Named Foods GmbH")
    await make_buyer(api_client, "unverified@x.de", legal_name="Unverified Ltd")
    await verify(db_session, named)
    slug = await slug_of(api_client)
    await view(api_client, slug, "buyer", "unverified@x.de")  # ẩn danh: không thông báo
    await view(api_client, slug, "buyer", "named@x.de")
    await db_session.execute(
        text("UPDATE profile_views SET viewed_at = now() - interval '2 hours'")
    )
    await view(api_client, slug, "buyer", "named@x.de")  # lượt mới nhưng trong 24 giờ

    await as_user(api_client, "exporter", "exp@x.vn")
    items = [
        n
        for n in (await api_client.get("/api/me/notifications")).json()
        if n["type"] == "profile_viewed"
    ]
    assert len(items) == 1
    assert items[0]["payload"]["viewer_name"] == "Named Foods GmbH"
    assert items[0]["link"] == "/exporter/profile-views"
    assert notifications_on == []  # không gửi email


async def test_hide_profile_views_is_buyer_only(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_exporter(api_client, db_session)
    await as_user(api_client, "exporter", "exp@x.vn")
    r = await api_client.patch("/api/me/company", json={"hide_profile_views": True})
    assert r.status_code == 422 and r.json()["error"]["code"] == "field_not_allowed"
    await make_buyer(api_client)
    await as_user(api_client, "buyer", "buyer@x.de")
    assert (await api_client.get("/api/me/company")).json()["hide_profile_views"] is False
    r = await api_client.patch("/api/me/company", json={"hide_profile_views": None})
    assert r.status_code == 422
