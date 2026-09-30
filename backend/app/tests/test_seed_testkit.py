"""Bộ dữ liệu thử thủ công: tạo đủ vai trò, đăng nhập được, dữ liệu luật vào ở trạng thái CHƯA DUYỆT."""

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.service import upsert_hs_codes
from app.modules.compliance.models import ProductSpecificRule, TariffLine
from scripts.seed_hs_codes import DEFAULT_CSV, load_csv
from scripts.seed_testkit import ACCOUNTS, PASSWORD, load_drafts, purge, seed


@pytest.fixture(autouse=True)
async def hs(db_session: AsyncSession) -> None:
    await upsert_hs_codes(db_session, load_csv(DEFAULT_CSV))


async def test_every_account_can_log_in_with_the_shared_password(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    assert await seed(db_session) == len(ACCOUNTS)
    assert await seed(db_session) == 0  # chạy lại không trùng
    for account in ACCOUNTS:
        r = await api_client.post(
            "/api/auth/login", json={"email": account.email, "password": PASSWORD}
        )
        assert r.status_code == 200, (account.email, r.text)
        assert (await api_client.get("/api/me")).json()["role"] == account.role.value
        await api_client.post("/api/auth/logout")


async def test_verified_exporters_are_public_and_the_unverified_one_is_not(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await seed(db_session)
    names = [
        i["legal_name"] for i in (await api_client.get("/api/public/suppliers")).json()["items"]
    ]
    assert len(names) == 2 and all("đã xác minh" in n for n in names)
    assert (await api_client.get("/api/public/companies/test-chua-xac-minh")).status_code == 404


async def test_law_drafts_are_loaded_unreviewed(db_session: AsyncSession) -> None:
    await seed(db_session)
    await db_session.execute(
        text(
            "INSERT INTO users (email, password_hash, role, preferred_language, consent_accepted_at, "
            "consent_version, failed_login_count) SELECT 'x', 'x', 'admin', 'vi', now(), 'v', 0 WHERE false"
        )
    )
    assert await load_drafts(db_session) == (20, 12)
    for model in (TariffLine, ProductSpecificRule):
        reviewed = await db_session.scalar(
            select(func.count()).select_from(model).where(model.reviewed_by.is_not(None))
        )
        assert reviewed == 0


async def test_purge_removes_everything_it_created(db_session: AsyncSession) -> None:
    await seed(db_session)
    assert await purge(db_session) == len(ACCOUNTS)
    for table in ("users", "companies", "products"):
        assert (await db_session.execute(text(f"SELECT count(*) FROM {table}"))).scalar_one() == 0  # noqa: S608
