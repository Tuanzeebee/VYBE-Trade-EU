import uuid
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.security import MIN_PASSWORD_LENGTH

Language = Literal["vi", "en"]
Role = Literal["exporter", "buyer", "admin"]


def _no_blank(v: str) -> str:
    if not v.strip():
        raise ValueError("password must not be blank")
    return v


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=256)
    role: Literal["exporter", "buyer"]  # admin chỉ tạo bằng scripts/create_admin.py
    phone: str | None = Field(default=None, max_length=32)
    preferred_language: Language = "vi"
    accept_terms: Literal[True]

    _pw = field_validator("password")(_no_blank)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)

    _pw = field_validator("password")(_no_blank)


class MePatch(BaseModel):
    preferred_language: Language | None = None
    phone: str | None = Field(default=None, max_length=32)


class CurrentUser(BaseModel):
    id: uuid.UUID
    email: str
    role: Role
    preferred_language: Language
