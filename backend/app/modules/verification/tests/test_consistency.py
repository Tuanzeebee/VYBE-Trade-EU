"""U22: luật kiểm chéo hồ sơ — cờ cho admin, gợi ý cho chủ hồ sơ, không đổi trạng thái xác minh."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies import service as companies
from app.modules.companies.tests.helpers import company_body, login_as, product_body
from app.modules.verification.consistency import ConsistencyFacts, address_overlap, evaluate
from app.modules.verification.models import ApprovalStatus, Evidence
from app.modules.verification.tests.helpers import add_type
from app.modules.verification.tests.test_verification_requests import login_admin


def facts(**over: object) -> ConsistencyFacts:
    base: dict[str, object] = {
        "industry": "seafood",
        "product_hs": ["030462"],
        "facility_code_types": {"establishment"},
        "export_markets": ["DE"],
        "evidence_types": {"haccp", "bill_of_lading"},
        "registered_address": "Lô A1, KCN Tân Tạo, Bình Tân, TP.HCM",
        "extracted_addresses": ["Lô A1 KCN Tân Tạo, quận Bình Tân, TP. Hồ Chí Minh"],
    }
    base.update(over)
    return ConsistencyFacts(**base)  # type: ignore[arg-type]


def codes(f: ConsistencyFacts) -> set[str]:
    return {finding.code for finding in evaluate(f)}


def test_consistent_seafood_exporter_has_no_findings() -> None:
    assert codes(facts()) == set()


@pytest.mark.parametrize(
    ("over", "expected"),
    [
        ({"industry": "textiles"}, "industry_product_mismatch"),
        ({"facility_code_types": set()}, "seafood_without_establishment"),
        ({"evidence_types": {"bill_of_lading"}}, "food_without_food_safety_certificate"),
        ({"evidence_types": {"haccp"}}, "export_markets_without_evidence"),
        (
            {"extracted_addresses": ["12 Rue de Rivoli, Paris"]},
            "certificate_address_mismatch",
        ),
        (
            {
                "industry": "fruits_vegetables",
                "product_hs": ["081060"],
                "facility_code_types": set(),
            },
            "fresh_produce_without_growing_area",
        ),
        (
            {"facility_code_types": {"establishment", "growing_area"}},
            "growing_area_without_plant_products",
        ),
        (
            {
                "industry": "textiles",
                "product_hs": ["610910"],
                "evidence_types": {"haccp", "bill_of_lading"},
            },
            "food_safety_certificate_without_food",
        ),
    ],
)
def test_each_rule(over: dict[str, object], expected: str) -> None:
    assert expected in codes(facts(**over))


def test_rules_are_quiet_without_data() -> None:
    empty = facts(
        industry="other",
        product_hs=[],
        facility_code_types=set(),
        export_markets=[],
        evidence_types=set(),
        registered_address=None,
        extracted_addresses=[],
    )
    assert codes(empty) == set()
    assert address_overlap("Hà Nội", "") == 0.0


async def test_hints_for_owner_flags_for_admin_status_unchanged(
    api_client: AsyncClient,
    db_session: AsyncSession,
    hs_seeded: AsyncSession,
    reviewer_id: uuid.UUID,
) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    body = company_body(industry_sector="seafood", export_markets=["DE"])
    company_id = (await api_client.post("/api/me/company", json=body)).json()["id"]
    r = await api_client.post(
        "/api/exporter/products", json=product_body(name="Cá tra phi lê", hs_code="0304.62")
    )
    assert r.status_code == 201, r.text
    hints = {h["code"] for h in (await api_client.get("/api/exporter/consistency-hints")).json()}
    assert {"seafood_without_establishment", "export_markets_without_evidence"} <= hints

    await add_type(db_session, reviewer_id, code="haccp")
    db_session.add(
        Evidence(
            company_id=uuid.UUID(company_id),
            type_code="haccp",
            file_key=f"evidence/{company_id}/h.pdf",
            approval_status=ApprovalStatus.approved,
        )
    )
    await db_session.flush()
    before = await companies.get_verification_state(db_session, uuid.UUID(company_id))
    await login_admin(api_client, db_session)
    flags = {
        f["code"]
        for f in (await api_client.get(f"/api/admin/companies/{company_id}/findings")).json()
    }
    assert "food_without_food_safety_certificate" not in flags
    assert "seafood_without_establishment" in flags
    after = await companies.get_verification_state(db_session, uuid.UUID(company_id))
    assert (after.status, after.tier) == (before.status, before.tier)
    assert (await api_client.get("/api/exporter/consistency-hints")).status_code == 403
