"""U23: điểm tín nhiệm seller (ADR-0004) — hàm thuần giải thích được; tiêu chí chưa duyệt bị bỏ qua
(minh hoạ chỉ khi bật DEMO); "Mới trên nền tảng" khi thiếu dữ liệu hành vi; chỉ owner/admin xem trừ khi
TRUST_SCORE_PUBLIC bật; không bao giờ là đầu vào của decide() hay thứ tự danh bạ."""

import datetime as dt
import pathlib
import re
import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.modules.auth.schemas import CurrentUser
from app.modules.companies.tests.helpers import company_body, login_as
from app.modules.messaging import service as messaging_service
from app.modules.messaging.schemas import ResponseStats
from app.modules.verification.models import TrustCriterion
from app.modules.verification.tests.test_tiers import approve
from app.modules.verification.trust import (
    Criterion,
    TrustFacts,
    compute,
    fact_values,
    reply_time_value,
)
from scripts.seed_trust_criteria import DEFAULT_CSV, load_csv, seed_criteria

APP = pathlib.Path(__file__).resolve().parents[3]


def criteria() -> list[Criterion]:
    return [
        Criterion(
            str(r["component"]),
            str(r["fact_key"]),
            str(r["label_vi"]),
            str(r["label_en"]),
            Decimal(str(r["weight"])),
        )
        for r in load_csv(DEFAULT_CSV)
    ]


def facts(**over: object) -> TrustFacts:
    base: dict[str, object] = {
        "verified": True,
        "tier": 1,
        "valid_certificates": 0,
        "export_evidence": False,
        "passed_checks": set(),
    }
    base.update(over)
    return TrustFacts(**base)  # type: ignore[arg-type]


def test_draft_weights_follow_research_split() -> None:
    weights: dict[str, Decimal] = {}
    for c in criteria():
        weights[c.component] = weights.get(c.component, Decimal(0)) + c.weight
    assert weights == {"documents": 35, "automated": 15, "behaviour": 50}


def test_new_seller_is_scored_without_behaviour_and_labelled_new() -> None:
    result = compute(criteria(), facts())
    assert result.new_on_platform is True
    behaviour = next(c for c in result.components if c.component == "behaviour")
    assert behaviour.score is None and all(r.value is None for r in behaviour.criteria)
    # Chỉ pháp lý (15/50 trọng số đang tính) → 30 điểm.
    assert result.score == Decimal(30)


def test_full_marks_and_explainable_parts() -> None:
    f = facts(
        tier=2,
        valid_certificates=5,
        export_evidence=True,
        passed_checks={
            "email_free_mail",
            "email_mx",
            "website_live",
            "website_name_match",
            "domain_age",
            "vies_vat",
            "geocode",
        },
        conversations=10,
        replied=10,
        median_reply_hours=Decimal(3),
        rfqs=4,
        quoted=4,
    )
    result = compute(criteria(), f)
    assert result.score == Decimal(100) and not result.new_on_platform
    assert {c.component: c.score for c in result.components} == {
        "documents": 100,
        "automated": 100,
        "behaviour": 100,
    }


def test_behaviour_values() -> None:
    values = fact_values(facts(conversations=4, replied=3, rfqs=2, quoted=1))
    assert (values["response_rate"], values["quote_rate"]) == (Decimal("0.75"), Decimal("0.5"))
    assert values["response_time"] is None  # chưa có câu trả lời nào để đo
    assert reply_time_value(Decimal(20)) == 1
    assert reply_time_value(Decimal(48)) == Decimal("0.5")
    assert reply_time_value(Decimal(100)) == 0


def test_trust_score_never_feeds_decide_or_directory_ordering() -> None:
    """Khoá tĩnh: decide() và truy vấn danh bạ không đọc module điểm tín nhiệm."""
    guarded = [
        APP / "modules/verification/service.py",
        APP / "modules/verification/request_service.py",
        APP / "modules/verification/tier_service.py",
        APP / "modules/companies/product_service.py",
        APP / "modules/directory/service.py",
    ]
    for path in guarded:
        text = path.read_text(encoding="utf-8")
        assert not re.search(r"\btrust(_service)?\b", text), path.name


# ── API ───────────────────────────────────────────────────────────────────────
@pytest.fixture
def demo_on(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "demo_compliance_data", True)


async def test_unreviewed_criteria_are_ignored_unless_demo(
    api_client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    await seed_criteria(db_session, load_csv(DEFAULT_CSV))
    await login_as(api_client, "exporter", "exp@x.vn")
    await api_client.post("/api/me/company", json=company_body())
    body = (await api_client.get("/api/exporter/trust-score")).json()
    assert body["score"] is None and body["components"][0]["criteria"] == []

    monkeypatch.setattr(get_settings(), "demo_compliance_data", True)
    body = (await api_client.get("/api/exporter/trust-score")).json()
    assert body["uses_draft_criteria"] is True
    assert body["score"] == "0" and body["new_on_platform"] is True
    assert body["disclaimer_vi"].endswith("Không phải chứng nhận hay xếp hạng tín dụng.")
    assert body["method_url"] == "/trust-score"
    criteria_public = (await api_client.get("/api/public/trust-criteria")).json()
    assert len(criteria_public) == 12 and all(c["draft"] for c in criteria_public)


@pytest.mark.usefixtures("demo_on")
async def test_score_reflects_verification_and_is_private_by_default(
    api_client: AsyncClient,
    db_session: AsyncSession,
    company_id: uuid.UUID,
    admin_user: CurrentUser,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await seed_criteria(db_session, load_csv(DEFAULT_CSV))
    await approve(db_session, company_id, admin_user)

    async def busy(session: AsyncSession, cid: uuid.UUID, since: dt.datetime) -> ResponseStats:
        return ResponseStats(
            conversations=4, replied=2, median_reply_hours=Decimal(10), rfqs=2, quoted=2
        )

    monkeypatch.setattr(messaging_service, "seller_response_stats", busy)
    body = (await api_client.get("/api/exporter/trust-score")).json()
    parts = {c["component"]: c["score"] for c in body["components"]}
    # Hành vi: trả lời 50% (20), nhanh (15), báo giá 100% (15) → (10+15+15)/50 = 80.
    assert parts == {"documents": "43", "automated": "0", "behaviour": "80"}
    assert body["new_on_platform"] is False

    slug = (await api_client.get("/api/me/company")).json()["slug"]
    await api_client.post("/api/auth/logout")
    r = await api_client.get(f"/api/public/companies/{slug}/trust-score")
    assert (r.status_code, r.json()["error"]["code"]) == (404, "trust_score_not_public")
    monkeypatch.setattr(get_settings(), "trust_score_public", True)
    assert (await api_client.get(f"/api/public/companies/{slug}/trust-score")).status_code == 200
    await login_as(api_client, "buyer", "buyer@x.de")
    assert (await api_client.get("/api/exporter/trust-score")).status_code == 403


async def test_reviewed_criterion_counts_in_production_mode(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    db_session.add(
        TrustCriterion(
            component="documents",
            fact_key="legal_verified",
            label_vi="Pháp lý",
            label_en="Legal",
            weight=Decimal(10),
            reviewed_by=reviewer_id,
            reviewed_at=dt.datetime.now(dt.UTC),
        )
    )
    await db_session.flush()
    await login_as(api_client, "exporter", "exp@x.vn")
    await api_client.post("/api/me/company", json=company_body())
    body = (await api_client.get("/api/exporter/trust-score")).json()
    assert (body["score"], body["uses_draft_criteria"]) == ("0", False)  # chưa verified
