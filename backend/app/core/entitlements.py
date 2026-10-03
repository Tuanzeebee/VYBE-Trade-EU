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
FEATURES = (GTM_REPORT_FULL, PROFILE_VIEWERS_FULL, VERIFICATION_ENHANCED)

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
