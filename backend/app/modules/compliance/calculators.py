"""Hàm thuần của máy tính tuân thủ: không đụng DB/HTTP (AGENTS.md §5.3)."""

from collections.abc import Sequence
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

# Tên nước thành viên (hiển thị trên bản nháp chứng từ).
EU_COUNTRY_NAMES = {
    "AT": "Austria", "BE": "Belgium", "BG": "Bulgaria", "HR": "Croatia", "CY": "Cyprus",
    "CZ": "Czechia", "DK": "Denmark", "EE": "Estonia", "FI": "Finland", "FR": "France",
    "DE": "Germany", "GR": "Greece", "HU": "Hungary", "IE": "Ireland", "IT": "Italy",
    "LV": "Latvia", "LT": "Lithuania", "LU": "Luxembourg", "MT": "Malta", "NL": "Netherlands",
    "PL": "Poland", "PT": "Portugal", "RO": "Romania", "SK": "Slovakia", "SI": "Slovenia",
    "ES": "Spain", "SE": "Sweden",
}  # fmt: skip

TariffStatus = Literal["ok", "unsupported", "needs_review"]


@dataclass(frozen=True)
class TariffLineData:
    duty_type: DutyType
    mfn_rate: Decimal | None  # %
    evfta_rate_current: Decimal | None  # %
    quota_required: bool
    quota_note: str | None
    condition_note: str | None
    quota_note_en: str | None = None
    condition_note_en: str | None = None


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
    quota_note_en: str | None = None
    condition_note_en: str | None = None


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
        "needs_review",
        quota_note=line.quota_note,
        condition_note=line.condition_note,
        quota_note_en=line.quota_note_en,
        condition_note_en=line.condition_note_en,
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
        quota_note_en=line.quota_note_en,
        condition_note_en=line.condition_note_en,
    )


# ── Xếp hạng thị trường EU ──────────────────────────────────────────────────

MarketStatus = Literal["ranked", "no_data"]
MarketBasis = Literal["evfta", "mfn"]


@dataclass(frozen=True)
class CountryTerms:
    """VAT nhập khẩu (%) và lưu ý của một nước cho một mã hàng. Dữ liệu đã duyệt."""

    country: str
    vat_rate: Decimal
    label_languages: str | None = None
    note: str | None = None
    note_en: str | None = None


@dataclass(frozen=True)
class MarketRow:
    """`no_data`: nước chưa có dòng VAT đã duyệt — mọi trường số là None."""

    country: str
    status: MarketStatus
    rank: int | None = None
    duty: Decimal | None = None
    vat_rate: Decimal | None = None
    vat: Decimal | None = None
    total: Decimal | None = None
    label_languages: str | None = None
    note: str | None = None
    note_en: str | None = None


@dataclass(frozen=True)
class MarketRanking:
    """status khác `ok` (unsupported/needs_review) → không có dòng nào, không có con số nào."""

    status: TariffStatus
    basis: MarketBasis | None = None
    duty_rate: Decimal | None = None
    rows: tuple[MarketRow, ...] = ()


def rank_markets(
    line: TariffLineData | None,
    lines_found: int,
    product_value: Decimal,
    roo_status: str | None,
    terms: Sequence[CountryTerms],
) -> MarketRanking:
    """Xếp các nước EU theo tổng (thuế nhập khẩu + VAT nhập khẩu) tăng dần.

    - Trạng thái và số thuế lấy từ tariff_savings; chỉ `ok` mới xếp hạng.
    - Thuế EVFTA chỉ áp khi RoO = pass; ngược lại dùng MFN (không hưởng ưu đãi).
    - VAT nhập khẩu = (giá trị + thuế nhập khẩu) × VAT. Hòa tổng thì xếp theo mã nước.
    - Nước không có dòng VAT xếp cuối, status no_data, không có con số.
    """
    base = tariff_savings(line, lines_found, product_value, None)
    if (
        base.status != "ok"
        or base.mfn_duty is None
        or base.evfta_duty is None
        or base.mfn_rate is None
        or base.evfta_rate is None
    ):
        return MarketRanking(base.status)
    basis: MarketBasis = "evfta" if roo_status == "pass" else "mfn"
    duty, duty_rate = (
        (base.evfta_duty, base.evfta_rate) if basis == "evfta" else (base.mfn_duty, base.mfn_rate)
    )
    ranked: list[MarketRow] = []
    for term in terms:
        vat = _money((product_value + duty) * term.vat_rate / HUNDRED)
        ranked.append(
            MarketRow(
                term.country,
                "ranked",
                duty=duty,
                vat_rate=term.vat_rate,
                vat=vat,
                total=duty + vat,
                label_languages=term.label_languages,
                note=term.note,
                note_en=term.note_en,
            )
        )
    ranked.sort(key=lambda r: (r.total or Decimal(0), r.country))
    rows = [
        MarketRow(**{**row.__dict__, "rank": position}) for position, row in enumerate(ranked, 1)
    ]
    covered = {t.country for t in terms}
    rows += [MarketRow(c, "no_data") for c in sorted(EU_MEMBERS - covered)]
    return MarketRanking("ok", basis, duty_rate, tuple(rows))


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


# ── Hạn ngạch thuế quan (U13, AGENTS.md §6.4 sửa đổi) ─────────────────────────

QuotaStatus = Literal["quota_scenarios", "needs_review"]
QuotaReviewReason = Literal[
    "no_quota_data",  # không có (hoặc không duy nhất một) dòng hạn ngạch đã duyệt
    "subtype_required",  # người dùng chưa chọn phân nhóm hàng
    "subtype_not_eligible",  # phân nhóm ngoài danh sách đủ điều kiện đã duyệt (vd ST25)
    "quantity_required",  # thuế tuyệt đối cần khối lượng người dùng nhập
    "mixed_duty",  # thuế hỗn hợp: không tính
    "data_anomaly",  # thuế trong hạn ngạch cao hơn ngoài hạn ngạch
]


@dataclass(frozen=True)
class QuotaDuty:
    duty_type: DutyType
    rate: Decimal | None = None  # % khi ad_valorem
    specific: Decimal | None = None  # tiền / đơn vị (specific_unit) khi specific


@dataclass(frozen=True)
class QuotaData:
    """Một dòng tariff_quotas ĐÃ DUYỆT (hoặc DEMO khi cờ bật — U14)."""

    in_quota: QuotaDuty
    out_quota: QuotaDuty
    specific_unit: str | None = None


@dataclass(frozen=True)
class Scenario:
    kind: Literal["in_quota", "out_of_quota"]
    duty_type: DutyType
    rate: Decimal | None
    specific: Decimal | None
    duty: Decimal


@dataclass(frozen=True)
class QuotaResult:
    """`needs_review` KHÔNG có con số nào (scenarios rỗng, savings None)."""

    status: QuotaStatus
    review_reason: QuotaReviewReason | None = None
    scenarios: tuple[Scenario, ...] = ()
    savings: Decimal | None = None  # ngoài hạn ngạch − trong hạn ngạch


def _quota_duty(duty: QuotaDuty, product_value: Decimal, quantity: Decimal | None) -> Decimal:
    if duty.duty_type is DutyType.ad_valorem and duty.rate is not None:
        return _money(product_value * duty.rate / HUNDRED)
    if duty.duty_type is DutyType.specific and duty.specific is not None and quantity is not None:
        return _money(duty.specific * quantity)
    raise ValueError("duty cannot be computed")  # người gọi đã loại các ca này


def quota_scenarios(
    quotas_found: int,
    quota: QuotaData | None,
    *,
    subtype_chosen: bool,
    subtype_eligible: bool,
    product_value: Decimal,
    quantity: Decimal | None,
) -> QuotaResult:
    """Kịch bản trong / ngoài hạn ngạch cho một lô hàng.

    Chỉ trả số khi: đúng MỘT hạn ngạch đã duyệt khớp, người dùng chọn phân nhóm và phân nhóm nằm
    trong danh sách đủ điều kiện đã duyệt, không có thuế hỗn hợp, có khối lượng khi có thuế
    tuyệt đối.
    Kịch bản luôn đi kèm điều kiện (giao diện hiện) — không bao giờ là "0% vô điều kiện".
    """
    if quotas_found != 1 or quota is None:
        return QuotaResult("needs_review", "no_quota_data")
    if not subtype_chosen:
        return QuotaResult("needs_review", "subtype_required")
    if not subtype_eligible:
        return QuotaResult("needs_review", "subtype_not_eligible")
    duties = (quota.in_quota, quota.out_quota)
    if any(d.duty_type is DutyType.mixed for d in duties):
        return QuotaResult("needs_review", "mixed_duty")
    incomplete = any(
        (d.duty_type is DutyType.ad_valorem and d.rate is None)
        or (d.duty_type is DutyType.specific and (d.specific is None or not quota.specific_unit))
        for d in duties
    )
    if incomplete:
        return QuotaResult("needs_review", "no_quota_data")
    if any(d.duty_type is DutyType.specific for d in duties) and quantity is None:
        return QuotaResult("needs_review", "quantity_required")
    in_duty = _quota_duty(quota.in_quota, product_value, quantity)
    out_duty = _quota_duty(quota.out_quota, product_value, quantity)
    if in_duty > out_duty:
        return QuotaResult("needs_review", "data_anomaly")
    return QuotaResult(
        "quota_scenarios",
        scenarios=(
            Scenario(
                "in_quota",
                quota.in_quota.duty_type,
                quota.in_quota.rate,
                quota.in_quota.specific,
                in_duty,
            ),
            Scenario(
                "out_of_quota",
                quota.out_quota.duty_type,
                quota.out_quota.rate,
                quota.out_quota.specific,
                out_duty,
            ),
        ),
        savings=out_duty - in_duty,
    )
