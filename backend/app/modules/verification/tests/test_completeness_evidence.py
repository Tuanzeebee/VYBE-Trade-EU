"""Dòng 'evidence' của điểm hoàn thiện (B3) được bật ở C6, và job hằng ngày tính lại."""

import datetime as dt
import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.jobs.verification_expiry import run_verification_expiry
from app.modules.companies import service as companies
from app.modules.companies.tests.helpers import product_body
from app.modules.verification import evidence_service
from app.modules.verification.models import ApprovalStatus, Evidence
from app.modules.verification.tests.helpers import TODAY, add_rule, add_type, prove_ownership

pytestmark = pytest.mark.usefixtures("hs_seeded")


async def score(client: AsyncClient) -> Decimal:
    return Decimal((await client.get("/api/me/company/completeness")).json()["score"])


async def missing_keys(client: AsyncClient) -> list[str]:
    return [
        m["field"] for m in (await client.get("/api/me/company/completeness")).json()["missing"]
    ]


async def add_evidence(
    session: AsyncSession,
    company_id: uuid.UUID,
    status: ApprovalStatus = ApprovalStatus.pending,
    expires: dt.date | None = None,
) -> Evidence:
    row = Evidence(
        company_id=company_id,
        type_code="iso_9001",
        file_key=f"evidence/{company_id}/a.pdf",
        issued_at=TODAY - dt.timedelta(days=30),
        expires_at=expires,
        approval_status=status,
    )
    session.add(row)
    await session.flush()
    return row


async def test_evidence_row_raises_completeness_denominator(
    api_client: AsyncClient, db_session: AsyncSession, company_id: uuid.UUID, reviewer_id: uuid.UUID
) -> None:
    """Có bằng chứng đã nộp thì điểm tăng đúng trọng số 15 (điểm tuyệt đối +15/tổng trọng số)."""
    await add_type(db_session, reviewer_id)
    before = await score(api_client)
    assert "evidence" in await missing_keys(api_client)
    await add_evidence(db_session, company_id)
    await companies.refresh_completeness(db_session, company_id)
    after = await score(api_client)
    assert after > before
    assert "evidence" not in await missing_keys(api_client)


async def test_rejected_evidence_does_not_count_as_submitted(
    api_client: AsyncClient, db_session: AsyncSession, company_id: uuid.UUID, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id)
    await add_evidence(db_session, company_id, status=ApprovalStatus.rejected)
    await companies.refresh_completeness(db_session, company_id)
    assert "evidence" in await missing_keys(api_client)


async def test_expired_evidence_lowers_completeness_after_daily_job(
    api_client: AsyncClient,
    db_session: AsyncSession,
    company_id: uuid.UUID,
    reviewer_id: uuid.UUID,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await add_type(db_session, reviewer_id)
    await add_evidence(db_session, company_id, expires=TODAY + dt.timedelta(days=10))
    await companies.refresh_completeness(db_session, company_id)
    with_evidence = await score(api_client)
    later = dt.datetime.combine(TODAY + dt.timedelta(days=10), dt.time(2, 15), tzinfo=dt.UTC)
    monkeypatch.setattr(
        evidence_service, "_today", lambda: later.date()
    )  # đồng hồ nhảy tới ngày đó
    await run_verification_expiry(db_session, later)
    assert await score(api_client) < with_evidence
    assert "evidence" in await missing_keys(api_client)


async def test_daily_job_downgrades_level_when_evidence_expires(
    api_client: AsyncClient, db_session: AsyncSession, company_id: uuid.UUID, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id)
    await add_rule(db_session, reviewer_id, "iso_9001")
    await api_client.post("/api/exporter/products", json=product_body(hs_code="090121"))
    expiry = TODAY + dt.timedelta(days=10)
    await add_evidence(db_session, company_id, ApprovalStatus.approved, expiry)
    await prove_ownership(db_session, company_id)
    now = dt.datetime.combine(TODAY, dt.time(2, 15), tzinfo=dt.UTC)
    await companies.set_verification_state(
        db_session,
        company_id,
        status="verified",
        level="basic",
        verified_at=now,
        expires_at=now + dt.timedelta(days=300),
    )
    await run_verification_expiry(db_session, now)
    assert (
        await companies.get_verification_state(db_session, company_id)
    ).level == "evfta_verified"
    later = dt.datetime.combine(expiry, dt.time(2, 15), tzinfo=dt.UTC)
    await run_verification_expiry(db_session, later)
    state = await companies.get_verification_state(db_session, company_id)
    assert (state.status, state.level) == ("verified", "basic")
