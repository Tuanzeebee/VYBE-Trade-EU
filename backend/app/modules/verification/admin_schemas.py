"""Schema admin: loại bằng chứng, luật bắt buộc theo nhóm hàng, duyệt bằng chứng (C6)."""

import datetime as dt
import uuid
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Code = Annotated[str, Field(pattern=r"^[a-z][a-z0-9_]{1,63}$")]
Name = Annotated[str, Field(min_length=1, max_length=255)]
Group = Annotated[str, Field(min_length=1, max_length=32)]
Months = Annotated[int, Field(gt=0, le=600)]
Source = Annotated[str | None, Field(max_length=4000)]


class EvidenceTypeIn(BaseModel):
    code: Code
    name_vi: Name
    name_en: Name
    group: Group
    validity_months: Months | None = None
    is_active: bool = True
    source: Source = None


class EvidenceTypePatch(BaseModel):
    name_vi: Name | None = None
    name_en: Name | None = None
    group: Group | None = None
    validity_months: Months | None = None
    is_active: bool | None = None
    source: Source = None


class EvidenceTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name_vi: str
    name_en: str
    group: str
    validity_months: int | None
    is_active: bool
    source: str | None
    reviewed_by: uuid.UUID | None
    reviewed_at: dt.datetime | None


class RuleIn(BaseModel):
    category: Annotated[str, Field(min_length=1, max_length=32)]
    evidence_type_code: Code
    is_required: bool = True
    note: Annotated[str | None, Field(max_length=1000)] = None


class RuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category: str
    evidence_type_code: str
    is_required: bool
    note: str | None
    reviewed_by: uuid.UUID | None
    reviewed_at: dt.datetime | None


class EvidenceReviewIn(BaseModel):
    decision: Literal["approve", "reject"]
    reason: Annotated[str | None, Field(max_length=2000)] = None
