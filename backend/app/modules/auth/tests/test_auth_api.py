import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.service import create_admin

GOOD_PW = "mat-khau-du-dai"


def reg(role: str, email: str = "a@x.vn", password: str = GOOD_PW) -> dict[str, object]:
    return {
        "email": email,
        "password": password,
        "role": role,
        "phone": "+84901234567",
        "preferred_language": "vi",
        "accept_terms": True,
    }


async def test_register_saves_all_fields_and_logs_in(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    r = await api_client.post("/api/auth/register", json=reg("buyer", "B@X.vn"))
    assert r.status_code == 201
    me = (await api_client.get("/api/me")).json()
    assert me["email"] == "b@x.vn"
    assert me["role"] == "buyer"
    assert me["preferred_language"] == "vi"
    row = (
        await db_session.execute(
            text(
                "SELECT phone, consent_accepted_at, consent_version, password_hash "
                "FROM users WHERE email = 'b@x.vn'"
            )
        )
    ).one()
    assert row.phone == "+84901234567"
    assert row.consent_accepted_at is not None
    assert row.consent_version
    assert row.password_hash.startswith("$argon2")


async def test_session_cookie_flags(api_client: AsyncClient) -> None:
    r = await api_client.post("/api/auth/register", json=reg("exporter"))
    cookie = r.headers["set-cookie"].lower()
    assert "evfta_session=" in cookie
    assert "httponly" in cookie
    assert "secure" in cookie
    assert "samesite=lax" in cookie


async def test_register_cannot_create_admin(api_client: AsyncClient) -> None:
    r = await api_client.post("/api/auth/register", json=reg("admin"))
    assert r.status_code == 422


@pytest.mark.parametrize("role", ["exporter", "buyer"])
@pytest.mark.parametrize("pw", ["", "          ", "ngan"])
async def test_register_rejects_blank_or_short_password(
    api_client: AsyncClient, role: str, pw: str
) -> None:
    r = await api_client.post("/api/auth/register", json=reg(role, password=pw))
    assert r.status_code == 422


async def test_register_requires_consent(api_client: AsyncClient) -> None:
    body = reg("exporter") | {"accept_terms": False}
    assert (await api_client.post("/api/auth/register", json=body)).status_code == 422


async def test_duplicate_email_rejected(api_client: AsyncClient) -> None:
    await api_client.post("/api/auth/register", json=reg("buyer"))
    r = await api_client.post("/api/auth/register", json=reg("exporter", "A@x.vn"))
    assert r.status_code == 409


@pytest.mark.parametrize("role", ["exporter", "buyer", "admin"])
async def test_blank_password_login_rejected_for_every_role(
    api_client: AsyncClient, db_session: AsyncSession, role: str
) -> None:
    email = f"{role}@x.vn"
    if role == "admin":
        await create_admin(db_session, email, GOOD_PW)
    else:
        await api_client.post("/api/auth/register", json=reg(role, email))
        await api_client.post("/api/auth/logout")
    r = await api_client.post("/api/auth/login", json={"email": email, "password": ""})
    assert r.status_code == 422
    assert (await api_client.get("/api/me")).status_code == 401


async def test_guest_has_no_session(api_client: AsyncClient) -> None:
    """Vai trò thứ 4 (khách): không có phiên thì mọi endpoint cần đăng nhập trả 401."""
    r = await api_client.post("/api/auth/login", json={"email": "ai@x.vn", "password": ""})
    assert r.status_code == 422
    assert (await api_client.get("/api/me")).status_code == 401


async def test_create_admin_rejects_blank_password(db_session: AsyncSession) -> None:
    with pytest.raises(ValueError):
        await create_admin(db_session, "root@x.vn", "")
    with pytest.raises(ValueError):
        await create_admin(db_session, "root@x.vn", "          ")


async def test_admin_login_works_and_is_audited(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await create_admin(db_session, "root@x.vn", GOOD_PW)
    r = await api_client.post("/api/auth/login", json={"email": "root@x.vn", "password": GOOD_PW})
    assert r.status_code == 200
    assert (await api_client.get("/api/me")).json()["role"] == "admin"
    audited = await db_session.scalar(
        text("SELECT count(*) FROM audit_logs WHERE action_type = 'user.create_admin'")
    )
    assert audited == 1


async def test_lock_after_five_failures_then_unlock(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await api_client.post("/api/auth/register", json=reg("exporter"))
    await api_client.post("/api/auth/logout")
    for _ in range(5):
        r = await api_client.post(
            "/api/auth/login", json={"email": "a@x.vn", "password": "sai-mat-khau"}
        )
        assert r.status_code == 401
    r = await api_client.post("/api/auth/login", json={"email": "a@x.vn", "password": GOOD_PW})
    assert r.status_code == 423
    locked_minutes = await db_session.scalar(
        text(
            "SELECT round(extract(epoch FROM locked_until - now()) / 60) "
            "FROM users WHERE email = 'a@x.vn'"
        )
    )
    assert locked_minutes == 15
    await db_session.execute(
        text("UPDATE users SET locked_until = now() - interval '1 second' WHERE email = 'a@x.vn'")
    )
    r = await api_client.post("/api/auth/login", json={"email": "a@x.vn", "password": GOOD_PW})
    assert r.status_code == 200


async def test_me_requires_session(api_client: AsyncClient) -> None:
    assert (await api_client.get("/api/me")).status_code == 401


async def test_logout_invalidates_session(api_client: AsyncClient) -> None:
    await api_client.post("/api/auth/register", json=reg("buyer"))
    assert (await api_client.post("/api/auth/logout")).status_code == 204
    assert (await api_client.get("/api/me")).status_code == 401


async def test_patch_me_changes_language(api_client: AsyncClient) -> None:
    await api_client.post("/api/auth/register", json=reg("buyer"))
    r = await api_client.patch("/api/me", json={"preferred_language": "en"})
    assert r.status_code == 200
    assert (await api_client.get("/api/me")).json()["preferred_language"] == "en"


async def test_patch_me_requires_session(api_client: AsyncClient) -> None:
    r = await api_client.patch("/api/me", json={"preferred_language": "en"})
    assert r.status_code == 401
