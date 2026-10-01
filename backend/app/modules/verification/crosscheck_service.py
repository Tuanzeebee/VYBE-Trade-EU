"""Kiểm chéo bằng chứng với nguồn cấp (I8).

- Tổ chức cấp (`certification_bodies`) là dữ liệu cấu hình có người duyệt; dòng chưa duyệt không
  dùng được. Email xác nhận chỉ gửi tới địa chỉ ở bảng này, không lấy từ file chứng nhận.
- Kiểm nguồn ngoài (tra cứu, email xác nhận) bắt buộc có nguồn + ảnh chụp; admin ghi tay.
- So khớp nội bộ chạy bằng quy tắc (matching.py) trên các trường admin trích từ chứng nhận.
Không hàm nào ở đây đổi trạng thái xác minh; mức evfta_verified chỉ đổi qua sync_level → decide().
"""

import datetime as dt
import uuid
from typing import Any

from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.errors import AppError
from app.core.spreadsheet import (
    Column,
    ImportResult,
    apply_rows,
    build_workbook,
    describe,
    read_workbook,
)
from app.core.storage import Storage
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import service as companies
from app.modules.verification import evidence_service, identity_service
from app.modules.verification.crosscheck_schemas import (
    CertificationBodyIn,
    CertificationBodyPatch,
    ConsistencyIn,
    EmailDraftOut,
    EvidenceCheckIn,
    EvidenceCheckOut,
    SnapshotPresignOut,
)
from app.modules.verification.matching import (
    CertificateClaims,
    CompanyRecord,
    IssuerContact,
    consistency_findings,
    issuer_email_draft,
    overall,
)
from app.modules.verification.models import (
    CertificationBody,
    CheckResult,
    CheckSubject,
    CheckType,
    Evidence,
    EvidenceCheck,
)

BODY_ENTITY = "certification_body"
_EXTENSIONS = {"image/png": "png", "image/jpeg": "jpg", "application/pdf": "pdf"}


def _require_admin(actor: CurrentUser) -> None:
    if actor.role != "admin":
        raise AppError("forbidden", "Not allowed", 403)


# ── Tổ chức cấp ────────────────────────────────────────────────────────────────────────────
def _body_snapshot(row: CertificationBody) -> dict[str, Any]:
    return {
        "name": row.name,
        "official_domain": row.official_domain,
        "contact_email": row.contact_email,
        "lookup_url": row.lookup_url,
        "accreditation_body": row.accreditation_body,
        "iaf_mla": row.iaf_mla,
        "reviewed": row.reviewed_by is not None,
    }


async def _audit_body(
    session: AsyncSession,
    actor: CurrentUser,
    action: str,
    row_id: uuid.UUID,
    before: dict[str, Any] | None,
    after: dict[str, Any] | None,
) -> None:
    await record(
        session,
        actor_id=actor.id,
        action_type=f"{BODY_ENTITY}.{action}",
        entity_type=BODY_ENTITY,
        entity_id=str(row_id),
        before=before,
        after=after,
    )


async def _get_body(session: AsyncSession, body_id: uuid.UUID) -> CertificationBody:
    row = await session.get(CertificationBody, body_id)
    if row is None:
        raise AppError("certification_body_not_found", "Certification body not found", 404)
    return row


async def list_bodies(session: AsyncSession) -> list[CertificationBody]:
    return list(await session.scalars(select(CertificationBody).order_by(CertificationBody.name)))


async def _name_taken(session: AsyncSession, name: str, exclude: uuid.UUID | None = None) -> bool:
    query = select(CertificationBody.id).where(func.lower(CertificationBody.name) == name.lower())
    if exclude is not None:
        query = query.where(CertificationBody.id != exclude)
    return await session.scalar(query) is not None


async def create_body(
    session: AsyncSession, actor: CurrentUser, data: CertificationBodyIn, commit: bool = True
) -> CertificationBody:
    _require_admin(actor)
    if await _name_taken(session, data.name):
        raise AppError("certification_body_exists", "Certification body already exists", 409)
    row = CertificationBody(**data.model_dump())  # luôn chưa duyệt
    session.add(row)
    await session.flush()
    await _audit_body(session, actor, "create", row.id, None, _body_snapshot(row))
    if commit:
        await session.commit()
    return row


async def update_body(
    session: AsyncSession,
    actor: CurrentUser,
    body_id: uuid.UUID,
    patch: CertificationBodyPatch,
    commit: bool = True,
) -> CertificationBody:
    _require_admin(actor)
    row = await _get_body(session, body_id)
    before = _body_snapshot(row)
    for name in patch.model_fields_set:
        value = getattr(patch, name)
        if value is None and name in ("name", "official_domain", "contact_email", "iaf_mla"):
            raise AppError("invalid_patch", f"{name} cannot be null", 422)
        setattr(row, name, value)
    if await _name_taken(session, row.name, exclude=row.id):
        raise AppError("certification_body_exists", "Certification body already exists", 409)
    try:  # kiểm lại ràng buộc (email ∈ domain…) trên giá trị sau khi sửa
        CertificationBodyIn.model_validate(_body_snapshot(row))
    except ValidationError as error:
        raise AppError("invalid_patch", describe(error), 422) from error
    row.reviewed_by = None  # sửa xong phải duyệt lại
    row.reviewed_at = None
    await session.flush()
    await _audit_body(session, actor, "update", row.id, before, _body_snapshot(row))
    if commit:
        await session.commit()
    return row


async def review_body(
    session: AsyncSession, actor: CurrentUser, body_id: uuid.UUID
) -> CertificationBody:
    _require_admin(actor)
    row = await _get_body(session, body_id)
    before = _body_snapshot(row)
    row.reviewed_by = actor.id
    row.reviewed_at = dt.datetime.now(dt.UTC)
    await session.flush()
    await _audit_body(session, actor, "review", row.id, before, _body_snapshot(row))
    await session.commit()
    return row


async def delete_body(session: AsyncSession, actor: CurrentUser, body_id: uuid.UUID) -> None:
    _require_admin(actor)
    row = await _get_body(session, body_id)
    used = await session.scalar(
        select(EvidenceCheck.id).where(EvidenceCheck.certification_body_id == body_id).limit(1)
    )
    if used is not None:
        raise AppError("certification_body_in_use", "Certification body is used by checks", 409)
    before = _body_snapshot(row)
    await session.delete(row)
    await _audit_body(session, actor, "delete", body_id, before, None)
    await session.commit()


async def _reviewed_body(session: AsyncSession, body_id: uuid.UUID) -> CertificationBody:
    row = await session.get(CertificationBody, body_id)
    if row is None or row.reviewed_by is None:
        raise AppError(
            "certification_body_not_reviewed", "Certification body is missing or not reviewed", 422
        )
    return row


# Xuất / nhập Excel (dòng nhập vào luôn chưa duyệt; khóa = tên).
BODY_COLUMNS = (
    Column("name", required=True, help="Tên tổ chức cấp (duy nhất)."),
    Column("official_domain", required=True, help="Domain chính thức, vd sgs.com."),
    Column("contact_email", required=True, help="Email nhận yêu cầu xác nhận; phải thuộc domain."),
    Column("lookup_url", help="Trang tra cứu chứng nhận (http/https)."),
    Column("accreditation_body", help="Đơn vị công nhận, vd BoA, UKAS."),
    Column("iaf_mla", "bool", help="true = đơn vị công nhận là thành viên IAF MLA."),
    Column("review_status", readonly=True),
)


def _body_rows(rows: list[CertificationBody]) -> list[dict[str, object]]:
    return [
        {
            c.key: ("reviewed" if r.reviewed_by is not None else "pending")
            if c.key == "review_status"
            else getattr(r, c.key)
            for c in BODY_COLUMNS
        }
        for r in rows
    ]


def body_template() -> bytes:
    return build_workbook(BODY_COLUMNS, [], template=True)


async def export_bodies(session: AsyncSession) -> bytes:
    return build_workbook(BODY_COLUMNS, _body_rows(await list_bodies(session)))


async def import_bodies(
    session: AsyncSession, actor: CurrentUser, data: bytes, dry_run: bool
) -> ImportResult:
    _require_admin(actor)

    async def find(d: CertificationBodyIn) -> CertificationBody | None:
        return await session.scalar(
            select(CertificationBody).where(func.lower(CertificationBody.name) == d.name.lower())
        )

    async def create(d: CertificationBodyIn) -> CertificationBody:
        return await create_body(session, actor, d, commit=False)

    async def update(row: CertificationBody, d: CertificationBodyIn) -> CertificationBody:
        values = d.model_dump(exclude={"name"})
        patch = CertificationBodyPatch.model_construct(_fields_set=set(values), **values)
        return await update_body(session, actor, row.id, patch, commit=False)

    return await apply_rows(
        session,
        BODY_COLUMNS,
        read_workbook(data, BODY_COLUMNS),
        schema=CertificationBodyIn,
        key=lambda d: (d.name.lower(),),
        find=find,
        create=create,
        update=update,
        dry_run=dry_run,
    )


# ── Ảnh chụp kết quả tra cứu ──────────────────────────────────────────────────────────────
async def presign_snapshot(
    session: AsyncSession,
    actor: CurrentUser,
    storage: Storage,
    company_id: uuid.UUID,
    content_type: str,
) -> SnapshotPresignOut:
    _require_admin(actor)
    if not await companies.get_company_summaries(session, [company_id]):
        raise AppError("company_not_found", "Company not found", 404)
    key = (
        f"{evidence_service.snapshot_folder(company_id)}"
        f"{uuid.uuid4().hex}.{_EXTENSIONS[content_type]}"
    )
    return SnapshotPresignOut(upload_url=await storage.presign_put(key, content_type), key=key)


# ── Ghi kiểm chéo ─────────────────────────────────────────────────────────────────────────
async def _evidence(session: AsyncSession, evidence_id: uuid.UUID) -> Evidence:
    row = await session.get(Evidence, evidence_id)
    if row is None:
        raise AppError("evidence_not_found", "Evidence not found", 404)
    return row


async def _save_check(
    session: AsyncSession, actor: CurrentUser, row: EvidenceCheck, evidence: Evidence
) -> EvidenceCheck:
    session.add(row)
    await session.flush()
    await record(
        session,
        actor_id=actor.id,
        action_type=f"evidence_check.{row.check_type.value}",
        entity_type=evidence_service.ENTITY,
        entity_id=str(evidence.id),
        before=None,
        after={
            "result": row.result.value,
            "source": row.source,
            "snapshot_key": row.snapshot_key,
            "certification_body_id": str(row.certification_body_id)
            if row.certification_body_id
            else None,
            "facts": row.facts,
        },
    )
    await session.refresh(row)
    return row


async def record_evidence_check(
    session: AsyncSession,
    actor: CurrentUser,
    storage: Storage,
    evidence_id: uuid.UUID,
    data: EvidenceCheckIn,
) -> EvidenceCheckOut:
    """Kiểm chéo với nguồn NGOÀI (tra cứu tổ chức cấp / IAF, hoặc email xác nhận). Bắt buộc có
    nguồn + ảnh chụp; ghi người và ngày. Sau đó đồng bộ mức evfta_verified."""
    _require_admin(actor)
    evidence = await _evidence(session, evidence_id)
    await evidence_service.ensure_snapshot(storage, evidence.company_id, data.snapshot_key)
    if data.certification_body_id is not None:
        await _reviewed_body(session, data.certification_body_id)
    row = await _save_check(
        session,
        actor,
        EvidenceCheck(
            company_id=evidence.company_id,
            evidence_id=evidence.id,
            subject=CheckSubject.evidence,
            check_type=CheckType(data.check_type),
            result=CheckResult(data.result),
            source=data.source.strip(),
            snapshot_key=data.snapshot_key,
            certification_body_id=data.certification_body_id,
            note=(data.note or "").strip() or None,
            checked_by=actor.id,
        ),
        evidence,
    )
    out = await _check_out(storage, row)
    await evidence_service.sync_level(session, evidence.company_id)  # commit + event nếu mức đổi
    await session.commit()
    return out


def _normalize_certificate(value: str) -> str:
    return "".join(value.split()).upper()


async def _certificate_duplicated(session: AsyncSession, evidence: Evidence) -> bool:
    # ponytail: so số chứng nhận (bỏ khoảng trắng, không phân biệt hoa thường) giữa các công ty;
    # hai tổ chức cấp khác nhau trùng số là hiếm — thêm điều kiện tổ chức cấp khi có dữ liệu I10.
    if not evidence.certificate_number:
        return False
    normalized = _normalize_certificate(evidence.certificate_number)
    other = await session.scalar(
        select(Evidence.id)
        .where(
            Evidence.company_id != evidence.company_id,
            func.upper(func.replace(Evidence.certificate_number, " ", "")) == normalized,
        )
        .limit(1)
    )
    return other is not None


async def _tax_id_shared(session: AsyncSession, company_id: uuid.UUID) -> bool:
    return any(
        c.identifier_type == "tax_id" and any(x.id == company_id for x in c.companies)
        for c in await identity_service.list_clusters(session)
    )


async def record_consistency(
    session: AsyncSession,
    actor: CurrentUser,
    storage: Storage,
    evidence_id: uuid.UUID,
    data: ConsistencyIn,
) -> EvidenceCheckOut:
    """So khớp nội bộ bằng quy tắc: trường admin trích từ chứng nhận ↔ hồ sơ, sổ đăng ký, nhóm hàng
    đang bán, MST và số chứng nhận của công ty khác. Chỉ gắn cờ; không đổi mức hay trạng thái."""
    _require_admin(actor)
    evidence = await _evidence(session, evidence_id)
    company = (await companies.get_company_summaries(session, [evidence.company_id]))[
        evidence.company_id
    ]
    registry = await identity_service.latest_registry(session, evidence.company_id)
    claims = CertificateClaims(
        holder_name=(data.holder_name or "").strip() or None,
        holder_address=(data.holder_address or "").strip() or None,
        scope_categories=None
        if data.scope_categories is None
        else frozenset(data.scope_categories),
    )
    findings = consistency_findings(
        claims,
        CompanyRecord(
            legal_name=company.legal_name,
            address=company.address,
            website=company.website,
            contact_email=company.contact_email,
            registered_name=registry.registered_name if registry else None,
            registered_address=registry.registered_address if registry else None,
            sold_categories=frozenset(
                await evidence_service.categories_of(session, evidence.company_id)
            ),
            tax_id_shared=await _tax_id_shared(session, evidence.company_id),
            certificate_duplicated=await _certificate_duplicated(session, evidence),
        ),
    )
    row = await _save_check(
        session,
        actor,
        EvidenceCheck(
            company_id=evidence.company_id,
            evidence_id=evidence.id,
            subject=CheckSubject.evidence,
            check_type=CheckType.internal_consistency,
            result=CheckResult(overall(findings)),
            facts={
                "holder_name": claims.holder_name,
                "holder_address": claims.holder_address,
                "scope_categories": sorted(claims.scope_categories)
                if claims.scope_categories is not None
                else None,
                "findings": [{"rule": f.rule, "result": f.result} for f in findings],
            },
            source="internal_rules",
            note=(data.note or "").strip() or None,
            checked_by=actor.id,
        ),
        evidence,
    )
    out = await _check_out(storage, row)
    await session.commit()
    return out


# ── Đọc cho hàng đợi, email nháp ──────────────────────────────────────────────────────────
async def _check_out(storage: Storage, row: EvidenceCheck) -> EvidenceCheckOut:
    return EvidenceCheckOut(
        id=row.id,
        evidence_id=row.evidence_id,
        check_type=row.check_type.value,
        result=row.result.value,
        source=row.source,
        certification_body_id=row.certification_body_id,
        facts=row.facts,
        note=row.note,
        checked_by=row.checked_by,
        checked_at=row.checked_at,
        snapshot_url=await storage.presign_get(row.snapshot_key) if row.snapshot_key else None,
    )


async def checks_for(
    session: AsyncSession, storage: Storage, evidence_ids: list[uuid.UUID]
) -> list[EvidenceCheckOut]:
    """Mọi lần kiểm của các bằng chứng, mới nhất trước."""
    if not evidence_ids:
        return []
    rows = await session.scalars(
        select(EvidenceCheck)
        .where(EvidenceCheck.evidence_id.in_(evidence_ids))
        .order_by(EvidenceCheck.checked_at.desc())
    )
    return [await _check_out(storage, r) for r in rows]


async def issuer_email(
    session: AsyncSession, actor: CurrentUser, evidence_id: uuid.UUID, body_id: uuid.UUID
) -> EmailDraftOut:
    _require_admin(actor)
    evidence = await _evidence(session, evidence_id)
    body = await _reviewed_body(session, body_id)
    company = (await companies.get_company_summaries(session, [evidence.company_id]))[
        evidence.company_id
    ]
    draft = issuer_email_draft(
        IssuerContact(name=body.name, contact_email=body.contact_email),
        certificate_number=evidence.certificate_number,
        issuer_on_file=evidence.issuer,
        holder=company.legal_name,
        issued_at=evidence.issued_at,
        expires_at=evidence.expires_at,
    )
    return EmailDraftOut(to=draft.to, subject=draft.subject, body=draft.body)
