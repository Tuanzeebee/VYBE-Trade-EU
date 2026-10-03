"""Điểm tín nhiệm seller (U23, ADR-0004) — hàm thuần, không DB/HTTP.

Ba thành phần: giấy tờ đã kiểm, kiểm tự động, hành vi trên nền tảng. Tiêu chí và trọng số là DỮ LIỆU
(trust_criteria) có người duyệt; tiêu chí không dùng được thì bị bỏ qua. Mỗi dữ kiện có giá trị 0–1
hoặc None (không áp dụng / chưa đủ dữ liệu → không tính, trọng số được chuẩn hoá lại).

Điểm KHÔNG bao giờ là đầu vào của decide() và không dùng để xếp thứ tự danh bạ (§6.9–6.10).
Thông tin tự khai được liệt kê kèm nhãn "tự khai", trọng số 0.
"""

from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal

COMPONENTS = ("documents", "automated", "behaviour")
MIN_BEHAVIOUR_EVENTS = 3  # dưới ngưỡng → "Mới trên nền tảng", không chấm phần hành vi
CERTIFICATES_FOR_FULL = 3
FAST_REPLY_HOURS = Decimal(24)
SLOW_REPLY_HOURS = Decimal(72)
ONE, ZERO = Decimal(1), Decimal(0)


@dataclass(frozen=True)
class Criterion:
    component: str
    fact_key: str
    label_vi: str
    label_en: str
    weight: Decimal
    draft: bool = False  # tiêu chí minh hoạ chưa duyệt (chỉ khi bật DEMO ngoài production)


@dataclass(frozen=True)
class TrustFacts:
    verified: bool
    tier: int
    valid_certificates: int
    export_evidence: bool
    passed_checks: set[str]
    conversations: int = 0  # hội thoại buyer mở tới seller trong kỳ
    replied: int = 0  # trong đó seller đã trả lời trong hạn
    median_reply_hours: Decimal | None = None
    rfqs: int = 0
    quoted: int = 0
    self_declared: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class CriterionResult:
    criterion: Criterion
    value: Decimal | None  # None = không tính


@dataclass(frozen=True)
class ComponentResult:
    component: str
    score: Decimal | None  # 0–100
    criteria: list[CriterionResult]


@dataclass(frozen=True)
class TrustResult:
    score: Decimal | None  # 0–100, None khi không có tiêu chí nào tính được
    new_on_platform: bool
    components: list[ComponentResult]
    uses_draft_criteria: bool


def _bool(value: bool) -> Decimal:
    return ONE if value else ZERO


def _ratio(part: int, whole: int) -> Decimal | None:
    return (Decimal(part) / Decimal(whole)).quantize(Decimal("0.0001")) if whole else None


def reply_time_value(hours: Decimal | None) -> Decimal | None:
    if hours is None:
        return None
    if hours <= FAST_REPLY_HOURS:
        return ONE
    return Decimal("0.5") if hours <= SLOW_REPLY_HOURS else ZERO


def new_on_platform(f: TrustFacts) -> bool:
    return f.conversations + f.rfqs < MIN_BEHAVIOUR_EVENTS


def fact_values(f: TrustFacts) -> dict[str, Decimal | None]:
    checks = f.passed_checks
    behaviour = not new_on_platform(f)
    return {
        # Giấy tờ đã kiểm
        "legal_verified": _bool(f.verified),
        "enhanced_tier": _bool(f.tier >= 2),
        "valid_certificates": min(Decimal(f.valid_certificates) / CERTIFICATES_FOR_FULL, ONE),
        "export_evidence": _bool(f.export_evidence),
        # Kiểm tự động
        "company_email_domain": _bool({"email_free_mail", "email_mx"} <= checks),
        "website_matches": _bool({"website_live", "website_name_match"} <= checks),
        "domain_age": _bool("domain_age" in checks),
        "registry_match": _bool(bool({"vies_vat", "gleif_lei", "national_registry"} & checks)),
        "location_confirmed": _bool(bool({"geocode", "traces_facility"} & checks)),
        # Hành vi (chỉ khi đủ dữ liệu)
        "response_rate": _ratio(f.replied, f.conversations) if behaviour else None,
        "response_time": reply_time_value(f.median_reply_hours) if behaviour else None,
        "quote_rate": _ratio(f.quoted, f.rfqs) if behaviour else None,
    }


def _weighted(results: list[CriterionResult]) -> Decimal | None:
    scored = [r for r in results if r.value is not None and r.criterion.weight > 0]
    total = sum((r.criterion.weight for r in scored), ZERO)
    if not scored or total == 0:
        return None
    raw = sum((r.criterion.weight * (r.value or ZERO) for r in scored), ZERO) / total * 100
    return raw.quantize(ONE, rounding=ROUND_HALF_UP)


def compute(criteria: list[Criterion], facts: TrustFacts) -> TrustResult:
    values = fact_values(facts)
    components: list[ComponentResult] = []
    everything: list[CriterionResult] = []
    for component in COMPONENTS:
        results = [
            CriterionResult(c, values.get(c.fact_key)) for c in criteria if c.component == component
        ]
        everything += results
        components.append(ComponentResult(component, _weighted(results), results))
    return TrustResult(
        score=_weighted(everything),
        new_on_platform=new_on_platform(facts),
        components=components,
        uses_draft_criteria=any(c.draft for c in criteria),
    )
