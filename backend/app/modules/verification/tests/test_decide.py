"""verification.service.decide(): nơi DUY NHẤT đổi trạng thái xác minh (AGENTS.md §6.9)."""

import datetime as dt
import pathlib
import re
import uuid

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog
from app.core.errors import AppError
from app.core.events import clear_subscribers, subscribe
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import service as companies
from app.modules.verification.events import VerificationStatusChanged
from app.modules.verification.models import Decision, VerificationDecision
from app.modules.verification.service import decide, expire_due

NOW = dt.datetime(2026, 10, 1, 9, 0, tzinfo=dt.UTC)


async def state(session: AsyncSession, company_id: uuid.UUID) -> tuple[str, str]:
    s = await companies.get_verification_state(session, company_id)
    return s.status, s.level


async def set_state(
    session: AsyncSession,
    company_id: uuid.UUID,
    status: str,
    level: str = "basic",
    expires_at: dt.datetime | None = None,
) -> None:
    await companies.set_verification_state(
        session,
        company_id,
        status=status,
        level=level,
        verified_at=NOW if status == "verified" else None,
        expires_at=expires_at,
    )


async def decisions(session: AsyncSession) -> list[VerificationDecision]:
    return list((await session.scalars(select(VerificationDecision))).all())


async def test_every_company_starts_unverified_basic(
    company_id: uuid.UUID, db_session: AsyncSession
) -> None:
    s = await companies.get_verification_state(db_session, company_id)
    assert (s.status, s.level, s.verified_at, s.expires_at) == ("unverified", "basic", None, None)


async def test_approve_pending_company(
    db_session: AsyncSession, company_id: uuid.UUID, admin_user: CurrentUser
) -> None:
    await set_state(db_session, company_id, "pending")
    seen: list[VerificationStatusChanged] = []

    async def handler(e: VerificationStatusChanged) -> None:
        seen.append(e)

    clear_subscribers()
    subscribe(VerificationStatusChanged, handler)
    try:
        await decide(
            db_session,
            company_id=company_id,
            decision=Decision.approve,
            reviewer=admin_user,
            now=NOW,
        )
    finally:
        clear_subscribers()

    s = await companies.get_verification_state(db_session, company_id)
    assert (s.status, s.level, s.verified_at) == ("verified", "basic", NOW)
    assert s.expires_at == NOW + dt.timedelta(days=365)
    [row] = await decisions(db_session)
    assert (row.decision, row.reviewer_id, row.from_status, row.to_status) == (
        Decision.approve,
        admin_user.id,
        "pending",
        "verified",
    )
    assert [(e.company_id, e.old_status, e.new_status) for e in seen] == [
        (company_id, "pending", "verified")
    ]
    audit = (
        (
            await db_session.execute(
                select(AuditLog).where(AuditLog.action_type == "verification.approve")
            )
        )
        .scalars()
        .one()
    )
    assert audit.actor_id == admin_user.id and audit.entity_id == str(company_id)
    assert audit.before_state is not None and audit.after_state is not None
    assert (audit.before_state["status"], audit.after_state["status"]) == ("pending", "verified")


@pytest.mark.parametrize("from_status", ["unverified", "verified", "rejected"])
@pytest.mark.parametrize("decision", [Decision.approve, Decision.reject, Decision.request_info])
async def test_review_decisions_only_from_pending(
    db_session: AsyncSession,
    company_id: uuid.UUID,
    admin_user: CurrentUser,
    from_status: str,
    decision: Decision,
) -> None:
    await set_state(db_session, company_id, from_status)
    with pytest.raises(AppError) as exc:
        await decide(
            db_session,
            company_id=company_id,
            decision=decision,
            reviewer=admin_user,
            reason="lý do",
            now=NOW,
        )
    assert (exc.value.status_code, exc.value.code) == (409, "invalid_transition")
    assert await decisions(db_session) == []
    assert (await state(db_session, company_id))[0] == from_status


@pytest.mark.parametrize("decision", [Decision.reject, Decision.request_info])
@pytest.mark.parametrize("reason", [None, "", "   ", "\n\t"])
async def test_reason_required_for_reject_and_request_info(
    db_session: AsyncSession,
    company_id: uuid.UUID,
    admin_user: CurrentUser,
    decision: Decision,
    reason: str | None,
) -> None:
    await set_state(db_session, company_id, "pending")
    with pytest.raises(AppError) as exc:
        await decide(
            db_session,
            company_id=company_id,
            decision=decision,
            reviewer=admin_user,
            reason=reason,
            now=NOW,
        )
    assert (exc.value.status_code, exc.value.code) == (422, "reason_required")
    assert await decisions(db_session) == []
    assert await state(db_session, company_id) == ("pending", "basic")


@pytest.mark.parametrize(
    ("decision", "expected"),
    [(Decision.reject, "rejected"), (Decision.request_info, "unverified")],
)
async def test_reject_and_request_info_move_state_and_keep_reason(
    db_session: AsyncSession,
    company_id: uuid.UUID,
    admin_user: CurrentUser,
    decision: Decision,
    expected: str,
) -> None:
    await set_state(db_session, company_id, "pending")
    await decide(
        db_session,
        company_id=company_id,
        decision=decision,
        reviewer=admin_user,
        reason="  Thiếu giấy phép  ",
        now=NOW,
    )
    assert (await state(db_session, company_id))[0] == expected
    [row] = await decisions(db_session)
    assert row.reason == "Thiếu giấy phép"


async def test_approve_reason_is_optional_and_reviewer_must_be_admin(
    db_session: AsyncSession,
    company_id: uuid.UUID,
    admin_user: CurrentUser,
    exporter_user: CurrentUser,
) -> None:
    await set_state(db_session, company_id, "pending")
    for who in (exporter_user, None):
        with pytest.raises(AppError) as exc:
            await decide(
                db_session, company_id=company_id, decision=Decision.approve, reviewer=who, now=NOW
            )
        assert exc.value.status_code == 403
    assert await state(db_session, company_id) == ("pending", "basic")
    await decide(
        db_session, company_id=company_id, decision=Decision.approve, reviewer=admin_user, now=NOW
    )
    assert (await state(db_session, company_id))[0] == "verified"


async def test_unknown_company_404(db_session: AsyncSession, admin_user: CurrentUser) -> None:
    with pytest.raises(AppError) as exc:
        await decide(
            db_session,
            company_id=uuid.uuid4(),
            decision=Decision.approve,
            reviewer=admin_user,
            now=NOW,
        )
    assert exc.value.status_code == 404


# ── Hết hạn (I7) ────────────────────────────────────────────────────────────
async def test_expired_company_downgraded(db_session: AsyncSession, company_id: uuid.UUID) -> None:
    await set_state(
        db_session, company_id, "verified", "evfta_verified", NOW - dt.timedelta(seconds=1)
    )
    assert await expire_due(db_session, NOW) == 1
    assert await state(db_session, company_id) == ("unverified", "basic")
    [row] = await decisions(db_session)
    assert (row.decision, row.reviewer_id, row.reason) == (Decision.expire, None, "expired")
    assert "verification.expire" in list(await db_session.scalars(select(AuditLog.action_type)))


async def test_expiry_boundary_is_inclusive(
    db_session: AsyncSession, company_id: uuid.UUID
) -> None:
    await set_state(db_session, company_id, "verified", "basic", NOW)
    assert await expire_due(db_session, NOW) == 1


@pytest.mark.parametrize(
    ("status", "expires_at"),
    [
        ("verified", NOW + dt.timedelta(seconds=1)),  # chưa hết hạn
        ("verified", None),  # không có hạn
        ("pending", NOW - dt.timedelta(days=1)),
        ("unverified", NOW - dt.timedelta(days=1)),
        ("rejected", NOW - dt.timedelta(days=1)),
    ],
)
async def test_expire_due_leaves_other_companies_alone(
    db_session: AsyncSession, company_id: uuid.UUID, status: str, expires_at: dt.datetime | None
) -> None:
    await set_state(db_session, company_id, status, "basic", expires_at)
    assert await expire_due(db_session, NOW) == 0
    assert (await state(db_session, company_id))[0] == status
    assert await decisions(db_session) == []


async def test_expire_due_is_idempotent(db_session: AsyncSession, company_id: uuid.UUID) -> None:
    await set_state(db_session, company_id, "verified", "basic", NOW - dt.timedelta(days=1))
    assert await expire_due(db_session, NOW) == 1
    assert await expire_due(db_session, NOW) == 0
    assert len(await decisions(db_session)) == 1


async def test_expire_only_from_verified_via_decide(
    db_session: AsyncSession, company_id: uuid.UUID
) -> None:
    await set_state(db_session, company_id, "pending")
    with pytest.raises(AppError) as exc:
        await decide(
            db_session, company_id=company_id, decision=Decision.expire, reviewer=None, now=NOW
        )
    assert exc.value.code == "invalid_transition"


async def test_a_human_cannot_use_the_expire_decision(
    db_session: AsyncSession, company_id: uuid.UUID, admin_user: CurrentUser
) -> None:
    await set_state(db_session, company_id, "verified")
    with pytest.raises(AppError) as exc:
        await decide(
            db_session,
            company_id=company_id,
            decision=Decision.expire,
            reviewer=admin_user,
            now=NOW,
        )
    assert exc.value.status_code == 403


# ── Bảng append-only ────────────────────────────────────────────────────────
@pytest.mark.parametrize(
    "sql",
    [
        "UPDATE verification_decisions SET reason = 'x'",
        "DELETE FROM verification_decisions",
        "TRUNCATE verification_decisions",
    ],
)
async def test_verification_decisions_append_only(
    db_session: AsyncSession, company_id: uuid.UUID, admin_user: CurrentUser, sql: str
) -> None:
    await set_state(db_session, company_id, "pending")
    await decide(
        db_session, company_id=company_id, decision=Decision.approve, reviewer=admin_user, now=NOW
    )
    with pytest.raises(DBAPIError, match="append-only"):
        await db_session.execute(text(sql))


async def test_database_rejects_blank_reason_for_reject(
    db_session: AsyncSession, company_id: uuid.UUID, admin_user: CurrentUser
) -> None:
    db_session.add(
        VerificationDecision(
            company_id=company_id,
            reviewer_id=admin_user.id,
            decision=Decision.reject,
            reason="  ",
            from_status="pending",
            to_status="rejected",
        )
    )
    with pytest.raises(IntegrityError):
        await db_session.flush()


# ── Ranh giới module (AGENTS.md §5.1, §6.9) ────────────────────────────────
def test_only_verification_service_changes_verification_state() -> None:
    app_dir = pathlib.Path(__file__).resolve().parents[3]
    offenders = [
        path.relative_to(app_dir).as_posix()
        for path in app_dir.rglob("*.py")
        if "tests" not in path.parts
        and re.search(r"\bset_verification_state\b", path.read_text(encoding="utf-8"))
        and path.relative_to(app_dir).as_posix()
        not in {"modules/companies/service.py", "modules/verification/service.py"}
    ]
    assert offenders == []
