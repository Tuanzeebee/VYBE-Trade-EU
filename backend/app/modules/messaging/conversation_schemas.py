import datetime as dt
import uuid
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints


class MessageIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    body: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]


class MessageOut(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_company_id: uuid.UUID
    mine: bool
    body: str  # nội dung hiển thị cho người xem: bản dịch nếu có, ngược lại bản gốc
    body_original: str
    translated: bool  # True = `body` là bản dịch (giao diện có nút xem bản gốc)
    original_language: str
    translated_language: str | None
    sent_at: dt.datetime
    read_at: dt.datetime | None


class ConversationOut(BaseModel):
    id: uuid.UUID
    rfq_id: uuid.UUID
    product_name: str
    counterpart_name: str
    last_message: str | None
    last_message_at: dt.datetime
    unread_count: int
