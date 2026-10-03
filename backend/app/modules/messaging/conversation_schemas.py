import datetime as dt
import uuid
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

Body = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]


class MessageIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    body: Body


class DirectConversationIn(BaseModel):
    """U7: nhắn tin trực tiếp tới nhà cung cấp đang hiển thị công khai (theo slug hồ sơ)."""

    model_config = ConfigDict(extra="forbid")

    supplier_slug: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)
    ]
    body: Body


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
    rfq_id: uuid.UUID | None  # None = hội thoại trực tiếp (U7)
    product_name: str  # "" với hội thoại trực tiếp
    counterpart_company_id: uuid.UUID
    counterpart_name: str
    counterpart_verified: bool
    last_message: str | None
    last_message_at: dt.datetime
    unread_count: int
