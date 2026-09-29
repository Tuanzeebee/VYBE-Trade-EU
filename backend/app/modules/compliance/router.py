import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import get_optional_user, require_role
from app.modules.compliance import admin_service, service
from app.modules.compliance.admin_schemas import (
    RooRuleIn,
    RooRuleOut,
    RooRulePatch,
    TariffLineIn,
    TariffLineOut,
    TariffLinePatch,
)
from app.modules.compliance.schemas import RooIn, RooOut, TariffIn, TariffOut

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
