"""Bằng chứng của exporter, danh sách kiểm theo nhóm hàng và đồng bộ mức EVFTA-verified (C6).

Loại bằng chứng và quy tắc bắt buộc là DỮ LIỆU do luật TM duyệt; dòng chưa có reviewed_by không
được dùng. Không tính năng nào ở đây đổi trạng thái xác minh (chỉ decide() làm việc đó).
"""

import datetime as dt
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.errors import AppError
from app.core.storage import Storage
from app.modules.auth.schemas import CurrentUser
from app.modules.catalog import service as catalog
from app.modules.companies import product_service
from app.modules.companies import service as companies
from app.modules.verification import service as verification
from app.modules.verification.logic import (
    EvidenceFact,
    checklist_state,
    evidence_expiry,
    is_evfta_verified,
)
from app.modules.verification.models import (
    ApprovalStatus,
    Decision,
    Evidence,
    EvidenceType,
    RequiredEvidenceRule,
)
from app.modules.verification.schemas import (
    ChecklistItem,
    EvidenceIn,
    EvidenceOut,
    EvidencePatch,
)

ENTITY = "evidence"


def _today() -> dt.date:
    return dt.datetime.now(dt.UTC).date()


def snapshot(row: Evidence) -> dict[str, Any]:
    return {
        "type_code": row.type_code,
        "file_key": row.file_key,
        "certificate_number": row.certificate_number,
        "issuer": row.issuer,
        "issued_at": row.issued_at.isoformat(),
        "expires_at": row.expires_at.isoformat() if row.expires_at else None,
        "approval_status": row.approval_status.value,
    }


async def _exporter_company_id(session: AsyncSession, user: CurrentUser) -> uuid.UUID:
    """Lớp kiểm thứ hai (lớp một là require_role): chỉ exporter, phải có công ty."""
    if user.role != "exporter":
        raise AppError("forbidden", "Not allowed for this role", 403)
    company_id = await companies.get_company_id(session, user.id)
    if company_id is None:
        raise AppError("company_not_found", "Company profile not created yet", 404)
    return company_id


async def _usable_type(session: AsyncSession, code: str) -> EvidenceType:
    """Chỉ loại đã được luật TM duyệt và đang bật mới nộp được."""
    row = await session.get(EvidenceType, code)
    if row is None or row.reviewed_by is None or not row.is_active:
        raise AppError("unknown_evidence_type", "Evidence type is not available", 422)
    return row


def _check_file_key(company_id: uuid.UUID, key: str) -> None:
    if not key.startswith(f"evidence/{company_id}/"):
        raise AppError("invalid_file_key", "File was not uploaded for this company", 422)


def _check_dates(issued_at: dt.date, expires_at: dt.date | None) -> None:
    if issued_at > _today():
        raise AppError("invalid_dates", "issued_at cannot be in the future", 422)
    if expires_at is not None and expires_at <= issued_at:
        raise AppError("invalid_dates", "expires_at must be after issued_at", 422)


async def to_out(session: AsyncSession, storage: Storage, row: Evidence) -> EvidenceOut:
    type_row = await session.get_one(EvidenceType, row.type_code)
    return EvidenceOut(
        id=row.id,
        type_code=row.type_code,
        type_name_vi=type_row.name_vi,
        type_name_en=type_row.name_en,
        certificate_number=row.certificate_number,
        issuer=row.issuer,
        issued_at=row.issued_at,
        expires_at=row.expires_at,
        approval_status=row.approval_status.value,
        reject_reason=row.reject_reason,
        file_url=await storage.presign_get(row.file_key),
    )


async def _get_owned(
    session: AsyncSession, company_id: uuid.UUID, evidence_id: uuid.UUID
) -> Evidence:
    row = await session.get(Evidence, evidence_id)
    if row is None or row.company_id != company_id:
        raise AppError("evidence_not_found", "Evidence not found", 404)
    return row


async def list_evidence(
    session: AsyncSession, user: CurrentUser, storage: Storage
) -> list[EvidenceOut]:
    company_id = await _exporter_company_id(session, user)
    rows = await session.scalars(
        select(Evidence).where(Evidence.company_id == company_id).order_by(Evidence.created_at)
    )
    return [await to_out(session, storage, r) for r in rows]


async def get_evidence(
    session: AsyncSession, user: CurrentUser, storage: Storage, evidence_id: uuid.UUID
) -> EvidenceOut:
    company_id = await _exporter_company_id(session, user)
    return await to_out(session, storage, await _get_owned(session, company_id, evidence_id))


async def create_evidence(
    session: AsyncSession, user: CurrentUser, storage: Storage, data: EvidenceIn
) -> EvidenceOut:
    company_id = await _exporter_company_id(session, user)
    type_row = await _usable_type(session, data.type_code)
    _check_file_key(company_id, data.file_key)
    expires_at = evidence_expiry(data.issued_at, type_row.validity_months, data.expires_at)
    _check_dates(data.issued_at, expires_at)
    row = Evidence(
        company_id=company_id,
        type_code=data.type_code,
        file_key=data.file_key,
        certificate_number=data.certificate_number,
        issuer=data.issuer,
        issued_at=data.issued_at,
        expires_at=expires_at,
        approval_status=ApprovalStatus.pending,
    )
    session.add(row)
    await session.flush()
    await record(
        session,
        actor_id=user.id,
        action_type="evidence.create",
        entity_type=ENTITY,
        entity_id=str(row.id),
        before=None,
        after=snapshot(row),
    )
    await after_change(session, company_id)
    await session.refresh(row)
    return await to_out(session, storage, row)


async def update_evidence(
    session: AsyncSession,
    user: CurrentUser,
    storage: Storage,
    evidence_id: uuid.UUID,
    patch: EvidencePatch,
) -> EvidenceOut:
    company_id = await _exporter_company_id(session, user)
    row = await _get_owned(session, company_id, evidence_id)
    before = snapshot(row)
    fields = patch.model_fields_set
    for required in ("type_code", "file_key", "issued_at"):
        if required in fields and getattr(patch, required) is None:
            raise AppError("invalid_patch", f"{required} cannot be null", 422)
    type_code = patch.type_code if "type_code" in fields and patch.type_code else row.type_code
    type_row = await _usable_type(session, type_code)
    file_key = patch.file_key if "file_key" in fields and patch.file_key else row.file_key
    _check_file_key(company_id, file_key)
    issued_at = patch.issued_at if "issued_at" in fields and patch.issued_at else row.issued_at
    supplied = patch.expires_at if "expires_at" in fields else row.expires_at
    expires_at = evidence_expiry(issued_at, type_row.validity_months, supplied)
    _check_dates(issued_at, expires_at)

    row.type_code, row.file_key, row.issued_at, row.expires_at = (
        type_code,
        file_key,
        issued_at,
        expires_at,
    )
    if "certificate_number" in fields:
        row.certificate_number = patch.certificate_number
    if "issuer" in fields:
        row.issuer = patch.issuer
    row.approval_status = ApprovalStatus.pending  # sửa xong phải duyệt lại
    row.reviewed_by = None
    row.reviewed_at = None
    row.reject_reason = None
    await session.flush()
    await session.refresh(row)
    await record(
        session,
        actor_id=user.id,
        action_type="evidence.update",
        entity_type=ENTITY,
        entity_id=str(row.id),
        before=before,
        after=snapshot(row),
    )
    await after_change(session, company_id)
    await session.refresh(row)
    return await to_out(session, storage, row)


async def delete_evidence(session: AsyncSession, user: CurrentUser, evidence_id: uuid.UUID) -> None:
    company_id = await _exporter_company_id(session, user)
    row = await _get_owned(session, company_id, evidence_id)
    before = snapshot(row)
    await session.delete(row)
    await record(
        session,
        actor_id=user.id,
        action_type="evidence.delete",
        entity_type=ENTITY,
        entity_id=str(evidence_id),
        before=before,
        after=None,
    )
    await after_change(session, company_id)


# ── Danh sách kiểm và mức EVFTA-verified ────────────────────────────────────
async def _facts(session: AsyncSession, company_id: uuid.UUID) -> list[EvidenceFact]:
    rows = await session.scalars(select(Evidence).where(Evidence.company_id == company_id))
    return [EvidenceFact(r.type_code, r.approval_status.value, r.expires_at) for r in rows]


async def _categories(session: AsyncSession, company_id: uuid.UUID) -> set[str]:
    categories: set[str] = set()
    for code in await product_service.list_active_hs_codes(session, company_id):
        hs = await catalog.get_hs_code(session, code)
        if hs is not None and hs.category:
            categories.add(hs.category)
    return categories


async def _rules(
    session: AsyncSession, categories: set[str]
) -> dict[str, tuple[EvidenceType, bool, str | None]]:
    """Loại bằng chứng áp dụng cho các nhóm hàng: code → (loại, bắt buộc?, lời nhắc).

    Chỉ dùng luật và loại ĐÃ DUYỆT. Một loại bắt buộc ở nhóm nào thì bắt buộc."""
    if not categories:
        return {}
    result = await session.execute(
        select(RequiredEvidenceRule, EvidenceType)
        .join(EvidenceType, EvidenceType.code == RequiredEvidenceRule.evidence_type_code)
        .where(
            RequiredEvidenceRule.category.in_(categories),
            RequiredEvidenceRule.reviewed_by.is_not(None),
            EvidenceType.reviewed_by.is_not(None),
            EvidenceType.is_active.is_(True),
        )
        .order_by(RequiredEvidenceRule.category, EvidenceType.code)
    )
    merged: dict[str, tuple[EvidenceType, bool, str | None]] = {}
    for rule, type_row in result.all():
        previous = merged.get(type_row.code)
        required = rule.is_required or (previous is not None and previous[1])
        note = rule.note or (previous[2] if previous else None)
        merged[type_row.code] = (type_row, required, note)
    return merged


async def checklist(session: AsyncSession, user: CurrentUser) -> list[ChecklistItem]:
    company_id = await _exporter_company_id(session, user)
    rules = await _rules(session, await _categories(session, company_id))
    facts = await _facts(session, company_id)
    today = _today()
    items = [
        ChecklistItem(
            type_code=code,
            name_vi=type_row.name_vi,
            name_en=type_row.name_en,
            required=required,
            note=note,
            state=checklist_state(code, facts, today),
        )
        for code, (type_row, required, note) in rules.items()
    ]
    return sorted(items, key=lambda i: (not i.required, i.type_code))


async def sync_level(
    session: AsyncSession, company_id: uuid.UUID, today: dt.date | None = None, commit: bool = True
) -> str | None:
    """Đưa mức xác minh khớp bằng chứng: đủ bằng chứng bắt buộc còn hạn → evfta_verified, ngược lại
    basic. Chỉ áp cho công ty đã verified. Đi qua decide() (level_up/level_down, hệ thống).

    Trả 'level_up' / 'level_down' nếu có đổi, None nếu không.
    """
    state = await companies.get_verification_state(session, company_id)
    if state.status != "verified":
        return None
    rules = await _rules(session, await _categories(session, company_id))
    required = {code for code, (_, is_required, _) in rules.items() if is_required}
    target = is_evfta_verified(
        state.status, await _facts(session, company_id), required, today or _today()
    )
    if target and state.level == verification.BASIC:
        decision = Decision.level_up
    elif not target and state.level == verification.EVFTA_VERIFIED:
        decision = Decision.level_down
    else:
        return None
    await verification.decide(
        session, company_id=company_id, decision=decision, reviewer=None, commit=commit
    )
    return decision.value


async def count_submitted_valid(
    session: AsyncSession, company_id: uuid.UUID, today: dt.date | None = None
) -> int:
    """Bằng chứng ĐÃ NỘP và còn hạn (chưa cần duyệt, không tính bị từ chối)."""
    today = today or _today()
    rows = await session.scalars(
        select(Evidence).where(
            Evidence.company_id == company_id,
            Evidence.approval_status != ApprovalStatus.rejected,
        )
    )
    return sum(1 for r in rows if r.expires_at is None or today < r.expires_at)


companies.register_evidence_counter(count_submitted_valid)


async def after_change(session: AsyncSession, company_id: uuid.UUID) -> None:
    """Sau khi bằng chứng đổi: đồng bộ mức xác minh, tính lại điểm hoàn thiện, commit một lần."""
    await session.flush()
    await sync_level(session, company_id, commit=False)
    await companies.refresh_completeness(session, company_id)
    await session.commit()


async def daily_refresh(session: AsyncSession, now: dt.datetime) -> int:
    """Job hằng ngày: bằng chứng hết hạn không phát sự kiện nào, nên quét lại mọi exporter — hạ mức
    EVFTA-verified nếu thiếu bằng chứng còn hạn và tính lại điểm hoàn thiện. Trả số mức bị đổi."""
    changed = 0
    for company_id in await companies.list_exporter_ids(session):
        if await sync_level(session, company_id, now.date(), commit=False) is not None:
            changed += 1
        await companies.refresh_completeness(session, company_id)
    await session.commit()
    return changed
