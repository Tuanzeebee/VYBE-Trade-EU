import datetime as dt
import uuid
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

ApprovalStatusLiteral = Literal["pending", "approved", "rejected"]
ChecklistStateLiteral = Literal["missing", "pending", "approved", "expired", "rejected"]


class EvidenceIn(BaseModel):
    type_code: Annotated[str, Field(min_length=1, max_length=64)]
    file_key: Annotated[str, Field(min_length=1, max_length=512)]
    certificate_number: Annotated[str | None, Field(max_length=128)] = None
    issuer: Annotated[str | None, Field(max_length=255)] = None
    issued_at: dt.date
    expires_at: dt.date | None = None


class EvidencePatch(BaseModel):
    """Chỉ trường được gửi mới đổi. Sửa bằng chứng luôn đưa nó về `pending` để duyệt lại."""

    type_code: Annotated[str | None, Field(min_length=1, max_length=64)] = None
    file_key: Annotated[str | None, Field(min_length=1, max_length=512)] = None
    certificate_number: Annotated[str | None, Field(max_length=128)] = None
    issuer: Annotated[str | None, Field(max_length=255)] = None
    issued_at: dt.date | None = None
    expires_at: dt.date | None = None


class EvidenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type_code: str
    type_name_vi: str
    type_name_en: str
    certificate_number: str | None
    issuer: str | None
    issued_at: dt.date
    expires_at: dt.date | None
    approval_status: ApprovalStatusLiteral
    reject_reason: str | None
    file_url: str  # URL tải xuống có hạn ngắn (pre-signed)


class ChecklistItem(BaseModel):
    type_code: str
    name_vi: str
    name_en: str
    required: bool  # false = chỉ nhắc (vd EUDR cho cà phê), không tính vào EVFTA-verified
    note: str | None
    state: ChecklistStateLiteral
