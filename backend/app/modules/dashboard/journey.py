"""Hành trình seller (N1): hàm thuần, không đụng DB/HTTP (AGENTS.md §5.3).

Hai chặng: "product" (hoàn thiện sản phẩm) và "sales" (bán hàng). `next_step` là việc đầu tiên
chưa xong; dùng để giao diện chỉ hiện MỘT nút nổi bật.
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

Track = Literal["product", "sales"]

COMPANY_DONE_SCORE = Decimal("60")


@dataclass(frozen=True)
class JourneyState:
    has_company: bool
    completeness_score: Decimal  # 0–100
    product_count: int
    verification_status: str  # unverified | pending | verified | rejected
    gtm_report_count: int
    tariff_runs: int
    origin_runs: int  # số lần chạy công cụ xuất xứ (RoO), tách khỏi máy tính thuế
    rfq_total: int


@dataclass(frozen=True)
class JourneyStep:
    key: str
    track: Track
    done: bool


def build_steps(s: JourneyState) -> list[JourneyStep]:
    return [
        # Hồ sơ gồm cả sản phẩm cung cấp: xong khi đủ điểm hoàn thiện và có ít nhất một sản phẩm.
        JourneyStep(
            "company",
            "product",
            s.has_company and s.completeness_score >= COMPANY_DONE_SCORE and s.product_count >= 1,
        ),
        JourneyStep("evidence", "product", s.verification_status in ("pending", "verified")),
        JourneyStep("verification", "product", s.verification_status == "verified"),
        JourneyStep("market", "sales", s.gtm_report_count >= 1),
        JourneyStep("tariff", "sales", s.tariff_runs >= 1),
        JourneyStep("origin", "sales", s.origin_runs >= 1),
        JourneyStep("requests", "sales", s.rfq_total >= 1),
        JourneyStep("services", "sales", False),  # bước thông tin: chưa có dữ liệu để "xong"
    ]


def next_step(s: JourneyState) -> str | None:
    if not s.has_company:
        return "company"
    for step in build_steps(s):
        if step.key != "services" and not step.done:
            return step.key
    return None


def track_progress(steps: list[JourneyStep], track: Track) -> tuple[int, int]:
    in_track = [x for x in steps if x.track == track]
    return sum(1 for x in in_track if x.done), len(in_track)
