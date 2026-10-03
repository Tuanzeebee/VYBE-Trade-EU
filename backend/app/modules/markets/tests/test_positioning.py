"""N5: điểm định vị và năng lực — hàm thuần."""

from decimal import Decimal

from app.modules.markets.positioning import CapacityInput, score


def test_empty_capacity_scores_zero() -> None:
    r = score(CapacityInput(None, 0, False, False, False))
    assert r.score == Decimal("0.0")
    assert set(r.axes) == {"volume", "certification", "trust", "experience"}


def test_axes_are_bounded_0_to_100() -> None:
    r = score(CapacityInput(Decimal("10000000"), 50, True, True, True))
    assert all(Decimal(0) <= v <= Decimal(100) for v in r.axes.values())
    assert r.score == Decimal("100.0")


def test_verified_and_certified_beats_unverified() -> None:
    low = score(CapacityInput(Decimal("100"), 0, False, False, False))
    high = score(CapacityInput(Decimal("100"), 3, True, True, False))
    assert high.score > low.score


def test_known_values() -> None:
    r = score(CapacityInput(Decimal("500"), 1, True, True, False))
    assert r.axes == {
        "volume": Decimal("50.0"),
        "certification": Decimal("33.3"),
        "trust": Decimal("100.0"),
        "experience": Decimal("50.0"),
    }
    assert r.score == Decimal("58.3")
