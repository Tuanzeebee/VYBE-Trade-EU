"""Cấp xác minh (U20, ADR-0004) — hàm thuần, không DB/HTTP.

0 Chưa xác minh · 1 Cơ bản (pháp lý) · 2 Nâng cao (năng lực, trả phí) · 3 Chuyên sâu (audit).
Cấp chỉ đổi qua decide() (admin bấm, hoặc hệ thống hạ khi hết hạn); hàm ở đây chỉ tính danh sách
kiểm và điều kiện gửi yêu cầu, không bao giờ tự nâng cấp.
"""

from collections.abc import Iterable, Mapping
from dataclasses import dataclass

MAX_TIER = 3
TIER_VALID_DAYS = 365  # cấp 2–3 kiểm lại hằng năm
TIER_NAMES: dict[int, tuple[str, str]] = {
    0: ("Chưa xác minh", "Unverified"),
    1: ("Cơ bản", "Basic"),
    2: ("Nâng cao", "Enhanced"),
    3: ("Chuyên sâu", "Advanced"),
}
PAID_TIERS = frozenset({2})  # xin duyệt cấp Nâng cao cần quyền đã trả phí (ADR-0005)


@dataclass(frozen=True)
class Requirement:
    tier: int
    kind: str  # evidence | check | manual
    code: str
    label_vi: str
    label_en: str
    is_required: bool
    reviewed: bool  # False = nháp chưa được luật TM duyệt


def company_kind(company_type: str, offering_type: str | None) -> str:
    """Loại công ty để tra yêu cầu: buyer, nhà cung cấp dịch vụ, hoặc seller sản phẩm (cả hai →
    seller sản phẩm; giấy phép dịch vụ được nhắc riêng)."""
    if company_type == "buyer":
        return "buyer"
    return "service_provider" if offering_type == "services" else "product_seller"


def requirement_state(
    requirement: Requirement, evidence_states: Mapping[str, str], checks_passed: set[str]
) -> str:
    """met | pending | missing | manual. evidence_states: trạng thái danh sách kiểm theo loại bằng
    chứng (approved/pending/expired/rejected/missing — logic.checklist_state)."""
    if requirement.kind == "evidence":
        state = evidence_states.get(requirement.code, "missing")
        return "met" if state == "approved" else "pending" if state == "pending" else "missing"
    if requirement.kind == "check":
        return "met" if requirement.code in checks_passed else "missing"
    return "manual"  # admin kiểm tay theo hướng dẫn


def tier_request_error(
    status: str, tier: int, target: int, *, entitled: bool, pending: bool
) -> str | None:
    """Mã lỗi khi chưa gửi được yêu cầu lên `target`, None khi gửi được."""
    if status != "verified" or tier < 1:
        return "not_verified"
    if target != tier + 1 or target > MAX_TIER:
        return "invalid_target"
    if target in PAID_TIERS and not entitled:
        return "entitlement_required"
    if pending:
        return "request_pending"
    return None


def expired_reviewed_evidence(
    requirements: Iterable[Requirement], evidence_states: Mapping[str, str], tier: int
) -> list[str]:
    """Mã bằng chứng BẮT BUỘC, ĐÃ DUYỆT, của các cấp 2..tier mà công ty không còn hợp lệ — căn cứ để
    job hạ cấp. Nháp chưa duyệt không bao giờ làm hạ cấp."""
    return [
        r.code
        for r in requirements
        if r.kind == "evidence"
        and r.reviewed
        and r.is_required
        and 2 <= r.tier <= tier
        and evidence_states.get(r.code, "missing") != "approved"
    ]
