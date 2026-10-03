"""Danh bạ công khai (E1, E2). Chỉ điều phối: điều kiện "được phép hiện" nằm ở MỘT chỗ duy nhất
(companies.product_service.verified_exporter_conditions), nên không có đường nào lộ công ty
chưa xác minh.
"""

import datetime as dt
import re
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.storage import Storage
from app.modules.catalog import service as catalog
from app.modules.companies import offering_service, product_service
from app.modules.companies import service as companies
from app.modules.companies.product_service import SearchTerm
from app.modules.directory.schemas import (
    FilterOptions,
    SupplierCardOut,
    SupplierCredentialsOut,
    SupplierPage,
    VerifiedCertificateOut,
)
from app.modules.verification import evidence_service as certificates

MAX_TERMS = 6
_SEPARATORS = re.compile(r"[\s.]")


@dataclass(frozen=True)
class SupplierFilters:
    q: str = ""
    hs: str | None = None
    country: str | None = None
    category: str | None = None
    cert: str | None = None
    page: int = 1
    page_size: int = 12
    kind: str = "products"  # products | services (U10)
    service_category: str | None = None


async def search_verified(
    session: AsyncSession,
    storage: Storage,
    filters: SupplierFilters,
    now: dt.datetime | None = None,
) -> SupplierPage:
    moment = now or dt.datetime.now(dt.UTC)
    today = moment.date()
    terms = [
        SearchTerm(
            token=token,
            hs_codes=catalog.hs_codes_matching(token),
            company_ids=certificates.certified_company_ids(today, token=token),
        )
        for token in filters.q.split()[:MAX_TERMS]
    ]
    hs_prefix = _SEPARATORS.sub("", filters.hs) if filters.hs else None
    result = await product_service.search_verified_exporters(
        session,
        storage,
        terms=terms,
        hs_prefix=hs_prefix or None,
        country=filters.country.upper() if filters.country else None,
        category_codes=catalog.hs_codes_in_category(filters.category) if filters.category else None,
        certified_ids=(
            certificates.certified_company_ids(today, type_code=filters.cert)
            if filters.cert
            else None
        ),
        page=filters.page,
        page_size=filters.page_size,
        now=moment,
        kind=filters.kind,
        service_category=filters.service_category,
    )
    codes = sorted({code for card in result.items for code in card.hs_codes})
    category_of = await catalog.categories_for_codes(session, codes)
    items = [
        SupplierCardOut(
            **card.model_dump(exclude={"hs_codes", "verified_at"}),
            categories=list(
                dict.fromkeys(c for code in card.hs_codes if (c := category_of.get(code)))
            ),
        )
        for card in result.items
    ]
    return SupplierPage(
        items=items, total=result.total, page=result.page, page_size=result.page_size
    )


async def filter_options(session: AsyncSession) -> FilterOptions:
    return FilterOptions(
        categories=sorted(await catalog.list_categories(session)),
        certificates=await certificates.public_certificate_types(session),
        service_categories=[
            c.code for c in await offering_service.list_service_categories(session)
        ],
    )


async def credentials(
    session: AsyncSession, slug: str, now: dt.datetime | None = None
) -> SupplierCredentialsOut:
    """Chỉ công ty đang hiển thị công khai (cùng điều kiện với danh bạ); còn lại 404."""
    moment = now or dt.datetime.now(dt.UTC)
    company_id = await product_service.resolve_visible_company(session, slug, moment)
    if company_id is None:
        raise AppError("company_not_found", "Company not found", 404)
    state = await companies.get_verification_state(session, company_id)
    rows = await certificates.public_certificates_for(session, company_id, moment.date())
    return SupplierCredentialsOut(
        verified_at=state.verified_at,
        expires_at=state.expires_at,
        origin_evidence_complete=state.level == "evfta_verified",
        certificates=[VerifiedCertificateOut(**row) for row in rows],
        verification_tier=max(state.tier, 1),
        tier_reviewed_at=state.tier_reviewed_at or state.verified_at,
        tier_expires_at=state.tier_expires_at or state.expires_at,
    )
