import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, UploadFile
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.spreadsheet import ImportResult, read_upload, xlsx_response
from app.core.storage import Storage, get_storage
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import require_role
from app.modules.verification import (
    admin_service,
    admin_spreadsheet,
    evidence_service,
    request_service,
)
from app.modules.verification.admin_schemas import (
    EvidenceReviewIn,
    EvidenceTypeIn,
    EvidenceTypeOut,
    EvidenceTypePatch,
    RuleIn,
    RuleOut,
    RulePatch,
)
from app.modules.verification.schemas import (
    ChecklistItem,
    DecisionIn,
    EvidenceIn,
    EvidenceOut,
    EvidencePatch,
    EvidenceTypePublic,
    QueueItem,
    VerificationRequestOut,
)

router = APIRouter(tags=["verification"])

Exporter = Annotated[CurrentUser, Depends(require_role("exporter"))]
DB = Annotated[AsyncSession, Depends(get_session)]
Store = Annotated[Storage, Depends(get_storage)]


@router.get("/api/exporter/evidence-types")
async def list_available_evidence_types(user: Exporter, session: DB) -> list[EvidenceTypePublic]:
    return [
        EvidenceTypePublic.model_validate(t)
        for t in await evidence_service.list_available_types(session)
    ]


@router.get("/api/exporter/evidences")
async def list_evidences(user: Exporter, session: DB, storage: Store) -> list[EvidenceOut]:
    return await evidence_service.list_evidence(session, user, storage)


# Khai báo /checklist TRƯỚC /{evidence_id} để không bị coi là id.
@router.get("/api/exporter/evidences/checklist")
async def evidence_checklist(user: Exporter, session: DB) -> list[ChecklistItem]:
    return await evidence_service.checklist(session, user)


@router.post("/api/exporter/evidences", status_code=201)
async def create_evidence(
    data: EvidenceIn, user: Exporter, session: DB, storage: Store
) -> EvidenceOut:
    return await evidence_service.create_evidence(session, user, storage, data)


@router.get("/api/exporter/evidences/{evidence_id}")
async def get_evidence(
    evidence_id: uuid.UUID, user: Exporter, session: DB, storage: Store
) -> EvidenceOut:
    return await evidence_service.get_evidence(session, user, storage, evidence_id)


@router.patch("/api/exporter/evidences/{evidence_id}")
async def update_evidence(
    evidence_id: uuid.UUID, data: EvidencePatch, user: Exporter, session: DB, storage: Store
) -> EvidenceOut:
    return await evidence_service.update_evidence(session, user, storage, evidence_id, data)


@router.delete("/api/exporter/evidences/{evidence_id}", status_code=204)
async def delete_evidence(evidence_id: uuid.UUID, user: Exporter, session: DB) -> Response:
    await evidence_service.delete_evidence(session, user, evidence_id)
    return Response(status_code=204)


# ── Admin: loại bằng chứng, luật bắt buộc, duyệt bằng chứng ───────────────────
Admin = Annotated[CurrentUser, Depends(require_role("admin"))]


@router.get("/api/admin/evidence-types/template.xlsx")
async def evidence_types_template(_: Admin) -> Response:
    return xlsx_response(admin_spreadsheet.type_template(), "evidence-types-template.xlsx")


@router.get("/api/admin/evidence-types/export.xlsx")
async def evidence_types_export(_: Admin, session: DB) -> Response:
    return xlsx_response(await admin_spreadsheet.export_types(session), "evidence-types.xlsx")


@router.post("/api/admin/evidence-types/import")
async def evidence_types_import(
    file: UploadFile, admin: Admin, session: DB, dry_run: bool = False
) -> ImportResult:
    data = await read_upload(file)
    return await admin_spreadsheet.import_types(session, admin, data, dry_run)


@router.get("/api/admin/evidence-rules/template.xlsx")
async def evidence_rules_template(_: Admin) -> Response:
    return xlsx_response(admin_spreadsheet.rule_template(), "evidence-rules-template.xlsx")


@router.get("/api/admin/evidence-rules/export.xlsx")
async def evidence_rules_export(_: Admin, session: DB) -> Response:
    return xlsx_response(await admin_spreadsheet.export_rules(session), "evidence-rules.xlsx")


@router.post("/api/admin/evidence-rules/import")
async def evidence_rules_import(
    file: UploadFile, admin: Admin, session: DB, dry_run: bool = False
) -> ImportResult:
    data = await read_upload(file)
    return await admin_spreadsheet.import_rules(session, admin, data, dry_run)


@router.patch("/api/admin/evidence-rules/{rule_id}")
async def update_evidence_rule(
    rule_id: uuid.UUID, data: RulePatch, admin: Admin, session: DB
) -> RuleOut:
    return RuleOut.model_validate(await admin_service.update_rule(session, admin, rule_id, data))


@router.get("/api/admin/evidence-types")
async def list_evidence_types(_: Admin, session: DB) -> list[EvidenceTypeOut]:
    return [EvidenceTypeOut.model_validate(r) for r in await admin_service.list_types(session)]


@router.post("/api/admin/evidence-types", status_code=201)
async def create_evidence_type(data: EvidenceTypeIn, admin: Admin, session: DB) -> EvidenceTypeOut:
    return EvidenceTypeOut.model_validate(await admin_service.create_type(session, admin, data))


@router.patch("/api/admin/evidence-types/{code}")
async def update_evidence_type(
    code: str, data: EvidenceTypePatch, admin: Admin, session: DB
) -> EvidenceTypeOut:
    return EvidenceTypeOut.model_validate(
        await admin_service.update_type(session, admin, code, data)
    )


@router.post("/api/admin/evidence-types/{code}/review")
async def review_evidence_type(code: str, admin: Admin, session: DB) -> EvidenceTypeOut:
    return EvidenceTypeOut.model_validate(await admin_service.review_type(session, admin, code))


@router.get("/api/admin/evidence-rules")
async def list_evidence_rules(_: Admin, session: DB, category: str | None = None) -> list[RuleOut]:
    return [RuleOut.model_validate(r) for r in await admin_service.list_rules(session, category)]


@router.post("/api/admin/evidence-rules", status_code=201)
async def create_evidence_rule(data: RuleIn, admin: Admin, session: DB) -> RuleOut:
    return RuleOut.model_validate(await admin_service.create_rule(session, admin, data))


@router.post("/api/admin/evidence-rules/{rule_id}/review")
async def review_evidence_rule(rule_id: uuid.UUID, admin: Admin, session: DB) -> RuleOut:
    return RuleOut.model_validate(await admin_service.review_rule(session, admin, rule_id))


@router.delete("/api/admin/evidence-rules/{rule_id}", status_code=204)
async def delete_evidence_rule(rule_id: uuid.UUID, admin: Admin, session: DB) -> Response:
    await admin_service.delete_rule(session, admin, rule_id)
    return Response(status_code=204)


@router.post("/api/admin/evidences/{evidence_id}/review")
async def review_evidence(
    evidence_id: uuid.UUID, data: EvidenceReviewIn, admin: Admin, session: DB, storage: Store
) -> EvidenceOut:
    return await admin_service.review_evidence(session, admin, storage, evidence_id, data)


# ── Yêu cầu xác minh (I1, I2) ────────────────────────────────────────────────
@router.post("/api/exporter/verification-requests", status_code=201)
async def submit_verification_request(user: Exporter, session: DB) -> VerificationRequestOut:
    return await request_service.submit_request(session, user)


@router.get("/api/exporter/verification-requests")
async def my_verification_requests(user: Exporter, session: DB) -> list[VerificationRequestOut]:
    return await request_service.list_my_requests(session, user)


@router.get("/api/admin/verification-queue")
async def verification_queue(_: Admin, session: DB, storage: Store) -> list[QueueItem]:
    return await request_service.queue(session, storage)


@router.post("/api/admin/verification-requests/{request_id}/decision")
async def decide_verification_request(
    request_id: uuid.UUID, data: DecisionIn, admin: Admin, session: DB
) -> VerificationRequestOut:
    return await request_service.decide_request(session, admin, request_id, data)
