"""Huy hiệu "EVFTA-verified" theo nhóm hàng và checklist bằng chứng cấp công ty
(SPEC_compliance_data_20_codes §5.4, §7).

Công ty có huy hiệu cho nhóm hàng X (hs_codes.category) khi: verification_status = verified VÀ có
bằng chứng EUR1_ISSUED_12M cho X, đã duyệt, còn hạn VÀ mọi bằng chứng scope = COMPANY,
blocks = IMPORT của các mã X công ty đang bán đều đã duyệt, còn hạn. Hết hạn → job hằng ngày hạ mức
và ghi audit_logs.

Song song với mức `evfta_verified` của verification (theo required_evidence_rules), không thay thế.
Bằng chứng công ty nộp nằm ở verification; module này chỉ đọc qua verification.evidence_service.
Văn bản hiển thị KHÔNG được nói "hàng đạt xuất xứ EVFTA": EUR.1 chỉ chứng minh cho lô đã cấp.
"""

import datetime as dt
import uuid
from dataclasses import dataclass
from typing import Any, Literal

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.errors import AppError
from app.modules.auth.schemas import CurrentUser
from app.modules.catalog import service as catalog
from app.modules.companies import product_service
from app.modules.companies import service as companies
from app.modules.compliance import disclaimer
from app.modules.compliance.models import (
    CompanyBadge,
    ComplianceEvidenceRequirement,
    ComplianceEvidenceType,
    EvidenceScope,
    EvidenceTypeMapping,
)
from app.modules.compliance.schemas import (
    BadgeOut,
    CompanyChecklistItemOut,
    CompanyChecklistOut,
)
from app.modules.verification import evidence_service

BADGE_CODE = "EUR1_ISSUED_12M"
BADGE_TEXT_VI = "Đã được cấp C/O EUR.1 cho nhóm hàng này trong 12 tháng gần nhất"
BADGE_TEXT_EN = "Issued an EUR.1 movement certificate for this product group in the last 12 months"
_BLOCK_ORDER = {"IMPORT": 0, "TARIFF_PREFERENCE": 1, "NONE": 2}

ItemState = Literal["approved", "pending", "expired", "rejected", "missing", "not_mapped"]


@dataclass(frozen=True)
class CompanyRequirement:
    code: str
    name_vi: str
    name_en: str | None
    blocks: str
    legal_status: str
    mapped_code: str | None  # loại bằng chứng tương ứng ở verification
    requirement_reviewed: bool
    mapping_reviewed: bool


@dataclass(frozen=True)
class BadgeDecision:
    granted: bool
    reason: str | None  # COMPANY_NOT_VERIFIED | NO_BADGE_BASIS | MISSING_EVIDENCE | None
    missing: tuple[str, ...]
    unreviewed: tuple[str, ...]


def item_state(req: CompanyRequirement, states: dict[str, str]) -> ItemState:
    if req.mapped_code is None:
        return "not_mapped"
    return states.get(req.mapped_code, "missing")  # type: ignore[return-value]


def _merge(requirements: list[CompanyRequirement]) -> dict[str, CompanyRequirement]:
    """Một loại bằng chứng có thể có ở nhiều mã: gộp, dòng nào chưa duyệt thì cả nhóm chưa duyệt."""
    merged: dict[str, CompanyRequirement] = {}
    for r in requirements:
        prev = merged.get(r.code)
        if prev is None:
            merged[r.code] = r
        else:
            merged[r.code] = CompanyRequirement(
                r.code,
                r.name_vi,
                r.name_en,
                min(prev.blocks, r.blocks, key=lambda b: _BLOCK_ORDER.get(b, 9)),
                r.legal_status,
                r.mapped_code,
                prev.requirement_reviewed and r.requirement_reviewed,
                prev.mapping_reviewed and r.mapping_reviewed,
            )
    return merged


def badge_decision(
    *, verified: bool, requirements: list[CompanyRequirement], states: dict[str, str]
) -> BadgeDecision:
    """Hàm thuần (AGENTS.md §5.3). `states`: loại bằng chứng ở verification → trạng thái danh sách
    kiểm; chỉ 'approved' (đã duyệt và còn hạn) mới tính."""
    merged = _merge(requirements)
    if BADGE_CODE not in merged:
        return BadgeDecision(False, "NO_BADGE_BASIS", (), ())
    needed = [merged[BADGE_CODE]] + [
        r for c, r in merged.items() if c != BADGE_CODE and r.blocks == "IMPORT"
    ]
    missing = tuple(r.code for r in needed if item_state(r, states) != "approved")
    unreviewed: list[str] = []
    if any(not r.requirement_reviewed for r in needed):
        unreviewed.append("evidence_requirement")
    if any(r.mapped_code is not None and not r.mapping_reviewed for r in needed):
        unreviewed.append("evidence_mapping")
    if not verified:
        return BadgeDecision(False, "COMPANY_NOT_VERIFIED", missing, tuple(unreviewed))
    if missing:
        return BadgeDecision(False, "MISSING_EVIDENCE", missing, tuple(unreviewed))
    return BadgeDecision(True, None, (), tuple(unreviewed))


# --- đọc dữ liệu ----------------------------------------------------------------------------------


def _today() -> dt.date:
    return dt.datetime.now(dt.UTC).date()


async def _requirements(
    session: AsyncSession, hs_codes: list[str], on_date: dt.date
) -> list[CompanyRequirement]:
    """Dòng yêu cầu cấp công ty (scope COMPANY) của các mã HS; mã 6 số khớp mọi mã 8 số con."""
    if not hs_codes:
        return []
    match = or_(
        *[
            (ComplianceEvidenceRequirement.hs_code.like(f"{c}%"))
            if len(c) < 8
            else (ComplianceEvidenceRequirement.hs_code == c)
            for c in hs_codes
        ]
    )
    result = await session.execute(
        select(ComplianceEvidenceRequirement, ComplianceEvidenceType, EvidenceTypeMapping)
        .join(
            ComplianceEvidenceType,
            ComplianceEvidenceType.code == ComplianceEvidenceRequirement.evidence_type,
        )
        .outerjoin(
            EvidenceTypeMapping, EvidenceTypeMapping.compliance_code == ComplianceEvidenceType.code
        )
        .where(
            match,
            ComplianceEvidenceType.scope == EvidenceScope.COMPANY,
            ComplianceEvidenceRequirement.valid_from <= on_date,
            or_(
                ComplianceEvidenceRequirement.valid_until.is_(None),
                ComplianceEvidenceRequirement.valid_until > on_date,
            ),
        )
    )
    return [
        CompanyRequirement(
            code=t.code,
            name_vi=t.name_vi,
            name_en=t.name_en,
            blocks=t.blocks.value,
            legal_status=t.legal_status.value,
            mapped_code=None if m is None else m.verification_code,
            requirement_reviewed=r.reviewed_by is not None,
            mapping_reviewed=m is not None and m.reviewed_by is not None,
        )
        for r, t, m in result.all()
    ]


async def _category_codes(session: AsyncSession, company_id: uuid.UUID) -> dict[str, list[str]]:
    """Nhóm hàng (hs_codes.category) → mã HS công ty đang bán."""
    codes = await product_service.list_active_hs_codes(session, company_id)
    categories = await catalog.categories_for_codes(session, codes)
    grouped: dict[str, list[str]] = {}
    for code in codes:
        category = categories.get(code)
        if category:
            grouped.setdefault(category, []).append(code)
    return grouped


async def _decide(
    session: AsyncSession,
    company_id: uuid.UUID,
    hs_codes: list[str],
    today: dt.date,
    states: dict[str, str] | None = None,
) -> BadgeDecision:
    verified = (await companies.get_verification_state(session, company_id)).status == "verified"
    return badge_decision(
        verified=verified,
        requirements=await _requirements(session, hs_codes, today),
        states=states
        if states is not None
        else await evidence_service.evidence_states(session, company_id, today),
    )


# --- checklist ---


async def company_checklist(
    session: AsyncSession,
    user: CurrentUser,
    company_id: uuid.UUID,
    hs: str,
    accept_language: str | None = None,
) -> CompanyChecklistOut:
    """Checklist bằng chứng cấp công ty cho một mã HS + huy hiệu. Chỉ chủ công ty hoặc admin."""
    owner = await companies.get_owner_user_id(session, company_id)
    if owner is None:
        raise AppError("company_not_found", "Company not found", 404)
    if user.role != "admin" and owner != user.id:
        raise AppError("forbidden", "Not allowed for this company", 403)
    code = catalog.normalize_code(hs)
    if code is None:
        raise AppError("invalid_hs_code", "HS code must be 6 to 8 digits", 422)
    today = _today()
    hs_row = await catalog.get_hs_code(session, code)
    category = hs_row.category if hs_row is not None else None
    states = await evidence_service.evidence_states(session, company_id, today)
    requirements = _merge(await _requirements(session, [code], today))
    items = sorted(requirements.values(), key=lambda r: (_BLOCK_ORDER.get(r.blocks, 9), r.code))
    badge: BadgeOut | None = None
    badge_unreviewed: tuple[str, ...] = ()
    if category:
        company_codes = (await _category_codes(session, company_id)).get(category, [])
        decision = await _decide(session, company_id, sorted({code, *company_codes}), today, states)
        badge_unreviewed = decision.unreviewed
        badge = BadgeOut(
            category=category,
            granted=decision.granted,
            text_vi=BADGE_TEXT_VI if decision.granted else None,
            text_en=BADGE_TEXT_EN if decision.granted else None,
            reason=decision.reason,
            missing=list(decision.missing),
        )
    unreviewed = sorted(
        {
            *badge_unreviewed,
            *(["evidence_requirement"] if any(not r.requirement_reviewed for r in items) else []),
            *(
                ["evidence_mapping"]
                if any(r.mapped_code is not None and not r.mapping_reviewed for r in items)
                else []
            ),
        }
    )
    state = disclaimer.UNREVIEWED if unreviewed else disclaimer.REVIEWED
    return CompanyChecklistOut(
        hs_code=code,
        hs_formatted=catalog.format_code(code),
        category=category,
        items=[
            CompanyChecklistItemOut(
                code=r.code,
                name_vi=r.name_vi,
                name_en=r.name_en,
                blocks=r.blocks,
                legal_status=r.legal_status,
                verification_type_code=r.mapped_code,
                state=item_state(r, states),
                review_state="REVIEWED"
                if r.requirement_reviewed and (r.mapped_code is None or r.mapping_reviewed)
                else "UNREVIEWED",
            )
            for r in items
        ],
        badge=badge,
        review_state=state,
        unreviewed_components=unreviewed,
        disclaimer=disclaimer.disclaimer_for(state, accept_language),
    )


# --- job hằng ngày ---


def _snapshot(row: CompanyBadge | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {"is_active": row.is_active, "review_state": row.review_state, "missing": row.missing}


async def refresh_badges(session: AsyncSession, now: dt.datetime) -> int:
    """Tính lại huy hiệu của mọi exporter theo nhóm hàng đang bán (và nhóm đã từng có huy hiệu).
    Hết hạn/thiếu bằng chứng → hạ mức. Mỗi lần cấp/hạ ghi audit_logs. Trả số huy hiệu đổi."""
    changed = 0
    today = now.date()
    for company_id in await companies.list_exporter_ids(session):
        by_category = await _category_codes(session, company_id)
        existing = {
            b.category: b
            for b in await session.scalars(
                select(CompanyBadge).where(CompanyBadge.company_id == company_id)
            )
        }
        states = await evidence_service.evidence_states(session, company_id, today)
        for category in sorted({*by_category, *existing}):
            decision = await _decide(
                session, company_id, by_category.get(category, []), today, states
            )
            row = existing.get(category)
            before = _snapshot(row)
            state = disclaimer.UNREVIEWED if decision.unreviewed else disclaimer.REVIEWED
            if row is None:
                if not decision.granted:
                    continue
                row = CompanyBadge(company_id=company_id, category=category)
                session.add(row)
            was_active = bool(row.is_active)
            row.is_active = decision.granted
            row.review_state = state
            row.unreviewed_components = list(decision.unreviewed)
            row.missing = list(decision.missing)
            if decision.granted and not was_active:
                row.granted_at, row.revoked_at = now, None
            elif not decision.granted and was_active:
                row.revoked_at = now
            if decision.granted != was_active:
                changed += 1
                await record(
                    session,
                    actor_id=None,
                    action_type="badge_granted" if decision.granted else "badge_revoked",
                    entity_type="company_badge",
                    entity_id=f"{company_id}:{category}",
                    before=before,
                    after=_snapshot(row),
                )
    await session.commit()
    return changed
