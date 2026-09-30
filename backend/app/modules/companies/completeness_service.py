"""Nối hàm thuần completeness.py với DB: đọc bảng trọng số, gom dữ kiện, ghi điểm vào companies."""

import uuid
from collections.abc import Awaitable, Callable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.completeness import (
    CompanyFacts,
    CompletenessResult,
    ProductFacts,
    WeightRow,
    build_facts,
    compute_score,
)
from app.modules.companies.models import (
    Company,
    CompanyServiceOffering,
    CompletenessWeight,
    Product,
)

# Số bằng chứng đã nộp và còn hạn do module verification cung cấp (đảo phụ thuộc: companies không
# import verification). verification đăng ký ở lúc import; chưa đăng ký thì coi như 0.
EvidenceCounter = Callable[[AsyncSession, uuid.UUID], Awaitable[int]]
_evidence_counter: EvidenceCounter | None = None


def register_evidence_counter(counter: EvidenceCounter) -> None:
    global _evidence_counter
    _evidence_counter = counter


async def _weight_rows(session: AsyncSession, company: Company) -> list[WeightRow]:
    # Đọc mới (populate_existing): đổi trọng số có hiệu lực ngay, kể cả trong cùng phiên.
    rows = await session.scalars(
        select(CompletenessWeight)
        .where(CompletenessWeight.company_type == company.type)
        .execution_options(populate_existing=True)
    )
    return [WeightRow(r.field_key, r.group_key, r.weight, r.is_enabled) for r in rows]


def _company_facts(
    company: Company, evidence_count: int, services: list[CompanyServiceOffering]
) -> CompanyFacts:
    return CompanyFacts(
        type=company.type.value,
        country=company.country,
        tax_id=company.tax_id,
        business_type=company.business_type,
        founded_year=company.founded_year,
        address=company.address,
        description_vi=company.description_vi,
        description_en=company.description_en,
        website=company.website,
        logo_key=company.logo_key,
        industry_sector=company.industry_sector,
        company_size=company.company_size,
        procurement_estimate=company.procurement_estimate,
        vat_number=company.vat_number,
        eori_number=company.eori_number,
        export_markets=[m.market for m in company.export_markets],
        languages=[lang.lang for lang in company.languages],
        sourcing_categories=[c.category for c in company.sourcing_categories],
        evidence_count=evidence_count,
        offering_type=company.offering_type,
        service_count=len(services),
        service_description_max=max(
            (
                max(len((s.description_vi or "").strip()), len((s.description_en or "").strip()))
                for s in services
            ),
            default=0,
        ),
    )


async def _active_services(session: AsyncSession, company: Company) -> list[CompanyServiceOffering]:
    rows = await session.scalars(
        select(CompanyServiceOffering).where(
            CompanyServiceOffering.company_id == company.id,
            CompanyServiceOffering.is_active.is_(True),
        )
    )
    return list(rows)


async def _product_facts(session: AsyncSession, company: Company) -> list[ProductFacts]:
    """Chỉ sản phẩm đang bật — sản phẩm ẩn không giúp buyer tìm thấy."""
    products = await session.scalars(
        select(Product).where(Product.company_id == company.id, Product.is_active.is_(True))
    )
    return [
        ProductFacts(
            has_image=len(p.images) > 0,
            description_length=max(
                len((p.description_vi or "").strip()), len((p.description_en or "").strip())
            ),
            has_price=p.price_min is not None or p.price_max is not None,
        )
        for p in products
    ]


async def compute_for(session: AsyncSession, company: Company) -> CompletenessResult:
    evidence_count = await _evidence_counter(session, company.id) if _evidence_counter else 0
    facts = build_facts(
        _company_facts(company, evidence_count, await _active_services(session, company)),
        await _product_facts(session, company),
    )
    return compute_score(facts, await _weight_rows(session, company))


async def refresh_score(session: AsyncSession, company: Company) -> None:
    """Ghi điểm mới vào companies.profile_completeness_score, cùng transaction với thay đổi."""
    company.profile_completeness_score = (await compute_for(session, company)).score
