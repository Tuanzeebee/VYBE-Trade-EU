"""SPEC_compliance_data_20_codes §5.4, §7: huy hiệu EVFTA-verified theo nhóm hàng, checklist bằng
chứng cấp công ty và job hạ mức. Dữ liệu SYNTHETIC; huy hiệu song song với mức evfta_verified."""

import datetime as dt
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog
from app.jobs.compliance_badges import run_compliance_badges
from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD, company_body, login_as, product_body
from app.modules.compliance.badge import (
    BADGE_CODE,
    BADGE_TEXT_VI,
    CompanyRequirement,
    badge_decision,
)
from app.modules.compliance.models import CompanyBadge, EvidenceTypeMapping
from app.modules.compliance.seed import load_seed
from app.modules.compliance.tests.test_seed_loader import SEED_DIR, VERSION
from app.modules.verification.tests.helpers import TODAY, add_type
from app.modules.verification.tests.test_level_sync import add_approved_evidence, make_verified

NOW = dt.datetime.now(dt.UTC)
SHRIMP = "03061792"  # nhóm seafood; yêu cầu công ty: EUR1_ISSUED_12M + EU_ESTABLISHMENT_LISTING


def req(
    code: str,
    blocks: str = "IMPORT",
    mapped: str | None = "m",
    *,
    reviewed: bool = True,
    mapping_reviewed: bool = True,
) -> CompanyRequirement:
    return CompanyRequirement(
        code,
        code,
        None,
        blocks,
        "VERIFIED",
        mapped and f"{mapped}_{code}",
        reviewed,
        mapping_reviewed,
    )


# --- hàm thuần -------------------------------------------------------------------------------------

BASE = [req(BADGE_CODE, "NONE"), req("EU_LISTING")]
APPROVED = {f"m_{BADGE_CODE}": "approved", "m_EU_LISTING": "approved"}


def test_badge_granted_when_verified_and_all_evidence_valid() -> None:
    d = badge_decision(verified=True, requirements=BASE, states=APPROVED)
    assert d.granted and d.reason is None and d.missing == () and d.unreviewed == ()


@pytest.mark.parametrize("missing_type", [f"m_{BADGE_CODE}", "m_EU_LISTING"])
@pytest.mark.parametrize("state", ["pending", "expired", "rejected", "missing"])
def test_badge_needs_every_required_evidence_approved_and_valid(
    missing_type: str, state: str
) -> None:
    states = {**APPROVED, missing_type: state}
    d = badge_decision(verified=True, requirements=BASE, states=states)
    assert not d.granted and d.reason == "MISSING_EVIDENCE"
    assert len(d.missing) == 1


def test_badge_needs_a_verified_company() -> None:
    d = badge_decision(verified=False, requirements=BASE, states=APPROVED)
    assert not d.granted and d.reason == "COMPANY_NOT_VERIFIED"


def test_badge_without_eur1_requirement_has_no_basis() -> None:
    d = badge_decision(verified=True, requirements=[req("EU_LISTING")], states=APPROVED)
    assert not d.granted and d.reason == "NO_BADGE_BASIS"


def test_unmapped_evidence_type_blocks_badge() -> None:
    reqs = [req(BADGE_CODE, "NONE"), req("EU_LISTING", mapped=None)]
    d = badge_decision(verified=True, requirements=reqs, states=APPROVED)
    assert not d.granted and d.missing == ("EU_LISTING",)


def test_non_import_company_evidence_is_not_required() -> None:
    reqs = [*BASE, req("OTHER", "NONE")]
    d = badge_decision(verified=True, requirements=reqs, states=APPROVED)
    assert d.granted


def test_unreviewed_rows_or_mapping_are_flagged_not_blocked() -> None:
    reqs = [req(BADGE_CODE, "NONE", reviewed=False), req("EU_LISTING", mapping_reviewed=False)]
    d = badge_decision(verified=True, requirements=reqs, states=APPROVED)
    assert d.granted
    assert set(d.unreviewed) == {"evidence_requirement", "evidence_mapping"}


def test_badge_text_never_claims_goods_are_originating() -> None:
    assert BADGE_TEXT_VI == "Đã được cấp C/O EUR.1 cho nhóm hàng này trong 12 tháng gần nhất"
    assert "đạt xuất xứ" not in BADGE_TEXT_VI


# --- DB / API ------------------------------------------------------------------------------------------


@pytest.fixture
async def seeded(db_session: AsyncSession) -> AsyncSession:
    await load_seed(db_session, SEED_DIR, VERSION)
    for code in ("eur1_issued", "eu_establishment_listing", "bivalve_area_classification"):
        await add_type(db_session, None, code=code)
    return db_session


@pytest.fixture
async def exporter(api_client: AsyncClient, seeded: AsyncSession) -> tuple[uuid.UUID, uuid.UUID]:
    await login_as(api_client, "exporter", "exp@x.vn")
    me = (await api_client.get("/api/me")).json()
    r = await api_client.post("/api/me/company", json=company_body())
    assert r.status_code == 201, r.text
    company_id = uuid.UUID(r.json()["id"])
    r = await api_client.post("/api/exporter/products", json=product_body(hs_code=SHRIMP))
    assert r.status_code == 201, r.text
    return company_id, uuid.UUID(me["id"])


def checklist_url(company_id: uuid.UUID, hs: str = SHRIMP) -> str:
    return f"/api/companies/{company_id}/evidence-checklist?hs={hs}"


async def approve_all(session: AsyncSession, company_id: uuid.UUID, expires: dt.date) -> None:
    reviewer = await create_admin(session, "luat-tm@evfta.eu", PASSWORD)
    for code in ("eur1_issued", "eu_establishment_listing"):
        await add_approved_evidence(session, company_id, reviewer, code, expires=expires)


async def test_seed_loads_unreviewed_mappings_idempotently(seeded: AsyncSession) -> None:
    rows = list(await seeded.scalars(select(EvidenceTypeMapping)))
    assert {r.compliance_code: r.verification_code for r in rows} == {
        "EUR1_ISSUED_12M": "eur1_issued",
        "EU_ESTABLISHMENT_LISTING": "eu_establishment_listing",
        "BIVALVE_AREA_CLASSIFICATION": "bivalve_area_classification",
    }
    assert all(r.reviewed_by is None for r in rows)
    again = await load_seed(seeded, SEED_DIR, VERSION)
    assert again.tables["evidence_type_mappings"].added == 0


async def test_checklist_shows_states_and_badge_for_owner(
    api_client: AsyncClient, exporter: tuple[uuid.UUID, uuid.UUID], seeded: AsyncSession
) -> None:
    company_id, _ = exporter
    res = await api_client.get(checklist_url(company_id), headers={"Accept-Language": "vi"})
    assert res.status_code == 200, res.text
    out = res.json()
    states = {i["code"]: i["state"] for i in out["items"]}
    assert states == {BADGE_CODE: "missing", "EU_ESTABLISHMENT_LISTING": "missing"}
    assert out["category"] == "seafood" and out["badge"]["granted"] is False
    assert out["badge"]["reason"] == "COMPANY_NOT_VERIFIED"
    assert out["review_state"] == "UNREVIEWED" and out["disclaimer"].startswith("Lưu ý")
    assert [i["blocks"] for i in out["items"]] == ["IMPORT", "NONE"]

    await make_verified(seeded, company_id)
    await approve_all(seeded, company_id, TODAY + dt.timedelta(days=200))
    out = (await api_client.get(checklist_url(company_id))).json()
    assert {i["state"] for i in out["items"]} == {"approved"}
    assert out["badge"]["granted"] is True and out["badge"]["text_vi"] == BADGE_TEXT_VI
    assert out["badge"]["reason"] is None


async def test_checklist_is_owner_or_admin_only(
    api_client: AsyncClient, exporter: tuple[uuid.UUID, uuid.UUID], seeded: AsyncSession
) -> None:
    company_id, _ = exporter
    api_client.cookies.clear()
    assert (await api_client.get(checklist_url(company_id))).status_code == 401
    await login_as(api_client, "buyer", "buy@x.eu", "en")
    assert (await api_client.get(checklist_url(company_id))).status_code == 403
    api_client.cookies.clear()
    await login_as(api_client, "exporter", "other@x.vn")
    assert (await api_client.get(checklist_url(company_id))).status_code == 403
    await create_admin(seeded, "admin@evfta.eu", PASSWORD)
    api_client.cookies.clear()
    res = await api_client.post(
        "/api/auth/login", json={"email": "admin@evfta.eu", "password": PASSWORD}
    )
    assert res.status_code == 200, res.text
    assert (await api_client.get(checklist_url(company_id))).status_code == 200
    assert (await api_client.get(checklist_url(uuid.uuid4()))).status_code == 404
    assert (await api_client.get(checklist_url(company_id, "12"))).status_code == 422


async def _badges(session: AsyncSession) -> list[CompanyBadge]:
    return list(await session.scalars(select(CompanyBadge)))


async def _audit(session: AsyncSession, action: str) -> list[AuditLog]:
    return list(await session.scalars(select(AuditLog).where(AuditLog.action_type == action)))


async def test_job_grants_then_revokes_when_evidence_expires_with_audit(
    api_client: AsyncClient, exporter: tuple[uuid.UUID, uuid.UUID], seeded: AsyncSession
) -> None:
    company_id, _ = exporter
    await make_verified(seeded, company_id)
    await approve_all(seeded, company_id, TODAY + dt.timedelta(days=30))

    assert await run_compliance_badges(seeded, NOW) == 1
    (badge,) = await _badges(seeded)
    assert badge.category == "seafood" and badge.is_active and badge.granted_at is not None
    assert badge.review_state == "UNREVIEWED"
    (granted,) = await _audit(seeded, "badge_granted")
    assert granted.entity_id == f"{company_id}:seafood" and granted.before_state is None
    assert await run_compliance_badges(seeded, NOW) == 0  # idempotent, không ghi audit lặp
    assert len(await _audit(seeded, "badge_granted")) == 1

    later = NOW + dt.timedelta(days=45)  # bằng chứng hết hạn
    assert await run_compliance_badges(seeded, later) == 1
    await seeded.refresh(badge)
    assert badge.is_active is False and badge.revoked_at is not None
    assert badge.missing == [BADGE_CODE, "EU_ESTABLISHMENT_LISTING"]
    (revoked,) = await _audit(seeded, "badge_revoked")
    assert revoked.before_state is not None and revoked.before_state["is_active"] is True


async def test_job_does_not_create_badge_without_evidence(
    exporter: tuple[uuid.UUID, uuid.UUID], seeded: AsyncSession
) -> None:
    company_id, _ = exporter
    await make_verified(seeded, company_id)
    assert await run_compliance_badges(seeded, NOW) == 0
    assert await _badges(seeded) == []


async def test_badge_runs_alongside_the_existing_evfta_verified_level(
    exporter: tuple[uuid.UUID, uuid.UUID], seeded: AsyncSession
) -> None:
    """Không có luật required_evidence_rules nào → mức evfta_verified cũ không đổi, nhưng huy hiệu
    theo nhóm hàng vẫn tính độc lập."""
    from app.modules.companies import service as companies

    company_id, _ = exporter
    await make_verified(seeded, company_id)
    await approve_all(seeded, company_id, TODAY + dt.timedelta(days=200))
    await run_compliance_badges(seeded, NOW)
    state = await companies.get_verification_state(seeded, company_id)
    assert state.level == "basic" and len(await _badges(seeded)) == 1
