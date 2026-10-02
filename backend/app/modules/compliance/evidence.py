"""Danh sách bằng chứng bắt buộc cho một lô hàng (SPEC_compliance_data_20_codes §5.3).

Hàm thuần (AGENTS.md §5.3): nhận các dòng yêu cầu đã đọc từ DB và thông tin lô, trả danh sách.
Điều kiện chưa có dữ liệu danh mục (QĐ 2019/1793, danh mục miễn kiểm dịch thực vật) KHÔNG bao giờ
được suy ra là "không cần": luôn trả CHECK_REQUIRED. Câu trả lời chưa có thì trả NEEDS_INPUT.
"""

from collections.abc import Iterable
from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

ItemStatus = Literal["REQUIRED", "NEEDS_INPUT", "CHECK_REQUIRED"]
_Match = Literal["yes", "no", "unknown", "check"]

# Sắp xếp theo mức chặn: chặn nhập khẩu trước, rồi chặn ưu đãi thuế, rồi còn lại.
_BLOCK_ORDER = {"IMPORT": 0, "TARIFF_PREFERENCE": 1, "NONE": 2}
_STATUS_ORDER: dict[str, int] = {"REQUIRED": 0, "NEEDS_INPUT": 1, "CHECK_REQUIRED": 2}

DATASET_PENDING_CONDITIONS = frozenset({"IF_LISTED_2019_1793", "IF_NOT_PHYTO_EXEMPT"})


@dataclass(frozen=True)
class RequirementData:
    """Một dòng yêu cầu (mã × loại bằng chứng × điều kiện) kèm thuộc tính của loại bằng chứng."""

    evidence_type: str
    condition: str
    name_vi: str
    name_en: str | None
    layer: str
    scope: str
    blocks: str
    legal_status: str
    reviewed: bool


@dataclass(frozen=True)
class ShipmentData:
    """None = chưa trả lời. raw_material_source: AQUACULTURE | WILD_CAUGHT | GROWN."""

    consignment_value_eur: Decimal | None = None
    raw_material_source: str | None = None
    transit_third_country: bool | None = None
    is_fresh: bool | None = None


@dataclass(frozen=True)
class EvidenceItem:
    code: str
    name_vi: str
    name_en: str | None
    layer: str
    scope: str
    blocks: str
    legal_status: str
    status: ItemStatus
    conditions: tuple[str, ...]
    review_state: Literal["REVIEWED", "UNREVIEWED"]


def _bool(value: bool | None) -> _Match:
    return "unknown" if value is None else ("yes" if value else "no")


def _match(condition: str, shipment: ShipmentData, threshold: Decimal) -> _Match:
    """Dòng này có áp dụng cho lô không: yes | no | unknown (thiếu câu trả lời) | check."""
    value = shipment.consignment_value_eur
    source = shipment.raw_material_source
    if condition == "ALWAYS":
        return "yes"
    if condition in ("CONSIGNMENT_GT_6000", "CONSIGNMENT_LE_6000"):
        if value is None:
            return "unknown"
        over = value > threshold
        return "yes" if over == (condition == "CONSIGNMENT_GT_6000") else "no"
    if condition in ("IF_WILD_CAUGHT", "IF_AQUACULTURE"):
        if source is None:
            return "unknown"
        wanted = "WILD_CAUGHT" if condition == "IF_WILD_CAUGHT" else "AQUACULTURE"
        return "yes" if source == wanted else "no"
    if condition == "IF_TRANSIT_THIRD_COUNTRY":
        return _bool(shipment.transit_third_country)
    if condition == "IF_FRESH_AND_NOT_PHYTO_EXEMPT":
        return _bool(shipment.is_fresh)
    if condition in DATASET_PENDING_CONDITIONS:
        return "check"
    return "check"  # điều kiện lạ: không bao giờ coi là không áp dụng


_MATCH_STATUS: dict[str, ItemStatus] = {
    "yes": "REQUIRED",
    "unknown": "NEEDS_INPUT",
    "check": "CHECK_REQUIRED",
}


def required_evidence(
    requirements: Iterable[RequirementData], shipment: ShipmentData, threshold: Decimal
) -> list[EvidenceItem]:
    """Bằng chứng cần cho lô. Một loại bằng chứng xuất hiện một lần (gộp các điều kiện); trạng thái
    mạnh nhất thắng (REQUIRED > NEEDS_INPUT > CHECK_REQUIRED). Sắp theo blocks rồi trạng thái."""
    merged: dict[str, EvidenceItem] = {}
    for req in requirements:
        match = _match(req.condition, shipment, threshold)
        if match == "no":
            continue
        status = _MATCH_STATUS[match]
        review: Literal["REVIEWED", "UNREVIEWED"] = "REVIEWED" if req.reviewed else "UNREVIEWED"
        previous = merged.get(req.evidence_type)
        if previous is None:
            merged[req.evidence_type] = EvidenceItem(
                req.evidence_type,
                req.name_vi,
                req.name_en,
                req.layer,
                req.scope,
                req.blocks,
                req.legal_status,
                status,
                (req.condition,),
                review,
            )
            continue
        best = min(previous.status, status, key=lambda s: _STATUS_ORDER[s])
        merged[req.evidence_type] = EvidenceItem(
            previous.code,
            previous.name_vi,
            previous.name_en,
            previous.layer,
            previous.scope,
            previous.blocks,
            previous.legal_status,
            best,
            (*previous.conditions, req.condition),
            "UNREVIEWED" if "UNREVIEWED" in (previous.review_state, review) else "REVIEWED",
        )
    return sorted(
        merged.values(),
        key=lambda i: (_BLOCK_ORDER.get(i.blocks, 9), _STATUS_ORDER[i.status], i.code),
    )


def list_review_state(items: Iterable[EvidenceItem]) -> Literal["REVIEWED", "UNREVIEWED"]:
    """Có ít nhất một dòng chưa duyệt → cả danh sách kèm lưu ý (§5.3)."""
    return "UNREVIEWED" if any(i.review_state == "UNREVIEWED" for i in items) else "REVIEWED"
