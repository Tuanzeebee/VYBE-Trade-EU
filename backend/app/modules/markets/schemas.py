import datetime as dt
import uuid
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

HsCode = Annotated[str, Field(pattern=r"^[0-9]{2,8}$")]


class PriorityProductOut(BaseModel):
    hs_code: str
    family: str
    name_vi: str
    name_en: str
    keywords: list[str]


class TradeImportIn(BaseModel):
    """Nạp từ Eurostat Comext. Bỏ trống products = danh sách mã ưu tiên; năm mặc định 6 năm gần
    nhất."""

    model_config = ConfigDict(extra="forbid")

    products: Annotated[list[HsCode], Field(max_length=50)] = Field(default_factory=list)
    year_from: Annotated[int | None, Field(ge=2000, le=2100)] = None
    year_to: Annotated[int | None, Field(ge=2000, le=2100)] = None

    @field_validator("products")
    @classmethod
    def _unique(cls, values: list[str]) -> list[str]:
        return list(dict.fromkeys(values))


class TradeImportBatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source: str
    params: dict[str, Any]
    status: str
    rows_imported: int
    error: str | None
    created_at: dt.datetime
    finished_at: dt.datetime | None
