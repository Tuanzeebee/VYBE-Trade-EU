"""Bằng chứng của exporter, danh sách kiểm theo nhóm hàng và đồng bộ mức EVFTA-verified (C6).

Loại bằng chứng và quy tắc bắt buộc là DỮ LIỆU do luật TM duyệt; dòng chưa có reviewed_by không
được dùng. Không tính năng nào ở đây đổi trạng thái xác minh (chỉ decide() làm việc đó).
"""

import datetime as dt
import hashlib
import logging
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from botocore.exceptions import ClientError
from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.errors import AppError
from app.core.storage import Storage
from app.modules.auth.schemas import CurrentUser
from app.modules.catalog import service as catalog
from app.modules.companies import product_service
from app.modules.companies import service as companies
from app.modules.verification import blocklist
from app.modules.verification import service as verification
from app.modules.verification.identity import CheckFact, ownership_proven
from app.modules.verification.logic import (
    EvidenceFact,
    checklist_state,
    evidence_expiry,
    is_evfta_verified,
)
from app.modules.verification.models import (
    ApprovalStatus,
    CheckType,
    Decision,
    Evidence,
    EvidenceCheck,
    EvidenceType,
    RequiredEvidenceRule,
)
from app.modules.verification.schemas import (
    ChecklistItem,
    EvidenceIn,
    EvidenceOut,
    EvidencePatch,
    PublicCertificateOut,
)

ENTITY = "evidence"
OTHER_TYPE = "other"  # loại "Khác" (U4): seller tự ghi tên giấy tờ


log = logging.getLogger(__name__)


def _today() -> dt.date:
    return dt.datetime.now(dt.UTC).date()


def snapshot(row: Evidence) -> dict[str, Any]:
    return {
        "type_code": row.type_code,
        "file_key": row.file_key,
        "certificate_number": row.certificate_number,
        "issuer": row.issuer,
        "issued_at": row.issued_at.isoformat() if row.issued_at else None,
        "expires_at": row.expires_at.isoformat() if row.expires_at else None,
        "custom_type_name": row.custom_type_name,
        "approval_status": row.approval_status.value,
    }


# ── Job AI đọc chứng nhận (U24; test thay bằng bản ghi trong bộ nhớ) ─────────────
ExtractionEnqueuer = Callable[[uuid.UUID], Awaitable[None]]


async def _defer_extraction(evidence_id: uuid.UUID) -> None:
    try:
        from app.jobs.extract_evidence import extract_evidence

        await extract_evidence.defer_async(evidence_id=str(evidence_id))
    except Exception:
        log.exception("Không xếp được job đọc chứng nhận %s", evidence_id)


_enqueue_extraction: ExtractionEnqueuer = _defer_extraction


def set_extraction_enqueuer(enqueuer: ExtractionEnqueuer) -> ExtractionEnqueuer:
    global _enqueue_extraction
    previous, _enqueue_extraction = _enqueue_extraction, enqueuer
    return previous


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


async def _file_hash(session: AsyncSession, storage: Storage, key: str) -> str:
    """SHA-256 của file đã tải lên (I11): file phải có thật và không nằm trong danh sách chặn."""
    try:
        data = await storage.get(key)
    except ClientError:
        raise AppError("file_not_uploaded", "File has not been uploaded", 422) from None
    digest = hashlib.sha256(data).hexdigest()
    if await blocklist.is_blocked(session, {"file_sha256": digest}):
        raise AppError("identifier_blocked", "This submission cannot be accepted", 403)
    return digest


async def owned_upload_key(session: AsyncSession, user: CurrentUser, key: str) -> uuid.UUID:
    """Key file phải do chính công ty của exporter này tải lên (xem trước file). Trả company_id."""
    company_id = await _exporter_company_id(session, user)
    _check_file_key(company_id, key)
    return company_id


def check_dates(issued_at: dt.date | None, expires_at: dt.date | None) -> None:
    if issued_at is not None and issued_at > _today():
        raise AppError("invalid_dates", "issued_at cannot be in the future", 422)
    if issued_at is not None and expires_at is not None and expires_at <= issued_at:
        raise AppError("invalid_dates", "expires_at must be after issued_at", 422)


def _custom_name(type_code: str, name: str | None) -> str | None:
    """Loại "Khác" bắt buộc ghi tên giấy tờ; loại khác không lưu tên tự ghi."""
    name = (name or "").strip() or None
    if type_code == OTHER_TYPE and name is None:
        raise AppError("custom_type_name_required", "Name the document for type 'other'", 422)
    return name if type_code == OTHER_TYPE else None


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
        custom_type_name=row.custom_type_name,
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


async def list_available_types(session: AsyncSession) -> list[EvidenceType]:
    rows = await session.scalars(
        select(EvidenceType)
        .where(EvidenceType.reviewed_by.is_not(None), EvidenceType.is_active.is_(True))
        .order_by(EvidenceType.group, EvidenceType.code)
    )
    return list(rows)


async def list_evidence(
    session: AsyncSession, user: CurrentUser, storage: Storage
) -> list[EvidenceOut]:
    company_id = await _exporter_company_id(session, user)
    rows = await session.scalars(
        select(Evidence).where(Evidence.company_id == company_id).order_by(Evidence.created_at)
    )
    return [await to_out(session, storage, r) for r in rows]


async def count_approved_evidence(session: AsyncSession, company_id: uuid.UUID) -> int:
    """Số bằng chứng/chứng nhận đã được admin duyệt của công ty (N5: trục chứng nhận)."""
    return int(
        await session.scalar(
            select(func.count())
            .select_from(Evidence)
            .where(Evidence.company_id == company_id, Evidence.approval_status == "approved")
        )
        or 0
    )


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
    check_dates(data.issued_at, expires_at)
    row = Evidence(
        company_id=company_id,
        type_code=data.type_code,
        file_key=data.file_key,
        file_sha256=await _file_hash(session, storage, data.file_key),
        certificate_number=data.certificate_number,
        issuer=data.issuer,
        issued_at=data.issued_at,
        expires_at=expires_at,
        custom_type_name=_custom_name(data.type_code, data.custom_type_name),
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
    await _enqueue_extraction(row.id)
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
    for required in ("type_code", "file_key"):
        if required in fields and getattr(patch, required) is None:
            raise AppError("invalid_patch", f"{required} cannot be null", 422)
    type_code = patch.type_code if "type_code" in fields and patch.type_code else row.type_code
    type_row = await _usable_type(session, type_code)
    file_key = patch.file_key if "file_key" in fields and patch.file_key else row.file_key
    _check_file_key(company_id, file_key)
    issued_at = patch.issued_at if "issued_at" in fields else row.issued_at
    supplied = patch.expires_at if "expires_at" in fields else row.expires_at
    expires_at = evidence_expiry(issued_at, type_row.validity_months, supplied)
    check_dates(issued_at, expires_at)
    custom = patch.custom_type_name if "custom_type_name" in fields else row.custom_type_name
    row.custom_type_name = _custom_name(type_code, custom)
    if file_key != row.file_key:
        row.file_sha256 = await _file_hash(session, storage, file_key)

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
    file_changed = file_key != before.get("file_key")
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
    if file_changed:
        await _enqueue_extraction(row.id)
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


async def evidence_states(
    session: AsyncSession, company_id: uuid.UUID, today: dt.date | None = None
) -> dict[str, str]:
    """Trạng thái danh sách kiểm của từng loại bằng chứng công ty đã nộp (U20 cấp xác minh)."""
    facts = await _facts(session, company_id)
    moment = today or _today()
    return {code: checklist_state(code, facts, moment) for code in {f.type_code for f in facts}}


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


async def ownership_proven_for(session: AsyncSession, company_id: uuid.UUID) -> bool:
    """Đã chứng minh quyền sở hữu (I11): lần gọi lại số chính thức mới nhất khớp."""
    rows = await session.execute(
        select(EvidenceCheck.check_type, EvidenceCheck.result, EvidenceCheck.checked_at).where(
            EvidenceCheck.company_id == company_id,
            EvidenceCheck.check_type == CheckType.phone_callback,
        )
    )
    return ownership_proven(CheckFact(t.value, r.value, at) for t, r, at in rows)


async def sync_level(
    session: AsyncSession, company_id: uuid.UUID, today: dt.date | None = None, commit: bool = True
) -> str | None:
    """Đưa mức xác minh khớp bằng chứng: đủ bằng chứng bắt buộc còn hạn → evfta_verified, ngược lại
    basic (cần thêm quyền sở hữu đã chứng minh — I11). Chỉ áp cho công ty đã verified.
    Đi qua decide() (level_up/level_down, hệ thống).

    Trả 'level_up' / 'level_down' nếu có đổi, None nếu không.
    """
    state = await companies.get_verification_state(session, company_id)
    if state.status != "verified":
        return None
    rules = await _rules(session, await _categories(session, company_id))
    required = {code for code, (_, is_required, _) in rules.items() if is_required}
    target = is_evfta_verified(
        state.status,
        await _facts(session, company_id),
        required,
        today or _today(),
        ownership_proven=await ownership_proven_for(session, company_id),
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


# Nhóm bằng chứng không bao giờ công khai: EUR.1 đã cấp chứa giá (backlog C6: che giá).
NON_PUBLIC_GROUPS = ("origin",)


def _public_types() -> Select[str]:
    return select(EvidenceType.code).where(
        EvidenceType.reviewed_by.is_not(None),
        EvidenceType.is_active.is_(True),
        EvidenceType.group.not_in(NON_PUBLIC_GROUPS),
    )


def _like_pattern(token: str) -> str:
    escaped = token.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def certified_company_ids(
    today: dt.date, *, type_code: str | None = None, token: str | None = None
) -> Select[uuid.UUID]:
    """Truy vấn con: công ty có chứng nhận ĐÃ DUYỆT, CÒN HẠN, thuộc loại luật TM đã duyệt và được
    phép công khai. Lọc theo mã loại hoặc tìm theo tên loại (vi không dấu / en)."""
    query = (
        select(Evidence.company_id)
        .join(EvidenceType, EvidenceType.code == Evidence.type_code)
        .where(
            Evidence.approval_status == ApprovalStatus.approved,
            or_(Evidence.expires_at.is_(None), Evidence.expires_at > today),
            Evidence.type_code.in_(_public_types()),
        )
    )
    if type_code is not None:
        query = query.where(Evidence.type_code == type_code)
    if token:
        pattern = _like_pattern(token)
        query = query.where(
            or_(
                func.immutable_unaccent(func.lower(EvidenceType.name_vi)).like(
                    func.immutable_unaccent(func.lower(pattern)), escape="\\"
                ),
                func.lower(EvidenceType.name_en).like(func.lower(pattern), escape="\\"),
            )
        )
    return query


async def public_certificate_types(session: AsyncSession) -> list[PublicCertificateOut]:
    rows = (
        await session.scalars(
            select(EvidenceType)
            .where(EvidenceType.code.in_(_public_types()))
            .order_by(EvidenceType.name_en)
        )
    ).all()
    return [PublicCertificateOut(code=r.code, name_vi=r.name_vi, name_en=r.name_en) for r in rows]


async def public_certificates_for(
    session: AsyncSession, company_id: uuid.UUID, today: dt.date
) -> list[dict[str, Any]]:
    """U10: chứng nhận ĐÃ DUYỆT, CÒN HẠN, loại được phép công khai của một công ty — cho mục
    "Dữ liệu đã kiểm" trên hồ sơ công khai. Không trả file, số chứng nhận hay người duyệt."""
    rows = await session.execute(
        select(Evidence, EvidenceType)
        .join(EvidenceType, EvidenceType.code == Evidence.type_code)
        .where(
            Evidence.company_id == company_id,
            Evidence.approval_status == ApprovalStatus.approved,
            or_(Evidence.expires_at.is_(None), Evidence.expires_at > today),
            Evidence.type_code.in_(_public_types()),
        )
        .order_by(EvidenceType.name_en, Evidence.id)
    )
    return [
        {
            "type_code": evidence.type_code,
            "name_vi": evidence.custom_type_name or kind.name_vi,
            "name_en": evidence.custom_type_name or kind.name_en,
            "issuer": evidence.issuer,
            "expires_at": evidence.expires_at,
            "reviewed_at": evidence.reviewed_at,
        }
        for evidence, kind in rows
    ]
