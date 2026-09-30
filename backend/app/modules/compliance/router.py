import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, UploadFile
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.spreadsheet import ImportResult, read_upload, xlsx_response
from app.core.storage import Storage, get_storage
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import get_optional_user, require_role
from app.modules.compliance import admin_service, admin_spreadsheet, documents, service
from app.modules.compliance.admin_schemas import (
    CountryTermIn,
    CountryTermOut,
    CountryTermPatch,
    RooRuleIn,
    RooRuleOut,
    RooRulePatch,
    TariffLineIn,
    TariffLineOut,
    TariffLinePatch,
)
from app.modules.compliance.schemas import (
    DocumentOut,
    Eur1In,
    RooIn,
    RooOut,
    TariffIn,
    TariffOut,
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
) -> TariffOut:
    return await service.calculate_tariff(session, data, user)


@router.post("/api/public/roo")
async def calculate_roo(
    data: RooIn,
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> RooOut:
    return await service.calculate_roo(session, data, user)


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
