import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD


@pytest.fixture
async def reviewer_id(db_session: AsyncSession) -> uuid.UUID:
    """Người duyệt corpus (một admin) — dùng làm reviewed_by cho văn bản synthetic."""
    return await create_admin(db_session, "luat-tm@evfta.eu", PASSWORD)
