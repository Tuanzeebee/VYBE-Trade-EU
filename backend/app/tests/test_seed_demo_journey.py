"""U25: script dữ liệu demo đi hết hành trình qua các service thật — chạy được trên DB sạch, chạy lại
không tạo trùng; tài khoản các vai trò, cấp xác minh, đơn chuyển khoản, báo cáo đều đúng trạng thái."""

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.modules.auth.models import User
from app.modules.billing.models import Order
from app.modules.companies.models import Company
from app.modules.markets.models import ConsultingLead, MarketReport
from app.modules.messaging.models import RfqQuote
from app.modules.verification.models import VerificationCheck
from conftest import FakeStorage
from scripts.seed_demo_journey import DOMAIN, seed_journey


@pytest.fixture(autouse=True)
def _demo_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "rfq_daily_limit_unverified", 3)


async def test_journey_seed_builds_every_demo_state(db_session: AsyncSession) -> None:
    summary = await seed_journey(db_session, FakeStorage(), approve=True, background=2)
    assert {"admin", "seller_seafood", "service_provider", "buyer_verified"} <= set(
        summary.accounts
    )
    users = await db_session.scalar(
        select(func.count()).select_from(User).where(User.email.like(f"%@{DOMAIN}"))
    )
    assert users == 1 + 4 + 3 + 5

    companies = {
        c.legal_name: c
        for c in await db_session.scalars(select(Company).where(Company.legal_name.like("%[DEMO]")))
    }
    seafood = companies["Công ty CP Thủy Sản Mekong Xanh [DEMO]"]
    coffee = companies["Công ty TNHH Cà Phê Tây Nguyên [DEMO]"]
    hanse = companies["Hanse Seafood Import GmbH [DEMO]"]
    assert (seafood.verification_status.value, seafood.verification_tier) == ("verified", 2)
    assert (coffee.verification_status.value, coffee.verification_tier) == ("pending", 0)
    assert hanse.verification_status.value == "verified"  # buyer KYB nhẹ tuỳ chọn
    assert sum(1 for c in companies.values() if c.offering_type == "services") == 3

    orders = {
        (o.item_code, o.status)
        for o in await db_session.scalars(select(Order).where(Order.company_id == seafood.id))
    }
    assert orders == {("verification_enhanced", "paid"), ("gtm_report_full", "pending")}
    report = await db_session.scalar(select(MarketReport))
    assert report is not None and report.status == "ready" and report.narrative_source == "template"
    assert await db_session.scalar(select(func.count()).select_from(ConsultingLead)) == 1
    quote = await db_session.scalar(select(RfqQuote))
    assert quote is not None and quote.status.value == "accepted"
    manual = await db_session.scalar(
        select(func.count())
        .select_from(VerificationCheck)
        .where(VerificationCheck.check_code == "national_registry")
    )
    assert manual == 3  # 3 seller sản phẩm đã duyệt có kết quả kiểm tay Cổng ĐKDN

    again = await seed_journey(db_session, FakeStorage(), approve=True, background=0)
    assert again.accounts == {} and "bỏ qua" in again.notes[0]
