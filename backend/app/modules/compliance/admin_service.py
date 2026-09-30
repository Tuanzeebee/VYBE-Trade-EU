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
    CountryTermIn,
    CountryTermPatch,
    RooRuleIn,
    RooRulePatch,
    TariffLineIn,
    TariffLinePatch,
    TradeAgreementIn,
    TradeAgreementPatch,
)
from app.modules.compliance.models import (
    ImportCountryTerm,
    ProductSpecificRule,
    RuleType,
    TariffLine,
    TradeAgreement,
)

TARIFF_ENTITY = "tariff_line"
TERM_ENTITY = "country_term"
RULE_ENTITY = "roo_rule"
AGREEMENT_ENTITY = "trade_agreement"
_WITH_THRESHOLD = (RuleType.MaxNOM, RuleType.CTH_OR_MaxNOM)


def _jsonable(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, Decimal | dt.date | dt.datetime | uuid.UUID):
        return str(value)
    return value


def _snapshot[Row: (TariffLine, ProductSpecificRule, ImportCountryTerm, TradeAgreement)](
    row: Row,
) -> dict[str, Any]:
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


async def _get[Row: (TariffLine, ProductSpecificRule, ImportCountryTerm, TradeAgreement)](
    session: AsyncSession, model: type[Row], row_id: uuid.UUID
) -> Row:
    row = await session.get(model, row_id)
    if row is None:
        raise AppError("not_found", "Not found", 404)
    return row


async def _save[Row: (TariffLine, ProductSpecificRule, ImportCountryTerm, TradeAgreement)](
    session: AsyncSession, row: Row
) -> Row:
    await session.commit()
    await session.refresh(row)
    return row


async def _create[Row: (TariffLine, ProductSpecificRule, ImportCountryTerm, TradeAgreement)](
    session: AsyncSession, actor: CurrentUser, row: Row, entity: str, commit: bool = True
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
    return await _save(session, row) if commit else row


async def _update[Row: (TariffLine, ProductSpecificRule, ImportCountryTerm, TradeAgreement)](
    session: AsyncSession,
    actor: CurrentUser,
    row: Row,
    patch: BaseModel,
    entity: str,
    commit: bool = True,
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
    return await _save(session, row) if commit else row


async def _review[Row: (TariffLine, ProductSpecificRule, ImportCountryTerm, TradeAgreement)](
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


async def _delete[Row: (TariffLine, ProductSpecificRule, ImportCountryTerm, TradeAgreement)](
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


async def _require_agreement(session: AsyncSession, code: str) -> None:
    if await session.scalar(select(TradeAgreement.id).where(TradeAgreement.code == code)) is None:
        raise AppError("unknown_agreement", "Trade agreement code is not in the list", 422)


async def create_tariff_line(
    session: AsyncSession, actor: CurrentUser, data: TariffLineIn, commit: bool = True
) -> TariffLine:
    await _require_hs(session, data.hs_code)
    await _require_agreement(session, data.agreement_code)
    _check_window(data.valid_from, data.valid_until)
    return await _create(session, actor, TariffLine(**data.model_dump()), TARIFF_ENTITY, commit)


async def update_tariff_line(
    session: AsyncSession,
    actor: CurrentUser,
    line_id: uuid.UUID,
    patch: TariffLinePatch,
    commit: bool = True,
) -> TariffLine:
    line = await _get(session, TariffLine, line_id)
    fields = patch.model_fields_set
    required = {"hs_code", "destination", "agreement_code", "duty_type", "valid_from"} & fields
    if any(getattr(patch, name) is None for name in required):
        raise AppError("invalid_patch", "Required fields cannot be null", 422)
    if patch.hs_code is not None:
        await _require_hs(session, patch.hs_code)
    if patch.agreement_code is not None:
        await _require_agreement(session, patch.agreement_code)
    _check_window(
        patch.valid_from if "valid_from" in fields and patch.valid_from else line.valid_from,
        patch.valid_until if "valid_until" in fields else line.valid_until,
    )
    if "quota_required" in fields and patch.quota_required is None:
        raise AppError("invalid_patch", "quota_required cannot be null", 422)
    return await _update(session, actor, line, patch, TARIFF_ENTITY, commit)


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
    session: AsyncSession, actor: CurrentUser, data: RooRuleIn, commit: bool = True
) -> ProductSpecificRule:
    await _require_hs(session, data.hs_code)
    _check_window(data.valid_from, data.valid_until)
    _check_threshold(data.rule_type, data.threshold_pct)
    return await _create(
        session, actor, ProductSpecificRule(**data.model_dump()), RULE_ENTITY, commit
    )


async def update_roo_rule(
    session: AsyncSession,
    actor: CurrentUser,
    rule_id: uuid.UUID,
    patch: RooRulePatch,
    commit: bool = True,
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
    return await _update(session, actor, rule, patch, RULE_ENTITY, commit)


async def review_roo_rule(
    session: AsyncSession, actor: CurrentUser, rule_id: uuid.UUID
) -> ProductSpecificRule:
    return await _review(
        session, actor, await _get(session, ProductSpecificRule, rule_id), RULE_ENTITY
    )


async def delete_roo_rule(session: AsyncSession, actor: CurrentUser, rule_id: uuid.UUID) -> None:
    await _delete(session, actor, await _get(session, ProductSpecificRule, rule_id), RULE_ENTITY)


# ── VAT theo nước ───────────────────────────────────────────────────────────
async def list_country_terms(
    session: AsyncSession, hs_code: str | None, reviewed: bool | None
) -> list[ImportCountryTerm]:
    query = _apply_filters(select(ImportCountryTerm), ImportCountryTerm, hs_code, reviewed)
    return list(await session.scalars(query))


async def _require_free_key(
    session: AsyncSession,
    hs_code: str,
    country: str,
    valid_from: dt.date,
    ignore_id: uuid.UUID | None = None,
) -> None:
    query = select(ImportCountryTerm.id).where(
        ImportCountryTerm.hs_code == hs_code,
        ImportCountryTerm.country == country,
        ImportCountryTerm.valid_from == valid_from,
    )
    existing = await session.scalar(query)
    if existing is not None and existing != ignore_id:
        raise AppError("duplicate_term", "This HS code, country and start date already exist", 409)


async def create_country_term(
    session: AsyncSession, actor: CurrentUser, data: CountryTermIn, commit: bool = True
) -> ImportCountryTerm:
    await _require_hs(session, data.hs_code)
    _check_window(data.valid_from, data.valid_until)
    await _require_free_key(session, data.hs_code, data.country, data.valid_from)
    return await _create(
        session, actor, ImportCountryTerm(**data.model_dump()), TERM_ENTITY, commit
    )


async def update_country_term(
    session: AsyncSession,
    actor: CurrentUser,
    term_id: uuid.UUID,
    patch: CountryTermPatch,
    commit: bool = True,
) -> ImportCountryTerm:
    term = await _get(session, ImportCountryTerm, term_id)
    fields = patch.model_fields_set
    required = {"hs_code", "country", "vat_rate", "valid_from"} & fields
    if any(getattr(patch, name) is None for name in required):
        raise AppError("invalid_patch", "Required fields cannot be null", 422)
    if patch.hs_code is not None:
        await _require_hs(session, patch.hs_code)
    valid_from = (
        patch.valid_from if "valid_from" in fields and patch.valid_from else term.valid_from
    )
    _check_window(valid_from, patch.valid_until if "valid_until" in fields else term.valid_until)
    await _require_free_key(
        session,
        patch.hs_code or term.hs_code,
        patch.country or term.country,
        valid_from,
        ignore_id=term.id,
    )
    return await _update(session, actor, term, patch, TERM_ENTITY, commit)


async def review_country_term(
    session: AsyncSession, actor: CurrentUser, term_id: uuid.UUID
) -> ImportCountryTerm:
    return await _review(
        session, actor, await _get(session, ImportCountryTerm, term_id), TERM_ENTITY
    )


async def delete_country_term(
    session: AsyncSession, actor: CurrentUser, term_id: uuid.UUID
) -> None:
    await _delete(session, actor, await _get(session, ImportCountryTerm, term_id), TERM_ENTITY)


# ── Hiệp định thương mại (U12) ─────────────────────────────────────────────
async def list_agreements(session: AsyncSession, reviewed: bool | None) -> list[TradeAgreement]:
    query = select(TradeAgreement)
    if reviewed is not None:
        query = query.where(
            TradeAgreement.reviewed_by.is_not(None)
            if reviewed
            else TradeAgreement.reviewed_by.is_(None)
        )
    return list(await session.scalars(query.order_by(TradeAgreement.code)))


async def create_agreement(
    session: AsyncSession, actor: CurrentUser, data: TradeAgreementIn
) -> TradeAgreement:
    if await session.scalar(select(TradeAgreement.id).where(TradeAgreement.code == data.code)):
        raise AppError("duplicate_agreement", "This agreement code already exists", 409)
    return await _create(session, actor, TradeAgreement(**data.model_dump()), AGREEMENT_ENTITY)


async def update_agreement(
    session: AsyncSession, actor: CurrentUser, agreement_id: uuid.UUID, patch: TradeAgreementPatch
) -> TradeAgreement:
    row = await _get(session, TradeAgreement, agreement_id)
    required = {"name_vi", "name_en", "partners"} & patch.model_fields_set
    if any(getattr(patch, name) is None for name in required):
        raise AppError("invalid_patch", "Required fields cannot be null", 422)
    return await _update(session, actor, row, patch, AGREEMENT_ENTITY)


async def review_agreement(
    session: AsyncSession, actor: CurrentUser, agreement_id: uuid.UUID
) -> TradeAgreement:
    row = await _get(session, TradeAgreement, agreement_id)
    return await _review(session, actor, row, AGREEMENT_ENTITY)


async def delete_agreement(
    session: AsyncSession, actor: CurrentUser, agreement_id: uuid.UUID
) -> None:
    row = await _get(session, TradeAgreement, agreement_id)
    used = await session.scalar(
        select(TariffLine.id).where(TariffLine.agreement_code == row.code).limit(1)
    )
    if used is not None:
        raise AppError("agreement_in_use", "Tariff lines still use this agreement", 409)
    await _delete(session, actor, row, AGREEMENT_ENTITY)
