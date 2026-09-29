import datetime as dt
import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    actor_id: uuid.UUID | None
    action_type: str
    entity_type: str
    entity_id: str
    before_state: dict[str, Any] | None
    after_state: dict[str, Any] | None
    created_at: dt.datetime


class StatsOut(BaseModel):
    """Số liệu dashboard nội bộ."""

    verified_count: int
    pending_count: int
    ai_queries_this_week: int
    # Trung bình high=3, medium=2, low=1; bỏ out_of_scope. None khi chưa có câu nào được chấm.
    avg_confidence: float | None
