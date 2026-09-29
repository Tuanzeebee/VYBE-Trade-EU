"""Tạo tài khoản admin: python -m app.modules.auth.create_admin --email a@b.eu --name "Tên".

Mật khẩu nhập tay qua getpass (không nhận từ tham số dòng lệnh để khỏi lộ trong lịch sử shell).
VYBE từng seed Admin mật khẩu rỗng — ở đây không có mật khẩu mặc định nào.
"""

import argparse
import asyncio
import getpass
import sys

from app.core.db import get_sessionmaker
from app.core.errors import AppError
from app.modules.auth.models import UserRole
from app.modules.auth.service import create_user


async def main(email: str, name: str, password: str) -> None:
    async with get_sessionmaker()() as session:
        user = await create_user(
            session, email=email, password=password, name=name, role=UserRole.admin
        )
    print(f"Đã tạo admin {user.email}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()
    password = getpass.getpass("Mật khẩu (≥10 ký tự): ")
    if password != getpass.getpass("Nhập lại: "):
        sys.exit("Mật khẩu nhập lại không khớp.")
    try:
        asyncio.run(main(args.email, args.name, password))
    except AppError as exc:
        sys.exit(exc.message)
