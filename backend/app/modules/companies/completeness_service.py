"""Nối hàm thuần completeness.py với DB: đọc bảng trọng số, gom dữ kiện, ghi điểm vào companies."""

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
from app.modules.companies.models import Company, CompletenessWeight, Product


async def _weight_rows(session: AsyncSession, company: Company) -> list[WeightRow]:
    # Đọc mới (populate_existing): đổi trọng số có hiệu lực ngay, kể cả trong cùng phiên.
    rows = await session.scalars(
        select(CompletenessWeight)
        .where(CompletenessWeight.company_type == company.type)
        .execution_options(populate_existing=True)
    )
    return [WeightRow(r.field_key, r.group_key, r.weight, r.is_enabled) for r in rows]


def _company_facts(company: Company) -> CompanyFacts:
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
        evidence_count=0,  # C6 sẽ đếm bằng chứng đã nộp và còn hạn; dòng "evidence" đang tắt
    )


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
    facts = build_facts(_company_facts(company), await _product_facts(session, company))
    return compute_score(facts, await _weight_rows(session, company))


async def refresh_score(session: AsyncSession, company: Company) -> None:
    """Ghi điểm mới vào companies.profile_completeness_score, cùng transaction với thay đổi."""
    company.profile_completeness_score = (await compute_for(session, company)).score
