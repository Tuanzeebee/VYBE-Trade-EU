"""Điểm định vị và năng lực (N5): hàm thuần, không DB/HTTP (AGENTS.md §5.3).

Bốn trục 0–100; điểm tổng là trung bình. Ngưỡng là quy ước hiển thị, không phải dữ liệu luật.
"""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

HUNDRED = Decimal(100)
VOLUME_FULL = Decimal(1000)  # tấn/năm đạt 100 điểm trục sản lượng
CERT_FULL = 3  # số chứng nhận đã duyệt đạt 100 điểm
ONE_PLACE = Decimal("0.1")


@dataclass(frozen=True)
class CapacityInput:
    annual_volume: Decimal | None  # tấn/năm
    certification_count: int
    verified: bool
    has_export_history: bool
    has_brand_budget: bool


@dataclass(frozen=True)
class PositioningResult:
    score: Decimal
    axes: dict[str, Decimal]


def _clamp(value: Decimal) -> Decimal:
    return max(Decimal(0), min(HUNDRED, value))


def score(c: CapacityInput) -> PositioningResult:
    volume = _clamp((c.annual_volume or Decimal(0)) / VOLUME_FULL * HUNDRED)
    cert = _clamp(Decimal(c.certification_count) / Decimal(CERT_FULL) * HUNDRED)
    trust = HUNDRED if c.verified else Decimal(0)
    experience = Decimal(50) * (int(c.has_export_history) + int(c.has_brand_budget))
    axes = {"volume": volume, "certification": cert, "trust": trust, "experience": experience}
    total = (sum(axes.values()) / Decimal(len(axes))).quantize(ONE_PLACE, rounding=ROUND_HALF_UP)
    return PositioningResult(
        score=total,
        axes={k: v.quantize(ONE_PLACE, rounding=ROUND_HALF_UP) for k, v in axes.items()},
    )
