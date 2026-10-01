import datetime as dt
import uuid
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.verification.crosscheck_schemas import EvidenceCheckOut

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


class EvidenceTypePublic(BaseModel):
    """Loại bằng chứng exporter được nộp (đã duyệt, đang bật) — không lộ thông tin duyệt."""

    model_config = ConfigDict(from_attributes=True)

    code: str
    name_vi: str
    name_en: str
    group: str
    validity_months: int | None


class ChecklistItem(BaseModel):
    type_code: str
    name_vi: str
    name_en: str
    required: bool  # false = chỉ nhắc (vd EUDR cho cà phê), không tính vào EVFTA-verified
    note: str | None
    state: ChecklistStateLiteral


RequestStatusLiteral = Literal["pending", "approved", "rejected", "info_requested"]


class VerificationRequestOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    status: RequestStatusLiteral
    evidence_ids: list[uuid.UUID]
    submitted_at: dt.datetime
    reviewed_at: dt.datetime | None
    decision_reason: str | None  # exporter thấy lý do từ chối / yêu cầu bổ sung


class SignalOut(BaseModel):
    """Tín hiệu rủi ro danh tính (I11) — chỉ để xếp ưu tiên, không phải quyết định."""

    code: str
    severity: Literal["high", "medium", "low"]


class QueueItem(BaseModel):
    request_id: uuid.UUID
    company_id: uuid.UUID
    legal_name: str
    tax_id: str | None
    country: str
    submitted_at: dt.datetime
    evidences: list[EvidenceOut]  # xem bằng chứng ngay trên dòng
    checks: list[EvidenceCheckOut] = []  # I8: mọi lần kiểm của các bằng chứng đã nộp
    signals: list[SignalOut] = []  # I11: có cờ cao thì lên đầu hàng đợi
    ownership_proven: bool = False  # I11: đã gọi lại số chính thức và khớp


class DecisionIn(BaseModel):
    decision: Literal["approve", "reject", "request_info"]
    reason: Annotated[str | None, Field(max_length=2000)] = None


class PublicCertificateOut(BaseModel):
    """Loại chứng nhận có thể lọc công khai trong danh bạ."""

    code: str
    name_vi: str
    name_en: str
