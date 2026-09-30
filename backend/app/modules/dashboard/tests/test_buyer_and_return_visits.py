"""G2: dashboard buyer. G3: đo tỷ lệ quay lại có thông tin mới."""

import datetime as dt
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD, login_as
from app.modules.dashboard import service
from app.modules.messaging.tests.conftest import make_buyer, make_exporter, rfq_body

URL = "/api/buyer/dashboard"


async def as_user(client: AsyncClient, role: str, email: str) -> None:
    await client.post("/api/auth/logout")
    await login_as(client, role, email)


async def dashboard(client: AsyncClient) -> dict[str, Any]:
    r = await client.get(URL)
    assert r.status_code == 200, r.text
    return dict(r.json())


async def slug_of(session: AsyncSession, name: str) -> str:
    row = await session.execute(
        text("SELECT slug FROM companies WHERE legal_name = :n"), {"n": name}
    )
    return str(row.scalar_one())


async def view(client: AsyncClient, slug: str) -> None:
    assert (await client.post(f"/api/public/companies/{slug}/view")).status_code == 204


# ── G2 ───────────────────────────────────────────────────────────────────────
async def test_saved_searches_tile_points_to_the_upcoming_feature(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_buyer(api_client)
    await as_user(api_client, "buyer", "buyer@x.de")
    tile = (await dashboard(api_client))["saved_searches"]
    assert (tile["data"], tile["empty_hint_key"]) == ([], "saved_searches_coming_soon")


async def test_rfqs_sent_tile_shows_status_counts(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    await as_user(api_client, "buyer", "buyer@x.de")
    first = (await api_client.post("/api/buyer/rfqs", json=rfq_body(product_id))).json()["id"]
    await api_client.post("/api/buyer/rfqs", json=rfq_body(product_id))
    await as_user(api_client, "exporter", "exp@x.vn")
    await api_client.patch(f"/api/exporter/rfqs/{first}/status", json={"status": "quoted"})
    await as_user(api_client, "buyer", "buyer@x.de")
    tile = (await dashboard(api_client))["rfqs_sent"]
    assert tile["data"]["counts"] == {"new": 1, "viewed": 0, "quoted": 1, "closed": 0}
    assert tile["data"]["total"] == 2
    assert tile["data"]["recent"][0]["counterpart_name"] == "Công ty TNHH Nông Sản Việt"
    assert tile["empty_hint_key"] is None


async def test_recently_viewed_suppliers_are_newest_first_and_hide_invisible_ones(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_exporter(api_client, db_session, "a@x.vn", legal_name="Nhà A")
    await make_exporter(api_client, db_session, "b@x.vn", legal_name="Nhà B")
    await make_exporter(api_client, db_session, "c@x.vn", legal_name="Nhà C")
    await make_buyer(api_client)
    slugs = {n: await slug_of(db_session, n) for n in ("Nhà A", "Nhà B", "Nhà C")}
    await as_user(api_client, "buyer", "buyer@x.de")
    for name in ("Nhà A", "Nhà B", "Nhà C"):
        await view(api_client, slugs[name])
    await db_session.execute(
        text("UPDATE companies SET is_hidden = true WHERE legal_name = 'Nhà B'")
    )
    tile = (await dashboard(api_client))["recently_viewed"]
    assert [s["name"] for s in tile["data"]] == ["Nhà C", "Nhà A"]  # B bị ẩn nên không hiện
    assert tile["empty_hint_key"] is None


async def test_new_verified_this_week_in_the_buyers_categories(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    # buyer_body quan tâm agriculture và spices.
    await make_exporter(api_client, db_session, "a@x.vn", legal_name="Nông sản mới")
    await make_exporter(
        api_client, db_session, "b@x.vn", legal_name="Thủy sản mới", industry_sector="seafood"
    )
    await make_exporter(api_client, db_session, "c@x.vn", legal_name="Nông sản cũ")
    await make_buyer(api_client)
    await db_session.execute(
        text(
            "UPDATE companies SET verified_at = now() - interval '10 days' WHERE legal_name = 'Nông sản cũ'"
        )
    )
    await as_user(api_client, "buyer", "buyer@x.de")
    tile = (await dashboard(api_client))["new_verified"]
    assert [s["name"] for s in tile["data"]] == ["Nông sản mới"]
    assert tile["empty_hint_key"] is None


async def test_empty_buyer_tiles_return_hints(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_buyer(api_client)
    await as_user(api_client, "buyer", "buyer@x.de")
    body = await dashboard(api_client)
    assert body["rfqs_sent"]["empty_hint_key"] == "no_rfqs_sent"
    assert body["recently_viewed"]["empty_hint_key"] == "no_recent_suppliers"
    assert body["new_verified"]["empty_hint_key"] == "no_new_verified"
    assert body["rfqs_sent"]["data"]["total"] == 0


async def test_buyer_without_company_and_without_categories(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_as(api_client, "buyer", "nocompany@x.de")
    body = await dashboard(api_client)
    assert body["recently_viewed"]["empty_hint_key"] == "create_company"
    assert body["new_verified"]["empty_hint_key"] == "create_company"
    await make_buyer(
        api_client, "cat@x.de", sourcing_categories=[], legal_name="No Categories GmbH"
    )
    await as_user(api_client, "buyer", "cat@x.de")
    assert (await dashboard(api_client))["new_verified"][
        "empty_hint_key"
    ] == "set_sourcing_categories"


# ── G3 ───────────────────────────────────────────────────────────────────────
MONDAY = dt.datetime(2026, 10, 5, 9, 0, tzinfo=dt.UTC)  # thứ Hai


async def current_user(session: AsyncSession, email: str, role: str = "exporter") -> CurrentUser:
    row = await session.execute(text("SELECT id FROM users WHERE email = :e"), {"e": email})
    return CurrentUser(id=row.scalar_one(), email=email, role=role, preferred_language="vi")


async def test_weekly_ratio(api_client: AsyncClient, db_session: AsyncSession) -> None:
    """Xong khi G3: tỷ lệ quay lại có thông tin mới theo tuần."""
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    user = await current_user(db_session, "exp@x.vn")

    await service.exporter_dashboard(db_session, user, now=MONDAY)  # lần đầu: chưa tính
    await service.exporter_dashboard(
        db_session, user, now=MONDAY + dt.timedelta(days=1)
    )  # quay lại, không có gì mới
    await as_user(api_client, "buyer", "buyer@x.de")
    await api_client.post("/api/buyer/rfqs", json=rfq_body(product_id))  # có RFQ mới
    await service.exporter_dashboard(
        db_session, user, now=MONDAY + dt.timedelta(days=2)
    )  # quay lại, có RFQ mới

    stats = await service.return_visit_stats(db_session, weeks=8, now=MONDAY + dt.timedelta(days=3))
    assert len(stats.weeks) == 1
    week = stats.weeks[0]
    assert week.week_start == MONDAY.date()
    assert (week.return_visits, week.with_new_info, week.ratio) == (2, 1, "0.5000")
    assert (stats.overall_ratio, stats.target_ratio) == ("0.5000", "0.90")


async def test_first_open_is_not_a_return_visit_and_empty_weeks_have_no_ratio(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_exporter(api_client, db_session)
    user = await current_user(db_session, "exp@x.vn")
    await service.exporter_dashboard(db_session, user, now=MONDAY)
    stats = await service.return_visit_stats(db_session, weeks=8, now=MONDAY + dt.timedelta(days=1))
    assert stats.weeks == [] and stats.overall_ratio is None


async def test_countdown_alone_is_not_new_information(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_exporter(api_client, db_session)
    await db_session.execute(
        text("UPDATE companies SET expires_at = :e"), {"e": MONDAY + dt.timedelta(days=100)}
    )
    user = await current_user(db_session, "exp@x.vn")
    await service.exporter_dashboard(db_session, user, now=MONDAY)
    await service.exporter_dashboard(
        db_session, user, now=MONDAY + dt.timedelta(days=1)
    )  # days_left 100 → 99
    stats = await service.return_visit_stats(db_session, weeks=8, now=MONDAY + dt.timedelta(days=2))
    assert (stats.weeks[0].return_visits, stats.weeks[0].with_new_info) == (1, 0)


async def test_weeks_are_reported_separately_and_users_are_independent(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_exporter(api_client, db_session, "a@x.vn", legal_name="Nhà A")
    await make_exporter(api_client, db_session, "b@x.vn", legal_name="Nhà B")
    a, b = await current_user(db_session, "a@x.vn"), await current_user(db_session, "b@x.vn")
    for user in (a, b):
        await service.exporter_dashboard(db_session, user, now=MONDAY)
    next_week = MONDAY + dt.timedelta(days=7)
    await service.exporter_dashboard(db_session, a, now=next_week)
    await service.exporter_dashboard(db_session, b, now=next_week)
    later = MONDAY + dt.timedelta(days=8)
    stats = await service.return_visit_stats(db_session, weeks=8, now=later)
    assert [w.week_start for w in stats.weeks] == [next_week.date()]
    assert stats.weeks[0].return_visits == 2  # mỗi người có lần quay lại riêng của mình


async def test_admin_endpoint_reports_the_ratio(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_exporter(api_client, db_session)
    await as_user(api_client, "exporter", "exp@x.vn")
    await api_client.get("/api/exporter/dashboard")
    await api_client.get("/api/exporter/dashboard")  # lần quay lại thật (không có gì đổi)
    await api_client.post("/api/auth/logout")
    await create_admin(db_session, "admin@evfta.eu", PASSWORD)
    login = {"email": "admin@evfta.eu", "password": PASSWORD}
    await api_client.post("/api/auth/login", json=login)
    body = (await api_client.get("/api/admin/stats/return-visits")).json()
    assert body["target_ratio"] == "0.90"
    assert body["overall_ratio"] == "0.0000"
    assert body["weeks"][0]["return_visits"] == 1
    for bad in (0, 53, "x"):
        assert (
            await api_client.get("/api/admin/stats/return-visits", params={"weeks": bad})
        ).status_code == 422


@pytest.mark.parametrize("path", ["/api/exporter/dashboard", "/api/buyer/dashboard"])
async def test_each_open_writes_exactly_one_event(
    api_client: AsyncClient, db_session: AsyncSession, path: str
) -> None:
    role = "exporter" if "exporter" in path else "buyer"
    await login_as(api_client, role, "u@x.vn")
    await api_client.get(path)
    await api_client.get(path)
    rows = (
        await db_session.execute(
            text("SELECT is_return_visit, role FROM dashboard_events ORDER BY opened_at")
        )
    ).all()
    assert [tuple(r) for r in rows] == [(False, role), (True, role)]
