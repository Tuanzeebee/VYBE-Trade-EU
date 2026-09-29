import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.service import upsert_hs_codes
from scripts.seed_hs_codes import DEFAULT_CSV, load_csv


@pytest.fixture(autouse=True)
def _rfq_limit_for_fixtures(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test khác dùng buyer chưa xác minh chỉ để có RFQ; chính sách thật (0) được test riêng."""
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "rfq_daily_limit_unverified", 5)


@pytest.fixture(autouse=True)
async def hs_seeded(db_session: AsyncSession) -> AsyncSession:
    """20 mã HS đợt 1 (B4) để sản phẩm có mã HS hợp lệ; mỗi test rollback."""
    await upsert_hs_codes(db_session, load_csv(DEFAULT_CSV))
    return db_session
