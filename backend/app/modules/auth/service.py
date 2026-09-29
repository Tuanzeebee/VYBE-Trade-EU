"""API công khai của module auth.

Module khác chỉ dùng get_current_user, require_role và schema CurrentUser.
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Cookie, Depends
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.config import get_settings
from app.core.db import get_session
from app.core.errors import AppError
from app.core.security import (
    MIN_PASSWORD_LENGTH,
    hash_password,
    hash_token,
    new_session_token,
    verify_password,
)
from app.modules.auth.models import Session, User, UserRole
from app.modules.auth.schemas import CurrentUser, LoginIn, MePatch, RegisterIn

COOKIE_NAME = "evfta_session"
MAX_FAILED_LOGINS = 5
LOCK_MINUTES = 15
_DUMMY_HASH = hash_password("dummy-password-for-timing")


def validate_password(password: str) -> str:
    if len(password) < MIN_PASSWORD_LENGTH or not password.strip():
        raise ValueError("password too short or blank")
    return password


def _to_current(user: User) -> CurrentUser:
    return CurrentUser.model_validate(
        {
            "id": user.id,
            "email": user.email,
            "role": user.role.value,
            "preferred_language": user.preferred_language,
        }
    )


def _open_session(session: AsyncSession, user: User) -> str:
    token = new_session_token()
    session.add(
        Session(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=datetime.now(UTC) + timedelta(days=get_settings().session_days),
        )
    )
    return token


async def register(session: AsyncSession, data: RegisterIn) -> str:
    """Tạo tài khoản exporter/buyer, lưu consent và mở phiên. Trả token phiên."""
    email = data.email.lower()
    if await session.scalar(select(User.id).where(User.email == email)):
        raise AppError("email_taken", "Email already registered", 409)
    user = User(
        email=email,
        phone=data.phone,
        password_hash=hash_password(data.password),
        role=UserRole(data.role),
        preferred_language=data.preferred_language,
        consent_accepted_at=datetime.now(UTC),
        consent_version=get_settings().consent_version,
    )
    session.add(user)
    await session.flush()
    token = _open_session(session, user)
    await session.commit()
    return token


async def login(session: AsyncSession, data: LoginIn) -> str:
    """Sai 5 lần liên tiếp → khóa 15 phút. Trả token phiên."""
    now = datetime.now(UTC)
    user = await session.scalar(
        select(User).where(User.email == data.email.lower(), User.deleted_at.is_(None))
    )
    if user is None:
        verify_password(_DUMMY_HASH, data.password)  # cân bằng thời gian phản hồi
        raise AppError("invalid_credentials", "Invalid email or password", 401)
    if user.locked_until and user.locked_until > now:
        raise AppError("account_locked", "Account locked, try again later", 423)
    if not verify_password(user.password_hash, data.password):
        user.failed_login_count += 1
        if user.failed_login_count >= MAX_FAILED_LOGINS:
            user.locked_until = now + timedelta(minutes=LOCK_MINUTES)
            user.failed_login_count = 0
        await session.commit()
        raise AppError("invalid_credentials", "Invalid email or password", 401)
    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = now
    token = _open_session(session, user)
    await session.commit()
    return token


async def logout(session: AsyncSession, token: str | None) -> None:
    if token:
        await session.execute(delete(Session).where(Session.token_hash == hash_token(token)))
        await session.commit()


async def _user_from_token(session: AsyncSession, token: str | None) -> User | None:
    if not token:
        return None
    user: User | None = await session.scalar(
        select(User)
        .join(Session, Session.user_id == User.id)
        .where(
            Session.token_hash == hash_token(token),
            Session.expires_at > datetime.now(UTC),
            User.deleted_at.is_(None),
        )
    )
    return user


async def get_current_user(
    session: Annotated[AsyncSession, Depends(get_session)],
    evfta_session: Annotated[str | None, Cookie()] = None,
) -> CurrentUser:
    """Dependency: 401 khi thiếu phiên hoặc phiên hết hạn."""
    user = await _user_from_token(session, evfta_session)
    if user is None:
        raise AppError("unauthenticated", "Login required", 401)
    return _to_current(user)


async def get_optional_user(
    session: Annotated[AsyncSession, Depends(get_session)],
    evfta_session: Annotated[str | None, Cookie()] = None,
) -> CurrentUser | None:
    """Dependency cho endpoint công khai: có phiên thì trả người dùng, khách thì None."""
    user = await _user_from_token(session, evfta_session)
    return _to_current(user) if user else None


def require_role(*roles: str) -> Callable[..., Awaitable[CurrentUser]]:
    """Dependency cấp router: 401 khi thiếu phiên, 403 khi sai vai trò."""

    async def dep(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
        if user.role not in roles:
            raise AppError("forbidden", "Not allowed for this role", 403)
        return user

    return dep


async def update_me(session: AsyncSession, user_id: uuid.UUID, data: MePatch) -> CurrentUser:
    user = await session.get_one(User, user_id)
    if data.preferred_language is not None:
        user.preferred_language = data.preferred_language
    if data.phone is not None:
        user.phone = data.phone
    await session.commit()
    return _to_current(user)


async def get_admin_by_email(session: AsyncSession, email: str) -> CurrentUser | None:
    """Admin theo email (script nhập dữ liệu cần một actor thật để ghi audit)."""
    user = await session.scalar(
        select(User).where(
            User.email == email.lower(), User.role == UserRole.admin, User.deleted_at.is_(None)
        )
    )
    return _to_current(user) if user else None


async def create_admin(session: AsyncSession, email: str, password: str) -> uuid.UUID:
    """Chỉ gọi từ scripts/create_admin.py — không có API tạo admin."""
    validate_password(password)
    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        role=UserRole.admin,
        preferred_language="vi",
        consent_accepted_at=datetime.now(UTC),
        consent_version=get_settings().consent_version,
    )
    session.add(user)
    await session.flush()
    await record(
        session,
        actor_id=None,
        action_type="user.create_admin",
        entity_type="user",
        entity_id=str(user.id),
        before=None,
        after={"email": user.email, "role": "admin"},
    )
    await session.commit()
    return user.id
