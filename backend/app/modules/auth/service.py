"""API công khai của module auth: tài khoản, mật khẩu, phiên, phân quyền.

Khung lấy từ VYBE .NET (ApplicationUser: AccessFailedCount/LockoutEnd/IsActive, email unique),
bỏ lỗi AuthController cho qua khi mật khẩu rỗng.
"""

import hashlib
import secrets
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
from typing import Annotated

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, Request
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_session
from app.core.errors import AppError
from app.modules.auth.models import Session, User, UserRole

MIN_PASSWORD = 10
MAX_FAILED_LOGINS = 5
LOCK_DURATION = timedelta(minutes=15)

_hasher = PasswordHasher()
# Băm sẵn để email không tồn tại cũng tốn thời gian như email có thật (chống dò email).
_DUMMY_HASH = _hasher.hash("evfta-dummy-password")


def _now() -> datetime:
    return datetime.now(UTC)


def _invalid_credentials() -> AppError:
    return AppError("invalid_credentials", "Email hoặc mật khẩu không đúng.", 401)


def _locked() -> AppError:
    return AppError(
        "account_locked",
        "Tài khoản tạm khóa 15 phút do nhập sai mật khẩu nhiều lần.",
        423,
    )


def _verify(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def create_user(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    name: str,
    role: UserRole,
    company_name: str | None = None,
    preferred_language: str = "vi",
    consent_accepted: bool = False,
) -> User:
    """Dùng chung cho đăng ký, lệnh create_admin và seed_demo."""
    if len(password) < MIN_PASSWORD:
        raise AppError("weak_password", "Mật khẩu cần ít nhất 10 ký tự.", 422)
    email = email.strip().lower()
    if await session.scalar(select(User.id).where(User.email == email)):
        raise AppError("email_taken", "Email này đã có tài khoản.", 409)
    user = User(
        email=email,
        name=name.strip(),
        company_name=company_name.strip() if company_name else None,
        password_hash=_hasher.hash(password),
        role=role,
        preferred_language=preferred_language,
        consent_accepted_at=_now() if consent_accepted else None,
        consent_version=get_settings().consent_version if consent_accepted else None,
    )
    session.add(user)
    try:
        await session.commit()
    except IntegrityError as exc:  # hai request đăng ký cùng email đến cùng lúc
        await session.rollback()
        raise AppError("email_taken", "Email này đã có tài khoản.", 409) from exc
    return user


async def authenticate(session: AsyncSession, email: str, password: str) -> User:
    if not password:  # bài học VYBE A1: mật khẩu rỗng không bao giờ được qua
        raise _invalid_credentials()
    user = await session.scalar(select(User).where(User.email == email.strip().lower()))
    if user is None or not user.is_active:
        _verify(_DUMMY_HASH, password)
        raise _invalid_credentials()

    now = _now()
    if user.locked_until and user.locked_until > now:
        raise _locked()

    if not _verify(user.password_hash, password):
        user.failed_login_count += 1
        just_locked = user.failed_login_count >= MAX_FAILED_LOGINS
        if just_locked:
            user.locked_until = now + LOCK_DURATION
            user.failed_login_count = 0
        await session.commit()
        raise _locked() if just_locked else _invalid_credentials()

    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = now
    if _hasher.check_needs_rehash(user.password_hash):
        user.password_hash = _hasher.hash(password)
    await session.commit()
    return user


async def create_session(session: AsyncSession, user: User) -> str:
    """Trả token thô để đặt vào cookie; DB chỉ giữ hash."""
    token = secrets.token_urlsafe(32)
    session.add(
        Session(
            user_id=user.id,
            token_hash=_token_hash(token),
            expires_at=_now() + timedelta(days=get_settings().session_days),
        )
    )
    await session.commit()
    return token


async def revoke_session(session: AsyncSession, token: str) -> None:
    await session.execute(delete(Session).where(Session.token_hash == _token_hash(token)))
    await session.commit()


async def user_from_token(session: AsyncSession, token: str) -> User | None:
    return await session.scalar(
        select(User)
        .join(Session, Session.user_id == User.id)
        .where(
            Session.token_hash == _token_hash(token),
            Session.expires_at > _now(),
            User.is_active.is_(True),
        )
    )


async def update_me(
    session: AsyncSession, user: User, *, name: str | None, preferred_language: str | None
) -> User:
    if name is not None:
        user.name = name.strip()
    if preferred_language is not None:
        user.preferred_language = preferred_language
    await session.commit()
    return user


async def list_users(session: AsyncSession) -> list[User]:
    return list(await session.scalars(select(User).order_by(User.created_at.desc())))


# --- Dependency phân quyền (lớp 1, gắn trên router). Service vẫn tự kiểm chủ sở hữu (lớp 2).


async def current_user(
    request: Request, session: Annotated[AsyncSession, Depends(get_session)]
) -> User:
    token = request.cookies.get(get_settings().session_cookie_name)
    user = await user_from_token(session, token) if token else None
    if user is None:
        raise AppError("unauthenticated", "Vui lòng đăng nhập.", 401)
    return user


def require_role(*roles: UserRole) -> Callable[..., Awaitable[User]]:
    async def dependency(user: Annotated[User, Depends(current_user)]) -> User:
        if user.role not in roles:
            raise AppError("forbidden", "Bạn không có quyền truy cập.", 403)
        return user

    return dependency
