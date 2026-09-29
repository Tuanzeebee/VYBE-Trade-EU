"""J2: xóa tài khoản = ẩn danh hóa PII, giữ audit."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD, company_body, login_as

URL = "/api/me/delete"


async def register_with_company(
    client: AsyncClient, session: AsyncSession, email: str = "chu@x.vn"
) -> tuple[str, str]:
    await login_as(client, "exporter", email)
    await client.patch("/api/me", json={"phone": "+84 912 345 678"})
    company = (await client.post("/api/me/company", json=company_body())).json()
    row = await session.execute(text("SELECT id FROM users WHERE email = :e"), {"e": email})
    return str(row.scalar_one()), company["id"]


async def test_delete_makes_pii_unreadable(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    user_id, company_id = await register_with_company(api_client, db_session)
    before: str = (
        await db_session.execute(
            text("SELECT password_hash FROM users WHERE id = CAST(:i AS uuid)"), {"i": user_id}
        )
    ).scalar_one()

    r = await api_client.post(URL, json={"password": PASSWORD})
    assert r.status_code == 204, r.text

    user = (
        await db_session.execute(
            text(
                "SELECT email, phone, password_hash, deleted_at FROM users "
                "WHERE id = CAST(:i AS uuid)"
            ),
            {"i": user_id},
        )
    ).one()
    assert user.email == f"deleted-{user_id}@invalid"
    assert user.phone is None
    assert user.password_hash != before
    assert user.deleted_at is not None
    company = (
        await db_session.execute(
            text(
                "SELECT contact_email, address, is_hidden FROM companies "
                "WHERE id = CAST(:i AS uuid)"
            ),
            {"i": company_id},
        )
    ).one()
    assert (company.contact_email, company.address, company.is_hidden) == (None, None, True)
    sessions = await db_session.execute(
        text("SELECT count(*) FROM sessions WHERE user_id = CAST(:i AS uuid)"), {"i": user_id}
    )
    assert sessions.scalar_one() == 0


async def test_audit_logs_intact_after_delete(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    user_id, _ = await register_with_company(api_client, db_session)
    audit_before: int = (
        await db_session.execute(text("SELECT count(*) FROM audit_logs"))
    ).scalar_one()
    assert (await api_client.post(URL, json={"password": PASSWORD})).status_code == 204
    rows = (
        await db_session.execute(
            text(
                "SELECT actor_id, action_type, entity_id, before_state, after_state "
                "FROM audit_logs WHERE action_type = 'user.delete'"
            )
        )
    ).all()
    assert len(rows) == 1
    assert (str(rows[0].actor_id), rows[0].entity_id) == (user_id, user_id)
    assert rows[0].after_state == {"deleted": True}
    assert "chu@x.vn" not in str(rows[0].before_state) + str(rows[0].after_state)
    audit_after: int = (
        await db_session.execute(text("SELECT count(*) FROM audit_logs"))
    ).scalar_one()
    assert audit_after == audit_before + 1  # không dòng nào bị xóa hay sửa


async def test_deleted_user_cannot_login_and_old_session_is_dead(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await register_with_company(api_client, db_session)
    cookie = api_client.cookies.get("evfta_session")
    assert (await api_client.post(URL, json={"password": PASSWORD})).status_code == 204
    r = await api_client.post("/api/auth/login", json={"email": "chu@x.vn", "password": PASSWORD})
    assert r.status_code == 401
    api_client.cookies.set("evfta_session", cookie or "")
    assert (await api_client.get("/api/me")).status_code == 401


async def test_email_reusable_after_delete(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    old_id, _ = await register_with_company(api_client, db_session)
    assert (await api_client.post(URL, json={"password": PASSWORD})).status_code == 204
    await login_as(api_client, "buyer", "chu@x.vn")  # đăng ký lại cùng email
    new_id = (await api_client.get("/api/me")).json()["id"]
    assert new_id != old_id
    assert (await api_client.get("/api/me/company")).status_code == 404  # tài khoản mới trống


async def test_wrong_password_changes_nothing(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    user_id, _ = await register_with_company(api_client, db_session)
    r = await api_client.post(URL, json={"password": "sai-mat-khau-day"})
    assert r.status_code == 403 and r.json()["error"]["code"] == "wrong_password"
    row = (
        await db_session.execute(
            text("SELECT email, deleted_at FROM users WHERE id = CAST(:i AS uuid)"), {"i": user_id}
        )
    ).one()
    assert (row.email, row.deleted_at) == ("chu@x.vn", None)
    assert (await api_client.get("/api/me")).status_code == 200


async def test_delete_needs_session_password_and_is_not_for_admins(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    assert (await api_client.post(URL, json={"password": PASSWORD})).status_code == 401
    await login_as(api_client, "buyer", "b@x.de")
    assert (await api_client.post(URL, json={})).status_code == 422
    assert (await api_client.post(URL, json={"password": ""})).status_code == 422
    await api_client.post("/api/auth/logout")
    await create_admin(db_session, "admin@evfta.eu", PASSWORD)
    login = {"email": "admin@evfta.eu", "password": PASSWORD}
    assert (await api_client.post("/api/auth/login", json=login)).status_code == 200
    assert (await api_client.post(URL, json={"password": PASSWORD})).status_code == 403


async def test_deleted_owners_verified_company_disappears_from_the_public(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    from app.modules.catalog.service import upsert_hs_codes
    from app.modules.companies.tests.helpers import product_body
    from scripts.seed_hs_codes import DEFAULT_CSV, load_csv

    await upsert_hs_codes(db_session, load_csv(DEFAULT_CSV))
    _, company_id = await register_with_company(api_client, db_session)
    slug = (await api_client.get("/api/me/company")).json()["slug"]
    await api_client.post("/api/exporter/products", json=product_body())
    await db_session.execute(
        text("UPDATE companies SET verification_status = 'verified', verified_at = now()")
    )
    assert (await api_client.get(f"/api/public/companies/{slug}")).status_code == 200
    assert (await api_client.get("/api/public/suppliers")).json()["total"] == 1

    assert (await api_client.post(URL, json={"password": PASSWORD})).status_code == 204
    assert (await api_client.get(f"/api/public/companies/{slug}")).status_code == 404
    assert (await api_client.get("/api/public/suppliers")).json()["total"] == 0

    # Admin không đưa hồ sơ của người đã xóa tài khoản trở lại công khai.
    await create_admin(db_session, "admin@evfta.eu", PASSWORD)
    login = {"email": "admin@evfta.eu", "password": PASSWORD}
    await api_client.post("/api/auth/login", json=login)
    r = await api_client.patch(f"/api/admin/companies/{company_id}", json={"is_hidden": False})
    assert r.status_code == 409 and r.json()["error"]["code"] == "account_deleted"


async def test_notifications_and_escalation_contacts_are_cleaned(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    from app.modules.notifications import center
    from app.modules.notifications.models import NotificationType

    user_id, _ = await register_with_company(api_client, db_session)
    await center.create_notification(
        db_session, uuid.UUID(user_id), NotificationType.rfq, {"n": 1}, role="exporter"
    )
    query_id: uuid.UUID = (
        await db_session.execute(
            text(
                "INSERT INTO ai_queries (id, user_id, question, language, confidence, latency_ms, "
                "model_name) VALUES (gen_random_uuid(), CAST(:u AS uuid), 'q', 'vi', 'low', 1, "
                "'fake') RETURNING id"
            ),
            {"u": user_id},
        )
    ).scalar_one()
    await db_session.execute(
        text(
            "INSERT INTO escalation_tickets (id, query_id, user_id, contact_email) "
            "VALUES (gen_random_uuid(), :q, CAST(:u AS uuid), 'chu@x.vn')"
        ),
        {"q": query_id, "u": user_id},
    )
    assert (await api_client.post(URL, json={"password": PASSWORD})).status_code == 204
    notes = await db_session.execute(text("SELECT count(*) FROM notifications"))
    assert notes.scalar_one() == 0
    email = await db_session.execute(text("SELECT contact_email FROM escalation_tickets"))
    assert email.scalar_one() == "redacted@invalid"


@pytest.mark.parametrize("needle", ["chu@x.vn", "912 345 678"])
async def test_no_original_pii_remains_in_users_table(
    api_client: AsyncClient, db_session: AsyncSession, needle: str
) -> None:
    await register_with_company(api_client, db_session)
    assert (await api_client.post(URL, json={"password": PASSWORD})).status_code == 204
    dump = await db_session.execute(text("SELECT row_to_json(u)::text FROM users u"))
    rows: list[str] = list(dump.scalars())
    assert rows and all(needle not in row for row in rows)
