from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.core.db import get_sessionmaker
from app.core.storage import get_storage
from app.main import app


class FakeStorage:
    def __init__(self, fail: bool = False) -> None:
        self.fail = fail

    async def ping(self) -> None:
        if self.fail:
            raise ConnectionError("storage down")

    async def presign_get(self, key: str) -> str:
        return f"https://fake/{key}"

    async def presign_put(self, key: str, content_type: str) -> str:
        return f"https://fake/{key}"


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


async def test_health_ok(client: AsyncClient) -> None:
    app.dependency_overrides[get_storage] = FakeStorage
    r = await client.get("/health", headers={"X-Request-ID": "abc123"})
    assert r.status_code == 200
    assert r.json() == {"db": "ok", "storage": "ok"}
    assert r.headers["x-request-id"] == "abc123"


async def test_health_503_when_storage_down(client: AsyncClient) -> None:
    app.dependency_overrides[get_storage] = lambda: FakeStorage(fail=True)
    r = await client.get("/health")
    assert r.status_code == 503
    assert r.json() == {"db": "ok", "storage": "error"}
    assert r.headers["x-request-id"]


async def test_unknown_route_uses_standard_error_shape(client: AsyncClient) -> None:
    r = await client.get("/khong-ton-tai")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "http_404"


async def test_migration_enables_extensions() -> None:
    async with get_sessionmaker()() as s:
        rows = await s.execute(text("SELECT extname FROM pg_extension"))
        names = {r[0] for r in rows}
    assert {"vector", "pg_trgm", "unaccent"} <= names
