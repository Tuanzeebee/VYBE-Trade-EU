"""N5: hướng bán quyết định ngân sách nào bắt buộc."""

from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.modules.markets.orientation import SalesOrientation, budget_kind, budget_required
from app.modules.markets.schemas import ReportIn


@pytest.mark.parametrize(
    ("orientation", "kind", "required"),
    [
        ("bulk", "sales", False),
        ("oem", "sales", False),
        ("other", "sales", False),
        ("own_brand", "brand", True),
    ],
)
def test_budget_rules(orientation: SalesOrientation, kind: str, required: bool) -> None:
    assert budget_kind(orientation) == kind
    assert budget_required(orientation) is required


def test_legacy_payload_still_valid() -> None:
    ReportIn(q="gạo")  # không có hướng bán → như cũ


def test_orientation_requires_revenue() -> None:
    with pytest.raises(ValidationError):
        ReportIn(q="gạo", target_market="DE", sales_orientation="bulk")


def test_orientation_requires_target_market() -> None:
    with pytest.raises(ValidationError):
        ReportIn(q="gạo", sales_orientation="bulk", expected_revenue=Decimal("1000"))


def test_own_brand_requires_budget() -> None:
    with pytest.raises(ValidationError):
        ReportIn(q="gạo", sales_orientation="own_brand", expected_revenue=Decimal("100000"))
    ok = ReportIn(
        q="gạo",
        target_market="DE",
        sales_orientation="own_brand",
        expected_revenue=Decimal("100000"),
        budget=Decimal("5000"),
    )
    assert ok.budget == Decimal("5000")


def test_other_orientation_requires_text() -> None:
    with pytest.raises(ValidationError):
        ReportIn(q="gạo", sales_orientation="other", expected_revenue=Decimal("1"))
    ok = ReportIn(
        q="gạo",
        target_market="DE",
        sales_orientation="other",
        other_text="Bán cho nhà máy",
        expected_revenue=Decimal("1"),
    )
    assert ok.other_text == "Bán cho nhà máy"


def test_zero_revenue_is_rejected_when_orientation_given() -> None:
    with pytest.raises(ValidationError):
        ReportIn(
            q="gạo", target_market="DE", sales_orientation="bulk", expected_revenue=Decimal("0")
        )


@pytest.mark.parametrize("market", ["DE", "EU"])
def test_target_market_accepts_country_or_eu(market: str) -> None:
    assert ReportIn(q="gạo", target_market=market).target_market == market


@pytest.mark.parametrize("market", ["de", "Germany", "E", "EUU"])
def test_target_market_rejects_other_shapes(market: str) -> None:
    with pytest.raises(ValidationError):
        ReportIn(q="gạo", target_market=market)
