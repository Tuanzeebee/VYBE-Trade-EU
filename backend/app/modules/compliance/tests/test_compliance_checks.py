import csv
import io
import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog
from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD, login_as
from app.modules.compliance.models import CheckType, ComplianceCheck
from app.modules.compliance.service import log_check

pytestmark = pytest.mark.usefixtures("hs_seeded")


async def _count(session: AsyncSession) -> int:
    return int(await session.scalar(select(func.count()).select_from(ComplianceCheck)) or 0)


async def _tariff_check(session: AsyncSession, **over: object) -> ComplianceCheck:
    fields: dict[str, object] = {
        "check_type": CheckType.tariff,
        "hs_code": "100630",
        "destination_country": "DE",
        "product_value": Decimal("10000.00"),
        "mfn_duty_rate": Decimal("12.0000"),
        "evfta_duty_rate": Decimal("6.0000"),
        "savings_amount": Decimal("600.00"),
        "status": "ok",
    }
    fields.update(over)
    return await log_check(session, **fields)  # type: ignore[arg-type]


async def test_each_call_writes_exactly_one_row_even_for_guest(db_session: AsyncSession) -> None:
    before = await _count(db_session)
    row = await _tariff_check(db_session)  # khách: company_id None
    assert await _count(db_session) == before + 1
    assert row.company_id is None
    assert row.id is not None and row.created_at is not None


async def test_unsupported_and_needs_review_rows_hold_no_numbers(db_session: AsyncSession) -> None:
    row = await log_check(
        db_session,
        check_type=CheckType.tariff,
        hs_code="999999",
        destination_country="FR",
        product_value=Decimal("500.00"),
        status="unsupported",
    )
    await db_session.refresh(row)
    assert (row.mfn_duty_rate, row.evfta_duty_rate, row.savings_amount) == (None, None, None)


async def test_money_is_exact_decimal(db_session: AsyncSession) -> None:
    row = await _tariff_check(
        db_session, product_value=Decimal("1234567.89"), savings_amount=Decimal("0.10")
    )
    await db_session.refresh(row)
    assert row.product_value == Decimal("1234567.89")
    assert row.savings_amount == Decimal("0.10")


@pytest.mark.parametrize(
    "sql",
    [
        "UPDATE compliance_checks SET status = 'fail'",
        "DELETE FROM compliance_checks",
        "TRUNCATE compliance_checks",
    ],
)
async def test_compliance_checks_append_only(db_session: AsyncSession, sql: str) -> None:
    await _tariff_check(db_session)
    with pytest.raises(DBAPIError, match="append-only"):
        await db_session.execute(text(sql))


@pytest.mark.parametrize(
    "over",
    [
        {"status": "pass"},  # trạng thái RoO không hợp lệ cho loại tariff
        {"status": "maybe"},
        {"product_value": Decimal("0")},
        {"product_value": Decimal("-1.00")},
        {"destination_country": "de"},
    ],
)
async def test_bad_rows_rejected_by_database(
    db_session: AsyncSession, over: dict[str, object]
) -> None:
    with pytest.raises(DBAPIError):
        await _tariff_check(db_session, **over)


async def _admin_login(client: AsyncClient, session: AsyncSession) -> uuid.UUID:
    admin_id = await create_admin(session, "admin@evfta.eu", PASSWORD)
    r = await client.post("/api/auth/login", json={"email": "admin@evfta.eu", "password": PASSWORD})
    assert r.status_code == 200, r.text
    return admin_id


async def test_admin_csv_export(api_client: AsyncClient, db_session: AsyncSession) -> None:
    await _tariff_check(db_session)
    await log_check(
        db_session,
        check_type=CheckType.roo,
        hs_code="850490",
        destination_country="DE",
        product_value=Decimal("1000.00"),
        origin_country="VN",
        regional_value_content_pct=Decimal("69.00"),
        originating_status="pass",
        status="pass",
    )
    admin_id = await _admin_login(api_client, db_session)

    r = await api_client.get("/api/admin/compliance-checks.csv")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    rows = list(csv.DictReader(io.StringIO(r.text)))
    assert len(rows) == 2
    tariff = next(x for x in rows if x["check_type"] == "tariff")
    assert (tariff["hs_code"], tariff["company_id"], tariff["savings_amount"]) == (
        "100630",
        "",
        "600.00",
    )
    roo = next(x for x in rows if x["check_type"] == "roo")
    assert (roo["regional_value_content_pct"], roo["originating_status"]) == ("69.00", "pass")

    audit = (
        (
            await db_session.execute(
                select(AuditLog).where(AuditLog.action_type == "compliance_checks.export")
            )
        )
        .scalars()
        .one()
    )
    assert audit.actor_id == admin_id


async def test_csv_export_requires_session(api_client: AsyncClient) -> None:
    assert (await api_client.get("/api/admin/compliance-checks.csv")).status_code == 401


@pytest.mark.parametrize("role", ["exporter", "buyer"])
async def test_csv_export_forbidden_for_other_roles(api_client: AsyncClient, role: str) -> None:
    await login_as(api_client, role, f"{role}@x.vn")
    assert (await api_client.get("/api/admin/compliance-checks.csv")).status_code == 403
