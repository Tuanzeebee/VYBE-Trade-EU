import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, UploadFile
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.errors import AppError
from app.core.spreadsheet import ImportResult, read_upload, xlsx_response
from app.core.storage import Storage, get_storage
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import require_role
from app.modules.verification import (
    admin_service,
    admin_spreadsheet,
    checks_service,
    consistency_service,
    evidence_service,
    extraction_service,
    request_service,
    tier_service,
    trust_service,
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
    CheckOut,
    DecisionIn,
    EvidenceIn,
    EvidenceOut,
    EvidencePatch,
    EvidenceTypePublic,
    ExtractionApplyIn,
    ExtractionOut,
    FindingOut,
    ManualCheckIn,
    QueueItem,
    TierDownIn,
    TierOverviewOut,
    TierRequestIn,
    TrustCriterionOut,
    TrustScoreOut,
    VerificationRequestOut,
)

router = APIRouter(tags=["verification"])

Exporter = Annotated[CurrentUser, Depends(require_role("exporter"))]
Buyer = Annotated[CurrentUser, Depends(require_role("buyer"))]
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


# Buyer xin xác minh tùy chọn (B1, ADR-0004): không là điều kiện để xem, nhắn tin hay gửi RFQ.
@router.post("/api/buyer/verification-requests", status_code=201)
async def submit_buyer_verification_request(user: Buyer, session: DB) -> VerificationRequestOut:
    return await request_service.submit_request(session, user)


@router.get("/api/buyer/verification-requests")
async def my_buyer_verification_requests(user: Buyer, session: DB) -> list[VerificationRequestOut]:
    return await request_service.list_my_requests(session, user)


@router.get("/api/admin/verification-queue")
async def verification_queue(_: Admin, session: DB, storage: Store) -> list[QueueItem]:
    return await request_service.queue(session, storage)


@router.post("/api/admin/verification-requests/{request_id}/decision")
async def decide_verification_request(
    request_id: uuid.UUID, data: DecisionIn, admin: Admin, session: DB
) -> VerificationRequestOut:
    return await request_service.decide_request(session, admin, request_id, data)


# ── Cấp xác minh (U20, ADR-0004) ──────────────────────────────────────────────
Owner = Annotated[CurrentUser, Depends(require_role("exporter", "buyer"))]


@router.get("/api/me/verification-tier")
async def my_verification_tier(user: Owner, session: DB) -> TierOverviewOut:
    return await tier_service.overview(session, user)


@router.post("/api/exporter/verification-tier-requests", status_code=201)
async def request_verification_tier(
    data: TierRequestIn, user: Exporter, session: DB
) -> VerificationRequestOut:
    return await tier_service.request_tier(session, user, data)


@router.post("/api/admin/companies/{company_id}/tier-down", status_code=204)
async def tier_down(company_id: uuid.UUID, data: TierDownIn, admin: Admin, session: DB) -> Response:
    await tier_service.admin_tier_down(session, admin, company_id, data)
    return Response(status_code=204)


# ── Kiểm tự động và kiểm tay (U21, ADR-0003) — chỉ là tín hiệu cho admin ─────────────────────
@router.get("/api/me/verification-checks")
async def my_verification_checks(user: Owner, session: DB) -> list[CheckOut]:
    return await checks_service.my_checks(session, user)


@router.get("/api/admin/companies/{company_id}/checks")
async def company_checks(company_id: uuid.UUID, _: Admin, session: DB) -> list[CheckOut]:
    return await checks_service.latest_checks(session, company_id)


@router.post("/api/admin/companies/{company_id}/checks/run", status_code=202)
async def run_company_checks(company_id: uuid.UUID, _: Admin, session: DB) -> Response:
    await checks_service.admin_run(session, company_id)
    return Response(status_code=202)


@router.post("/api/admin/companies/{company_id}/checks", status_code=201)
async def record_manual_check(
    company_id: uuid.UUID, data: ManualCheckIn, admin: Admin, session: DB
) -> CheckOut:
    return await checks_service.admin_record_manual(session, admin, company_id, data)


@router.post("/api/admin/approved-establishments/import")
async def import_approved_establishments(
    file: UploadFile, admin: Admin, session: DB
) -> dict[str, int]:
    content = await file.read(5 * 1024 * 1024 + 1)
    if len(content) > 5 * 1024 * 1024:
        raise AppError("file_too_large", "File must be at most 5 MB", 413)
    return {"imported": await checks_service.import_establishments(session, admin, content)}


# ── Luật kiểm chéo (U22): gợi ý cho chủ hồ sơ, cờ cho admin ─────────────────────────────────
@router.get("/api/exporter/consistency-hints")
async def consistency_hints(user: Exporter, session: DB) -> list[FindingOut]:
    return await consistency_service.my_hints(session, user)


@router.get("/api/admin/companies/{company_id}/findings")
async def company_findings(company_id: uuid.UUID, _: Admin, session: DB) -> list[FindingOut]:
    return await consistency_service.findings_for(session, company_id)


# ── Điểm tín nhiệm seller (U23): owner + admin; công khai khi TRUST_SCORE_PUBLIC bật ───────────
@router.get("/api/exporter/trust-score")
async def my_trust_score(user: Exporter, session: DB) -> TrustScoreOut:
    return await trust_service.my_score(session, user)


@router.get("/api/admin/companies/{company_id}/trust-score")
async def company_trust_score(company_id: uuid.UUID, _: Admin, session: DB) -> TrustScoreOut:
    return await trust_service.score_for(session, company_id)


@router.get("/api/public/companies/{slug}/trust-score")
async def public_trust_score(slug: str, session: DB) -> TrustScoreOut:
    return await trust_service.public_score(session, slug)


@router.get("/api/public/trust-criteria")
async def trust_criteria(session: DB) -> list[TrustCriterionOut]:
    return await trust_service.public_criteria(session)


# ── AI đọc chứng nhận (U24): chỉ gợi ý; seller chọn áp, admin xem so sánh ─────────────────────
@router.get("/api/exporter/evidences/{evidence_id}/extraction")
async def evidence_extraction(evidence_id: uuid.UUID, user: Exporter, session: DB) -> ExtractionOut:
    return await extraction_service.get_for_owner(session, user, evidence_id)


@router.post("/api/exporter/evidences/{evidence_id}/extraction/apply")
async def apply_evidence_extraction(
    evidence_id: uuid.UUID, data: ExtractionApplyIn, user: Exporter, session: DB, storage: Store
) -> EvidenceOut:
    return await extraction_service.apply_for_owner(session, user, storage, evidence_id, data)


@router.get("/api/admin/evidences/{evidence_id}/extraction")
async def admin_evidence_extraction(evidence_id: uuid.UUID, _: Admin, session: DB) -> ExtractionOut:
    return await extraction_service.get_for_admin(session, evidence_id)
