"""Bộ dữ liệu THỬ NGHIỆM thủ công trên DB dev: tài khoản đủ vai trò, công ty và sản phẩm mẫu, và nạp
bản nháp thuế/quy tắc xuất xứ của gói luật TM v0 (CHƯA DUYỆT).

    uv run python -m scripts.seed_testkit            # tạo (chạy lại không trùng)
    uv run python -m scripts.seed_testkit --purge    # xóa dữ liệu bộ thử

Mật khẩu chung của mọi tài khoản thử: xem PASSWORD bên dưới. Chỉ chạy trên DB localhost, không
phải staging/prod. Thuế và quy tắc được nạp CHƯA DUYỆT: người thử đăng nhập admin, vào tab "Dữ liệu
tuân thủ" và tự bấm duyệt thì máy tính mới ra số — script không duyệt thay người duyệt.
"""

import argparse
import asyncio
import sys
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_sessionmaker
from app.core.security import hash_password
from app.modules.auth.models import User, UserRole
from app.modules.companies.models import (
    ApprovalStatus,
    Company,
    CompanyExportMarket,
    CompanyLanguage,
    CompanySourcingCategory,
    CompanyType,
    Product,
    VerificationLevel,
    VerificationStatus,
)
from scripts._console import use_utf8
from scripts.import_compliance_data import import_psr, import_tariff, parse_psr, parse_tariff
from scripts.seed_demo import assert_allowed

PASSWORD = "TestKit-2026-evfta"  # noqa: S105 — mật khẩu giả cho dev
DOMAIN = "example.com"
ROADMAP = Path(__file__).resolve().parents[2] / "docs" / "roadmap"


class Account:
    def __init__(
        self, email: str, role: UserRole, language: str, company: dict[str, object] | None
    ):
        self.email, self.role, self.language, self.company = email, role, language, company


ACCOUNTS = [
    Account(f"admin.test@{DOMAIN}", UserRole.admin, "vi", None),
    Account(
        f"xuatkhau.daxacminh@{DOMAIN}",
        UserRole.exporter,
        "vi",
        {
            "slug": "test-nong-san-viet",
            "legal_name": "[TEST] Công ty Nông Sản Việt (đã xác minh)",
            "industry_sector": "agriculture",
            "verified": True,
            "products": [
                ("100630", "[TEST] Gạo thơm Jasmine"),
                ("090111", "[TEST] Cà phê nhân Robusta"),
            ],
        },
    ),
    Account(
        f"xuatkhau.thuysan@{DOMAIN}",
        UserRole.exporter,
        "vi",
        {
            "slug": "test-thuy-san-mekong",
            "legal_name": "[TEST] Thủy Sản Mekong (đã xác minh, EVFTA-verified)",
            "industry_sector": "seafood",
            "verified": True,
            "level": VerificationLevel.evfta_verified,
            "products": [("030617", "[TEST] Tôm đông lạnh"), ("030462", "[TEST] Phi lê cá tra")],
        },
    ),
    Account(
        f"xuatkhau.chuaxacminh@{DOMAIN}",
        UserRole.exporter,
        "vi",
        {
            "slug": "test-chua-xac-minh",
            "legal_name": "[TEST] Công ty Chưa Xác Minh",
            "industry_sector": "agriculture",
            "verified": False,
            "products": [("090121", "[TEST] Cà phê rang")],
        },
    ),
    Account(
        f"buyer.daxacminh@{DOMAIN}",
        UserRole.buyer,
        "en",
        {
            "slug": "test-global-foods",
            "legal_name": "[TEST] Global Foods Trading GmbH (verified buyer)",
            "country": "DE",
            "verified": True,
            "sourcing": ["agriculture", "seafood"],
        },
    ),
    Account(
        f"buyer.chuaxacminh@{DOMAIN}",
        UserRole.buyer,
        "en",
        {
            "slug": "test-new-importer",
            "legal_name": "[TEST] New Importer BV (unverified buyer)",
            "country": "NL",
            "verified": False,
            "sourcing": ["agriculture"],
        },
    ),
]


async def seed(session: AsyncSession, now: datetime | None = None) -> int:
    """Tạo tài khoản, công ty, sản phẩm còn thiếu; trả số tài khoản mới."""
    moment = now or datetime.now(UTC)
    existing = set(await session.scalars(select(User.email).where(User.email.like(f"%@{DOMAIN}"))))
    created = 0
    for account in ACCOUNTS:
        if account.email in existing:
            continue
        user = User(
            email=account.email,
            password_hash=hash_password(PASSWORD),
            role=account.role,
            preferred_language=account.language,
            consent_accepted_at=moment,
            consent_version=get_settings().consent_version,
        )
        session.add(user)
        await session.flush()
        created += 1
        info = account.company
        if info is None:
            continue
        exporter = account.role == UserRole.exporter
        verified = bool(info["verified"])
        company = Company(
            owner_user_id=user.id,
            type=CompanyType.exporter if exporter else CompanyType.buyer,
            slug=str(info["slug"]),
            legal_name=str(info["legal_name"]),
            country=str(info.get("country", "VN")),
            industry_sector=str(info["industry_sector"]) if exporter else "food_beverage",
            description_vi="DỮ LIỆU THỬ NGHIỆM." if exporter else None,
            description_en="TEST DATA.",
            contact_email=account.email,
            verification_status=VerificationStatus.verified
            if verified
            else VerificationStatus.unverified,
            verification_level=info.get("level", VerificationLevel.basic),
            verified_at=moment if verified else None,
            expires_at=moment + timedelta(days=365) if verified else None,
        )
        if exporter:
            company.export_markets = [CompanyExportMarket(market="EU")]
            company.languages = [CompanyLanguage(lang="vi"), CompanyLanguage(lang="en")]
        else:
            company.sourcing_categories = [
                CompanySourcingCategory(category=c)
                for c in info["sourcing"]  # type: ignore[attr-defined]
            ]
        session.add(company)
        await session.flush()
        for code, name in info.get("products", []):  # type: ignore[attr-defined]
            session.add(
                Product(
                    company_id=company.id,
                    hs_code=code,
                    name=name,
                    description_vi="Sản phẩm thử nghiệm",
                    description_en="Test product",
                    unit="kg",
                    is_active=True,
                    approval_status=ApprovalStatus.approved,
                )
            )
    await session.commit()
    return created


async def load_drafts(session: AsyncSession) -> tuple[int, int]:
    """Nạp bản nháp thuế và PSR (CHƯA DUYỆT); trả (dòng thuế mới, quy tắc mới)."""
    admin = ACCOUNTS[0].email
    tariff, _ = await import_tariff(
        session, admin, parse_tariff(ROADMAP / "tariff_20_v0_draft.csv"), dry_run=False
    )
    psr, _ = await import_psr(
        session, admin, parse_psr(ROADMAP / "psr_20_v0_draft.csv"), dry_run=False
    )
    return tariff, psr


async def purge(session: AsyncSession) -> int:
    users = list(await session.scalars(select(User.id).where(User.email.like(f"%@{DOMAIN}"))))
    if not users:
        return 0
    companies = list(
        await session.scalars(select(Company.id).where(Company.owner_user_id.in_(users)))
    )
    for model in (Product, CompanyExportMarket, CompanyLanguage, CompanySourcingCategory):
        await session.execute(delete(model).where(model.company_id.in_(companies)))
    await session.execute(delete(Company).where(Company.id.in_(companies)))
    await session.execute(delete(User).where(User.id.in_(users)))
    await session.commit()
    return len(users)


async def _run(do_purge: bool) -> None:
    async with get_sessionmaker()() as session:
        if do_purge:
            print(f"Đã xóa {await purge(session)} tài khoản thử và dữ liệu kèm theo.")
            return
        print(f"Đã tạo {await seed(session)} tài khoản mới.")
        tariff, psr = await load_drafts(session)
        print(f"Đã nạp {tariff} dòng thuế và {psr} quy tắc xuất xứ (CHƯA DUYỆT).")
        print(f"Đăng nhập bằng mật khẩu: {PASSWORD}")


def main(argv: Sequence[str] | None = None) -> int:
    use_utf8()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--purge", action="store_true")
    args = parser.parse_args(list(sys.argv[1:] if argv is None else argv))
    url = make_url(get_settings().database_url)
    assert_allowed(url.host, url.database, allow_remote=False)
    asyncio.run(_run(args.purge))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
