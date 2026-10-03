"""G1: dashboard exporter — mỗi ô lấy số thật, ô trống có hướng dẫn."""

import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.tests.helpers import company_body, login_as
from app.modules.messaging.tests.conftest import make_buyer, make_exporter, rfq_body

URL = "/api/exporter/dashboard"


async def as_user(client: AsyncClient, role: str, email: str) -> None:
    await client.post("/api/auth/logout")
    await login_as(client, role, email)


async def dashboard(client: AsyncClient) -> dict[str, Any]:
    r = await client.get(URL)
    assert r.status_code == 200, r.text
    return dict(r.json())


async def slug_of(client: AsyncClient, email: str = "exp@x.vn") -> str:
    await as_user(client, "exporter", email)
    return str((await client.get("/api/me/company")).json()["slug"])


async def company_id_of(session: AsyncSession, slug: str) -> str:
    row = await session.execute(text("SELECT id FROM companies WHERE slug = :s"), {"s": slug})
    return str(row.scalar_one())


# ── Phân quyền ───────────────────────────────────────────────────────────────
async def test_dashboards_require_the_right_role(api_client: AsyncClient) -> None:
    assert (await api_client.get(URL)).status_code == 401
    assert (await api_client.get("/api/buyer/dashboard")).status_code == 401
    assert (await api_client.get("/api/admin/stats/return-visits")).status_code == 401
    await login_as(api_client, "buyer", "b@x.de")
    assert (await api_client.get(URL)).status_code == 403
    assert (await api_client.get("/api/admin/stats/return-visits")).status_code == 403
    await as_user(api_client, "exporter", "e@x.vn")
    assert (await api_client.get("/api/buyer/dashboard")).status_code == 403


# ── Ô 1: hoàn thiện hồ sơ ────────────────────────────────────────────────────
async def test_completeness_tile_matches_the_profile_score(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    await api_client.post("/api/me/company", json=company_body())
    expected = (await api_client.get("/api/me/company/completeness")).json()
    tile = (await dashboard(api_client))["completeness"]
    assert tile["data"]["score"] == str(expected["score"])
    assert [m["field"] for m in tile["data"]["missing"]] == [
        m["field"] for m in expected["missing"]
    ]
    assert tile["empty_hint_key"] is None


# ── Ô 2: lượt xem hồ sơ ──────────────────────────────────────────────────────
async def test_profile_views_tile_counts_real_views(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    await make_buyer(api_client, "buyer2@x.de", legal_name="Buyer Two GmbH")
    slug = await slug_of(api_client)
    path = f"/api/public/companies/{slug}/view"

    await api_client.post("/api/auth/logout")
    assert (await api_client.post(path)).status_code == 204  # khách
    await login_as(api_client, "buyer", "buyer@x.de")
    assert (await api_client.post(path)).status_code == 204
    assert (await api_client.post(path)).status_code == 204  # xem lại trong 1 giờ: không tính thêm
    await as_user(api_client, "buyer", "buyer2@x.de")
    assert (await api_client.post(path)).status_code == 204

    await as_user(api_client, "exporter", "exp@x.vn")
    assert (await api_client.post(path)).status_code == 204  # chủ hồ sơ tự xem: không tính
    tile = (await dashboard(api_client))["profile_views"]
    assert tile["data"] == {"this_week": 3, "previous_week": 0}
    assert tile["empty_hint_key"] is None

    company_id = await company_id_of(db_session, slug)
    await db_session.execute(
        text(
            "UPDATE profile_views SET viewed_at = now() - interval '10 days' "
            "WHERE company_id = CAST(:c AS uuid) AND viewer_company_id IS NULL"
        ),
        {"c": company_id},
    )
    assert (await dashboard(api_client))["profile_views"]["data"] == {
        "this_week": 2,
        "previous_week": 1,
    }


async def test_viewing_an_invisible_company_is_404_and_not_counted(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_exporter(api_client, db_session, verified=False)
    slug = await slug_of(api_client)
    await api_client.post("/api/auth/logout")
    assert (await api_client.post(f"/api/public/companies/{slug}/view")).status_code == 404
    assert (await api_client.post("/api/public/companies/khong-co/view")).status_code == 404
    count = await db_session.execute(text("SELECT count(*) FROM profile_views"))
    assert count.scalar_one() == 0


# ── Ô 3: RFQ mới ─────────────────────────────────────────────────────────────
async def test_rfq_tile_counts_and_lists_received_requests(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, product_id = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    await as_user(api_client, "buyer", "buyer@x.de")
    first = (await api_client.post("/api/buyer/rfqs", json=rfq_body(product_id))).json()["id"]
    await api_client.post("/api/buyer/rfqs", json=rfq_body(product_id))
    await as_user(api_client, "exporter", "exp@x.vn")
    await api_client.patch(f"/api/exporter/rfqs/{first}/status", json={"status": "quoted"})

    tile = (await dashboard(api_client))["rfqs"]
    assert tile["data"]["counts"] == {"new": 1, "viewed": 0, "quoted": 1, "closed": 0}
    assert (tile["data"]["total"], tile["data"]["new_this_week"]) == (2, 2)
    assert len(tile["data"]["recent"]) == 2
    assert tile["data"]["recent"][0]["counterpart_name"] == "Global Foods Trading GmbH"
    assert tile["empty_hint_key"] is None


# ── Ô 4: xác minh và đếm ngược ───────────────────────────────────────────────
async def test_verification_tile_counts_down_to_expiry(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_exporter(api_client, db_session)
    await db_session.execute(
        text("UPDATE companies SET expires_at = now() + interval '10 days 1 hour'")
    )
    await as_user(api_client, "exporter", "exp@x.vn")
    tile = (await dashboard(api_client))["verification"]
    assert (tile["data"]["status"], tile["data"]["days_left"]) == ("verified", 10)
    assert tile["empty_hint_key"] is None
    await db_session.execute(text("UPDATE companies SET expires_at = now() - interval '1 day'"))
    assert (await dashboard(api_client))["verification"]["data"]["days_left"] == 0  # không âm


async def test_unverified_company_is_told_to_start_verification(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_exporter(api_client, db_session, verified=False)
    await as_user(api_client, "exporter", "exp@x.vn")
    tile = (await dashboard(api_client))["verification"]
    assert (tile["data"]["status"], tile["data"]["days_left"]) == ("unverified", None)
    assert tile["empty_hint_key"] == "start_verification"


# ── Ô 5: tổng tiết kiệm thuế ─────────────────────────────────────────────────
async def insert_check(
    session: AsyncSession, company_id: str, status: str, savings: str | None
) -> None:
    await session.execute(
        text(
            "INSERT INTO compliance_checks (company_id, check_type, hs_code, destination_country, "
            "status, product_value, savings_amount) VALUES (CAST(:c AS uuid), 'tariff', '100630', "
            "'DE', :s, 1000, CAST(:v AS numeric))"
        ),
        {"c": company_id, "s": status, "v": savings},
    )


async def test_tariff_savings_tile_sums_only_this_companys_successful_runs(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    mine, _ = await make_exporter(api_client, db_session)
    other, _ = await make_exporter(api_client, db_session, "other@x.vn", legal_name="Công ty khác")
    await insert_check(db_session, mine, "ok", "100.50")
    await insert_check(db_session, mine, "ok", "200.25")
    await insert_check(db_session, mine, "needs_review", None)  # không có con số
    await insert_check(db_session, other, "ok", "999.00")
    await as_user(api_client, "exporter", "exp@x.vn")
    tile = (await dashboard(api_client))["tariff_savings"]
    assert tile["data"] == {"total_eur": "300.75", "runs": 2}
    assert tile["empty_hint_key"] is None


# ── Ô 6: câu hỏi trợ lý gần đây ──────────────────────────────────────────────
async def test_copilot_tile_lists_own_recent_questions_only(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_exporter(api_client, db_session)
    await make_exporter(api_client, db_session, "other@x.vn", legal_name="Công ty khác")
    ids: dict[str, uuid.UUID] = {
        email: (
            await db_session.execute(text("SELECT id FROM users WHERE email = :e"), {"e": email})
        ).scalar_one()
        for email in ("exp@x.vn", "other@x.vn")
    }
    for i in range(7):
        await insert_question(db_session, ids["exp@x.vn"], f"Câu hỏi {i}")
    await insert_question(db_session, ids["other@x.vn"], "Của người khác")
    await as_user(api_client, "exporter", "exp@x.vn")
    tile = (await dashboard(api_client))["copilot"]
    assert [q["question"] for q in tile["data"]] == [f"Câu hỏi {i}" for i in (6, 5, 4, 3, 2)]
    assert tile["empty_hint_key"] is None


async def insert_question(session: AsyncSession, user_id: uuid.UUID, question: str) -> None:
    await session.execute(
        text(
            "INSERT INTO ai_queries (user_id, question, language, confidence, latency_ms, "
            "model_name) VALUES (:u, :q, 'vi', 'high', 1, 'fake')"
        ),
        {"u": user_id, "q": question},
    )


# ── Ô trống ──────────────────────────────────────────────────────────────────
async def test_empty_tiles_return_hint(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    await api_client.post("/api/me/company", json=company_body())
    body = await dashboard(api_client)
    assert body["profile_views"]["empty_hint_key"] == "no_profile_views"
    assert body["rfqs"]["empty_hint_key"] == "no_rfqs_received"
    assert body["tariff_savings"]["empty_hint_key"] == "no_tariff_runs"
    assert body["copilot"]["empty_hint_key"] == "no_copilot_questions"
    assert body["verification"]["empty_hint_key"] == "start_verification"
    assert body["completeness"]["data"] is not None
    # Ô trống vẫn có dữ liệu có cấu trúc (số 0), không phải null.
    assert body["rfqs"]["data"]["total"] == 0 and body["copilot"]["data"] == []


@pytest.mark.parametrize(
    "tile", ["completeness", "profile_views", "verification", "tariff_savings"]
)
async def test_exporter_without_company_is_asked_to_create_one(
    api_client: AsyncClient, tile: str
) -> None:
    await login_as(api_client, "exporter", "new@x.vn")
    body = await dashboard(api_client)
    assert body[tile]["data"] is None
    assert body[tile]["empty_hint_key"] == "create_company"
    assert body["rfqs"]["data"]["total"] == 0


# ── N1: hành trình ───────────────────────────────────────────────────────────
async def test_journey_without_company_points_at_company(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "new@x.vn")
    journey = (await dashboard(api_client))["journey"]
    assert journey["next_step"] == "company"
    assert journey["steps"][0]["key"] == "company"
    assert journey["product_total"] == 4
    assert journey["sales_total"] == 4


async def test_journey_with_company_but_no_product_never_skips_to_sales(
    api_client: AsyncClient,
) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    await api_client.post("/api/me/company", json=company_body())
    journey = (await dashboard(api_client))["journey"]
    assert journey["next_step"] in ("company", "products")
    assert journey["sales_done"] == 0
