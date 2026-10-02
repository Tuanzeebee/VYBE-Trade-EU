"""Kiểm tham số `params` của product_specific_rules theo từng rule_type
(SPEC_compliance_data_20_codes §4).

Seed sai schema → bộ nạp dừng, không nạp một phần. Thập phân giữ dạng chuỗi trong JSONB.
"""

from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


class _Params(BaseModel):
    model_config = ConfigDict(extra="forbid")


class WoProductParams(_Params):
    pass


class WoProductVesselParams(_Params):
    vessel_min_ownership_pct: Decimal


class WoMaterialsParams(_Params):
    restricted_chapters: list[int]
    # None + PENDING_LEGAL: luật sư chưa chốt dung sai → có nguyên liệu nhập thì INCONCLUSIVE
    tolerance_pct: Decimal | None
    tolerance_status: Literal["PENDING_LEGAL", "CONFIRMED"]


class WoMaterialsVesselParams(WoMaterialsParams):
    vessel_min_ownership_pct: Decimal


class WoMaterialsToleranceParams(_Params):
    tolerance_pct: Decimal
    tolerance_basis: Literal["WEIGHT_AND_VALUE", "WEIGHT", "VALUE"]
    restricted_chapters: list[int]


class WoMaterialsSugarCapParams(WoMaterialsToleranceParams):
    sugar_max_pct_weight: Decimal


PARAMS_MODELS: dict[str, type[_Params]] = {
    "WO_PRODUCT": WoProductParams,
    "WO_PRODUCT_VESSEL": WoProductVesselParams,
    "WO_MATERIALS": WoMaterialsParams,
    "WO_MATERIALS_VESSEL": WoMaterialsVesselParams,
    "WO_MATERIALS_TOLERANCE": WoMaterialsToleranceParams,
    "WO_MATERIALS_SUGAR_CAP": WoMaterialsSugarCapParams,
}


def validate_params(rule_type: str, params: dict[str, Any]) -> dict[str, Any]:
    """Trả params đã chuẩn hoá (JSON-safe); ValueError nếu rule_type lạ hoặc params sai."""
    model = PARAMS_MODELS.get(rule_type)
    if model is None:
        raise ValueError(f"rule_type không có schema params: {rule_type}")
    return model.model_validate(params).model_dump(mode="json")
