"""Đánh giá xuất xứ EVFTA cho các quy tắc Chương 3/7/8 (SPEC_compliance_data_20_codes §5.2).

Hàm thuần (AGENTS.md §5.3): không đụng DB/HTTP. Ba trạng thái tách biệt pass/fail/inconclusive;
thiếu dữ liệu đầu vào → inconclusive, không bao giờ fail. Quy tắc `requires_expert` luôn cho
inconclusive (AGENTS.md §6.5). Tham số quy tắc (ngưỡng, % sở hữu tàu...) đọc từ `params` trong DB,
không viết cứng ở đây.

TODO(legal): dung sai 10% phi lê 0304 (Điều 5.3(a)/(b)), cơ sở tính dung sai Chương 7/8
(trọng lượng hay giá xuất xưởng), ghi chú 4.1 Phụ lục I cho nấm trồng từ meo nhập — xem SPEC §11.
Hiện tính thận trọng: phải đạt cả hai cơ sở; chưa chốt dung sai → inconclusive.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Literal

OriginStatus = Literal["pass", "fail", "inconclusive"]

# Nguồn nguyên liệu/sản phẩm (câu trả lời cho "nuôi/đánh bắt tại VN hay nhập khẩu?")
Sourcing = Literal["FARMED_IN_VN", "CAUGHT_IN_VN_TERRITORIAL_SEA", "CAUGHT_BY_VESSEL", "IMPORTED"]
SOURCING_VALUES: tuple[str, ...] = (
    "FARMED_IN_VN",
    "CAUGHT_IN_VN_TERRITORIAL_SEA",
    "CAUGHT_BY_VESSEL",
    "IMPORTED",
)
TransitHandling = Literal["STORAGE_UNDER_CUSTOMS", "PROCESSED"]
TRANSIT_HANDLING_VALUES: tuple[str, ...] = ("STORAGE_UNDER_CUSTOMS", "PROCESSED")

_HUNDRED = Decimal(100)


@dataclass(frozen=True)
class Reason:
    code: str
    vi: str
    en: str


REASONS: dict[str, Reason] = {
    r.code: r
    for r in (
        Reason(
            "WHOLLY_OBTAINED",
            "Sản phẩm có xuất xứ thuần túy tại Việt Nam.",
            "The product is wholly obtained in Viet Nam.",
        ),
        Reason(
            "WITHIN_TOLERANCE",
            "Nguyên liệu không thuần túy nằm trong dung sai cho phép.",
            "Non-wholly-obtained material is within the permitted tolerance.",
        ),
        Reason(
            "NOT_WHOLLY_OBTAINED",
            "Sản phẩm không có xuất xứ thuần túy: nguyên liệu nhập khẩu chỉ qua sơ chế.",
            "The product is not wholly obtained: imported material was only lightly processed.",
        ),
        Reason(
            "INSUFFICIENT_OPERATION",
            "Công đoạn tại Việt Nam chỉ là thao tác đơn giản (Điều 6), chưa đủ để tạo xuất xứ.",
            "Operations in Viet Nam are only insufficient operations (Article 6).",
        ),
        Reason(
            "TRANSIT_PROCESSED",
            "Hàng bị gia công ở nước thứ ba ngoài bảo quản và dán nhãn (Điều 13).",
            "The goods were processed in a third country beyond preservation and labelling "
            "(Article 13).",
        ),
        Reason(
            "TRANSIT_STORAGE_ONLY",
            "Hàng quá cảnh nước thứ ba, chỉ lưu kho/chia lô dưới giám sát hải quan: cần chứng từ "
            "vận tải.",
            "Goods transit a third country under customs supervision only: transport "
            "documents are required.",
        ),
        Reason(
            "VESSEL_CONDITIONS_NOT_MET",
            "Tàu chưa đáp ứng đủ cả ba điều kiện: đăng ký VN/EU, mang cờ VN/EU, sở hữu đủ tỷ lệ.",
            "The vessel does not meet all three conditions: registered, flagged and sufficiently "
            "owned in Viet Nam/EU.",
        ),
        Reason(
            "OVER_TOLERANCE",
            "Nguyên liệu không thuần túy vượt dung sai cho phép.",
            "Non-wholly-obtained material exceeds the permitted tolerance.",
        ),
        Reason(
            "SUGAR_OVER_CAP",
            "Hàm lượng đường vượt mức tối đa cho phép.",
            "Sugar content exceeds the permitted maximum.",
        ),
        Reason(
            "TOLERANCE_PENDING_LEGAL",
            "Có nguyên liệu không thuần túy nhưng dung sai chưa được luật sư xác nhận.",
            "Non-wholly-obtained material is declared but the tolerance has not been confirmed "
            "by a lawyer.",
        ),
        Reason(
            "REQUIRES_EXPERT",
            "Quy tắc này cần chuyên gia xác nhận trước khi kết luận.",
            "This rule requires expert confirmation before a conclusion.",
        ),
        Reason(
            "INPUTS_MISSING",
            "Chưa đủ câu trả lời để kết luận.",
            "Not enough answers to reach a conclusion.",
        ),
        Reason(
            "NOT_SUPPORTED",
            "Mã hàng này chưa có quy tắc xuất xứ được hỗ trợ.",
            "There is no supported origin rule for this code.",
        ),
        Reason(
            "RULE_TYPE_NOT_SUPPORTED",
            "Loại quy tắc này không được máy tính xuất xứ mới hỗ trợ.",
            "This rule type is not handled by the origin calculator.",
        ),
    )
}


@dataclass(frozen=True)
class OriginRule:
    rule_type: str
    params: dict[str, Any]
    requires_expert: bool = False
    requires_expert_reason: str | None = None


@dataclass(frozen=True)
class OriginAnswers:
    """Mọi trường None = chưa trả lời. Tỷ lệ là % (0–100)."""

    transit_third_country: bool | None = None
    transit_handling: str | None = None
    only_article6_operations: bool | None = None
    sourcing: str | None = None
    vessel_registered_vn_eu: bool | None = None
    vessel_flag_vn_eu: bool | None = None
    vessel_ownership_pct: Decimal | None = None
    materials_outside_territorial_sea: bool | None = None
    restricted_nonorig_pct_weight: Decimal | None = None
    restricted_nonorig_pct_value: Decimal | None = None
    sugar_pct_weight: Decimal | None = None


@dataclass(frozen=True)
class OriginResult:
    status: OriginStatus
    reasons: tuple[Reason, ...] = ()
    inputs_missing: tuple[str, ...] = ()
    # Chứng từ bổ sung theo tình huống (vd TRANSPORT_DOC khi quá cảnh) — gộp vào checklist lô.
    additional_evidence: tuple[str, ...] = ()


@dataclass(frozen=True)
class InputSpec:
    """Mô tả một câu trả lời cần có (dùng cho GET origin-questions)."""

    name: str
    kind: Literal["boolean", "percent", "enum"]
    options: tuple[str, ...] = ()
    required_if: str | None = None  # mô tả điều kiện, vd "sourcing=CAUGHT_BY_VESSEL"


_VESSEL_INPUTS = (
    InputSpec("vessel_registered_vn_eu", "boolean"),
    InputSpec("vessel_flag_vn_eu", "boolean"),
    InputSpec("vessel_ownership_pct", "percent"),
)
_PCT_INPUTS = (
    InputSpec("restricted_nonorig_pct_weight", "percent"),
    InputSpec("restricted_nonorig_pct_value", "percent"),
)
_COMMON_INPUTS = (
    InputSpec("transit_third_country", "boolean"),
    InputSpec("transit_handling", "enum", TRANSIT_HANDLING_VALUES, "transit_third_country=true"),
    InputSpec("only_article6_operations", "boolean", required_if="optional"),
)
_SOURCING = InputSpec("sourcing", "enum", SOURCING_VALUES)

_RULE_INPUTS: dict[str, tuple[InputSpec, ...]] = {
    "WO_PRODUCT": (_SOURCING,),
    "WO_PRODUCT_VESSEL": (
        _SOURCING,
        *(
            InputSpec(s.name, s.kind, s.options, "sourcing=CAUGHT_BY_VESSEL")
            for s in _VESSEL_INPUTS
        ),
    ),
    "WO_MATERIALS": (InputSpec("restricted_nonorig_pct_weight", "percent"),),
    "WO_MATERIALS_VESSEL": (
        InputSpec("restricted_nonorig_pct_weight", "percent"),
        InputSpec("materials_outside_territorial_sea", "boolean"),
        *(
            InputSpec(s.name, s.kind, s.options, "materials_outside_territorial_sea=true")
            for s in _VESSEL_INPUTS
        ),
    ),
    "WO_MATERIALS_TOLERANCE": _PCT_INPUTS,
    "WO_MATERIALS_SUGAR_CAP": (*_PCT_INPUTS, InputSpec("sugar_pct_weight", "percent")),
}
SUPPORTED_RULE_TYPES = frozenset(_RULE_INPUTS)


def answer_schema(rule_type: str) -> tuple[InputSpec, ...]:
    """Các câu trả lời máy tính xuất xứ cần cho `rule_type` (rỗng nếu loại này không hỗ trợ)."""
    if rule_type not in _RULE_INPUTS:
        return ()
    return (*_COMMON_INPUTS, *_RULE_INPUTS[rule_type])


def _pct(params: dict[str, Any], key: str) -> Decimal | None:
    value = params.get(key)
    return None if value is None else Decimal(str(value))


def _missing(answers: OriginAnswers, names: Sequence[str]) -> list[str]:
    return [n for n in names if getattr(answers, n) is None]


def _vessel_ok(answers: OriginAnswers, min_ownership: Decimal) -> bool:
    return bool(
        answers.vessel_registered_vn_eu
        and answers.vessel_flag_vn_eu
        and answers.vessel_ownership_pct is not None
        and answers.vessel_ownership_pct >= min_ownership
    )


_VESSEL_FIELDS = ("vessel_registered_vn_eu", "vessel_flag_vn_eu", "vessel_ownership_pct")


def _both_tolerances(
    answers: OriginAnswers, tolerance: Decimal
) -> tuple[Literal["ok", "over", "unknown"], list[str]]:
    """Dung sai tính thận trọng: phải ≤ ngưỡng theo CẢ trọng lượng VÀ giá xuất xưởng.
    Chỉ có một con số → unknown (không kết luận)."""
    missing = _missing(answers, ("restricted_nonorig_pct_weight", "restricted_nonorig_pct_value"))
    if missing:
        return "unknown", missing
    weight = answers.restricted_nonorig_pct_weight
    value = answers.restricted_nonorig_pct_value
    if weight is None or value is None:  # đã loại ở trên; chỉ để thu hẹp kiểu
        return "unknown", missing
    return ("ok" if weight <= tolerance and value <= tolerance else "over"), []


def _finish(
    status: OriginStatus,
    reasons: list[str],
    missing: list[str],
    evidence: list[str],
    rule: OriginRule,
) -> OriginResult:
    if rule.requires_expert:
        # AGENTS.md §6.5: requires_expert → luôn inconclusive, không bao giờ pass/fail.
        reasons = ["REQUIRES_EXPERT"]
        status = "inconclusive"
    if status == "inconclusive" and missing and "INPUTS_MISSING" not in reasons:
        reasons = [*reasons, "INPUTS_MISSING"]
    return OriginResult(
        status,
        tuple(REASONS[c] for c in dict.fromkeys(reasons)),
        tuple(missing),
        tuple(dict.fromkeys(evidence)),
    )


def _vessel_check(
    answers: OriginAnswers, rule: OriginRule
) -> tuple[Literal["ok", "fail", "unknown"], list[str]]:
    missing = _missing(answers, _VESSEL_FIELDS)
    if missing:
        return "unknown", missing
    min_pct = _pct(rule.params, "vessel_min_ownership_pct")
    if min_pct is None:
        return "unknown", ["vessel_min_ownership_pct"]
    return ("ok" if _vessel_ok(answers, min_pct) else "fail"), []


def evaluate_origin(rule: OriginRule | None, answers: OriginAnswers) -> OriginResult:
    """Kết luận xuất xứ cho một mã theo quy tắc đã nạp. Không bao giờ đoán."""
    if rule is None or rule.rule_type not in SUPPORTED_RULE_TYPES:
        return OriginResult("inconclusive", (REASONS["RULE_TYPE_NOT_SUPPORTED"],))
    evidence: list[str] = []

    # --- kiểm tra chung, chạy trước mọi loại quy tắc -------------------------------------------
    if answers.transit_third_country is None:
        return _finish("inconclusive", [], ["transit_third_country"], evidence, rule)
    if answers.transit_third_country:
        if answers.transit_handling is None:
            return _finish("inconclusive", [], ["transit_handling"], evidence, rule)
        if answers.transit_handling == "PROCESSED":
            return _finish("fail", ["TRANSIT_PROCESSED"], [], evidence, rule)
        evidence.append("TRANSPORT_DOC")
    transit_reasons = ["TRANSIT_STORAGE_ONLY"] if evidence else []
    if answers.only_article6_operations:
        return _finish("fail", ["INSUFFICIENT_OPERATION", *transit_reasons], [], evidence, rule)

    status, reasons, missing = _by_rule(rule, answers)
    return _finish(status, [*reasons, *transit_reasons], missing, evidence, rule)


def _by_rule(rule: OriginRule, answers: OriginAnswers) -> tuple[OriginStatus, list[str], list[str]]:
    kind = rule.rule_type
    if kind in ("WO_PRODUCT", "WO_PRODUCT_VESSEL"):
        return _wo_product(rule, answers)
    if kind in ("WO_MATERIALS", "WO_MATERIALS_VESSEL"):
        return _wo_materials(rule, answers)
    return _tolerance(rule, answers)


def _wo_product(
    rule: OriginRule, answers: OriginAnswers
) -> tuple[OriginStatus, list[str], list[str]]:
    if answers.sourcing is None:
        return "inconclusive", [], ["sourcing"]
    if answers.sourcing == "IMPORTED":
        return "fail", ["NOT_WHOLLY_OBTAINED"], []
    if answers.sourcing != "CAUGHT_BY_VESSEL":
        return "pass", ["WHOLLY_OBTAINED"], []  # nuôi tại VN (giống nhập vẫn đạt) / lãnh hải VN
    if rule.rule_type == "WO_PRODUCT":
        return "inconclusive", [], []  # quy tắc không có điều kiện tàu: không tự suy ra
    vessel, missing = _vessel_check(answers, rule)
    if vessel == "unknown":
        return "inconclusive", [], missing
    if vessel == "fail":
        return "fail", ["VESSEL_CONDITIONS_NOT_MET"], []
    return "pass", ["WHOLLY_OBTAINED"], []


def _wo_materials(
    rule: OriginRule, answers: OriginAnswers
) -> tuple[OriginStatus, list[str], list[str]]:
    needs_vessel_answer = rule.rule_type == "WO_MATERIALS_VESSEL"
    missing = _missing(answers, ("restricted_nonorig_pct_weight",))
    if needs_vessel_answer:
        missing += _missing(answers, ("materials_outside_territorial_sea",))
    if missing:
        return "inconclusive", [], missing
    share = answers.restricted_nonorig_pct_weight
    if share is None:  # đã loại ở trên; chỉ để thu hẹp kiểu
        return "inconclusive", [], ["restricted_nonorig_pct_weight"]
    tolerance = _pct(rule.params, "tolerance_pct")
    confirmed = rule.params.get("tolerance_status") == "CONFIRMED" and tolerance is not None
    if share > 0:
        if not confirmed or tolerance is None:
            return "inconclusive", ["TOLERANCE_PENDING_LEGAL"], []
        if share > tolerance:
            return "fail", ["OVER_TOLERANCE"], []
    if needs_vessel_answer and answers.materials_outside_territorial_sea:
        vessel, vessel_missing = _vessel_check(answers, rule)
        if vessel == "unknown":
            return "inconclusive", [], vessel_missing
        if vessel == "fail":
            return "fail", ["VESSEL_CONDITIONS_NOT_MET"], []
    return "pass", ["WHOLLY_OBTAINED"], []


def _tolerance(
    rule: OriginRule, answers: OriginAnswers
) -> tuple[OriginStatus, list[str], list[str]]:
    tolerance = _pct(rule.params, "tolerance_pct")
    if tolerance is None:
        return "inconclusive", ["TOLERANCE_PENDING_LEGAL"], []
    fail: list[str] = []
    missing: list[str] = []
    if rule.rule_type == "WO_MATERIALS_SUGAR_CAP":
        sugar_max = _pct(rule.params, "sugar_max_pct_weight")
        if answers.sugar_pct_weight is None:
            missing.append("sugar_pct_weight")
        elif sugar_max is not None and answers.sugar_pct_weight > sugar_max:
            fail.append("SUGAR_OVER_CAP")
    state, tol_missing = _both_tolerances(answers, tolerance)
    missing += tol_missing
    if state == "over":
        fail.append("OVER_TOLERANCE")
    if fail:
        return "fail", fail, []
    if missing:
        return "inconclusive", [], missing
    return "pass", ["WITHIN_TOLERANCE"], []
