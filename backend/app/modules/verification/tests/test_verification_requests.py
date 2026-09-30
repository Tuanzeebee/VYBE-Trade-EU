"""Nộp yêu cầu xác minh (exporter), hàng đợi và quyết định (admin) — I1, I2."""

import datetime as dt
import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog
from app.core.errors import AppError
from app.core.events import clear_subscribers, subscribe
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import create_admin
from app.modules.companies import service as companies
from app.modules.companies.tests.helpers import PASSWORD, company_body, login_as
from app.modules.verification.events import VerificationStatusChanged
from app.modules.verification.models import (
    ApprovalStatus,
    Decision,
    Evidence,
    VerificationDecision,
    VerificationRequest,
)
from app.modules.verification.service import decide
from app.modules.verification.tests.helpers import TODAY, add_type

pytestmark = pytest.mark.usefixtures("hs_seeded")

SUBMIT = "/api/exporter/verification-requests"
QUEUE = "/api/admin/verification-queue"
NIL = "00000000-0000-0000-0000-000000000000"


async def new_exporter(client: AsyncClient, email: str, name: str) -> str:
    await client.post("/api/auth/logout")
    await login_as(client, "exporter", email)
    r = await client.post("/api/me/company", json=company_body(legal_name=name))
    assert r.status_code == 201, r.text
    return str(r.json()["id"])


async def login_admin(client: AsyncClient, session: AsyncSession) -> None:
    await client.post("/api/auth/logout")
    body = {"email": "admin@evfta.eu", "password": PASSWORD}
    r = await client.post("/api/auth/login", json=body)
    if r.status_code == 401:  # lần đầu: chưa có admin này
        await create_admin(session, "admin@evfta.eu", PASSWORD)
        r = await client.post("/api/auth/login", json=body)
    assert r.status_code == 200, r.text


async def add_evidence(session: AsyncSession, company_id: str, reviewer: uuid.UUID) -> Evidence:
    await add_type(session, reviewer)
    row = Evidence(
        company_id=uuid.UUID(company_id),
        type_code="iso_9001",
        file_key=f"evidence/{company_id}/a.pdf",
        issued_at=TODAY - dt.timedelta(days=3),
        approval_status=ApprovalStatus.pending,
    )
    session.add(row)
    await session.flush()
    return row


# ── Nộp yêu cầu ─────────────────────────────────────────────────────────────
async def test_exporter_submits_request_and_company_becomes_pending(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    company_id = await new_exporter(api_client, "a@x.vn", "Công ty A")
    evidence = await add_evidence(db_session, company_id, reviewer_id)
    r = await api_client.post(SUBMIT)
    assert r.status_code == 201, r.text
    assert (r.json()["status"], r.json()["evidence_ids"]) == ("pending", [str(evidence.id)])
    state = await companies.get_verification_state(db_session, uuid.UUID(company_id))
    assert state.status == "pending"
    decisions = list(await db_session.scalars(select(VerificationDecision)))
    assert [(d.decision, d.from_status, d.to_status) for d in decisions] == [
        (Decision.submit, "unverified", "pending")
    ]


async def test_submit_works_without_evidence(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await new_exporter(api_client, "a@x.vn", "Công ty A")
    r = await api_client.post(SUBMIT)
    assert (r.status_code, r.json()["evidence_ids"]) == (201, [])


@pytest.mark.parametrize("status", ["pending", "verified"])
async def test_cannot_submit_twice_or_when_verified(
    api_client: AsyncClient, db_session: AsyncSession, status: str
) -> None:
    company_id = await new_exporter(api_client, "a@x.vn", "Công ty A")
    await companies.set_verification_state(
        db_session,
        uuid.UUID(company_id),
        status=status,
        level="basic",
        verified_at=None,
        expires_at=None,
    )
    assert (await api_client.post(SUBMIT)).status_code == 409


async def test_rejected_company_can_resubmit(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company_id = await new_exporter(api_client, "a@x.vn", "Công ty A")
    await companies.set_verification_state(
        db_session,
        uuid.UUID(company_id),
        status="rejected",
        level="basic",
        verified_at=None,
        expires_at=None,
    )
    assert (await api_client.post(SUBMIT)).status_code == 201


async def test_submit_without_company_404_and_buyer_403_and_401(api_client: AsyncClient) -> None:
    assert (await api_client.post(SUBMIT)).status_code == 401
    await login_as(api_client, "exporter", "nocompany@x.vn")
    assert (await api_client.post(SUBMIT)).status_code == 404
    await api_client.post("/api/auth/logout")
    await login_as(api_client, "buyer", "b@x.vn")
    assert (await api_client.post(SUBMIT)).status_code == 403


async def test_my_requests_lists_only_mine(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await new_exporter(api_client, "a@x.vn", "Công ty A")
    await api_client.post(SUBMIT)
    await new_exporter(api_client, "b@x.vn", "Công ty B")
    assert (await api_client.get(SUBMIT)).json() == []
    await api_client.post(SUBMIT)
    assert len((await api_client.get(SUBMIT)).json()) == 1


async def test_submit_only_by_owner_via_decide(
    api_client: AsyncClient, db_session: AsyncSession, admin_user: CurrentUser
) -> None:
    company_id = await new_exporter(api_client, "a@x.vn", "Công ty A")
    other = CurrentUser(id=uuid.uuid4(), email="o@x.vn", role="exporter", preferred_language="vi")
    for who in (other, admin_user, None):
        with pytest.raises(AppError) as exc:
            await decide(
                db_session, company_id=uuid.UUID(company_id), decision=Decision.submit, reviewer=who
            )
        assert exc.value.status_code == 403


# ── Hàng đợi ────────────────────────────────────────────────────────────────
async def test_queue_lists_only_pending_oldest_first_with_evidence(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    first = await new_exporter(api_client, "a@x.vn", "Công ty A")
    evidence = await add_evidence(db_session, first, reviewer_id)
    await api_client.post(SUBMIT)
    await new_exporter(api_client, "b@x.vn", "Công ty B")
    await api_client.post(SUBMIT)
    await new_exporter(api_client, "c@x.vn", "Công ty C")  # chưa nộp → không có trong hàng đợi
    await login_admin(api_client, db_session)

    rows = (await api_client.get(QUEUE)).json()
    assert [r["legal_name"] for r in rows] == ["Công ty A", "Công ty B"]  # cũ nhất trước
    assert rows[0]["submitted_at"] <= rows[1]["submitted_at"]
    [shown] = rows[0]["evidences"]
    assert shown["id"] == str(evidence.id)
    assert shown["file_url"].startswith("https://fake/evidence/")
    assert rows[1]["evidences"] == []
    assert {"request_id", "company_id", "tax_id", "country"} <= set(rows[0])


async def test_queue_excludes_decided_requests(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await new_exporter(api_client, "a@x.vn", "Công ty A")
    request_id = (await api_client.post(SUBMIT)).json()["id"]
    await login_admin(api_client, db_session)
    await api_client.post(
        f"/api/admin/verification-requests/{request_id}/decision", json={"decision": "approve"}
    )
    assert (await api_client.get(QUEUE)).json() == []


async def test_queue_401_403(api_client: AsyncClient) -> None:
    assert (await api_client.get(QUEUE)).status_code == 401
    await login_as(api_client, "exporter", "e@x.vn")
    assert (await api_client.get(QUEUE)).status_code == 403


# ── Quyết định ──────────────────────────────────────────────────────────────
async def submitted(api_client: AsyncClient, db_session: AsyncSession) -> tuple[str, str]:
    company_id = await new_exporter(api_client, "a@x.vn", "Công ty A")
    request_id = (await api_client.post(SUBMIT)).json()["id"]
    await login_admin(api_client, db_session)
    return company_id, request_id


def decision_url(request_id: str) -> str:
    return f"/api/admin/verification-requests/{request_id}/decision"


async def test_approve_sets_verified_and_audits(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company_id, request_id = await submitted(api_client, db_session)
    r = await api_client.post(decision_url(request_id), json={"decision": "approve"})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "approved"
    state = await companies.get_verification_state(db_session, uuid.UUID(company_id))
    assert (state.status, state.level) == ("verified", "basic")
    assert state.expires_at is not None
    row = await db_session.get(VerificationRequest, uuid.UUID(request_id))
    assert row is not None and row.reviewed_at is not None
    actions = list(await db_session.scalars(select(AuditLog.action_type)))
    assert "verification.submit" in actions and "verification.approve" in actions


@pytest.mark.parametrize(
    ("decision", "company_status", "request_status"),
    [("reject", "rejected", "rejected"), ("request_info", "unverified", "info_requested")],
)
async def test_reject_and_request_info_need_reason(
    api_client: AsyncClient,
    db_session: AsyncSession,
    decision: str,
    company_status: str,
    request_status: str,
) -> None:
    company_id, request_id = await submitted(api_client, db_session)
    for reason in (None, "", "  "):
        r = await api_client.post(
            decision_url(request_id), json={"decision": decision, "reason": reason}
        )
        assert r.status_code == 422, (reason, r.text)
    assert (
        await companies.get_verification_state(db_session, uuid.UUID(company_id))
    ).status == "pending"
    ok = await api_client.post(
        decision_url(request_id), json={"decision": decision, "reason": "Thiếu MST"}
    )
    assert (ok.status_code, ok.json()["status"]) == (200, request_status)
    assert (
        await companies.get_verification_state(db_session, uuid.UUID(company_id))
    ).status == company_status


async def test_every_decision_has_a_reason_in_the_log_when_required(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, request_id = await submitted(api_client, db_session)
    await api_client.post(
        decision_url(request_id), json={"decision": "reject", "reason": "Sai thông tin"}
    )
    rows = list(
        await db_session.scalars(
            select(VerificationDecision).where(VerificationDecision.decision == Decision.reject)
        )
    )
    assert [r.reason for r in rows] == ["Sai thông tin"]


async def test_decision_twice_conflicts(api_client: AsyncClient, db_session: AsyncSession) -> None:
    _, request_id = await submitted(api_client, db_session)
    assert (
        await api_client.post(decision_url(request_id), json={"decision": "approve"})
    ).status_code == 200
    assert (
        await api_client.post(decision_url(request_id), json={"decision": "approve"})
    ).status_code == 409


async def test_unknown_request_404_and_bad_decision_422(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, request_id = await submitted(api_client, db_session)
    assert (
        await api_client.post(decision_url(NIL), json={"decision": "approve"})
    ).status_code == 404
    for bad in ("maybe", "expire", "submit", "level_up", ""):
        assert (
            await api_client.post(decision_url(request_id), json={"decision": bad})
        ).status_code == 422


async def test_decision_emits_event_with_new_status(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company_id, request_id = await submitted(api_client, db_session)
    seen: list[VerificationStatusChanged] = []

    async def handler(e: VerificationStatusChanged) -> None:
        seen.append(e)

    clear_subscribers()
    subscribe(VerificationStatusChanged, handler)
    try:
        await api_client.post(decision_url(request_id), json={"decision": "approve"})
    finally:
        clear_subscribers()
    assert [(str(e.company_id), e.old_status, e.new_status) for e in seen] == [
        (company_id, "pending", "verified")
    ]


async def test_decision_401_403(api_client: AsyncClient, db_session: AsyncSession) -> None:
    assert (
        await api_client.post(decision_url(NIL), json={"decision": "approve"})
    ).status_code == 401
    await login_as(api_client, "exporter", "e@x.vn")
    assert (
        await api_client.post(decision_url(NIL), json={"decision": "approve"})
    ).status_code == 403


async def test_approve_upgrades_level_when_evidence_is_complete(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    """Đã có bằng chứng bắt buộc được duyệt: duyệt xác minh xong thì lên evfta_verified ngay."""
    from app.modules.companies.tests.helpers import product_body
    from app.modules.verification.tests.helpers import add_rule, prove_ownership

    company_id = await new_exporter(api_client, "a@x.vn", "Công ty A")
    await api_client.post("/api/exporter/products", json=product_body(hs_code="090121"))
    evidence = await add_evidence(db_session, company_id, reviewer_id)
    await add_rule(db_session, reviewer_id, "iso_9001")
    await prove_ownership(db_session, company_id)
    evidence.approval_status = ApprovalStatus.approved
    await db_session.flush()
    request_id = (await api_client.post(SUBMIT)).json()["id"]
    await login_admin(api_client, db_session)
    await api_client.post(decision_url(request_id), json={"decision": "approve"})
    state = await companies.get_verification_state(db_session, uuid.UUID(company_id))
    assert (state.status, state.level) == ("verified", "evfta_verified")


async def test_other_pending_request_of_same_company_is_not_touched_by_stale_decision(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Yêu cầu cũ đã xử lý không thể quyết định lại dù công ty đang pending vì yêu cầu mới."""
    _, first = await submitted(api_client, db_session)
    await api_client.post(
        decision_url(first), json={"decision": "request_info", "reason": "Bổ sung"}
    )
    await api_client.post("/api/auth/logout")
    await login_as(api_client, "exporter", "a@x.vn")
    second = (await api_client.post(SUBMIT)).json()["id"]
    await login_admin(api_client, db_session)
    assert (
        await api_client.post(decision_url(first), json={"decision": "approve"})
    ).status_code == 409
    assert (
        await api_client.post(decision_url(second), json={"decision": "approve"})
    ).status_code == 200


# ── Ranh giới (AGENTS.md §6.9) ──────────────────────────────────────────────
def test_only_decide_assigns_verification_status() -> None:
    import pathlib
    import re

    app_dir = pathlib.Path(__file__).resolve().parents[3]
    offenders = []
    for path in app_dir.rglob("*.py"):
        rel = path.relative_to(app_dir).as_posix()
        if "tests" in path.parts or rel in {
            "modules/companies/models.py",
            "modules/companies/service.py",
        }:
            continue
        text = path.read_text(encoding="utf-8")
        if re.search(r"\.verification_status\s*=[^=]", text) or re.search(
            r"\.verification_level\s*=[^=]", text
        ):
            offenders.append(rel)
    assert offenders == []


_ = Any


async def test_exporter_sees_the_reason_of_a_rejection(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, request_id = await submitted(api_client, db_session)
    await api_client.post(
        decision_url(request_id), json={"decision": "reject", "reason": "  Sai MST  "}
    )
    await api_client.post("/api/auth/logout")
    await login_as(api_client, "exporter", "a@x.vn")
    [mine] = (await api_client.get(SUBMIT)).json()
    assert (mine["status"], mine["decision_reason"]) == ("rejected", "Sai MST")


async def test_approval_without_reason_has_no_reason(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    _, request_id = await submitted(api_client, db_session)
    r = await api_client.post(decision_url(request_id), json={"decision": "approve"})
    assert r.json()["decision_reason"] is None
