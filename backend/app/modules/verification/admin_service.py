"""Admin nhập + duyệt loại bằng chứng, luật bắt buộc; duyệt bằng chứng của exporter (C6).

Dữ liệu mới hoặc vừa sửa luôn chưa duyệt (reviewed_by = NULL) nên chưa có tác dụng. Mọi thao tác
ghi audit với before/after.
"""

import datetime as dt
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.errors import AppError
from app.core.storage import Storage
from app.modules.auth.schemas import CurrentUser
from app.modules.catalog import service as catalog
from app.modules.verification import evidence_service
from app.modules.verification.admin_schemas import (
    EvidenceReviewIn,
    EvidenceTypeIn,
    EvidenceTypePatch,
    RuleIn,
)
from app.modules.verification.models import (
    ApprovalStatus,
    Evidence,
    EvidenceType,
    RequiredEvidenceRule,
)
from app.modules.verification.schemas import EvidenceOut

TYPE_ENTITY = "evidence_type"
RULE_ENTITY = "evidence_rule"


def _jsonable(value: Any) -> Any:
    return str(value) if isinstance(value, uuid.UUID | dt.datetime | dt.date) else value


def _type_snapshot(row: EvidenceType) -> dict[str, Any]:
    return {c.name: _jsonable(getattr(row, c.name)) for c in row.__table__.columns}


def _rule_snapshot(row: RequiredEvidenceRule) -> dict[str, Any]:
    return {c.name: _jsonable(getattr(row, c.name)) for c in row.__table__.columns}


# ── Loại bằng chứng ─────────────────────────────────────────────────────────
async def list_types(session: AsyncSession) -> list[EvidenceType]:
    return list(await session.scalars(select(EvidenceType).order_by(EvidenceType.code)))


async def _get_type(session: AsyncSession, code: str) -> EvidenceType:
    row = await session.get(EvidenceType, code)
    if row is None:
        raise AppError("evidence_type_not_found", "Evidence type not found", 404)
    return row


async def create_type(
    session: AsyncSession, actor: CurrentUser, data: EvidenceTypeIn
) -> EvidenceType:
    if await session.get(EvidenceType, data.code) is not None:
        raise AppError("evidence_type_exists", "Evidence type already exists", 409)
    row = EvidenceType(**data.model_dump())
    session.add(row)
    await session.flush()
    await record(
        session,
        actor_id=actor.id,
        action_type=f"{TYPE_ENTITY}.create",
        entity_type=TYPE_ENTITY,
        entity_id=row.code,
        before=None,
        after=_type_snapshot(row),
    )
    await session.commit()
    return row


async def update_type(
    session: AsyncSession, actor: CurrentUser, code: str, patch: EvidenceTypePatch
) -> EvidenceType:
    row = await _get_type(session, code)
    before = _type_snapshot(row)
    for name in patch.model_fields_set:
        value = getattr(patch, name)
        if value is None and name in ("name_vi", "name_en", "group", "is_active"):
            raise AppError("invalid_patch", f"{name} cannot be null", 422)
        setattr(row, name, value)
    row.reviewed_by = None  # sửa xong phải duyệt lại
    row.reviewed_at = None
    await session.flush()
    await record(
        session,
        actor_id=actor.id,
        action_type=f"{TYPE_ENTITY}.update",
        entity_type=TYPE_ENTITY,
        entity_id=row.code,
        before=before,
        after=_type_snapshot(row),
    )
    await session.commit()
    return row


async def review_type(session: AsyncSession, actor: CurrentUser, code: str) -> EvidenceType:
    row = await _get_type(session, code)
    before = _type_snapshot(row)
    row.reviewed_by = actor.id
    row.reviewed_at = dt.datetime.now(dt.UTC)
    await session.flush()
    await record(
        session,
        actor_id=actor.id,
        action_type=f"{TYPE_ENTITY}.review",
        entity_type=TYPE_ENTITY,
        entity_id=row.code,
        before=before,
        after=_type_snapshot(row),
    )
    await session.commit()
    return row


# ── Luật bắt buộc theo nhóm hàng ────────────────────────────────────────────
async def list_rules(session: AsyncSession, category: str | None) -> list[RequiredEvidenceRule]:
    query = select(RequiredEvidenceRule).order_by(
        RequiredEvidenceRule.category, RequiredEvidenceRule.evidence_type_code
    )
    if category:
        query = query.where(RequiredEvidenceRule.category == category)
    return list(await session.scalars(query))


async def create_rule(
    session: AsyncSession, actor: CurrentUser, data: RuleIn
) -> RequiredEvidenceRule:
    if data.category not in await catalog.list_categories(session):
        raise AppError("unknown_category", "Category is not in the HS catalog", 422)
    if await session.get(EvidenceType, data.evidence_type_code) is None:
        raise AppError("unknown_evidence_type", "Evidence type does not exist", 422)
    row = RequiredEvidenceRule(**data.model_dump())
    session.add(row)
    try:
        await session.flush()
    except IntegrityError as error:
        await session.rollback()
        raise AppError("rule_exists", "This rule already exists", 409) from error
    await record(
        session,
        actor_id=actor.id,
        action_type=f"{RULE_ENTITY}.create",
        entity_type=RULE_ENTITY,
        entity_id=str(row.id),
        before=None,
        after=_rule_snapshot(row),
    )
    await session.commit()
    return row


async def _get_rule(session: AsyncSession, rule_id: uuid.UUID) -> RequiredEvidenceRule:
    row = await session.get(RequiredEvidenceRule, rule_id)
    if row is None:
        raise AppError("rule_not_found", "Rule not found", 404)
    return row


async def review_rule(
    session: AsyncSession, actor: CurrentUser, rule_id: uuid.UUID
) -> RequiredEvidenceRule:
    row = await _get_rule(session, rule_id)
    before = _rule_snapshot(row)
    row.reviewed_by = actor.id
    row.reviewed_at = dt.datetime.now(dt.UTC)
    await session.flush()
    await record(
        session,
        actor_id=actor.id,
        action_type=f"{RULE_ENTITY}.review",
        entity_type=RULE_ENTITY,
        entity_id=str(row.id),
        before=before,
        after=_rule_snapshot(row),
    )
    await session.commit()
    return row


async def delete_rule(session: AsyncSession, actor: CurrentUser, rule_id: uuid.UUID) -> None:
    row = await _get_rule(session, rule_id)
    before = _rule_snapshot(row)
    await session.delete(row)
    await record(
        session,
        actor_id=actor.id,
        action_type=f"{RULE_ENTITY}.delete",
        entity_type=RULE_ENTITY,
        entity_id=str(rule_id),
        before=before,
        after=None,
    )
    await session.commit()


# ── Duyệt bằng chứng của exporter ───────────────────────────────────────────
async def review_evidence(
    session: AsyncSession,
    actor: CurrentUser,
    storage: Storage,
    evidence_id: uuid.UUID,
    data: EvidenceReviewIn,
) -> EvidenceOut:
    """Admin duyệt/từ chối một bằng chứng. Sau đó đồng bộ mức EVFTA-verified của công ty."""
    row = await session.get(Evidence, evidence_id)
    if row is None:
        raise AppError("evidence_not_found", "Evidence not found", 404)
    reason = (data.reason or "").strip() or None
    if data.decision == "reject" and reason is None:
        raise AppError("reason_required", "A reason is required to reject evidence", 422)
    before = evidence_service.snapshot(row)
    row.approval_status = (
        ApprovalStatus.approved if data.decision == "approve" else ApprovalStatus.rejected
    )
    row.reject_reason = reason if data.decision == "reject" else None
    row.reviewed_by = actor.id
    row.reviewed_at = dt.datetime.now(dt.UTC)
    await session.flush()
    await record(
        session,
        actor_id=actor.id,
        action_type=f"evidence.{data.decision}",
        entity_type=evidence_service.ENTITY,
        entity_id=str(row.id),
        before=before,
        after=evidence_service.snapshot(row),
    )
    await evidence_service.after_change(session, row.company_id)
    await session.refresh(row)
    return await evidence_service.to_out(session, storage, row)
