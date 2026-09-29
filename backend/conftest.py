"""Test chạy trên Postgres thật (docker compose), DB riêng `evfta_test`."""

import asyncio
import os
from collections.abc import AsyncIterator
from typing import ClassVar

import asyncpg
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://evfta:evfta@localhost:5432/evfta_test"
)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL  # phải đặt trước khi import app


async def _create_db_if_missing() -> None:
    url = make_url(TEST_DATABASE_URL)
    conn = await asyncpg.connect(
        host=url.host, port=url.port, user=url.username, password=url.password, database="postgres"
    )
    try:
        if not await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", url.database):
            await conn.execute(f'CREATE DATABASE "{url.database}"')
    finally:
        await conn.close()


def pytest_sessionstart() -> None:
    from alembic.config import Config

    from alembic import command

    asyncio.run(_create_db_if_missing())
    command.upgrade(Config(os.path.join(os.path.dirname(__file__), "alembic.ini")), "head")


class FakeStorage:
    # File đã ghi qua put(): dùng chung giữa các phiên bản trong một test.
    objects: ClassVar[dict[str, bytes]] = {}

    async def ping(self) -> None:
        return None

    async def put(self, key: str, data: bytes, content_type: str) -> None:
        FakeStorage.objects[key] = data

    async def presign_get(self, key: str) -> str:
        return f"https://fake/{key}"

    async def presign_put(self, key: str, content_type: str) -> str:
        return f"https://fake/{key}"


@pytest.fixture(autouse=True)
async def _reset_rate_limit() -> None:
    """Bộ đếm rate limit nằm trong bộ nhớ tiến trình — mỗi test bắt đầu từ 0."""
    from app.core.ratelimit import reset

    await reset()


@pytest.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    """Mỗi test chạy trong một transaction rồi rollback — bảng append-only không cần DELETE."""
    from app.core.db import get_engine

    async with get_engine().connect() as conn:
        trans = await conn.begin()
        session = AsyncSession(
            bind=conn, expire_on_commit=False, join_transaction_mode="create_savepoint"
        )
        try:
            yield session
        finally:
            await session.close()
            await trans.rollback()


@pytest.fixture
async def api_client(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    """https để cookie Secure được gửi lại."""
    from app.core.db import get_session
    from app.core.storage import get_storage
    from app.main import app

    async def _session() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_session] = _session
    app.dependency_overrides[get_storage] = FakeStorage
    async with AsyncClient(transport=ASGITransport(app=app), base_url="https://test") as c:
        yield c
    app.dependency_overrides.clear()
