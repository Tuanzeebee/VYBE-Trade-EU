"""Chống mạo danh và gian lận danh tính (I11).

Tín hiệu tính khi đọc từ dữ liệu công ty, kết quả kiểm (evidence_checks), hash file bằng chứng và
danh sách chặn — chỉ để xếp ưu tiên. Không hàm nào ở đây đổi trạng thái xác minh: mức
evfta_verified chỉ đổi qua evidence_service.sync_level → decide() (AGENTS.md §6.9).
"""

import uuid
from collections import defaultdict
from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.errors import AppError
from app.core.spreadsheet import Column, build_workbook
from app.modules.auth import service as auth
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import service as companies
from app.modules.verification import blocklist, evidence_service
from app.modules.verification.identity import (
    FREE_EMAIL_DOMAINS,
    CheckFact,
    CompanyIdentity,
    Identifier,
    RegistryFacts,
    Signal,
    clusters,
    hash_name,
    identifiers,
    normalize,
    ownership_proven,
    signals,
)
from app.modules.verification.identity_schemas import (
    BlocklistIn,
    BlocklistOut,
    ClusterCompany,
    ClusterOut,
    CompanyIdentityOut,
    IdentityCheckIn,
    IdentityCheckOut,
)
from app.modules.verification.models import (
    BlocklistIdentifier,
    CheckResult,
    CheckSubject,
    CheckType,
    Evidence,
    EvidenceCheck,
    IdentifierType,
)
from app.modules.verification.schemas import SignalOut

# Đăng ký, tạo/sửa hồ sơ (auth, companies) kiểm danh sách chặn qua hook — không import ngược.
auth.register_identifier_guard(blocklist.is_blocked)


# ── Dữ liệu đầu vào cho hàm thuần ─────────────────────────────────────────────────────────
def _registry(facts: dict[str, object] | None) -> RegistryFacts | None:
    if not facts:
        return None
    founded = facts.get("founded_year")
    rep = facts.get("legal_representative_hash")
    return RegistryFacts(
        founded_year=founded if isinstance(founded, int) else None,
        tax_status=str(facts.get("tax_status") or "unknown"),
        name_changed_recently=bool(facts.get("name_changed_recently")),
        representative_changed_recently=bool(facts.get("representative_changed_recently")),
        legal_representative_hash=rep if isinstance(rep, str) else None,
    )


async def _latest_registry(session: AsyncSession) -> dict[uuid.UUID, RegistryFacts]:
    """Kết quả tra sổ đăng ký mới nhất của mỗi công ty (lần sau đè lần trước)."""
    rows = await session.scalars(
        select(EvidenceCheck)
        .where(EvidenceCheck.check_type == CheckType.registry_lookup)
        .order_by(EvidenceCheck.checked_at)
    )
    latest: dict[uuid.UUID, RegistryFacts] = {}
    for row in rows:
        if (facts := _registry(row.facts)) is not None:
            latest[row.company_id] = facts
    return latest


async def _identities(
    session: AsyncSession,
) -> tuple[list[CompanyIdentity], dict[uuid.UUID, str], dict[uuid.UUID, RegistryFacts]]:
    facts = await companies.list_identity_facts(session)
    logins = await auth.get_login_identities(session, [f.owner_user_id for f in facts])
    hashes: defaultdict[uuid.UUID, list[str]] = defaultdict(list)
    for company_id, digest in await session.execute(
        select(Evidence.company_id, Evidence.file_sha256).where(Evidence.file_sha256.is_not(None))
    ):
        if digest:
            hashes[company_id].append(digest)
    registry = await _latest_registry(session)
    identities = [
        CompanyIdentity(
            company_id=f.id,
            tax_id=f.tax_id,
            website=f.website,
            contact_email=f.contact_email,
            login_email=logins.get(f.owner_user_id, (None, None))[0],
            phone=logins.get(f.owner_user_id, (None, None))[1],
            founded_year=f.founded_year,
            file_hashes=tuple(hashes[f.id]),
            representative_hash=(
                registry[f.id].legal_representative_hash if f.id in registry else None
            ),
        )
        for f in facts
    ]
    return identities, {f.id: f.legal_name for f in facts}, registry


async def _blocked(session: AsyncSession) -> set[Identifier]:
    # ponytail: nạp cả danh sách chặn (nhỏ, do admin nhập tay); lớn thì lọc theo định danh.
    rows = await session.execute(
        select(BlocklistIdentifier.identifier_type, BlocklistIdentifier.value)
    )
    return {Identifier(kind.value, value) for kind, value in rows}


async def _all_signals(
    session: AsyncSession,
) -> tuple[dict[uuid.UUID, list[Signal]], list[ClusterOut]]:
    identities, names, registry = await _identities(session)
    found = clusters(identities)
    shared: defaultdict[uuid.UUID, list[Identifier]] = defaultdict(list)
    for cluster in found:
        for company_id in cluster.company_ids:
            shared[company_id].append(cluster.identifier)
    blocked = await _blocked(session)
    by_company = {
        c.company_id: signals(
            company=c,
            registry=registry.get(c.company_id),
            shared=shared[c.company_id],
            blocked=bool(identifiers(c) & blocked),
        )
        for c in identities
    }
    cluster_out = [
        ClusterOut(
            identifier_type=c.identifier.type,
            value=c.identifier.value,
            companies=sorted(
                (ClusterCompany(id=i, legal_name=names[i]) for i in c.company_ids),
                key=lambda x: x.legal_name,
            ),
        )
        for c in found
    ]
    return by_company, cluster_out


def _signal_out(items: Iterable[Signal]) -> list[SignalOut]:
    return [SignalOut.model_validate({"code": s.code, "severity": s.severity}) for s in items]


# ── API công khai của module (hàng đợi, router) ─────────────────────────────────────────
async def signals_for(
    session: AsyncSession, company_ids: Iterable[uuid.UUID]
) -> dict[uuid.UUID, list[SignalOut]]:
    """Tín hiệu của các công ty (gom cụm cần toàn bộ công ty nên tính chung rồi lọc)."""
    by_company, _ = await _all_signals(session)
    return {cid: _signal_out(by_company.get(cid, [])) for cid in company_ids}


async def list_clusters(session: AsyncSession) -> list[ClusterOut]:
    _, cluster_out = await _all_signals(session)
    return cluster_out


_TYPE_LABEL = {
    "tax_id": "Mã số thuế",
    "domain": "Tên miền",
    "phone": "Số điện thoại",
    "file_sha256": "Mã băm file",
    "representative": "Người đại diện (mã băm)",
}
CLUSTER_COLUMNS = (
    Column("dinh_danh", help="Loại định danh dùng chung"),
    Column("gia_tri", help="Giá trị đã chuẩn hoá; người đại diện chỉ có mã băm, không có tên"),
    Column("doanh_nghiep", help="Tên pháp nhân"),
    Column("company_id", help="Mã doanh nghiệp trên evfta.eu"),
)


async def export_clusters(session: AsyncSession) -> bytes:
    """File Excel chỉ để đọc: mỗi doanh nghiệp một dòng, định danh + giá trị gộp ô theo cụm."""
    rows = [
        {
            "dinh_danh": _TYPE_LABEL.get(c.identifier_type, c.identifier_type),
            "gia_tri": c.value,
            "doanh_nghiep": x.legal_name,
            "company_id": str(x.id),
        }
        for c in await list_clusters(session)
        for x in c.companies
    ]
    return build_workbook(CLUSTER_COLUMNS, rows, merge=("dinh_danh", "gia_tri"))


async def _checks(session: AsyncSession, company_id: uuid.UUID) -> list[EvidenceCheck]:
    rows = await session.scalars(
        select(EvidenceCheck)
        .where(EvidenceCheck.company_id == company_id, EvidenceCheck.evidence_id.is_(None))
        .order_by(EvidenceCheck.checked_at.desc())
    )
    return list(rows)


async def _ensure_company(session: AsyncSession, company_id: uuid.UUID) -> None:
    if not await companies.get_company_summaries(session, [company_id]):
        raise AppError("company_not_found", "Company not found", 404)


async def company_identity(session: AsyncSession, company_id: uuid.UUID) -> CompanyIdentityOut:
    await _ensure_company(session, company_id)
    by_company, cluster_out = await _all_signals(session)
    checks = await _checks(session, company_id)
    return CompanyIdentityOut(
        company_id=company_id,
        ownership_proven=ownership_proven(
            CheckFact(c.check_type.value, c.result.value, c.checked_at) for c in checks
        ),
        signals=_signal_out(by_company.get(company_id, [])),
        checks=[IdentityCheckOut.model_validate(c) for c in checks],
        clusters=[c for c in cluster_out if any(x.id == company_id for x in c.companies)],
    )


async def record_check(
    session: AsyncSession, admin: CurrentUser, company_id: uuid.UUID, data: IdentityCheckIn
) -> IdentityCheckOut:
    """Admin ghi kết quả kiểm danh tính (tra sổ đăng ký, gọi lại số chính thức, email theo domain).
    Sau đó đồng bộ mức evfta_verified qua sync_level → decide() (quyền sở hữu là điều kiện)."""
    if admin.role != "admin":
        raise AppError("forbidden", "Not allowed", 403)
    await _ensure_company(session, company_id)
    check_type = CheckType(data.check_type)
    facts = None
    if data.registry is not None:
        reg = data.registry
        facts = {
            "founded_year": reg.founded_year,
            "tax_status": reg.tax_status,
            "name_changed_recently": reg.name_changed_recently,
            "representative_changed_recently": reg.representative_changed_recently,
            "legal_representative_hash": (
                hash_name(reg.legal_representative) if reg.legal_representative else None
            ),
        }
    row = EvidenceCheck(
        company_id=company_id,
        subject=(
            CheckSubject.legal_entity
            if check_type is CheckType.registry_lookup
            else CheckSubject.ownership
        ),
        check_type=check_type,
        result=CheckResult(data.result),
        facts=facts,
        note=(data.note or "").strip() or None,
        checked_by=admin.id,
    )
    session.add(row)
    await session.flush()
    await record(
        session,
        actor_id=admin.id,
        action_type="identity_check.create",
        entity_type="company",
        entity_id=str(company_id),
        before=None,
        after={"check_type": data.check_type, "result": data.result, "facts": facts},
    )
    await session.refresh(row)
    out = IdentityCheckOut.model_validate(row)
    await evidence_service.sync_level(session, company_id)  # commit + phát event nếu mức đổi
    await session.commit()
    return out


# ── Danh sách chặn ─────────────────────────────────────────────────────────────────────────
async def list_blocklist(session: AsyncSession) -> list[BlocklistOut]:
    rows = await session.scalars(
        select(BlocklistIdentifier).order_by(BlocklistIdentifier.created_at.desc())
    )
    return [BlocklistOut.model_validate(r) for r in rows]


async def add_blocklist(
    session: AsyncSession, admin: CurrentUser, data: BlocklistIn
) -> BlocklistOut:
    if admin.role != "admin":
        raise AppError("forbidden", "Not allowed", 403)
    value = normalize(data.identifier_type, data.value)
    if value is None:
        raise AppError("invalid_identifier", "Identifier value is not valid", 422)
    if data.identifier_type == "domain" and value in FREE_EMAIL_DOMAINS:
        raise AppError("invalid_identifier", "Free email domains cannot be blocked", 422)
    kind = IdentifierType(data.identifier_type)
    if await session.scalar(
        select(BlocklistIdentifier.id).where(
            BlocklistIdentifier.identifier_type == kind, BlocklistIdentifier.value == value
        )
    ):
        raise AppError("already_blocked", "Identifier is already blocked", 409)
    row = BlocklistIdentifier(
        identifier_type=kind, value=value, reason=data.reason.strip(), added_by=admin.id
    )
    session.add(row)
    await session.flush()
    after = {"identifier_type": data.identifier_type, "value": value, "reason": row.reason}
    await record(
        session,
        actor_id=admin.id,
        action_type="blocklist.add",
        entity_type="blocklist_identifier",
        entity_id=str(row.id),
        before=None,
        after=after,
    )
    await session.commit()
    await session.refresh(row)
    return BlocklistOut.model_validate(row)


async def remove_blocklist(session: AsyncSession, admin: CurrentUser, entry_id: uuid.UUID) -> None:
    if admin.role != "admin":
        raise AppError("forbidden", "Not allowed", 403)
    row = await session.get(BlocklistIdentifier, entry_id)
    if row is None:
        raise AppError("not_found", "Blocklist entry not found", 404)
    before = {
        "identifier_type": row.identifier_type.value,
        "value": row.value,
        "reason": row.reason,
    }
    await session.delete(row)
    await record(
        session,
        actor_id=admin.id,
        action_type="blocklist.remove",
        entity_type="blocklist_identifier",
        entity_id=str(entry_id),
        before=before,
        after=None,
    )
    await session.commit()
