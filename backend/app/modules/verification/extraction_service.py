"""AI đọc chứng nhận (U24, X8): job lấy file → chữ PDF (hoặc ảnh scan khi có model đọc ảnh) → che
liên hệ → ChatModel trả JSON → lưu evidence_extractions. Seller xem gợi ý và chọn áp vào bằng chứng
(bằng chứng về lại chờ duyệt như mọi lần sửa); admin thấy so sánh khi duyệt.

Không bao giờ đổi approval_status hay gọi decide().
"""

import datetime as dt
import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.chat import ChatModel, VisionModel, get_chat_model, get_vision_model
from app.core.errors import AppError
from app.core.storage import Storage
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import service as companies
from app.modules.verification import evidence_service
from app.modules.verification.extraction import (
    MIN_TEXT_CHARS,
    compare,
    extraction_prompt,
    is_pdf,
    parse_extraction,
    pdf_first_image,
    pdf_text,
    redact_contacts,
)
from app.modules.verification.models import Evidence, EvidenceExtraction, EvidenceType
from app.modules.verification.schemas import (
    EvidenceOut,
    EvidencePatch,
    ExtractionApplyIn,
    ExtractionFieldCompare,
    ExtractionOut,
)

log = logging.getLogger(__name__)
IMAGE_MAGIC = (b"\xff\xd8\xff", b"\x89PNG\r\n\x1a\n")


def _out(row: EvidenceExtraction, evidence: Evidence | None = None) -> ExtractionOut:
    comparison = []
    if evidence is not None and row.status == "ready":
        declared = {
            "type_code": evidence.type_code,
            "certificate_number": evidence.certificate_number,
            "issuer": evidence.issuer,
            "issued_at": evidence.issued_at.isoformat() if evidence.issued_at else None,
            "expires_at": evidence.expires_at.isoformat() if evidence.expires_at else None,
        }
        comparison = [ExtractionFieldCompare(**c) for c in compare(declared, row.fields)]
    return ExtractionOut(
        evidence_id=row.evidence_id,
        status=row.status,
        method=row.method,
        model=row.model,
        fields=row.fields,
        error=row.error,
        finished_at=row.finished_at,
        applied_at=row.applied_at,
        comparison=comparison,
    )


async def _types(session: AsyncSession) -> dict[str, str]:
    rows = await session.execute(
        select(EvidenceType.code, EvidenceType.name_en).where(
            EvidenceType.reviewed_by.is_not(None), EvidenceType.is_active.is_(True)
        )
    )
    return {code: name for code, name in rows}


async def run_extraction(
    session: AsyncSession,
    storage: Storage,
    evidence_id: uuid.UUID,
    chat: ChatModel | None = None,
    vision: VisionModel | None = None,
) -> ExtractionOut | None:
    """Thân job. Chạy lại thay bản cũ. Không có chữ và không có model đọc ảnh → skipped."""
    evidence = await session.get(Evidence, evidence_id)
    if evidence is None:
        return None
    row = await session.scalar(
        select(EvidenceExtraction).where(EvidenceExtraction.evidence_id == evidence_id)
    )
    if row is None:
        row = EvidenceExtraction(evidence_id=evidence_id, company_id=evidence.company_id)
        session.add(row)
    row.status, row.error, row.fields, row.applied_at = "running", None, {}, None
    await session.commit()
    types = await _types(session)
    try:
        data = await storage.get(evidence.file_key)
        text = pdf_text(data) if is_pdf(data) else ""
        image = None
        if len(text) < MIN_TEXT_CHARS:
            image = (
                pdf_first_image(data)
                if is_pdf(data)
                else (data if data.startswith(IMAGE_MAGIC) else None)
            )
        if len(text) >= MIN_TEXT_CHARS:
            system, user = extraction_prompt(redact_contacts(text), types)
            model = chat or get_chat_model()
            raw = await model.complete(system, user)
            row.method, row.model = "text", model.name
        else:
            reader = vision if vision is not None else get_vision_model()
            if image is None or reader is None:
                row.status, row.error = "skipped", "scanned_document_needs_vision"
                row.finished_at = dt.datetime.now(dt.UTC)
                await session.commit()
                return _out(row)
            system, user = extraction_prompt("(see image)", types)
            raw = await reader.read_image(system, user, image)
            row.method, row.model = "vision", reader.name
        fields = parse_extraction(raw, set(types))
        if fields is None:
            row.status, row.error = "failed", "unreadable_model_output"
        else:
            row.status, row.fields = "ready", fields
    except Exception:
        log.warning("Đọc chứng nhận %s lỗi", evidence_id, exc_info=True)
        row.status, row.error = "failed", "extraction_error"
    row.finished_at = dt.datetime.now(dt.UTC)
    await session.commit()
    return _out(row, evidence)


async def _owned(session: AsyncSession, user: CurrentUser, evidence_id: uuid.UUID) -> Evidence:
    if user.role != "exporter":
        raise AppError("forbidden", "Not allowed for this role", 403)
    company_id = await companies.get_company_id(session, user.id)
    evidence = await session.get(Evidence, evidence_id)
    if company_id is None or evidence is None or evidence.company_id != company_id:
        raise AppError("evidence_not_found", "Evidence not found", 404)
    return evidence


async def _row(session: AsyncSession, evidence_id: uuid.UUID) -> EvidenceExtraction:
    row = await session.scalar(
        select(EvidenceExtraction).where(EvidenceExtraction.evidence_id == evidence_id)
    )
    if row is None:
        raise AppError("extraction_not_found", "No extraction for this evidence yet", 404)
    return row


async def get_for_owner(
    session: AsyncSession, user: CurrentUser, evidence_id: uuid.UUID
) -> ExtractionOut:
    evidence = await _owned(session, user, evidence_id)
    return _out(await _row(session, evidence_id), evidence)


async def apply_for_owner(
    session: AsyncSession,
    user: CurrentUser,
    storage: Storage,
    evidence_id: uuid.UUID,
    data: ExtractionApplyIn,
) -> EvidenceOut:
    """Seller xác nhận gợi ý: chỉ các trường chọn và có giá trị; bằng chứng về chờ duyệt lại."""
    await _owned(session, user, evidence_id)
    row = await _row(session, evidence_id)
    if row.status != "ready":
        raise AppError("extraction_not_ready", "Extraction is not ready", 409)
    values = {key: row.fields.get(key) for key in data.fields if row.fields.get(key)}
    if not values:
        raise AppError("nothing_to_apply", "The selected fields have no suggested value", 422)
    patch = EvidencePatch.model_validate(values)
    result = await evidence_service.update_evidence(session, user, storage, evidence_id, patch)
    row.applied_at = dt.datetime.now(dt.UTC)
    await session.commit()
    return result


async def get_for_admin(session: AsyncSession, evidence_id: uuid.UUID) -> ExtractionOut:
    evidence = await session.get(Evidence, evidence_id)
    if evidence is None:
        raise AppError("evidence_not_found", "Evidence not found", 404)
    return _out(await _row(session, evidence_id), evidence)


async def extracted_addresses(session: AsyncSession, company_id: uuid.UUID) -> list[str]:
    """Địa chỉ đơn vị được cấp đọc từ chứng nhận của công ty (cho luật kiểm chéo U22)."""
    rows: list[dict[str, Any]] = list(
        await session.scalars(
            select(EvidenceExtraction.fields).where(
                EvidenceExtraction.company_id == company_id, EvidenceExtraction.status == "ready"
            )
        )
    )
    return [str(f["holder_address"]) for f in rows if f.get("holder_address")]
