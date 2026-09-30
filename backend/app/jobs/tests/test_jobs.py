"""Hạ tầng job nền (Procrastinate trên Postgres) và job hết hạn xác minh hằng ngày."""

import datetime as dt
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.jobs.app import app, conninfo_from_url
from app.jobs.verification_expiry import run_verification_expiry
from app.modules.companies import service as companies
from app.modules.companies.tests.helpers import company_body

NOW = dt.datetime(2026, 10, 1, 2, 15, tzinfo=dt.UTC)


def test_conninfo_converts_sqlalchemy_url_for_psycopg() -> None:
    url = "postgresql+asyncpg://evfta:s3cret@db.example:5433/evfta_prod"
    assert conninfo_from_url(url) == "postgresql://evfta:s3cret@db.example:5433/evfta_prod"


def test_conninfo_keeps_special_characters() -> None:
    assert conninfo_from_url("postgresql+asyncpg://u:p%40ss@h/db") == "postgresql://u:p%40ss@h/db"


async def test_procrastinate_schema_is_installed(db_session: AsyncSession) -> None:
    for table in ("procrastinate_jobs", "procrastinate_periodic_defers"):
        found = await db_session.scalar(text("SELECT to_regclass(:name)"), {"name": table})
        assert found is not None, f"thiếu bảng {table} — migration 0013 chưa áp dụng?"


def test_daily_verification_expiry_is_registered_as_periodic() -> None:
    names = {task.name for task in app.tasks.values()}
    assert "verification_expiry" in names
    crons = [p.cron for p in app.periodic_registry.periodic_tasks.values()]
    assert any(c.split()[2:] == ["*", "*", "*"] for c in crons), f"cần lịch hằng ngày, có {crons}"


async def test_job_body_downgrades_only_expired_companies(
    db_session: AsyncSession, company_id: uuid.UUID
) -> None:
    await companies.set_verification_state(
        db_session,
        company_id,
        status="verified",
        level="basic",
        verified_at=NOW - dt.timedelta(days=400),
        expires_at=NOW - dt.timedelta(days=1),
    )
    assert await run_verification_expiry(db_session, NOW) == 1
    assert (await companies.get_verification_state(db_session, company_id)).status == "unverified"
    assert await run_verification_expiry(db_session, NOW) == 0  # chạy lại không làm gì


@pytest.fixture
async def company_id(api_client, db_session: AsyncSession) -> uuid.UUID:  # type: ignore[no-untyped-def]
    from app.modules.companies.tests.helpers import login_as

    await login_as(api_client, "exporter", "job@x.vn")
    r = await api_client.post("/api/me/company", json=company_body())
    assert r.status_code == 201, r.text
    return uuid.UUID(r.json()["id"])
