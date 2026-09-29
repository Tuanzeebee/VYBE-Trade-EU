"""J4, J5: dữ liệu DEMO gắn nhãn, chạy lại không trùng, xóa sạch, chặn production."""

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.service import upsert_hs_codes
from app.modules.companies.tests.helpers import login_as
from scripts.seed_demo import (
    DEMO_DOMAIN,
    DEMO_PREFIX,
    assert_allowed,
    demo_companies,
    purge,
    seed,
)
from scripts.seed_hs_codes import DEFAULT_CSV, load_csv


@pytest.fixture(autouse=True)
async def hs_seeded(db_session: AsyncSession) -> None:
    await upsert_hs_codes(db_session, load_csv(DEFAULT_CSV))


async def one(session: AsyncSession, sql: str) -> int:
    return int((await session.execute(text(sql))).scalar_one())


def test_demo_data_is_deterministic_and_labelled() -> None:
    first, second = demo_companies(30), demo_companies(30)
    assert first == second
    assert len({c.email for c in first}) == len({c.slug for c in first}) == 30
    assert all(c.legal_name.startswith(DEMO_PREFIX) for c in first)
    assert all(c.email.endswith(f"@{DEMO_DOMAIN}") for c in first)
    assert all("DEMO" in c.description_vi and "DEMO" in c.description_en for c in first)
    assert {c.level.value for c in first} == {"basic", "evfta_verified"}


async def test_seed_creates_verified_public_companies_with_products(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    assert await seed(db_session, 25) == 25
    assert (
        await one(
            db_session, "SELECT count(*) FROM companies WHERE verification_status = 'verified'"
        )
        == 25
    )
    assert await one(db_session, "SELECT count(*) FROM products") >= 25
    body = (await api_client.get("/api/public/suppliers", params={"page_size": 50})).json()
    assert body["total"] == 25
    assert all(item["legal_name"].startswith(DEMO_PREFIX) for item in body["items"])


async def test_seed_is_idempotent_and_can_grow(db_session: AsyncSession) -> None:
    assert await seed(db_session, 10) == 10
    assert await seed(db_session, 10) == 0
    assert await seed(db_session, 14) == 4
    assert await one(db_session, "SELECT count(*) FROM companies") == 14


async def test_demo_accounts_cannot_log_in(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await seed(db_session, 1)
    r = await api_client.post(
        "/api/auth/login",
        json={"email": f"demo-0001@{DEMO_DOMAIN}", "password": "mat-khau-du-dai"},
    )
    assert r.status_code in (
        401,
        422,
    )  # miền .invalid còn bị bộ kiểm email từ chối; không bao giờ 200


async def test_purge_removes_only_demo_data(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_as(api_client, "exporter", "real@x.vn")
    await api_client.post(
        "/api/me/company",
        json={"legal_name": "Công ty thật", "country": "VN", "business_type": "manufacturer"},
    )
    await seed(db_session, 12)
    assert await purge(db_session) == 12
    assert (
        await one(db_session, f"SELECT count(*) FROM users WHERE email LIKE '%@{DEMO_DOMAIN}'")  # noqa: S608
        == 0
    )
    assert await one(db_session, "SELECT count(*) FROM companies") == 1
    assert await one(db_session, "SELECT count(*) FROM products") == 0
    assert await one(db_session, "SELECT count(*) FROM users WHERE email = 'real@x.vn'") == 1
    assert await purge(db_session) == 0  # lần hai không còn gì


async def test_seed_requires_the_hs_catalog(db_session: AsyncSession) -> None:
    await db_session.execute(text("DELETE FROM hs_codes"))
    with pytest.raises(SystemExit, match="mã HS"):
        await seed(db_session, 1)


@pytest.mark.parametrize(
    ("host", "database", "allow_remote"),
    [
        ("localhost", "evfta_prod", True),  # production luôn bị chặn, kể cả có cờ
        ("db.eu", "evfta-production", True),
        ("localhost", None, True),
        ("localhost", "evfta_staging", False),
        ("staging-db.eu", "evfta", False),
    ],
)
def test_refuses_production_and_unflagged_remote(
    host: str, database: str | None, allow_remote: bool
) -> None:
    with pytest.raises(SystemExit):
        assert_allowed(host, database, allow_remote)


def test_local_dev_and_flagged_staging_are_allowed() -> None:
    assert_allowed("localhost", "evfta", False)
    assert_allowed("127.0.0.1", "evfta_test", False)
    assert_allowed("staging-db.eu", "evfta_staging", True)
