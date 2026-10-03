"""U8: máy trạng thái báo giá và số tiền — hàm thuần, không DB."""

import datetime as dt
from decimal import Decimal

import pytest

from app.modules.messaging.quote_logic import (
    EXPIRED,
    BalanceTerms,
    QuoteStatus,
    amounts,
    effective_status,
    terms_error,
    transition_error,
    validity_error,
)

TODAY = dt.date(2026, 10, 1)
LATER = TODAY + dt.timedelta(days=10)


@pytest.mark.parametrize(
    ("current", "target", "actor", "expected"),
    [
        (QuoteStatus.sent, QuoteStatus.accepted, "buyer", None),
        (QuoteStatus.sent, QuoteStatus.declined, "buyer", None),
        (QuoteStatus.sent, QuoteStatus.withdrawn, "exporter", None),
        (QuoteStatus.sent, QuoteStatus.superseded, "exporter", None),
        (QuoteStatus.sent, QuoteStatus.accepted, "exporter", "forbidden"),
        (QuoteStatus.sent, QuoteStatus.withdrawn, "buyer", "forbidden"),
        (QuoteStatus.accepted, QuoteStatus.declined, "buyer", "invalid_quote_transition"),
        (QuoteStatus.declined, QuoteStatus.accepted, "buyer", "invalid_quote_transition"),
        (QuoteStatus.withdrawn, QuoteStatus.accepted, "buyer", "invalid_quote_transition"),
        (QuoteStatus.superseded, QuoteStatus.accepted, "buyer", "invalid_quote_transition"),
        (QuoteStatus.accepted, QuoteStatus.withdrawn, "exporter", "invalid_quote_transition"),
    ],
)
def test_transitions(
    current: QuoteStatus, target: QuoteStatus, actor: str, expected: str | None
) -> None:
    assert transition_error(current, target, actor, LATER, TODAY) == expected


def test_expired_quote_cannot_be_accepted_but_can_be_declined_or_withdrawn() -> None:
    yesterday = TODAY - dt.timedelta(days=1)
    assert effective_status(QuoteStatus.sent, yesterday, TODAY) == EXPIRED
    assert effective_status(QuoteStatus.sent, TODAY, TODAY) == "sent"  # còn hiệu lực hết hôm nay
    assert effective_status(QuoteStatus.accepted, yesterday, TODAY) == "accepted"
    args = (yesterday, TODAY)
    assert transition_error(QuoteStatus.sent, QuoteStatus.accepted, "buyer", *args) == (
        "quote_expired"
    )
    assert transition_error(QuoteStatus.sent, QuoteStatus.declined, "buyer", *args) is None
    assert transition_error(QuoteStatus.sent, QuoteStatus.withdrawn, "exporter", *args) is None


@pytest.mark.parametrize(
    ("deposit", "balance", "expected"),
    [
        (30, BalanceTerms.tt_before_shipment, None),
        (50, BalanceTerms.against_bl_copy, None),
        (0, BalanceTerms.lc_at_sight, None),
        (100, BalanceTerms.none, None),
        (100, BalanceTerms.tt_before_shipment, "balance_terms_mismatch"),
        (30, BalanceTerms.none, "balance_terms_mismatch"),
        (101, BalanceTerms.none, "invalid_deposit"),
        (-1, BalanceTerms.lc_at_sight, "invalid_deposit"),
    ],
)
def test_payment_terms(deposit: int, balance: BalanceTerms, expected: str | None) -> None:
    assert terms_error(deposit, balance) == expected


def test_validity_window() -> None:
    assert validity_error(TODAY, TODAY) is None
    assert validity_error(TODAY - dt.timedelta(days=1), TODAY) == "valid_until_in_past"
    assert validity_error(TODAY + dt.timedelta(days=180), TODAY) is None
    assert validity_error(TODAY + dt.timedelta(days=181), TODAY) == "valid_until_too_far"


@pytest.mark.parametrize(
    ("price", "quantity", "deposit", "total", "deposit_amount"),
    [
        ("2.35", "500.50", 30, "1176.18", "352.85"),  # 1176.175 → 1176.18 (half-up)
        ("2.10", "20000", 100, "42000.00", "42000.00"),
        ("1.99", "3", 0, "5.97", "0.00"),
        ("0.01", "0.50", 50, "0.01", "0.01"),  # 0.005 → 0.01; cọc 0.005 → 0.01
    ],
)
def test_amounts_use_decimal_half_up(
    price: str, quantity: str, deposit: int, total: str, deposit_amount: str
) -> None:
    got = amounts(Decimal(price), Decimal(quantity), deposit)
    assert got == (Decimal(total), Decimal(deposit_amount))
