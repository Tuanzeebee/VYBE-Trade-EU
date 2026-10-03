"""U14: dữ liệu minh hoạ (AGENTS.md §6.2 sửa đổi) và cảnh báo ngành.

- Cờ tắt → dòng is_demo không bao giờ lộ; cờ bật + ENV khác prod → lộ kèm data_status demo_unreviewed.
- ENV=prod → không bao giờ (lớp chặn thứ hai sau kiểm tra cấu hình lúc khởi động).
- Dòng nháp KHÔNG gắn is_demo không bao giờ lộ; dòng đã duyệt luôn thắng dòng minh hoạ.
"""

import datetime as dt
import uuid
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD
from app.modules.compliance.models import ComplianceCheck, SectorAlert, TariffLine
from app.modules.compliance.tests.test_tariff_api import URL, add_line, assert_no_numbers, body
from scripts.seed_demo_compliance import seed

pytestmark = pytest.mark.usefixtures("hs_seeded")

ROASTED_COFFEE = "090121"  # bản nháp: MFN 7,5%, EVFTA 0%
RICE = "100630"
PANGASIUS = "030462"


@pytest.fixture
def demo_on(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "demo_compliance_data", True)
    monkeypatch.setattr(get_settings(), "env", "dev")


@pytest.fixture
async def seeded(db_session: AsyncSession) -> dict[str, int]:
    return await seed(db_session)


async def test_seed_adds_only_demo_rows_and_is_idempotent(
    db_session: AsyncSession, seeded: dict[str, int]
) -> None:
    assert seeded["tariff_lines"] >= 15 and seeded["quotas"] == 3 and seeded["alerts"] == 1
    lines = list(await db_session.scalars(select(TariffLine)))
    assert lines and all(line.is_demo and line.reviewed_by is None for line in lines)
    again = await seed(db_session)
    assert again == {"tariff_lines": 0, "subtypes": 0, "quotas": 0, "alerts": 0}


async def test_seed_refuses_production(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(get_settings(), "env", "prod")
    with pytest.raises(SystemExit):
        await seed(db_session)


@pytest.mark.usefixtures("seeded")
async def test_flag_off_unreviewed_tariff_shown_with_disclaimer_other_demo_rows_hidden(
    api_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """SPEC_compliance_data_20_codes §2.2: dòng thuế chưa duyệt luôn dùng được, kèm lưu ý, kể cả
    khi cờ tắt. Phân nhóm, hạn ngạch, cảnh báo ngành vẫn chỉ lộ khi cờ demo bật."""
    monkeypatch.setattr(get_settings(), "demo_compliance_data", False)
    out = (await api_client.post(URL, json=body(hs_code=ROASTED_COFFEE))).json()
    assert (out["status"], out["data_status"]) == ("ok", "demo_unreviewed")
    assert out["review_state"] == "UNREVIEWED" and out["disclaimer"] is not None
    options = (
        await api_client.get(
            "/api/public/tariff/options", params={"hs_code": RICE, "destination": "DE"}
        )
    ).json()
    assert (options["agreements"], options["subtypes"]) == ([], [])
    alerts = (
        await api_client.get("/api/public/sector-alerts", params={"hs_code": PANGASIUS})
    ).json()
    assert alerts == []


@pytest.mark.usefixtures("seeded", "demo_on")
async def test_flag_on_demo_rows_are_labelled(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    out = (await api_client.post(URL, json=body(hs_code=ROASTED_COFFEE))).json()
    assert (out["status"], out["data_status"]) == ("ok", "demo_unreviewed")
    assert out["mfn_rate"] == "7.5000" and out["preferential_rate"] == "0.0000"
    check = await db_session.scalar(select(ComplianceCheck).order_by(ComplianceCheck.created_at))
    assert check is not None and check.data_status == "demo_unreviewed"


@pytest.mark.usefixtures("seeded", "demo_on")
async def test_production_shows_unreviewed_tariff_with_disclaimer(
    api_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(get_settings(), "env", "prod")
    out = (await api_client.post(URL, json=body(hs_code=ROASTED_COFFEE))).json()
    assert out["status"] == "ok" and out["review_state"] == "UNREVIEWED"
    assert out["disclaimer"] is not None


@pytest.mark.usefixtures("demo_on")
async def test_non_demo_draft_tariff_rows_are_shown_with_disclaimer(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await add_line(db_session, None, hs=ROASTED_COFFEE)  # nháp chưa duyệt, is_demo = false
    out = (await api_client.post(URL, json=body(hs_code=ROASTED_COFFEE))).json()
    assert out["status"] == "ok" and out["review_state"] == "UNREVIEWED"
    assert out["disclaimer"] is not None


@pytest.mark.usefixtures("seeded", "demo_on")
async def test_reviewed_rows_win_over_demo_rows(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_line(
        db_session,
        reviewer_id,
        hs=ROASTED_COFFEE,
        valid_from=dt.date(2026, 2, 1),
        mfn_rate=Decimal("9"),
        evfta_rate_current=Decimal("3"),
    )
    out = (await api_client.post(URL, json=body(hs_code=ROASTED_COFFEE))).json()
    assert (out["data_status"], out["mfn_rate"], out["preferential_rate"]) == (
        "reviewed",
        "9.0000",
        "3.0000",
    )


@pytest.mark.usefixtures("seeded", "demo_on")
async def test_demo_rice_quota_scenarios_and_st25(api_client: AsyncClient) -> None:
    def rice(**over: Any) -> dict[str, Any]:
        return body(hs_code=RICE, product_value="50000.00", shipments_per_year=None, **over)

    options = (
        await api_client.get(
            "/api/public/tariff/options", params={"hs_code": RICE, "destination": "DE"}
        )
    ).json()
    assert options["quota_agreements"] == ["EVFTA"]
    assert {"rice_fragrant_listed", "rice_fragrant_other", "rice_milled"} <= {
        s["code"] for s in options["subtypes"]
    }

    fragrant = (
        await api_client.post(URL, json=rice(subtype_code="rice_fragrant_listed", quantity="100"))
    ).json()
    assert (fragrant["status"], fragrant["data_status"]) == ("quota_scenarios", "demo_unreviewed")
    assert [s["duty"] for s in fragrant["scenarios"]] == ["0.00", "17500.00"]
    assert fragrant["quota"]["quota_code"] == "DEMO-RICE-FRAGRANT"
    assert "licence" in fragrant["conditions"]

    milled = (
        await api_client.post(URL, json=rice(subtype_code="rice_milled", quantity="10"))
    ).json()
    assert milled["quota"]["quota_code"] == "DEMO-RICE-MILLED"

    st25 = (
        await api_client.post(URL, json=rice(subtype_code="rice_fragrant_other", quantity="100"))
    ).json()
    assert (st25["status"], st25["review_reason"]) == ("needs_review", "subtype_not_eligible")
    assert_no_numbers(st25)


@pytest.mark.usefixtures("seeded", "demo_on")
async def test_iuu_alert_shows_for_seafood_with_demo_label(api_client: AsyncClient) -> None:
    alerts = (
        await api_client.get("/api/public/sector-alerts", params={"hs_code": PANGASIUS})
    ).json()
    assert [(a["code"], a["data_status"]) for a in alerts] == [
        ("iuu_yellow_card", "demo_unreviewed")
    ]
    tariff = (await api_client.post(URL, json=body(hs_code=PANGASIUS))).json()
    assert [a["code"] for a in tariff["alerts"]] == ["iuu_yellow_card"]
    coffee = (
        await api_client.get("/api/public/sector-alerts", params={"hs_code": "090111"})
    ).json()
    assert coffee == []


async def test_reviewed_alert_shows_without_the_flag(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    db_session.add(
        SectorAlert(
            code="synthetic_alert",
            hs_prefixes=["0304"],
            severity="info",
            title_vi="Cảnh báo synthetic",
            title_en="Synthetic alert",
            valid_from=dt.date(2020, 1, 1),
            reviewed_by=reviewer_id,
            reviewed_at=dt.datetime.now(dt.UTC),
        )
    )
    await db_session.flush()
    alerts = (
        await api_client.get("/api/public/sector-alerts", params={"hs_code": PANGASIUS})
    ).json()
    assert [(a["code"], a["data_status"]) for a in alerts] == [("synthetic_alert", "reviewed")]
    assert (
        await api_client.get("/api/public/sector-alerts", params={"hs_code": "12"})
    ).status_code == 422


@pytest.mark.usefixtures("seeded")
async def test_admin_cannot_review_demo_rows_and_manages_alerts(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await create_admin(db_session, "admin@evfta.eu", PASSWORD)
    login = {"email": "admin@evfta.eu", "password": PASSWORD}
    assert (await api_client.post("/api/auth/login", json=login)).status_code == 200
    line = await db_session.scalar(select(TariffLine).limit(1))
    assert line is not None
    r = await api_client.post(f"/api/admin/tariff-lines/{line.id}/review")
    assert r.status_code == 409 and r.json()["error"]["code"] == "demo_row_not_reviewable"
    listed = (await api_client.get("/api/admin/tariff-lines")).json()
    assert all(row["is_demo"] for row in listed)
    alerts = (await api_client.get("/api/admin/sector-alerts")).json()
    demo_alert = alerts[0]
    r = await api_client.post(f"/api/admin/sector-alerts/{demo_alert['id']}/review")
    assert r.status_code == 409

    created = await api_client.post(
        "/api/admin/sector-alerts",
        json={
            "code": "eudr_coffee",
            "hs_prefixes": ["09.01"],
            "title_vi": "Quy định chống phá rừng (EUDR)",
            "title_en": "EU Deforestation Regulation (EUDR)",
            "valid_from": "2025-12-30",
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()["hs_prefixes"] == ["0901"]
    reviewed = await api_client.post(f"/api/admin/sector-alerts/{created.json()['id']}/review")
    assert reviewed.status_code == 200 and reviewed.json()["reviewed_by"] is not None
    count = await db_session.scalar(select(func.count()).select_from(SectorAlert))
    assert count == 2
