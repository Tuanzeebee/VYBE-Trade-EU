"""Nạp dữ liệu DEMO cho dev/staging (J4, J5): công ty và sản phẩm giả gắn nhãn "[DEMO]".

Mỗi công ty có loại hình kinh doanh (manufacturer/trader/both), ngành, tỉnh, thị trường xuất khẩu và
ngôn ngữ khác nhau; sản phẩm lấy mã HS đúng nhóm hàng của ngành để thử tìm kiếm/lọc của buyer.
Công ty nạp từ bản cũ không tự đổi dạng: chạy --purge rồi --count lại.

    uv run python -m scripts.seed_demo --count 20          # 15–20 công ty demo cho staging
    uv run python -m scripts.seed_demo --count 500         # đo hiệu năng tìm kiếm (J4)
    uv run python -m scripts.seed_demo --pending 8         # 8 công ty CHỜ DUYỆT cho hàng đợi admin
    uv run python -m scripts.seed_demo --purge             # xóa mọi dữ liệu demo

CẢNH BÁO: công ty demo được đặt thẳng trạng thái verified (hoặc pending kèm yêu cầu xác minh không
có bằng chứng, với --pending) — chỉ để thử/đo. Công ty chờ duyệt không hiện trong danh bạ công khai.
Công ty đã bị admin quyết định (có dòng verification_decisions append-only) thì --purge lỗi.
Script từ chối chạy khi tên DB có 'prod'; DB có 'staging' hoặc máy chủ không phải localhost chỉ chạy
khi có --allow-remote. Tài khoản demo có email *@demo.evfta.invalid và mật khẩu ngẫu nhiên (không
đăng nhập được). Cần danh mục mã HS đã nạp (scripts.seed_hs_codes). Chạy lại không tạo trùng.
"""

import argparse
import asyncio
import secrets
import sys
from collections.abc import Sequence
from dataclasses import dataclass, replace
from datetime import UTC, datetime, timedelta
from decimal import Decimal

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
from app.modules.verification.models import VerificationRequest
from scripts._console import use_utf8

DEMO_DOMAIN = "demo.evfta.invalid"
DEMO_PREFIX = "[DEMO] "
SLUG_PREFIX = "demo-"
PENDING_TAG = "pending-"
INDUSTRIES = ("agriculture", "seafood", "food_beverage", "spices", "handicrafts", "textiles")
BUSINESS_TYPES = ("manufacturer", "trader", "both")  # khớp companies.completeness.BUSINESS_MODELS
# (tên VI, tên EN) theo ngành — tên công ty luôn khớp ngành của nó.
STYLES = {
    "agriculture": (
        ("Nông Sản", "Agro"),
        ("Cà Phê Hạt Điều", "Coffee & Cashew"),
        ("Trái Cây", "Fruits"),
    ),
    "seafood": (("Thủy Sản", "Seafood"), ("Hải Sản Đông Lạnh", "Frozen Seafood")),
    "food_beverage": (("Thực Phẩm", "Foods"), ("Chế Biến Thực Phẩm", "Food Processing")),
    "spices": (("Gia Vị", "Spices"), ("Hồ Tiêu Quế", "Pepper & Cinnamon")),
    "handicrafts": (("Thủ Công Mỹ Nghệ", "Handicrafts"), ("Nội Thất Gỗ", "Wood Furniture")),
    "textiles": (("Dệt May", "Garments"), ("May Mặc Xuất Khẩu", "Apparel Export")),
}
TYPE_PREFIX_VI = {"manufacturer": "Nhà máy", "trader": "Công ty Thương mại", "both": "Công ty"}
TYPE_LABEL_EN = {
    "manufacturer": "manufacturer",
    "trader": "trading company",
    "both": "manufacturer and trader",
}
PLACES = ("Đắk Lắk", "Cần Thơ", "Đồng Tháp", "Bến Tre", "Lâm Đồng", "Bình Dương", "Hải Phòng")
# Một phần công ty demo ở Đông Nam Á (mã nước, tên nước vi, tên nước en, nơi) để sàn không trông như
# chỉ có một nước; Việt Nam vẫn chiếm đa số (3 trên 4 công ty).
SEA_PLACES = (
    ("TH", "Thái Lan", "Thailand", "Chiang Mai"),
    ("ID", "Indonesia", "Indonesia", "Surabaya"),
    ("MY", "Malaysia", "Malaysia", "Penang"),
    ("PH", "Philippines", "Philippines", "Cebu"),
)
MARKETS = (("EU",), ("EU", "ASEAN"), ("EU", "DE", "NL"), ("EU", "US"))
LANGUAGES = (("vi", "en"), ("vi", "en", "de"), ("vi", "en", "fr"))
VARIANTS = (
    ("loại 1", "grade A"),
    ("xuất khẩu EU", "EU export"),
    ("hữu cơ", "organic"),
    ("đóng gói lẻ", "retail pack"),
    ("số lượng lớn", "bulk"),
)
UNITS = {
    "agriculture": "kg",
    "seafood": "kg",
    "spices": "kg",
    "food_beverage": "carton",
    "handicrafts": "piece",
    "textiles": "piece",
}


@dataclass(frozen=True)
class DemoCompany:
    n: int
    email: str
    slug: str
    legal_name: str
    industry: str
    business_type: str
    place: str
    country: str
    country_vi: str
    country_en: str
    founded_year: int
    markets: tuple[str, ...]
    languages: tuple[str, ...]
    description_vi: str
    description_en: str
    level: VerificationLevel
    product_count: int


def demo_companies(count: int) -> list[DemoCompany]:
    """Dữ liệu xác định theo số thứ tự (chạy lại cho cùng kết quả, không trùng email/slug)."""
    rows = []
    for n in range(1, count + 1):
        place = PLACES[n % len(PLACES)]
        country, country_vi, country_en = "VN", "Việt Nam", "Vietnam"
        if n % 4 == 3:
            country, country_vi, country_en, place = SEA_PLACES[(n // 4) % len(SEA_PLACES)]
        industry = INDUSTRIES[n % len(INDUSTRIES)]
        # Cộng n // 6 để loại hình không dính cứng vào ngành (n % 6 và n % 3 tương quan).
        business_type = BUSINESS_TYPES[(n + n // len(INDUSTRIES)) % len(BUSINESS_TYPES)]
        styles = STYLES[industry]
        style_vi, style_en = styles[(n // len(INDUSTRIES)) % len(styles)]
        prefix_vi = TYPE_PREFIX_VI[business_type]
        rows.append(
            DemoCompany(
                n=n,
                email=f"demo-{n:04d}@{DEMO_DOMAIN}",
                slug=f"{SLUG_PREFIX}{n:04d}",
                legal_name=f"{DEMO_PREFIX}{prefix_vi} {style_vi} {place} {n}",
                industry=industry,
                business_type=business_type,
                place=place,
                country=country,
                country_vi=country_vi,
                country_en=country_en,
                founded_year=1995 + n % 28,
                markets=MARKETS[n % len(MARKETS)],
                languages=LANGUAGES[n % len(LANGUAGES)],
                description_vi=f"DỮ LIỆU DEMO. {prefix_vi} {style_vi.lower()} tại {place}.",
                description_en=(
                    f"DEMO DATA. {style_en} {TYPE_LABEL_EN[business_type]} "
                    f"from {place}, {country_en}."
                ),
                level=VerificationLevel.evfta_verified if n % 5 == 0 else VerificationLevel.basic,
                product_count=2 + n % 4,
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


def hs_pools(
    rows: Sequence[tuple[str, str, str, str | None]],
) -> dict[str, list[tuple[str, str, str]]]:
    """Mã HS (mã, tên vi, tên en) cho từng ngành: đúng nhóm hàng của ngành; ngành chưa có nhóm
    trong danh mục (handicrafts) lấy các mã chưa gán nhóm; thiếu hẳn thì dùng toàn danh mục."""
    everything = [(code, vi, en) for code, vi, en, _ in rows]
    pools = {}
    for industry in INDUSTRIES:
        wanted = None if industry == "handicrafts" else industry
        pools[industry] = [(c, vi, en) for c, vi, en, cat in rows if cat == wanted] or everything
    return pools


def pending_companies(count: int) -> list[DemoCompany]:
    """Công ty chờ duyệt: cùng dữ liệu xác định như demo thường, email/slug riêng, mức basic."""
    return [
        replace(
            c,
            email=f"demo-{PENDING_TAG}{c.n:04d}@{DEMO_DOMAIN}",
            slug=f"{SLUG_PREFIX}{PENDING_TAG}{c.n:04d}",
            level=VerificationLevel.basic,
        )
        for c in demo_companies(count)
    ]


async def seed(
    session: AsyncSession, count: int, now: datetime | None = None, *, pending: bool = False
) -> int:
    """Tạo các công ty demo còn thiếu; trả số công ty mới.

    pending=True: công ty ở trạng thái `pending` kèm một yêu cầu xác minh đang chờ (hàng đợi admin),
    có MST/số đăng ký để admin đối chiếu, nộp cách nhau vài giờ để hàng đợi có thứ tự cũ → mới.
    """
    moment = now or datetime.now(UTC)
    hs_rows = (
        await session.execute(
            select(HsCode.code, HsCode.name_vi, HsCode.name_en, HsCode.category).order_by(
                HsCode.code
            )
        )
    ).all()
    if not hs_rows:
        raise SystemExit("Chưa có danh mục mã HS: chạy scripts.seed_hs_codes trước")
    pools = hs_pools(hs_rows)
    existing = set(
        await session.scalars(select(User.email).where(User.email.like(f"%@{DEMO_DOMAIN}")))
    )
    created = 0
    for demo in pending_companies(count) if pending else demo_companies(count):
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
            country=demo.country,
            is_demo=True,
            business_type=demo.business_type,
            tax_id=f"03{demo.n:08d}" if pending else None,
            registration_number=f"DEMO-{demo.n:06d}" if pending else None,
            industry_sector=demo.industry,
            founded_year=demo.founded_year,
            address=f"{demo.place}, {demo.country_vi}",
            description_vi=demo.description_vi,
            description_en=demo.description_en,
            verification_status=(
                VerificationStatus.pending if pending else VerificationStatus.verified
            ),
            verification_level=demo.level,
            verified_at=None if pending else moment,
            expires_at=None if pending else moment + timedelta(days=365),
        )
        company.export_markets = [CompanyExportMarket(market=m) for m in demo.markets]
        company.languages = [CompanyLanguage(lang=lang) for lang in demo.languages]
        session.add(company)
        await session.flush()
        if pending:
            session.add(
                VerificationRequest(
                    company_id=company.id,
                    submitted_at=moment - timedelta(hours=3 * (count - demo.n)),
                )
            )
        pool = pools[demo.industry]
        unit = UNITS[demo.industry]
        for i in range(demo.product_count):
            code, name_vi, name_en = pool[(demo.n + i) % len(pool)]
            variant_vi, variant_en = VARIANTS[(demo.n + i) % len(VARIANTS)]
            price_min = Decimal(2 + (demo.n + i) % 9)
            session.add(
                Product(
                    company_id=company.id,
                    hs_code=code,
                    name=f"{DEMO_PREFIX}{name_vi} {variant_vi}",
                    description_vi=f"DỮ LIỆU DEMO. {name_vi}, {variant_vi}.",
                    description_en=f"DEMO DATA. {name_en}, {variant_en}.",
                    price_min=price_min,
                    price_max=(price_min * Decimal("1.4")).quantize(Decimal("0.01")),
                    currency="EUR" if (demo.n + i) % 3 == 0 else "USD",
                    unit=unit,
                    moq=Decimal(100 * (1 + (demo.n + i) % 10)),
                    moq_unit=unit,
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
    for model in (Product, CompanyExportMarket, CompanyLanguage, VerificationRequest):
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


async def _run(count: int | None, pending: int | None, do_purge: bool) -> None:
    async with get_sessionmaker()() as session:
        if do_purge:
            print(f"Đã xóa {await purge(session)} tài khoản demo cùng dữ liệu kèm theo.")
            return
        if pending is not None:
            made = await seed(session, pending, pending=True)
            print(f"Đã tạo {made} công ty chờ duyệt mới (hàng đợi xác minh của admin).")
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
    parser.add_argument("--pending", type=int, help="Số công ty chờ duyệt xác minh (1–200)")
    parser.add_argument("--purge", action="store_true", help="Xóa toàn bộ dữ liệu demo")
    parser.add_argument("--allow-remote", action="store_true", help="Cho phép DB staging/từ xa")
    args = parser.parse_args(list(sys.argv[1:] if argv is None else argv))
    if [args.purge, args.count is not None, args.pending is not None].count(True) != 1:
        parser.error("chọn đúng một trong --count, --pending hoặc --purge")
    if args.pending is not None and not 1 <= args.pending <= 200:
        parser.error("--pending phải từ 1 đến 200")
    if args.count is not None and not 1 <= args.count <= 2000:
        parser.error("--count phải từ 1 đến 2000")
    url = make_url(get_settings().database_url)
    assert_allowed(url.host, url.database, args.allow_remote)
    asyncio.run(_run(args.count, args.pending, args.purge))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
