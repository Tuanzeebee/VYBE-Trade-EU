"""Schema admin kiểm chéo bằng chứng với nguồn cấp (I8)."""

import datetime as dt
import uuid
from typing import Annotated, Any, Literal, Self

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.modules.verification.identity import domain_of

Text500 = Annotated[str, Field(min_length=1, max_length=500)]
Note = Annotated[str | None, Field(max_length=2000)]
Url = Annotated[str, Field(max_length=512, pattern=r"^https?://")]
Domain = Annotated[str, Field(min_length=3, max_length=255)]


def _domain(value: str) -> str:
    domain = domain_of(value)
    if domain is None:
        raise ValueError("official_domain must be a domain, e.g. sgs.com")
    return domain


def _email_in_domain(email: str | None, domain: str | None) -> None:
    got = domain_of(email)
    if email and domain and not (got == domain or (got or "").endswith("." + domain)):
        raise ValueError("contact_email must belong to official_domain")


class CertificationBodyIn(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=255)]
    official_domain: Domain
    contact_email: EmailStr
    lookup_url: Url | None = None
    accreditation_body: Annotated[str | None, Field(max_length=255)] = None
    iaf_mla: bool = False

    _norm = field_validator("official_domain")(_domain)

    @model_validator(mode="after")
    def _email_matches_domain(self) -> Self:
        _email_in_domain(self.contact_email, self.official_domain)
        return self


class CertificationBodyPatch(BaseModel):
    name: Annotated[str | None, Field(min_length=1, max_length=255)] = None
    official_domain: Domain | None = None
    contact_email: EmailStr | None = None
    lookup_url: Url | None = None
    accreditation_body: Annotated[str | None, Field(max_length=255)] = None
    iaf_mla: bool | None = None

    @field_validator("official_domain")
    @classmethod
    def _norm(cls, value: str | None) -> str | None:
        return None if value is None else _domain(value)


class CertificationBodyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    official_domain: str
    contact_email: str
    lookup_url: str | None
    accreditation_body: str | None
    iaf_mla: bool
    reviewed_by: uuid.UUID | None
    reviewed_at: dt.datetime | None


class SnapshotPresignIn(BaseModel):
    content_type: Literal["image/png", "image/jpeg", "application/pdf"]


class SnapshotPresignOut(BaseModel):
    upload_url: str
    key: str


class EvidenceCheckIn(BaseModel):
    """Kiểm chéo với nguồn NGOÀI: bắt buộc có nguồn và ảnh chụp kết quả."""

    check_type: Literal["registry_lookup", "issuer_email"]
    result: Literal["match", "mismatch", "not_found", "unchecked"]
    source: Text500
    snapshot_key: Annotated[str, Field(min_length=1, max_length=512)]
    certification_body_id: uuid.UUID | None = None
    note: Note = None

    @model_validator(mode="after")
    def _issuer_email_needs_body(self) -> Self:
        if self.check_type == "issuer_email" and self.certification_body_id is None:
            raise ValueError("issuer_email requires certification_body_id")
        return self


class ConsistencyIn(BaseModel):
    """Trường admin trích từ chứng nhận để so khớp nội bộ."""

    holder_name: Annotated[str | None, Field(max_length=500)] = None
    holder_address: Annotated[str | None, Field(max_length=500)] = None
    scope_categories: Annotated[list[str] | None, Field(max_length=50)] = None
    note: Note = None


class EvidenceCheckOut(BaseModel):
    id: uuid.UUID
    evidence_id: uuid.UUID | None
    check_type: str
    result: str
    source: str | None
    certification_body_id: uuid.UUID | None
    facts: dict[str, Any] | None
    note: str | None
    checked_by: uuid.UUID | None
    checked_at: dt.datetime
    snapshot_url: str | None  # pre-signed ngắn hạn, chỉ admin thấy


class EmailDraftOut(BaseModel):
    to: str
    subject: str
    body: str
