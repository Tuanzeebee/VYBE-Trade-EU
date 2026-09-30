"""Băm mật khẩu Argon2 và token phiên. Không bao giờ log giá trị trả về của các hàm này."""

import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError

_hasher = PasswordHasher()
MIN_PASSWORD_LENGTH = 10


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerificationError:
        return False


def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
