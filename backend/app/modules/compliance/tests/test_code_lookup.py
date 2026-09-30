"""Tra cứu mã CN 8 số: khớp 8 số trước, lùi về 6 số; 6 số không khớp mã 8 số con."""

import datetime as dt
import uuid
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.schemas import HsCodeIn
from app.modules.catalog.service import upsert_hs_codes
from app.modules.compliance.models import DutyType, ProductSpecificRule, RuleType, TariffLine

pytestmark = pytest.mark.usefixtures("hs_seeded")

TODAY = dt.datetime.now(dt.UTC).date()
FROM = TODAY - dt.timedelta(days=30)
SHRIMP6, SHRIMP_A, SHRIMP_B = "030617", "03061792", "03061799"
FRUIT6, FRUIT_CHILD = "081090", "08109075"


async def add_hs(session: AsyncSession, code: str) -> None:
    await upsert_hs_codes(
        session,
        [
            HsCodeIn(
                code=code,
                name_vi="Tôm",
                name_en="Shrimp",
                category="seafood",
                is_calculator_supported=True,
            )
        ],
    )


async def add_line(
    session: AsyncSession, reviewer: uuid.UUID, hs: str, mfn: str, evfta: str
) -> None:
    session.add(
        TariffLine(
            hs_code=hs,
            destination="EU",
            duty_type=DutyType.ad_valorem,
            mfn_rate=Decimal(mfn),
            evfta_rate_current=Decimal(evfta),
            valid_from=FROM,
            reviewed_by=reviewer,
            reviewed_at=dt.datetime.now(dt.UTC),
        )
    )
    await session.flush()


async def add_rule(session: AsyncSession, reviewer: uuid.UUID, hs: str, *, expert: bool) -> None:
    session.add(
        ProductSpecificRule(
            hs_code=hs,
            rule_type=RuleType.WO,
            requires_expert=expert,
            valid_from=FROM,
            reviewed_by=reviewer,
            reviewed_at=dt.datetime.now(dt.UTC),
        )
    )
    await session.flush()


def tariff_body(code: str) -> dict[str, Any]:
    return {"hs_code": code, "destination": "DE", "product_value": "100000.00"}


async def test_exact_eight_digit_line_beats_heading_line(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_hs(db_session, SHRIMP_A)
    await add_line(db_session, reviewer_id, SHRIMP6, "20", "10")
    await add_line(db_session, reviewer_id, SHRIMP_A, "12", "0")
    d = (await api_client.post("/api/public/tariff", json=tariff_body(SHRIMP_A))).json()
    assert (d["status"], d["mfn_duty"], d["evfta_duty"]) == ("ok", "12000.00", "0.00")


async def test_eight_digit_code_not_in_catalog_falls_back_to_heading(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_line(db_session, reviewer_id, SHRIMP6, "20", "10")
    d = (await api_client.post("/api/public/tariff", json=tariff_body(SHRIMP_B))).json()
    assert (d["status"], d["mfn_duty"]) == ("ok", "20000.00")


async def test_six_digit_code_does_not_pick_an_eight_digit_child(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_hs(db_session, FRUIT_CHILD)
    await add_line(db_session, reviewer_id, FRUIT_CHILD, "8.8", "0")
    d = (await api_client.post("/api/public/tariff", json=tariff_body(FRUIT6))).json()
    assert d["status"] == "unsupported"
    assert all(
        d[k] is None for k in ("mfn_rate", "evfta_rate", "mfn_duty", "evfta_duty", "savings")
    )


async def test_roo_uses_eight_digit_rule_over_heading_rule(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_hs(db_session, SHRIMP_A)
    await add_rule(db_session, reviewer_id, SHRIMP6, expert=True)
    await add_rule(db_session, reviewer_id, SHRIMP_A, expert=False)
    body = {"hs_code": SHRIMP_A, "materials_declared": True, "materials": []}
    d = (await api_client.post("/api/public/roo", json=body)).json()
    assert d["status"] == "pass"
