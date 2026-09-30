"""rank_markets: hàm thuần. Golden theo file EVFTA_20_ma_da_xac_minh (tôm 03061792, lô 100.000 EUR)."""

from decimal import Decimal
from typing import Any

import pytest

from app.modules.compliance.calculators import (
    EU_MEMBERS,
    CountryTerms,
    MarketRanking,
    TariffLineData,
    rank_markets,
)
from app.modules.compliance.models import DutyType

VALUE = Decimal("100000")
TERMS = (
    CountryTerms("DE", Decimal("7"), "de"),
    CountryTerms("FR", Decimal("5.5"), "fr"),
    CountryTerms("NL", Decimal("9"), "nl"),
)
NUMBER_FIELDS = ("rank", "duty", "vat_rate", "vat", "total")


def line(mfn: str = "12", evfta: str = "0", **over: Any) -> TariffLineData:
    fields: dict[str, Any] = {
        "duty_type": DutyType.ad_valorem,
        "mfn_rate": Decimal(mfn),
        "evfta_rate_current": Decimal(evfta),
        "quota_required": False,
        "quota_note": None,
        "condition_note": None,
    }
    fields.update(over)
    return TariffLineData(**fields)


def totals(result: MarketRanking) -> dict[str, str]:
    return {r.country: str(r.total) for r in result.rows if r.status == "ranked"}


WITH_CO = {"DE": "7000.00", "FR": "5500.00", "NL": "9000.00"}
WITHOUT_CO = {"DE": "19840.00", "FR": "18160.00", "NL": "22080.00"}


@pytest.mark.parametrize(
    ("roo", "basis", "expected"),
    [
        ("pass", "evfta", WITH_CO),
        ("fail", "mfn", WITHOUT_CO),
        ("inconclusive", "mfn", WITHOUT_CO),
        (None, "mfn", WITHOUT_CO),
    ],
)
def test_golden_shrimp(roo: str | None, basis: str, expected: dict[str, str]) -> None:
    result = rank_markets(line(), 1, VALUE, roo, TERMS)
    assert (result.status, result.basis) == ("ok", basis)
    assert totals(result) == expected


def test_ranked_ascending_then_no_data_last_without_numbers() -> None:
    result = rank_markets(line(), 1, VALUE, "pass", TERMS)
    assert [r.country for r in result.rows[:3]] == ["FR", "DE", "NL"]
    assert [r.rank for r in result.rows[:3]] == [1, 2, 3]
    rest = result.rows[3:]
    assert len(result.rows) == len(EU_MEMBERS) == 27
    assert [r.country for r in rest] == sorted(EU_MEMBERS - {"DE", "FR", "NL"})
    for row in rest:
        assert row.status == "no_data"
        assert all(getattr(row, f) is None for f in NUMBER_FIELDS)


def test_vat_base_includes_duty() -> None:
    row = rank_markets(line(), 1, VALUE, "fail", TERMS).rows[1]  # DE (FR đứng trước)
    assert (row.country, str(row.duty), str(row.vat), str(row.total)) == (
        "DE",
        "12000.00",
        "7840.00",
        "19840.00",
    )


def test_tie_breaks_by_country_code() -> None:
    terms = (CountryTerms("NL", Decimal("7")), CountryTerms("DE", Decimal("7")))
    assert [r.country for r in rank_markets(line(), 1, VALUE, None, terms).rows[:2]] == ["DE", "NL"]


@pytest.mark.parametrize("value", ["0.01", "999999999999.99"])
def test_extreme_values_stay_exact(value: str) -> None:
    result = rank_markets(line(), 1, Decimal(value), "fail", TERMS)
    assert result.status == "ok"
    assert all(r.total is not None and r.total >= 0 for r in result.rows if r.status == "ranked")


@pytest.mark.parametrize(
    ("data", "found", "status"),
    [
        (None, 0, "unsupported"),
        (line(quota_required=True), 1, "needs_review"),
        (line(duty_type=DutyType.mixed), 1, "needs_review"),
        (line(), 2, "needs_review"),
    ],
)
def test_not_ok_has_no_rows_or_numbers(
    data: TariffLineData | None, found: int, status: str
) -> None:
    result = rank_markets(data, found, VALUE, "pass", TERMS)
    assert (result.status, result.basis, result.duty_rate, result.rows) == (status, None, None, ())
