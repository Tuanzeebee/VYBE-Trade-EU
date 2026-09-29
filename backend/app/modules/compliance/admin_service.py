"""Nhập + duyệt dòng thuế và quy tắc xuất xứ (admin). Mọi thay đổi ghi audit với before/after.

Quy tắc an toàn: dòng MỚI và dòng vừa SỬA đều chưa duyệt (reviewed_by = NULL) nên không ra API công
khai cho tới khi admin bấm duyệt. Dòng đã duyệt không xóa được (chỉ đặt valid_until) để giữ lịch sử.
"""

import datetime as dt
import uuid
from decimal import Decimal
from enum import Enum
from typing import Any

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.errors import AppError
from app.modules.auth.schemas import CurrentUser
from app.modules.catalog import service as catalog
from app.modules.compliance.admin_schemas import (
    RooRuleIn,
    RooRulePatch,
    TariffLineIn,
    TariffLinePatch,
)
from app.modules.compliance.models import ProductSpecificRule, RuleType, TariffLine

TARIFF_ENTITY = "tariff_line"
RULE_ENTITY = "roo_rule"
_WITH_THRESHOLD = (RuleType.MaxNOM, RuleType.CTH_OR_MaxNOM)


def _jsonable(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, Decimal | dt.date | dt.datetime | uuid.UUID):
        return str(value)
    return value


def _snapshot[Row: (TariffLine, ProductSpecificRule)](row: Row) -> dict[str, Any]:
    # updated_at do DB tự đặt khi UPDATE nên chưa nạp sau flush — không cần trong audit.
    skip = {"created_at", "updated_at"}
    return {
        c.name: _jsonable(getattr(row, c.name)) for c in row.__table__.columns if c.name not in skip
    }


async def _require_hs(session: AsyncSession, code: str) -> None:
    if await catalog.get_hs_code(session, code) is None:
        raise AppError("unknown_hs_code", "HS code is not in the catalog", 422)


def _check_window(valid_from: dt.date, valid_until: dt.date | None) -> None:
    if valid_until is not None and valid_until <= valid_from:
        raise AppError("invalid_validity", "valid_until must be after valid_from", 422)


def _check_threshold(rule_type: RuleType, threshold: Decimal | None) -> None:
    needs = rule_type in _WITH_THRESHOLD
    if needs and (threshold is None or threshold <= 0):
        raise AppError("invalid_threshold", "threshold_pct is required for this rule_type", 422)
    if not needs and threshold is not None:
        raise AppError("invalid_threshold", "threshold_pct must be empty for this rule_type", 422)


async def _get[Row: (TariffLine, ProductSpecificRule)](
    session: AsyncSession, model: type[Row], row_id: uuid.UUID
) -> Row:
    row = await session.get(model, row_id)
    if row is None:
        raise AppError("not_found", "Not found", 404)
    return row


async def _save[Row: (TariffLine, ProductSpecificRule)](session: AsyncSession, row: Row) -> Row:
    await session.commit()
    await session.refresh(row)
    return row


async def _create[Row: (TariffLine, ProductSpecificRule)](
    session: AsyncSession, actor: CurrentUser, row: Row, entity: str
) -> Row:
    session.add(row)
    await session.flush()
    await session.refresh(row)  # giá trị numeric đúng như DB lưu (vd 9 → 9.0000)
    await record(
        session,
        actor_id=actor.id,
        action_type=f"{entity}.create",
        entity_type=entity,
        entity_id=str(row.id),
        before=None,
        after=_snapshot(row),
    )
    return await _save(session, row)


async def _update[Row: (TariffLine, ProductSpecificRule)](
    session: AsyncSession,
    actor: CurrentUser,
    row: Row,
    patch: BaseModel,
    entity: str,
) -> Row:
    before = _snapshot(row)
    for name in patch.model_fields_set:
        setattr(row, name, getattr(patch, name))
    row.reviewed_by = None  # sửa xong phải duyệt lại
    row.reviewed_at = None
    await session.flush()
    await session.refresh(row)  # giá trị numeric đúng như DB lưu (vd 9 → 9.0000)
    await record(
        session,
        actor_id=actor.id,
        action_type=f"{entity}.update",
        entity_type=entity,
        entity_id=str(row.id),
        before=before,
        after=_snapshot(row),
    )
    return await _save(session, row)


async def _review[Row: (TariffLine, ProductSpecificRule)](
    session: AsyncSession, actor: CurrentUser, row: Row, entity: str
) -> Row:
    before = _snapshot(row)
    row.reviewed_by = actor.id
    row.reviewed_at = dt.datetime.now(dt.UTC)
    await session.flush()
    await session.refresh(row)  # giá trị numeric đúng như DB lưu (vd 9 → 9.0000)
    await record(
        session,
        actor_id=actor.id,
        action_type=f"{entity}.review",
        entity_type=entity,
        entity_id=str(row.id),
        before=before,
        after=_snapshot(row),
    )
    return await _save(session, row)


async def _delete[Row: (TariffLine, ProductSpecificRule)](
    session: AsyncSession, actor: CurrentUser, row: Row, entity: str
) -> None:
    if row.reviewed_by is not None:
        raise AppError(
            "reviewed_row_locked", "Reviewed rows cannot be deleted; set valid_until", 409
        )
    before = _snapshot(row)
    await session.delete(row)
    await record(
        session,
        actor_id=actor.id,
        action_type=f"{entity}.delete",
        entity_type=entity,
        entity_id=str(row.id),
        before=before,
        after=None,
    )
    await session.commit()


def _apply_filters(query: Any, model: Any, hs_code: str | None, reviewed: bool | None) -> Any:
    if hs_code is not None:
        code = catalog.normalize_code(hs_code)
        if code is None:
            raise AppError("invalid_hs_code", "HS code must be 6 to 8 digits", 422)
        query = query.where(model.hs_code == code)
    if reviewed is not None:
        query = query.where(
            model.reviewed_by.is_not(None) if reviewed else model.reviewed_by.is_(None)
        )
    return query.order_by(model.hs_code, model.valid_from, model.id)


# ── Dòng thuế ───────────────────────────────────────────────────────────────
async def list_tariff_lines(
    session: AsyncSession, hs_code: str | None, reviewed: bool | None
) -> list[TariffLine]:
    query = _apply_filters(select(TariffLine), TariffLine, hs_code, reviewed)
    return list(await session.scalars(query))


async def create_tariff_line(
    session: AsyncSession, actor: CurrentUser, data: TariffLineIn
) -> TariffLine:
    await _require_hs(session, data.hs_code)
    _check_window(data.valid_from, data.valid_until)
    return await _create(session, actor, TariffLine(**data.model_dump()), TARIFF_ENTITY)


async def update_tariff_line(
    session: AsyncSession, actor: CurrentUser, line_id: uuid.UUID, patch: TariffLinePatch
) -> TariffLine:
    line = await _get(session, TariffLine, line_id)
    fields = patch.model_fields_set
    required = {"hs_code", "destination", "duty_type", "valid_from"} & fields
    if any(getattr(patch, name) is None for name in required):
        raise AppError("invalid_patch", "Required fields cannot be null", 422)
    if patch.hs_code is not None:
        await _require_hs(session, patch.hs_code)
    _check_window(
        patch.valid_from if "valid_from" in fields and patch.valid_from else line.valid_from,
        patch.valid_until if "valid_until" in fields else line.valid_until,
    )
    if "quota_required" in fields and patch.quota_required is None:
        raise AppError("invalid_patch", "quota_required cannot be null", 422)
    return await _update(session, actor, line, patch, TARIFF_ENTITY)


async def review_tariff_line(
    session: AsyncSession, actor: CurrentUser, line_id: uuid.UUID
) -> TariffLine:
    return await _review(session, actor, await _get(session, TariffLine, line_id), TARIFF_ENTITY)


async def delete_tariff_line(session: AsyncSession, actor: CurrentUser, line_id: uuid.UUID) -> None:
    await _delete(session, actor, await _get(session, TariffLine, line_id), TARIFF_ENTITY)


# ── Quy tắc xuất xứ ─────────────────────────────────────────────────────────
async def list_roo_rules(
    session: AsyncSession, hs_code: str | None, reviewed: bool | None
) -> list[ProductSpecificRule]:
    query = _apply_filters(select(ProductSpecificRule), ProductSpecificRule, hs_code, reviewed)
    return list(await session.scalars(query))


async def create_roo_rule(
    session: AsyncSession, actor: CurrentUser, data: RooRuleIn
) -> ProductSpecificRule:
    await _require_hs(session, data.hs_code)
    _check_window(data.valid_from, data.valid_until)
    _check_threshold(data.rule_type, data.threshold_pct)
    return await _create(session, actor, ProductSpecificRule(**data.model_dump()), RULE_ENTITY)


async def update_roo_rule(
    session: AsyncSession, actor: CurrentUser, rule_id: uuid.UUID, patch: RooRulePatch
) -> ProductSpecificRule:
    rule = await _get(session, ProductSpecificRule, rule_id)
    fields = patch.model_fields_set
    required = {"hs_code", "rule_type", "valid_from", "requires_expert"} & fields
    if any(getattr(patch, name) is None for name in required):
        raise AppError("invalid_patch", "Required fields cannot be null", 422)
    if patch.hs_code is not None:
        await _require_hs(session, patch.hs_code)
    _check_window(
        patch.valid_from if "valid_from" in fields and patch.valid_from else rule.valid_from,
        patch.valid_until if "valid_until" in fields else rule.valid_until,
    )
    _check_threshold(
        patch.rule_type if "rule_type" in fields and patch.rule_type else rule.rule_type,
        patch.threshold_pct if "threshold_pct" in fields else rule.threshold_pct,
    )
    return await _update(session, actor, rule, patch, RULE_ENTITY)


async def review_roo_rule(
    session: AsyncSession, actor: CurrentUser, rule_id: uuid.UUID
) -> ProductSpecificRule:
    return await _review(
        session, actor, await _get(session, ProductSpecificRule, rule_id), RULE_ENTITY
    )


async def delete_roo_rule(session: AsyncSession, actor: CurrentUser, rule_id: uuid.UUID) -> None:
    await _delete(session, actor, await _get(session, ProductSpecificRule, rule_id), RULE_ENTITY)
