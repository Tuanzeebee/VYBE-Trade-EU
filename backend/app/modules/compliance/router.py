import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query, UploadFile
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.spreadsheet import ImportResult, read_upload, xlsx_response
from app.core.storage import Storage, get_storage
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import get_optional_user, require_role
from app.modules.compliance import (
    admin_service,
    admin_spreadsheet,
    badge,
    documents,
    review_import,
    service,
)
from app.modules.compliance.admin_schemas import (
    AdminSectorAlertOut,
    CountryTermIn,
    CountryTermOut,
    CountryTermPatch,
    ProductSubtypeIn,
    ProductSubtypeOut,
    ProductSubtypePatch,
    RooRuleIn,
    RooRuleOut,
    RooRulePatch,
    SectorAlertIn,
    SectorAlertPatch,
    TariffLineIn,
    TariffLineOut,
    TariffLinePatch,
    TariffQuotaIn,
    TariffQuotaOut,
    TariffQuotaPatch,
    TradeAgreementIn,
    TradeAgreementOut,
    TradeAgreementPatch,
)
from app.modules.compliance.schemas import (
    CompanyChecklistOut,
    DocumentOut,
    Eur1In,
    ExporterRequirementsOut,
    MarketsIn,
    MarketsOut,
    OriginIn,
    OriginOut,
    OriginQuestionsOut,
    ReviewIssueOut,
    RooIn,
    RooOut,
    SectorAlertOut,
    TariffIn,
    TariffOptionsOut,
    TariffOut,
    TariffPreviewOut,
)

router = APIRouter(tags=["compliance"])


@router.get("/api/admin/compliance-checks.csv")
async def export_compliance_checks(
    user: Annotated[CurrentUser, Depends(require_role("admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StreamingResponse:
    return StreamingResponse(
        service.export_checks_csv(session, actor_id=user.id),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="compliance-checks.csv"'},
    )


# Công khai (khách dùng không cần đăng nhập). Rate limit 30/phút áp ở mức app (J1).
@router.post("/api/public/tariff")
async def calculate_tariff(
    data: TariffIn,
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    accept_language: Annotated[str | None, Header()] = None,
) -> TariffOut:
    return await service.calculate_tariff(session, data, user, accept_language)


@router.get("/api/public/tariff/options")
async def tariff_options(
    hs_code: Annotated[str, Query(max_length=32)],
    destination: Annotated[str, Query(pattern=r"^[A-Za-z]{2}$")],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TariffOptionsOut:
    return await service.tariff_options(session, hs_code, destination)


@router.get("/api/public/sector-alerts")
async def sector_alerts(
    hs_code: Annotated[str, Query(max_length=32)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[SectorAlertOut]:
    return await service.sector_alerts(session, hs_code)


@router.get("/api/exporter/tariff-preview")
async def tariff_preview(
    hs_code: Annotated[str, Query(max_length=32)],
    _: Annotated[CurrentUser, Depends(require_role("exporter"))],
    session: Annotated[AsyncSession, Depends(get_session)],
    accept_language: Annotated[str | None, Header()] = None,
) -> TariffPreviewOut:
    return await service.preview_tariff(session, hs_code, accept_language)


@router.post("/api/public/roo")
async def calculate_roo(
    data: RooIn,
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> RooOut:
    return await service.calculate_roo(session, data, user)


@router.get("/api/public/hs-codes/{cn}/origin-questions")
async def origin_questions(
    cn: str,
    session: Annotated[AsyncSession, Depends(get_session)],
    accept_language: Annotated[str | None, Header()] = None,
) -> OriginQuestionsOut:
    return await service.origin_questions(session, cn, accept_language)


@router.post("/api/public/origin")
async def calculate_origin(
    data: OriginIn,
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    accept_language: Annotated[str | None, Header()] = None,
) -> OriginOut:
    return await service.calculate_origin(session, data, user, accept_language)


@router.get("/api/exporter/evidence-requirements")
async def exporter_evidence_requirements(
    user: Annotated[CurrentUser, Depends(require_role("exporter"))],
    session: Annotated[AsyncSession, Depends(get_session)],
    accept_language: Annotated[str | None, Header()] = None,
) -> ExporterRequirementsOut:
    return await badge.exporter_requirements(session, user, accept_language)


@router.get("/api/companies/{company_id}/evidence-checklist")
async def evidence_checklist(
    company_id: uuid.UUID,
    hs: Annotated[str, Query(max_length=32)],
    user: Annotated[CurrentUser, Depends(require_role("exporter", "admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
    accept_language: Annotated[str | None, Header()] = None,
) -> CompanyChecklistOut:
    return await badge.company_checklist(session, user, company_id, hs, accept_language)


@router.post("/api/public/markets")
async def rank_markets(
    data: MarketsIn,
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MarketsOut:
    return await service.rank_markets_for(session, data, user)


# ── Admin: nhập + duyệt dữ liệu tuân thủ ─────────────────────────────────────
Admin = Annotated[CurrentUser, Depends(require_role("admin"))]
DB = Annotated[AsyncSession, Depends(get_session)]


@router.get("/api/admin/tariff-lines/template.xlsx")
async def tariff_lines_template(_: Admin) -> Response:
    return xlsx_response(admin_spreadsheet.tariff_template(), "tariff-lines-template.xlsx")


@router.get("/api/admin/tariff-lines/export.xlsx")
async def tariff_lines_export(_: Admin, session: DB) -> Response:
    return xlsx_response(await admin_spreadsheet.export_tariff(session), "tariff-lines.xlsx")


@router.post("/api/admin/tariff-lines/import")
async def tariff_lines_import(
    file: UploadFile, admin: Admin, session: DB, dry_run: bool = False
) -> ImportResult:
    data = await read_upload(file)
    return await admin_spreadsheet.import_tariff(session, admin, data, dry_run)


@router.get("/api/admin/roo-rules/template.xlsx")
async def roo_rules_template(_: Admin) -> Response:
    return xlsx_response(admin_spreadsheet.psr_template(), "roo-rules-template.xlsx")


@router.get("/api/admin/roo-rules/export.xlsx")
async def roo_rules_export(_: Admin, session: DB) -> Response:
    return xlsx_response(await admin_spreadsheet.export_psr(session), "roo-rules.xlsx")


@router.post("/api/admin/roo-rules/import")
async def roo_rules_import(
    file: UploadFile, admin: Admin, session: DB, dry_run: bool = False
) -> ImportResult:
    data = await read_upload(file)
    return await admin_spreadsheet.import_psr(session, admin, data, dry_run)


@router.get("/api/admin/tariff-lines")
async def list_tariff_lines(
    _: Admin, session: DB, hs_code: str | None = None, reviewed: bool | None = None
) -> list[TariffLineOut]:
    rows = await admin_service.list_tariff_lines(session, hs_code, reviewed)
    return [TariffLineOut.model_validate(r) for r in rows]


@router.post("/api/admin/tariff-lines", status_code=201)
async def create_tariff_line(data: TariffLineIn, admin: Admin, session: DB) -> TariffLineOut:
    return TariffLineOut.model_validate(
        await admin_service.create_tariff_line(session, admin, data)
    )


@router.patch("/api/admin/tariff-lines/{line_id}")
async def update_tariff_line(
    line_id: uuid.UUID, data: TariffLinePatch, admin: Admin, session: DB
) -> TariffLineOut:
    row = await admin_service.update_tariff_line(session, admin, line_id, data)
    return TariffLineOut.model_validate(row)


@router.post("/api/admin/tariff-lines/{line_id}/review")
async def review_tariff_line(line_id: uuid.UUID, admin: Admin, session: DB) -> TariffLineOut:
    return TariffLineOut.model_validate(
        await admin_service.review_tariff_line(session, admin, line_id)
    )


@router.delete("/api/admin/tariff-lines/{line_id}", status_code=204)
async def delete_tariff_line(line_id: uuid.UUID, admin: Admin, session: DB) -> Response:
    await admin_service.delete_tariff_line(session, admin, line_id)
    return Response(status_code=204)


@router.get("/api/admin/roo-rules")
async def list_roo_rules(
    _: Admin, session: DB, hs_code: str | None = None, reviewed: bool | None = None
) -> list[RooRuleOut]:
    rows = await admin_service.list_roo_rules(session, hs_code, reviewed)
    return [RooRuleOut.model_validate(r) for r in rows]


@router.post("/api/admin/roo-rules", status_code=201)
async def create_roo_rule(data: RooRuleIn, admin: Admin, session: DB) -> RooRuleOut:
    return RooRuleOut.model_validate(await admin_service.create_roo_rule(session, admin, data))


@router.patch("/api/admin/roo-rules/{rule_id}")
async def update_roo_rule(
    rule_id: uuid.UUID, data: RooRulePatch, admin: Admin, session: DB
) -> RooRuleOut:
    return RooRuleOut.model_validate(
        await admin_service.update_roo_rule(session, admin, rule_id, data)
    )


@router.post("/api/admin/roo-rules/{rule_id}/review")
async def review_roo_rule(rule_id: uuid.UUID, admin: Admin, session: DB) -> RooRuleOut:
    return RooRuleOut.model_validate(await admin_service.review_roo_rule(session, admin, rule_id))


@router.delete("/api/admin/roo-rules/{rule_id}", status_code=204)
async def delete_roo_rule(rule_id: uuid.UUID, admin: Admin, session: DB) -> Response:
    await admin_service.delete_roo_rule(session, admin, rule_id)
    return Response(status_code=204)


# ── Bản nháp EUR.1 của exporter (C5) ───────────────────────────────────────────
Exporter = Annotated[CurrentUser, Depends(require_role("exporter"))]
Store = Annotated[Storage, Depends(get_storage)]


@router.post("/api/exporter/documents/eur1", status_code=202)
async def request_eur1(data: Eur1In, user: Exporter, session: DB, storage: Store) -> DocumentOut:
    return await documents.request_eur1(session, user, data, storage)


@router.get("/api/exporter/documents")
async def list_documents(user: Exporter, session: DB, storage: Store) -> list[DocumentOut]:
    return await documents.list_documents(session, user, storage)


@router.get("/api/exporter/documents/{document_id}")
async def get_document(
    document_id: uuid.UUID, user: Exporter, session: DB, storage: Store
) -> DocumentOut:
    return await documents.get_document(session, user, storage, document_id)


# ── Hiệp định thương mại (U12) ───────────────────────────────────────────────
AdminUser = Annotated[CurrentUser, Depends(require_role("admin"))]
DBSession = Annotated[AsyncSession, Depends(get_session)]


@router.get("/api/admin/trade-agreements")
async def list_trade_agreements(
    _: AdminUser, session: DBSession, reviewed: bool | None = None
) -> list[TradeAgreementOut]:
    rows = await admin_service.list_agreements(session, reviewed)
    return [TradeAgreementOut.model_validate(r) for r in rows]


@router.post("/api/admin/trade-agreements", status_code=201)
async def create_trade_agreement(
    data: TradeAgreementIn, admin: AdminUser, session: DBSession
) -> TradeAgreementOut:
    row = await admin_service.create_agreement(session, admin, data)
    return TradeAgreementOut.model_validate(row)


@router.patch("/api/admin/trade-agreements/{agreement_id}")
async def update_trade_agreement(
    agreement_id: uuid.UUID, data: TradeAgreementPatch, admin: AdminUser, session: DBSession
) -> TradeAgreementOut:
    row = await admin_service.update_agreement(session, admin, agreement_id, data)
    return TradeAgreementOut.model_validate(row)


@router.post("/api/admin/trade-agreements/{agreement_id}/review")
async def review_trade_agreement(
    agreement_id: uuid.UUID, admin: AdminUser, session: DBSession
) -> TradeAgreementOut:
    row = await admin_service.review_agreement(session, admin, agreement_id)
    return TradeAgreementOut.model_validate(row)


@router.delete("/api/admin/trade-agreements/{agreement_id}", status_code=204)
async def delete_trade_agreement(
    agreement_id: uuid.UUID, admin: AdminUser, session: DBSession
) -> Response:
    await admin_service.delete_agreement(session, admin, agreement_id)
    return Response(status_code=204)


# ── Phân nhóm sản phẩm và hạn ngạch (U13) ──────────────────────────────────
@router.get("/api/admin/product-subtypes")
async def list_product_subtypes(
    _: AdminUser, session: DBSession, reviewed: bool | None = None
) -> list[ProductSubtypeOut]:
    return [
        ProductSubtypeOut.model_validate(r)
        for r in await admin_service.list_subtypes(session, reviewed)
    ]


@router.post("/api/admin/product-subtypes", status_code=201)
async def create_product_subtype(
    data: ProductSubtypeIn, admin: AdminUser, session: DBSession
) -> ProductSubtypeOut:
    return ProductSubtypeOut.model_validate(
        await admin_service.create_subtype(session, admin, data)
    )


@router.patch("/api/admin/product-subtypes/{subtype_id}")
async def update_product_subtype(
    subtype_id: uuid.UUID, data: ProductSubtypePatch, admin: AdminUser, session: DBSession
) -> ProductSubtypeOut:
    row = await admin_service.update_subtype(session, admin, subtype_id, data)
    return ProductSubtypeOut.model_validate(row)


@router.post("/api/admin/product-subtypes/{subtype_id}/review")
async def review_product_subtype(
    subtype_id: uuid.UUID, admin: AdminUser, session: DBSession
) -> ProductSubtypeOut:
    row = await admin_service.review_subtype(session, admin, subtype_id)
    return ProductSubtypeOut.model_validate(row)


@router.delete("/api/admin/product-subtypes/{subtype_id}", status_code=204)
async def delete_product_subtype(
    subtype_id: uuid.UUID, admin: AdminUser, session: DBSession
) -> Response:
    await admin_service.delete_subtype(session, admin, subtype_id)
    return Response(status_code=204)


@router.get("/api/admin/tariff-quotas")
async def list_tariff_quotas(
    _: AdminUser, session: DBSession, reviewed: bool | None = None
) -> list[TariffQuotaOut]:
    return [admin_service.quota_out(r) for r in await admin_service.list_quotas(session, reviewed)]


@router.post("/api/admin/tariff-quotas", status_code=201)
async def create_tariff_quota(
    data: TariffQuotaIn, admin: AdminUser, session: DBSession
) -> TariffQuotaOut:
    return admin_service.quota_out(await admin_service.create_quota(session, admin, data))


@router.patch("/api/admin/tariff-quotas/{quota_id}")
async def update_tariff_quota(
    quota_id: uuid.UUID, data: TariffQuotaPatch, admin: AdminUser, session: DBSession
) -> TariffQuotaOut:
    return admin_service.quota_out(await admin_service.update_quota(session, admin, quota_id, data))


@router.post("/api/admin/tariff-quotas/{quota_id}/review")
async def review_tariff_quota(
    quota_id: uuid.UUID, admin: AdminUser, session: DBSession
) -> TariffQuotaOut:
    return admin_service.quota_out(await admin_service.review_quota(session, admin, quota_id))


@router.delete("/api/admin/tariff-quotas/{quota_id}", status_code=204)
async def delete_tariff_quota(
    quota_id: uuid.UUID, admin: AdminUser, session: DBSession
) -> Response:
    await admin_service.delete_quota(session, admin, quota_id)
    return Response(status_code=204)


# ── Cảnh báo ngành (U14) ─────────────────────────────────────────────────────
@router.get("/api/admin/sector-alerts")
async def list_sector_alerts(
    _: AdminUser, session: DBSession, reviewed: bool | None = None
) -> list[AdminSectorAlertOut]:
    return [
        AdminSectorAlertOut.model_validate(r)
        for r in await admin_service.list_alerts(session, reviewed)
    ]


@router.post("/api/admin/sector-alerts", status_code=201)
async def create_sector_alert(
    data: SectorAlertIn, admin: AdminUser, session: DBSession
) -> AdminSectorAlertOut:
    return AdminSectorAlertOut.model_validate(
        await admin_service.create_alert(session, admin, data)
    )


@router.patch("/api/admin/sector-alerts/{alert_id}")
async def update_sector_alert(
    alert_id: uuid.UUID, data: SectorAlertPatch, admin: AdminUser, session: DBSession
) -> AdminSectorAlertOut:
    row = await admin_service.update_alert(session, admin, alert_id, data)
    return AdminSectorAlertOut.model_validate(row)


@router.post("/api/admin/sector-alerts/{alert_id}/review")
async def review_sector_alert(
    alert_id: uuid.UUID, admin: AdminUser, session: DBSession
) -> AdminSectorAlertOut:
    row = await admin_service.review_alert(session, admin, alert_id)
    return AdminSectorAlertOut.model_validate(row)


@router.delete("/api/admin/sector-alerts/{alert_id}", status_code=204)
async def delete_sector_alert(
    alert_id: uuid.UUID, admin: AdminUser, session: DBSession
) -> Response:
    await admin_service.delete_alert(session, admin, alert_id)
    return Response(status_code=204)


@router.get("/api/admin/country-terms")
async def list_country_terms(
    _: Admin, session: DB, hs_code: str | None = None, reviewed: bool | None = None
) -> list[CountryTermOut]:
    rows = await admin_service.list_country_terms(session, hs_code, reviewed)
    return [CountryTermOut.model_validate(r) for r in rows]


@router.post("/api/admin/country-terms", status_code=201)
async def create_country_term(data: CountryTermIn, admin: Admin, session: DB) -> CountryTermOut:
    return CountryTermOut.model_validate(
        await admin_service.create_country_term(session, admin, data)
    )


@router.patch("/api/admin/country-terms/{term_id}")
async def update_country_term(
    term_id: uuid.UUID, data: CountryTermPatch, admin: Admin, session: DB
) -> CountryTermOut:
    row = await admin_service.update_country_term(session, admin, term_id, data)
    return CountryTermOut.model_validate(row)


@router.post("/api/admin/country-terms/{term_id}/review")
async def review_country_term(term_id: uuid.UUID, admin: Admin, session: DB) -> CountryTermOut:
    return CountryTermOut.model_validate(
        await admin_service.review_country_term(session, admin, term_id)
    )


@router.delete("/api/admin/country-terms/{term_id}", status_code=204)
async def delete_country_term(term_id: uuid.UUID, admin: Admin, session: DB) -> Response:
    await admin_service.delete_country_term(session, admin, term_id)
    return Response(status_code=204)


# ── Admin: hàng đợi dòng luật sư trả "SUA" (import-review) ───────────────────
@router.get("/api/admin/compliance-review-issues")
async def list_review_issues(_: Admin, session: DB, only_open: bool = True) -> list[ReviewIssueOut]:
    rows = await review_import.list_issues(session, only_open)
    return [ReviewIssueOut.model_validate(r, from_attributes=True) for r in rows]


@router.post("/api/admin/compliance-review-issues/{issue_id}/resolve")
async def resolve_review_issue(issue_id: uuid.UUID, admin: Admin, session: DB) -> ReviewIssueOut:
    return ReviewIssueOut.model_validate(
        await review_import.resolve_issue(session, admin, issue_id), from_attributes=True
    )
