"""Dữ liệu DEMO cho buổi demo sau góp ý 30/09/2026 (U25): tài khoản đăng nhập được cho từng vai
trò và dữ liệu đi qua ĐÚNG các service của sản phẩm (không ghi thẳng trạng thái), gắn "[DEMO]".

    uv run python -m scripts.seed_demo_journey --approve-evidence-types   # dev / staging
    uv run python -m scripts.seed_demo_journey --background 0             # không thêm công ty nền

Tạo: admin; 4 seller sản phẩm (thủy sản cấp Nâng cao, gạo, điều, cà phê CHỜ DUYỆT), 3 nhà cung
cấp dịch vụ (giao nhận, hải quan, kế toán), 5 buyer EU (1 đã xác minh KYB nhẹ); bằng chứng, kiểm
tay Cổng ĐKDN, đơn chuyển khoản (đã xác nhận / đang chờ), hội thoại, RFQ và báo giá, lượt xem hồ
sơ, báo cáo go-to-market mẫu, yêu cầu tư vấn; thuế/hạn ngạch minh hoạ (is_demo) và thống kê
Eurostat thật.

--approve-evidence-types: ghi admin DEMO là người duyệt các loại bằng chứng NHÁP để seller nộp
được trong môi trường demo. KHÔNG dùng cho dữ liệu thật — ở production luật TM duyệt từng loại.
Thuế/hạn ngạch minh hoạ chỉ hiện khi DEMO_COMPLIANCE_DATA=true; điểm tín nhiệm công khai khi
TRUST_SCORE_PUBLIC=true (staging). Chạy lại: đã có admin demo thì bỏ qua. Làm lại: tạo DB mới.
"""

import argparse
import asyncio
import datetime as dt
import io
import sys
import uuid
from collections.abc import Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen.canvas import Canvas
from sqlalchemy import select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import entitlements
from app.core.chat import FakeChatModel
from app.core.config import get_settings
from app.core.db import get_sessionmaker
from app.core.security import hash_password
from app.core.storage import Storage, get_storage
from app.core.trade_stats import parse_flow_csv
from app.core.translation import get_translation_service
from app.modules.auth.models import User, UserRole
from app.modules.auth.schemas import CurrentUser
from app.modules.billing import service as billing
from app.modules.billing.schemas import OrderDecisionIn, OrderIn
from app.modules.catalog.service import upsert_hs_codes
from app.modules.companies import offering_service, product_service
from app.modules.companies import service as companies
from app.modules.companies.schemas import CompanyIn, ProductIn, ServiceOfferingIn
from app.modules.dashboard import service as dashboard
from app.modules.markets import report_service
from app.modules.markets.models import MarketReport
from app.modules.markets.schemas import ConsultingLeadIn, ReportIn
from app.modules.markets.service import upsert_rows
from app.modules.messaging import conversation_service, quote_service
from app.modules.messaging import service as messaging
from app.modules.messaging.schemas import QuoteDecisionIn, QuoteIn, RfqIn
from app.modules.verification import (
    admin_service,
    checks_service,
    evidence_service,
    request_service,
    tier_service,
)
from app.modules.verification.admin_schemas import EvidenceReviewIn
from app.modules.verification.models import EvidenceType
from app.modules.verification.schemas import (
    DecisionIn,
    EvidenceIn,
    ManualCheckIn,
    TierRequestIn,
)
from scripts import seed_demo, seed_demo_compliance
from scripts._console import use_utf8
from scripts.seed_evidence_types import load_csv as load_evidence_types
from scripts.seed_evidence_types import seed_types
from scripts.seed_hs_codes import DEFAULT_CSV as HS_CSV
from scripts.seed_hs_codes import load_csv as load_hs
from scripts.seed_tier_requirements import load_csv as load_tiers
from scripts.seed_tier_requirements import seed_requirements
from scripts.seed_trust_criteria import load_csv as load_trust
from scripts.seed_trust_criteria import seed_criteria

PASSWORD = "VybeDemo-2026!"  # noqa: S105 — mật khẩu chung của tài khoản demo
DOMAIN = "vybe-demo.example"
TAG = " [DEMO]"
SNAPSHOT = Path(__file__).resolve().parents[1] / "data" / "trade_flows_eurostat_snapshot.csv"
TODAY = dt.date.today()


@dataclass
class Summary:
    accounts: dict[str, str] = field(default_factory=dict)  # vai trò → email
    notes: list[str] = field(default_factory=list)


# ── Dữ liệu ───────────────────────────────────────────────────────────────────
def exporter_body(name: str, **over: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "legal_name": name + TAG,
        "business_type": "manufacturer",
        "country": "VN",
        "founded_year": 2012,
        "languages_spoken": ["vi", "en"],
        "export_markets": ["EU"],
        "offering_type": "products",
    }
    body.update(over)
    return body


SELLERS: list[dict[str, Any]] = [
    {
        "key": "seafood",
        "email": f"mekong@{DOMAIN}",
        "company": exporter_body(
            "Công ty CP Thủy Sản Mekong Xanh",
            registration_number="1801234567",
            tax_id="1801234567",
            industry_sector="seafood",
            address="Lô 2-10, KCN Trà Nóc, Bình Thủy, Cần Thơ",
            factory_address="Lô 2-10, KCN Trà Nóc, Bình Thủy, Cần Thơ",
            website="https://mekongxanh.example",
            contact_email=f"mekong@{DOMAIN}",
            legal_representative="Nguyễn Văn Hậu",
            phone="+84 292 384 1234",
            issuing_authority="Sở Kế hoạch và Đầu tư TP. Cần Thơ",
            description_vi="Nuôi và chế biến cá tra, tôm xuất khẩu EU từ 2012.",
            description_en="Farming and processing pangasius and shrimp for the EU since 2012.",
            export_markets=["EU", "DE", "NL", "ES"],
            capacity_value="12000",
            capacity_unit="tonne",
            capacity_period="year",
            company_size="201_500",
            location_public=True,
            facility_codes=[{"code_type": "establishment", "code": "DL 481"}],
        ),
        "products": [
            {
                "name": "Phi lê cá tra đông lạnh IQF",
                "hs_code": "0304.62",
                "description_vi": "Phi lê cá tra thịt trắng, cấp đông IQF, mạ băng 10%.",
                "description_en": "White pangasius fillets, IQF, 10% glazing.",
                "currency": "USD",
                "unit": "kg",
                "moq": "5000",
                "moq_unit": "kg",
                "brand_model": "oem",
                "packagings": [
                    {"pack_size": "1", "pack_unit": "kg", "pack_type": "bag", "channel": "retail"},
                    {
                        "pack_size": "10",
                        "pack_unit": "kg",
                        "pack_type": "carton",
                        "channel": "horeca",
                    },
                ],
                "price_tiers": [
                    {"min_quantity": "5000", "unit_price": "2.65"},
                    {"min_quantity": "20000", "unit_price": "2.45"},
                ],
            },
            {
                "name": "Tôm thẻ chân trắng đông lạnh",
                "hs_code": "0306.17",
                "description_vi": "Tôm thẻ lột vỏ chừa đuôi, size 31/40.",
                "currency": "USD",
                "unit": "kg",
                "moq": "2000",
                "moq_unit": "kg",
                "brand_model": "both",
                "price_tiers": [{"min_quantity": "2000", "unit_price": "8.90"}],
            },
        ],
        "evidence": [
            ("business_registration", None, None, None),
            ("haccp", "VN-HACCP-2025-00481", "Bureau Veritas Certification Vietnam", 1095),
            ("export_contract", None, None, None),
            ("bill_of_lading", None, None, None),
        ],
        "verify": True,
        "tier2": True,
    },
    {
        "key": "rice",
        "email": f"gaothom@{DOMAIN}",
        "company": exporter_body(
            "Công ty TNHH Gạo Thơm Sóc Trăng",
            registration_number="2200345678",
            tax_id="2200345678",
            industry_sector="agriculture",
            address="Ấp Hòa Đê, xã Hòa Tú 1, Mỹ Xuyên, Sóc Trăng",
            website="https://gaothomsoctrang.example",
            contact_email=f"gaothom@{DOMAIN}",
            description_vi="Vùng trồng gạo thơm ST, xay xát và đóng gói tại Sóc Trăng.",
            description_en="Fragrant rice growing area, milling and packing in Soc Trang.",
            export_markets=["EU", "DE", "FR"],
            capacity_value="30000",
            capacity_unit="tonne",
            capacity_period="year",
            facility_codes=[{"code_type": "growing_area", "code": "VN-ST-0012"}],
        ),
        "products": [
            {
                "name": "Gạo thơm ST25",
                "hs_code": "1006.30",
                "description_vi": "Gạo thơm hạt dài ST25, độ ẩm dưới 14%.",
                "currency": "USD",
                "unit": "tonne",
                "price_min": "780",
                "price_max": "850",
                "moq": "25",
                "moq_unit": "tonne",
                "brand_model": "own_brand",
            },
            {
                "name": "Gạo Jasmine 5% tấm",
                "hs_code": "1006.30",
                "currency": "USD",
                "unit": "tonne",
                "price_min": "560",
                "price_max": "610",
                "moq": "25",
                "moq_unit": "tonne",
            },
        ],
        "evidence": [("business_registration", None, None, None)],
        "verify": True,
    },
    {
        "key": "cashew",
        "email": f"dieu@{DOMAIN}",
        "company": exporter_body(
            "Công ty CP Điều Bình Phước",
            registration_number="3800456789",
            tax_id="3800456789",
            industry_sector="agriculture",
            address="KCN Đồng Xoài I, Bình Phước",
            contact_email=f"dieu@{DOMAIN}",
            description_vi="Nhân điều W240, W320 xuất khẩu.",
        ),
        "products": [
            {
                "name": "Nhân điều W320",
                "hs_code": "0801.32",
                "currency": "USD",
                "unit": "kg",
                "price_min": "5.9",
                "price_max": "6.4",
                "moq": "10000",
                "moq_unit": "kg",
            }
        ],
        "evidence": [("business_registration", None, None, None)],
        "verify": True,
    },
    {
        "key": "coffee",
        "email": f"caphe@{DOMAIN}",
        "company": exporter_body(
            "Công ty TNHH Cà Phê Tây Nguyên",
            registration_number="6000567890",
            tax_id="6000567890",
            industry_sector="coffee_tea",
            address="Buôn Ma Thuột, Đắk Lắk",
            contact_email="taynguyencoffee@gmail.com",
            description_vi="Cà phê Robusta nhân xanh và hạt tiêu đen.",
        ),
        "products": [
            {"name": "Cà phê Robusta nhân xanh S18", "hs_code": "0901.11", "unit": "tonne"},
            {"name": "Hạt tiêu đen 500 g/l", "hs_code": "0904.11", "unit": "tonne"},
        ],
        "evidence": [("business_registration", None, None, None)],
        "verify": False,  # để admin demo duyệt trực tiếp trên hàng đợi
    },
]

SERVICES: list[dict[str, Any]] = [
    {
        "email": f"logistics@{DOMAIN}",
        "name": "Công ty TNHH Giao Nhận Sài Gòn Logistics",
        "reg": "0310678901",
        "offerings": [
            ("logistics_freight", "Vận tải biển FCL/LCL đi châu Âu", ["DE", "NL", "BE", "FR"]),
            ("warehousing", "Kho lạnh -18°C tại Cát Lái", ["VN"]),
        ],
    },
    {
        "email": f"haiquan@{DOMAIN}",
        "name": "Đại lý Hải quan Cát Lái",
        "reg": "0311789012",
        "offerings": [("customs_brokerage", "Khai báo hải quan xuất khẩu, C/O mẫu EUR.1", ["VN"])],
    },
    {
        "email": f"ketoan@{DOMAIN}",
        "name": "Công ty Kế toán Thuế Việt Á",
        "reg": "0312890123",
        "offerings": [
            ("accounting_tax", "Hoàn thuế GTGT hàng xuất khẩu, kế toán trọn gói", ["VN"])
        ],
    },
]

BUYERS: list[dict[str, Any]] = [
    {
        "email": f"hanse@{DOMAIN}",
        "name": "Hanse Seafood Import GmbH",
        "country": "DE",
        "type": "Importer",
        "vat": "DE811234567",
        "categories": ["seafood"],
        "verify": True,
    },
    {
        "email": f"rotterdam@{DOMAIN}",
        "name": "Rotterdam Fresh Distribution BV",
        "country": "NL",
        "type": "Distributor",
        "vat": "NL812345678B01",
        "categories": ["agriculture", "fruits_vegetables"],
    },
    {
        "email": f"epices@{DOMAIN}",
        "name": "Maison Épices SARL",
        "country": "FR",
        "type": "Retailer",
        "vat": None,
        "categories": ["spices"],
    },
    {
        "email": f"horeca@{DOMAIN}",
        "name": "Madrid Horeca Supplies SL",
        "country": "ES",
        "type": "Horeca",
        "vat": None,
        "categories": ["seafood", "food_beverage"],
    },
    {
        "email": f"milano@{DOMAIN}",
        "name": "Milano Food Processing SpA",
        "country": "IT",
        "type": "Processor",
        "vat": None,
        "categories": ["agriculture"],
    },
]


# ── Tiện ích ──────────────────────────────────────────────────────────────────
async def _account(session: AsyncSession, email: str, role: UserRole, lang: str) -> CurrentUser:
    user = User(
        email=email,
        password_hash=hash_password(PASSWORD),
        role=role,
        preferred_language=lang,
        consent_accepted_at=dt.datetime.now(dt.UTC),
        consent_version=get_settings().consent_version,
    )
    session.add(user)
    await session.commit()
    return CurrentUser(id=user.id, email=email, role=role.value, preferred_language=lang)


def _pdf(lines: list[str]) -> bytes:
    buffer = io.BytesIO()
    canvas = Canvas(buffer, pagesize=A4)
    for index, line in enumerate(lines):
        canvas.drawString(40, 800 - 20 * index, line)
    canvas.save()
    return buffer.getvalue()


async def _put(storage: Storage, key: str, data: bytes, summary: Summary) -> None:
    try:
        await storage.put(key, data, "application/pdf")
    except Exception:
        note = "Không ghi được file lên Storage (S3/MinIO chưa chạy?) — file demo chỉ có đường dẫn."
        if note not in summary.notes:
            summary.notes.append(note)


async def _noop(_: uuid.UUID) -> None:
    return None


def _quiet_jobs() -> None:
    """Script tự chạy phần cần thiết; không xếp job nền (worker có thể chưa chạy)."""
    checks_service.set_checks_enqueuer(_noop)
    evidence_service.set_extraction_enqueuer(_noop)
    report_service.set_report_enqueuer(_noop)
    product_service.set_translation_enqueuer(_noop)


# ── Các bước ──────────────────────────────────────────────────────────────────
async def _reference_data(session: AsyncSession, admin: CurrentUser, approve: bool) -> None:
    await upsert_hs_codes(session, load_hs(HS_CSV))
    await seed_types(session, load_evidence_types(evidence_service_csv()))
    await seed_requirements(session, load_tiers())
    await seed_criteria(session, load_trust())
    await session.commit()
    await seed_demo_compliance.seed(session)
    await upsert_rows(session, "eurostat_comext", parse_flow_csv(SNAPSHOT.read_text("utf-8")), None)
    await session.commit()
    if approve:
        for row in await session.scalars(
            select(EvidenceType).where(EvidenceType.reviewed_by.is_(None))
        ):
            await admin_service.review_type(session, admin, row.code)


def evidence_service_csv() -> Path:
    from scripts.seed_evidence_types import DEFAULT_CSV

    return DEFAULT_CSV


async def _seller(
    session: AsyncSession,
    storage: Storage,
    admin: CurrentUser,
    spec: dict[str, Any],
    summary: Summary,
) -> tuple[CurrentUser, uuid.UUID, list[uuid.UUID]]:
    user = await _account(session, spec["email"], UserRole.exporter, "vi")
    company = await companies.create_company(
        session, user, CompanyIn.model_validate(spec["company"])
    )
    products = [
        (
            await product_service.create_product(
                session, user, storage, ProductIn.model_validate(p)
            )
        ).id
        for p in spec.get("products", [])
    ]
    usable = set(
        await session.scalars(
            select(EvidenceType.code).where(EvidenceType.reviewed_by.is_not(None))
        )
    )
    for code, number, issuer, days in spec.get("evidence", []):
        if code not in usable:
            continue
        key = f"evidence/{company.id}/{code}.pdf"
        lines = [code.upper().replace("_", " "), company.legal_name, company.address or ""]
        if number:
            lines += [f"Certificate No: {number}", f"Issued by: {issuer}"]
        await _put(storage, key, _pdf(lines), summary)
        evidence = await evidence_service.create_evidence(
            session,
            user,
            storage,
            EvidenceIn(type_code=code, file_key=key, certificate_number=number, issuer=issuer),
        )
        if spec.get("verify"):
            issued = TODAY - dt.timedelta(days=120)
            await admin_service.review_evidence(
                session,
                admin,
                storage,
                evidence.id,
                EvidenceReviewIn(
                    decision="approve",
                    issued_at=issued,
                    expires_at=issued + dt.timedelta(days=days) if days else None,
                ),
            )
    request = await request_service.submit_request(session, user)
    if spec.get("verify"):
        await checks_service.admin_record_manual(
            session,
            admin,
            company.id,
            ManualCheckIn(
                check_code="national_registry",
                status="pass",
                note="DEMO: MST đang hoạt động trên Cổng ĐKDN quốc gia",
                url="https://dangkykinhdoanh.gov.vn",
            ),
        )
        await request_service.decide_request(
            session, admin, request.id, DecisionIn(decision="approve", reason=None)
        )
    return user, company.id, products


async def _pay(
    session: AsyncSession, user: CurrentUser, admin: CurrentUser, item: str, confirm: bool
) -> None:
    order = await billing.create_order(session, user, OrderIn(item_code=item))
    if confirm:
        await billing.admin_confirm_payment(
            session, admin, order.id, OrderDecisionIn(note="DEMO: đối soát sao kê")
        )


async def seed_journey(
    session: AsyncSession, storage: Storage, *, approve: bool, background: int
) -> Summary:
    summary = Summary()
    exists = await session.scalar(select(User.id).where(User.email == f"admin@{DOMAIN}"))
    if exists:
        summary.notes.append("Đã có dữ liệu demo (admin@" + DOMAIN + ") — bỏ qua.")
        return summary
    _quiet_jobs()
    entitlements.register(billing.has_entitlement)  # như app.main: quyền dùng do billing trả lời
    translator = get_translation_service()
    admin = await _account(session, f"admin@{DOMAIN}", UserRole.admin, "vi")
    summary.accounts["admin"] = admin.email
    await _reference_data(session, admin, approve)

    sellers: dict[str, tuple[CurrentUser, uuid.UUID, list[uuid.UUID]]] = {}
    for spec in SELLERS:
        sellers[spec["key"]] = await _seller(session, storage, admin, spec, summary)
        summary.accounts[f"seller_{spec['key']}"] = spec["email"]
    for spec in SERVICES:
        user = await _account(session, spec["email"], UserRole.exporter, "vi")
        body = exporter_body(
            spec["name"],
            registration_number=spec["reg"],
            tax_id=spec["reg"],
            industry_sector="other",
            business_type="trader",
            offering_type="services",
            address="TP. Hồ Chí Minh",
            contact_email=spec["email"],
        )
        company = await companies.create_company(session, user, CompanyIn.model_validate(body))
        for category, title, countries in spec["offerings"]:
            await offering_service.create_service(
                session,
                user,
                ServiceOfferingIn(
                    category_code=category, title=title, coverage_countries=countries
                ),
            )
        request = await request_service.submit_request(session, user)
        await request_service.decide_request(
            session, admin, request.id, DecisionIn(decision="approve", reason=None)
        )
        summary.accounts.setdefault("service_provider", spec["email"])
        _ = company

    buyers: dict[str, CurrentUser] = {}
    for spec in BUYERS:
        user = await _account(session, spec["email"], UserRole.buyer, "en")
        body = {
            "legal_name": spec["name"] + TAG,
            "country": spec["country"],
            "business_type": spec["type"],
            "contact_email": spec["email"],
            "vat_number": spec["vat"],
            "sourcing_categories": spec["categories"],
        }
        await companies.create_company(session, user, CompanyIn.model_validate(body))
        if spec.get("verify"):
            request = await request_service.submit_request(session, user)
            await request_service.decide_request(
                session, admin, request.id, DecisionIn(decision="approve", reason=None)
            )
        buyers[spec["country"]] = user
    summary.accounts["buyer_verified"] = BUYERS[0]["email"]
    summary.accounts["buyer_unverified"] = BUYERS[1]["email"]

    # Thanh toán + cấp Nâng cao cho seller thủy sản.
    seafood_user, seafood_id, seafood_products = sellers["seafood"]
    await _pay(session, seafood_user, admin, "verification_enhanced", confirm=True)
    tier_request = await tier_service.request_tier(
        session, seafood_user, TierRequestIn(target_tier=2)
    )
    await request_service.decide_request(
        session,
        admin,
        tier_request.id,
        DecisionIn(decision="approve", reason="DEMO: HACCP đối chiếu Bureau Veritas"),
    )
    await _pay(
        session, seafood_user, admin, "gtm_report_full", confirm=False
    )  # admin demo xác nhận
    rice_user, _, rice_products = sellers["rice"]
    await _pay(session, rice_user, admin, "gtm_report_full", confirm=True)

    # Buyer đã xác minh xem hồ sơ, nhắn tin, gửi RFQ; seller trả lời và báo giá.
    hanse = buyers["DE"]
    seafood_slug = (await companies.get_company_for_review(session, seafood_id)).slug
    await dashboard.record_profile_view(session, seafood_slug, hanse)
    conversation = await conversation_service.start_direct(
        session,
        hanse,
        seafood_slug,
        "Hello, we import pangasius for German retail. Can you supply 2 x 40ft per month?",
        translator,
    )
    await conversation_service.send_message(
        session,
        seafood_user,
        conversation.id,
        "Chào anh chị, chúng tôi cung cấp được 2 container/tháng, có HACCP và mã cơ sở EU.",
        translator,
    )
    rfq = await messaging.create_rfq(
        session,
        hanse,
        RfqIn.model_validate(
            {
                "product_id": str(seafood_products[0]),
                "quantity": "40000",
                "unit": "kg",
                "target_price": "2.50",
                "currency": "USD",
                "incoterms": "CIF",
                "destination_country": "DE",
                "destination_port": "Hamburg",
                "required_date": (TODAY + dt.timedelta(days=45)).isoformat(),
                "message": "Monthly contract, retail packs 1 kg.",
            }
        ),
    )
    quote = await quote_service.create_quote(
        session,
        seafood_user,
        rfq.id,
        QuoteIn.model_validate(
            {
                "unit_price": "2.55",
                "currency": "USD",
                "incoterm": "CIF",
                "named_place": "Hamburg",
                "deposit_percent": 30,
                "balance_terms": "against_bl_copy",
                "lead_time_days": 30,
                "valid_until": (TODAY + dt.timedelta(days=14)).isoformat(),
                "notes": "Túi 1 kg, 10 kg/thùng.",
            }
        ),
    )
    await quote_service.decide_quote(session, hanse, quote.id, QuoteDecisionIn(decision="accept"))
    horeca = buyers["ES"]
    chat = await conversation_service.start_direct(
        session, horeca, seafood_slug, "Do you have 10 kg cartons for restaurants?", translator
    )
    await conversation_service.send_message(
        session, seafood_user, chat.id, "Có ạ, thùng 10 kg cho kênh Horeca.", translator
    )
    await messaging.create_rfq(
        session,
        buyers["NL"],
        RfqIn.model_validate(
            {
                "product_id": str(rice_products[1]),
                "quantity": "50",
                "unit": "tonne",
                "currency": "EUR",
                "incoterms": "FOB",
                "destination_country": "NL",
                "required_date": (TODAY + dt.timedelta(days=60)).isoformat(),
                "message": "Trial order Jasmine rice.",
            }
        ),
    )

    # Báo cáo go-to-market mẫu (gói đã trả phí) và yêu cầu tư vấn.
    report = await report_service.create_report(session, rice_user, ReportIn(q="gạo"), storage)
    await report_service.run_report(session, storage, report.id, FakeChatModel())
    ready = await session.scalar(select(MarketReport.status).where(MarketReport.id == report.id))
    if ready != "ready":
        summary.notes.append(
            "Báo cáo GTM mẫu chưa dựng được (Storage chưa chạy) — bật S3 rồi tạo báo cáo mới."
        )
    await report_service.create_lead(
        session,
        rice_user,
        ConsultingLeadIn(
            report_id=report.id,
            contact_name="Trần Thị Mai",
            contact_email=f"gaothom@{DOMAIN}",
            message="Cần tư vấn vào thị trường Đức với thương hiệu riêng.",
        ),
    )
    if background:
        await seed_demo.seed(session, background)
    return summary


async def _run(approve: bool, background: int) -> None:
    async with get_sessionmaker()() as session:
        summary = await seed_journey(session, get_storage(), approve=approve, background=background)
    for role, email in summary.accounts.items():
        print(f"{role:18} {email}")
    if summary.accounts:
        print(f"Mật khẩu chung: {PASSWORD}")
    for note in summary.notes:
        print(f"LƯU Ý: {note}")


def main(argv: Sequence[str] | None = None) -> int:
    use_utf8()
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("--approve-evidence-types", action="store_true")
    parser.add_argument("--background", type=int, default=12, help="Số công ty nền [DEMO] (0–200)")
    parser.add_argument("--allow-remote", action="store_true", help="Cho phép DB staging/từ xa")
    args = parser.parse_args(list(sys.argv[1:] if argv is None else argv))
    url = make_url(get_settings().database_url)
    seed_demo.assert_allowed(url.host, url.database, args.allow_remote)
    asyncio.run(_run(args.approve_evidence_types, max(0, min(args.background, 200))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
