"""Hàm thuần của máy tính tuân thủ: không đụng DB/HTTP (AGENTS.md §5.3)."""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from app.modules.compliance.models import DutyType

CENT = Decimal("0.01")
HUNDRED = Decimal(100)

# 27 nước thành viên EU (ISO-2). Là địa lý, không phải dữ liệu luật.
EU_MEMBERS = frozenset(
    "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split()
)

TariffStatus = Literal["ok", "unsupported", "needs_review"]


@dataclass(frozen=True)
class TariffLineData:
    duty_type: DutyType
    mfn_rate: Decimal | None  # %
    evfta_rate_current: Decimal | None  # %
    quota_required: bool
    quota_note: str | None
    condition_note: str | None


@dataclass(frozen=True)
class TariffResult:
    """`unsupported` và `needs_review` KHÔNG có con số nào (mọi trường số là None)."""

    status: TariffStatus
    mfn_rate: Decimal | None = None
    evfta_rate: Decimal | None = None
    mfn_duty: Decimal | None = None
    evfta_duty: Decimal | None = None
    savings: Decimal | None = None
    annual_savings: Decimal | None = None
    quota_note: str | None = None
    condition_note: str | None = None


def _money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def tariff_savings(
    line: TariffLineData | None,
    lines_found: int,
    product_value: Decimal,
    shipments_per_year: int | None,
) -> TariffResult:
    """Tiết kiệm thuế MFN → EVFTA cho một lô hàng.

    - Không có dòng đã duyệt đang hiệu lực → unsupported.
    - Hạn ngạch, thuế tuyệt đối/hỗn hợp, nhiều dòng khớp, thiếu thuế suất hoặc EVFTA > MFN
      (dữ liệu bất thường) → needs_review. Không bao giờ trả 0% thay cho các ca này.
    """
    if line is None or lines_found == 0:
        return TariffResult("unsupported")
    review = TariffResult(
        "needs_review", quota_note=line.quota_note, condition_note=line.condition_note
    )
    if (
        line.quota_required
        or line.duty_type is not DutyType.ad_valorem
        or lines_found > 1
        or line.mfn_rate is None
        or line.evfta_rate_current is None
        or line.evfta_rate_current > line.mfn_rate
    ):
        return review
    mfn_duty = _money(product_value * line.mfn_rate / HUNDRED)
    evfta_duty = _money(product_value * line.evfta_rate_current / HUNDRED)
    savings = mfn_duty - evfta_duty
    return TariffResult(
        "ok",
        mfn_rate=line.mfn_rate,
        evfta_rate=line.evfta_rate_current,
        mfn_duty=mfn_duty,
        evfta_duty=evfta_duty,
        savings=savings,
        annual_savings=savings * shipments_per_year if shipments_per_year else None,
        quota_note=line.quota_note,
        condition_note=line.condition_note,
    )
