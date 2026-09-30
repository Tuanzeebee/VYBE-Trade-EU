"""Hàm thuần tariff_savings. Dữ liệu ở đây là SYNTHETIC — chỉ kiểm phép tính và quy tắc,
không phải thuế suất thật (golden test dữ liệu thật nạp từ CSV luật TM đã ký)."""

from decimal import Decimal

import pytest

from app.modules.compliance.calculators import TariffLineData, tariff_savings
from app.modules.compliance.models import DutyType

D = Decimal


def line(**over: object) -> TariffLineData:
    fields: dict[str, object] = {
        "duty_type": DutyType.ad_valorem,
        "mfn_rate": D("12.0000"),
        "evfta_rate_current": D("6.0000"),
        "quota_required": False,
        "quota_note": None,
        "condition_note": None,
    }
    fields.update(over)
    return TariffLineData(**fields)  # type: ignore[arg-type]


def test_ok_computes_duties_and_savings() -> None:
    r = tariff_savings(line(), 1, D("10000.00"), 4)
    assert r.status == "ok"
    assert (r.mfn_duty, r.evfta_duty, r.savings, r.annual_savings) == (
        D("1200.00"),
        D("600.00"),
        D("600.00"),
        D("2400.00"),
    )
    assert (r.mfn_rate, r.evfta_rate) == (D("12.0000"), D("6.0000"))


def test_annual_savings_none_without_shipments() -> None:
    assert tariff_savings(line(), 1, D("10000.00"), None).annual_savings is None


def test_zero_savings_when_both_rates_zero_is_ok_not_unsupported() -> None:
    r = tariff_savings(line(mfn_rate=D("0"), evfta_rate_current=D("0")), 1, D("5000.00"), None)
    assert (r.status, r.savings) == ("ok", D("0.00"))


@pytest.mark.parametrize(
    ("value", "mfn", "evfta", "mfn_duty", "evfta_duty", "savings"),
    [
        # 333.33 × 7.3333% = 24.4443… → 24.44 ; × 2.5% = 8.33325 → 8.33 ; tiết kiệm = 24.44 − 8.33
        (D("333.33"), D("7.3333"), D("2.5"), D("24.44"), D("8.33"), D("16.11")),
        # 0.5 điểm làm tròn LÊN (HALF_UP): 100.10 × 5% = 5.005 → 5.01
        (D("100.10"), D("5"), D("0"), D("5.01"), D("0.00"), D("5.01")),
    ],
)
def test_rounding_half_up_to_cents(
    value: Decimal,
    mfn: Decimal,
    evfta: Decimal,
    mfn_duty: Decimal,
    evfta_duty: Decimal,
    savings: Decimal,
) -> None:
    r = tariff_savings(line(mfn_rate=mfn, evfta_rate_current=evfta), 1, value, None)
    assert (r.mfn_duty, r.evfta_duty, r.savings) == (mfn_duty, evfta_duty, savings)


def test_annual_uses_rounded_savings() -> None:
    r = tariff_savings(line(mfn_rate=D("7.3333"), evfta_rate_current=D("2.5")), 1, D("333.33"), 3)
    assert r.annual_savings == D("48.33")  # 16.11 × 3


NUMBER_FIELDS = ("mfn_rate", "evfta_rate", "mfn_duty", "evfta_duty", "savings", "annual_savings")


def _assert_no_numbers(r: object) -> None:
    assert [getattr(r, f) for f in NUMBER_FIELDS] == [None] * len(NUMBER_FIELDS)


def test_unsupported_has_no_numbers() -> None:
    r = tariff_savings(None, 0, D("10000.00"), 5)
    assert r.status == "unsupported"
    _assert_no_numbers(r)


@pytest.mark.parametrize(
    "over",
    [
        {"quota_required": True, "quota_note": "TRQ"},
        {"duty_type": DutyType.specific},
        {"duty_type": DutyType.mixed},
        {"mfn_rate": None},
        {"evfta_rate_current": None},
        {
            "mfn_rate": D("3"),
            "evfta_rate_current": D("5"),
        },  # EVFTA cao hơn MFN = dữ liệu bất thường
    ],
)
def test_needs_review_has_no_numbers(over: dict[str, object]) -> None:
    r = tariff_savings(line(**over), 1, D("10000.00"), 5)
    assert r.status == "needs_review"
    _assert_no_numbers(r)


def test_more_than_one_line_needs_review() -> None:
    r = tariff_savings(line(), 2, D("10000.00"), 5)
    assert r.status == "needs_review"
    _assert_no_numbers(r)


def test_needs_review_carries_notes() -> None:
    r = tariff_savings(
        line(quota_required=True, quota_note="TRQ 80.000 t", condition_note="Cần giấy phép"),
        1,
        D("10000.00"),
        None,
    )
    assert (r.quota_note, r.condition_note) == ("TRQ 80.000 t", "Cần giấy phép")


def test_needs_review_carries_english_notes() -> None:
    r = tariff_savings(
        line(quota_required=True, quota_note_en="TRQ 80,000 t", condition_note_en="Licence needed"),
        1,
        D("10000.00"),
        None,
    )
    assert (r.quota_note_en, r.condition_note_en) == ("TRQ 80,000 t", "Licence needed")
