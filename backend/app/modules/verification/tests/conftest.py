import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD, company_body, login_as


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> CurrentUser:
    admin_id = await create_admin(db_session, "admin@evfta.eu", PASSWORD)
    return CurrentUser(id=admin_id, email="admin@evfta.eu", role="admin", preferred_language="vi")


@pytest.fixture
async def exporter_user(api_client: AsyncClient) -> CurrentUser:
    await login_as(api_client, "exporter", "exp@x.vn")
    me = (await api_client.get("/api/me")).json()
    return CurrentUser(
        id=uuid.UUID(me["id"]), email=me["email"], role="exporter", preferred_language="vi"
    )


@pytest.fixture
async def company_id(api_client: AsyncClient, exporter_user: CurrentUser) -> uuid.UUID:
    r = await api_client.post("/api/me/company", json=company_body())
    assert r.status_code == 201, r.text
    return uuid.UUID(r.json()["id"])


@pytest.fixture
async def hs_seeded(db_session: AsyncSession) -> AsyncSession:
    """20 mã HS đợt 1 (B4) để sản phẩm có mã HS hợp lệ; mỗi test rollback."""
    from app.modules.catalog.service import upsert_hs_codes
    from scripts.seed_hs_codes import DEFAULT_CSV, load_csv

    await upsert_hs_codes(db_session, load_csv(DEFAULT_CSV))
    return db_session


@pytest.fixture
async def reviewer_id(db_session: AsyncSession) -> uuid.UUID:
    """Người duyệt luật TM (một admin) — dùng làm reviewed_by cho dữ liệu synthetic."""
    return await create_admin(db_session, "luat-tm@evfta.eu", PASSWORD)
