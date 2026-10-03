"""POST /api/public/tariff. Dòng thuế trong test là SYNTHETIC (không phải thuế suất thật)."""

import datetime as dt
import uuid
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.tests.helpers import company_body, login_as
from app.modules.compliance.models import ComplianceCheck, DutyType, TariffLine

pytestmark = pytest.mark.usefixtures("hs_seeded")

URL = "/api/public/tariff"
RICE, COFFEE = "100630", "090111"
TODAY = dt.datetime.now(dt.UTC).date()


def body(**over: Any) -> dict[str, Any]:
    b: dict[str, Any] = {
        "hs_code": COFFEE,
        "destination": "DE",
        "product_value": "10000.00",
        "shipments_per_year": 4,
    }
    b.update(over)
    return b


async def add_line(
    session: AsyncSession, reviewer: uuid.UUID | None, hs: str = COFFEE, **over: Any
) -> TariffLine:
    fields: dict[str, Any] = {
        "hs_code": hs,
        "destination": "EU",
        "duty_type": DutyType.ad_valorem,
        "mfn_rate": Decimal("12"),
        "evfta_rate_current": Decimal("6"),
        "valid_from": TODAY - dt.timedelta(days=30),
    }
    if reviewer is not None:
        fields["reviewed_by"] = reviewer
        fields["reviewed_at"] = dt.datetime.now(dt.UTC)
    fields.update(over)
    line = TariffLine(**fields)
    session.add(line)
    await session.flush()
    return line


async def checks(session: AsyncSession) -> int:
    return int(await session.scalar(select(func.count()).select_from(ComplianceCheck)) or 0)


NO_NUMBERS = ("mfn_rate", "evfta_rate", "mfn_duty", "evfta_duty", "savings", "annual_savings")


def assert_no_numbers(data: dict[str, Any]) -> None:
    assert {k: data[k] for k in NO_NUMBERS} == dict.fromkeys(NO_NUMBERS)


async def test_ok_for_guest_writes_one_check(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    line = await add_line(db_session, reviewer_id)
    before = await checks(db_session)
    r = await api_client.post(URL, json=body())
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "ok"
    assert (d["mfn_duty"], d["evfta_duty"], d["savings"], d["annual_savings"]) == (
        "1200.00",
        "600.00",
        "600.00",
        "2400.00",
    )
    assert d["hs_formatted"] == "0901.11" and d["destination"] == "DE"
    assert await checks(db_session) == before + 1
    row = (await db_session.execute(select(ComplianceCheck))).scalars().one()
    assert (row.company_id, row.tariff_line_id, row.status) == (None, line.id, "ok")
    assert (row.destination_country, row.savings_amount) == ("DE", Decimal("600.00"))
    assert str(row.id) == d["check_id"]


async def test_logged_in_exporter_check_records_company(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_line(db_session, reviewer_id)
    await login_as(api_client, "exporter", "exp@x.vn")
    company_id = (await api_client.post("/api/me/company", json=company_body())).json()["id"]
    before = await checks(db_session)
    assert (await api_client.post(URL, json=body())).status_code == 200
    assert await checks(db_session) == before + 1
    row = (await db_session.execute(select(ComplianceCheck))).scalars().one()
    assert str(row.company_id) == company_id


async def test_unsupported_hs_has_no_numbers_and_is_logged(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    r = await api_client.post(URL, json=body(hs_code="999999"))
    assert r.status_code == 200
    assert r.json()["status"] == "unsupported"
    assert_no_numbers(r.json())
    assert await checks(db_session) == 1


async def test_unreviewed_line_is_used_with_disclaimer(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await add_line(db_session, None)  # chưa duyệt → vẫn tính, kèm lưu ý (SPEC §2.2)
    out = (await api_client.post(URL, json=body())).json()
    assert out["status"] == "ok"
    assert out["review_state"] == "UNREVIEWED" and out["unreviewed_components"] == ["tariff_line"]
    assert out["disclaimer"] is not None


async def test_supported_hs_without_any_line_is_unsupported(api_client: AsyncClient) -> None:
    r = await api_client.post(URL, json=body())
    assert r.json()["status"] == "unsupported"
    assert_no_numbers(r.json())


async def test_st25_needs_review(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    """Gạo có hạn ngạch/thuế tuyệt đối → needs_review, tuyệt đối không phải 0%."""
    await add_line(
        db_session,
        reviewer_id,
        hs=RICE,
        duty_type=DutyType.specific,
        mfn_rate=None,
        evfta_rate_current=Decimal("0"),
        quota_required=True,
        quota_note="TRQ synthetic",
        quota_note_en="TRQ synthetic (EN)",
    )
    r = await api_client.post(URL, json=body(hs_code=RICE))
    assert r.json()["status"] == "needs_review"
    assert_no_numbers(r.json())
    assert r.json()["quota_note"] == "TRQ synthetic"
    assert r.json()["quota_note_en"] == "TRQ synthetic (EN)"
    assert r.json()["condition_note_en"] is None


async def test_two_matching_lines_need_review(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_line(db_session, reviewer_id)
    await add_line(db_session, reviewer_id, mfn_rate=Decimal("8"))
    assert (await api_client.post(URL, json=body())).json()["status"] == "needs_review"


@pytest.mark.parametrize(
    ("valid_from_days", "valid_until_days", "expected"),
    [(-30, None, "ok"), (-30, 1, "ok"), (-30, 0, "unsupported"), (1, None, "unsupported")],
)
async def test_tariff_line_validity_window(
    api_client: AsyncClient,
    db_session: AsyncSession,
    reviewer_id: uuid.UUID,
    valid_from_days: int,
    valid_until_days: int | None,
    expected: str,
) -> None:
    until = None if valid_until_days is None else TODAY + dt.timedelta(days=valid_until_days)
    await add_line(
        db_session,
        reviewer_id,
        valid_from=TODAY + dt.timedelta(days=valid_from_days),
        valid_until=until,
    )
    assert (await api_client.post(URL, json=body())).json()["status"] == expected


@pytest.mark.parametrize("hs", ["0901.11", "0901 11", " 090111 ", "09011100"])
async def test_tariff_hs_code_formats(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID, hs: str
) -> None:
    await add_line(db_session, reviewer_id)
    r = await api_client.post(URL, json=body(hs_code=hs))
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "ok"


@pytest.mark.parametrize("hs", ["", "abc", "12345", "123456789", "0901.1x", "0901-11"])
async def test_bad_hs_code_rejected_and_not_logged(
    api_client: AsyncClient, db_session: AsyncSession, hs: str
) -> None:
    assert (await api_client.post(URL, json=body(hs_code=hs))).status_code == 422
    assert await checks(db_session) == 0


@pytest.mark.parametrize(
    "value",
    [
        "0",
        "0.00",
        "-5",
        "1e3",
        "abc",
        "",
        "100.123",
        "1000000000000",
        "1000000000001",
        "1,000",
        " 100",
        100,
        100.5,
        None,
    ],
)
async def test_tariff_rejects_bad_amounts(
    api_client: AsyncClient, db_session: AsyncSession, value: Any
) -> None:
    assert (await api_client.post(URL, json=body(product_value=value))).status_code == 422
    assert await checks(db_session) == 0


@pytest.mark.parametrize("value", ["0.01", "1", "999999999999", "999999999999.99", "12.5"])
async def test_tariff_accepts_boundary_amounts(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID, value: str
) -> None:
    await add_line(db_session, reviewer_id)
    assert (await api_client.post(URL, json=body(product_value=value))).status_code == 200


@pytest.mark.parametrize("dest", ["VN", "DEU", "", "EU", "1A"])
async def test_destination_must_be_an_import_country(api_client: AsyncClient, dest: str) -> None:
    """U12: mọi nước ISO-2 trừ VN; 'EU' không phải một nước (chọn nước thành viên)."""
    assert (await api_client.post(URL, json=body(destination=dest))).status_code == 422


@pytest.mark.parametrize("dest", ["US", "GB", "JP"])
async def test_market_without_reviewed_data_is_unsupported_without_numbers(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID, dest: str
) -> None:
    await add_line(db_session, reviewer_id)  # chỉ có dòng EVFTA cho EU
    r = await api_client.post(URL, json=body(destination=dest))
    assert r.status_code == 200, r.text
    assert (r.json()["status"], r.json()["agreement"]) == ("unsupported", None)
    assert_no_numbers(r.json())


async def test_destination_case_insensitive_and_maps_to_eu_line(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_line(db_session, reviewer_id)  # dòng destination='EU'
    for dest in ("fr", "Fr", "FR", "PL"):
        r = await api_client.post(URL, json=body(destination=dest))
        assert r.json()["status"] == "ok"
        assert r.json()["destination"] == dest.upper()


@pytest.mark.parametrize("shipments", [0, -1, 10001, "x", 1.5])
async def test_bad_shipments_rejected(api_client: AsyncClient, shipments: Any) -> None:
    assert (await api_client.post(URL, json=body(shipments_per_year=shipments))).status_code == 422


async def test_shipments_optional(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_line(db_session, reviewer_id)
    r = await api_client.post(URL, json=body(shipments_per_year=None))
    assert r.json()["annual_savings"] is None


async def test_tariff_result_exposes_citation_missing(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    """N6b: dòng thuế chưa có trích dẫn điều khoản/ngày ký thì kết quả mang cờ citation_missing."""
    await add_line(db_session, reviewer_id, evfta_rate_current=Decimal("0"))
    r = await api_client.post(URL, json=body())
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "ok"
    assert d["evfta_rate"] is not None and Decimal(d["evfta_rate"]) == 0
    assert d["citation_missing"] is True
