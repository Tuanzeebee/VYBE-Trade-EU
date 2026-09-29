"""Test chạy trên Postgres thật (docker compose), DB riêng `evfta_test`."""

import asyncio
import os

import asyncpg
from sqlalchemy.engine import make_url

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
