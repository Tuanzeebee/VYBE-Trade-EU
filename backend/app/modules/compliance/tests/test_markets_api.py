"""POST /api/public/markets. Thuế/VAT trong test là SYNTHETIC theo ca golden của file Excel."""

import datetime as dt
import uuid
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.schemas import HsCodeIn
from app.modules.catalog.service import upsert_hs_codes
from app.modules.compliance.models import (
    ComplianceCheck,
    DutyType,
    ImportCountryTerm,
    TariffLine,
)

pytestmark = pytest.mark.usefixtures("hs_seeded")

URL = "/api/public/markets"
CODE = "03061792"
TODAY = dt.datetime.now(dt.UTC).date()
FROM = TODAY - dt.timedelta(days=30)
NUMBERS = ("rank", "duty", "vat_rate", "vat", "total")


def body(**over: Any) -> dict[str, Any]:
    b: dict[str, Any] = {"hs_code": CODE, "product_value": "100000.00", "roo_status": "pass"}
    b.update(over)
    return b


async def seed(
    session: AsyncSession,
    reviewer: uuid.UUID | None,
    *,
    vat: dict[str, str] | None = None,
    **line_over: Any,
) -> None:
    await upsert_hs_codes(
        session,
        [
            HsCodeIn(
                code=CODE,
                name_vi="Tôm",
                name_en="Shrimp",
                category="seafood",
                is_calculator_supported=True,
            )
        ],
    )
    stamp = {"reviewed_by": reviewer, "reviewed_at": dt.datetime.now(dt.UTC)} if reviewer else {}
    fields: dict[str, Any] = {
        "hs_code": CODE,
        "destination": "EU",
        "duty_type": DutyType.ad_valorem,
        "mfn_rate": Decimal("12"),
        "evfta_rate_current": Decimal("0"),
        "valid_from": FROM,
    }
    session.add(TariffLine(**{**fields, **stamp, **line_over}))
    for country, rate in (vat if vat is not None else {"DE": "7", "FR": "5.5", "NL": "9"}).items():
        session.add(
            ImportCountryTerm(
                hs_code=CODE,
                country=country,
                vat_rate=Decimal(rate),
                label_languages=country.lower(),
                valid_from=FROM,
                **stamp,
            )
        )
    await session.flush()


async def checks(session: AsyncSession) -> int:
    return int(await session.scalar(select(func.count()).select_from(ComplianceCheck)) or 0)


async def test_golden_with_and_without_certificate(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await seed(db_session, reviewer_id)
    d = (await api_client.post(URL, json=body())).json()
    assert (d["status"], d["basis"], d["hs_formatted"]) == ("ok", "evfta", "0306.17.92")
    assert [(r["country"], r["total"]) for r in d["rows"][:3]] == [
        ("FR", "5500.00"),
        ("DE", "7000.00"),
        ("NL", "9000.00"),
    ]
    d = (await api_client.post(URL, json=body(roo_status="fail"))).json()
    assert d["basis"] == "mfn"
    assert {r["country"]: r["total"] for r in d["rows"][:3]} == {
        "DE": "19840.00",
        "FR": "18160.00",
        "NL": "22080.00",
    }


async def test_missing_roo_status_uses_mfn(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await seed(db_session, reviewer_id)
    payload = body()
    del payload["roo_status"]
    d = (await api_client.post(URL, json=payload)).json()
    assert d["basis"] == "mfn"


@pytest.mark.parametrize("roo", ["PASS", "maybe", "", 1])
async def test_invalid_roo_status_is_422(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID, roo: Any
) -> None:
    await seed(db_session, reviewer_id)
    assert (await api_client.post(URL, json=body(roo_status=roo))).status_code == 422


async def test_json_number_amount_is_422(api_client: AsyncClient) -> None:
    assert (await api_client.post(URL, json=body(product_value=100000))).status_code == 422


async def test_unreviewed_vat_rows_are_no_data_without_numbers(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await seed(db_session, reviewer_id)
    await db_session.execute(
        update(ImportCountryTerm)
        .where(ImportCountryTerm.country == "NL")
        .values(reviewed_by=None, reviewed_at=None)
    )
    d = (await api_client.post(URL, json=body())).json()
    nl = next(r for r in d["rows"] if r["country"] == "NL")
    assert nl["status"] == "no_data" and all(nl[k] is None for k in NUMBERS)
    assert len(d["rows"]) == 27


async def test_no_reviewed_terms_gives_only_no_data(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await seed(db_session, reviewer_id, vat={})
    d = (await api_client.post(URL, json=body())).json()
    assert d["status"] == "ok" and {r["status"] for r in d["rows"]} == {"no_data"}


async def test_overlapping_reviewed_vat_rows_make_country_no_data(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await seed(db_session, reviewer_id)
    db_session.add(
        ImportCountryTerm(
            hs_code=CODE,
            country="DE",
            vat_rate=Decimal("19"),
            valid_from=FROM - dt.timedelta(days=10),
            reviewed_by=reviewer_id,
            reviewed_at=dt.datetime.now(dt.UTC),
        )
    )
    await db_session.flush()
    d = (await api_client.post(URL, json=body())).json()
    de = next(r for r in d["rows"] if r["country"] == "DE")
    assert de["status"] == "no_data" and de["total"] is None


async def test_unreviewed_tariff_line_is_unsupported(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await seed(db_session, None)
    d = (await api_client.post(URL, json=body())).json()
    assert (d["status"], d["basis"], d["rows"]) == ("unsupported", None, [])


async def test_hs_outside_catalog_is_unsupported(api_client: AsyncClient) -> None:
    d = (await api_client.post(URL, json=body(hs_code="87032310"))).json()
    assert (d["status"], d["rows"]) == ("unsupported", [])


async def test_quota_line_is_needs_review_without_numbers(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await seed(db_session, reviewer_id, quota_required=True)
    d = (await api_client.post(URL, json=body())).json()
    assert (d["status"], d["rows"], d["duty_rate"]) == ("needs_review", [], None)


async def test_each_call_writes_exactly_one_check(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await seed(db_session, reviewer_id)
    before = await checks(db_session)
    d = (await api_client.post(URL, json=body())).json()
    assert await checks(db_session) == before + 1
    row = (await db_session.execute(select(ComplianceCheck))).scalars().one()
    assert (row.check_type.value, row.destination_country, row.status) == ("tariff", "EU", "ok")
    assert row.savings_amount is None and str(row.id) == d["check_id"]
