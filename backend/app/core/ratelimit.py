"""Rate limit cho nhóm /api/public/* (khách dùng máy tính, tìm mã HS, xem hồ sơ).

30 yêu cầu/phút cho mỗi IP, dùng chung cho mọi endpoint công khai (cửa sổ trượt). Bộ đếm nằm
trong bộ nhớ tiến trình: chạy nhiều worker thì mỗi worker đếm riêng — chấp nhận được ở MVP,
không thêm Redis (AGENTS.md §2). Gắn ở mức app nên route công khai mới tự được giới hạn.
"""

from fastapi import Request
from limits import parse
from limits.aio.storage import MemoryStorage
from limits.aio.strategies import MovingWindowRateLimiter

from app.core.errors import AppError

PUBLIC_PREFIX = "/api/public/"
PUBLIC_LIMIT = parse("30/minute")

_storage = MemoryStorage()
_window = MovingWindowRateLimiter(_storage)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


async def enforce_public_limit(request: Request) -> None:
    """Dependency toàn app: chỉ đếm request tới /api/public/*."""
    if not request.url.path.startswith(PUBLIC_PREFIX):
        return
    if not await _window.hit(PUBLIC_LIMIT, "public", _client_ip(request)):
        raise AppError(
            "rate_limited",
            "Too many requests. Please try again in a minute.",
            429,
            headers={"Retry-After": "60"},
        )


async def reset() -> None:
    """Xóa bộ đếm (dùng trong test)."""
    await _storage.reset()
