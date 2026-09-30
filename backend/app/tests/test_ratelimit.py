import pytest
from httpx import AsyncClient

from app.main import app

# Nhóm route không cần phiên (khớp AGENTS.md §5.8 và J1).
OPEN_PREFIXES = ("/api/public", "/api/auth/", "/health", "/docs", "/redoc", "/openapi.json")


async def test_public_31st_request_gets_429(api_client: AsyncClient) -> None:
    for i in range(30):
        r = await api_client.get("/api/public/hs-codes", params={"q": "gao"})
        assert r.status_code == 200, f"request {i + 1}: {r.text}"
    r = await api_client.get("/api/public/hs-codes", params={"q": "gao"})
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "rate_limited"  # đúng dạng lỗi chuẩn
    assert int(r.headers["retry-after"]) > 0


async def test_limit_is_shared_across_public_endpoints(api_client: AsyncClient) -> None:
    """30 lần gọi lẫn lộn hai endpoint công khai vẫn chỉ được 30 lần."""
    for i in range(30):
        path = "/api/public/hs-codes" if i % 2 else "/api/public/companies/khong-ton-tai"
        assert (await api_client.get(path)).status_code in (200, 404)
    assert (await api_client.get("/api/public/hs-codes")).status_code == 429


async def test_non_public_routes_are_not_rate_limited_by_public_limit(
    api_client: AsyncClient,
) -> None:
    for _ in range(40):
        assert (await api_client.get("/health")).status_code in (200, 503)


def _protected_routes() -> list[tuple[str, str]]:
    """Route lấy từ OpenAPI (FastAPI mới gói router con nên app.routes không liệt kê từng route)."""
    found: list[tuple[str, str]] = []
    for path, operations in app.openapi()["paths"].items():
        if path.startswith(OPEN_PREFIXES):
            continue
        found.extend((method.upper(), path) for method in operations)
    return sorted(found)


def test_protected_routes_are_discovered() -> None:
    """Chốt là test quét thật sự có route để quét (không pass vì danh sách rỗng)."""
    paths = {p for _, p in _protected_routes()}
    assert "/api/me/company" in paths
    assert "/api/admin/compliance-checks.csv" in paths


@pytest.mark.parametrize(("method", "path"), _protected_routes())
async def test_every_non_public_route_requires_session(
    api_client: AsyncClient, method: str, path: str
) -> None:
    concrete = path.replace("{product_id}", "00000000-0000-0000-0000-000000000000")
    concrete = concrete.replace("{slug}", "x")
    r = await api_client.request(method, concrete)
    assert r.status_code == 401, f"{method} {path} trả {r.status_code}"
