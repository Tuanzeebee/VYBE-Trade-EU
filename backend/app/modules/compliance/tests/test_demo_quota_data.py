"""Dữ liệu hạn ngạch MINH HOẠ cho buổi demo: chu kỳ, cách phân bổ và số dư (C2-C).

Chỉ hiện khi DEMO_COMPLIANCE_DATA bật và ENV khác prod; số dư gắn nguồn DEMO và luôn mới."""

import datetime as dt
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.compliance.models import TariffQuota, TariffQuotaBalance
from app.modules.compliance.tests.test_demo_data import demo_on  # noqa: F401  (fixture)
from app.modules.compliance.tests.test_tariff_api import URL, body
from scripts.seed_demo_compliance import DEMO_BALANCE_SOURCE, seed

pytestmark = pytest.mark.usefixtures("hs_seeded", "demo_on")


async def rice(client: AsyncClient, subtype: str, **over: Any) -> dict[str, Any]:
    payload = body(
        hs_code="100630",
        product_value="50000.00",
        shipments_per_year=None,
        subtype_code=subtype,
        quantity="100",
        **over,
    )
    res = await client.post(URL, json=payload)
    assert res.status_code == 200, res.text
    return res.json()["quota"]  # type: ignore[no-any-return]


async def test_fragrant_rice_has_period_licence_and_open_balance(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await seed(db_session)
    quota = await rice(api_client, "rice_fragrant_listed", import_date="2026-06-15")
    assert (quota["period_start"], quota["period_end"]) == ("2026-01-01", "2026-12-31")
    assert quota["in_period"] is True and quota["days_left"] == 199
    assert quota["allocation_method"] == "IMPORT_LICENCE" and quota["licence_required"] is True
    assert "Bộ Công Thương" in quota["licence_issuer_vi"]
    balance = quota["balance"]
    assert (balance["status"], balance["remaining"], balance["stale"]) == (
        "open",
        "18000.000",
        False,
    )
    assert balance["source"] == DEMO_BALANCE_SOURCE


async def test_milled_rice_is_running_low_and_tuna_balance_is_unknown(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await seed(db_session)
    milled = await rice(api_client, "rice_milled")
    assert milled["balance"]["status"] == "low" and milled["balance"]["remaining"] == "2400.000"
    assert milled["allocation_method"] == "OTHER" and milled["licence_required"] is False
    tuna = await api_client.post(
        URL,
        json=body(
            hs_code="160414",
            product_value="50000.00",
            shipments_per_year=None,
            subtype_code="tuna_prepared",
        ),
    )
    balance = tuna.json()["quota"]["balance"] if tuna.json().get("quota") else None
    assert balance is None or balance["status"] == "unknown"


async def test_seed_is_idempotent_and_keeps_demo_balances_fresh(db_session: AsyncSession) -> None:
    await seed(db_session)
    count = await db_session.scalar(select(func.count()).select_from(TariffQuotaBalance))
    stale_day = dt.datetime.now(dt.UTC).date() - dt.timedelta(days=60)
    for row in await db_session.scalars(select(TariffQuotaBalance)):
        row.as_of = stale_day  # giả lập đã nạp từ lâu
    await db_session.flush()
    again = await seed(db_session)
    assert again == {"tariff_lines": 0, "subtypes": 0, "quotas": 0, "alerts": 0}
    assert (
        await db_session.scalar(select(func.count()).select_from(TariffQuotaBalance)) == count == 2
    )
    expected = dt.datetime.now(dt.UTC).date() - dt.timedelta(days=2)
    assert {r.as_of for r in await db_session.scalars(select(TariffQuotaBalance))} == {expected}


async def test_seed_backfills_old_demo_rows_but_never_real_ones(db_session: AsyncSession) -> None:
    await seed(db_session)
    demo = await db_session.scalar(
        select(TariffQuota).where(TariffQuota.quota_code == "DEMO-RICE-FRAGRANT")
    )
    assert demo is not None
    demo.period_start = demo.period_end = demo.allocation_method = demo.licence_issuer_vi = None
    demo.licence_required = False
    await db_session.flush()
    await seed(db_session)
    await db_session.refresh(demo)
    assert demo.allocation_method == "IMPORT_LICENCE" and demo.period_start is not None
    # dòng không phải minh hoạ (đã nhập thật) không bị đụng
    demo.is_demo = False
    demo.allocation_method = None
    await db_session.flush()
    await seed(db_session)
    await db_session.refresh(demo)
    assert demo.allocation_method is None
