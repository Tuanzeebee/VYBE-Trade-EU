"""Hàm thuần của máy tính tuân thủ: không đụng DB/HTTP (AGENTS.md §5.3)."""

from dataclasses import dataclass
from decimal import ROUND_CEILING, ROUND_HALF_UP, Decimal
from typing import Literal

from app.modules.compliance.models import DutyType, RuleType

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


# ── Quy tắc xuất xứ (C4) ────────────────────────────────────────────────────

RooStatus = Literal["pass", "fail", "inconclusive", "unsupported"]
ORIGIN_COUNTRY = "VN"
HEADING_DIGITS = 4  # CTH: so sánh nhóm HS 4 số


@dataclass(frozen=True)
class Material:
    origin_country: str  # ISO-2
    value: Decimal
    hs_code: str | None = None  # 6–8 số; cần cho nhánh CTH


@dataclass(frozen=True)
class RuleData:
    rule_type: RuleType
    threshold_pct: Decimal | None
    requires_expert: bool


@dataclass(frozen=True)
class RooResult:
    """Ba trạng thái riêng pass/fail/inconclusive, thêm unsupported khi chưa có quy tắc đã duyệt.

    nom_pct: % nguyên liệu không xuất xứ / giá xuất xưởng, làm tròn LÊN 2 chữ số để giá trị hiển thị
    không bao giờ thấp hơn thực tế. rvc_pct = 100 − nom_pct. Cả hai None khi không tính được.
    """

    status: RooStatus
    nom_pct: Decimal | None = None
    rvc_pct: Decimal | None = None
    # Lý do khi inconclusive/unsupported: no_rule | ambiguous_rule | requires_expert |
    # materials_not_declared | insufficient_data. None khi pass/fail.
    reason: str | None = None


def _originating(material: Material, eu_cumulation: bool) -> bool:
    if material.origin_country == ORIGIN_COUNTRY:
        return True
    return eu_cumulation and material.origin_country in EU_MEMBERS


def _maxnom(
    rule: RuleData, ex_works: Decimal | None, non_originating: list[Material]
) -> tuple[RooStatus, Decimal | None]:
    if rule.threshold_pct is None or ex_works is None or ex_works <= 0:
        return "inconclusive", None
    nom = (sum((m.value for m in non_originating), Decimal(0)) * HUNDRED / ex_works).quantize(
        CENT, rounding=ROUND_CEILING
    )
    return ("pass" if nom <= rule.threshold_pct else "fail"), nom


def _cth(product_hs: str, non_originating: list[Material]) -> RooStatus:
    if any(m.hs_code is None for m in non_originating):
        return "inconclusive"  # chưa biết nhóm HS nguyên liệu → không được kết luận fail
    heading = product_hs[:HEADING_DIGITS]
    same = any((m.hs_code or "")[:HEADING_DIGITS] == heading for m in non_originating)
    return "fail" if same else "pass"


def roo_verdict(
    rule: RuleData | None,
    product_hs: str,
    ex_works: Decimal | None,
    materials: list[Material],
    *,
    materials_declared: bool,
    eu_cumulation: bool = True,
) -> RooResult:
    """Kết luận xuất xứ VN cho lô hàng xuất sang EU. Không bao giờ đoán:

    - không có quy tắc đã duyệt → unsupported;
    - requires_expert, chưa khai nguyên liệu, thiếu dữ liệu cần cho nhánh quyết định → inconclusive;
    - fail chỉ khi MỌI nhánh của quy tắc đều đủ dữ liệu và đều không đạt.
    """
    if rule is None:
        return RooResult("unsupported", reason="no_rule")
    if rule.requires_expert:
        return RooResult("inconclusive", reason="requires_expert")
    if not materials_declared:
        return RooResult("inconclusive", reason="materials_not_declared")
    non_originating = [m for m in materials if not _originating(m, eu_cumulation)]

    nom: Decimal | None = None
    status: RooStatus
    if rule.rule_type is RuleType.WO:
        status = "fail" if non_originating else "pass"
    elif rule.rule_type is RuleType.CTH:
        status = _cth(product_hs, non_originating)
    elif rule.rule_type is RuleType.MaxNOM:
        status, nom = _maxnom(rule, ex_works, non_originating)
    else:  # CTH_OR_MaxNOM
        nom_status, nom = _maxnom(rule, ex_works, non_originating)
        cth_status = _cth(product_hs, non_originating)
        if "pass" in (nom_status, cth_status):
            status = "pass"
        elif nom_status == "fail" and cth_status == "fail":
            status = "fail"
        else:
            status = "inconclusive"
    return RooResult(
        status,
        nom,
        None if nom is None else HUNDRED - nom,
        "insufficient_data" if status == "inconclusive" else None,
    )
