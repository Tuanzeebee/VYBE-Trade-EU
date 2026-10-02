"""SPEC_compliance_data_20_codes §5.3, §8: danh sách bằng chứng bắt buộc cho một lô."""

import datetime as dt
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.service import create_admin
from app.modules.compliance.evidence import (
    RequirementData,
    ShipmentData,
    list_review_state,
    required_evidence,
)
from app.modules.compliance.models import ComplianceEvidenceRequirement
from app.modules.compliance.seed import load_seed
from app.modules.compliance.service import required_evidence_for
from app.modules.compliance.tests.test_seed_loader import SEED_DIR, VERSION

THRESHOLD = Decimal("6000")
TODAY = dt.date(2026, 6, 1)


async def evidence(session: AsyncSession, code: str, **shipment: Any) -> dict[str, Any]:
    await load_seed(session, SEED_DIR, VERSION)
    out = await required_evidence_for(session, code, ShipmentData(**shipment), TODAY, "vi")
    return {i.code: i for i in out.items} | {"_out": out}


def req(
    code: str, condition: str, *, blocks: str = "NONE", reviewed: bool = False
) -> RequirementData:
    return RequirementData(
        code, condition, code, None, "TARIFF", "SHIPMENT", blocks, "VERIFIED", reviewed
    )


# --- §8: bốn ca bằng chứng ------------------------------------------------------------------------


async def test_wild_caught_vessel_over_threshold(db_session: AsyncSession) -> None:
    got = await evidence(
        db_session,
        "03034290",
        consignment_value_eur=Decimal(50000),
        raw_material_source="WILD_CAUGHT",
        transit_third_country=False,
    )
    assert {"EUR1", "VESSEL_DOCS", "IUU_CATCH_CERT"} <= set(got)
    assert "ORIGIN_DECLARATION" not in got and "TRANSPORT_DOC" not in got


async def test_farmed_shrimp_under_threshold(db_session: AsyncSession) -> None:
    got = await evidence(
        db_session,
        "03061792",
        consignment_value_eur=Decimal(5000),
        raw_material_source="AQUACULTURE",
        transit_third_country=False,
    )
    assert {"ORIGIN_DECLARATION", "FARM_RECORD"} <= set(got)
    assert "EUR1" not in got and "IUU_CATCH_CERT" not in got


async def test_unknown_source_returns_both_branches_as_needs_input(
    db_session: AsyncSession,
) -> None:
    got = await evidence(
        db_session, "03077100", consignment_value_eur=Decimal(20000), transit_third_country=False
    )
    for code in ("FARM_RECORD", "IUU_CATCH_CERT", "VESSEL_DOCS"):
        assert got[code].status == "NEEDS_INPUT", code
    assert got["EUR1"].status == "REQUIRED"


async def test_pending_dataset_conditions_are_check_required(db_session: AsyncSession) -> None:
    got = await evidence(
        db_session, "07096099", consignment_value_eur=Decimal(20000), transit_third_country=False
    )
    assert got["OFFICIAL_CERT_2019_1793"].status == "CHECK_REQUIRED"
    assert got["PHYTO_CERT"].status == "REQUIRED"


# --- hành vi chung ------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("value", "expected"),
    [("6000", "CONSIGNMENT_LE_6000"), ("6000.01", "CONSIGNMENT_GT_6000")],
)
def test_threshold_boundary_is_inclusive_for_le(value: str, expected: str) -> None:
    reqs = [req("A", "CONSIGNMENT_GT_6000"), req("B", "CONSIGNMENT_LE_6000")]
    items = required_evidence(reqs, ShipmentData(consignment_value_eur=Decimal(value)), THRESHOLD)
    assert [i.conditions[0] for i in items] == [expected]


def test_threshold_is_a_parameter_not_hardcoded() -> None:
    reqs = [req("A", "CONSIGNMENT_GT_6000")]
    shipment = ShipmentData(consignment_value_eur=Decimal(7000))
    assert required_evidence(reqs, shipment, Decimal(8000)) == []
    assert len(required_evidence(reqs, shipment, Decimal(6000))) == 1


def test_missing_value_returns_both_as_needs_input() -> None:
    items = required_evidence(
        [req("A", "CONSIGNMENT_GT_6000"), req("B", "CONSIGNMENT_LE_6000")],
        ShipmentData(),
        THRESHOLD,
    )
    assert {i.code: i.status for i in items} == {"A": "NEEDS_INPUT", "B": "NEEDS_INPUT"}


def test_fresh_and_transit_conditions() -> None:
    reqs = [req("F", "IF_FRESH_AND_NOT_PHYTO_EXEMPT"), req("T", "IF_TRANSIT_THIRD_COUNTRY")]
    none = required_evidence(
        reqs, ShipmentData(is_fresh=False, transit_third_country=False), THRESHOLD
    )
    assert none == []
    both = required_evidence(
        reqs, ShipmentData(is_fresh=True, transit_third_country=True), THRESHOLD
    )
    assert {i.code: i.status for i in both} == {"F": "REQUIRED", "T": "REQUIRED"}
    unknown = required_evidence(reqs, ShipmentData(), THRESHOLD)
    assert {i.status for i in unknown} == {"NEEDS_INPUT"}


def test_grown_source_matches_neither_fish_branch() -> None:
    reqs = [req("FARM", "IF_AQUACULTURE"), req("IUU", "IF_WILD_CAUGHT")]
    assert required_evidence(reqs, ShipmentData(raw_material_source="GROWN"), THRESHOLD) == []


def test_unknown_condition_is_never_treated_as_not_needed() -> None:
    items = required_evidence([req("X", "IF_SOMETHING_NEW")], ShipmentData(), THRESHOLD)
    assert [i.status for i in items] == ["CHECK_REQUIRED"]


def test_same_type_merged_strongest_status_wins_and_unreviewed_taints() -> None:
    reqs = [
        req("X", "IF_NOT_PHYTO_EXEMPT", reviewed=True),
        req("X", "ALWAYS", reviewed=False),
    ]
    (item,) = required_evidence(reqs, ShipmentData(), THRESHOLD)
    assert item.status == "REQUIRED" and item.review_state == "UNREVIEWED"
    assert item.conditions == ("IF_NOT_PHYTO_EXEMPT", "ALWAYS")


def test_sorted_import_then_tariff_preference_then_none() -> None:
    reqs = [
        req("N", "ALWAYS", blocks="NONE"),
        req("T", "ALWAYS", blocks="TARIFF_PREFERENCE"),
        req("I", "ALWAYS", blocks="IMPORT"),
    ]
    items = required_evidence(reqs, ShipmentData(), THRESHOLD)
    assert [i.code for i in items] == ["I", "T", "N"]


def test_list_review_state_unreviewed_if_any_row_unreviewed() -> None:
    reviewed = required_evidence([req("A", "ALWAYS", reviewed=True)], ShipmentData(), THRESHOLD)
    assert list_review_state(reviewed) == "REVIEWED"
    mixed = required_evidence(
        [req("A", "ALWAYS", reviewed=True), req("B", "ALWAYS")], ShipmentData(), THRESHOLD
    )
    assert list_review_state(mixed) == "UNREVIEWED"


# --- trong response /api/public/origin ---------------------------------------------------------------


async def _origin(client: AsyncClient, language: str = "vi", **body: Any) -> dict[str, Any]:
    res = await client.post("/api/public/origin", json=body, headers={"Accept-Language": language})
    assert res.status_code == 200, res.text
    return res.json()  # type: ignore[no-any-return]


async def test_origin_response_carries_evidence_list_with_disclaimer(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    out = await _origin(
        api_client,
        "en",
        hs_code="03061792",
        consignment_value_eur="5000",
        transit_third_country=True,
        transit_handling="STORAGE_UNDER_CUSTOMS",
        sourcing="FARMED_IN_VN",
        raw_material_source="AQUACULTURE",
    )
    block = out["required_evidence"]
    codes = [i["code"] for i in block["items"]]
    assert "TRANSPORT_DOC" in codes and "ORIGIN_DECLARATION" in codes and "EUR1" not in codes
    assert block["review_state"] == "UNREVIEWED" and block["disclaimer"].startswith("Note")
    assert "evidence_requirements" in out["unreviewed_components"]
    blocks = [i["blocks"] for i in block["items"]]
    order = {"IMPORT": 0, "TARIFF_PREFERENCE": 1, "NONE": 2}
    assert blocks == sorted(blocks, key=order.__getitem__)


async def test_origin_evidence_reviewed_rows_drop_the_evidence_warning(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    admin = await create_admin(db_session, "luat-tm@evfta.eu", "correct-horse-battery")
    now = dt.datetime.now(dt.UTC)
    for row in await db_session.scalars(
        select(ComplianceEvidenceRequirement).where(
            ComplianceEvidenceRequirement.hs_code == "03061792"
        )
    ):
        row.reviewed_by, row.reviewed_at = admin, now
    await db_session.flush()
    out = await _origin(
        api_client,
        hs_code="03061792",
        consignment_value_eur="5000",
        transit_third_country=False,
        sourcing="FARMED_IN_VN",
        raw_material_source="AQUACULTURE",
    )
    assert out["required_evidence"]["review_state"] == "REVIEWED"
    assert out["required_evidence"]["disclaimer"] is None
    assert "evidence_requirements" not in out["unreviewed_components"]


async def test_origin_unsupported_code_has_no_evidence_list(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    out = await _origin(api_client, hs_code="100630", transit_third_country=False)
    assert out["required_evidence"] is None
