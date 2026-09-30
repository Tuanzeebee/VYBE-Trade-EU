"""U20: cấp xác minh (ADR-0004) — chỉ decide() đổi cấp; admin nâng một cấp, hạ có lý do; cấp Nâng
cao cần quyền đã trả phí; job hạ cấp khi hết hạn hoặc thiếu bằng chứng ĐÃ DUYỆT (nháp thì không)."""

import datetime as dt
import uuid
from collections.abc import Iterator
from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import entitlements
from app.core.errors import AppError
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import service as companies
from app.modules.verification.models import (
    ApprovalStatus,
    Decision,
    Evidence,
    TierRequirement,
    VerificationDecision,
)
from app.modules.verification.service import decide
from app.modules.verification.tests.helpers import add_type
from app.modules.verification.tests.test_verification_requests import login_admin
from app.modules.verification.tier_service import sync_tiers
from app.modules.verification.tiers import (
    Requirement,
    company_kind,
    expired_reviewed_evidence,
    requirement_state,
    tier_request_error,
)
from scripts.seed_tier_requirements import DEFAULT_CSV, load_csv, seed_requirements

NOW = dt.datetime(2026, 10, 3, 9, tzinfo=dt.UTC)
TIER = "/api/me/verification-tier"
REQUEST = "/api/exporter/verification-tier-requests"


# ── Hàm thuần ─────────────────────────────────────────────────────────────────
def req(code: str, tier: int = 2, kind: str = "evidence", reviewed: bool = True) -> Requirement:
    return Requirement(tier, kind, code, code, code, True, reviewed)


def test_company_kind_and_requirement_states() -> None:
    assert company_kind("buyer", None) == "buyer"
    assert company_kind("exporter", "services") == "service_provider"
    assert company_kind("exporter", "both") == "product_seller"
    states = {"export_contract": "approved", "bill_of_lading": "pending"}
    assert requirement_state(req("export_contract"), states, set()) == "met"
    assert requirement_state(req("bill_of_lading"), states, set()) == "pending"
    assert requirement_state(req("customs_declaration"), states, set()) == "missing"
    assert requirement_state(req("traces_facility", kind="check"), {}, {"traces_facility"}) == "met"
    assert requirement_state(req("factory_video", kind="manual"), {}, set()) == "manual"


def test_request_rules() -> None:
    assert tier_request_error("pending", 0, 1, entitled=True, pending=False) == "not_verified"
    assert tier_request_error("verified", 1, 3, entitled=True, pending=False) == "invalid_target"
    assert tier_request_error("verified", 1, 2, entitled=False, pending=False) == (
        "entitlement_required"
    )
    assert tier_request_error("verified", 1, 2, entitled=True, pending=True) == "request_pending"
    assert tier_request_error("verified", 2, 3, entitled=False, pending=False) is None


def test_only_reviewed_required_evidence_lowers_a_tier() -> None:
    requirements = [
        req("export_contract"),
        req("draft_only", reviewed=False),
        req("third_party_audit", tier=3),
        req("factory_video", kind="manual"),
    ]
    assert expired_reviewed_evidence(requirements, {}, 2) == ["export_contract"]
    assert expired_reviewed_evidence(requirements, {}, 3) == [
        "export_contract",
        "third_party_audit",
    ]
    assert expired_reviewed_evidence(requirements, {"export_contract": "approved"}, 2) == []


def test_draft_csv_loads() -> None:
    rows = load_csv(DEFAULT_CSV)
    kinds = {(r["company_kind"], r["tier"]) for r in rows}
    assert {("product_seller", 1), ("product_seller", 2), ("product_seller", 3)} <= kinds
    assert ("buyer", 1) in kinds and ("service_provider", 2) in kinds
    assert Path(DEFAULT_CSV).name == "tier_requirements_draft.csv"


# ── decide() ──────────────────────────────────────────────────────────────────
async def approve(session: AsyncSession, company_id: uuid.UUID, admin: CurrentUser) -> None:
    await companies.set_verification_state(
        session, company_id, status="pending", level="basic", verified_at=None, expires_at=None
    )
    await decide(session, company_id=company_id, decision=Decision.approve, reviewer=admin, now=NOW)


async def test_approve_sets_basic_tier_and_tiers_move_one_step(
    db_session: AsyncSession, company_id: uuid.UUID, admin_user: CurrentUser
) -> None:
    await approve(db_session, company_id, admin_user)
    state = await companies.get_verification_state(db_session, company_id)
    assert (state.status, state.tier, state.tier_reviewed_at) == ("verified", 1, NOW)

    later = NOW + dt.timedelta(days=1)
    await decide(
        db_session, company_id=company_id, decision=Decision.tier_up, reviewer=admin_user, now=later
    )
    state = await companies.get_verification_state(db_session, company_id)
    assert (state.tier, state.tier_reviewed_at) == (2, later)
    assert state.tier_expires_at == later + dt.timedelta(days=365)

    with pytest.raises(AppError) as info:  # admin hạ cấp phải có lý do
        await decide(
            db_session, company_id=company_id, decision=Decision.tier_down, reviewer=admin_user
        )
    assert info.value.code == "reason_required"
    await decide(
        db_session,
        company_id=company_id,
        decision=Decision.tier_down,
        reviewer=admin_user,
        reason="Chứng nhận HACCP bị tổ chức cấp thu hồi",
    )
    state = await companies.get_verification_state(db_session, company_id)
    assert (state.tier, state.tier_expires_at, state.tier_reviewed_at) == (1, None, NOW)
    with pytest.raises(AppError):  # không hạ dưới Cơ bản bằng tier_down
        await decide(
            db_session,
            company_id=company_id,
            decision=Decision.tier_down,
            reviewer=admin_user,
            reason="x",
        )
    rows = (
        await db_session.scalars(
            select(VerificationDecision).order_by(VerificationDecision.decided_at)
        )
    ).all()
    assert [(r.decision, r.from_tier, r.to_tier) for r in rows] == [
        (Decision.approve, 0, 1),
        (Decision.tier_up, 1, 2),
        (Decision.tier_down, 2, 1),
    ]


async def test_only_admin_raises_and_losing_verification_resets_tier(
    db_session: AsyncSession,
    company_id: uuid.UUID,
    admin_user: CurrentUser,
    exporter_user: CurrentUser,
) -> None:
    with pytest.raises(AppError):  # chưa verified thì không có cấp để nâng
        await decide(
            db_session, company_id=company_id, decision=Decision.tier_up, reviewer=admin_user
        )
    await approve(db_session, company_id, admin_user)
    for reviewer in (None, exporter_user):
        with pytest.raises(AppError) as info:
            await decide(
                db_session, company_id=company_id, decision=Decision.tier_up, reviewer=reviewer
            )
        assert info.value.status_code == 403
    await decide(db_session, company_id=company_id, decision=Decision.tier_up, reviewer=admin_user)
    await companies.set_verification_state(
        db_session,
        company_id,
        status="verified",
        level="basic",
        verified_at=NOW,
        expires_at=NOW,
    )
    await decide(
        db_session,
        company_id=company_id,
        decision=Decision.expire,
        reviewer=None,
        now=NOW + dt.timedelta(days=1),
    )
    state = await companies.get_verification_state(db_session, company_id)
    assert (state.status, state.tier, state.tier_expires_at) == ("unverified", 0, None)


# ── API: tổng quan cấp, yêu cầu lên cấp (trả phí), admin duyệt ────────────────
@pytest.fixture
def paid() -> Iterator[list[bool]]:
    flag = [False]

    async def checker(session: AsyncSession, company_id: uuid.UUID, feature: str) -> bool:
        return flag[0] and feature == entitlements.VERIFICATION_ENHANCED

    previous = entitlements.register(checker)
    yield flag
    entitlements.register(previous)


async def test_tier_request_needs_payment_and_admin_approval(
    api_client: AsyncClient,
    db_session: AsyncSession,
    company_id: uuid.UUID,
    admin_user: CurrentUser,
    paid: list[bool],
) -> None:
    await seed_requirements(db_session, load_csv(DEFAULT_CSV))
    overview = (await api_client.get(TIER)).json()
    assert (overview["tier"], overview["next_tier"], overview["company_kind"]) == (
        0,
        None,
        "product_seller",
    )
    assert {r["tier"] for r in overview["requirements"]} == {1, 2, 3}
    assert all(r["reviewed"] is False for r in overview["requirements"])  # nháp

    await approve(db_session, company_id, admin_user)
    overview = (await api_client.get(TIER)).json()
    assert (overview["tier"], overview["tier_name_vi"], overview["next_tier"]) == (1, "Cơ bản", 2)
    assert (overview["next_tier_paid"], overview["request_error"]) == (True, "entitlement_required")
    r = await api_client.post(REQUEST, json={"target_tier": 2})
    assert (r.status_code, r.json()["error"]["code"]) == (402, "entitlement_required")

    paid[0] = True
    r = await api_client.post(REQUEST, json={"target_tier": 2})
    assert r.status_code == 201, r.text
    assert r.json()["target_tier"] == 2
    again = await api_client.post(REQUEST, json={"target_tier": 2})
    assert (again.status_code, again.json()["error"]["code"]) == (409, "request_pending")
    state = await companies.get_verification_state(db_session, company_id)
    assert (state.status, state.tier) == ("verified", 1)  # yêu cầu không tự đổi cấp

    await login_admin(api_client, db_session)
    queue = (await api_client.get("/api/admin/verification-queue")).json()
    item = next(i for i in queue if i["target_tier"] == 2)
    assert item["current_tier"] == 1
    assert any(
        t["code"] == "export_contract" and t["state"] == "missing"
        for t in item["tier_requirements"]
    )
    rejected = await api_client.post(
        f"/api/admin/verification-requests/{item['request_id']}/decision",
        json={"decision": "reject"},
    )
    assert rejected.status_code == 422  # từ chối phải có lý do
    ok = await api_client.post(
        f"/api/admin/verification-requests/{item['request_id']}/decision",
        json={"decision": "approve", "reason": "Đối chiếu HACCP với tổ chức cấp"},
    )
    assert ok.status_code == 200, ok.text
    db_session.expire_all()
    state = await companies.get_verification_state(db_session, company_id)
    assert (state.status, state.tier) == ("verified", 2)

    r = await api_client.post(
        f"/api/admin/companies/{company_id}/tier-down", json={"reason": "Thu hồi chứng nhận"}
    )
    assert r.status_code == 204
    db_session.expire_all()
    assert (await companies.get_verification_state(db_session, company_id)).tier == 1


async def test_tier_routes_roles(api_client: AsyncClient, company_id: uuid.UUID) -> None:
    await api_client.post("/api/auth/logout")
    assert (await api_client.get(TIER)).status_code == 401
    assert (await api_client.post(REQUEST, json={"target_tier": 2})).status_code == 401
    from app.modules.companies.tests.helpers import login_as

    await login_as(api_client, "buyer", "buyer@x.de")
    assert (await api_client.post(REQUEST, json={"target_tier": 2})).status_code == 403
    r = await api_client.post(f"/api/admin/companies/{company_id}/tier-down", json={"reason": "x"})
    assert r.status_code == 403


# ── Job ───────────────────────────────────────────────────────────────────────
async def test_job_lowers_expired_tier_and_missing_reviewed_evidence(
    db_session: AsyncSession,
    company_id: uuid.UUID,
    admin_user: CurrentUser,
    reviewer_id: uuid.UUID,
) -> None:
    await approve(db_session, company_id, admin_user)
    await decide(
        db_session, company_id=company_id, decision=Decision.tier_up, reviewer=admin_user, now=NOW
    )
    # Nháp (chưa duyệt) yêu cầu hợp đồng xuất khẩu → không hạ cấp dù công ty chưa nộp.
    db_session.add(
        TierRequirement(
            company_kind="product_seller",
            tier=2,
            kind="evidence",
            code="export_contract",
            label_vi="Hợp đồng",
            label_en="Contract",
        )
    )
    await db_session.flush()
    assert await sync_tiers(db_session, NOW + dt.timedelta(days=1)) == 0

    # Duyệt dòng yêu cầu → thiếu bằng chứng hợp lệ → hạ về Cơ bản.
    row = await db_session.scalar(select(TierRequirement))
    assert row is not None
    row.reviewed_by, row.reviewed_at = reviewer_id, NOW
    await add_type(db_session, reviewer_id, code="export_contract")
    db_session.add(
        Evidence(
            company_id=company_id,
            type_code="export_contract",
            file_key=f"evidence/{company_id}/c.pdf",
            approval_status=ApprovalStatus.approved,
        )
    )
    await db_session.flush()
    assert await sync_tiers(db_session, NOW + dt.timedelta(days=2)) == 0  # có bằng chứng hợp lệ
    ev = await db_session.scalar(select(Evidence))
    assert ev is not None
    ev.approval_status = ApprovalStatus.rejected
    await db_session.flush()
    assert await sync_tiers(db_session, NOW + dt.timedelta(days=3)) == 1
    db_session.expire_all()
    assert (await companies.get_verification_state(db_session, company_id)).tier == 1

    # Hết hạn cấp (365 ngày) cũng hạ cấp.
    await decide(
        db_session, company_id=company_id, decision=Decision.tier_up, reviewer=admin_user, now=NOW
    )
    ev.approval_status = ApprovalStatus.approved
    await db_session.flush()
    assert await sync_tiers(db_session, NOW + dt.timedelta(days=366)) == 1
    last = (
        await db_session.scalars(
            select(VerificationDecision).order_by(VerificationDecision.decided_at.desc())
        )
    ).first()
    assert last is not None and (last.decision, last.reason) == (Decision.tier_down, "tier_expired")
