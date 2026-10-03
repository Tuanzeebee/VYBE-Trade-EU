"""Cấp hoặc thu hồi năng lực người duyệt luật thương mại cho một tài khoản admin.

    uv run python -m scripts.grant_legal_reviewer <email> [--revoke]

Tài khoản phải là admin đã có. Mỗi lần đổi ghi audit_logs.
"""

import argparse
import asyncio
import sys
from collections.abc import Sequence

from app.core.db import get_sessionmaker
from app.core.errors import AppError
from app.modules.auth.service import set_legal_reviewer
from scripts._console import use_utf8


async def _main(argv: Sequence[str]) -> int:
    import app.main  # noqa: F401  (nạp mọi model để mapper tìm đủ khoá ngoại)

    parser = argparse.ArgumentParser()
    parser.add_argument("email")
    parser.add_argument("--revoke", action="store_true")
    args = parser.parse_args(argv)
    try:
        async with get_sessionmaker()() as session:
            await set_legal_reviewer(session, args.email, not args.revoke)
    except AppError as error:
        print(f"Lỗi: {error.message}", file=sys.stderr)
        return 1
    print(("Đã thu hồi" if args.revoke else "Đã cấp") + f" năng lực duyệt luật TM: {args.email}")
    return 0


if __name__ == "__main__":
    use_utf8()
    raise SystemExit(asyncio.run(_main(sys.argv[1:])))
