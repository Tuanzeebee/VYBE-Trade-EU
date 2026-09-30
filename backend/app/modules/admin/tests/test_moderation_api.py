"""Admin xem, sửa, ẩn hồ sơ và sản phẩm; tra nhật ký; thống kê (I4, I5)."""

import datetime as dt
import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog
from app.modules.auth.service import create_admin
from app.modules.companies import service as companies
from app.modules.companies.tests.helpers import PASSWORD, company_body, login_as, product_body

pytestmark = pytest.mark.usefixtures("hs_seeded")

NIL = "00000000-0000-0000-0000-000000000000"


async def login_admin(client: AsyncClient, session: AsyncSession) -> None:
    await client.post("/api/auth/logout")
    body = {"email": "admin@evfta.eu", "password": PASSWORD}
    r = await client.post("/api/auth/login", json=body)
    if r.status_code == 401:
        await create_admin(session, "admin@evfta.eu", PASSWORD)
        r = await client.post("/api/auth/login", json=body)
    assert r.status_code == 200, r.text


async def exporter_with_product(client: AsyncClient, email: str, name: str) -> tuple[str, str]:
    await client.post("/api/auth/logout")
    await login_as(client, "exporter", email)
    company = (await client.post("/api/me/company", json=company_body(legal_name=name))).json()
    product = (await client.post("/api/exporter/products", json=product_body())).json()
    return company["id"], product["id"]


async def actions(session: AsyncSession) -> list[str]:
    return list(await session.scalars(select(AuditLog.action_type).order_by(AuditLog.created_at)))


ROUTES = [
    ("GET", "/api/admin/companies"),
    ("PATCH", f"/api/admin/companies/{NIL}"),
    ("GET", "/api/admin/products"),
    ("PATCH", f"/api/admin/products/{NIL}"),
    ("GET", "/api/admin/audit-logs"),
    ("GET", "/api/admin/stats"),
]


@pytest.mark.parametrize(("method", "path"), ROUTES)
async def test_401_without_session(api_client: AsyncClient, method: str, path: str) -> None:
    assert (await api_client.request(method, path, json={})).status_code == 401


@pytest.mark.parametrize("role", ["exporter", "buyer"])
@pytest.mark.parametrize(("method", "path"), ROUTES)
async def test_403_for_other_roles(
    api_client: AsyncClient, role: str, method: str, path: str
) -> None:
    await login_as(api_client, role, f"{role}@x.vn")
    assert (await api_client.request(method, path, json={})).status_code == 403


# ── Hồ sơ ───────────────────────────────────────────────────────────────────
async def test_admin_lists_every_company_with_status_and_owner(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await exporter_with_product(api_client, "a@x.vn", "Công ty A")
    await exporter_with_product(api_client, "b@x.vn", "Công ty B")
    await login_admin(api_client, db_session)
    rows = (await api_client.get("/api/admin/companies")).json()
    assert sorted(r["legal_name"] for r in rows) == ["Công ty A", "Công ty B"]
    first = rows[0]
    assert {
        "id",
        "type",
        "verification_status",
        "verification_level",
        "is_hidden",
        "owner_email",
    } <= set(first)
    assert first["is_hidden"] is False and first["verification_status"] == "unverified"


async def test_company_search_and_filters(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    a, _ = await exporter_with_product(api_client, "a@x.vn", "Green Farms")
    b, _ = await exporter_with_product(api_client, "b@x.vn", "Blue Sea")
    await companies.set_verification_state(
        db_session, uuid.UUID(b), status="pending", level="basic", verified_at=None, expires_at=None
    )
    await login_admin(api_client, db_session)
    assert [
        r["id"]
        for r in (await api_client.get("/api/admin/companies", params={"q": "green"})).json()
    ] == [a]
    assert [
        r["id"]
        for r in (await api_client.get("/api/admin/companies", params={"status": "pending"})).json()
    ] == [b]
    await api_client.patch(f"/api/admin/companies/{a}", json={"is_hidden": True})
    hidden = (await api_client.get("/api/admin/companies", params={"hidden": "true"})).json()
    assert [r["id"] for r in hidden] == [a]


async def test_pagination(api_client: AsyncClient, db_session: AsyncSession) -> None:
    for i in range(3):
        await exporter_with_product(api_client, f"c{i}@x.vn", f"Công ty {i}")
    await login_admin(api_client, db_session)
    page = (await api_client.get("/api/admin/companies", params={"limit": 2, "offset": 0})).json()
    rest = (await api_client.get("/api/admin/companies", params={"limit": 2, "offset": 2})).json()
    assert (len(page), len(rest)) == (2, 1)
    assert {r["id"] for r in page}.isdisjoint({r["id"] for r in rest})
    assert (await api_client.get("/api/admin/companies", params={"limit": 1000})).status_code == 422


async def test_admin_hides_company_and_it_writes_audit(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company_id, _ = await exporter_with_product(api_client, "a@x.vn", "Công ty A")
    await login_admin(api_client, db_session)
    r = await api_client.patch(f"/api/admin/companies/{company_id}", json={"is_hidden": True})
    assert r.status_code == 200, r.text
    assert r.json()["is_hidden"] is True
    row = (
        (await db_session.execute(select(AuditLog).where(AuditLog.action_type == "company.hide")))
        .scalars()
        .one()
    )
    assert row.entity_id == company_id
    assert row.before_state == {"is_hidden": False} and row.after_state == {"is_hidden": True}
    await api_client.patch(f"/api/admin/companies/{company_id}", json={"is_hidden": False})
    assert "company.unhide" in await actions(db_session)


async def test_admin_edits_company_fields_with_before_and_after(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company_id, _ = await exporter_with_product(api_client, "a@x.vn", "Công ty A")
    await login_admin(api_client, db_session)
    r = await api_client.patch(
        f"/api/admin/companies/{company_id}",
        json={"description_vi": "Đã chỉnh sửa bởi quản trị viên", "website": "https://moi.example"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["website"] == "https://moi.example"
    row = (
        (await db_session.execute(select(AuditLog).where(AuditLog.action_type == "company.update")))
        .scalars()
        .one()
    )
    assert row.before_state is not None and row.after_state is not None
    assert row.after_state["website"] == "https://moi.example"
    assert row.before_state["website"] != row.after_state["website"]
    assert set(row.after_state) == {"description_vi", "website"}  # chỉ trường đã đổi


async def test_noop_patch_writes_no_audit(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company_id, _ = await exporter_with_product(api_client, "a@x.vn", "Công ty A")
    await login_admin(api_client, db_session)
    before = len(await actions(db_session))
    await api_client.patch(f"/api/admin/companies/{company_id}", json={"is_hidden": False})
    assert len(await actions(db_session)) == before


@pytest.mark.parametrize(
    "payload",
    [
        {"verification_status": "verified"},  # AI/admin khác không được đổi xác minh ở đây
        {"verification_level": "evfta_verified"},
        {"owner_user_id": str(uuid.uuid4())},
        {"tax_id": "1"},
        {"legal_name": ""},
        {"website": "x" * 300},
        {"is_hidden": "maybe"},
    ],
)
async def test_admin_patch_cannot_change_verification_or_owner(
    api_client: AsyncClient, db_session: AsyncSession, payload: dict[str, Any]
) -> None:
    company_id, _ = await exporter_with_product(api_client, "a@x.vn", "Công ty A")
    await login_admin(api_client, db_session)
    r = await api_client.patch(f"/api/admin/companies/{company_id}", json=payload)
    assert r.status_code == 422, r.text
    state = await companies.get_verification_state(db_session, uuid.UUID(company_id))
    assert (state.status, state.level) == ("unverified", "basic")


async def test_unknown_company_404(api_client: AsyncClient, db_session: AsyncSession) -> None:
    await login_admin(api_client, db_session)
    assert (
        await api_client.patch(f"/api/admin/companies/{NIL}", json={"is_hidden": True})
    ).status_code == 404


# ── Sản phẩm ────────────────────────────────────────────────────────────────
async def test_admin_lists_products_with_company(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company_id, product_id = await exporter_with_product(api_client, "a@x.vn", "Công ty A")
    await login_admin(api_client, db_session)
    rows = (await api_client.get("/api/admin/products")).json()
    assert [(r["id"], r["company_id"], r["company_name"]) for r in rows] == [
        (product_id, company_id, "Công ty A")
    ]
    assert (await api_client.get("/api/admin/products", params={"company_id": NIL})).json() == []
    assert len((await api_client.get("/api/admin/products", params={"q": "gạo"})).json()) == 1


async def test_admin_hides_product_and_it_disappears_from_public_profile(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company_id, product_id = await exporter_with_product(api_client, "a@x.vn", "Công ty A")
    await companies.set_verification_state(
        db_session,
        uuid.UUID(company_id),
        status="verified",
        level="basic",
        verified_at=dt.datetime.now(dt.UTC),
        expires_at=None,
    )
    slug = (await api_client.get("/api/me/company")).json()["slug"]
    assert len((await api_client.get(f"/api/public/companies/{slug}")).json()["products"]) == 1
    await login_admin(api_client, db_session)
    r = await api_client.patch(
        f"/api/admin/products/{product_id}", json={"approval_status": "hidden"}
    )
    assert r.status_code == 200 and r.json()["approval_status"] == "hidden"
    assert (await api_client.get(f"/api/public/companies/{slug}")).json()["products"] == []
    assert "product.hide" in await actions(db_session)


async def test_admin_edits_product_with_audit(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, product_id = await exporter_with_product(api_client, "a@x.vn", "Công ty A")
    await login_admin(api_client, db_session)
    r = await api_client.patch(
        f"/api/admin/products/{product_id}", json={"name": "Tên đã kiểm duyệt"}
    )
    assert r.status_code == 200 and r.json()["name"] == "Tên đã kiểm duyệt"
    row = (
        (await db_session.execute(select(AuditLog).where(AuditLog.action_type == "product.update")))
        .scalars()
        .one()
    )
    assert row.before_state is not None and row.after_state is not None
    assert row.after_state == {"name": "Tên đã kiểm duyệt"}
    assert row.before_state["name"] != "Tên đã kiểm duyệt"


@pytest.mark.parametrize(
    "payload",
    [
        {"approval_status": "pending"},
        {"approval_status": "nope"},
        {"hs_code": "100630"},  # admin không đổi mã HS
        {"price_min": "1"},
        {"name": ""},
    ],
)
async def test_admin_product_patch_validation(
    api_client: AsyncClient, db_session: AsyncSession, payload: dict[str, Any]
) -> None:
    _, product_id = await exporter_with_product(api_client, "a@x.vn", "Công ty A")
    await login_admin(api_client, db_session)
    assert (
        await api_client.patch(f"/api/admin/products/{product_id}", json=payload)
    ).status_code == 422


# ── Nhật ký ─────────────────────────────────────────────────────────────────
async def test_audit_filter_by_entity(api_client: AsyncClient, db_session: AsyncSession) -> None:
    a, _ = await exporter_with_product(api_client, "a@x.vn", "Công ty A")
    b, _ = await exporter_with_product(api_client, "b@x.vn", "Công ty B")
    await login_admin(api_client, db_session)
    await api_client.patch(f"/api/admin/companies/{a}", json={"is_hidden": True})
    await api_client.patch(f"/api/admin/companies/{b}", json={"is_hidden": True})
    only_a = (
        await api_client.get(
            "/api/admin/audit-logs", params={"entity_type": "company", "entity_id": a}
        )
    ).json()
    assert [r["action_type"] for r in only_a] == ["company.hide"]
    assert only_a[0]["actor_id"] is not None
    hides = (
        await api_client.get("/api/admin/audit-logs", params={"action_type": "company.hide"})
    ).json()
    assert {r["entity_id"] for r in hides} == {a, b}


async def test_audit_is_newest_first_and_paginated(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    a, _ = await exporter_with_product(api_client, "a@x.vn", "Công ty A")
    await login_admin(api_client, db_session)
    for hidden in (True, False, True):
        await api_client.patch(f"/api/admin/companies/{a}", json={"is_hidden": hidden})
    rows = (
        await api_client.get("/api/admin/audit-logs", params={"entity_id": a, "limit": 2})
    ).json()
    assert [r["action_type"] for r in rows] == ["company.hide", "company.unhide"]
    older = (
        await api_client.get(
            "/api/admin/audit-logs", params={"entity_id": a, "limit": 2, "offset": 2}
        )
    ).json()
    assert [r["action_type"] for r in older] == ["company.hide"]
    assert (await api_client.get("/api/admin/audit-logs", params={"limit": 0})).status_code == 422


# ── Thống kê (I5) ───────────────────────────────────────────────────────────
async def test_stats_match_manual_count(api_client: AsyncClient, db_session: AsyncSession) -> None:
    ids = []
    for i in range(4):
        company_id, _ = await exporter_with_product(api_client, f"s{i}@x.vn", f"Công ty {i}")
        ids.append(uuid.UUID(company_id))
    for cid, status in zip(ids, ("verified", "verified", "pending", "rejected"), strict=True):
        await companies.set_verification_state(
            db_session, cid, status=status, level="basic", verified_at=None, expires_at=None
        )
    await login_admin(api_client, db_session)
    stats = (await api_client.get("/api/admin/stats")).json()
    assert (stats["verified_count"], stats["pending_count"]) == (2, 1)


async def test_stats_zero_state(api_client: AsyncClient, db_session: AsyncSession) -> None:
    await login_admin(api_client, db_session)
    stats = (await api_client.get("/api/admin/stats")).json()
    assert (stats["verified_count"], stats["pending_count"]) == (0, 0)


async def test_ai_stats_match_manual_count(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    from app.modules.copilot.models import AiQuery

    def row(confidence: str, days_ago: int = 0) -> AiQuery:
        return AiQuery(
            question="q",
            language="vi",
            confidence=confidence,
            model_name="m",
            latency_ms=1,
            answer="a",
            created_at=dt.datetime.now(dt.UTC) - dt.timedelta(days=days_ago),
        )

    db_session.add_all(
        [row("high"), row("high"), row("medium"), row("low"), row("out_of_scope"), row("high", 30)]
    )
    await db_session.flush()
    await login_admin(api_client, db_session)
    stats = (await api_client.get("/api/admin/stats")).json()
    assert stats["ai_queries_this_week"] == 5  # câu hỏi 30 ngày trước không tính
    assert stats["avg_confidence"] == pytest.approx((3 + 3 + 2 + 1) / 4)  # bỏ out_of_scope


async def test_ai_stats_zero_state_has_no_fake_average(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_admin(api_client, db_session)
    stats = (await api_client.get("/api/admin/stats")).json()
    assert (stats["ai_queries_this_week"], stats["avg_confidence"]) == (0, None)
