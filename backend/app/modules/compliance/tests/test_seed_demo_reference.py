"""Dữ liệu tham chiếu DEMO (cước, bảo hiểm, phân khúc thị trường) cho buổi demo.

Chỉ dùng số/ý kiến người dùng nêu trong buổi họp 02/10/2026, gắn nhãn DEMO, chưa kiểm chứng. Không
nạp được nếu thiếu người duyệt (bảng chỉ lộ dòng có reviewed_by)."""

import datetime as dt
from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD
from app.modules.compliance.models import FreightBenchmark, InsuranceBenchmark
from app.modules.markets.models import MarketInsight
from scripts.seed_demo_reference import purge, seed

TODAY = dt.datetime.now(dt.UTC).date()


async def counts(session: AsyncSession) -> tuple[int, int, int]:
    return (
        int(await session.scalar(select(func.count()).select_from(FreightBenchmark)) or 0),
        int(await session.scalar(select(func.count()).select_from(InsuranceBenchmark)) or 0),
        int(await session.scalar(select(func.count()).select_from(MarketInsight)) or 0),
    )


async def test_seed_creates_reviewed_demo_rows_once(db_session: AsyncSession) -> None:
    reviewer = await create_admin(db_session, "admin@vybe-demo.example", PASSWORD)
    created = await seed(db_session, reviewer, today=TODAY)
    assert created > 0
    freight, insurance, insights = await counts(db_session)
    assert freight >= 1 and insurance >= 1 and insights >= 2
    rows = (await db_session.scalars(select(FreightBenchmark))).all()
    assert all(r.reviewed_by == reviewer and r.source.startswith("DEMO") for r in rows)
    insurance_rows = (await db_session.scalars(select(InsuranceBenchmark))).all()
    assert all(r.reviewed_by == reviewer and r.source.startswith("DEMO") for r in insurance_rows)
    insight_rows = (await db_session.scalars(select(MarketInsight))).all()
    assert all(r.reviewed_by == reviewer and r.source.startswith("DEMO") for r in insight_rows)
    assert await seed(db_session, reviewer, today=TODAY) == 0  # chạy lại không tạo trùng
    assert await counts(db_session) == (freight, insurance, insights)


async def test_seeded_hints_match_the_meeting_figures_and_are_served(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    reviewer = await create_admin(db_session, "admin@vybe-demo.example", PASSWORD)
    await seed(db_session, reviewer, today=TODAY)
    await db_session.flush()
    r = await api_client.get("/api/public/shipping-hints", params={"dest_country": "DE"})
    assert r.status_code == 200, r.text
    body = r.json()
    forty = next(f for f in body["freight"] if f["container_type"] == "40HC")
    assert Decimal(forty["price_typical"]) == Decimal("3000")
    assert forty["currency"] == "USD"
    assert forty["source"].startswith("DEMO")
    assert Decimal(body["insurance"]["rate_percent"]) == Decimal("2")
    # Chỉ có số liệu cho tuyến chị My nêu (Việt Nam → Đức): nước khác không bị bịa số.
    other = await api_client.get("/api/public/shipping-hints", params={"dest_country": "NL"})
    assert other.json()["freight"] == []


async def test_purge_removes_only_demo_rows(db_session: AsyncSession) -> None:
    reviewer = await create_admin(db_session, "admin@vybe-demo.example", PASSWORD)
    db_session.add(
        FreightBenchmark(
            origin_port="Hai Phong",
            dest_country="FR",
            container_type="20GP",
            cargo_class="dry",
            price_low=Decimal("1"),
            price_typical=Decimal("2"),
            price_high=Decimal("3"),
            currency="EUR",
            valid_from=TODAY,
            valid_until=TODAY + dt.timedelta(days=10),
            source="Báo giá forwarder thật",
            reviewed_by=reviewer,
            reviewed_at=dt.datetime.now(dt.UTC),
        )
    )
    await seed(db_session, reviewer, today=TODAY)
    removed = await purge(db_session)
    assert removed > 0
    freight, insurance, insights = await counts(db_session)
    assert (freight, insurance, insights) == (1, 0, 0)
