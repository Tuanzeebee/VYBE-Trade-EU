"""Gói dữ liệu luật TM v0 (bản nháp do Claude soạn, CHƯA có người duyệt): phải nhập được nhưng KHÔNG lộ ra ngoài."""

import datetime as dt
from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.compliance.models import ProductSpecificRule, TariffLine
from app.modules.compliance.service import find_lines, find_rules
from scripts.import_compliance_data import import_psr, import_tariff, parse_psr, parse_tariff

pytestmark = pytest.mark.usefixtures("hs_seeded")
ROADMAP = Path(__file__).resolve().parents[5] / "docs" / "roadmap"
ADMIN = "luat-tm@evfta.eu"
TODAY = dt.datetime.now(dt.UTC).date()


async def test_draft_tariff_csv_imports_unreviewed_and_stays_hidden(
    db_session: AsyncSession, reviewer_id: object
) -> None:
    rows = parse_tariff(ROADMAP / "tariff_20_v0_draft.csv")
    assert len(rows) == 20
    await import_tariff(db_session, ADMIN, rows, dry_run=False)
    total = await db_session.scalar(select(func.count()).select_from(TariffLine))
    unreviewed = await db_session.scalar(
        select(func.count()).select_from(TariffLine).where(TariffLine.reviewed_by.is_(None))
    )
    assert total == unreviewed == 20
    assert await find_lines(db_session, "030617", "EU", TODAY) == []  # chưa duyệt → không lộ


async def test_draft_psr_csv_imports_unreviewed_and_stays_hidden(
    db_session: AsyncSession, reviewer_id: object
) -> None:
    rows = parse_psr(ROADMAP / "psr_20_v0_draft.csv")
    assert len(rows) == 12
    await import_psr(db_session, ADMIN, rows, dry_run=False)
    total = await db_session.scalar(select(func.count()).select_from(ProductSpecificRule))
    assert total == 12
    assert await find_rules(db_session, "030617", TODAY) == []
