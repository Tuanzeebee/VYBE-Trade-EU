"""Tạo tài khoản admin — cách duy nhất, không có API đăng ký admin.

    uv run python -m scripts.create_admin admin@evfta.eu

Mật khẩu nhập qua prompt ẩn, không nhận qua tham số dòng lệnh và không in ra.
"""

import asyncio
import getpass
import sys
from collections.abc import Callable, Sequence

from app.core.db import get_sessionmaker
from app.modules.auth.service import create_admin, validate_password
from scripts._console import use_utf8


async def _create(email: str, password: str) -> None:
    async with get_sessionmaker()() as session:
        await create_admin(session, email, password)


def main(
    argv: Sequence[str] | None = None,
    ask_password: Callable[[str], str] = getpass.getpass,
) -> int:
    use_utf8()
    args = list(sys.argv[1:] if argv is None else argv)
    if len(args) != 1:
        print("Cách dùng: python -m scripts.create_admin <email>", file=sys.stderr)
        return 2
    password = ask_password("Mật khẩu admin (≥ 10 ký tự): ")
    try:
        validate_password(password)
    except ValueError:
        print("Mật khẩu rỗng hoặc ngắn hơn 10 ký tự.", file=sys.stderr)
        return 1
    asyncio.run(_create(args[0], password))
    print(f"Đã tạo admin {args[0].lower()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
