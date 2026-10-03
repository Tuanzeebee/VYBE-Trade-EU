"""Hướng bán hàng (N5): hàm thuần quyết định loại ngân sách (AGENTS.md §5.3)."""

from typing import Literal

SalesOrientation = Literal["bulk", "oem", "own_brand", "other"]
BudgetKind = Literal["sales", "brand"]


def budget_kind(orientation: SalesOrientation) -> BudgetKind:
    """Thương hiệu riêng → ngân sách làm thương hiệu; còn lại → ngân sách bán hàng."""
    return "brand" if orientation == "own_brand" else "sales"


def budget_required(orientation: SalesOrientation) -> bool:
    return orientation == "own_brand"
