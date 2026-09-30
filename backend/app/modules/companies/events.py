import uuid
from dataclasses import dataclass

from app.core.events import Event


@dataclass(frozen=True)
class CompanyUpdated(Event):
    """Phát sau khi hồ sơ công ty được tạo hoặc sửa (B3 tính lại điểm hoàn thiện)."""

    company_id: uuid.UUID
