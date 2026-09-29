import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.service import upsert_hs_codes
from scripts.seed_hs_codes import DEFAULT_CSV, load_csv


@pytest.fixture
async def seeded(db_session: AsyncSession) -> AsyncSession:
    """20 mã HS đợt 1 từ backend/data/hs_codes.csv (mỗi test rollback)."""
    await upsert_hs_codes(db_session, load_csv(DEFAULT_CSV))
    return db_session
