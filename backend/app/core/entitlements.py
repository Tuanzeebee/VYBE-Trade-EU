"""Quyền dùng tính năng trả phí (U19, ADR-0005).

Module dùng tính năng chỉ hỏi `has_feature()`; module billing đăng ký bộ kiểm tra thật lúc khởi động
(app.main). Chưa đăng ký thì mặc định đóng: người dùng chỉ thấy phần miễn phí.
Công cụ tuân thủ (máy tính thuế, xuất xứ, trợ lý AI) không bao giờ gắn quyền trả phí.
"""

import uuid
from collections.abc import Awaitable, Callable

from sqlalchemy.ext.asyncio import AsyncSession

GTM_REPORT_FULL = "gtm_report_full"
PROFILE_VIEWERS_FULL = "profile_viewers_full"
VERIFICATION_ENHANCED = "verification_enhanced_review"
MORE_PRODUCTS = "more_products"  # N8: bỏ giới hạn số sản phẩm của gói Basic
FEATURES = (GTM_REPORT_FULL, PROFILE_VIEWERS_FULL, VERIFICATION_ENHANCED, MORE_PRODUCTS)

MAX_PRODUCTS = "max_products"  # khóa giới hạn số lượng (N8)

Checker = Callable[[AsyncSession, uuid.UUID, str], Awaitable[bool]]


async def _closed(session: AsyncSession, company_id: uuid.UUID, feature: str) -> bool:
    return False


_checker: Checker = _closed


def register(checker: Checker) -> Checker:
    """Đặt bộ kiểm tra (billing lúc khởi động, test khi cần). Trả về bộ cũ để khôi phục."""
    global _checker
    previous, _checker = _checker, checker
    return previous


async def has_feature(session: AsyncSession, company_id: uuid.UUID, feature: str) -> bool:
    return await _checker(session, company_id, feature)


LimitProvider = Callable[[AsyncSession, uuid.UUID, str], Awaitable[int | None]]


async def _no_limit(session: AsyncSession, company_id: uuid.UUID, key: str) -> int | None:
    return None


_limit_provider: LimitProvider = _no_limit


def register_limit(provider: LimitProvider) -> LimitProvider:
    """Đặt nguồn giới hạn số lượng (billing lúc khởi động). Trả về nguồn cũ để khôi phục."""
    global _limit_provider
    previous, _limit_provider = _limit_provider, provider
    return previous


async def limit_for(session: AsyncSession, company_id: uuid.UUID, key: str) -> int | None:
    """Giới hạn số lượng của `key` cho công ty; None = không giới hạn."""
    return await _limit_provider(session, company_id, key)
