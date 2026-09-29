from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.core.config import get_settings
from app.core.db import get_sessionmaker
from app.main import app
from app.modules.auth import seed_demo
from app.modules.auth.models import UserRole
from app.modules.auth.service import create_user

PASSWORD = "correct-horse-1"


@pytest.fixture(autouse=True)
async def clean_db() -> AsyncIterator[None]:
    yield
    async with get_sessionmaker()() as s:
        await s.execute(text("TRUNCATE users, sessions CASCADE"))
        await s.commit()


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    # https vì cookie phiên có cờ Secure.
    async with AsyncClient(transport=ASGITransport(app=app), base_url="https://test") as c:
        yield c


async def make_user(role: UserRole, email: str | None = None) -> str:
    email = email or f"{role.value}@example.com"
    async with get_sessionmaker()() as s:
        await create_user(s, email=email, password=PASSWORD, name="Test", role=role)
    return email


def register_body(**over: Any) -> dict[str, Any]:
    body = {
        "email": "New.User@Example.com",
        "password": PASSWORD,
        "name": "Nguyễn Văn A",
        "company_name": "Công ty A",
        "role": "exporter",
        "preferred_language": "en",
        "consent_accepted": True,
    }
    return body | over


async def db_one(sql: str, **params: Any) -> Any:
    async with get_sessionmaker()() as s:
        return (await s.execute(text(sql), params)).one()


# --- Đăng ký


async def test_register_saves_all_fields_and_sets_secure_cookie(client: AsyncClient) -> None:
    r = await client.post("/api/auth/register", json=register_body())
    assert r.status_code == 201, r.text
    assert r.json()["email"] == "new.user@example.com"
    assert r.json()["role"] == "exporter"
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "secure" in cookie and "samesite=lax" in cookie

    row = await db_one(
        "SELECT role, preferred_language, company_name, consent_accepted_at, consent_version,"
        " password_hash FROM users WHERE email = 'new.user@example.com'"
    )
    assert row.role == "exporter" and row.preferred_language == "en"
    assert row.company_name == "Công ty A"
    assert row.consent_accepted_at is not None
    assert row.consent_version == get_settings().consent_version
    assert row.password_hash.startswith("$argon2")

    me = await client.get("/api/me")
    assert me.status_code == 200 and me.json()["email"] == "new.user@example.com"


@pytest.mark.parametrize(
    "override",
    [
        {"password": ""},
        {"password": "123456789"},  # 9 ký tự
        {"role": "admin"},  # không tự đăng ký admin
        {"consent_accepted": False},
        {"email": "not-an-email"},
    ],
)
async def test_register_rejects_invalid(client: AsyncClient, override: dict[str, Any]) -> None:
    r = await client.post("/api/auth/register", json=register_body(**override))
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "validation_error"
    assert "123456789" not in r.text  # không dội lại mật khẩu


async def test_register_duplicate_email_case_insensitive(client: AsyncClient) -> None:
    await make_user(UserRole.buyer, "dup@example.com")
    r = await client.post("/api/auth/register", json=register_body(email="DUP@Example.com"))
    assert r.status_code == 409


# --- Đăng nhập


@pytest.mark.parametrize("role", ["exporter", "buyer", "admin", "guest"])
async def test_empty_password_blocked_for_every_role(client: AsyncClient, role: str) -> None:
    """Bài học VYBE A1: AuthController cho qua khi mật khẩu rỗng."""
    email = "nobody@example.com" if role == "guest" else await make_user(UserRole(role))
    r = await client.post("/api/auth/login", json={"email": email, "password": ""})
    assert r.status_code == 401
    assert "set-cookie" not in r.headers
    assert (await client.get("/api/me")).status_code == 401


async def test_login_ok_then_logout_revokes_session(client: AsyncClient) -> None:
    email = await make_user(UserRole.buyer)
    r = await client.post("/api/auth/login", json={"email": email.upper(), "password": PASSWORD})
    assert r.status_code == 200 and r.json()["role"] == "buyer"
    token = client.cookies.get(get_settings().session_cookie_name)
    assert (await client.get("/api/me")).status_code == 200

    assert (await client.post("/api/auth/logout")).status_code == 204
    client.cookies.set(get_settings().session_cookie_name, token or "", domain="test")
    assert (await client.get("/api/me")).status_code == 401  # token cũ đã bị thu hồi


async def test_wrong_password_and_unknown_email_same_message(client: AsyncClient) -> None:
    email = await make_user(UserRole.buyer)
    wrong = await client.post("/api/auth/login", json={"email": email, "password": "x" * 12})
    unknown = await client.post(
        "/api/auth/login", json={"email": "ghost@example.com", "password": "x" * 12}
    )
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


async def test_lock_after_5_failures_for_15_minutes(client: AsyncClient) -> None:
    email = await make_user(UserRole.exporter)
    bad = {"email": email, "password": "wrong-password"}
    codes = [(await client.post("/api/auth/login", json=bad)).status_code for _ in range(5)]
    assert codes == [401, 401, 401, 401, 423]

    good = {"email": email, "password": PASSWORD}
    assert (await client.post("/api/auth/login", json=good)).status_code == 423

    row = await db_one("SELECT locked_until - now() AS left FROM users WHERE email = :e", e=email)
    assert 14 * 60 < row.left.total_seconds() <= 15 * 60

    async with get_sessionmaker()() as s:
        await s.execute(
            text("UPDATE users SET locked_until = now() - interval '1 second' WHERE email = :e"),
            {"e": email},
        )
        await s.commit()
    assert (await client.post("/api/auth/login", json=good)).status_code == 200


async def test_expired_session_is_rejected(client: AsyncClient) -> None:
    email = await make_user(UserRole.buyer)
    await client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    async with get_sessionmaker()() as s:
        await s.execute(text("UPDATE sessions SET expires_at = now() - interval '1 second'"))
        await s.commit()
    assert (await client.get("/api/me")).status_code == 401


# --- /api/me


async def test_patch_me_language(client: AsyncClient) -> None:
    email = await make_user(UserRole.buyer)
    await client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    r = await client.patch("/api/me", json={"preferred_language": "en"})
    assert r.status_code == 200 and r.json()["preferred_language"] == "en"
    assert (await client.patch("/api/me", json={"preferred_language": "fr"})).status_code == 422


# --- Phân quyền


@pytest.mark.parametrize(
    ("role", "expected"), [(None, 401), ("buyer", 403), ("exporter", 403), ("admin", 200)]
)
async def test_admin_endpoint_requires_admin(
    client: AsyncClient, role: str | None, expected: int
) -> None:
    if role:
        email = await make_user(UserRole(role))
        await client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    r = await client.get("/api/admin/users")
    assert r.status_code == expected
    if expected == 200:
        assert [u["email"] for u in r.json()] == ["admin@example.com"]


# --- Seed demo


async def test_seed_demo_refuses_outside_dev(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "env", "staging")
    with pytest.raises(RuntimeError):
        await seed_demo.seed()


async def test_seed_demo_idempotent_and_logs_in(client: AsyncClient) -> None:
    assert len(await seed_demo.seed()) == 3
    assert await seed_demo.seed() == []
    r = await client.post(
        "/api/auth/login",
        json={"email": "seller@vybe.demo", "password": seed_demo.DEMO_PASSWORD},
    )
    assert r.status_code == 200 and r.json()["role"] == "exporter"
