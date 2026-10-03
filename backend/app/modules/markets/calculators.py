"""Chỉ số và gợi ý thị trường (U16) — hàm thuần, không DB/HTTP (AGENTS.md §5.3).

Đầu vào là thống kê đã nạp (trade_flows). Mọi con số trong gợi ý đều truy được về các chuỗi này; lời
văn báo cáo (U18) chỉ tham chiếu các chỉ số ở đây.
"""

from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal, localcontext

ZERO = Decimal(0)
ONE = Decimal(1)
HUNDRED = Decimal(100)
TENTHOUSAND = Decimal(10000)
MIN_YEARS_FOR_GROWTH = 2  # khoảng cách tối thiểu (năm) để tính tăng trưởng bình quân
PRESENCE_SHARE = Decimal("0.01")  # Việt Nam đã có mặt: ≥ 1% nhập khẩu của nước đó
POTENTIAL_MAX_SHARE = Decimal("0.10")  # "tiềm năng": thị phần Việt Nam dưới 10%
LARGE_MARKETS = 10  # nhóm nước nhập khẩu nhiều nhất được xét gợi ý

Series = Mapping[int, Decimal]


@dataclass(frozen=True)
class CountrySeries:
    """Nhập khẩu của một nước theo năm, từ thế giới và từ Việt Nam: trị giá EUR và khối lượng kg."""

    country: str
    world_value: Series
    vn_value: Series
    world_kg: Series = field(default_factory=dict)
    vn_kg: Series = field(default_factory=dict)


@dataclass(frozen=True)
class CountryMetrics:
    country: str
    year: int
    import_value: Decimal  # nhập khẩu từ thế giới, năm gần nhất (EUR)
    import_cagr: Decimal | None  # tăng trưởng bình quân năm (tỷ lệ, vd 0.08 = 8%)
    vn_value: Decimal
    vn_share: Decimal  # tỷ lệ 0–1
    vn_cagr: Decimal | None
    world_unit_price: Decimal | None  # EUR/kg
    vn_unit_price: Decimal | None


@dataclass(frozen=True)
class ScoredMarket:
    metrics: CountryMetrics
    score: Decimal  # 0–100
    components: dict[str, Decimal]  # chỉ số đã chuẩn hoá 0–1 theo từng thành phần


@dataclass(frozen=True)
class Competitor:
    partner: str
    value: Decimal
    share: Decimal  # thị phần trong nhập khẩu ngoài EU của EU (0–1)
    unit_price: Decimal | None


def _q(value: Decimal, places: str = "0.0001") -> Decimal:
    return value.quantize(Decimal(places), rounding=ROUND_HALF_UP)


def cagr(series: Series) -> Decimal | None:
    """Tăng trưởng bình quân năm giữa năm đầu và cuối có trị giá dương (cách nhau ≥ 2 năm)."""
    years = sorted(y for y, v in series.items() if v is not None and v > 0)
    if len(years) < 2 or years[-1] - years[0] < MIN_YEARS_FOR_GROWTH:
        return None
    first, last = series[years[0]], series[years[-1]]
    with localcontext() as ctx:
        ctx.prec = 28
        rate = (last / first) ** (ONE / Decimal(years[-1] - years[0])) - ONE
    return _q(rate)


def _unit_price(value: Decimal | None, kg: Decimal | None) -> Decimal | None:
    if value is None or kg is None or kg <= 0:
        return None
    return _q(value / kg, "0.01")


def country_metrics(series: CountrySeries, year: int) -> CountryMetrics | None:
    """Chỉ số của một nước trong năm `year`. Không có nhập khẩu từ thế giới năm đó → None."""
    world = series.world_value.get(year)
    if world is None or world <= 0:
        return None
    vn = series.vn_value.get(year) or ZERO
    return CountryMetrics(
        country=series.country,
        year=year,
        import_value=world,
        import_cagr=cagr(series.world_value),
        vn_value=vn,
        vn_share=_q(vn / world),
        vn_cagr=cagr(series.vn_value),
        world_unit_price=_unit_price(world, series.world_kg.get(year)),
        vn_unit_price=_unit_price(vn if vn > 0 else None, series.vn_kg.get(year)),
    )


def _normalize(values: Sequence[Decimal | None]) -> list[Decimal]:
    present = [v for v in values if v is not None]
    if not present:
        return [ZERO for _ in values]
    low, high = min(present), max(present)
    if high == low:
        return [ONE if v is not None else ZERO for v in values]
    return [ZERO if v is None else _q((v - low) / (high - low)) for v in values]


def _log_size(value: Decimal) -> Decimal:
    with localcontext() as ctx:
        ctx.prec = 28
        return (value + ONE).ln()


def score_markets(
    metrics: Iterable[CountryMetrics], weights: Mapping[str, Decimal]
) -> list[ScoredMarket]:
    """Điểm 0–100 = tổng có trọng số của các thành phần chuẩn hoá min–max giữa các nước:
    size (quy mô, thang log), growth (tăng trưởng nhập khẩu), vn_share (chỗ đứng sẵn có của Việt
    Nam), vn_growth (tăng trưởng hàng Việt Nam). Trọng số là dữ liệu (data/market_weights.csv)."""
    rows = list(metrics)
    if not rows:
        return []
    columns = {
        "size": _normalize([_log_size(m.import_value) for m in rows]),
        "growth": _normalize([m.import_cagr for m in rows]),
        "vn_share": _normalize([m.vn_share for m in rows]),
        "vn_growth": _normalize([m.vn_cagr for m in rows]),
    }
    total = sum((weights.get(k, ZERO) for k in columns), ZERO)
    scored = []
    for i, m in enumerate(rows):
        components = {k: col[i] for k, col in columns.items()}
        raw = sum((components[k] * weights.get(k, ZERO) for k in columns), ZERO)
        score = _q(raw / total * HUNDRED, "0.1") if total > 0 else ZERO
        scored.append(ScoredMarket(m, score, components))
    return sorted(scored, key=lambda s: (-s.score, -s.metrics.import_value, s.metrics.country))


def recommend(
    scored: Sequence[ScoredMarket], top: int = 3, potential: int = 2
) -> tuple[list[ScoredMarket], list[ScoredMarket]]:
    """Top `top` nước tiêu thụ chính và `potential` nước tiềm năng.

    - Tiêu thụ chính: trong nhóm LARGE_MARKETS nước nhập khẩu nhiều nhất và Việt Nam đã có mặt
      (≥ 1%); xếp theo điểm.
    - Tiềm năng: cũng trong nhóm nhập khẩu nhiều nhất, Việt Nam dưới 10%; xếp theo quy mô + tăng
      trưởng.
    """
    by_size = sorted(scored, key=lambda s: (-s.metrics.import_value, s.metrics.country))
    large_names = {s.metrics.country for s in by_size[:LARGE_MARKETS]}
    large = [s for s in scored if s.metrics.country in large_names]
    main = [s for s in large if s.metrics.vn_share >= PRESENCE_SHARE][:top]
    chosen = {s.metrics.country for s in main}
    candidates = [
        s
        for s in large
        if s.metrics.country not in chosen and s.metrics.vn_share < POTENTIAL_MAX_SHARE
    ]
    candidates.sort(
        key=lambda s: (
            -(s.components["size"] + s.components["growth"]),
            -s.metrics.import_value,
            s.metrics.country,
        )
    )
    return main, candidates[:potential]


def competitor_shares(
    values: Mapping[str, Decimal], kgs: Mapping[str, Decimal], limit: int = 6
) -> tuple[list[Competitor], Decimal | None]:
    """Thị phần các nguồn cung ngoài EU vào EU (đầu vào đã loại nước EU và mã tổng hợp) và chỉ số
    tập trung HHI (0–10000) trên toàn bộ các nguồn."""
    total = sum((v for v in values.values() if v > 0), ZERO)
    if total <= 0:
        return [], None
    shares = {p: v / total for p, v in values.items() if v > 0}
    hhi = _q(sum((s * s for s in shares.values()), ZERO) * TENTHOUSAND, "1")
    ranked = sorted(shares.items(), key=lambda item: (-item[1], item[0]))
    return [
        Competitor(p, values[p], _q(share), _unit_price(values[p], kgs.get(p)))
        for p, share in ranked[:limit]
    ], hhi
