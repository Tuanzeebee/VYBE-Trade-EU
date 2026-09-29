import datetime as dt
import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.modules.notifications.models import NotificationType


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: NotificationType
    payload: dict[str, Any]
    link: str  # đường dẫn tương đối; giao diện thêm tiền tố ngôn ngữ
    is_read: bool
    created_at: dt.datetime


class UnreadCountOut(BaseModel):
    count: int
