"""SPEC_compliance_data_20_codes §5.1, §8: thuế EVFTA theo lộ trình, tiết kiệm 20 mã, trạng thái
duyệt và dòng lưu ý (dữ liệu chưa duyệt vẫn trả số, kể cả ENV=prod)."""

import datetime as dt
import json
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.modules.auth.service import create_admin
from app.modules.compliance import disclaimer
from app.modules.compliance.calculators import evfta_rate, evfta_stage, unreviewed_components
from app.modules.compliance.models import ComplianceCheck, HsCodeCompliance, TariffLine
from app.modules.compliance.schemas import TariffIn
from app.modules.compliance.seed import load_seed
from app.modules.compliance.service import calculate_tariff
from app.modules.compliance.tests.test_seed_loader import SEED_DIR, VERSION

URL = "/api/public/tariff"
GOLDEN = {
    r["cn_code"]: Decimal(str(r["golden_saving_eur_on_100000"]))
    for r in json.loads((SEED_DIR / "tariff_lines.json").read_text(encoding="utf-8"))
}
B3_CODE = "03046200"  # nhóm B3, thuế cơ sở 5,5%


def _in(code: str) -> TariffIn:
    return TariffIn(hs_code=code, destination="DE", product_value="100000")  # type: ignore[arg-type]


# --- hàm thuần ------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("stages", "on_date", "k"),
    [
        (4, dt.date(2020, 7, 31), 0),
        (4, dt.date(2020, 8, 1), 1),
        (4, dt.date(2020, 12, 31), 1),
        (4, dt.date(2021, 1, 1), 2),
        (4, dt.date(2022, 12, 31), 3),
        (4, dt.date(2023, 1, 1), 4),
        (4, dt.date(2030, 1, 1), 4),
    ],
)
def test_evfta_stage(stages: int, on_date: dt.date, k: int) -> None:
    assert evfta_stage(stages, on_date) == k


def test_b3_staging_boundary() -> None:
    base = Decimal("5.5")
    assert evfta_rate(base, 4, dt.date(2022, 12, 31)) == Decimal("1.3750")  # 1/4 thuế cơ sở
    assert evfta_rate(base, 4, dt.date(2023, 1, 1)) == Decimal("0.0000")


def test_b7_in_2026_is_seventh_of_eight() -> None:
    assert evfta_rate(Decimal("8"), 8, dt.date(2026, 6, 1)) == Decimal("1.0000")  # bậc 7/8
    assert evfta_rate(Decimal("8"), 8, dt.date(2027, 1, 1)) == Decimal("0.0000")


def test_rate_rounds_half_up_to_4_places() -> None:
    assert evfta_rate(Decimal("1"), 3, dt.date(2020, 8, 1)) == Decimal("0.6667")


def test_unreviewed_components_rules() -> None:
    full = {
        "line_reviewed": True,
        "mfn_source": "TARIC",
        "mfn_verified_taric": True,
        "cn_mapping_verified": True,
    }
    assert unreviewed_components(**full) == []  # type: ignore[arg-type]
    assert unreviewed_components(**{**full, "mfn_verified_taric": False}) == ["mfn_taric"]  # type: ignore[arg-type]
    assert unreviewed_components(
        line_reviewed=False, mfn_source="X", mfn_verified_taric=False, cn_mapping_verified=False
    ) == ["tariff_line", "mfn_taric", "cn_mapping"]
    # dòng nhập tay (không qua seed) và mã chưa có hồ sơ CN không bị coi là thiếu
    assert (
        unreviewed_components(
            line_reviewed=True,
            mfn_source=None,
            mfn_verified_taric=False,
            cn_mapping_verified=None,
        )
        == []
    )


# --- 20 mã đợt 1 ------------------------------------------------------------------------------


@pytest.mark.parametrize("code", sorted(GOLDEN))
async def test_2026_savings_match_golden(db_session: AsyncSession, code: str) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    out = await calculate_tariff(db_session, _in(code), None, on_date=dt.date(2026, 6, 1))
    assert out.status == "ok", code
    assert out.evfta_rate == Decimal("0.0000")
    assert out.savings == GOLDEN[code]
    assert out.review_state == "UNREVIEWED"


async def test_each_run_writes_one_check_with_review_state(db_session: AsyncSession) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    out = await calculate_tariff(db_session, _in(B3_CODE), None, on_date=dt.date(2026, 6, 1))
    check = await db_session.scalar(
        select(ComplianceCheck).where(ComplianceCheck.id == out.check_id)
    )
    assert check is not None and check.tariff_line_id is not None
    assert check.review_state == "UNREVIEWED"
    assert check.unreviewed_components == ["tariff_line", "mfn_taric", "cn_mapping"]
    assert check.data_version == VERSION


async def test_b3_before_2023_has_reduced_not_zero_rate(db_session: AsyncSession) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    out = await calculate_tariff(db_session, _in(B3_CODE), None, on_date=dt.date(2022, 12, 31))
    assert out.evfta_rate == Decimal("1.3750") and out.savings == Decimal("4125.00")


# --- trạng thái duyệt và dòng lưu ý (API) ---------------------------------------------------------


async def _post(client: AsyncClient, language: str | None = None) -> dict:  # type: ignore[type-arg]
    headers = {"Accept-Language": language} if language else {}
    res = await client.post(
        URL,
        json={"hs_code": B3_CODE, "destination": "DE", "product_value": "100000"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    return res.json()  # type: ignore[no-any-return]


@pytest.mark.parametrize(("language", "expected"), [("vi", "vi"), ("en-US,en;q=0.9", "en")])
async def test_unreviewed_in_prod_still_returns_numbers_with_disclaimer(
    api_client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    language: str,
    expected: str,
) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    monkeypatch.setattr(get_settings(), "env", "prod")
    monkeypatch.setattr(get_settings(), "demo_compliance_data", False)
    out = await _post(api_client, language)
    assert out["status"] == "ok" and out["savings"] is not None
    assert out["review_state"] == "UNREVIEWED"
    assert out["disclaimer"] == disclaimer.disclaimer_for("UNREVIEWED", expected)
    assert out["disclaimer"] is not None and out["disclaimer"].startswith(
        "Lưu ý" if expected == "vi" else "Note"
    )


async def _approve(session: AsyncSession, *, line: bool, taric: bool, mapping: bool) -> None:
    admin = await create_admin(session, "luat-tm@evfta.eu", "correct-horse-battery")
    row = await session.scalar(select(TariffLine).where(TariffLine.hs_code == B3_CODE))
    cn = await session.get(HsCodeCompliance, B3_CODE)
    assert row is not None and cn is not None
    if line:
        row.reviewed_by, row.reviewed_at = admin, dt.datetime.now(dt.UTC)
    row.mfn_verified_taric = taric
    cn.cn_mapping_verified = mapping
    await session.flush()


async def test_reviewed_line_but_mfn_not_verified_stays_unreviewed(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    await _approve(db_session, line=True, taric=False, mapping=True)
    out = await _post(api_client, "vi")
    assert out["review_state"] == "UNREVIEWED"
    assert out["unreviewed_components"] == ["mfn_taric"]
    assert out["disclaimer"] is not None


async def test_everything_reviewed_has_no_disclaimer(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    await _approve(db_session, line=True, taric=True, mapping=True)
    out = await _post(api_client, "vi")
    assert out["status"] == "ok"
    assert out["review_state"] == "REVIEWED" and out["unreviewed_components"] == []
    assert out["disclaimer"] is None


async def test_unsupported_code_has_no_numbers_and_no_disclaimer(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    res = await api_client.post(
        URL, json={"hs_code": "990000", "destination": "DE", "product_value": "100000"}
    )
    out = res.json()
    assert out["status"] == "unsupported" and out["reasons"] == ["NOT_SUPPORTED"]
    assert out["savings"] is None and out["evfta_rate"] is None and out["disclaimer"] is None
