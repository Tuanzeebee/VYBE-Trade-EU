from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_engine


async def test_commit_inside_db_session_stays_invisible_outside(db_session: AsyncSession) -> None:
    await db_session.execute(text("CREATE TABLE _rollback_probe (id int)"))
    await db_session.commit()  # service tự commit — với fixture này chỉ nhả savepoint
    async with get_engine().connect() as other:
        found = await other.scalar(text("SELECT to_regclass('public._rollback_probe')"))
    assert found is None


async def test_api_client_uses_fake_storage_and_test_db(api_client: AsyncClient) -> None:
    r = await api_client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"db": "ok", "storage": "ok"}
