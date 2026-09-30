"""Thử sao lưu và khôi phục PostgreSQL trên DB DEV (J8): pg_dump, pg_restore vào DB tạm, đối soát.

    uv run python -m scripts.backup_restore_check --container vybe-trade-eu-db-1

Chỉ chạy với DB trên localhost và tên DB không chứa 'staging'/'prod'. Ghi vào một DB tạm
(`<nguồn>_restore_check`), xong xóa; DB nguồn chỉ được ĐỌC. Không dùng cho staging/prod.
"""

import argparse
import asyncio
import subprocess
import sys
import tempfile
from pathlib import Path

import asyncpg
from sqlalchemy.engine import make_url

from app.core.config import get_settings

FORBIDDEN_WORDS = ("staging", "prod")


def assert_safe_target(host: str | None, database: str | None) -> None:
    """Từ chối chạy ngoài môi trường dev cục bộ."""
    if host not in ("localhost", "127.0.0.1"):
        raise SystemExit(f"Từ chối: máy chủ '{host}' không phải localhost")
    if not database or any(word in database.lower() for word in FORBIDDEN_WORDS):
        raise SystemExit(f"Từ chối: tên DB '{database}' có vẻ là staging/prod")


def compare_counts(source: dict[str, int], restored: dict[str, int]) -> list[str]:
    """Danh sách khác biệt (rỗng = khớp hoàn toàn)."""
    problems = []
    for table in sorted(set(source) | set(restored)):
        if table not in restored:
            problems.append(f"{table}: thiếu ở bản khôi phục")
        elif table not in source:
            problems.append(f"{table}: thừa ở bản khôi phục")
        elif source[table] != restored[table]:
            problems.append(
                f"{table}: nguồn {source[table]} dòng, khôi phục {restored[table]} dòng"
            )
    return problems


async def table_counts(conn: asyncpg.Connection) -> dict[str, int]:
    rows = await conn.fetch(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    )
    counts: dict[str, int] = {}
    for row in rows:
        name = row["tablename"]
        # Tên bảng lấy từ pg_tables của chính DB này (không phải input người dùng).
        counts[name] = await conn.fetchval(f'SELECT count(*) FROM "{name}"')  # noqa: S608
    return counts


def docker_run(container: str, args: list[str], stdin: bytes | None = None) -> bytes:
    result = subprocess.run(  # noqa: S603 — lệnh cố định, tham số do người vận hành nhập
        ["docker", "exec", *(["-i"] if stdin is not None else []), container, *args],  # noqa: S607
        input=stdin,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise SystemExit(
            f"Lệnh {' '.join(args[:2])} lỗi: {result.stderr.decode(errors='replace')[:400]}"
        )
    return result.stdout


async def run(container: str) -> int:
    url = make_url(get_settings().database_url)
    assert_safe_target(url.host, url.database)
    source_db, target_db = str(url.database), f"{url.database}_restore_check"
    admin = await asyncpg.connect(
        host=url.host, port=url.port, user=url.username, password=url.password, database="postgres"
    )
    try:
        await admin.execute(f'DROP DATABASE IF EXISTS "{target_db}"')
        await admin.execute(f'CREATE DATABASE "{target_db}"')
        dump = docker_run(container, ["pg_dump", "-U", str(url.username), "-Fc", "-d", source_db])
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "backup.dump"
            path.write_bytes(dump)
            print(f"Đã sao lưu {source_db}: {len(dump) / 1024:.0f} KiB")
            docker_run(
                container,
                ["pg_restore", "-U", str(url.username), "-d", target_db, "--no-owner"],
                stdin=path.read_bytes(),
            )
        connect = {
            "host": url.host,
            "port": url.port,
            "user": url.username,
            "password": url.password,
        }
        source_conn = await asyncpg.connect(database=source_db, **connect)
        restored_conn = await asyncpg.connect(database=target_db, **connect)
        try:
            problems = compare_counts(
                await table_counts(source_conn), await table_counts(restored_conn)
            )
            version = (
                await source_conn.fetchval("SELECT version_num FROM alembic_version"),
                await restored_conn.fetchval("SELECT version_num FROM alembic_version"),
            )
        finally:
            await source_conn.close()
            await restored_conn.close()
        if version[0] != version[1]:
            problems.append(f"alembic_version: nguồn {version[0]}, khôi phục {version[1]}")
        if problems:
            print("KHÔNG khớp:", *problems, sep="\n  ")
            return 1
        print(f"Khôi phục khớp hoàn toàn (phiên bản migration {version[0]}).")
        return 0
    finally:
        await admin.execute(f'DROP DATABASE IF EXISTS "{target_db}"')
        await admin.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--container", required=True, help="Tên container Postgres dev (docker)")
    sys.exit(asyncio.run(run(parser.parse_args().container)))


if __name__ == "__main__":
    main()
