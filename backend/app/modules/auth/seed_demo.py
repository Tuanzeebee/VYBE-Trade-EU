"""Tạo 3 tài khoản demo khớp panel "Tài khoản trải nghiệm" của frontend (lib/demoAuth.ts).

CHỈ chạy khi ENV=dev: không để tài khoản mật khẩu công khai (nhất là admin) lên staging/prod.
Chạy lại nhiều lần không lỗi.
"""

import asyncio
import sys

from sqlalchemy import select

from app.core.config import get_settings
from app.core.db import get_sessionmaker
from app.modules.auth.models import User, UserRole
from app.modules.auth.service import create_user

DEMO_PASSWORD = "VybeDemo123!"  # noqa: S105 — trùng DEMO_PASSWORD của frontend, chỉ dev
DEMO_USERS = [
    ("buyer@vybe.demo", "Alex Nguyen", "Global Foods Trading", UserRole.buyer),
    ("seller@vybe.demo", "Nguyễn Văn Trí", "Công ty TNHH Nông Sản Việt", UserRole.exporter),
    ("admin@vybe.demo", "VYBE Administrator", "VYBE Trade", UserRole.admin),
]


async def seed() -> list[str]:
    if get_settings().env != "dev":
        raise RuntimeError(f"seed_demo chỉ chạy khi ENV=dev (hiện: {get_settings().env}).")
    created = []
    async with get_sessionmaker()() as session:
        for email, name, company, role in DEMO_USERS:
            if await session.scalar(select(User.id).where(User.email == email)):
                continue
            await create_user(
                session,
                email=email,
                password=DEMO_PASSWORD,
                name=name,
                company_name=company,
                role=role,
                consent_accepted=True,
            )
            created.append(email)
    return created


if __name__ == "__main__":
    try:
        print("Đã tạo:", asyncio.run(seed()) or "không có (đã tồn tại)")
    except RuntimeError as exc:
        sys.exit(str(exc))
