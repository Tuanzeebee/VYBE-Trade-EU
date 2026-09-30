import datetime as dt
import uuid
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.companies.schemas import CompanyOut, ReviewProductOut

ApprovalStatusLiteral = Literal["pending", "approved", "rejected"]
ChecklistStateLiteral = Literal["missing", "pending", "approved", "expired", "rejected"]


class EvidenceIn(BaseModel):
    type_code: Annotated[str, Field(min_length=1, max_length=64)]
    file_key: Annotated[str, Field(min_length=1, max_length=512)]
    certificate_number: Annotated[str | None, Field(max_length=128)] = None
    issuer: Annotated[str | None, Field(max_length=255)] = None
    # U4: không bắt buộc (khách: "chỉ cần tải lên là xong").
    issued_at: dt.date | None = None
    expires_at: dt.date | None = None
    custom_type_name: Annotated[str | None, Field(max_length=255)] = None


class EvidencePatch(BaseModel):
    """Chỉ trường được gửi mới đổi. Sửa bằng chứng luôn đưa nó về `pending` để duyệt lại."""

    type_code: Annotated[str | None, Field(min_length=1, max_length=64)] = None
    file_key: Annotated[str | None, Field(min_length=1, max_length=512)] = None
    certificate_number: Annotated[str | None, Field(max_length=128)] = None
    issuer: Annotated[str | None, Field(max_length=255)] = None
    issued_at: dt.date | None = None
    expires_at: dt.date | None = None
    custom_type_name: Annotated[str | None, Field(max_length=255)] = None


class EvidenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type_code: str
    type_name_vi: str
    type_name_en: str
    certificate_number: str | None
    issuer: str | None
    issued_at: dt.date | None
    expires_at: dt.date | None
    custom_type_name: str | None = None
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
    target_tier: int = 1  # U20: 1 = xác minh lần đầu; 2–3 = xin lên cấp


TierRequirementState = Literal["met", "pending", "missing", "manual"]


class TierRequirementOut(BaseModel):
    """Một yêu cầu của cấp xác minh (U20). reviewed=False: bản nháp chưa được luật TM duyệt."""

    tier: int
    kind: Literal["evidence", "check", "manual"]
    code: str
    label_vi: str
    label_en: str
    is_required: bool
    reviewed: bool
    state: TierRequirementState


class TierOverviewOut(BaseModel):
    company_kind: Literal["product_seller", "service_provider", "buyer"]
    status: str
    tier: int
    tier_name_vi: str
    tier_name_en: str
    verified_at: dt.datetime | None
    tier_reviewed_at: dt.datetime | None
    tier_expires_at: dt.datetime | None
    expires_at: dt.datetime | None
    next_tier: int | None
    next_tier_paid: bool  # lên cấp này cần mua "Duyệt xác minh Nâng cao"
    entitled: bool
    pending_tier_request: bool
    request_error: str | None  # vì sao chưa gửi được yêu cầu lên cấp (None = gửi được)
    requirements: list[TierRequirementOut]


class CheckOut(BaseModel):
    """Kết quả mới nhất của một loại kiểm (U21) — tín hiệu cho admin, không phải quyết định."""

    check_code: str
    status: Literal["pass", "fail", "warning", "unknown"]
    detail: dict[str, Any]
    source: str
    manual: bool
    checked_at: dt.datetime


class ManualCheckIn(BaseModel):
    check_code: Literal[
        "national_registry", "company_registry", "certificate_issuer", "factory_video", "other"
    ]
    status: Literal["pass", "fail", "warning"]
    note: Annotated[str, Field(min_length=1, max_length=1000)]
    url: Annotated[str | None, Field(max_length=500)] = None


class TierRequestIn(BaseModel):
    target_tier: Annotated[int, Field(ge=2, le=3)]


class TierDownIn(BaseModel):
    reason: Annotated[str, Field(min_length=1, max_length=2000)]


class QueueItem(BaseModel):
    request_id: uuid.UUID
    company_id: uuid.UUID
    legal_name: str
    tax_id: str | None
    country: str
    submitted_at: dt.datetime
    evidences: list[EvidenceOut]  # xem bằng chứng ngay trên dòng
    company: CompanyOut  # hồ sơ đầy đủ để admin đối chiếu
    products: list[ReviewProductOut]
    target_tier: int = 1  # U20
    current_tier: int = 0
    tier_requirements: list[TierRequirementOut] = Field(default_factory=list)
    checks: list[CheckOut] = Field(default_factory=list)  # U21


class DecisionIn(BaseModel):
    decision: Literal["approve", "reject", "request_info"]
    reason: Annotated[str | None, Field(max_length=2000)] = None


class PublicCertificateOut(BaseModel):
    """Loại chứng nhận có thể lọc công khai trong danh bạ."""

    code: str
    name_vi: str
    name_en: str
