import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.service import create_admin
from app.modules.catalog.service import upsert_hs_codes
from scripts.seed_hs_codes import DEFAULT_CSV, load_csv


@pytest.fixture
async def hs_seeded(db_session: AsyncSession) -> AsyncSession:
    """20 mã HS đợt 1 (B4) để dòng thuế có mã HS hợp lệ; mỗi test rollback."""
    await upsert_hs_codes(db_session, load_csv(DEFAULT_CSV))
    return db_session


@pytest.fixture
async def reviewer_id(db_session: AsyncSession):  # type: ignore[no-untyped-def]
    return await create_admin(db_session, "luat-tm@evfta.eu", "correct-horse-battery")
