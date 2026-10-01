"""Đồng bộ mức EVFTA-verified theo bằng chứng (C6). Dữ liệu là SYNTHETIC."""

import datetime as dt
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import service as companies
from app.modules.companies.tests.helpers import product_body
from app.modules.verification.evidence_service import sync_level
from app.modules.verification.models import (
    ApprovalStatus,
    Decision,
    Evidence,
    VerificationDecision,
)
from app.modules.verification.service import decide
from app.modules.verification.tests.helpers import (
    TODAY,
    add_rule,
    add_type,
    body,
    cross_check,
    prove_ownership,
)

pytestmark = pytest.mark.usefixtures("hs_seeded")
NOW = dt.datetime(2026, 10, 1, 9, 0, tzinfo=dt.UTC)


async def make_verified(session: AsyncSession, company_id: uuid.UUID, level: str = "basic") -> None:
    await companies.set_verification_state(
        session,
        company_id,
        status="verified",
        level=level,
        verified_at=NOW,
        expires_at=NOW + dt.timedelta(days=300),
    )


async def add_approved_evidence(
    session: AsyncSession,
    company_id: uuid.UUID,
    reviewer: uuid.UUID,
    type_code: str = "iso_9001",
    expires: dt.date | None = None,
    status: ApprovalStatus = ApprovalStatus.approved,
    checked: str | None = "match",
) -> Evidence:
    """Bằng chứng đã duyệt; mặc định đã kiểm chéo nguồn ngoài khớp (I8)."""
    row = Evidence(
        company_id=company_id,
        type_code=type_code,
        file_key=f"evidence/{company_id}/x.pdf",
        issued_at=TODAY - dt.timedelta(days=30),
        expires_at=expires,
        approval_status=status,
        reviewed_by=reviewer,
    )
    session.add(row)
    await session.flush()
    if checked is not None:
        await cross_check(session, row, checked)
    return row


@pytest.fixture
async def setup(
    api_client: AsyncClient, db_session: AsyncSession, company_id: uuid.UUID, reviewer_id: uuid.UUID
) -> uuid.UUID:
    """Exporter có sản phẩm cà phê (agriculture), luật bắt buộc iso_9001 (đã duyệt) và đã chứng
    minh quyền sở hữu (I11)."""
    await add_type(db_session, reviewer_id, code="iso_9001")
    await add_rule(db_session, reviewer_id, "iso_9001")
    r = await api_client.post("/api/exporter/products", json=product_body(hs_code="090121"))
    assert r.status_code == 201, r.text
    await prove_ownership(db_session, company_id)
    return company_id


async def state(session: AsyncSession, company_id: uuid.UUID) -> tuple[str, str]:
    s = await companies.get_verification_state(session, company_id)
    return s.status, s.level


async def test_level_up_when_all_required_valid(
    db_session: AsyncSession, setup: uuid.UUID, reviewer_id: uuid.UUID
) -> None:
    await make_verified(db_session, setup)
    await add_approved_evidence(db_session, setup, reviewer_id)
    assert await sync_level(db_session, setup, TODAY) == "level_up"
    assert await state(db_session, setup) == ("verified", "evfta_verified")
    row = (await db_session.scalars(select(VerificationDecision))).one()
    assert (row.decision, row.reviewer_id, row.reason) == (
        Decision.level_up,
        None,
        "evidence_complete",
    )
    assert await sync_level(db_session, setup, TODAY) is None  # idempotent


async def test_evfta_verified_requires_all_required_valid(
    db_session: AsyncSession, setup: uuid.UUID, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id, code="haccp")
    await add_rule(db_session, reviewer_id, "haccp")
    await make_verified(db_session, setup)
    await add_approved_evidence(db_session, setup, reviewer_id, "iso_9001")
    assert await sync_level(db_session, setup, TODAY) is None
    assert await state(db_session, setup) == ("verified", "basic")
    await add_approved_evidence(db_session, setup, reviewer_id, "haccp")
    assert await sync_level(db_session, setup, TODAY) == "level_up"


@pytest.mark.parametrize("status", ["unverified", "pending", "rejected"])
async def test_only_verified_company_is_upgraded(
    db_session: AsyncSession, setup: uuid.UUID, reviewer_id: uuid.UUID, status: str
) -> None:
    await companies.set_verification_state(
        db_session, setup, status=status, level="basic", verified_at=None, expires_at=None
    )
    await add_approved_evidence(db_session, setup, reviewer_id)
    assert await sync_level(db_session, setup, TODAY) is None
    assert await state(db_session, setup) == (status, "basic")


async def test_pending_or_rejected_evidence_does_not_upgrade(
    db_session: AsyncSession, setup: uuid.UUID, reviewer_id: uuid.UUID
) -> None:
    await make_verified(db_session, setup)
    await add_approved_evidence(db_session, setup, reviewer_id, status=ApprovalStatus.pending)
    await add_approved_evidence(db_session, setup, reviewer_id, status=ApprovalStatus.rejected)
    assert await sync_level(db_session, setup, TODAY) is None


async def test_expired_evidence_downgrades_level(
    db_session: AsyncSession, setup: uuid.UUID, reviewer_id: uuid.UUID
) -> None:
    await make_verified(db_session, setup, "evfta_verified")
    await add_approved_evidence(
        db_session, setup, reviewer_id, expires=TODAY + dt.timedelta(days=1)
    )
    assert await sync_level(db_session, setup, TODAY) is None  # còn hạn → giữ mức
    assert await sync_level(db_session, setup, TODAY + dt.timedelta(days=1)) == "level_down"
    assert await state(db_session, setup) == ("verified", "basic")


async def test_no_proven_ownership_never_upgrades(
    api_client: AsyncClient, db_session: AsyncSession, company_id: uuid.UUID, reviewer_id: uuid.UUID
) -> None:
    """I11: đủ bằng chứng bắt buộc nhưng chưa gọi lại số chính thức → không lên evfta_verified."""
    await add_type(db_session, reviewer_id, code="iso_9001")
    await add_rule(db_session, reviewer_id, "iso_9001")
    await api_client.post("/api/exporter/products", json=product_body(hs_code="090121"))
    await make_verified(db_session, company_id)
    await add_approved_evidence(db_session, company_id, reviewer_id)
    assert await sync_level(db_session, company_id, TODAY) is None
    await prove_ownership(db_session, company_id, result="mismatch")
    assert await sync_level(db_session, company_id, TODAY) is None
    assert await state(db_session, company_id) == ("verified", "basic")


async def test_later_ownership_mismatch_downgrades_level(
    db_session: AsyncSession, setup: uuid.UUID, reviewer_id: uuid.UUID
) -> None:
    await make_verified(db_session, setup)
    await add_approved_evidence(db_session, setup, reviewer_id)
    assert await sync_level(db_session, setup, TODAY) == "level_up"
    await prove_ownership(db_session, setup, result="mismatch")  # lần gọi lại sau không khớp
    assert await sync_level(db_session, setup, TODAY) == "level_down"
    assert await state(db_session, setup) == ("verified", "basic")


async def test_no_required_rules_never_upgrades(
    api_client: AsyncClient, db_session: AsyncSession, company_id: uuid.UUID, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id, code="iso_9001")  # có loại nhưng KHÔNG có luật bắt buộc
    await api_client.post("/api/exporter/products", json=product_body(hs_code="090121"))
    await make_verified(db_session, company_id)
    await add_approved_evidence(db_session, company_id, reviewer_id)
    assert await sync_level(db_session, company_id, TODAY) is None
    assert await state(db_session, company_id) == ("verified", "basic")


async def test_reminder_rules_do_not_count_as_required(
    api_client: AsyncClient, db_session: AsyncSession, company_id: uuid.UUID, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id, code="eudr_file")
    await add_rule(db_session, reviewer_id, "eudr_file", required=False, note="nhắc")
    await api_client.post("/api/exporter/products", json=product_body(hs_code="090121"))
    await make_verified(db_session, company_id)
    assert await sync_level(db_session, company_id, TODAY) is None  # chỉ có lời nhắc → không nâng


async def test_missing_evidence_never_changes_verification_status_by_itself(
    db_session: AsyncSession, setup: uuid.UUID
) -> None:
    """Thiếu bằng chứng chỉ ảnh hưởng MỨC, không bao giờ đổi trạng thái xác minh."""
    await make_verified(db_session, setup, "evfta_verified")
    await sync_level(db_session, setup, TODAY)
    assert (await state(db_session, setup))[0] == "verified"


async def test_checked_evidence_is_locked_so_level_cannot_be_gamed(
    api_client: AsyncClient, db_session: AsyncSession, setup: uuid.UUID, reviewer_id: uuid.UUID
) -> None:
    """I8: bằng chứng đã kiểm chéo không sửa/xóa được qua API (kết quả kiểm gắn với đúng file)."""
    await make_verified(db_session, setup)
    created = await api_client.post(
        "/api/exporter/evidences", json=body(str(setup), type_code="iso_9001")
    )
    evidence_id = uuid.UUID(created.json()["id"])
    row = await db_session.get(Evidence, evidence_id)
    assert row is not None
    row.approval_status = ApprovalStatus.approved
    await cross_check(db_session, row)
    assert await sync_level(db_session, setup) == "level_up"
    url = f"/api/exporter/evidences/{evidence_id}"
    assert (await api_client.delete(url)).status_code == 409
    patch = await api_client.patch(url, json={"file_key": f"evidence/{setup}/other.pdf"})
    assert patch.status_code == 409 and patch.json()["error"]["code"] == "evidence_locked"
    assert await state(db_session, setup) == ("verified", "evfta_verified")


async def test_deleting_unchecked_evidence_still_works(
    api_client: AsyncClient, db_session: AsyncSession, setup: uuid.UUID
) -> None:
    created = await api_client.post(
        "/api/exporter/evidences", json=body(str(setup), type_code="iso_9001")
    )
    url = f"/api/exporter/evidences/{created.json()['id']}"
    assert (await api_client.delete(url)).status_code == 204


# ── decide() với quyết định của hệ thống ────────────────────────────────────
@pytest.mark.parametrize(
    ("decision", "level"),
    [(Decision.level_up, "evfta_verified"), (Decision.level_down, "basic")],
)
async def test_level_decisions_reject_wrong_current_level(
    db_session: AsyncSession, company_id: uuid.UUID, decision: Decision, level: str
) -> None:
    await make_verified(db_session, company_id, level)
    with pytest.raises(AppError) as exc:
        await decide(db_session, company_id=company_id, decision=decision, reviewer=None, now=NOW)
    assert exc.value.code == "invalid_transition"


@pytest.mark.parametrize("decision", [Decision.level_up, Decision.level_down])
async def test_humans_cannot_use_level_decisions(
    db_session: AsyncSession, company_id: uuid.UUID, admin_user: CurrentUser, decision: Decision
) -> None:
    await make_verified(db_session, company_id, "basic")
    with pytest.raises(AppError) as exc:
        await decide(
            db_session, company_id=company_id, decision=decision, reviewer=admin_user, now=NOW
        )
    assert exc.value.status_code == 403


async def test_level_decisions_require_verified_status(
    db_session: AsyncSession, company_id: uuid.UUID
) -> None:
    with pytest.raises(AppError) as exc:
        await decide(
            db_session, company_id=company_id, decision=Decision.level_up, reviewer=None, now=NOW
        )
    assert exc.value.code == "invalid_transition"


async def test_level_decision_keeps_status_and_dates(
    db_session: AsyncSession, company_id: uuid.UUID
) -> None:
    await make_verified(db_session, company_id, "basic")
    await decide(
        db_session, company_id=company_id, decision=Decision.level_up, reviewer=None, now=NOW
    )
    s = await companies.get_verification_state(db_session, company_id)
    assert (s.status, s.level, s.verified_at) == ("verified", "evfta_verified", NOW)
    assert s.expires_at == NOW + dt.timedelta(days=300)
