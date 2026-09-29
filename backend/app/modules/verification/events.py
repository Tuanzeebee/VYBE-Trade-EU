import uuid
from dataclasses import dataclass

from app.core.events import Event


@dataclass(frozen=True)
class VerificationStatusChanged(Event):
    """Phát sau mỗi quyết định xác minh (email H2, thông báo, dashboard)."""

    company_id: uuid.UUID
    old_status: str
    new_status: str
    old_level: str
    new_level: str
    decision: str = ""  # approve | reject | request_info | expire | submit | level_up | level_down
    reason: str | None = None  # lý do quản trị viên nhập (từ chối / yêu cầu bổ sung)
