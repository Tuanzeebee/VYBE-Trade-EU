"""Luật kiểm chéo (U22): gom dữ kiện hồ sơ của công ty rồi áp hàm thuần consistency.evaluate().
Kết quả là cờ cho admin / gợi ý cho chủ hồ sơ — không đổi trạng thái xác minh."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import product_service
from app.modules.companies import service as companies
from app.modules.verification import extraction_service
from app.modules.verification.consistency import ConsistencyFacts, evaluate
from app.modules.verification.models import ApprovalStatus, Evidence
from app.modules.verification.schemas import FindingOut


async def findings_for(session: AsyncSession, company_id: uuid.UUID) -> list[FindingOut]:
    company = await companies.get_company_for_review(session, company_id)
    evidence_types = set(
        await session.scalars(
            select(Evidence.type_code).where(
                Evidence.company_id == company_id,
                Evidence.approval_status != ApprovalStatus.rejected,
            )
        )
    )
    facts = ConsistencyFacts(
        industry=company.industry_sector,
        product_hs=await product_service.list_active_hs_codes(session, company_id),
        facility_code_types={f.code_type for f in company.facility_codes},
        export_markets=list(company.export_markets),
        evidence_types=evidence_types,
        registered_address=company.address,
        extracted_addresses=await extraction_service.extracted_addresses(session, company_id),
    )
    return [
        FindingOut(
            code=f.code,
            severity=f.severity,
            owner_visible=f.owner_visible,
            message_vi=f.message_vi,
            message_en=f.message_en,
        )
        for f in evaluate(facts)
    ]


async def my_hints(session: AsyncSession, user: CurrentUser) -> list[FindingOut]:
    if user.role != "exporter":
        raise AppError("forbidden", "Not allowed for this role", 403)
    company_id = await companies.get_company_id(session, user.id)
    if company_id is None:
        raise AppError("company_not_found", "Company profile not created yet", 404)
    return [f for f in await findings_for(session, company_id) if f.owner_visible]
