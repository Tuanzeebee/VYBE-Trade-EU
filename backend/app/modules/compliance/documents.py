"""Bản NHÁP EUR.1 (C5): yêu cầu, sinh PDF (job nền), liệt kê. KHÔNG có tính năng cấp C/O.

Chỉ sinh khi kết quả RoO của chính công ty là `pass`. File ở bucket private, chỉ phát qua URL
ký sẵn ngắn hạn. Sinh tài liệu là hành động nhạy cảm nên ghi audit `document.generate`.
"""

import datetime as dt
import logging
import uuid
from collections.abc import Awaitable, Callable
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.errors import AppError
from app.core.storage import Storage
from app.modules.auth.schemas import CurrentUser
from app.modules.catalog import service as catalog
from app.modules.companies import service as companies
from app.modules.compliance.calculators import EU_COUNTRY_NAMES
from app.modules.compliance.eur1 import Eur1Data, render_eur1
from app.modules.compliance.models import (
    CheckType,
    ComplianceCheck,
    Document,
    DocumentStatus,
    DocumentType,
)
from app.modules.compliance.schemas import DocumentOut, Eur1In

log = logging.getLogger(__name__)

Enqueuer = Callable[[str], Awaitable[None]]


async def _defer_generate(document_id: str) -> None:
    """Đẩy job generate_eur1. Lỗi hàng đợi không làm hỏng request; bản ghi vẫn queued."""
    try:
        from app.jobs.generate_eur1 import generate_eur1

        await generate_eur1.defer_async(document_id=document_id)
    except Exception:
        log.exception("Không xếp được job generate_eur1 cho %s", document_id)


_enqueue: Enqueuer = _defer_generate


def set_enqueuer(enqueuer: Enqueuer) -> Enqueuer:
    """Thay bộ xếp hàng (test). Trả về bộ cũ để khôi phục."""
    global _enqueue
    previous, _enqueue = _enqueue, enqueuer
    return previous


async def _exporter_company_id(session: AsyncSession, user: CurrentUser) -> uuid.UUID:
    if user.role != "exporter":
        raise AppError("forbidden", "Not allowed for this role", 403)
    company_id = await companies.get_company_id(session, user.id)
    if company_id is None:
        raise AppError("company_not_found", "Company profile not created yet", 404)
    return company_id


async def _out(storage: Storage, row: Document) -> DocumentOut:
    ready = row.status is DocumentStatus.ready and row.file_key is not None
    return DocumentOut(
        id=row.id,
        document_type=row.document_type.value,
        compliance_check_id=row.compliance_check_id,
        status=row.status.value,
        created_at=row.created_at,
        file_url=await storage.presign_get(row.file_key) if ready and row.file_key else None,
    )


async def request_eur1(
    session: AsyncSession, user: CurrentUser, data: Eur1In, storage: Storage
) -> DocumentOut:
    """Nhận yêu cầu sinh bản nháp: kiểm RoO = pass và thuộc công ty mình, rồi xếp job."""
    company_id = await _exporter_company_id(session, user)
    check = await session.get(ComplianceCheck, data.compliance_check_id)
    if check is None or check.company_id != company_id:
        raise AppError(
            "check_not_found", "Origin check not found", 404
        )  # không lộ check của người khác
    if check.check_type is not CheckType.roo or check.status != "pass":
        raise AppError(
            "roo_not_passed",
            "A draft EUR.1 can only be created from an origin check that passed",
            409,
        )
    row = Document(
        company_id=company_id,
        requested_by=user.id,
        document_type=DocumentType.eur1_draft,
        compliance_check_id=check.id,
        input_data=data.model_dump(mode="json", exclude={"compliance_check_id"}),
        status=DocumentStatus.queued,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    await _enqueue(str(row.id))
    return await _out(storage, row)


async def generate_document(
    session: AsyncSession, storage: Storage, document_id: uuid.UUID
) -> None:
    """Thân job: dựng PDF, ghi lên Storage, đặt ready, ghi audit. Chạy lại không sinh trùng."""
    row = await session.get(Document, document_id)
    if row is None or row.status is DocumentStatus.ready:
        return
    check = await session.get_one(ComplianceCheck, row.compliance_check_id)
    summaries = await companies.get_company_summaries(session, [row.company_id])
    company = summaries[row.company_id]
    hs = await catalog.get_hs_code(session, check.hs_code[:6])
    inv = row.input_data
    data = Eur1Data(
        exporter_name=company.legal_name,
        exporter_address=company.address or "",
        exporter_country="Viet Nam",
        consignee_name=inv["consignee_name"],
        consignee_address=inv["consignee_address"],
        consignee_country=EU_COUNTRY_NAMES.get(inv["consignee_country"], inv["consignee_country"]),
        origin_country="Viet Nam",
        destination="European Union",
        hs_code=catalog.format_code(check.hs_code),
        goods_description=inv["goods_description"] or (hs.name_en if hs else ""),
        packages=inv["packages"],
        gross_mass_kg=str(Decimal(inv["gross_mass_kg"])),
        invoice_number=inv["invoice_number"],
        invoice_date=dt.date.fromisoformat(inv["invoice_date"]),
        transport_details=inv.get("transport_details") or "",
        remarks=inv.get("remarks") or "",
        check_reference=str(check.id)[:8],
    )
    pdf = render_eur1(data)
    key = f"documents/{row.company_id}/{uuid.uuid4().hex}.pdf"
    await storage.put(key, pdf, "application/pdf")
    row.file_key = key
    row.status = DocumentStatus.ready
    await session.flush()
    await record(
        session,
        actor_id=row.requested_by,
        action_type="document.generate",
        entity_type="document",
        entity_id=str(row.id),
        before=None,
        after={"type": row.document_type.value, "check_id": str(check.id), "file_key": key},
    )
    await session.commit()


async def list_documents(
    session: AsyncSession, user: CurrentUser, storage: Storage
) -> list[DocumentOut]:
    company_id = await _exporter_company_id(session, user)
    rows = await session.scalars(
        select(Document)
        .where(Document.company_id == company_id)
        .order_by(Document.created_at.desc())
    )
    return [await _out(storage, r) for r in rows]


async def get_document(
    session: AsyncSession, user: CurrentUser, storage: Storage, document_id: uuid.UUID
) -> DocumentOut:
    company_id = await _exporter_company_id(session, user)
    row = await session.get(Document, document_id)
    if row is None or row.company_id != company_id:
        raise AppError("document_not_found", "Document not found", 404)
    return await _out(storage, row)
