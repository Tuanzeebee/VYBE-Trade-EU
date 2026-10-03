"""C2-C: bộ máy hạn ngạch: đơn vị, chu kỳ, số dư, giá trị kinh tế, điểm hòa vốn và API admin số dư.

Dữ liệu SYNTHETIC. Hàm thuần có golden test dạng bảng; API dùng hạn ngạch gạo đã duyệt."""

import datetime as dt
import uuid
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog
from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD, login_as
from app.modules.compliance.models import ComplianceCheck, TariffQuota, TariffQuotaBalance
from app.modules.compliance.quota import (
    balance_status,
    convert_quantity,
    period_info,
    quota_economics,
    shipment_share_pct,
)
from app.modules.compliance.tests.test_quota_api import (
    add_quota,
    add_subtype,
    rice,
    rice_line,
)
from app.modules.compliance.tests.test_tariff_api import URL

D = Decimal
TODAY = dt.datetime.now(dt.UTC).date()

# --- hàm thuần --------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("qty", "from_unit", "to_unit", "expected"),
    [
        ("100", "tonne", "tonne", D("100")),
        ("100000", "kg", "tonne", D("100")),
        ("100", "tonne", "kg", D("100000")),
        ("250", "100kg", "tonne", D("25")),
        ("1.5", "tonne", "100kg", D("15")),
        ("1", "kg", "tonne", D("0.001")),
        ("10", "piece", "piece", D("10")),
        ("10", "piece", "tonne", None),
        ("10", "liter", "kg", None),
        ("10", "tonne", "liter", None),
    ],
)
def test_convert_quantity(qty: str, from_unit: str, to_unit: str, expected: Decimal | None) -> None:
    assert convert_quantity(D(qty), from_unit, to_unit) == expected


# (tên ca, khối lượng hạn ngạch, đã dùng, ngày số liệu cách hôm nay, trạng thái, còn lại, % còn, cũ)
BALANCE_CASES = [
    ("con_nhieu", "30000", "10000", 1, "open", D("20000"), D("66.67"), False),
    ("dung_nguong_sap_het", "30000", "27000", 1, "low", D("3000"), D("10.00"), False),
    ("sap_het", "30000", "27500", 1, "low", D("2500"), D("8.33"), False),
    ("het_dung_bang_0", "30000", "30000", 1, "exhausted", D("0"), D("0.00"), False),
    ("het_dung_vuot", "30000", "31000", 1, "exhausted", D("0"), D("0.00"), False),
    ("so_lieu_cu", "30000", "10000", 30, "open", D("20000"), D("66.67"), True),
    ("dung_nguong_cu", "30000", "10000", 14, "open", D("20000"), D("66.67"), False),
    ("qua_nguong_cu", "30000", "10000", 15, "open", D("20000"), D("66.67"), True),
]


@pytest.mark.parametrize(
    ("volume", "used", "age", "status", "remaining", "pct", "stale"),
    [c[1:] for c in BALANCE_CASES],
    ids=[c[0] for c in BALANCE_CASES],
)
def test_balance_status_golden(
    volume: str, used: str, age: int, status: str, remaining: Decimal, pct: Decimal, stale: bool
) -> None:
    info = balance_status(
        D(volume),
        D(used),
        TODAY - dt.timedelta(days=age),
        today=TODAY,
        low_pct=D("10"),
        stale_days=14,
    )
    assert (info.status, info.remaining, info.remaining_pct, info.stale) == (
        status,
        remaining,
        pct,
        stale,
    )


def test_missing_balance_is_unknown_never_open() -> None:
    info = balance_status(D("30000"), None, None, today=TODAY, low_pct=D("10"), stale_days=14)
    assert info.status == "unknown" and info.remaining is None and info.remaining_pct is None


@pytest.mark.parametrize(
    ("on_date", "inside", "days_left"),
    [
        (dt.date(2026, 1, 1), True, 364),
        (dt.date(2026, 12, 31), True, 0),
        (dt.date(2025, 12, 31), False, None),
        (dt.date(2027, 1, 1), False, None),
    ],
)
def test_period_info(on_date: dt.date, inside: bool, days_left: int | None) -> None:
    info = period_info(dt.date(2026, 1, 1), dt.date(2026, 12, 31), on_date)
    assert (info.in_period, info.days_left) == (inside, days_left)


def test_period_unknown_when_not_declared() -> None:
    info = period_info(None, None, TODAY)
    assert info.in_period is None and info.days_left is None


@pytest.mark.parametrize(
    ("savings", "value", "qty", "cost", "per_unit", "pct", "net", "worthwhile"),
    [
        ("10000", "50000", "100", None, D("100.00"), D("20.00"), None, None),
        ("10000", "50000", "100", "2500", D("100.00"), D("20.00"), D("7500"), True),
        ("10000", "50000", "100", "10000", D("100.00"), D("20.00"), D("0"), False),
        ("10000", "50000", "100", "12000", D("100.00"), D("20.00"), D("-2000"), False),
        ("10000", "50000", None, "0", None, D("20.00"), D("10000"), True),
        ("333.33", "1000", "3", None, D("111.11"), D("33.33"), None, None),
    ],
)
def test_quota_economics_and_break_even(
    savings: str,
    value: str,
    qty: str | None,
    cost: str | None,
    per_unit: Decimal | None,
    pct: Decimal,
    net: Decimal | None,
    worthwhile: bool | None,
) -> None:
    out = quota_economics(
        D(savings), D(value), None if qty is None else D(qty), None if cost is None else D(cost)
    )
    assert (out.savings_per_unit, out.savings_pct_of_value) == (per_unit, pct)
    assert (out.net_benefit, out.worthwhile) == (net, worthwhile)


@pytest.mark.parametrize(
    ("qty", "volume", "expected"),
    [("100", "30000", D("0.33")), ("30000", "30000", D("100.00")), (None, "30000", None)],
)
def test_shipment_share(qty: str | None, volume: str, expected: Decimal | None) -> None:
    assert shipment_share_pct(None if qty is None else D(qty), D(volume)) == expected


# --- API tính thuế -----------------------------------------------------------------------------------

pytestmark = pytest.mark.usefixtures("hs_seeded")


async def setup_rice(session: AsyncSession, reviewer: uuid.UUID, **quota_over: Any) -> TariffQuota:
    await rice_line(session, reviewer)
    fragrant = await add_subtype(session, reviewer, "rice_fragrant_listed")
    return await add_quota(session, reviewer, [fragrant], **quota_over)


async def calc(client: AsyncClient, **over: Any) -> dict[str, Any]:
    payload = rice(subtype_code="rice_fragrant_listed", quantity="100", **over)
    res = await client.post(URL, json=payload)
    assert res.status_code == 200, res.text
    return res.json()  # type: ignore[no-any-return]


async def test_economics_and_break_even_in_the_response(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await setup_rice(db_session, reviewer_id)
    plain = (await calc(api_client))["quota"]["economics"]
    assert plain["savings"] == "10000.00" and plain["savings_per_unit"] == "100.00"
    assert plain["savings_pct_of_value"] == "20.00"
    assert plain["net_benefit"] is None and plain["worthwhile"] is None

    cheap = (await calc(api_client, quota_access_cost="2500"))["quota"]["economics"]
    assert (cheap["net_benefit"], cheap["worthwhile"]) == ("7500.00", True)
    dear = (await calc(api_client, quota_access_cost="12000"))["quota"]["economics"]
    assert (dear["net_benefit"], dear["worthwhile"]) == ("-2000.00", False)
    zero = (await calc(api_client, quota_access_cost="0"))["quota"]["economics"]
    assert zero["worthwhile"] is True


async def test_kilogram_quantity_is_converted_to_the_quota_unit(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await setup_rice(db_session, reviewer_id)
    out = await calc(api_client, quantity_unit="kg")  # 100 kg = 0,1 tấn
    # quantity ở calc() là "100" nên khai kg: 100 kg → duty ngoài hạn ngạch = 100 EUR/tấn × 0,1
    assert [(s["kind"], s["duty"]) for s in out["scenarios"]] == [
        ("in_quota", "0.00"),
        ("out_of_quota", "10.00"),
    ]
    assert out["quota"]["share_pct"] == "0.00"  # 0,1 tấn / 30.000 tấn
    big = await api_client.post(
        URL, json=rice(subtype_code="rice_fragrant_listed", quantity="100000", quantity_unit="kg")
    )
    assert big.json()["savings"] == "10000.00"  # 100.000 kg = 100 tấn
    check = await db_session.scalar(
        select(ComplianceCheck).order_by(ComplianceCheck.created_at.desc())
    )
    assert check is not None and check.scenario is not None
    assert check.scenario["quantity_unit"] == "kg"


async def test_incompatible_unit_needs_review_without_numbers(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await setup_rice(db_session, reviewer_id)
    out = await calc(api_client, quantity_unit="piece")
    assert out["status"] == "needs_review" and out["review_reason"] == "unit_mismatch"
    assert out["scenarios"] == [] and out["savings"] is None and out["quota"] is None


async def test_shipment_share_of_the_quota(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await setup_rice(db_session, reviewer_id)
    out = await api_client.post(
        URL, json=rice(subtype_code="rice_fragrant_listed", quantity="3000")
    )
    assert out.json()["quota"]["share_pct"] == "10.00"  # 3.000 / 30.000 tấn


@pytest.mark.parametrize(
    ("start_delta", "end_delta", "inside", "days_left"),
    [(-10, 20, True, 20), (-30, -1, False, None), (1, 30, False, None)],
)
async def test_period_on_the_import_date(
    api_client: AsyncClient,
    db_session: AsyncSession,
    reviewer_id: uuid.UUID,
    start_delta: int,
    end_delta: int,
    inside: bool,
    days_left: int | None,
) -> None:
    await setup_rice(
        db_session,
        reviewer_id,
        period_start=TODAY + dt.timedelta(days=start_delta),
        period_end=TODAY + dt.timedelta(days=end_delta),
        allocation_method="EXPORT_LICENCE",
        licence_required=True,
        licence_issuer_vi="Bộ Công Thương (synthetic)",
    )
    quota = (await calc(api_client))["quota"]
    assert (quota["in_period"], quota["days_left"]) == (inside, days_left)
    assert quota["allocation_method"] == "EXPORT_LICENCE" and quota["licence_required"] is True
    assert quota["licence_issuer_vi"] == "Bộ Công Thương (synthetic)"


async def test_quota_without_period_has_unknown_period(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await setup_rice(db_session, reviewer_id)
    quota = (await calc(api_client))["quota"]
    assert quota["in_period"] is None and quota["days_left"] is None


async def test_no_balance_data_is_reported_as_unknown(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await setup_rice(db_session, reviewer_id)
    balance = (await calc(api_client))["quota"]["balance"]
    assert balance["status"] == "unknown" and balance["remaining"] is None
    assert balance["as_of"] is None and balance["source"] is None


@pytest.mark.parametrize(
    ("used", "age", "status", "remaining", "stale"),
    [
        ("10000", 1, "open", "20000.000", False),
        ("27500", 1, "low", "2500.000", False),
        ("30000", 1, "exhausted", "0.000", False),
        ("10000", 40, "open", "20000.000", True),
    ],
)
async def test_latest_balance_in_the_response(
    api_client: AsyncClient,
    db_session: AsyncSession,
    reviewer_id: uuid.UUID,
    used: str,
    age: int,
    status: str,
    remaining: str,
    stale: bool,
) -> None:
    quota = await setup_rice(db_session, reviewer_id)
    db_session.add(
        TariffQuotaBalance(  # số liệu cũ hơn bị số liệu mới nhất thay thế
            quota_id=quota.id,
            as_of=TODAY - dt.timedelta(days=age + 20),
            used_volume=D("1"),
            source="nguồn cũ",
        )
    )
    db_session.add(
        TariffQuotaBalance(
            quota_id=quota.id,
            as_of=TODAY - dt.timedelta(days=age),
            used_volume=D(used),
            source="Cổng tra cứu hạn ngạch (synthetic)",
        )
    )
    await db_session.flush()
    balance = (await calc(api_client))["quota"]["balance"]
    assert (balance["status"], balance["remaining"], balance["stale"]) == (status, remaining, stale)
    assert balance["source"] == "Cổng tra cứu hạn ngạch (synthetic)"
    assert balance["as_of"] == (TODAY - dt.timedelta(days=age)).isoformat()


@pytest.mark.parametrize("bad", ["-1", "1e3", "1.234", 100])
async def test_invalid_quota_inputs_are_rejected(api_client: AsyncClient, bad: Any) -> None:
    res = await api_client.post(URL, json=rice(subtype_code="rice_x", quota_access_cost=bad))
    assert res.status_code == 422
    res = await api_client.post(URL, json=rice(subtype_code="rice_x", quantity_unit="tan"))
    assert res.status_code == 422


# --- API admin ---------------------------------------------------------------------------------------


@pytest.fixture
async def admin(api_client: AsyncClient, db_session: AsyncSession) -> AsyncClient:
    await create_admin(db_session, "admin@evfta.eu", PASSWORD)
    res = await api_client.post(
        "/api/auth/login", json={"email": "admin@evfta.eu", "password": PASSWORD}
    )
    assert res.status_code == 200, res.text
    return api_client


async def test_balance_routes_require_admin(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    quota = await setup_rice(db_session, reviewer_id)
    url = f"/api/admin/tariff-quotas/{quota.id}/balances"
    body = {"as_of": TODAY.isoformat(), "used_volume": "100", "source": "nguồn thử"}
    assert (await api_client.get(url)).status_code == 401
    assert (await api_client.post(url, json=body)).status_code == 401
    await login_as(api_client, "exporter", "exp@x.vn")
    assert (await api_client.get(url)).status_code == 403
    assert (await api_client.post(url, json=body)).status_code == 403


async def test_admin_adds_lists_and_updates_balances_with_audit(
    admin: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    quota = await setup_rice(db_session, reviewer_id)
    url = f"/api/admin/tariff-quotas/{quota.id}/balances"
    older = (TODAY - dt.timedelta(days=7)).isoformat()
    first = await admin.post(
        url, json={"as_of": older, "used_volume": "5000", "source": "Cổng hải quan (synthetic)"}
    )
    assert first.status_code == 201, first.text
    assert first.json()["used_volume"] == "5000.000"
    await admin.post(
        url, json={"as_of": TODAY.isoformat(), "used_volume": "8000.5", "source": "Cổng hải quan"}
    )
    listed = (await admin.get(url)).json()
    assert [b["as_of"] for b in listed] == [TODAY.isoformat(), older]  # mới nhất trước

    again = await admin.post(
        url, json={"as_of": TODAY.isoformat(), "used_volume": "9000", "source": "Cổng hải quan"}
    )
    assert again.status_code == 201 and again.json()["id"] == listed[0]["id"]
    assert len((await admin.get(url)).json()) == 2  # cùng ngày thì cập nhật, không thêm dòng
    audits = list(
        await db_session.scalars(
            select(AuditLog).where(AuditLog.action_type == "tariff_quota_balance.upsert")
        )
    )
    assert len(audits) == 3
    assert (
        audits[-1].before_state is not None and audits[-1].before_state["used_volume"] == "8000.500"
    )


@pytest.mark.parametrize(
    "bad",
    [
        {"as_of": (TODAY + dt.timedelta(days=1)).isoformat()},
        {"used_volume": "-5"},
        {"used_volume": "abc"},
        {"used_volume": 100},
        {"source": ""},
        {"source": "ab"},
        {"as_of": "01/10/2026"},
    ],
)
async def test_invalid_balance_is_rejected(
    admin: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID, bad: dict[str, Any]
) -> None:
    quota = await setup_rice(db_session, reviewer_id)
    body = {"as_of": TODAY.isoformat(), "used_volume": "100", "source": "nguồn thử", **bad}
    res = await admin.post(f"/api/admin/tariff-quotas/{quota.id}/balances", json=body)
    assert res.status_code == 422, bad


async def test_balance_of_an_unknown_quota_is_404(admin: AsyncClient) -> None:
    url = f"/api/admin/tariff-quotas/{uuid.uuid4()}/balances"
    assert (await admin.get(url)).status_code == 404
    body = {"as_of": TODAY.isoformat(), "used_volume": "1", "source": "nguồn thử"}
    assert (await admin.post(url, json=body)).status_code == 404


async def test_admin_quota_fields_period_and_method(admin: AsyncClient) -> None:
    quota = {
        "destination": "EU",
        "hs_prefix": "100630",
        "volume": "30000",
        "in_quota_duty_type": "ad_valorem",
        "in_quota_rate": "0",
        "out_quota_duty_type": "specific",
        "out_quota_specific": "100",
        "specific_unit": "tonne",
        "valid_from": "2026-01-01",
        "period_start": "2026-01-01",
        "period_end": "2026-12-31",
        "allocation_method": "EXPORT_LICENCE",
        "licence_required": True,
        "licence_issuer_vi": "Bộ Công Thương",
    }
    created = await admin.post("/api/admin/tariff-quotas", json=quota)
    assert created.status_code == 201, created.text
    out = created.json()
    assert (out["period_start"], out["period_end"], out["allocation_method"]) == (
        "2026-01-01",
        "2026-12-31",
        "EXPORT_LICENCE",
    )
    assert out["licence_required"] is True and out["licence_issuer_vi"] == "Bộ Công Thương"
    bad_period = await admin.post(
        "/api/admin/tariff-quotas", json={**quota, "period_end": "2026-01-01"}
    )
    assert bad_period.status_code == 422 and bad_period.json()["error"]["code"] == "invalid_period"
    bad_method = await admin.post(
        "/api/admin/tariff-quotas", json={**quota, "allocation_method": "RANDOM"}
    )
    assert bad_method.status_code == 422
    patched = await admin.patch(
        f"/api/admin/tariff-quotas/{out['id']}", json={"period_end": "2025-12-31"}
    )
    assert patched.status_code == 422 and patched.json()["error"]["code"] == "invalid_period"
    ok = await admin.patch(
        f"/api/admin/tariff-quotas/{out['id']}", json={"licence_required": False}
    )
    assert ok.status_code == 200 and ok.json()["licence_required"] is False
    null = await admin.patch(
        f"/api/admin/tariff-quotas/{out['id']}", json={"licence_required": None}
    )
    assert null.status_code == 422
