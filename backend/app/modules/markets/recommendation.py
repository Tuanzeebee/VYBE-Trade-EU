"""Gợi ý thị trường EU cho một sản phẩm (U16): đọc thống kê đã nạp, gọi hàm thuần trong calculators.

Từ khoá (vd "cá tra") → họ sản phẩm (danh sách mã HS trong data/trade_priority_products.csv) → tổng
nhập khẩu theo nước → chỉ số → top 3 nước tiêu thụ + 2 nước tiềm năng, mỗi nước có lý do bằng số.
"""

import csv
import datetime as dt
import io
import unicodedata
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.modules.markets.calculators import (
    CountrySeries,
    ScoredMarket,
    competitor_shares,
    country_metrics,
    recommend,
    score_markets,
)
from app.modules.markets.models import TradeFlow
from app.modules.markets.schemas import (
    CompetitorOut,
    FamilyOut,
    MarketOut,
    MarketRecommendationOut,
    PricePointOut,
    PriceReferenceOut,
    PriorityProductOut,
    ReasonOut,
)
from app.modules.markets.service import (
    EU_AGGREGATE,
    EU_MEMBERS,
    VIETNAM,
    WORLD,
    load_priority_products,
)

WEIGHTS_CSV = Path(__file__).resolve().parents[3] / "data" / "market_weights.csv"
SOURCE_PREFERENCE = ("eurostat_comext", "curated")
SOURCE_LABEL = "Eurostat Comext (DS-045409)"


def load_weights(path: Path = WEIGHTS_CSV) -> dict[str, Decimal]:
    lines = [
        line
        for line in path.read_text(encoding="utf-8-sig").splitlines()
        if line.strip() and not line.startswith("#")
    ]
    return {
        row["metric"].strip(): Decimal(row["weight"].strip())
        for row in csv.DictReader(io.StringIO("\n".join(lines)))
    }


def fold(text: str) -> str:
    decomposed = unicodedata.normalize("NFD", text.lower().replace("đ", "d"))
    return " ".join("".join(c for c in decomposed if not unicodedata.combining(c)).split())


def families(products: list[PriorityProductOut]) -> list[FamilyOut]:
    grouped: dict[str, list[PriorityProductOut]] = defaultdict(list)
    for p in products:
        grouped[p.family].append(p)
    return [
        FamilyOut(
            family=family,
            name_vi=rows[0].name_vi,
            name_en=rows[0].name_en,
            products=[r.hs_code for r in rows],
        )
        for family, rows in grouped.items()
    ]


def resolve_family(query: str, hs: str | None) -> FamilyOut | None:
    """Mã HS (có trong danh sách hoặc bất kỳ) hoặc từ khoá khớp dài nhất trong danh sách ưu tiên."""
    products = load_priority_products()
    all_families = families(products)
    if hs:
        for family in all_families:
            if hs in family.products:
                return family
        return FamilyOut(family=hs, name_vi=hs, name_en=hs, products=[hs])
    needle = fold(query)
    if not needle:
        return None
    best: tuple[int, str] | None = None
    for p in products:
        for keyword in p.keywords:
            folded = fold(keyword)
            if folded and (folded in needle or needle in folded):
                if best is None or len(folded) > best[0]:
                    best = (len(folded), p.family)
    if best is None:
        return None
    return next(f for f in all_families if f.family == best[1])


def _extra_eu_partner(code: str) -> bool:
    return len(code) == 2 and code.isalpha() and code not in EU_MEMBERS


def _market_out(scored: ScoredMarket, reasons: list[ReasonOut]) -> MarketOut:
    m = scored.metrics
    return MarketOut(
        country=m.country,
        score=scored.score,
        import_value=m.import_value,
        import_cagr=m.import_cagr,
        vn_value=m.vn_value,
        vn_share=m.vn_share,
        vn_cagr=m.vn_cagr,
        world_unit_price=m.world_unit_price,
        vn_unit_price=m.vn_unit_price,
        reasons=reasons,
    )


def _main_reasons(s: ScoredMarket) -> list[ReasonOut]:
    m = s.metrics
    reasons = [
        ReasonOut(code="import_size", value=m.import_value, year=m.year),
        ReasonOut(code="vn_share", value=m.vn_share, year=m.year),
    ]
    if m.import_cagr is not None:
        reasons.append(ReasonOut(code="growth", value=m.import_cagr))
    if m.vn_cagr is not None:
        reasons.append(ReasonOut(code="vn_growth", value=m.vn_cagr))
    if m.vn_unit_price and m.world_unit_price and m.vn_unit_price > m.world_unit_price:
        reasons.append(ReasonOut(code="price_premium", value=m.vn_unit_price / m.world_unit_price))
    return reasons


def _potential_reasons(s: ScoredMarket) -> list[ReasonOut]:
    m = s.metrics
    reasons = [ReasonOut(code="import_size", value=m.import_value, year=m.year)]
    if m.import_cagr is not None:
        reasons.append(ReasonOut(code="growth", value=m.import_cagr))
    reasons.append(ReasonOut(code="low_vn_share", value=m.vn_share, year=m.year))
    return reasons


async def _source_for(session: AsyncSession, products: list[str]) -> str | None:
    for source in SOURCE_PREFERENCE:
        found = await session.scalar(
            select(TradeFlow.id)
            .where(TradeFlow.source == source, TradeFlow.product.in_(products))
            .limit(1)
        )
        if found is not None:
            return source
    return None


async def market_recommendation(
    session: AsyncSession, query: str = "", hs: str | None = None
) -> MarketRecommendationOut:
    if not query.strip() and not hs:
        raise AppError("query_required", "Enter a product name or an HS code", 422)
    family = resolve_family(query, hs)
    weights = load_weights()
    empty = MarketRecommendationOut(
        status="no_data",
        query=query or hs or "",
        family=family,
        year=None,
        source=SOURCE_LABEL,
        retrieved_at=None,
        top_markets=[],
        potential_markets=[],
        countries=[],
        competitors=[],
        vn_extra_eu_share=None,
        vn_rank=None,
        hhi=None,
        weights=weights,
        suggestions=families(load_priority_products()),
    )
    if family is None:
        return empty
    source = await _source_for(session, family.products)
    if source is None:
        return empty
    base = (TradeFlow.source == source, TradeFlow.product.in_(family.products))
    rows = (
        await session.execute(
            select(
                TradeFlow.reporter,
                TradeFlow.partner,
                TradeFlow.year,
                func.sum(TradeFlow.value_eur),
                func.sum(TradeFlow.quantity_kg),
            )
            .where(
                *base,
                TradeFlow.flow == "import",
                TradeFlow.reporter.in_(EU_MEMBERS),
                TradeFlow.partner.in_((WORLD, VIETNAM)),
            )
            .group_by(TradeFlow.reporter, TradeFlow.partner, TradeFlow.year)
        )
    ).all()
    if not rows:
        return empty
    year = max(r[2] for r in rows if r[1] == WORLD and r[3])
    series: dict[str, dict[str, dict[int, Decimal]]] = defaultdict(
        lambda: {"wv": {}, "wk": {}, "vv": {}, "vk": {}}
    )
    for reporter, partner, row_year, value, kg in rows:
        bucket = series[reporter]
        if partner == WORLD:
            if value is not None:
                bucket["wv"][row_year] = value
            if kg is not None:
                bucket["wk"][row_year] = kg
        else:
            if value is not None:
                bucket["vv"][row_year] = value
            if kg is not None:
                bucket["vk"][row_year] = kg
    metrics = [
        m
        for country, b in series.items()
        if (m := country_metrics(CountrySeries(country, b["wv"], b["vv"], b["wk"], b["vk"]), year))
    ]
    scored = score_markets(metrics, weights)
    main, potential = recommend(scored)

    partner_rows = (
        await session.execute(
            select(
                TradeFlow.partner, func.sum(TradeFlow.value_eur), func.sum(TradeFlow.quantity_kg)
            )
            .where(
                *base,
                TradeFlow.flow == "import",
                TradeFlow.reporter == EU_AGGREGATE,
                TradeFlow.year == year,
            )
            .group_by(TradeFlow.partner)
        )
    ).all()
    values = {p: v for p, v, _ in partner_rows if v is not None and _extra_eu_partner(p)}
    kgs = {p: k for p, _, k in partner_rows if k is not None and _extra_eu_partner(p)}
    competitors, hhi = competitor_shares(values, kgs)
    ranked = sorted(values, key=lambda p: (-values[p], p))
    all_shares, _ = competitor_shares(values, kgs, limit=len(values))
    vn_share = next((c.share for c in all_shares if c.partner == VIETNAM), None)
    retrieved = await session.scalar(select(func.max(TradeFlow.updated_at)).where(*base))
    return MarketRecommendationOut(
        status="ok",
        query=query or hs or "",
        family=family,
        year=year,
        source=SOURCE_LABEL if source == "eurostat_comext" else source,
        retrieved_at=retrieved if isinstance(retrieved, dt.datetime) else None,
        top_markets=[_market_out(s, _main_reasons(s)) for s in main],
        potential_markets=[_market_out(s, _potential_reasons(s)) for s in potential],
        countries=[_market_out(s, []) for s in scored],
        competitors=[
            CompetitorOut(partner=c.partner, value=c.value, share=c.share, unit_price=c.unit_price)
            for c in competitors
        ],
        vn_extra_eu_share=vn_share,
        vn_rank=ranked.index(VIETNAM) + 1 if VIETNAM in values else None,
        hhi=hhi,
        weights=weights,
    )


async def price_reference(session: AsyncSession, hs: str) -> PriceReferenceOut:
    """Đơn giá nhập khẩu vào EU (năm gần nhất) từ Việt Nam, trung bình ngoài EU và 3 đối thủ lớn
    nhất. Mã 8 số dùng nhóm 6 số (thống kê theo HS6). Không có dữ liệu → no_data, không đoán."""
    code = hs[:6]
    empty = PriceReferenceOut(
        status="no_data",
        hs_code=code,
        year=None,
        source=SOURCE_LABEL,
        vietnam=None,
        extra_eu_average=None,
    )
    source = await _source_for(session, [code])
    if source is None:
        return empty
    base = (
        TradeFlow.source == source,
        TradeFlow.product == code,
        TradeFlow.flow == "import",
        TradeFlow.reporter == EU_AGGREGATE,
    )
    year = await session.scalar(
        select(func.max(TradeFlow.year)).where(*base, TradeFlow.quantity_kg > 0)
    )
    if year is None:
        return empty
    rows = (
        await session.execute(
            select(TradeFlow.partner, TradeFlow.value_eur, TradeFlow.quantity_kg).where(
                *base, TradeFlow.year == year, TradeFlow.quantity_kg > 0
            )
        )
    ).all()

    def point(partner: str, value: Decimal, kg: Decimal) -> PricePointOut:
        return PricePointOut(
            partner=partner, unit_price=(value / kg).quantize(Decimal("0.01")), value=value
        )

    points = {p: point(p, v, k) for p, v, k in rows if v is not None and k}
    competitors = sorted(
        (pt for p, pt in points.items() if _extra_eu_partner(p) and p != VIETNAM),
        key=lambda pt: (-pt.value, pt.partner),
    )[:3]
    return PriceReferenceOut(
        status="ok" if points else "no_data",
        hs_code=code,
        year=year,
        source=SOURCE_LABEL if source == "eurostat_comext" else source,
        vietnam=points.get(VIETNAM),
        extra_eu_average=points.get("EXT_EU27_2020"),
        competitors=competitors,
    )
