"""U16: chỉ số thị trường — hàm thuần, số liệu SYNTHETIC (không phải thống kê thật)."""

from decimal import Decimal

from app.modules.markets.calculators import (
    CountrySeries,
    cagr,
    competitor_shares,
    country_metrics,
    recommend,
    score_markets,
)

D = Decimal
WEIGHTS = {"size": D("0.35"), "growth": D("0.25"), "vn_share": D("0.25"), "vn_growth": D("0.15")}


def test_cagr_needs_two_years_apart_and_positive_values() -> None:
    assert cagr({2020: D(100), 2023: D(133.1)}) == D("0.1000")
    assert cagr({2024: D(100), 2025: D(200)}) is None  # chỉ cách 1 năm
    assert cagr({2020: D(0), 2021: D(50), 2023: D(200)}) == D("1.0000")  # bỏ năm bằng 0
    assert cagr({}) is None


def test_country_metrics_share_and_unit_prices() -> None:
    series = CountrySeries(
        "DE",
        world_value={2023: D(800), 2025: D(1000)},
        vn_value={2023: D(400), 2025: D(600)},
        world_kg={2025: D(400)},
        vn_kg={2025: D(200)},
    )
    m = country_metrics(series, 2025)
    assert m is not None
    assert (m.import_value, m.vn_share) == (D(1000), D("0.6000"))
    assert (m.world_unit_price, m.vn_unit_price) == (D("2.50"), D("3.00"))
    assert m.import_cagr == D("0.1180")
    assert country_metrics(series, 2024) is None


def _series(country: str, world: tuple[int, int], vn: tuple[int, int]) -> CountrySeries:
    return CountrySeries(
        country, {2021: D(world[0]), 2025: D(world[1])}, {2021: D(vn[0]), 2025: D(vn[1])}
    )


def test_recommendation_top_markets_need_presence_and_potential_markets_have_low_share() -> None:
    data = [
        _series("NL", (900, 1000), (500, 700)),  # lớn, Việt Nam mạnh
        _series("DE", (700, 900), (300, 500)),
        _series("FR", (400, 500), (100, 150)),
        # lớn, tăng nhanh, Việt Nam gần như chưa có → tiềm năng
        _series("ES", (800, 1200), (2, 5)),
        _series("IT", (500, 600), (0, 0)),  # chưa có hàng Việt Nam
        _series("MT", (10, 12), (1, 2)),  # quá nhỏ
    ]
    metrics = [m for s in data if (m := country_metrics(s, 2025))]
    scored = score_markets(metrics, WEIGHTS)
    assert all(D(0) <= s.score <= D(100) for s in scored)
    main, potential = recommend(scored)
    # DE xếp trên NL dù nhỏ hơn: tăng trưởng nhập khẩu và hàng Việt Nam nhanh hơn.
    assert [s.metrics.country for s in main] == ["DE", "NL", "FR"]
    assert [s.metrics.country for s in potential] == ["ES", "IT"]
    assert "MT" not in {s.metrics.country for s in potential}  # dưới trung vị quy mô


def test_scores_are_deterministic_and_handle_missing_growth() -> None:
    one = CountrySeries("DE", {2025: D(100)}, {2025: D(10)})
    other = CountrySeries("FR", {2025: D(50)}, {2025: D(0)})
    scored = score_markets([country_metrics(one, 2025), country_metrics(other, 2025)], WEIGHTS)  # type: ignore[list-item]
    assert [s.metrics.country for s in scored] == ["DE", "FR"]
    assert scored[0].metrics.import_cagr is None
    assert score_markets([], WEIGHTS) == []


def test_competitor_shares_and_hhi() -> None:
    competitors, hhi = competitor_shares(
        {"EC": D(600), "IN": D(300), "VN": D(100)}, {"EC": D(100), "VN": D(20)}
    )
    assert [(c.partner, c.share) for c in competitors] == [
        ("EC", D("0.6000")),
        ("IN", D("0.3000")),
        ("VN", D("0.1000")),
    ]
    assert competitors[0].unit_price == D("6.00") and competitors[1].unit_price is None
    assert hhi == D("4600")  # 0.36 + 0.09 + 0.01 = 0.46 → 4600
    assert competitor_shares({}, {}) == ([], None)
