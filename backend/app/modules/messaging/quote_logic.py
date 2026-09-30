"""Báo giá RFQ (U8) — hàm thuần: máy trạng thái, điều khoản thanh toán, số tiền.

Không đụng DB. Báo giá "sent" quá hạn hiệu lực được coi là "expired" khi đọc (không cần job).
"""

import datetime as dt
from decimal import ROUND_HALF_UP, Decimal
from enum import StrEnum


class QuoteStatus(StrEnum):
    sent = "sent"
    accepted = "accepted"
    declined = "declined"
    withdrawn = "withdrawn"
    superseded = "superseded"  # seller gửi báo giá mới thay thế


class BalanceTerms(StrEnum):
    """Điều khoản cho phần còn lại sau đặt cọc."""

    tt_before_shipment = "tt_before_shipment"  # T/T trước khi giao hàng
    against_bl_copy = "against_bl_copy"  # T/T khi nhận bản sao vận đơn
    lc_at_sight = "lc_at_sight"  # L/C trả ngay
    none = "none"  # đã đặt cọc 100%


EXPIRED = "expired"
MAX_VALIDITY_DAYS = 180

# (trạng thái hiện tại, trạng thái đích) → vai trò được phép.
_ALLOWED: dict[tuple[QuoteStatus, QuoteStatus], str] = {
    (QuoteStatus.sent, QuoteStatus.accepted): "buyer",
    (QuoteStatus.sent, QuoteStatus.declined): "buyer",
    (QuoteStatus.sent, QuoteStatus.withdrawn): "exporter",
    (QuoteStatus.sent, QuoteStatus.superseded): "exporter",
}


def effective_status(status: QuoteStatus, valid_until: dt.date, today: dt.date) -> str:
    """Trạng thái hiển thị: báo giá đang mở mà đã qua ngày hiệu lực là "expired"."""
    if status is QuoteStatus.sent and valid_until < today:
        return EXPIRED
    return status.value


def transition_error(
    current: QuoteStatus, target: QuoteStatus, actor: str, valid_until: dt.date, today: dt.date
) -> str | None:
    """Mã lỗi nếu chuyển trạng thái không hợp lệ, None nếu được phép.

    Buyer không chấp nhận được báo giá đã hết hiệu lực; seller vẫn rút / thay được.
    """
    allowed_actor = _ALLOWED.get((current, target))
    if allowed_actor is None:
        return "invalid_quote_transition"
    if allowed_actor != actor:
        return "forbidden"
    if target is QuoteStatus.accepted and effective_status(current, valid_until, today) == EXPIRED:
        return "quote_expired"
    return None


def terms_error(deposit_percent: int, balance_terms: BalanceTerms) -> str | None:
    """Đặt cọc 100% ↔ không còn phần phải trả ("none")."""
    if not 0 <= deposit_percent <= 100:
        return "invalid_deposit"
    if (deposit_percent == 100) != (balance_terms is BalanceTerms.none):
        return "balance_terms_mismatch"
    return None


def validity_error(valid_until: dt.date, today: dt.date) -> str | None:
    if valid_until < today:
        return "valid_until_in_past"
    if valid_until > today + dt.timedelta(days=MAX_VALIDITY_DAYS):
        return "valid_until_too_far"
    return None


_CENT = Decimal("0.01")


def amounts(
    unit_price: Decimal, quantity: Decimal, deposit_percent: int
) -> tuple[Decimal, Decimal]:
    """(tổng tiền, tiền đặt cọc), làm tròn tới 0,01 theo kiểu thương mại (half-up)."""
    total = (unit_price * quantity).quantize(_CENT, rounding=ROUND_HALF_UP)
    deposit = (total * Decimal(deposit_percent) / Decimal(100)).quantize(
        _CENT, rounding=ROUND_HALF_UP
    )
    return total, deposit
