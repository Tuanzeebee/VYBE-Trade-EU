"""C2-C: số dư gộp theo số hiệu hạn ngạch và chu kỳ; cách phân bổ IMPORT_LICENCE. Dữ liệu SYNTHETIC."""

import datetime as dt
import uuid
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD
from app.modules.compliance.models import TariffQuota, TariffQuotaBalance
from app.modules.compliance.quota_store import latest_balance, quota_group_ids
from app.modules.compliance.tests.test_quota_api import add_quota, add_subtype, rice, rice_line
from app.modules.compliance.tests.test_tariff_api import URL

pytestmark = pytest.mark.usefixtures("hs_seeded")

TODAY = dt.datetime.now(dt.UTC).date()
START = TODAY - dt.timedelta(days=60)
END = TODAY + dt.timedelta(days=200)


async def two_rows(
    session: AsyncSession, reviewer: uuid.UUID, **second: Any
) -> tuple[TariffQuota, TariffQuota]:
    """Hai dòng hạn ngạch cùng số hiệu (dùng chung khối lượng) cho hai mã HS khác nhau."""
    await rice_line(session, reviewer)
    fragrant = await add_subtype(session, reviewer, "rice_fragrant_listed")
    common: dict[str, Any] = {"quota_code": "09.SHARED", "period_start": START, "period_end": END}
    first = await add_quota(session, reviewer, [fragrant], **common)
    other: dict[str, Any] = {**common, "hs_prefix": "100640", **second}
    sibling = await add_quota(session, reviewer, [fragrant], **other)
    return first, sibling


async def add_balance(
    session: AsyncSession, quota: TariffQuota, used: str, age: int, source: str = "nguồn thử"
) -> None:
    session.add(
        TariffQuotaBalance(
            quota_id=quota.id,
            as_of=TODAY - dt.timedelta(days=age),
            used_volume=Decimal(used),
            source=source,
        )
    )
    await session.flush()


async def calc_balance(client: AsyncClient) -> dict[str, Any]:
    res = await client.post(URL, json=rice(subtype_code="rice_fragrant_listed", quantity="100"))
    assert res.status_code == 200, res.text
    return res.json()["quota"]["balance"]  # type: ignore[no-any-return]


async def test_balance_entered_on_a_sibling_row_is_seen(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    first, sibling = await two_rows(db_session, reviewer_id)
    await add_balance(db_session, sibling, "27500", 1, "Cổng hải quan (synthetic)")
    balance = await calc_balance(api_client)  # tính cho dòng 100630, số dư nhập ở dòng 100640
    assert balance["status"] == "low" and balance["remaining"] == "2500.000"
    assert balance["source"] == "Cổng hải quan (synthetic)"
    assert set(await quota_group_ids(db_session, first)) == {first.id, sibling.id}


async def test_latest_balance_wins_across_the_group(
    db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    first, sibling = await two_rows(db_session, reviewer_id)
    await add_balance(db_session, first, "1000", 10, "cũ ở dòng 1")
    await add_balance(db_session, sibling, "2000", 3, "mới ở dòng 2")
    await add_balance(db_session, first, "500", 20, "rất cũ ở dòng 1")
    latest = await latest_balance(db_session, first)
    assert latest is not None and latest.source == "mới ở dòng 2"
    assert (await latest_balance(db_session, sibling)).source == "mới ở dòng 2"  # type: ignore[union-attr]


async def test_different_period_is_a_different_pool(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    first, sibling = await two_rows(
        db_session, reviewer_id, period_start=START - dt.timedelta(days=365), period_end=START
    )
    await add_balance(db_session, sibling, "27500", 1)
    assert await quota_group_ids(db_session, first) == [first.id]
    assert (await calc_balance(api_client))["status"] == "unknown"


async def test_different_quota_code_is_a_different_pool(
    db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    first, sibling = await two_rows(db_session, reviewer_id, quota_code="09.OTHER")
    await add_balance(db_session, sibling, "100", 1)
    assert await latest_balance(db_session, first) is None


async def test_quota_without_a_code_never_shares(
    db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await rice_line(db_session, reviewer_id)
    fragrant = await add_subtype(db_session, reviewer_id, "rice_fragrant_listed")
    a = await add_quota(db_session, reviewer_id, [fragrant], quota_code=None)
    b = await add_quota(db_session, reviewer_id, [fragrant], quota_code=None, hs_prefix="100640")
    await add_balance(db_session, b, "100", 1)
    assert await quota_group_ids(db_session, a) == [a.id]
    assert await latest_balance(db_session, a) is None


async def test_unknown_when_nothing_in_the_group_has_a_balance(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await two_rows(db_session, reviewer_id)
    assert (await calc_balance(api_client))["status"] == "unknown"


# --- API admin ---------------------------------------------------------------------------------------


@pytest.fixture
async def admin(api_client: AsyncClient, db_session: AsyncSession) -> AsyncClient:
    await create_admin(db_session, "admin@evfta.eu", PASSWORD)
    res = await api_client.post(
        "/api/auth/login", json={"email": "admin@evfta.eu", "password": PASSWORD}
    )
    assert res.status_code == 200, res.text
    return api_client


async def test_admin_balance_is_visible_from_every_row_of_the_group(
    admin: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    first, sibling = await two_rows(db_session, reviewer_id)
    body = {"as_of": TODAY.isoformat(), "used_volume": "100", "source": "Cổng hải quan (synthetic)"}
    created = await admin.post(f"/api/admin/tariff-quotas/{sibling.id}/balances", json=body)
    assert created.status_code == 201, created.text
    from_first = (await admin.get(f"/api/admin/tariff-quotas/{first.id}/balances")).json()
    from_sibling = (await admin.get(f"/api/admin/tariff-quotas/{sibling.id}/balances")).json()
    assert (
        [b["id"] for b in from_first] == [b["id"] for b in from_sibling] == [created.json()["id"]]
    )


async def test_same_date_in_the_group_updates_instead_of_duplicating(
    admin: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    first, sibling = await two_rows(db_session, reviewer_id)
    day = TODAY.isoformat()
    a = await admin.post(
        f"/api/admin/tariff-quotas/{first.id}/balances",
        json={"as_of": day, "used_volume": "100", "source": "nguồn một"},
    )
    b = await admin.post(
        f"/api/admin/tariff-quotas/{sibling.id}/balances",
        json={"as_of": day, "used_volume": "200", "source": "nguồn hai"},
    )
    assert a.status_code == b.status_code == 201
    assert a.json()["id"] == b.json()["id"]
    rows = (await admin.get(f"/api/admin/tariff-quotas/{first.id}/balances")).json()
    assert (
        len(rows) == 1 and rows[0]["used_volume"] == "200.000" and rows[0]["source"] == "nguồn hai"
    )


async def test_import_licence_allocation_method_is_accepted(admin: AsyncClient) -> None:
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
        "allocation_method": "IMPORT_LICENCE",
        "licence_required": True,
    }
    created = await admin.post("/api/admin/tariff-quotas", json=quota)
    assert created.status_code == 201, created.text
    assert created.json()["allocation_method"] == "IMPORT_LICENCE"
    assert (
        await admin.post("/api/admin/tariff-quotas", json={**quota, "allocation_method": "RANDOM"})
    ).status_code == 422


async def test_calculator_reports_import_licence(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await rice_line(db_session, reviewer_id)
    fragrant = await add_subtype(db_session, reviewer_id, "rice_fragrant_listed")
    await add_quota(db_session, reviewer_id, [fragrant], allocation_method="IMPORT_LICENCE")
    res = await api_client.post(URL, json=rice(subtype_code="rice_fragrant_listed", quantity="100"))
    assert res.json()["quota"]["allocation_method"] == "IMPORT_LICENCE"
