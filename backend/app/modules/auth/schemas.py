import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.auth.models import UserRole

Language = Literal["vi", "en"]


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    name: str = Field(min_length=1, max_length=120)
    company_name: str = Field(min_length=1, max_length=200)
    role: Literal["buyer", "exporter"]  # admin không tự đăng ký được
    preferred_language: Language = "vi"
    consent_accepted: Literal[True]


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    company_name: str | None
    role: UserRole
    preferred_language: Language


class MePatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    preferred_language: Language | None = None
