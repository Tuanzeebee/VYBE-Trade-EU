"""Hàm thuần của billing (U19): mã tham chiếu, cửa sổ quyền dùng, chuyển trạng thái đơn."""

import datetime as dt
import secrets

# Không có 0/O, 1/I/L để đọc qua điện thoại hay gõ nội dung chuyển khoản không nhầm.
REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
REFERENCE_PREFIX = "VYBE"
REFERENCE_LENGTH = 6

TRANSITIONS: dict[str, dict[str, str]] = {
    "pending": {"confirm_payment": "paid", "cancel": "cancelled"},
    "paid": {},
    "cancelled": {},
}


def new_reference() -> str:
    body = "".join(secrets.choice(REFERENCE_ALPHABET) for _ in range(REFERENCE_LENGTH))
    return f"{REFERENCE_PREFIX}{body}"


def next_status(status: str, action: str) -> str | None:
    """Trạng thái mới, hoặc None khi hành động không hợp lệ ở trạng thái hiện tại."""
    return TRANSITIONS.get(status, {}).get(action)


def entitlement_window(
    now: dt.datetime, duration_days: int | None, current_until: dt.datetime | None
) -> tuple[dt.datetime, dt.datetime | None]:
    """Mua tiếp khi quyền cùng loại còn hạn → nối tiếp từ ngày hết hạn cũ, không mất ngày đã trả.
    duration_days None = không hết hạn."""
    start = current_until if current_until is not None and current_until > now else now
    if duration_days is None:
        return start, None
    return start, start + dt.timedelta(days=duration_days)
