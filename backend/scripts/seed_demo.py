"""Nạp dữ liệu DEMO cho dev/staging (J4, J5): công ty và sản phẩm giả gắn nhãn "[DEMO]".

    uv run python -m scripts.seed_demo --count 20          # 15–20 công ty demo cho staging
    uv run python -m scripts.seed_demo --count 500         # đo hiệu năng tìm kiếm (J4)
    uv run python -m scripts.seed_demo --purge             # xóa mọi dữ liệu demo

CẢNH BÁO: công ty demo được đặt thẳng trạng thái verified để hiện trong danh bạ — chỉ để thử/đo.
Script từ chối chạy khi tên DB có 'prod'; DB có 'staging' hoặc máy chủ không phải localhost chỉ chạy
khi có --allow-remote. Tài khoản demo có email *@demo.evfta.invalid và mật khẩu ngẫu nhiên (không
đăng nhập được). Cần danh mục mã HS đã nạp (scripts.seed_hs_codes). Chạy lại không tạo trùng.
"""

import argparse
import asyncio
import secrets
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_sessionmaker
from app.core.security import hash_password
from app.modules.auth.models import User, UserRole
from app.modules.catalog.models import HsCode
from app.modules.companies.models import (
    ApprovalStatus,
    Company,
    CompanyExportMarket,
    CompanyLanguage,
    CompanyType,
    Product,
    VerificationLevel,
    VerificationStatus,
)
from scripts._console import use_utf8

DEMO_DOMAIN = "demo.evfta.invalid"
DEMO_PREFIX = "[DEMO] "
SLUG_PREFIX = "demo-"
INDUSTRIES = ("agriculture", "seafood", "food_beverage", "spices", "handicrafts", "textiles")
STYLES_VI = ("Xuất Khẩu", "Nông Sản", "Thực Phẩm", "Thương Mại", "Sản Xuất")
STYLES_EN = ("Export", "Agro", "Foods", "Trading", "Manufacturing")
PLACES = ("Đắk Lắk", "Cần Thơ", "Đồng Tháp", "Bến Tre", "Lâm Đồng", "Bình Dương", "Hải Phòng")


@dataclass(frozen=True)
class DemoCompany:
    n: int
    email: str
    slug: str
    legal_name: str
    industry: str
    description_vi: str
    description_en: str
    level: VerificationLevel
    product_count: int


def demo_companies(count: int) -> list[DemoCompany]:
    """Dữ liệu xác định theo số thứ tự (chạy lại cho cùng kết quả, không trùng email/slug)."""
    rows = []
    for n in range(1, count + 1):
        place = PLACES[n % len(PLACES)]
        style_vi, style_en = STYLES_VI[n % len(STYLES_VI)], STYLES_EN[n % len(STYLES_EN)]
        rows.append(
            DemoCompany(
                n=n,
                email=f"demo-{n:04d}@{DEMO_DOMAIN}",
                slug=f"{SLUG_PREFIX}{n:04d}",
                legal_name=f"{DEMO_PREFIX}Công ty {style_vi} {place} {n}",
                industry=INDUSTRIES[n % len(INDUSTRIES)],
                description_vi=f"DỮ LIỆU DEMO. Nhà cung cấp {style_vi.lower()} tại {place}.",
                description_en=f"DEMO DATA. {style_en} supplier from {place}, Vietnam.",
                level=VerificationLevel.evfta_verified if n % 5 == 0 else VerificationLevel.basic,
                product_count=1 + n % 3,
            )
        )
    return rows


def assert_allowed(host: str | None, database: str | None, allow_remote: bool) -> None:
    """Chặn production tuyệt đối; staging/máy từ xa chỉ khi có --allow-remote."""
    name = (database or "").lower()
    if not name or "prod" in name:
        raise SystemExit(f"Từ chối: DB '{database}' là production hoặc không xác định")
    local = host in ("localhost", "127.0.0.1")
    if (not local or "staging" in name) and not allow_remote:
        raise SystemExit("Từ chối: DB ngoài localhost/staging cần --allow-remote có chủ ý")


async def seed(session: AsyncSession, count: int, now: datetime | None = None) -> int:
    """Tạo các công ty demo còn thiếu; trả số công ty mới."""
    moment = now or datetime.now(UTC)
    codes = list(await session.scalars(select(HsCode.code).order_by(HsCode.code)))
    if not codes:
        raise SystemExit("Chưa có danh mục mã HS: chạy scripts.seed_hs_codes trước")
    existing = set(
        await session.scalars(select(User.email).where(User.email.like(f"%@{DEMO_DOMAIN}")))
    )
    created = 0
    for demo in demo_companies(count):
        if demo.email in existing:
            continue
        user = User(
            email=demo.email,
            password_hash=hash_password(secrets.token_urlsafe(24)),
            role=UserRole.exporter,
            preferred_language="vi",
            consent_accepted_at=moment,
            consent_version=get_settings().consent_version,
        )
        session.add(user)
        await session.flush()
        company = Company(
            owner_user_id=user.id,
            type=CompanyType.exporter,
            slug=demo.slug,
            legal_name=demo.legal_name,
            country="VN",
            industry_sector=demo.industry,
            description_vi=demo.description_vi,
            description_en=demo.description_en,
            verification_status=VerificationStatus.verified,
            verification_level=demo.level,
            verified_at=moment,
            expires_at=moment + timedelta(days=365),
        )
        company.export_markets = [CompanyExportMarket(market="EU")]
        company.languages = [CompanyLanguage(lang="vi"), CompanyLanguage(lang="en")]
        session.add(company)
        await session.flush()
        for i in range(demo.product_count):
            code = codes[(demo.n + i) % len(codes)]
            session.add(
                Product(
                    company_id=company.id,
                    hs_code=code,
                    name=f"{DEMO_PREFIX}Sản phẩm {code} #{demo.n}-{i + 1}",
                    description_vi="DỮ LIỆU DEMO",
                    description_en="DEMO DATA",
                    is_active=True,
                    approval_status=ApprovalStatus.approved,
                )
            )
        created += 1
    await session.commit()
    return created


async def purge(session: AsyncSession) -> int:
    """Xóa mọi công ty, sản phẩm và tài khoản demo. Trả số tài khoản đã xóa."""
    users = list(await session.scalars(select(User.id).where(User.email.like(f"%@{DEMO_DOMAIN}"))))
    if not users:
        return 0
    company_ids = list(
        await session.scalars(select(Company.id).where(Company.owner_user_id.in_(users)))
    )
    # Bảng con trước (khóa ngoại); chỉ bảng không append-only.
    for model in (Product, CompanyExportMarket, CompanyLanguage):
        column = model.company_id
        await session.execute(delete(model).where(column.in_(company_ids)))
    await session.execute(delete(Company).where(Company.id.in_(company_ids)))
    await session.execute(delete(User).where(User.id.in_(users)))
    await session.commit()
    return len(users)


async def count_demo(session: AsyncSession) -> int:
    return (
        await session.scalar(
            select(func.count()).select_from(User).where(User.email.like(f"%@{DEMO_DOMAIN}"))
        )
        or 0
    )


async def _run(count: int | None, do_purge: bool) -> None:
    async with get_sessionmaker()() as session:
        if do_purge:
            print(f"Đã xóa {await purge(session)} tài khoản demo cùng dữ liệu kèm theo.")
            return
        if count is None:
            raise SystemExit("Thiếu --count")
        created = await seed(session, count)
        print(f"Đã tạo {created} công ty demo mới; tổng demo hiện có: {await count_demo(session)}.")


def main(argv: Sequence[str] | None = None) -> int:
    use_utf8()
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("--count", type=int, help="Số công ty demo (1–2000)")
    parser.add_argument("--purge", action="store_true", help="Xóa toàn bộ dữ liệu demo")
    parser.add_argument("--allow-remote", action="store_true", help="Cho phép DB staging/từ xa")
    args = parser.parse_args(list(sys.argv[1:] if argv is None else argv))
    if args.purge == (args.count is not None):
        parser.error("chọn đúng một trong --count hoặc --purge")
    if args.count is not None and not 1 <= args.count <= 2000:
        parser.error("--count phải từ 1 đến 2000")
    url = make_url(get_settings().database_url)
    assert_allowed(url.host, url.database, args.allow_remote)
    asyncio.run(_run(args.count, args.purge))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
