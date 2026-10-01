"""Schema admin chống mạo danh (I11): kiểm danh tính, cụm tài khoản, danh sách chặn."""

import datetime as dt
import uuid
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.verification.schemas import SignalOut

Note = Annotated[str | None, Field(max_length=2000)]


class RegistryFactsIn(BaseModel):
    """Dữ kiện admin đọc từ sổ đăng ký chính thức. Tên người đại diện chỉ dùng để băm, không lưu."""

    legal_representative: Annotated[str | None, Field(max_length=255)] = None
    registered_name: Annotated[str | None, Field(max_length=500)] = None  # tên pháp nhân theo sổ
    registered_address: Annotated[str | None, Field(max_length=500)] = None
    founded_year: Annotated[int | None, Field(ge=1900, le=2100)] = None
    tax_status: Literal["active", "inactive", "unknown"] = "unknown"
    name_changed_recently: bool = False
    representative_changed_recently: bool = False


class IdentityCheckIn(BaseModel):
    check_type: Literal["registry_lookup", "phone_callback", "email_domain"]
    result: Literal["match", "mismatch", "not_found", "unchecked"]
    note: Note = None
    registry: RegistryFactsIn | None = None
    source: Annotated[str | None, Field(max_length=500)] = None  # URL / tên nguồn đã tra
    snapshot_key: Annotated[str | None, Field(max_length=512)] = None  # ảnh chụp kết quả tra

    @model_validator(mode="after")
    def _registry_only_for_lookup(self) -> "IdentityCheckIn":
        if self.registry is not None and self.check_type != "registry_lookup":
            raise ValueError("registry facts are only accepted for registry_lookup")
        if self.check_type == "registry_lookup" and not (self.source and self.snapshot_key):
            # I8: tra MST / sổ đăng ký phải lưu nguồn và ảnh chụp kết quả.
            raise ValueError("registry_lookup requires source and snapshot_key")
        return self


class IdentityCheckOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    subject: str
    check_type: str
    result: str
    facts: dict[str, Any] | None
    source: str | None
    note: str | None
    checked_by: uuid.UUID | None
    checked_at: dt.datetime


class ClusterCompany(BaseModel):
    id: uuid.UUID
    legal_name: str


class ClusterOut(BaseModel):
    identifier_type: str  # tax_id | domain | phone | file_sha256 | representative
    value: str  # representative: mã băm, không phải tên
    companies: list[ClusterCompany]


class CompanyIdentityOut(BaseModel):
    company_id: uuid.UUID
    ownership_proven: bool
    signals: list[SignalOut]
    checks: list[IdentityCheckOut]  # mới nhất trước
    clusters: list[ClusterOut]


class BlocklistIn(BaseModel):
    identifier_type: Literal["tax_id", "domain", "phone", "file_sha256"]
    value: Annotated[str, Field(min_length=1, max_length=255)]
    reason: Annotated[str, Field(min_length=1, max_length=2000)]


class BlocklistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    identifier_type: str
    value: str
    reason: str
    added_by: uuid.UUID
    created_at: dt.datetime
