"""J8: kiểm Origin cho request ghi và header bảo mật."""

import pytest
from httpx import AsyncClient

from app.core.config import get_settings

ALLOWED = get_settings().cors_origins[0]
EVIL = "https://evil.example"
WRITES = [
    ("POST", "/api/public/tariff"),
    ("POST", "/api/auth/login"),
    ("PATCH", "/api/me"),
    ("DELETE", "/api/exporter/products/00000000-0000-0000-0000-000000000000"),
    ("PUT", "/api/anything"),
]


@pytest.mark.parametrize(("method", "path"), WRITES)
async def test_write_from_foreign_origin_is_rejected(
    api_client: AsyncClient, method: str, path: str
) -> None:
    r = await api_client.request(method, path, headers={"Origin": EVIL}, json={})
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "forbidden_origin"


@pytest.mark.parametrize(("method", "path"), WRITES[:4])
async def test_write_from_our_origin_reaches_the_application(
    api_client: AsyncClient, method: str, path: str
) -> None:
    r = await api_client.request(method, path, headers={"Origin": ALLOWED}, json={})
    assert r.status_code != 403 or r.json()["error"]["code"] != "forbidden_origin"


async def test_null_origin_is_rejected(api_client: AsyncClient) -> None:
    r = await api_client.post("/api/auth/login", headers={"Origin": "null"}, json={})
    assert r.status_code == 403


async def test_referer_is_used_when_origin_is_absent(api_client: AsyncClient) -> None:
    bad = await api_client.post("/api/auth/login", headers={"Referer": f"{EVIL}/page"}, json={})
    assert bad.status_code == 403
    good = await api_client.post(
        "/api/auth/login", headers={"Referer": f"{ALLOWED}/vi/login"}, json={}
    )
    assert good.status_code != 403 or good.json()["error"]["code"] != "forbidden_origin"
    junk = await api_client.post("/api/auth/login", headers={"Referer": "not a url"}, json={})
    assert junk.status_code == 403


async def test_requests_without_origin_or_referer_are_not_browsers_and_pass(
    api_client: AsyncClient,
) -> None:
    r = await api_client.post("/api/auth/login", json={})
    assert r.status_code != 403 or r.json()["error"]["code"] != "forbidden_origin"


async def test_origin_beats_a_friendly_referer(api_client: AsyncClient) -> None:
    r = await api_client.post(
        "/api/auth/login", headers={"Origin": EVIL, "Referer": f"{ALLOWED}/x"}, json={}
    )
    assert r.status_code == 403


async def test_reads_and_preflight_are_not_blocked_by_the_origin_check(
    api_client: AsyncClient,
) -> None:
    assert (await api_client.get("/health", headers={"Origin": EVIL})).status_code in (200, 503)
    r = await api_client.options(
        "/api/auth/login",
        headers={"Origin": ALLOWED, "Access-Control-Request-Method": "POST"},
    )
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == ALLOWED


async def test_security_headers_are_on_every_response(api_client: AsyncClient) -> None:
    for r in (
        await api_client.get("/health"),
        await api_client.get("/api/me"),  # 401 cũng phải có header
        await api_client.post("/api/auth/login", headers={"Origin": EVIL}, json={}),  # 403 cũng vậy
    ):
        assert r.headers["x-content-type-options"] == "nosniff"
        assert r.headers["x-frame-options"] == "DENY"
        assert r.headers["referrer-policy"] == "no-referrer"


async def test_private_areas_are_not_cacheable_but_public_ones_are_left_alone(
    api_client: AsyncClient,
) -> None:
    for path in ("/api/me", "/api/exporter/dashboard", "/api/admin/stats", "/api/auth/logout"):
        assert (await api_client.get(path)).headers["cache-control"] == "no-store"
    assert "cache-control" not in (await api_client.get("/api/public/hs-codes")).headers


async def test_hsts_follows_the_secure_cookie_setting(
    api_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.core.web_security import SecurityHeadersMiddleware

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b""})

    sent: list[dict[str, object]] = []

    async def collect(message: dict[str, object]) -> None:
        sent.append(message)

    for enabled in (True, False):
        sent.clear()
        wrapped = SecurityHeadersMiddleware(app, hsts=enabled)
        await wrapped({"type": "http", "path": "/x", "headers": []}, None, collect)  # type: ignore[arg-type]
        names = {n for n, _ in sent[0]["headers"]}  # type: ignore[attr-defined]
        assert (b"strict-transport-security" in names) is enabled
