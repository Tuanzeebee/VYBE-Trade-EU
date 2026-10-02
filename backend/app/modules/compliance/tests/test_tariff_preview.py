"""GET /api/exporter/tariff-preview: xem thuế chỉ đọc, KHÔNG ghi compliance_checks.

Dòng thuế trong test là SYNTHETIC (không phải thuế suất thật)."""

import datetime as dt
import uuid
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD, login_as
from app.modules.compliance.tests.test_tariff_api import (
    COFFEE,
    RICE,
    TODAY,
    add_line,
    checks,
)

pytestmark = pytest.mark.usefixtures("hs_seeded")

URL = "/api/exporter/tariff-preview"
NUMBERS = ("mfn_rate", "evfta_rate", "staging_category", "zero_from")


async def preview(client: AsyncClient, hs: str) -> dict[str, Any]:
    r = await client.get(URL, params={"hs_code": hs})
    assert r.status_code == 200, r.text
    return dict(r.json())


async def as_exporter(client: AsyncClient) -> None:
    await login_as(client, "exporter", "exp@x.vn")


async def test_ok_shows_rates_schedule_and_source_without_logging_a_check(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_line(
        db_session,
        reviewer_id,
        staging_category="B5",
        zero_from=dt.date(2030, 1, 1),
        source_url="https://example.test/tariff",
        condition_note="Cần EUR.1",
    )
    await as_exporter(api_client)
    before = await checks(db_session)
    d = await preview(api_client, COFFEE)
    assert d["status"] == "ok"
    assert (d["mfn_rate"], d["evfta_rate"]) == ("12.0000", "6.0000")
    assert (d["staging_category"], d["zero_from"]) == ("B5", "2030-01-01")
    assert d["condition_note"] == "Cần EUR.1"
    assert d["source_url"] == "https://example.test/tariff"
    assert d["hs_formatted"] == "0901.11"
    assert await checks(db_session) == before  # không ghi compliance_checks


async def test_quota_is_needs_review_with_no_numbers(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_line(
        db_session,
        reviewer_id,
        hs=RICE,
        quota_required=True,
        quota_note="Hạn ngạch gạo",
        mfn_rate=Decimal("0"),
        evfta_rate_current=Decimal("0"),
        staging_category="B0",
        zero_from=dt.date(2020, 8, 1),
    )
    await as_exporter(api_client)
    d = await preview(api_client, RICE)
    assert d["status"] == "needs_review"
    assert {k: d[k] for k in NUMBERS} == dict.fromkeys(NUMBERS)  # không bao giờ trả 0%
    assert d["quota_note"] == "Hạn ngạch gạo"


async def test_unsupported_hs_has_no_numbers(api_client: AsyncClient) -> None:
    await as_exporter(api_client)
    d = await preview(api_client, "999999")
    assert d["status"] == "unsupported"
    assert {k: d[k] for k in NUMBERS} == dict.fromkeys(NUMBERS)
    assert d["source_url"] is None


async def test_unreviewed_line_is_shown_with_disclaimer(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await add_line(db_session, None, source_url="https://example.test/draft")
    await as_exporter(api_client)
    d = await preview(api_client, COFFEE)
    assert d["status"] == "ok" and d["mfn_rate"] is not None
    assert d["review_state"] == "UNREVIEWED" and d["disclaimer"] is not None


async def test_expired_line_is_not_used(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_line(db_session, reviewer_id, valid_until=TODAY - dt.timedelta(days=1))
    await as_exporter(api_client)
    assert (await preview(api_client, COFFEE))["status"] == "unsupported"


async def test_eight_digit_code_falls_back_to_the_six_digit_heading(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_line(db_session, reviewer_id)
    await as_exporter(api_client)
    d = await preview(api_client, "09011100")
    assert d["status"] == "ok" and d["hs_code"] == "09011100"


async def test_malformed_hs_code_is_422(api_client: AsyncClient) -> None:
    await as_exporter(api_client)
    r = await api_client.get(URL, params={"hs_code": "12ab"})
    assert r.status_code == 422


async def test_requires_a_session(api_client: AsyncClient) -> None:
    assert (await api_client.get(URL, params={"hs_code": COFFEE})).status_code == 401


async def test_buyer_is_403(api_client: AsyncClient) -> None:
    await login_as(api_client, "buyer", "buyer@x.de")
    assert (await api_client.get(URL, params={"hs_code": COFFEE})).status_code == 403


async def test_admin_is_403(api_client: AsyncClient, db_session: AsyncSession) -> None:
    await create_admin(db_session, "admin@evfta.eu", PASSWORD)
    r = await api_client.post(
        "/api/auth/login", json={"email": "admin@evfta.eu", "password": PASSWORD}
    )
    assert r.status_code == 200, r.text
    assert (await api_client.get(URL, params={"hs_code": COFFEE})).status_code == 403
