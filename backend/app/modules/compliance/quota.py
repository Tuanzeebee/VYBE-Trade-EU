"""Hàm thuần của bộ máy hạn ngạch thuế quan (C2-C, DE_XUAT_MAY_TINH_THUE.md tầng 5).

Không đụng DB/HTTP (AGENTS.md §5.3): chuyển đổi đơn vị, trạng thái số dư, chu kỳ và giá trị kinh tế
của hạn ngạch. Không đoán: thiếu số dư thì trạng thái là `unknown`, không phải "còn".
"""

import datetime as dt
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

CENT = Decimal("0.01")
HUNDRED = Decimal(100)
_QTY_PLACES = Decimal("0.000001")

# Họ khối lượng: quy về kg. Đơn vị khác họ (cái, lít) chỉ so sánh được với chính nó.
_MASS_TO_KG = {"kg": Decimal(1), "100kg": Decimal(100), "tonne": Decimal(1000)}

BalanceStatus = Literal["unknown", "open", "low", "exhausted"]


def convert_quantity(quantity: Decimal, from_unit: str, to_unit: str) -> Decimal | None:
    """Đổi khối lượng giữa các đơn vị cùng họ (kg, 100kg, tonne). Khác họ → None (không đoán)."""
    if from_unit == to_unit:
        return quantity
    if from_unit in _MASS_TO_KG and to_unit in _MASS_TO_KG:
        converted = quantity * _MASS_TO_KG[from_unit] / _MASS_TO_KG[to_unit]
        return converted.quantize(_QTY_PLACES, rounding=ROUND_HALF_UP).normalize()
    return None


@dataclass(frozen=True)
class BalanceInfo:
    status: BalanceStatus
    as_of: dt.date | None = None
    used: Decimal | None = None
    remaining: Decimal | None = None
    remaining_pct: Decimal | None = None
    stale: bool = False  # số liệu cũ hơn ngưỡng: vẫn hiển thị nhưng kèm cảnh báo


def balance_status(
    volume: Decimal,
    used: Decimal | None,
    as_of: dt.date | None,
    *,
    today: dt.date,
    low_pct: Decimal,
    stale_days: int,
) -> BalanceInfo:
    """Trạng thái số dư từ khối lượng đã dùng (cùng đơn vị `volume`); chưa có số liệu → unknown."""
    if used is None or as_of is None or volume <= 0:
        return BalanceInfo("unknown")
    remaining = max(volume - used, Decimal(0))
    pct = (remaining * HUNDRED / volume).quantize(CENT, rounding=ROUND_HALF_UP)
    status: BalanceStatus = "exhausted" if remaining == 0 else ("low" if pct <= low_pct else "open")
    return BalanceInfo(status, as_of, used, remaining, pct, (today - as_of).days > stale_days)


@dataclass(frozen=True)
class PeriodInfo:
    start: dt.date | None
    end: dt.date | None
    days_left: int | None  # số ngày còn lại tính từ ngày nhập; None khi ngoài chu kỳ hoặc không rõ
    in_period: bool | None  # None = hạn ngạch không khai chu kỳ


def period_info(start: dt.date | None, end: dt.date | None, on_date: dt.date) -> PeriodInfo:
    if start is None or end is None:
        return PeriodInfo(start, end, None, None)
    inside = start <= on_date <= end
    return PeriodInfo(start, end, (end - on_date).days if inside else None, inside)


@dataclass(frozen=True)
class QuotaEconomics:
    savings: Decimal  # thuế ngoài hạn ngạch − thuế trong hạn ngạch
    savings_per_unit: Decimal | None  # theo đơn vị thuế tuyệt đối; None khi chưa có khối lượng
    savings_pct_of_value: Decimal
    access_cost: (
        Decimal | None
    )  # chi phí để có hạn ngạch do người dùng nhập (phí giấy phép, chờ...)
    net_benefit: Decimal | None
    worthwhile: bool | None


def quota_economics(
    savings: Decimal,
    customs_value: Decimal,
    quantity: Decimal | None,
    access_cost: Decimal | None,
) -> QuotaEconomics:
    """Giá trị kinh tế của hạn ngạch cho lô hàng và điểm hòa vốn: lợi ích ròng = tiết kiệm − chi phí
    để có hạn ngạch. Chi phí do người dùng tự nhập, không tự gợi ý."""
    per_unit = (
        (savings / quantity).quantize(CENT, rounding=ROUND_HALF_UP)
        if quantity is not None and quantity > 0
        else None
    )
    pct = (
        (savings * HUNDRED / customs_value).quantize(CENT, rounding=ROUND_HALF_UP)
        if customs_value > 0
        else Decimal(0)
    )
    net = None if access_cost is None else savings - access_cost
    return QuotaEconomics(
        savings, per_unit, pct, access_cost, net, None if net is None else net > 0
    )


def shipment_share_pct(quantity: Decimal | None, volume: Decimal) -> Decimal | None:
    """Lô hàng chiếm bao nhiêu % tổng hạn ngạch (cùng đơn vị). None khi chưa có khối lượng."""
    if quantity is None or volume <= 0:
        return None
    return (quantity * HUNDRED / volume).quantize(CENT, rounding=ROUND_HALF_UP)
