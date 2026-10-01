"""API admin: loại bằng chứng, luật bắt buộc theo nhóm hàng, duyệt bằng chứng (C6)."""

import datetime as dt
import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog
from app.modules.auth.service import create_admin
from app.modules.companies import service as companies
from app.modules.companies.tests.helpers import PASSWORD, login_as, product_body
from app.modules.verification.models import ApprovalStatus, Evidence
from app.modules.verification.tests.helpers import (
    TODAY,
    add_rule,
    add_type,
    cross_check,
    prove_ownership,
)

pytestmark = pytest.mark.usefixtures("hs_seeded")

TYPES = "/api/admin/evidence-types"
RULES = "/api/admin/evidence-rules"
NIL = "00000000-0000-0000-0000-000000000000"


def type_body(**over: Any) -> dict[str, Any]:
    b: dict[str, Any] = {
        "code": "iso_9001",
        "name_vi": "ISO 9001",
        "name_en": "ISO 9001",
        "group": "quality",
        "validity_months": None,
        "source": "synthetic",
    }
    b.update(over)
    return b


@pytest.fixture
async def admin(api_client: AsyncClient, db_session: AsyncSession) -> AsyncClient:
    await create_admin(db_session, "admin@evfta.eu", PASSWORD)
    r = await api_client.post(
        "/api/auth/login", json={"email": "admin@evfta.eu", "password": PASSWORD}
    )
    assert r.status_code == 200, r.text
    return api_client


ROUTES = [
    ("GET", TYPES),
    ("POST", TYPES),
    ("PATCH", f"{TYPES}/iso_9001"),
    ("POST", f"{TYPES}/iso_9001/review"),
    ("GET", RULES),
    ("POST", RULES),
    ("POST", f"{RULES}/{NIL}/review"),
    ("DELETE", f"{RULES}/{NIL}"),
    ("POST", f"/api/admin/evidences/{NIL}/review"),
]


@pytest.mark.parametrize(("method", "path"), ROUTES)
async def test_admin_evidence_routes_401(api_client: AsyncClient, method: str, path: str) -> None:
    assert (await api_client.request(method, path, json={})).status_code == 401


@pytest.mark.parametrize("role", ["exporter", "buyer"])
@pytest.mark.parametrize(("method", "path"), ROUTES)
async def test_admin_evidence_routes_403(
    api_client: AsyncClient, role: str, method: str, path: str
) -> None:
    await login_as(api_client, role, f"{role}@x.vn")
    assert (await api_client.request(method, path, json={})).status_code == 403


# ── Loại bằng chứng ─────────────────────────────────────────────────────────
async def test_type_created_unreviewed_then_reviewed(admin: AsyncClient) -> None:
    r = await admin.post(TYPES, json=type_body())
    assert r.status_code == 201, r.text
    assert (r.json()["reviewed_by"], r.json()["is_active"]) == (None, True)
    reviewed = await admin.post(f"{TYPES}/iso_9001/review")
    assert reviewed.json()["reviewed_by"] == (await admin.get("/api/me")).json()["id"]


async def test_editing_a_reviewed_type_removes_review(admin: AsyncClient) -> None:
    await admin.post(TYPES, json=type_body())
    await admin.post(f"{TYPES}/iso_9001/review")
    r = await admin.patch(f"{TYPES}/iso_9001", json={"name_en": "ISO 9001:2015"})
    assert (r.json()["name_en"], r.json()["reviewed_by"]) == ("ISO 9001:2015", None)


async def test_duplicate_type_code_conflicts(admin: AsyncClient) -> None:
    await admin.post(TYPES, json=type_body())
    assert (await admin.post(TYPES, json=type_body())).status_code == 409


@pytest.mark.parametrize(
    "over",
    [
        {"code": "Has Space"},
        {"code": "UPPER"},
        {"code": "a"},
        {"code": "x" * 65},
        {"name_vi": ""},
        {"validity_months": 0},
        {"validity_months": -3},
        {"validity_months": 1.5},
        {"group": ""},
    ],
)
async def test_type_validation(admin: AsyncClient, over: dict[str, Any]) -> None:
    assert (await admin.post(TYPES, json=type_body(**over))).status_code == 422


async def test_type_unknown_404(admin: AsyncClient) -> None:
    assert (await admin.patch(f"{TYPES}/khong_co", json={"name_vi": "x"})).status_code == 404
    assert (await admin.post(f"{TYPES}/khong_co/review")).status_code == 404


async def test_type_list_shows_review_state(admin: AsyncClient) -> None:
    await admin.post(TYPES, json=type_body())
    await admin.post(TYPES, json=type_body(code="haccp"))
    await admin.post(f"{TYPES}/haccp/review")
    listing = {t["code"]: t["reviewed_by"] is not None for t in (await admin.get(TYPES)).json()}
    assert listing == {"iso_9001": False, "haccp": True}


async def test_type_changes_are_audited(admin: AsyncClient, db_session: AsyncSession) -> None:
    await admin.post(TYPES, json=type_body())
    await admin.post(f"{TYPES}/iso_9001/review")
    await admin.patch(f"{TYPES}/iso_9001", json={"is_active": False})
    actions = [
        a
        for a in await db_session.scalars(select(AuditLog.action_type))
        if a.startswith("evidence_type")
    ]
    assert actions == ["evidence_type.create", "evidence_type.review", "evidence_type.update"]


# ── Luật bắt buộc theo nhóm hàng ────────────────────────────────────────────
async def test_rule_created_unreviewed_then_reviewed_then_deleted(admin: AsyncClient) -> None:
    await admin.post(TYPES, json=type_body())
    r = await admin.post(RULES, json={"category": "agriculture", "evidence_type_code": "iso_9001"})
    assert r.status_code == 201, r.text
    rule_id = r.json()["id"]
    assert (r.json()["is_required"], r.json()["reviewed_by"]) == (True, None)
    assert (await admin.post(f"{RULES}/{rule_id}/review")).json()["reviewed_by"] is not None
    assert (await admin.delete(f"{RULES}/{rule_id}")).status_code == 204
    assert (await admin.get(RULES)).json() == []


@pytest.mark.parametrize(
    "over",
    [
        {"category": "khong_co_nhom"},  # không phải nhóm hàng có trong danh mục HS
        {"category": ""},
        {"evidence_type_code": "khong_co"},
        {"note": "x" * 1001},
    ],
)
async def test_rule_validation(admin: AsyncClient, over: dict[str, Any]) -> None:
    await admin.post(TYPES, json=type_body())
    payload = {"category": "agriculture", "evidence_type_code": "iso_9001", **over}
    assert (await admin.post(RULES, json=payload)).status_code == 422


async def test_duplicate_rule_conflicts(admin: AsyncClient) -> None:
    await admin.post(TYPES, json=type_body())
    payload = {"category": "agriculture", "evidence_type_code": "iso_9001"}
    assert (await admin.post(RULES, json=payload)).status_code == 201
    assert (await admin.post(RULES, json=payload)).status_code == 409


async def test_reminder_rule_with_note(admin: AsyncClient) -> None:
    await admin.post(TYPES, json=type_body(code="eudr_file"))
    r = await admin.post(
        RULES,
        json={
            "category": "agriculture",
            "evidence_type_code": "eudr_file",
            "is_required": False,
            "note": "Nộp hồ sơ EUDR",
        },
    )
    assert (r.json()["is_required"], r.json()["note"]) == (False, "Nộp hồ sơ EUDR")


async def test_rule_list_filters_by_category(admin: AsyncClient) -> None:
    await admin.post(TYPES, json=type_body())
    for category in ("agriculture", "seafood"):
        await admin.post(RULES, json={"category": category, "evidence_type_code": "iso_9001"})
    only = (await admin.get(RULES, params={"category": "seafood"})).json()
    assert [r["category"] for r in only] == ["seafood"]


# ── Duyệt bằng chứng ────────────────────────────────────────────────────────
async def submitted_evidence(
    db_session: AsyncSession, company_id: uuid.UUID, reviewer_id: uuid.UUID
) -> Evidence:
    await add_type(db_session, reviewer_id)
    row = Evidence(
        company_id=company_id,
        type_code="iso_9001",
        file_key=f"evidence/{company_id}/a.pdf",
        issued_at=TODAY - dt.timedelta(days=5),
        approval_status=ApprovalStatus.pending,
    )
    db_session.add(row)
    await db_session.flush()
    await cross_check(db_session, row)  # I8: duyệt cần ≥ 1 lần kiểm chéo nguồn ngoài
    return row


async def test_admin_approves_evidence_and_it_upgrades_level(
    company_id: uuid.UUID,  # trước admin: exporter đăng nhập trước, admin đăng nhập sau
    admin: AsyncClient,
    db_session: AsyncSession,
    reviewer_id: uuid.UUID,
) -> None:
    evidence = await submitted_evidence(db_session, company_id, reviewer_id)
    await add_rule(db_session, reviewer_id, "iso_9001")
    await prove_ownership(db_session, company_id)
    await admin.post("/api/auth/logout")
    await login_as(admin, "exporter", "exp@x.vn")
    await admin.post("/api/exporter/products", json=product_body(hs_code="090121"))
    await companies.set_verification_state(
        db_session,
        company_id,
        status="verified",
        level="basic",
        verified_at=dt.datetime.now(dt.UTC),
        expires_at=None,
    )
    await admin.post("/api/auth/logout")
    await admin.post("/api/auth/login", json={"email": "admin@evfta.eu", "password": PASSWORD})

    r = await admin.post(f"/api/admin/evidences/{evidence.id}/review", json={"decision": "approve"})
    assert r.status_code == 200, r.text
    assert r.json()["approval_status"] == "approved"
    state = await companies.get_verification_state(db_session, company_id)
    assert (state.status, state.level) == ("verified", "evfta_verified")


async def test_reject_requires_reason(
    company_id: uuid.UUID, admin: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    evidence = await submitted_evidence(db_session, company_id, reviewer_id)
    url = f"/api/admin/evidences/{evidence.id}/review"
    for reason in (None, "", "   "):
        assert (
            await admin.post(url, json={"decision": "reject", "reason": reason})
        ).status_code == 422
    ok = await admin.post(url, json={"decision": "reject", "reason": "Ảnh mờ"})
    assert (ok.json()["approval_status"], ok.json()["reject_reason"]) == ("rejected", "Ảnh mờ")


async def test_review_evidence_audited_and_bad_input(
    company_id: uuid.UUID, admin: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    evidence = await submitted_evidence(db_session, company_id, reviewer_id)
    url = f"/api/admin/evidences/{evidence.id}/review"
    assert (await admin.post(url, json={"decision": "maybe"})).status_code == 422
    assert (
        await admin.post(f"/api/admin/evidences/{NIL}/review", json={"decision": "approve"})
    ).status_code == 404
    await admin.post(url, json={"decision": "approve"})
    audit = (
        (
            await db_session.execute(
                select(AuditLog).where(AuditLog.action_type == "evidence.approve")
            )
        )
        .scalars()
        .one()
    )
    assert audit.entity_id == str(evidence.id)
    assert audit.before_state is not None and audit.after_state is not None
    assert (audit.before_state["approval_status"], audit.after_state["approval_status"]) == (
        "pending",
        "approved",
    )
