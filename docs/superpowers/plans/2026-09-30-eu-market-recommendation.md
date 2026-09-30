# Đề xuất thị trường EU + dữ liệu thuế/RoO đã xác minh — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nạp 20 mã CN đã xác minh (thuế + RoO + VAT DE/FR/NL) ở trạng thái chưa duyệt, thêm máy tính "thị trường EU nên xuất khẩu" và giới hạn thị trường xuất khẩu của exporter về nước EU.

**Architecture:** Dữ liệu thuế/RoO đi vào `tariff_lines` và `product_specific_rules` bằng bộ import có sẵn. Bảng mới `import_country_terms` giữ VAT theo (mã HS, nước). Hàm thuần `rank_markets` xếp hạng; `compliance.service` gắn DB; router mỏng. Tra cứu mã thử mã 8 số trước rồi lùi về 6 số.

**Tech Stack:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 async, Alembic, pytest (Postgres thật); Next.js, TypeScript, vitest, client API sinh từ OpenAPI. Không thêm dependency.

**Spec:** `docs/superpowers/specs/2026-09-30-eu-market-recommendation-design.md`

## Global Constraints

- Không đoán luật (AGENTS §6.1): mọi số thuế/VAT/RoO chỉ từ file Excel hoặc bảng DB đã duyệt. VAT nước ngoài DE/FR/NL → `no_data`, không có con số.
- Mọi dữ liệu import ở trạng thái **chưa duyệt** (`reviewed_by` NULL). Không code nào tự duyệt.
- Tiền/tỷ lệ dùng `Decimal`/`numeric`, JSON nhận chuỗi, cấm float. `_money` làm tròn HALF_UP 2 chữ số.
- Router mỏng; logic ở `service.py`; tính toán là hàm thuần trong `calculators.py`. Module khác chỉ import `service`/`schemas` (không import `models`).
- Không sửa migration đã merge (0001–0027). Migration mới là `0028`.
- Mọi chuỗi giao diện qua `tr('…')` và có bản dịch trong `frontend/i18n/catalog.json`; kiểm bằng `npm run i18n:check`.
- Sau khi đổi schema/route backend: chạy `npm run generate:api` trong `frontend/` trước khi sửa FE.
- Không `git push`, không cài dependency, không chạy lệnh ghi lên DB staging/prod. Không sửa `docs/spec/`, `docs/backlog/`, `docs/adr/`, `backend/tests/fixtures/compliance/`, `backend/evals/`.
- Commit nhỏ sau mỗi task, message tiếng Việt dạng `Thị trường EU: <mô tả>`.
- Lệnh chạy trong `backend/` bằng `uv run …`; trong `frontend/` bằng `npm run …`. Postgres phải chạy: `docker compose up -d`.

## Review Focus

Các ca spec ngầm hiểu nhưng dễ bị bỏ sót, mỗi ca có test ở task ghi bên phải:

1. Nhập mã 6 số (vd `081090`) mà dữ liệu chỉ có ở các mã 8 số con → `unsupported`, không trả con số nào, không chọn bừa một con (Task 1).
2. Hai dòng VAT đã duyệt cùng (mã HS, nước) cùng hiệu lực → nước đó `no_data`, không chọn ngẫu nhiên (Task 4).
3. Giá trị lô rất nhỏ (`0.01`) hoặc rất lớn (`999999999999.99`): làm tròn đúng, không tràn, không lỗi 500 (Task 2).
4. `roo_status` sai giá trị → 422; vắng mặt → tính theo MFN (không hiện tiết kiệm) (Task 4).
5. Chạy lại import lần hai không nhân đôi dòng; `--dry-run` không ghi gì (Task 5).
6. Exporter cũ đang có thị trường US/JP trong DB vẫn đọc và cập nhật trường khác được; chỉ ghi giá trị mới không phải EU mới bị từ chối (Task 6).
7. Nước `no_data` không lộ bất kỳ trường số nào trong JSON (Task 2 và Task 4).

---

## File Structure

| File | Việc |
|---|---|
| `backend/app/modules/compliance/service.py` | thêm `lookup_lines`, `lookup_rules`, `find_terms`, `rank_markets_for`, `_line_data`; đổi `calculate_tariff`/`calculate_roo` dùng tra cứu mới |
| `backend/app/modules/compliance/calculators.py` | thêm `CountryTerms`, `MarketRow`, `MarketRanking`, `rank_markets` |
| `backend/app/modules/compliance/models.py` | thêm `ImportCountryTerm` |
| `backend/alembic/versions/0028_import_country_terms.py` | bảng mới |
| `backend/app/modules/compliance/admin_schemas.py`, `admin_service.py`, `router.py` | CRUD + duyệt cho `import_country_terms` |
| `backend/app/modules/compliance/schemas.py` | `MarketsIn`, `MarketRowOut`, `MarketsOut` |
| `backend/scripts/verified_pack.py` | đọc xlsx thành dòng dữ liệu (hàm thuần) |
| `backend/scripts/import_verified_pack.py` | ghi DB (chưa duyệt) |
| `backend/data/compliance/EVFTA_20_ma_da_xac_minh.xlsx` | bản sao file nguồn |
| `backend/app/modules/companies/schemas.py` | `ExportMarketCode` chỉ EU khi ghi |
| `backend/app/modules/compliance/tests/test_code_lookup.py`, `test_market_ranking.py`, `test_country_terms_admin.py`, `test_markets_api.py`, `backend/scripts/tests/…` hoặc `app/modules/compliance/tests/test_verified_pack.py` | test |
| `frontend/lib/marketsApi.ts`, `components/MarketRanking.tsx` | client + bảng xếp hạng |
| `frontend/components/TariffCalculator.tsx`, `OriginCalculator.tsx`, `app/[locale]/(public)/tools/tariff/page.tsx` | nút thị trường, chọn RoO, liên kết |
| `frontend/lib/companyApi.ts`, `components/SellerOnboarding.tsx`, `tests/company-api.test.ts` | thị trường chỉ EU |
| `frontend/lib/adminApi.ts`, `components/admin-compliance/datasets.ts`, `components/AdminComplianceData.tsx` | nhóm dữ liệu VAT cho admin |
| `frontend/i18n/catalog.json` | bản dịch |

---

### Task 1: Tra cứu mã 8 số (lùi về 6 số)

**Files:**
- Modify: `backend/app/modules/compliance/service.py` (`calculate_tariff`, `calculate_roo`)
- Test: `backend/app/modules/compliance/tests/test_code_lookup.py`

**Interfaces:**
- Produces: `async def lookup_lines(session: AsyncSession, code: str, on_date: dt.date) -> list[TariffLine]` và `async def lookup_rules(session: AsyncSession, code: str, on_date: dt.date) -> list[ProductSpecificRule]`. `code` là mã đã chuẩn hóa 6–8 số. Trả các dòng đã duyệt của khóa đầu tiên (mã nhập, rồi nhóm 6 số) vừa nằm trong danh mục hỗ trợ vừa có dòng; không có → `[]`. `line.hs_code` là khóa thực tế đã khớp (Task 4 dùng để tra VAT).

- [ ] **Step 1: Viết test lỗi**

`backend/app/modules/compliance/tests/test_code_lookup.py`:

```python
"""Tra cứu mã CN 8 số: khớp 8 số trước, lùi về 6 số; 6 số không khớp mã 8 số con."""

import datetime as dt
import uuid
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.schemas import HsCodeIn
from app.modules.catalog.service import upsert_hs_codes
from app.modules.compliance.models import DutyType, ProductSpecificRule, RuleType, TariffLine

pytestmark = pytest.mark.usefixtures("hs_seeded")

TODAY = dt.datetime.now(dt.UTC).date()
FROM = TODAY - dt.timedelta(days=30)
SHRIMP6, SHRIMP_A, SHRIMP_B = "030617", "03061792", "03061799"
FRUIT6, FRUIT_CHILD = "081090", "08109075"


async def add_hs(session: AsyncSession, code: str) -> None:
    await upsert_hs_codes(
        session,
        [
            HsCodeIn(
                code=code,
                name_vi="Tôm",
                name_en="Shrimp",
                category="seafood",
                is_calculator_supported=True,
            )
        ],
    )


async def add_line(
    session: AsyncSession, reviewer: uuid.UUID, hs: str, mfn: str, evfta: str
) -> None:
    session.add(
        TariffLine(
            hs_code=hs,
            destination="EU",
            duty_type=DutyType.ad_valorem,
            mfn_rate=Decimal(mfn),
            evfta_rate_current=Decimal(evfta),
            valid_from=FROM,
            reviewed_by=reviewer,
            reviewed_at=dt.datetime.now(dt.UTC),
        )
    )
    await session.flush()


async def add_rule(
    session: AsyncSession, reviewer: uuid.UUID, hs: str, *, expert: bool
) -> None:
    session.add(
        ProductSpecificRule(
            hs_code=hs,
            rule_type=RuleType.WO,
            requires_expert=expert,
            valid_from=FROM,
            reviewed_by=reviewer,
            reviewed_at=dt.datetime.now(dt.UTC),
        )
    )
    await session.flush()


def tariff_body(code: str) -> dict[str, Any]:
    return {"hs_code": code, "destination": "DE", "product_value": "100000.00"}


async def test_exact_eight_digit_line_beats_heading_line(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_hs(db_session, SHRIMP_A)
    await add_line(db_session, reviewer_id, SHRIMP6, "20", "10")
    await add_line(db_session, reviewer_id, SHRIMP_A, "12", "0")
    d = (await api_client.post("/api/public/tariff", json=tariff_body(SHRIMP_A))).json()
    assert (d["status"], d["mfn_duty"], d["evfta_duty"]) == ("ok", "12000.00", "0.00")


async def test_eight_digit_code_not_in_catalog_falls_back_to_heading(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_line(db_session, reviewer_id, SHRIMP6, "20", "10")
    d = (await api_client.post("/api/public/tariff", json=tariff_body(SHRIMP_B))).json()
    assert (d["status"], d["mfn_duty"]) == ("ok", "20000.00")


async def test_six_digit_code_does_not_pick_an_eight_digit_child(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_hs(db_session, FRUIT_CHILD)
    await add_line(db_session, reviewer_id, FRUIT_CHILD, "8.8", "0")
    d = (await api_client.post("/api/public/tariff", json=tariff_body(FRUIT6))).json()
    assert d["status"] == "unsupported"
    assert all(d[k] is None for k in ("mfn_rate", "evfta_rate", "mfn_duty", "evfta_duty", "savings"))


async def test_roo_uses_eight_digit_rule_over_heading_rule(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_hs(db_session, SHRIMP_A)
    await add_rule(db_session, reviewer_id, SHRIMP6, expert=True)
    await add_rule(db_session, reviewer_id, SHRIMP_A, expert=False)
    body = {"hs_code": SHRIMP_A, "materials_declared": True, "materials": []}
    d = (await api_client.post("/api/public/roo", json=body)).json()
    assert d["status"] == "pass"
```

- [ ] **Step 2: Chạy, xác nhận lỗi**

Run: `cd backend && uv run pytest app/modules/compliance/tests/test_code_lookup.py -v`
Expected: FAIL (ít nhất `test_exact_eight_digit_line_beats_heading_line` và `test_roo_uses_eight_digit_rule_over_heading_rule`, vì code hiện chỉ tra nhóm 6 số).

- [ ] **Step 3: Cài đặt**

Trong `service.py`, thêm ngay sau hàm `find_rules`:

```python
async def _supported_keys(session: AsyncSession, code: str) -> list[str]:
    """Khóa tra cứu theo thứ tự thử: chính mã nhập rồi nhóm 6 số, chỉ giữ mã trong danh mục hỗ trợ."""
    keys: list[str] = []
    for key in dict.fromkeys((code, code[:HEADING_LENGTH])):
        hs = await catalog.get_hs_code(session, key)
        if hs is not None and hs.supported:
            keys.append(key)
    return keys


async def lookup_lines(session: AsyncSession, code: str, on_date: dt.date) -> list[TariffLine]:
    """Dòng thuế đã duyệt cho mã `code`: thử mã 8 số trước, không có thì lùi về nhóm 6 số.

    Mã 6 số KHÔNG tự chọn một mã 8 số con (các con có thể khác thuế, vd 081090)."""
    for key in await _supported_keys(session, code):
        lines = await find_lines(session, key, UNION_DESTINATION, on_date)
        if lines:
            return lines
    return []


async def lookup_rules(
    session: AsyncSession, code: str, on_date: dt.date
) -> list[ProductSpecificRule]:
    """Quy tắc xuất xứ đã duyệt cho mã `code`, cùng thứ tự thử như lookup_lines."""
    for key in await _supported_keys(session, code):
        rules = await find_rules(session, key, on_date)
        if rules:
            return rules
    return []
```

Trong `calculate_tariff`, thay khối từ `heading = code[:HEADING_LENGTH]` đến hết `lines = await find_lines(...)` bằng:

```python
    lines = await lookup_lines(session, code, dt.datetime.now(dt.UTC).date())
```

Trong `calculate_roo`, thay khối từ `heading = code[:HEADING_LENGTH]` đến hết `rules = await find_rules(...)` bằng:

```python
    rules = await lookup_rules(session, code, dt.datetime.now(dt.UTC).date())
```

(Giữ nguyên các dòng `rule = ...` và `if len(rules) > 1` bên dưới.) Xóa import không còn dùng nếu ruff báo.

- [ ] **Step 4: Chạy test mới và cả module**

Run: `cd backend && uv run pytest app/modules/compliance -q`
Expected: PASS toàn bộ (kể cả các test tariff/roo cũ).

- [ ] **Step 5: Commit**

```bash
git add backend/app/modules/compliance/service.py backend/app/modules/compliance/tests/test_code_lookup.py
git commit -m "Thị trường EU: tra cứu mã CN 8 số, lùi về nhóm 6 số"
```

---

### Task 2: Hàm thuần `rank_markets`

**Files:**
- Modify: `backend/app/modules/compliance/calculators.py`
- Test: `backend/app/modules/compliance/tests/test_market_ranking.py`

**Interfaces:**
- Consumes: `tariff_savings(line, lines_found, product_value, shipments_per_year) -> TariffResult`, `TariffLineData`, `EU_MEMBERS`, `_money`, `HUNDRED`.
- Produces (mọi type nằm trong `calculators.py`):
  - `CountryTerms(country: str, vat_rate: Decimal, label_languages: str | None = None, note: str | None = None, note_en: str | None = None)` — frozen dataclass, `vat_rate` là %.
  - `MarketRow(country, status: Literal["ranked","no_data"], rank: int | None, duty, vat_rate, vat, total: Decimal | None, label_languages, note, note_en: str | None)` — frozen; mọi trường số `None` khi `no_data`.
  - `MarketRanking(status: TariffStatus, basis: Literal["evfta","mfn"] | None, duty_rate: Decimal | None, rows: tuple[MarketRow, ...])`.
  - `rank_markets(line: TariffLineData | None, lines_found: int, product_value: Decimal, roo_status: str | None, terms: Sequence[CountryTerms]) -> MarketRanking`.

- [ ] **Step 1: Viết test lỗi**

`backend/app/modules/compliance/tests/test_market_ranking.py`:

```python
"""rank_markets: hàm thuần. Golden theo file EVFTA_20_ma_da_xac_minh (tôm 03061792, lô 100.000 EUR)."""

from decimal import Decimal
from typing import Any

import pytest

from app.modules.compliance.calculators import (
    EU_MEMBERS,
    CountryTerms,
    MarketRanking,
    TariffLineData,
    rank_markets,
)
from app.modules.compliance.models import DutyType

VALUE = Decimal("100000")
TERMS = (
    CountryTerms("DE", Decimal("7"), "de"),
    CountryTerms("FR", Decimal("5.5"), "fr"),
    CountryTerms("NL", Decimal("9"), "nl"),
)
NUMBER_FIELDS = ("rank", "duty", "vat_rate", "vat", "total")


def line(mfn: str = "12", evfta: str = "0", **over: Any) -> TariffLineData:
    fields: dict[str, Any] = {
        "duty_type": DutyType.ad_valorem,
        "mfn_rate": Decimal(mfn),
        "evfta_rate_current": Decimal(evfta),
        "quota_required": False,
        "quota_note": None,
        "condition_note": None,
    }
    fields.update(over)
    return TariffLineData(**fields)


def totals(result: MarketRanking) -> dict[str, str]:
    return {r.country: str(r.total) for r in result.rows if r.status == "ranked"}


WITH_CO = {"DE": "7000.00", "FR": "5500.00", "NL": "9000.00"}
WITHOUT_CO = {"DE": "19840.00", "FR": "18160.00", "NL": "22080.00"}


@pytest.mark.parametrize(
    ("roo", "basis", "expected"),
    [
        ("pass", "evfta", WITH_CO),
        ("fail", "mfn", WITHOUT_CO),
        ("inconclusive", "mfn", WITHOUT_CO),
        (None, "mfn", WITHOUT_CO),
    ],
)
def test_golden_shrimp(roo: str | None, basis: str, expected: dict[str, str]) -> None:
    result = rank_markets(line(), 1, VALUE, roo, TERMS)
    assert (result.status, result.basis) == ("ok", basis)
    assert totals(result) == expected


def test_ranked_ascending_then_no_data_last_without_numbers() -> None:
    result = rank_markets(line(), 1, VALUE, "pass", TERMS)
    assert [r.country for r in result.rows[:3]] == ["FR", "DE", "NL"]
    assert [r.rank for r in result.rows[:3]] == [1, 2, 3]
    rest = result.rows[3:]
    assert len(result.rows) == len(EU_MEMBERS) == 27
    assert [r.country for r in rest] == sorted(EU_MEMBERS - {"DE", "FR", "NL"})
    for row in rest:
        assert row.status == "no_data"
        assert all(getattr(row, f) is None for f in NUMBER_FIELDS)


def test_vat_base_includes_duty() -> None:
    row = rank_markets(line(), 1, VALUE, "fail", TERMS).rows[1]  # DE (FR đứng trước)
    assert (row.country, str(row.duty), str(row.vat), str(row.total)) == (
        "DE",
        "12000.00",
        "7840.00",
        "19840.00",
    )


def test_tie_breaks_by_country_code() -> None:
    terms = (CountryTerms("NL", Decimal("7")), CountryTerms("DE", Decimal("7")))
    assert [r.country for r in rank_markets(line(), 1, VALUE, None, terms).rows[:2]] == ["DE", "NL"]


@pytest.mark.parametrize("value", ["0.01", "999999999999.99"])
def test_extreme_values_stay_exact(value: str) -> None:
    result = rank_markets(line(), 1, Decimal(value), "fail", TERMS)
    assert result.status == "ok"
    assert all(r.total is not None and r.total >= 0 for r in result.rows if r.status == "ranked")


@pytest.mark.parametrize(
    ("data", "found", "status"),
    [
        (None, 0, "unsupported"),
        (line(quota_required=True), 1, "needs_review"),
        (line(duty_type=DutyType.mixed), 1, "needs_review"),
        (line(), 2, "needs_review"),
    ],
)
def test_not_ok_has_no_rows_or_numbers(data: TariffLineData | None, found: int, status: str) -> None:
    result = rank_markets(data, found, VALUE, "pass", TERMS)
    assert (result.status, result.basis, result.duty_rate, result.rows) == (status, None, None, ())
```

- [ ] **Step 2: Chạy, xác nhận lỗi**

Run: `cd backend && uv run pytest app/modules/compliance/tests/test_market_ranking.py -v`
Expected: FAIL với `ImportError: cannot import name 'CountryTerms'`.

- [ ] **Step 3: Cài đặt**

Trong `calculators.py`, thêm `from collections.abc import Sequence` vào import, rồi thêm sau hàm `tariff_savings` (trước phần `# ── Quy tắc xuất xứ`):

```python
# ── Xếp hạng thị trường EU ──────────────────────────────────────────────────

MarketStatus = Literal["ranked", "no_data"]
MarketBasis = Literal["evfta", "mfn"]


@dataclass(frozen=True)
class CountryTerms:
    """VAT nhập khẩu (%) và lưu ý của một nước cho một mã hàng. Dữ liệu đã duyệt."""

    country: str
    vat_rate: Decimal
    label_languages: str | None = None
    note: str | None = None
    note_en: str | None = None


@dataclass(frozen=True)
class MarketRow:
    """`no_data`: nước chưa có dòng VAT đã duyệt — mọi trường số là None."""

    country: str
    status: MarketStatus
    rank: int | None = None
    duty: Decimal | None = None
    vat_rate: Decimal | None = None
    vat: Decimal | None = None
    total: Decimal | None = None
    label_languages: str | None = None
    note: str | None = None
    note_en: str | None = None


@dataclass(frozen=True)
class MarketRanking:
    """status khác `ok` (unsupported/needs_review) → không có dòng nào, không có con số nào."""

    status: TariffStatus
    basis: MarketBasis | None = None
    duty_rate: Decimal | None = None
    rows: tuple[MarketRow, ...] = ()


def rank_markets(
    line: TariffLineData | None,
    lines_found: int,
    product_value: Decimal,
    roo_status: str | None,
    terms: Sequence[CountryTerms],
) -> MarketRanking:
    """Xếp các nước EU theo tổng (thuế nhập khẩu + VAT nhập khẩu) tăng dần.

    - Trạng thái và số thuế lấy từ tariff_savings; chỉ `ok` mới xếp hạng.
    - Thuế EVFTA chỉ áp khi RoO = pass; ngược lại dùng MFN (không hưởng ưu đãi).
    - VAT nhập khẩu = (giá trị + thuế nhập khẩu) × VAT. Hòa tổng thì xếp theo mã nước.
    - Nước không có dòng VAT xếp cuối, status no_data, không có con số.
    """
    base = tariff_savings(line, lines_found, product_value, None)
    if (
        base.status != "ok"
        or base.mfn_duty is None
        or base.evfta_duty is None
        or base.mfn_rate is None
        or base.evfta_rate is None
    ):
        return MarketRanking(base.status)
    basis: MarketBasis = "evfta" if roo_status == "pass" else "mfn"
    duty, duty_rate = (
        (base.evfta_duty, base.evfta_rate) if basis == "evfta" else (base.mfn_duty, base.mfn_rate)
    )
    ranked: list[MarketRow] = []
    for term in terms:
        vat = _money((product_value + duty) * term.vat_rate / HUNDRED)
        ranked.append(
            MarketRow(
                term.country,
                "ranked",
                duty=duty,
                vat_rate=term.vat_rate,
                vat=vat,
                total=duty + vat,
                label_languages=term.label_languages,
                note=term.note,
                note_en=term.note_en,
            )
        )
    ranked.sort(key=lambda r: (r.total, r.country))  # type: ignore[arg-type,return-value]
    rows = [
        MarketRow(**{**row.__dict__, "rank": position}) for position, row in enumerate(ranked, 1)
    ]
    covered = {t.country for t in terms}
    rows += [MarketRow(c, "no_data") for c in sorted(EU_MEMBERS - covered)]
    return MarketRanking("ok", basis, duty_rate, tuple(rows))
```

Ghi chú: nếu `mypy --strict` không chấp nhận `# type: ignore` (báo `unused-ignore`), thay bằng `key=lambda r: (r.total or Decimal(0), r.country)` và bỏ comment ignore.

- [ ] **Step 4: Chạy test, lint, mypy**

Run: `cd backend && uv run pytest app/modules/compliance/tests/test_market_ranking.py -v && uv run ruff check app && uv run ruff format --check app && uv run mypy app`
Expected: PASS, ruff sạch, mypy `Success`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/modules/compliance/calculators.py backend/app/modules/compliance/tests/test_market_ranking.py
git commit -m "Thị trường EU: hàm thuần rank_markets (thuế + VAT nhập khẩu)"
```

---

### Task 3: Bảng `import_country_terms` + API admin CRUD/duyệt

**Files:**
- Modify: `backend/app/modules/compliance/models.py`, `admin_schemas.py`, `admin_service.py`, `router.py`, `service.py`
- Create: `backend/alembic/versions/0028_import_country_terms.py`
- Test: `backend/app/modules/compliance/tests/test_country_terms_admin.py`

**Interfaces:**
- Produces:
  - `models.ImportCountryTerm` (cột: `id`, `hs_code`, `country`, `vat_rate`, `label_languages`, `note`, `note_en`, `source`, `reviewed_by`, `reviewed_at`, `valid_from`, `valid_until`, `created_at`, `updated_at`).
  - `admin_schemas.CountryTermIn`, `CountryTermPatch`, `CountryTermOut`.
  - `admin_service.list_country_terms(session, hs_code: str | None, reviewed: bool | None) -> list[ImportCountryTerm]`, `create_country_term(session, actor, data: CountryTermIn, commit: bool = True)`, `update_country_term(session, actor, term_id, patch, commit=True)`, `review_country_term(session, actor, term_id)`, `delete_country_term(session, actor, term_id)`; `TERM_ENTITY = "country_term"`.
  - `service.find_terms(session: AsyncSession, hs_code: str, on_date: dt.date) -> list[ImportCountryTerm]` — chỉ dòng **đã duyệt** đang hiệu lực.
  - Route: `GET|POST /api/admin/country-terms`, `PATCH /api/admin/country-terms/{term_id}`, `POST …/{term_id}/review`, `DELETE …/{term_id}` (vai trò `admin`).

- [ ] **Step 1: Viết test lỗi**

`backend/app/modules/compliance/tests/test_country_terms_admin.py`:

```python
"""API admin cho import_country_terms. Dữ liệu SYNTHETIC."""

import datetime as dt
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog
from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD, login_as
from app.modules.compliance.service import find_terms

pytestmark = pytest.mark.usefixtures("hs_seeded")

URL = "/api/admin/country-terms"
TODAY = dt.datetime.now(dt.UTC).date()
FROM = (TODAY - dt.timedelta(days=30)).isoformat()


def body(**over: Any) -> dict[str, Any]:
    b: dict[str, Any] = {
        "hs_code": "030617",
        "country": "DE",
        "vat_rate": "7",
        "label_languages": "de",
        "note": "synthetic",
        "source": "synthetic",
        "valid_from": FROM,
    }
    b.update(over)
    return b


@pytest.fixture
async def admin(api_client: AsyncClient, db_session: AsyncSession) -> AsyncClient:
    await create_admin(db_session, "admin@evfta.eu", PASSWORD)
    r = await api_client.post(
        "/api/auth/login", json={"email": "admin@evfta.eu", "password": PASSWORD}
    )
    assert r.status_code == 200, r.text
    return api_client


ROUTES = [
    ("GET", URL),
    ("POST", URL),
    ("PATCH", f"{URL}/00000000-0000-0000-0000-000000000000"),
    ("POST", f"{URL}/00000000-0000-0000-0000-000000000000/review"),
    ("DELETE", f"{URL}/00000000-0000-0000-0000-000000000000"),
]


@pytest.mark.parametrize(("method", "path"), ROUTES)
async def test_401_without_session(api_client: AsyncClient, method: str, path: str) -> None:
    assert (await api_client.request(method, path, json={})).status_code == 401


@pytest.mark.parametrize(("method", "path"), ROUTES)
async def test_403_for_non_admin(api_client: AsyncClient, method: str, path: str) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    assert (await api_client.request(method, path, json={})).status_code == 403


async def test_created_row_is_unreviewed_and_hidden_until_review(
    admin: AsyncClient, db_session: AsyncSession
) -> None:
    r = await admin.post(URL, json=body())
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["reviewed_by"] is None and created["vat_rate"] == "7.0000"
    assert await find_terms(db_session, "030617", TODAY) == []
    reviewed = (await admin.post(f"{URL}/{created['id']}/review")).json()
    assert reviewed["reviewed_by"] is not None
    assert [t.country for t in await find_terms(db_session, "030617", TODAY)] == ["DE"]
    actions = list(await db_session.scalars(select(AuditLog.action_type).order_by(AuditLog.created_at)))
    assert "country_term.create" in actions and "country_term.review" in actions


async def test_patch_resets_review(admin: AsyncClient, db_session: AsyncSession) -> None:
    created = (await admin.post(URL, json=body())).json()
    await admin.post(f"{URL}/{created['id']}/review")
    r = await admin.patch(f"{URL}/{created['id']}", json={"vat_rate": "8"})
    assert r.status_code == 200 and r.json()["reviewed_by"] is None
    assert await find_terms(db_session, "030617", TODAY) == []


@pytest.mark.parametrize(
    ("over", "status"),
    [
        ({"country": "US"}, 422),
        ({"hs_code": "999999"}, 422),
        ({"vat_rate": 7}, 422),
        ({"vat_rate": "101"}, 422),
    ],
)
async def test_invalid_input(admin: AsyncClient, over: dict[str, Any], status: int) -> None:
    assert (await admin.post(URL, json=body(**over))).status_code == status


async def test_duplicate_key_is_409_and_reviewed_row_cannot_be_deleted(admin: AsyncClient) -> None:
    created = (await admin.post(URL, json=body())).json()
    assert (await admin.post(URL, json=body())).status_code == 409
    await admin.post(f"{URL}/{created['id']}/review")
    assert (await admin.delete(f"{URL}/{created['id']}")).status_code == 409
```

- [ ] **Step 2: Chạy, xác nhận lỗi**

Run: `cd backend && uv run pytest app/modules/compliance/tests/test_country_terms_admin.py -v`
Expected: FAIL/ERROR (chưa có `find_terms`, route trả 404).

- [ ] **Step 3: Model**

Trong `models.py`, thêm `UniqueConstraint` vào import `sqlalchemy`, rồi thêm cuối file:

```python
class ImportCountryTerm(Base):
    """VAT nhập khẩu, ngôn ngữ nhãn và lưu ý theo (mã HS, nước EU) do luật TM nhập và duyệt.

    Dòng chưa có reviewed_by không bao giờ được dùng: mọi truy vấn đi qua
    compliance.service._reviewed_terms. vat_rate là % (numeric, không float).
    """

    __tablename__ = "import_country_terms"
    __table_args__ = (
        CheckConstraint("valid_until IS NULL OR valid_until > valid_from", name="valid_window"),
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
        CheckConstraint("vat_rate BETWEEN 0 AND 100", name="vat_is_percentage"),
        CheckConstraint("country ~ '^[A-Z]{2}$'", name="country_iso2"),
        UniqueConstraint("hs_code", "country", "valid_from", name="hs_country_from"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    hs_code: Mapped[str] = mapped_column(ForeignKey("hs_codes.code"), index=True)
    country: Mapped[str] = mapped_column(String(2))  # ISO-2 nước EU
    vat_rate: Mapped[Decimal] = mapped_column(Numeric(7, 4))
    label_languages: Mapped[str | None] = mapped_column(String(64))
    note: Mapped[str | None] = mapped_column(Text)
    note_en: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str | None] = mapped_column(Text)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    valid_from: Mapped[dt.date] = mapped_column(Date)
    valid_until: Mapped[dt.date | None] = mapped_column(Date)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()")
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 4: Migration**

`backend/alembic/versions/0028_import_country_terms.py`:

```python
"""import_country_terms: VAT nhập khẩu và lưu ý theo (mã HS, nước EU)

Revision ID: 0028
Revises: 0027
Create Date: 2026-09-30 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0028"
down_revision: str | None = "0027"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "import_country_terms",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("hs_code", sa.String(length=8), nullable=False),
        sa.Column("country", sa.String(length=2), nullable=False),
        sa.Column("vat_rate", sa.Numeric(precision=7, scale=4), nullable=False),
        sa.Column("label_languages", sa.String(length=64), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("note_en", sa.Text(), nullable=True),
        sa.Column("source", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_until", sa.Date(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "country ~ '^[A-Z]{2}$'", name=op.f("ck_import_country_terms_country_iso2")
        ),
        sa.CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)",
            name=op.f("ck_import_country_terms_reviewed_by_and_at_together"),
        ),
        sa.CheckConstraint(
            "valid_until IS NULL OR valid_until > valid_from",
            name=op.f("ck_import_country_terms_valid_window"),
        ),
        sa.CheckConstraint(
            "vat_rate BETWEEN 0 AND 100", name=op.f("ck_import_country_terms_vat_is_percentage")
        ),
        sa.ForeignKeyConstraint(
            ["hs_code"], ["hs_codes.code"], name=op.f("fk_import_country_terms_hs_code_hs_codes")
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"], ["users.id"], name=op.f("fk_import_country_terms_reviewed_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_import_country_terms")),
        sa.UniqueConstraint(
            "hs_code", "country", "valid_from", name=op.f("uq_import_country_terms_hs_country_from")
        ),
    )
    op.create_index(
        op.f("ix_import_country_terms_hs_code"), "import_country_terms", ["hs_code"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_import_country_terms_hs_code"), table_name="import_country_terms")
    op.drop_table("import_country_terms")
```

- [ ] **Step 5: Kiểm migration khớp model**

Run: `cd backend && uv run alembic upgrade head && uv run alembic check`
Expected: `No new upgrade operations detected.` Nếu Alembic báo khác biệt (tên ràng buộc/chỉ mục), sửa migration cho khớp model (đọc kỹ kết quả `uv run alembic revision --autogenerate -m tmp` rồi xóa file tạm).

- [ ] **Step 6: Schema admin**

Trong `admin_schemas.py` thêm (dùng lại `_percentage`, `_RATE`, `_hs`, `Text`, `EU_MEMBERS`):

```python
def _eu_country(value: str) -> str:
    upper = value.strip().upper()
    if upper not in EU_MEMBERS:
        raise ValueError("country must be an EU member state (ISO 3166-1 alpha-2)")
    return upper


class CountryTermIn(BaseModel):
    hs_code: str
    country: str
    vat_rate: Decimal
    label_languages: Annotated[str | None, Field(max_length=64)] = None
    note: Text = None
    note_en: Text = None
    source: Text = None
    valid_from: dt.date
    valid_until: dt.date | None = None

    _hs_code = field_validator("hs_code")(_hs)
    _country = field_validator("country")(_eu_country)

    @field_validator("vat_rate", mode="before")
    @classmethod
    def _vat(cls, value: Any) -> Decimal:
        parsed = _percentage(value, _RATE)
        if parsed is None:
            raise ValueError("vat_rate is required")
        return parsed


class CountryTermPatch(BaseModel):
    hs_code: str | None = None
    country: str | None = None
    vat_rate: Decimal | None = None
    label_languages: Annotated[str | None, Field(max_length=64)] = None
    note: Text = None
    note_en: Text = None
    source: Text = None
    valid_from: dt.date | None = None
    valid_until: dt.date | None = None

    @field_validator("hs_code")
    @classmethod
    def _hs_code(cls, value: str | None) -> str | None:
        return None if value is None else _hs(value)

    @field_validator("country")
    @classmethod
    def _country(cls, value: str | None) -> str | None:
        return None if value is None else _eu_country(value)

    @field_validator("vat_rate", mode="before")
    @classmethod
    def _vat(cls, value: Any) -> Decimal | None:
        return _percentage(value, _RATE)


class CountryTermOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    hs_code: str
    country: str
    vat_rate: Decimal
    label_languages: str | None
    note: str | None
    note_en: str | None
    source: str | None
    valid_from: dt.date
    valid_until: dt.date | None
    reviewed_by: uuid.UUID | None
    reviewed_at: dt.datetime | None
```

- [ ] **Step 7: Service admin + `find_terms`**

Trong `admin_service.py`: đổi import model thành `from app.modules.compliance.models import ImportCountryTerm, ProductSpecificRule, RuleType, TariffLine`, import thêm `CountryTermIn, CountryTermPatch` từ `admin_schemas`, đổi **mọi** ràng buộc generic `[Row: (TariffLine, ProductSpecificRule)]` thành `[Row: (TariffLine, ProductSpecificRule, ImportCountryTerm)]` (7 chỗ: `_snapshot`, `_get`, `_save`, `_create`, `_update`, `_review`, `_delete`), thêm `TERM_ENTITY = "country_term"` cạnh `TARIFF_ENTITY`, rồi thêm cuối file:

```python
# ── VAT theo nước ───────────────────────────────────────────────────────────
async def list_country_terms(
    session: AsyncSession, hs_code: str | None, reviewed: bool | None
) -> list[ImportCountryTerm]:
    query = _apply_filters(select(ImportCountryTerm), ImportCountryTerm, hs_code, reviewed)
    return list(await session.scalars(query))


async def _require_free_key(
    session: AsyncSession,
    hs_code: str,
    country: str,
    valid_from: dt.date,
    ignore_id: uuid.UUID | None = None,
) -> None:
    query = select(ImportCountryTerm.id).where(
        ImportCountryTerm.hs_code == hs_code,
        ImportCountryTerm.country == country,
        ImportCountryTerm.valid_from == valid_from,
    )
    existing = await session.scalar(query)
    if existing is not None and existing != ignore_id:
        raise AppError("duplicate_term", "This HS code, country and start date already exist", 409)


async def create_country_term(
    session: AsyncSession, actor: CurrentUser, data: CountryTermIn, commit: bool = True
) -> ImportCountryTerm:
    await _require_hs(session, data.hs_code)
    _check_window(data.valid_from, data.valid_until)
    await _require_free_key(session, data.hs_code, data.country, data.valid_from)
    return await _create(session, actor, ImportCountryTerm(**data.model_dump()), TERM_ENTITY, commit)


async def update_country_term(
    session: AsyncSession,
    actor: CurrentUser,
    term_id: uuid.UUID,
    patch: CountryTermPatch,
    commit: bool = True,
) -> ImportCountryTerm:
    term = await _get(session, ImportCountryTerm, term_id)
    fields = patch.model_fields_set
    required = {"hs_code", "country", "vat_rate", "valid_from"} & fields
    if any(getattr(patch, name) is None for name in required):
        raise AppError("invalid_patch", "Required fields cannot be null", 422)
    if patch.hs_code is not None:
        await _require_hs(session, patch.hs_code)
    valid_from = patch.valid_from if "valid_from" in fields and patch.valid_from else term.valid_from
    _check_window(valid_from, patch.valid_until if "valid_until" in fields else term.valid_until)
    await _require_free_key(
        session,
        patch.hs_code or term.hs_code,
        patch.country or term.country,
        valid_from,
        ignore_id=term.id,
    )
    return await _update(session, actor, term, patch, TERM_ENTITY, commit)


async def review_country_term(
    session: AsyncSession, actor: CurrentUser, term_id: uuid.UUID
) -> ImportCountryTerm:
    return await _review(session, actor, await _get(session, ImportCountryTerm, term_id), TERM_ENTITY)


async def delete_country_term(session: AsyncSession, actor: CurrentUser, term_id: uuid.UUID) -> None:
    await _delete(session, actor, await _get(session, ImportCountryTerm, term_id), TERM_ENTITY)
```

Trong `service.py`, thêm `ImportCountryTerm` vào import model, và thêm sau `find_rules`:

```python
def _reviewed_terms(hs_code: str, on_date: dt.date) -> Select[Any]:
    """Dòng VAT ĐÃ DUYỆT và đang hiệu lực vào `on_date`."""
    return select(ImportCountryTerm).where(
        ImportCountryTerm.reviewed_by.is_not(None),
        ImportCountryTerm.hs_code == hs_code,
        ImportCountryTerm.valid_from <= on_date,
        or_(ImportCountryTerm.valid_until.is_(None), ImportCountryTerm.valid_until > on_date),
    )


async def find_terms(
    session: AsyncSession, hs_code: str, on_date: dt.date
) -> list[ImportCountryTerm]:
    """Dòng VAT theo nước đã duyệt cho `hs_code` (mã chính xác của dòng thuế đã khớp)."""
    return list(await session.scalars(_reviewed_terms(hs_code, on_date).order_by(ImportCountryTerm.country)))
```

- [ ] **Step 8: Router**

Trong `router.py`, import `CountryTermIn, CountryTermOut, CountryTermPatch` từ `admin_schemas` rồi thêm cạnh nhóm admin:

```python
@router.get("/api/admin/country-terms")
async def list_country_terms(
    _: Admin, session: DB, hs_code: str | None = None, reviewed: bool | None = None
) -> list[CountryTermOut]:
    rows = await admin_service.list_country_terms(session, hs_code, reviewed)
    return [CountryTermOut.model_validate(r) for r in rows]


@router.post("/api/admin/country-terms", status_code=201)
async def create_country_term(data: CountryTermIn, admin: Admin, session: DB) -> CountryTermOut:
    return CountryTermOut.model_validate(
        await admin_service.create_country_term(session, admin, data)
    )


@router.patch("/api/admin/country-terms/{term_id}")
async def update_country_term(
    term_id: uuid.UUID, data: CountryTermPatch, admin: Admin, session: DB
) -> CountryTermOut:
    row = await admin_service.update_country_term(session, admin, term_id, data)
    return CountryTermOut.model_validate(row)


@router.post("/api/admin/country-terms/{term_id}/review")
async def review_country_term(term_id: uuid.UUID, admin: Admin, session: DB) -> CountryTermOut:
    return CountryTermOut.model_validate(
        await admin_service.review_country_term(session, admin, term_id)
    )


@router.delete("/api/admin/country-terms/{term_id}", status_code=204)
async def delete_country_term(term_id: uuid.UUID, admin: Admin, session: DB) -> Response:
    await admin_service.delete_country_term(session, admin, term_id)
    return Response(status_code=204)
```

- [ ] **Step 9: Chạy test, lint, mypy**

Run: `cd backend && uv run pytest app/modules/compliance -q && uv run ruff check . && uv run ruff format --check . && uv run mypy app`
Expected: PASS; ruff và mypy sạch (chạy `uv run ruff format .` nếu chỉ lệch định dạng).

- [ ] **Step 10: Commit**

```bash
git add backend/alembic/versions/0028_import_country_terms.py backend/app/modules/compliance
git commit -m "Thị trường EU: bảng import_country_terms (migration 0028) và API admin duyệt VAT theo nước"
```

---

### Task 4: Endpoint công khai `POST /api/public/markets`

**Files:**
- Modify: `backend/app/modules/compliance/schemas.py`, `service.py`, `router.py`
- Test: `backend/app/modules/compliance/tests/test_markets_api.py`

**Interfaces:**
- Consumes: `lookup_lines` (Task 1), `find_terms` (Task 3), `rank_markets`/`CountryTerms` (Task 2), `log_check`.
- Produces: `schemas.MarketsIn`, `MarketRowOut`, `MarketsOut`; `service.rank_markets_for(session, data: MarketsIn, user: CurrentUser | None) -> MarketsOut`; `service._line_data(line: TariffLine) -> TariffLineData`.

- [ ] **Step 1: Viết test lỗi**

`backend/app/modules/compliance/tests/test_markets_api.py`:

```python
"""POST /api/public/markets. Thuế/VAT trong test là SYNTHETIC theo ca golden của file Excel."""

import datetime as dt
import uuid
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.schemas import HsCodeIn
from app.modules.catalog.service import upsert_hs_codes
from app.modules.compliance.models import (
    ComplianceCheck,
    DutyType,
    ImportCountryTerm,
    TariffLine,
)

pytestmark = pytest.mark.usefixtures("hs_seeded")

URL = "/api/public/markets"
CODE = "03061792"
TODAY = dt.datetime.now(dt.UTC).date()
FROM = TODAY - dt.timedelta(days=30)
NUMBERS = ("rank", "duty", "vat_rate", "vat", "total")


def body(**over: Any) -> dict[str, Any]:
    b: dict[str, Any] = {"hs_code": CODE, "product_value": "100000.00", "roo_status": "pass"}
    b.update(over)
    return b


async def seed(
    session: AsyncSession,
    reviewer: uuid.UUID | None,
    *,
    vat: dict[str, str] | None = None,
    **line_over: Any,
) -> None:
    await upsert_hs_codes(
        session,
        [
            HsCodeIn(
                code=CODE,
                name_vi="Tôm",
                name_en="Shrimp",
                category="seafood",
                is_calculator_supported=True,
            )
        ],
    )
    stamp = {"reviewed_by": reviewer, "reviewed_at": dt.datetime.now(dt.UTC)} if reviewer else {}
    fields: dict[str, Any] = {
        "hs_code": CODE,
        "destination": "EU",
        "duty_type": DutyType.ad_valorem,
        "mfn_rate": Decimal("12"),
        "evfta_rate_current": Decimal("0"),
        "valid_from": FROM,
    }
    session.add(TariffLine(**{**fields, **stamp, **line_over}))
    for country, rate in (vat or {"DE": "7", "FR": "5.5", "NL": "9"}).items():
        session.add(
            ImportCountryTerm(
                hs_code=CODE,
                country=country,
                vat_rate=Decimal(rate),
                label_languages=country.lower(),
                valid_from=FROM,
                **stamp,
            )
        )
    await session.flush()


async def checks(session: AsyncSession) -> int:
    return int(await session.scalar(select(func.count()).select_from(ComplianceCheck)) or 0)


async def test_golden_with_and_without_certificate(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await seed(db_session, reviewer_id)
    d = (await api_client.post(URL, json=body())).json()
    assert (d["status"], d["basis"], d["hs_formatted"]) == ("ok", "evfta", "0306.17.92")
    assert [(r["country"], r["total"]) for r in d["rows"][:3]] == [
        ("FR", "5500.00"),
        ("DE", "7000.00"),
        ("NL", "9000.00"),
    ]
    d = (await api_client.post(URL, json=body(roo_status="fail"))).json()
    assert d["basis"] == "mfn"
    assert {r["country"]: r["total"] for r in d["rows"][:3]} == {
        "DE": "19840.00",
        "FR": "18160.00",
        "NL": "22080.00",
    }


async def test_missing_roo_status_uses_mfn(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await seed(db_session, reviewer_id)
    payload = body()
    del payload["roo_status"]
    d = (await api_client.post(URL, json=payload)).json()
    assert d["basis"] == "mfn"


@pytest.mark.parametrize("roo", ["PASS", "maybe", "", 1])
async def test_invalid_roo_status_is_422(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID, roo: Any
) -> None:
    await seed(db_session, reviewer_id)
    assert (await api_client.post(URL, json=body(roo_status=roo))).status_code == 422


async def test_json_number_amount_is_422(api_client: AsyncClient) -> None:
    assert (await api_client.post(URL, json=body(product_value=100000))).status_code == 422


async def test_unreviewed_vat_rows_are_no_data_without_numbers(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await seed(db_session, reviewer_id)
    await db_session.execute(
        ImportCountryTerm.__table__.update()
        .where(ImportCountryTerm.country == "NL")
        .values(reviewed_by=None, reviewed_at=None)
    )
    d = (await api_client.post(URL, json=body())).json()
    nl = next(r for r in d["rows"] if r["country"] == "NL")
    assert nl["status"] == "no_data" and all(nl[k] is None for k in NUMBERS)
    assert len(d["rows"]) == 27


async def test_no_reviewed_terms_gives_only_no_data(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await seed(db_session, reviewer_id, vat={})
    d = (await api_client.post(URL, json=body())).json()
    assert d["status"] == "ok" and {r["status"] for r in d["rows"]} == {"no_data"}


async def test_overlapping_reviewed_vat_rows_make_country_no_data(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await seed(db_session, reviewer_id)
    db_session.add(
        ImportCountryTerm(
            hs_code=CODE,
            country="DE",
            vat_rate=Decimal("19"),
            valid_from=FROM - dt.timedelta(days=10),
            reviewed_by=reviewer_id,
            reviewed_at=dt.datetime.now(dt.UTC),
        )
    )
    await db_session.flush()
    d = (await api_client.post(URL, json=body())).json()
    de = next(r for r in d["rows"] if r["country"] == "DE")
    assert de["status"] == "no_data" and de["total"] is None


async def test_unreviewed_tariff_line_is_unsupported(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await seed(db_session, None)
    d = (await api_client.post(URL, json=body())).json()
    assert (d["status"], d["basis"], d["rows"]) == ("unsupported", None, [])


async def test_hs_outside_catalog_is_unsupported(api_client: AsyncClient) -> None:
    d = (await api_client.post(URL, json=body(hs_code="87032310"))).json()
    assert (d["status"], d["rows"]) == ("unsupported", [])


async def test_quota_line_is_needs_review_without_numbers(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await seed(db_session, reviewer_id, quota_required=True)
    d = (await api_client.post(URL, json=body())).json()
    assert (d["status"], d["rows"], d["duty_rate"]) == ("needs_review", [], None)


async def test_each_call_writes_exactly_one_check(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await seed(db_session, reviewer_id)
    before = await checks(db_session)
    d = (await api_client.post(URL, json=body())).json()
    assert await checks(db_session) == before + 1
    row = (await db_session.execute(select(ComplianceCheck))).scalars().one()
    assert (row.check_type.value, row.destination_country, row.status) == ("tariff", "EU", "ok")
    assert row.savings_amount is None and str(row.id) == d["check_id"]
```

- [ ] **Step 2: Chạy, xác nhận lỗi**

Run: `cd backend && uv run pytest app/modules/compliance/tests/test_markets_api.py -v`
Expected: FAIL (404 vì chưa có route).

- [ ] **Step 3: Schema**

Trong `schemas.py` (cuối phần tariff, sau `TariffOut`), thêm:

```python
class MarketsIn(BaseModel):
    """Số tiền nhận dạng CHUỖI JSON (không nhận số). roo_status lấy từ máy tính xuất xứ."""

    model_config = ConfigDict(strict=True)

    hs_code: Annotated[str, Field(max_length=32)]
    product_value: Decimal
    roo_status: Literal["pass", "fail", "inconclusive"] | None = None

    @field_validator("product_value", mode="before")
    @classmethod
    def _amount(cls, value: Any) -> Decimal:
        return parse_amount(value)


class MarketRowOut(BaseModel):
    country: str
    status: Literal["ranked", "no_data"]
    rank: int | None
    duty: Decimal | None
    vat_rate: Decimal | None
    vat: Decimal | None
    total: Decimal | None
    label_languages: str | None
    note: str | None
    note_en: str | None


class MarketsOut(BaseModel):
    check_id: str
    status: Literal["ok", "unsupported", "needs_review"]
    basis: Literal["evfta", "mfn"] | None
    hs_code: str
    hs_formatted: str
    product_value: Decimal
    duty_rate: Decimal | None
    rows: list[MarketRowOut]
```

- [ ] **Step 4: Service**

Trong `service.py`: import thêm `CountryTerms, rank_markets` từ `calculators` và `MarketsIn, MarketRowOut, MarketsOut` từ `schemas`. Thêm hàm `_line_data` và dùng trong `calculate_tariff` (thay khối `TariffLineData(...)` dựng tại chỗ bằng `None if line is None else _line_data(line)`):

```python
def _line_data(line: TariffLine) -> TariffLineData:
    return TariffLineData(
        duty_type=line.duty_type,
        mfn_rate=line.mfn_rate,
        evfta_rate_current=line.evfta_rate_current,
        quota_required=line.quota_required,
        quota_note=line.quota_note,
        condition_note=line.condition_note,
        quota_note_en=line.quota_note_en,
        condition_note_en=line.condition_note_en,
    )
```

Thêm cuối phần tariff (trước `EU_CUMULATION`):

```python
async def rank_markets_for(
    session: AsyncSession, data: MarketsIn, user: CurrentUser | None
) -> MarketsOut:
    """Xếp hạng nước EU (thuế + VAT nhập khẩu). Mỗi lần gọi ghi ĐÚNG MỘT compliance_checks."""
    code = catalog.normalize_code(data.hs_code)
    if code is None:
        raise AppError("invalid_hs_code", "HS code must be 6 to 8 digits", 422)
    today = dt.datetime.now(dt.UTC).date()
    lines = await lookup_lines(session, code, today)
    line = lines[0] if len(lines) == 1 else None
    terms: list[CountryTerms] = []
    if line is not None:
        found = await find_terms(session, line.hs_code, today)
        # Hai dòng VAT cùng nước đang hiệu lực = dữ liệu mơ hồ → nước đó coi như chưa có dữ liệu.
        ambiguous = {c for c in {t.country for t in found} if sum(t.country == c for t in found) > 1}
        terms = [
            CountryTerms(t.country, t.vat_rate, t.label_languages, t.note, t.note_en)
            for t in found
            if t.country not in ambiguous
        ]
    ranking = rank_markets(
        None if line is None else _line_data(line),
        len(lines),
        data.product_value,
        data.roo_status,
        terms,
    )
    company_id = await companies.get_company_id(session, user.id) if user else None
    ok = ranking.status == "ok" and line is not None
    check = await log_check(
        session,
        check_type=CheckType.tariff,
        hs_code=code,
        destination_country=UNION_DESTINATION,
        status=ranking.status,
        company_id=company_id,
        product_value=data.product_value,
        mfn_duty_rate=line.mfn_rate if ok and line is not None else None,
        evfta_duty_rate=line.evfta_rate_current if ok and line is not None else None,
        tariff_line_id=line.id if line is not None else None,
    )
    await session.commit()
    return MarketsOut(
        check_id=str(check.id),
        status=ranking.status,
        basis=ranking.basis,
        hs_code=code,
        hs_formatted=catalog.format_code(code),
        product_value=data.product_value,
        duty_rate=ranking.duty_rate,
        rows=[MarketRowOut(**row.__dict__) for row in ranking.rows],
    )
```

- [ ] **Step 5: Router**

Trong `router.py`, import `MarketsIn, MarketsOut` từ `schemas`, thêm sau `calculate_roo`:

```python
@router.post("/api/public/markets")
async def rank_markets(
    data: MarketsIn,
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MarketsOut:
    return await service.rank_markets_for(session, data, user)
```

- [ ] **Step 6: Xác nhận rate limit phủ route mới**

Run: `cd backend && grep -rn "api/public" app/core app/main.py | head`
Expected: cấu hình rate limit áp theo tiền tố `/api/public/` (hoặc danh sách route). Nếu là danh sách route tường minh, thêm `/api/public/markets` vào đó và thêm một test cùng kiểu với test rate limit hiện có của `/api/public/tariff`.

- [ ] **Step 7: Chạy test, lint, mypy**

Run: `cd backend && uv run pytest app/modules/compliance -q && uv run ruff check . && uv run ruff format --check . && uv run mypy app`
Expected: PASS, sạch.

- [ ] **Step 8: Commit**

```bash
git add backend/app/modules/compliance
git commit -m "Thị trường EU: POST /api/public/markets xếp hạng nước EU theo thuế + VAT"
```

---

### Task 5: Nạp file Excel đã xác minh (chưa duyệt)

**Files:**
- Create: `backend/data/compliance/EVFTA_20_ma_da_xac_minh.xlsx` (sao chép từ `C:\Users\DELL\Downloads\EVFTA_20_ma_da_xac_minh (1).xlsx`), `backend/scripts/verified_pack.py`, `backend/scripts/import_verified_pack.py`
- Test: `backend/app/modules/compliance/tests/test_verified_pack.py`

**Interfaces:**
- Consumes: `TariffLineIn`, `RooRuleIn`, `CountryTermIn`, `HsCodeIn`, `import_compliance_data.import_tariff/import_psr` (`(session, actor_email, rows: Sequence[tuple[int, Model]], dry_run) -> tuple[int, int]`), `admin_service.create_country_term`.
- Produces: `verified_pack.load_pack(path: Path = DEFAULT_XLSX) -> Pack`; `Pack(year: int, rows: list[PackRow], terms: list[TermRow])`; `PackRow(cn_code, group, name_vi, name_en, category, mfn_rate: str, evfta_rate: str, staging: str, zero_from: dt.date, rule_text: str, requires_expert: bool, note: str | None)`; `TermRow(cn_code, country, vat_rate: str, label_languages: str, note: str | None)`; `verified_pack.hs_rows(pack) -> list[HsCodeIn]`, `tariff_rows(pack)`, `psr_rows(pack)`, `term_rows(pack)` (danh sách `(số dòng, model)`); `import_verified_pack.import_terms(session, actor_email, rows, dry_run) -> tuple[int, int]` và `import_pack(session, actor_email, pack, dry_run) -> dict[str, tuple[int, int]]`.

- [ ] **Step 1: Đưa file nguồn vào repo và kiểm openpyxl**

Run:
```bash
cd backend && mkdir -p data/compliance && cp "/c/Users/DELL/Downloads/EVFTA_20_ma_da_xac_minh (1).xlsx" data/compliance/EVFTA_20_ma_da_xac_minh.xlsx && uv run python -c "import openpyxl; print(openpyxl.__version__)"
```
Expected: in ra phiên bản (≥ 3.1.5).

- [ ] **Step 2: Viết test lỗi**

`backend/app/modules/compliance/tests/test_verified_pack.py`:

```python
"""File EVFTA_20_ma_da_xac_minh.xlsx → dòng dữ liệu → DB (luôn CHƯA DUYỆT)."""

import datetime as dt

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.service import upsert_hs_codes
from app.modules.compliance.models import ImportCountryTerm, ProductSpecificRule, TariffLine
from app.modules.compliance.service import find_lines, find_rules, find_terms
from scripts.import_verified_pack import import_pack
from scripts.verified_pack import hs_rows, load_pack, psr_rows, tariff_rows, term_rows

ADMIN = "luat-tm@evfta.eu"
TODAY = dt.datetime.now(dt.UTC).date()
WHOLLY_OBTAINED = {"03061792", "03061799", "03032400", "03077100"}


def test_pack_shape() -> None:
    pack = load_pack()
    assert (pack.year, len(pack.rows), len(pack.terms)) == (2026, 20, 60)
    assert len({r.cn_code for r in pack.rows}) == 20 and all(len(r.cn_code) == 8 for r in pack.rows)
    assert {t.country for t in pack.terms} == {"DE", "FR", "NL"}


def test_tariff_rows_match_excel() -> None:
    by_code = {d.hs_code: d for _, d in tariff_rows(load_pack())}
    shrimp = by_code["03061792"]
    assert (str(shrimp.mfn_rate), str(shrimp.evfta_rate_current), shrimp.staging_category) == (
        "12.000",
        "0",
        "A",
    )
    assert shrimp.valid_from == dt.date(2020, 8, 1) == shrimp.zero_from
    assert str(by_code["03046200"].mfn_rate) == "5.500" and by_code["03046200"].zero_from == dt.date(2023, 1, 1)
    assert (str(by_code["08109075"].mfn_rate), str(by_code["08109020"].mfn_rate)) == ("8.800", "0")
    assert all(d.destination == "EU" and not d.quota_required for d in by_code.values())


def test_roo_mapping_is_conservative() -> None:
    rules = {d.hs_code: d for _, d in psr_rows(load_pack())}
    assert {c for c, d in rules.items() if not d.requires_expert} == WHOLLY_OBTAINED
    assert all(d.rule_type.value == "WO" and d.rule_text for d in rules.values())
    assert rules["03034290"].requires_expert  # điều kiện tàu chưa mô hình hoá
    assert "sugar" in (rules["08106000"].rule_text or "")


def test_vat_terms_match_excel() -> None:
    terms = {(d.hs_code, d.country): d for _, d in term_rows(load_pack())}
    assert [str(terms[("03061792", c)].vat_rate) for c in ("DE", "FR", "NL")] == ["7", "5.5", "9"]
    assert terms[("03061792", "FR")].label_languages == "fr"


@pytest.fixture
async def packed(db_session: AsyncSession, reviewer_id: object) -> AsyncSession:
    return db_session


async def count(session: AsyncSession, model: type) -> int:
    return int(await session.scalar(select(func.count()).select_from(model)) or 0)


async def test_import_is_unreviewed_and_hidden(packed: AsyncSession) -> None:
    report = await import_pack(packed, ADMIN, load_pack(), dry_run=False)
    assert report == {"tariff": (20, 0), "psr": (20, 0), "terms": (60, 0)}
    unreviewed = (TariffLine, ProductSpecificRule, ImportCountryTerm)
    for model in unreviewed:
        assert await packed.scalar(
            select(func.count()).select_from(model).where(model.reviewed_by.is_not(None))
        ) == 0
    assert await find_lines(packed, "03061792", "EU", TODAY) == []
    assert await find_rules(packed, "03061792", TODAY) == []
    assert await find_terms(packed, "03061792", TODAY) == []


async def test_rerun_adds_nothing_and_dry_run_writes_nothing(packed: AsyncSession) -> None:
    pack = load_pack()
    await import_pack(packed, ADMIN, pack, dry_run=True)
    assert await count(packed, TariffLine) == 0 and await count(packed, ImportCountryTerm) == 0
    await import_pack(packed, ADMIN, pack, dry_run=False)
    again = await import_pack(packed, ADMIN, pack, dry_run=False)
    assert again == {"tariff": (0, 20), "psr": (0, 20), "terms": (0, 60)}
    assert await count(packed, TariffLine) == 20 and await count(packed, ImportCountryTerm) == 60


async def test_hs_catalog_gets_the_twenty_codes(packed: AsyncSession) -> None:
    rows = hs_rows(load_pack())
    assert len(rows) == 20 and all(r.is_calculator_supported for r in rows)
    await upsert_hs_codes(packed, rows)
    await upsert_hs_codes(packed, rows)  # chạy lại không trùng
```

Ghi chú: các test DB dùng fixture `reviewer_id` (tạo admin `luat-tm@evfta.eu`) từ `conftest.py`; **không** dùng `hs_seeded` ở file này vì `import_pack` tự nạp 20 mã 8 số vào `hs_codes`; nếu ràng buộc khóa ngoại cần 30 mã 6 số cũ thì không liên quan tới file này.

- [ ] **Step 3: Chạy, xác nhận lỗi**

Run: `cd backend && uv run pytest app/modules/compliance/tests/test_verified_pack.py -v`
Expected: FAIL với `ModuleNotFoundError: scripts.verified_pack`.

- [ ] **Step 4: Cài đặt `verified_pack.py` (đọc file, hàm thuần)**

`backend/scripts/verified_pack.py`:

```python
"""Đọc EVFTA_20_ma_da_xac_minh.xlsx thành dòng dữ liệu. Hàm thuần: không đụng DB.

Quy đổi RoO (đã chốt với người dùng): dòng 'All fish and crustaceans… wholly obtained' không kèm
điều kiện tàu → WO, không cần chuyên gia. Mọi dòng khác (nguyên liệu Chương X thuần tuý, dung sai,
ngưỡng đường, điều kiện tàu) chưa có loại quy tắc tương ứng → WO + requires_expert=true (máy tính
luôn 'chưa kết luận'), nguyên văn Annex II nằm ở rule_text. Không đoán, không tự duyệt.
"""

import datetime as dt
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Any

import openpyxl

from app.modules.catalog.schemas import HsCodeIn
from app.modules.compliance.admin_schemas import CountryTermIn, RooRuleIn, TariffLineIn
from app.modules.compliance.models import DutyType, RuleType

DEFAULT_XLSX = Path(__file__).resolve().parents[1] / "data" / "compliance" / "EVFTA_20_ma_da_xac_minh.xlsx"
SHEET_CODES, SHEET_VAT, SHEET_PARAMS = "20 ma da xac minh", "3 nuoc DE-FR-NL", "Tham so"
# Ngày thuế EVFTA về 0% theo bảng lộ trình ở sheet 'Tham so' (A: 1/8/2020, B3: 1/1/2023 …).
ZERO_FROM = {
    "A": dt.date(2020, 8, 1),
    "B3": dt.date(2023, 1, 1),
    "B5": dt.date(2025, 1, 1),
    "B7": dt.date(2027, 1, 1),
}
RULE_SOURCE = "EVFTA Nghị định thư 1, Annex II (file EVFTA_20_ma_da_xac_minh.xlsx)"
VAT_SOURCE = (
    "File EVFTA_20_ma_da_xac_minh.xlsx, sheet 'Tham so' (VAT thực phẩm); nguồn thứ cấp, "
    "cần đối chiếu TEDB của Uỷ ban châu Âu trước go-live"
)
VAT_COLUMNS = {"DE": ("VAT DE", "de"), "FR": ("VAT FR", "fr"), "NL": ("VAT NL", "nl")}
CATEGORY = {"Thuỷ sản": "seafood", "Rau, nấm": "agriculture", "Trái cây": "agriculture",
            "Tham chiếu 0%": "agriculture"}  # fmt: skip
# Tên tiếng Anh chỉ để tìm kiếm trong danh mục, không phải câu chữ pháp lý.
EN_NAMES = {
    "03061792": "Frozen shrimps and prawns, genus Penaeus",
    "03061799": "Frozen shrimps and prawns, other",
    "03046200": "Frozen fillets of catfish (Pangasius spp.)",
    "03043200": "Fresh or chilled fillets of catfish (Pangasius spp.)",
    "03032400": "Frozen catfish (Pangasius spp.), whole",
    "03048700": "Frozen fillets of tunas",
    "03034290": "Frozen yellowfin tunas, whole",
    "03077100": "Live, fresh or chilled clams, cockles and ark shells",
    "07123200": "Dried wood ears (Auricularia spp.)",
    "07123900": "Other dried mushrooms and truffles",
    "07108069": "Frozen mushrooms, other",
    "07108095": "Frozen vegetables, other",
    "07096099": "Fresh peppers of the genus Capsicum or Pimenta, other",
    "08106000": "Durians, fresh",
    "08109075": "Other fresh fruit (longan, rambutan and similar)",
    "08119085": "Frozen tropical fruit, without added sugar",
    "08043000": "Pineapples, fresh or dried",
    "08055090": "Limes, fresh or dried",
    "08013200": "Cashew nuts, shelled",
    "08109020": "Fresh pitahaya, lychees, passion fruit, jackfruit, carambola",
}  # fmt: skip
WHOLLY_OBTAINED = "All fish and crustaceans"
VESSEL_MARKER = "điều kiện tàu"


@dataclass(frozen=True)
class PackRow:
    cn_code: str
    group: str
    name_vi: str
    name_en: str
    category: str
    mfn_rate: str  # %
    evfta_rate: str  # %
    staging: str
    zero_from: dt.date
    rule_text: str
    requires_expert: bool
    note: str | None


@dataclass(frozen=True)
class TermRow:
    cn_code: str
    country: str
    vat_rate: str  # %
    label_languages: str
    note: str | None


@dataclass(frozen=True)
class Pack:
    year: int
    rows: list[PackRow]
    terms: list[TermRow]


def _pct(value: Any) -> str:
    """0.055 → '5.5', 0 → '0' (Decimal từ chuỗi, không qua phép tính float)."""
    return format((Decimal(str(value)) * 100).normalize(), "f")


def _text(value: Any) -> str | None:
    return str(value).strip() or None if value is not None else None


def _table(ws: Any) -> list[dict[str, Any]]:
    header = [str(c).strip() if c is not None else "" for c in next(ws.iter_rows(max_row=1, values_only=True))]
    rows = []
    for values in ws.iter_rows(min_row=2, values_only=True):
        row = dict(zip(header, values, strict=False))
        if row.get(header[1]) is not None and str(values[0] or "").strip().isdigit():
            rows.append(row)
    return rows


def _year(ws: Any) -> int:
    for label, value, *_ in ws.iter_rows(values_only=True):
        if label == "Năm tính thuế EVFTA":
            return int(value)
    raise ValueError("thiếu 'Năm tính thuế EVFTA' ở sheet Tham so")


def load_pack(path: Path = DEFAULT_XLSX) -> Pack:
    wb = openpyxl.load_workbook(path, data_only=True)
    year = _year(wb[SHEET_PARAMS])
    vat_by_code = {str(r["Mã CN"]): r for r in _table(wb[SHEET_VAT])}
    rows: list[PackRow] = []
    terms: list[TermRow] = []
    for r in _table(wb[SHEET_CODES]):
        code = str(r["Mã CN (biểu EVFTA)"])
        staging = str(r["Nhóm lộ trình EVFTA"]).strip()
        if staging not in ZERO_FROM:
            raise ValueError(f"{code}: nhóm lộ trình lạ '{staging}'")
        rule_text = str(r["Quy tắc xuất xứ – nguyên văn Annex II"]).strip()
        logic = str(r["Loại logic cho máy tính RoO"])
        wholly = rule_text.startswith(WHOLLY_OBTAINED) and VESSEL_MARKER not in logic
        rows.append(
            PackRow(
                cn_code=code,
                group=str(r["Nhóm"]).strip(),
                name_vi=str(r["Mô tả"]).strip(),
                name_en=EN_NAMES[code],
                category=CATEGORY[str(r["Nhóm"]).strip()],
                mfn_rate=_pct(r["Thuế cơ sở / MFN tham chiếu"]),
                evfta_rate=_pct(r["Thuế EVFTA năm tính"]),
                staging=staging,
                zero_from=ZERO_FROM[staging],
                rule_text=rule_text,
                requires_expert=not wholly,
                note=_text(r.get("Ghi chú")),
            )
        )
        vat = vat_by_code[code]
        for country, (column, language) in VAT_COLUMNS.items():
            terms.append(
                TermRow(code, country, _pct(vat[column]), language, _text(vat.get("Khác biệt quốc gia cần lưu ý")))
            )
    return Pack(year, rows, terms)


def hs_rows(pack: Pack) -> list[HsCodeIn]:
    return [
        HsCodeIn(
            code=r.cn_code,
            name_vi=r.name_vi[:255],
            name_en=r.name_en,
            category=r.category,  # type: ignore[arg-type]
            is_calculator_supported=True,
        )
        for r in pack.rows
    ]


def tariff_rows(pack: Pack) -> list[tuple[int, TariffLineIn]]:
    return [
        (
            n,
            TariffLineIn(
                hs_code=r.cn_code,
                destination="EU",
                duty_type=DutyType.ad_valorem,
                mfn_rate=r.mfn_rate,  # type: ignore[arg-type]
                evfta_rate_current=r.evfta_rate,  # type: ignore[arg-type]
                staging_category=r.staging,
                zero_from=r.zero_from,
                quota_required=False,
                condition_note=r.note,
                valid_from=r.zero_from,
            ),
        )
        for n, r in enumerate(pack.rows, start=2)
    ]


def psr_rows(pack: Pack) -> list[tuple[int, RooRuleIn]]:
    return [
        (
            n,
            RooRuleIn(
                hs_code=r.cn_code,
                rule_type=RuleType.WO,
                rule_text=r.rule_text,
                requires_expert=r.requires_expert,
                source=RULE_SOURCE,
                valid_from=dt.date(2020, 8, 1),
            ),
        )
        for n, r in enumerate(pack.rows, start=2)
    ]


def term_rows(pack: Pack) -> list[tuple[int, CountryTermIn]]:
    return [
        (
            n,
            CountryTermIn(
                hs_code=t.cn_code,
                country=t.country,
                vat_rate=t.vat_rate,  # type: ignore[arg-type]
                label_languages=t.label_languages,
                note=t.note,
                source=VAT_SOURCE,
                valid_from=dt.date(pack.year, 1, 1),
            ),
        )
        for n, t in enumerate(pack.terms, start=2)
    ]
```

Ghi chú: tên cột trong `_table` được lấy từ dòng tiêu đề (đã đọc ở giai đoạn thiết kế: `Mã CN (biểu EVFTA)`, `Nhóm`, `Mô tả`, `Thuế cơ sở / MFN tham chiếu`, `Nhóm lộ trình EVFTA`, `Thuế EVFTA năm tính`, `Quy tắc xuất xứ – nguyên văn Annex II`, `Loại logic cho máy tính RoO`, `Ghi chú`; sheet VAT có `Mã CN`, `VAT DE/FR/NL`, `Khác biệt quốc gia cần lưu ý`). `_table` chỉ giữ dòng có cột STT là số. Nếu test báo `KeyError`, in `list(ws.iter_rows(max_row=1, values_only=True))` để đối chiếu đúng chữ tiêu đề rồi sửa hằng cho khớp; không sửa file Excel.

- [ ] **Step 5: Cài đặt `import_verified_pack.py` (ghi DB)**

`backend/scripts/import_verified_pack.py`:

```python
"""Nạp file EVFTA_20_ma_da_xac_minh.xlsx vào DB — luôn CHƯA DUYỆT.

    uv run python -m scripts.import_verified_pack --actor <email admin> [--dry-run] [--file <xlsx>]

Nạp: 20 mã CN 8 số vào danh mục HS, 20 dòng thuế, 20 quy tắc xuất xứ, 60 dòng VAT (DE/FR/NL).
Admin phải duyệt từng nhóm trong màn hình quản trị thì dữ liệu mới ra công khai. Chạy lại không
nhân đôi dòng (bỏ qua dòng đã có). Ghi qua compliance.admin_service nên có kiểm tra chéo và audit.
"""

import argparse
import asyncio
import sys
from collections.abc import Sequence
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_sessionmaker
from app.core.errors import AppError
from app.modules.auth.service import get_admin_by_email
from app.modules.catalog.service import upsert_hs_codes
from app.modules.compliance import admin_service
from app.modules.compliance.admin_schemas import CountryTermIn
from app.modules.compliance.models import ImportCountryTerm
from scripts._console import use_utf8
from scripts.import_compliance_data import import_psr, import_tariff
from scripts.verified_pack import (
    DEFAULT_XLSX,
    Pack,
    hs_rows,
    load_pack,
    psr_rows,
    tariff_rows,
    term_rows,
)


async def import_terms(
    session: AsyncSession,
    actor_email: str,
    rows: Sequence[tuple[int, CountryTermIn]],
    dry_run: bool,
) -> tuple[int, int]:
    actor = await get_admin_by_email(session, actor_email)
    if actor is None:
        raise ValueError(f"không có tài khoản admin {actor_email}")
    added = skipped = 0
    for line_no, data in rows:
        exists = await session.scalar(
            select(ImportCountryTerm.id).where(
                ImportCountryTerm.hs_code == data.hs_code,
                ImportCountryTerm.country == data.country,
                ImportCountryTerm.valid_from == data.valid_from,
            )
        )
        if exists:
            skipped += 1
            continue
        try:
            await admin_service.create_country_term(session, actor, data, commit=False)
        except AppError as exc:
            await session.rollback()
            raise ValueError(f"dòng {line_no}: {exc.message}") from exc
        added += 1
    await (session.rollback() if dry_run else session.commit())
    return added, skipped


async def import_pack(
    session: AsyncSession, actor_email: str, pack: Pack, dry_run: bool
) -> dict[str, tuple[int, int]]:
    if dry_run:
        # Không ghi gì, kể cả danh mục HS (upsert_hs_codes luôn commit): chỉ đếm dòng dữ liệu hợp lệ,
        # schema đã kiểm khi dựng các dòng.
        return {
            "tariff": (len(tariff_rows(pack)), 0),
            "psr": (len(psr_rows(pack)), 0),
            "terms": (len(term_rows(pack)), 0),
        }
    await upsert_hs_codes(session, hs_rows(pack))  # danh mục HS phải có trước (khóa ngoại)
    return {
        "tariff": await import_tariff(session, actor_email, tariff_rows(pack), False),
        "psr": await import_psr(session, actor_email, psr_rows(pack), False),
        "terms": await import_terms(session, actor_email, term_rows(pack), False),
    }


Phần còn lại của file (CLI):

```python
async def _run(path: Path, actor: str, dry_run: bool) -> dict[str, tuple[int, int]]:
    async with get_sessionmaker()() as session:
        return await import_pack(session, actor, load_pack(path), dry_run)


def main(argv: Sequence[str] | None = None) -> int:
    use_utf8()
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("--actor", required=True, help="email admin thực hiện (ghi audit)")
    parser.add_argument("--file", type=Path, default=DEFAULT_XLSX)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(list(sys.argv[1:] if argv is None else argv))
    if not args.file.is_file():
        print(f"Không tìm thấy file: {args.file}", file=sys.stderr)
        return 1
    try:
        report = asyncio.run(_run(args.file, args.actor, args.dry_run))
    except ValueError as exc:
        print(f"Lỗi dữ liệu: {exc}", file=sys.stderr)
        return 1
    verb = "sẽ thêm" if args.dry_run else "đã thêm"
    for name, (added, skipped) in report.items():
        print(f"{name}: {verb} {added} dòng (chưa duyệt), bỏ qua {skipped} dòng đã có")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

Test `test_rerun_adds_nothing_and_dry_run_writes_nothing` thêm dòng đầu: `dry = await import_pack(packed, ADMIN, pack, dry_run=True)` và `assert dry == {"tariff": (20, 0), "psr": (20, 0), "terms": (60, 0)}` (dry-run chỉ đếm, không ghi).

- [ ] **Step 6: Chạy test**

Run: `cd backend && uv run pytest app/modules/compliance/tests/test_verified_pack.py -v`
Expected: PASS. Nếu `test_import_is_unreviewed_and_hidden` lỗi khóa ngoại do `import_tariff` chạy trước khi `hs_codes` có mã, kiểm `upsert_hs_codes` đã commit trước đó (đúng thiết kế).

- [ ] **Step 7: Lint, mypy, chạy thử CLI ở chế độ dry-run**

Run: `cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy app scripts && uv run python -m scripts.import_verified_pack --actor luat-tm@evfta.eu --dry-run`
Expected: sạch; in `tariff: sẽ thêm 20 …`, `psr: … 20`, `terms: … 60`. **Không** chạy không kèm `--dry-run` trên DB dev/staging khi chưa được người dùng yêu cầu.

- [ ] **Step 8: Commit**

```bash
git add backend/data/compliance backend/scripts backend/app/modules/compliance/tests/test_verified_pack.py
git commit -m "Thị trường EU: nạp file thuế/RoO/VAT đã xác minh (20 mã CN, chưa duyệt)"
```

---

### Task 6: Thị trường xuất khẩu của exporter chỉ là nước EU (backend)

**Files:**
- Modify: `backend/app/modules/companies/schemas.py:20,70,85`
- Modify (test cũ dùng JP/US khi ghi): `backend/app/modules/companies/tests/helpers.py:39`, `test_company_api.py:24,44,50`, `test_list_companies.py:13,19,44`, `test_public_profile.py:70`
- Test: `backend/app/modules/companies/tests/test_export_markets.py`

**Interfaces:**
- Produces: `schemas.ExportMarketCode` — chuỗi `EU` hoặc mã một trong 27 nước EU; dùng cho **ghi** `export_markets` (create/update). `MarketCode` (bộ lọc danh bạ) giữ nguyên để đọc dữ liệu cũ.

- [ ] **Step 1: Viết test lỗi**

`backend/app/modules/companies/tests/test_export_markets.py`:

```python
"""export_markets: ghi mới chỉ nhận EU hoặc nước thành viên EU; dữ liệu cũ vẫn đọc được."""

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.tests.helpers import company_body, login_as

URL = "/api/me/company"


@pytest.mark.parametrize("market", ["US", "JP", "ASEAN", "CN", "GB", "XX", "de"])
async def test_non_eu_market_is_rejected_on_create(api_client: AsyncClient, market: str) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    r = await api_client.post(URL, json=company_body(export_markets=[market]))
    assert r.status_code == 422


@pytest.mark.parametrize("markets", [["EU"], ["DE", "FR", "NL"], ["EU", "IE"]])
async def test_eu_markets_are_accepted(api_client: AsyncClient, markets: list[str]) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    r = await api_client.post(URL, json=company_body(export_markets=markets))
    assert r.status_code == 201, r.text
    assert sorted(r.json()["export_markets"]) == sorted(markets)


async def test_non_eu_market_is_rejected_on_update(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    assert (await api_client.post(URL, json=company_body(export_markets=["DE"]))).status_code == 201
    r = await api_client.patch(URL, json={"export_markets": ["US"]})
    assert r.status_code == 422


async def test_legacy_non_eu_market_survives_unrelated_update(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    created = (await api_client.post(URL, json=company_body(export_markets=["DE"]))).json()
    await db_session.execute(
        text("UPDATE company_export_markets SET market = 'US' WHERE company_id = :c"),
        {"c": created["id"]},
    )
    r = await api_client.patch(URL, json={"description_en": "Still fine."})
    assert r.status_code == 200, r.text
    assert r.json()["export_markets"] == ["US"]
```

- [ ] **Step 2: Chạy, xác nhận lỗi**

Run: `cd backend && uv run pytest app/modules/companies/tests/test_export_markets.py -v`
Expected: FAIL (US/JP/… hiện được nhận).

- [ ] **Step 3: Cài đặt**

Trong `companies/schemas.py`, cạnh dòng 20 (`MarketCode`), thêm (danh sách nước là hằng địa lý, lặp lại có chủ đích để không import `models`/nội bộ của module `compliance`):

```python
# Thị trường xuất khẩu GHI MỚI chỉ gồm EU hoặc một nước thành viên EU (27 nước, ISO-2).
# MarketCode ở trên giữ để ĐỌC/lọc dữ liệu cũ (US, JP…) đã nằm trong DB.
ExportMarketCode = Annotated[
    str,
    StringConstraints(
        pattern=r"^(EU|AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|GR|HU|IE|IT|LV|LT|LU|MT|NL|PL|PT|RO|SK|SI|ES|SE)$"
    ),
]
```

Đổi dòng 70 và 85: `list[MarketCode]` → `list[ExportMarketCode]` (cả `Field(default_factory=list, …)` và `list[ExportMarketCode] | None`). Không đổi `market: MarketCode | None` ở bộ lọc (dòng 130) và các schema Out.

- [ ] **Step 4: Cập nhật test cũ dùng giá trị ghi không phải EU**

Chỉ đổi **dữ liệu đầu vào ghi**, không đổi logic test. Quy ước thay: `JP` → `DE`, `US` → `FR`.
- `helpers.py:39`: `"export_markets": ["EU", "JP"]` → `["EU", "DE"]`.
- `test_company_api.py:24`: `["EU", "JP"]` → `["DE", "EU"]` (kết quả sắp xếp); dòng 44 và 50: `["US"]` → `["FR"]`.
- `test_list_companies.py:13`: `["EU", "US"]` → `["EU", "FR"]`; dòng 19: `["JP"]` → `["DE"]`; dòng 44: `{"market": "JP"}` → `{"market": "DE"}`.
- `test_public_profile.py:70`: `["EU", "JP"]` → `["EU", "DE"]`.

Run: `cd backend && grep -rn '"JP"\|"US"\|"ASEAN"' app/modules --include=*.py | grep -v compliance` để chắc không còn ghi non-EU ở nơi khác (bỏ qua `test_admin_rules_api.py`/`test_import_compliance_data.py`: đó là `destination`, không liên quan).

- [ ] **Step 5: Kiểm script seed**

Run: `cd backend && grep -n "export_markets\|market=" scripts/seed_demo.py scripts/seed_testkit.py`
Expected: cả hai chỉ dùng `market="EU"` (đã kiểm ở giai đoạn khám phá) — hợp lệ, không cần sửa.

- [ ] **Step 6: Chạy test companies + toàn bộ, lint, mypy**

Run: `cd backend && uv run pytest app/modules/companies -q && uv run ruff check . && uv run ruff format --check . && uv run mypy app`
Expected: PASS, sạch.

- [ ] **Step 7: Commit**

```bash
git add backend/app/modules/companies
git commit -m "Thị trường EU: thị trường xuất khẩu của exporter chỉ nhận EU hoặc nước thành viên EU khi ghi"
```

---

### Task 7: Frontend — bảng "Thị trường nên xuất" và thị trường EU cho exporter

**Files:**
- Regenerate: `frontend/lib/api/openapi.json`, `frontend/lib/api/schema.d.ts` (`npm run generate:api`, không sửa tay)
- Create: `frontend/lib/marketsApi.ts`, `frontend/components/MarketRanking.tsx`, `frontend/tests/markets-api.test.ts`
- Modify: `frontend/components/TariffCalculator.tsx`, `frontend/components/OriginCalculator.tsx`, `frontend/app/[locale]/(public)/tools/tariff/page.tsx`, `frontend/lib/companyApi.ts`, `frontend/tests/company-api.test.ts`, `frontend/i18n/catalog.json`

**Interfaces:**
- Consumes: `POST /api/public/markets` (Task 4); `EU_COUNTRIES` (`lib/tariffApi.ts`, `{code, name}[]`); `parseAmount`.
- Produces: `rankMarkets(input: { hsCode: string; productValue: string; rooStatus?: RooStatus }): Promise<MarketsOutcome>`; `type RooStatus = 'pass' | 'fail' | 'inconclusive'`; `type MarketsOutcome = { ok: true; data: MarketsResult } | { ok: false; error: 'rate_limited' | 'invalid' | 'network' }`; component `MarketRanking({ data }: { data: MarketsResult })`; prop `initialRoo?: RooStatus` của `TariffCalculator`.

- [ ] **Step 1: Sinh lại client API**

Run: `cd frontend && npm run generate:api`
Expected: `lib/api/schema.d.ts` có `MarketsIn`, `MarketsOut`, `MarketRowOut`, `CountryTermIn/Out/Patch` và đường dẫn `/api/public/markets`, `/api/admin/country-terms`. Nếu script cần backend đang chạy (`uv run fastapi dev app/main.py`), khởi động rồi chạy lại; không sửa file sinh tay.

- [ ] **Step 2: Viết test lỗi cho client**

`frontend/tests/markets-api.test.ts` (theo cách các test `*Api.ts` khác mock `createApiClient`; xem `tests/company-api.test.ts` và test của `tariffApi` để dùng đúng kiểu mock hiện có):

```ts
import { describe, expect, it, vi } from 'vitest';
import { rankMarkets } from '../lib/marketsApi';

const post = vi.fn();
vi.mock('../lib/api/client', () => ({ createApiClient: () => ({ POST: post }) }));

describe('rankMarkets', () => {
  it('gửi số tiền dạng chuỗi và bỏ roo_status khi chưa kiểm tra', async () => {
    post.mockResolvedValue({ data: { rows: [] }, response: { status: 200, ok: true } });
    const outcome = await rankMarkets({ hsCode: '03061792', productValue: '100000' });
    expect(outcome.ok).toBe(true);
    expect(post).toHaveBeenCalledWith('/api/public/markets', {
      body: { hs_code: '03061792', product_value: '100000' },
    });
  });

  it('gửi roo_status khi có', async () => {
    post.mockResolvedValue({ data: { rows: [] }, response: { status: 200, ok: true } });
    await rankMarkets({ hsCode: '03061792', productValue: '100000', rooStatus: 'pass' });
    expect(post).toHaveBeenLastCalledWith('/api/public/markets', {
      body: { hs_code: '03061792', product_value: '100000', roo_status: 'pass' },
    });
  });

  it.each([
    [429, 'rate_limited'],
    [422, 'invalid'],
    [500, 'network'],
  ])('HTTP %i → %s', async (status, error) => {
    post.mockResolvedValue({ data: undefined, response: { status, ok: false } });
    expect(await rankMarkets({ hsCode: '03061792', productValue: '1' })).toEqual({ ok: false, error });
  });

  it('lỗi mạng → network', async () => {
    post.mockRejectedValue(new Error('down'));
    expect(await rankMarkets({ hsCode: '03061792', productValue: '1' })).toEqual({ ok: false, error: 'network' });
  });
});
```

- [ ] **Step 3: Chạy, xác nhận lỗi**

Run: `cd frontend && npx vitest run tests/markets-api.test.ts`
Expected: FAIL (không tìm thấy `../lib/marketsApi`).

- [ ] **Step 4: Cài đặt client**

`frontend/lib/marketsApi.ts`:

```ts
// Xếp hạng thị trường EU: gọi POST /api/public/markets. Số tiền luôn là CHUỖI, không qua float.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type MarketsResult = components['schemas']['MarketsOut'];
export type MarketRow = components['schemas']['MarketRowOut'];
export type RooStatus = 'pass' | 'fail' | 'inconclusive';

export type MarketsError = 'rate_limited' | 'invalid' | 'network';
export type MarketsOutcome = { ok: true; data: MarketsResult } | { ok: false; error: MarketsError };

export const isRooStatus = (value: string | undefined): value is RooStatus =>
  value === 'pass' || value === 'fail' || value === 'inconclusive';

export async function rankMarkets(input: {
  hsCode: string;
  productValue: string;
  rooStatus?: RooStatus;
}): Promise<MarketsOutcome> {
  try {
    const { data, response } = await createApiClient().POST('/api/public/markets', {
      body: {
        hs_code: input.hsCode,
        product_value: input.productValue,
        ...(input.rooStatus ? { roo_status: input.rooStatus } : {}),
      },
    });
    if (response.status === 429) return { ok: false, error: 'rate_limited' };
    if (response.status === 422) return { ok: false, error: 'invalid' };
    if (!response.ok || !data) return { ok: false, error: 'network' };
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'network' };
  }
}
```

Run: `cd frontend && npx vitest run tests/markets-api.test.ts` → PASS.

- [ ] **Step 5: Component `MarketRanking`**

`frontend/components/MarketRanking.tsx`:

```tsx
'use client';

// Bảng xếp hạng nước EU theo (thuế nhập khẩu + VAT nhập khẩu). Nước chưa có dữ liệu đã duyệt KHÔNG hiện số.
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { EU_COUNTRIES } from '../lib/tariffApi';
import type { MarketsResult } from '../lib/marketsApi';

const LANGUAGES: Record<string, string> = { de: 'Tiếng Đức', fr: 'Tiếng Pháp', nl: 'Tiếng Hà Lan' };
const NAMES = Object.fromEntries(EU_COUNTRIES.map((c) => [c.code, c.name]));

export default function MarketRanking({ data }: { data: MarketsResult }) {
  const { tr, language } = useLanguage();
  const money = (value: string) =>
    new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'vi-VN', { style: 'currency', currency: 'EUR' }).format(Number(value));
  const pick = (vi: string | null, en: string | null) => (language === 'en' ? en || vi : vi);
  const ranked = data.rows.filter((r) => r.status === 'ranked');
  const missing = data.rows.filter((r) => r.status === 'no_data');

  if (data.status === 'unsupported') {
    return <p className="mt-6 text-base font-semibold text-slate-800">{tr('Mã HS này chưa được hỗ trợ. Vui lòng liên hệ để được tư vấn.')}</p>;
  }
  if (data.status === 'needs_review') {
    return (
      <p className="mt-6 text-base font-semibold text-amber-800">
        {tr('Trường hợp này cần kiểm tra thêm (ví dụ hạn ngạch hoặc thuế tuyệt đối), nên chúng tôi không đưa ra con số.')}
      </p>
    );
  }
  return (
    <section aria-label={tr('Thị trường nên xuất')} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-extrabold text-slate-900">{tr('Thị trường nên xuất')}</h2>
      <p className="mt-1 text-sm text-slate-600">
        {data.basis === 'evfta'
          ? tr('Tính theo thuế ưu đãi EVFTA (hàng đạt quy tắc xuất xứ, có C/O).')
          : tr('Tính theo thuế MFN vì chưa xác nhận hàng đạt quy tắc xuất xứ.')}
      </p>
      {ranked.length === 0 ? (
        <p className="mt-4 text-sm text-slate-700">{tr('Chưa có dữ liệu VAT đã duyệt cho mã HS này.')}</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {ranked.map((row) => (
            <li key={row.country} className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-900">
                {row.rank}. {NAMES[row.country] ?? row.country}
              </p>
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold text-slate-500">{tr('Thuế nhập khẩu')}</dt>
                  <dd className="font-semibold text-slate-900">{row.duty ? money(row.duty) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">
                    {tr('VAT nhập khẩu')} ({Number(row.vat_rate)}%)
                  </dt>
                  <dd className="font-semibold text-slate-900">{row.vat ? money(row.vat) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">{tr('Tổng')}</dt>
                  <dd className="font-bold text-[#083832]">{row.total ? money(row.total) : '—'}</dd>
                </div>
              </dl>
              {row.label_languages && (
                <p className="mt-2 text-xs text-slate-600">
                  {tr('Ngôn ngữ nhãn bắt buộc')}: {tr(LANGUAGES[row.label_languages] ?? row.label_languages)}
                </p>
              )}
              {pick(row.note, row.note_en) && <p className="mt-1 text-xs text-slate-600">{pick(row.note, row.note_en)}</p>}
            </li>
          ))}
        </ol>
      )}
      {missing.length > 0 && (
        <p className="mt-4 text-xs text-slate-500">
          {tr('Chưa có dữ liệu cho')} {missing.length} {tr('nước EU còn lại; chúng tôi không đoán số liệu.')}
        </p>
      )}
      <p className="mt-4 text-xs text-slate-500">
        {tr('VAT nhập khẩu thường được khấu trừ với nhà nhập khẩu đã đăng ký VAT; thuế nhập khẩu thì không được khấu trừ.')}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {tr('Kết quả chỉ mang tính tham khảo, không thay thế tư vấn pháp lý hoặc xác nhận của cơ quan hải quan.')}
      </p>
    </section>
  );
}
```

- [ ] **Step 6: Gắn vào `TariffCalculator`**

Trong `components/TariffCalculator.tsx`:
1. `import MarketRanking from './MarketRanking';` và `import { isRooStatus, rankMarkets, type MarketsResult, type RooStatus } from '../lib/marketsApi';`
2. Đổi chữ ký: `export default function TariffCalculator({ initialRoo }: { initialRoo?: RooStatus }) {`
3. Thêm state: `const [roo, setRoo] = useState<RooStatus | ''>(initialRoo ?? '');`, `const [markets, setMarkets] = useState<MarketsResult | null>(null);`, `const [marketsBusy, setMarketsBusy] = useState(false);`. Trong `submit`, thêm `setMarkets(null);` cạnh `setResult(null);`.
4. Thêm hàm:

```tsx
  const showMarkets = async () => {
    if (!hs) return;
    const amount = parseAmount(value);
    if (!amount) return;
    setMarketsBusy(true);
    setError('');
    const outcome = await rankMarkets({ hsCode: hs.code, productValue: amount, rooStatus: roo || undefined });
    setMarketsBusy(false);
    if (outcome.ok) setMarkets(outcome.data);
    else setError(ERRORS[outcome.error]);
  };
```
5. Thêm ô chọn trạng thái RoO vào form (sau ô số lô hàng), dùng lớp `field`/`label` sẵn có:

```tsx
        <div>
          <label htmlFor="tariff-roo" className={label}>
            {tr('Kết quả kiểm tra xuất xứ (nếu đã có)')}
          </label>
          <select id="tariff-roo" value={roo} onChange={(e) => setRoo(isRooStatus(e.target.value) ? e.target.value : '')} className={field}>
            <option value="">{tr('Chưa kiểm tra')}</option>
            <option value="pass">{tr('Đạt')}</option>
            <option value="fail">{tr('Không đạt')}</option>
            <option value="inconclusive">{tr('Chưa kết luận')}</option>
          </select>
        </div>
```
6. Dưới `{result && <Result data={result} />}` (cuối JSX), thêm:

```tsx
      {result && result.status === 'ok' && (
        <button
          type="button"
          disabled={marketsBusy}
          onClick={() => void showMarkets()}
          className="mt-4 rounded-xl border border-[#083832] px-5 py-2.5 text-sm font-semibold text-[#083832] hover:bg-slate-50 disabled:opacity-60"
        >
          {tr(marketsBusy ? 'Đang tính...' : 'Xem thị trường nên xuất')}
        </button>
      )}
      {markets && <MarketRanking data={markets} />}
```

- [ ] **Step 7: Trang tariff đọc `?roo=` và Origin có liên kết**

`app/[locale]/(public)/tools/tariff/page.tsx`:

```tsx
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import TariffCalculator from '@/components/TariffCalculator';
import { isRooStatus } from '@/lib/marketsApi';

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ roo?: string }>;
}) {
  setRequestLocale(use(params).locale);
  const { roo } = use(searchParams);
  return <TariffCalculator initialRoo={isRooStatus(roo) ? roo : undefined} />;
}
```

Trong `OriginCalculator.tsx`, trong component `Result` (đã có) thêm cuối phần kết quả một liên kết (dùng `data.status` đã có: `'pass' | 'fail' | 'inconclusive' | 'unsupported'`):

```tsx
      {data.status !== 'unsupported' && (
        <a
          href={`/tools/tariff?roo=${data.status}`}
          className="mt-4 inline-block text-sm font-semibold text-[#083832] underline"
        >
          {tr('Xem thị trường EU nên xuất')}
        </a>
      )}
```
Đọc `Result` trong file để đặt đúng chỗ và dùng đúng tên biến `tr`/`data`; nếu trang dùng tiền tố locale (`/vi/tools/tariff`), dùng cùng helper liên kết mà các link nội bộ khác trong file này đang dùng (xem `i18n/navigation.ts`), không viết cứng.

- [ ] **Step 8: Thị trường xuất khẩu chỉ EU**

Trong `lib/companyApi.ts`, thay `EXPORT_MARKETS` (giữ nguyên `MARKET_NAMES`, `marketCode`) bằng:

```ts
import { EU_COUNTRIES } from './tariffApi';
```
Vì `tariffApi.ts` đã import `COUNTRIES` từ `companyApi.ts`, tránh vòng import: **không** import `tariffApi` vào `companyApi`. Thay vào đó lấy nước từ chính `COUNTRIES` trong `companyApi.ts`:

```ts
const EU_CODES = 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' ');

// Thị trường xuất khẩu đã phục vụ (cấp công ty): EU nói chung hoặc từng nước thành viên EU (khớp backend).
export const EXPORT_MARKETS: { code: string; label: string }[] = [
  { code: 'EU', label: 'Châu Âu (EU)' },
  ...COUNTRIES.filter((c) => EU_CODES.includes(c.code)).map((c) => ({ code: c.code, label: c.name })),
];
```
(`COUNTRIES` phải được khai báo trước trong file; nếu đang khai báo sau `EXPORT_MARKETS`, di chuyển `EXPORT_MARKETS` xuống dưới nó.) Sau đó chạy `grep -n "markets:" frontend/components/*.tsx frontend/app -r` để tìm chỗ điền sẵn thị trường từ hồ sơ cũ; nếu hồ sơ cũ có mã ngoài `EXPORT_MARKETS`, lọc bỏ trước khi gửi PATCH/POST bằng `formData.markets.split(',').filter((m) => EXPORT_MARKETS.some((x) => x.code === m))` để lưu hồ sơ không bị 422 vì thị trường cũ (US, JP…).

Cập nhật `tests/company-api.test.ts` khối `describe('EXPORT_MARKETS', …)`:

```ts
describe('EXPORT_MARKETS', () => {
  it('chỉ gồm EU và 27 nước thành viên EU, không trùng, mã hợp lệ với backend', () => {
    const codes = EXPORT_MARKETS.map((m) => m.code);
    expect(codes).toContain('EU');
    expect(codes).toHaveLength(28);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).not.toContain('US');
    expect(codes).not.toContain('JP');
    expect(codes.filter((c) => !/^(EU|[A-Z]{2})$/.test(c))).toEqual([]);
    expect(EXPORT_MARKETS.every((m) => m.label.trim() !== '')).toBe(true);
  });
});
```
Test `marketCode` (nhãn cũ → mã) giữ nguyên, vẫn hợp lệ vì `MARKET_NAMES` không đổi.

- [ ] **Step 9: Bản dịch**

Thêm vào `frontend/i18n/catalog.json` (định dạng `"chuỗi vi": ["en", "fr", "ja"]`; cung cấp ít nhất bản `en` ở vị trí đầu, khác chữ gốc; kiểm `i18n/translate.ts` xem ngôn ngữ thiếu có rơi về `en` không) cho các chuỗi mới: `Thị trường nên xuất`, `Xem thị trường nên xuất`, `Đang tính...`, `Kết quả kiểm tra xuất xứ (nếu đã có)`, `Chưa kiểm tra`, `Đạt`, `Không đạt`, `Chưa kết luận`, `Tính theo thuế ưu đãi EVFTA (hàng đạt quy tắc xuất xứ, có C/O).`, `Tính theo thuế MFN vì chưa xác nhận hàng đạt quy tắc xuất xứ.`, `Chưa có dữ liệu VAT đã duyệt cho mã HS này.`, `Thuế nhập khẩu`, `VAT nhập khẩu`, `Tổng`, `Ngôn ngữ nhãn bắt buộc`, `Tiếng Đức`, `Tiếng Pháp`, `Tiếng Hà Lan`, `Chưa có dữ liệu cho`, `nước EU còn lại; chúng tôi không đoán số liệu.`, `VAT nhập khẩu thường được khấu trừ với nhà nhập khẩu đã đăng ký VAT; thuế nhập khẩu thì không được khấu trừ.`, `Xem thị trường EU nên xuất`. (Nhiều chuỗi như `Đạt`, `Không đạt`, `Chưa kết luận`, `Tổng`, `Kết quả chỉ mang tính tham khảo…` có thể đã có: `grep` trước, chỉ thêm phần còn thiếu.)

- [ ] **Step 10: Chạy lint, typecheck, test, i18n**

Run: `cd frontend && npm run lint && npm run typecheck && npm test && npm run i18n:check`
Expected: tất cả PASS. (`i18n:check` in "mọi chuỗi tr() đều có bản dịch".)

- [ ] **Step 11: Commit**

```bash
git add frontend
git commit -m "Thị trường EU: bảng thị trường nên xuất, chọn kết quả RoO, thị trường xuất khẩu chỉ EU"
```

---

### Task 8: Frontend admin — nhóm dữ liệu "VAT theo nước"

**Files:**
- Modify: `frontend/lib/adminApi.ts`, `frontend/components/admin-compliance/datasets.ts`, `frontend/components/AdminComplianceData.tsx`, `frontend/tests/admin-compliance-data.test.tsx`, `frontend/i18n/catalog.json`

**Interfaces:**
- Consumes: `GET|POST /api/admin/country-terms`, `PATCH …/{term_id}`, `POST …/{term_id}/review`, `DELETE …/{term_id}`; `Dataset`, `Row`, `Field`, `DESTINATIONS`-style helpers trong `datasets.ts` (`pct`, `plain`, `text`, `searchable`, `validity`, `COMMON_LEGEND`, `NO_EXPIRY`).
- Produces: dataset `{ key: 'terms', … }` trong `DATASETS`; `Dataset.xlsxPath`/`xlsxName` trở thành tùy chọn (nhóm này chưa có nhập/xuất Excel — nằm ngoài phạm vi).

- [ ] **Step 1: Hàm API admin**

Trong `lib/adminApi.ts`, cạnh các hàm tariff (đọc khối `listTariffLines`/`reviewTariffLine`/`createTariffLine` và kiểu `TariffLineInput`/`TariffLinePatch` để đặt tên kiểu cho đúng cách file đang dùng; dùng kiểu từ `components['schemas']['CountryTermIn']`/`CountryTermPatch` theo cùng kiểu khai báo đó):

```ts
export const listCountryTerms = () => read(() => createApiClient().GET('/api/admin/country-terms'));

export const reviewCountryTerm = (id: string) =>
  act(() => createApiClient().POST('/api/admin/country-terms/{term_id}/review', { params: { path: { term_id: id } } }), REVIEW_ERRORS);
export const deleteCountryTerm = (id: string) =>
  act(() => createApiClient().DELETE('/api/admin/country-terms/{term_id}', { params: { path: { term_id: id } } }), DELETE_ERRORS);

export const createCountryTerm = (body: CountryTermInput) => save(() => createApiClient().POST('/api/admin/country-terms', { body }));
export const updateCountryTerm = (id: string, body: CountryTermPatch) =>
  save(() => createApiClient().PATCH('/api/admin/country-terms/{term_id}', { params: { path: { term_id: id } }, body }));
```
và thêm vào `SAVE_ERRORS`: `duplicate_term: 'Mã HS, nước và ngày bắt đầu này đã có.'`. Khai báo `export type CountryTermInput = components['schemas']['CountryTermIn']; export type CountryTermPatch = components['schemas']['CountryTermPatch'];` theo đúng cách các kiểu `TariffLineInput` đang được khai báo.

- [ ] **Step 2: Dataset**

Trong `datasets.ts`: thêm các import `createCountryTerm, deleteCountryTerm, listCountryTerms, reviewCountryTerm, updateCountryTerm, type CountryTermInput, type CountryTermPatch`; đổi `xlsxPath: string; xlsxName: string;` trong `interface Dataset` thành `xlsxPath?: string; xlsxName?: string;`; thêm chú thích và dataset (đặt sau dataset `roo`):

```ts
const TERMS_LEGEND: LegendItem[] = [
  { term: 'VAT nhập khẩu', text: 'Thuế suất VAT (%) áp cho mã hàng này tại nước nhập khẩu. Công thức: VAT = (trị giá + thuế nhập khẩu) × VAT.' },
  { term: 'Nước', text: 'Mã ISO-2 của nước thành viên EU. Nước chưa có dòng đã duyệt hiện "chưa có dữ liệu", không có con số.' },
  { term: 'Ngôn ngữ nhãn', text: 'Mã ngôn ngữ nhãn bắt buộc tại nước đó (de, fr, nl…).' },
  { term: 'Trùng hiệu lực', text: 'Hai dòng đã duyệt cùng mã HS, cùng nước, cùng hiệu lực sẽ làm nước đó bị coi là chưa có dữ liệu. Đặt Đến ngày cho dòng cũ.' },
];
```

```ts
  {
    key: 'terms',
    label: 'VAT theo nước',
    columns: ['Mã HS', 'Nước', 'VAT (%)', 'Ngôn ngữ nhãn', 'Từ ngày', 'Đến ngày'],
    fields: [
      { key: 'hs_code', label: 'Mã HS', kind: 'text', required: true, help: '6–8 chữ số, phải có trong danh mục HS. Dùng đúng mã của dòng thuế.' },
      { key: 'country', label: 'Nước', kind: 'select', required: true, options: EU_MEMBERS, initial: 'DE' },
      { key: 'vat_rate', label: 'VAT nhập khẩu (%)', kind: 'decimal', required: true, help: '0–100, tối đa 4 chữ số thập phân.' },
      { key: 'label_languages', label: 'Ngôn ngữ nhãn', kind: 'text', help: 'Mã ngôn ngữ, vd de, fr, nl.' },
      { key: 'note', label: 'Lưu ý theo nước', kind: 'textarea' },
      { key: 'note_en', label: 'Lưu ý theo nước (tiếng Anh)', kind: 'textarea', help: 'Hiện cho người dùng giao diện tiếng Anh; để trống thì hiện bản tiếng Việt.' },
      { key: 'source', label: 'Nguồn', kind: 'textarea' },
      ...validity,
    ],
    legend: TERMS_LEGEND,
    load: async () =>
      ((await listCountryTerms()) ?? null)?.map((r) => ({
        id: r.id,
        reviewed: r.reviewed_by !== null,
        canDelete: r.reviewed_by === null,
        cells: [r.hs_code, r.country, pct(r.vat_rate), text(r.label_languages), r.valid_from, r.valid_until ?? NO_EXPIRY],
        values: {
          hs_code: r.hs_code,
          country: r.country,
          vat_rate: plain(r.vat_rate),
          label_languages: text(r.label_languages),
          note: text(r.note),
          note_en: text(r.note_en),
          source: text(r.source),
          valid_from: r.valid_from,
          valid_until: text(r.valid_until),
        },
        search: searchable(r.hs_code, r.country, r.label_languages, r.note, r.note_en, r.source),
      })) ?? null,
    create: (body) => createCountryTerm(body as unknown as CountryTermInput),
    update: (id, body) => updateCountryTerm(id, body as CountryTermPatch),
    review: reviewCountryTerm,
    remove: deleteCountryTerm,
  },
```
(`text('')` cho ô ngôn ngữ trống hiện rỗng; đúng.)

- [ ] **Step 3: Ẩn nút Excel khi dataset không có xlsx**

Trong `AdminComplianceData.tsx`, các nút tải template/xuất (dòng ~140–143) và nút mở hộp nhập (`setImporting(true)`) cùng khối `ImportDialog` chỉ hiện khi `dataset.xlsxPath` có giá trị: bọc bằng `{dataset.xlsxPath && (…)}` và trong callback dùng `dataset.xlsxPath`/`dataset.xlsxName ?? ''` (TypeScript sẽ ép thu hẹp kiểu). Đọc `ImportDialog.tsx:23` (`const path = \`${dataset.xlsxPath}/import\``) và chắc chắn nó chỉ được render khi có `xlsxPath`.

- [ ] **Step 4: Test**

Trong `tests/admin-compliance-data.test.tsx`, đọc test hiện có để biết cách mock `adminApi` và cách kiểm số tab; cập nhật số tab (4 → 5), thêm mock `listCountryTerms` trả một dòng chưa duyệt và kiểm:
1. Tab "VAT theo nước" hiện; dòng hiển thị `7%` và nút duyệt.
2. Bấm duyệt gọi `reviewCountryTerm` với đúng id.
3. Tab này **không** có nút "Tải mẫu"/"Xuất"/"Nhập" Excel, còn tab "Dòng thuế" vẫn có.

- [ ] **Step 5: Bản dịch**

Thêm vào `i18n/catalog.json` (bản `en` ở vị trí đầu) các chuỗi mới: `VAT theo nước`, `Nước`, `VAT (%)`, `Ngôn ngữ nhãn`, `VAT nhập khẩu (%)`, `Lưu ý theo nước`, `Lưu ý theo nước (tiếng Anh)`, `Mã ngôn ngữ, vd de, fr, nl.`, `Dùng đúng mã của dòng thuế.` (nếu nằm trong chuỗi `help` thì cả chuỗi `help` nguyên văn), cùng toàn bộ chuỗi `term`/`text` của `TERMS_LEGEND`. Kiểm: các chuỗi `label`/`help`/`legend` trong `datasets.ts` được dịch khi hiển thị bằng `tr()` (xem `AdminComplianceData.tsx`), nên mỗi chuỗi cần có mục trong catalog; `grep` để không thêm trùng.

- [ ] **Step 6: Chạy lint, typecheck, test, i18n**

Run: `cd frontend && npm run lint && npm run typecheck && npm test && npm run i18n:check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend
git commit -m "Thị trường EU: nhóm dữ liệu VAT theo nước trong màn quản trị tuân thủ"
```

---

### Task 9: Kiểm tra cuối và báo cáo

**Files:** không sửa file nghiệp vụ.

- [ ] **Step 1: Toàn bộ backend**

Run: `cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest -q`
Expected: sạch, toàn bộ test PASS. Ghi lại số test chạy và số test lỗi thật.

- [ ] **Step 2: Toàn bộ frontend**

Run: `cd frontend && npm run lint && npm run typecheck && npm test && npm run i18n:check`
Expected: PASS.

- [ ] **Step 3: Kiểm ranh giới module**

Run: `cd backend && grep -rn "from app.modules" app/modules/compliance | grep "models" | grep -v "app.modules.compliance"; grep -rn "from app.modules" app/modules/companies | grep "compliance"`
Expected: không có module nào import `models` của module khác; `companies` không import `compliance`.

- [ ] **Step 4: Dò dữ liệu chưa duyệt không lộ**

Run: `cd backend && uv run pytest app/modules/compliance/tests/test_verified_pack.py::test_import_is_unreviewed_and_hidden app/modules/compliance/tests/test_markets_api.py -q`
Expected: PASS.

- [ ] **Step 5: Báo cáo checkpoint (AGENTS §11.5)**

Tóm tắt cho người dùng: đã làm gì, file đã đổi, kết quả lint/typecheck/test **thật**, và các việc còn dở, gồm:
- Dữ liệu 20 mã + 60 dòng VAT **chưa được nạp vào DB nào**: chạy `uv run python -m scripts.import_verified_pack --actor <email admin>` khi người dùng đồng ý, rồi luật TM duyệt từng nhóm trong màn quản trị.
- Cảnh báo dữ liệu từ chính file: mã CN 2012 cần đối chiếu mã 2026; MFN là CCT 26/6/2012 cần đối chiếu TARIC; VAT nguồn thứ cấp cần đối chiếu TEDB; ghi chú "Đối chiếu MFN…" (mã 03046200) và "cần luật sư xác nhận…" (07123200) đang nằm trong `condition_note` — reviewer nên sửa/bỏ trước khi duyệt vì sẽ hiện công khai sau khi duyệt.
- 16/20 dòng RoO là `requires_expert` (luôn "chưa kết luận"); chỉ 4 dòng cho pass/fail.
- Đếm lần chạy của nút "Thị trường nên xuất" tính vào `compliance_checks` (loại `tariff`, tiết kiệm rỗng): số lần chạy trên dashboard exporter tăng theo, số tiền tiết kiệm không đổi.
- Thị trường xuất khẩu cũ (US, JP…) giữ nguyên trong DB; chỉ ghi mới bị giới hạn.
- Ô nước nhập khẩu trên máy tính thuế/RoO/EUR.1 **đã** chỉ liệt kê nước EU từ trước, không cần sửa.

---

## Self-Review (đã chạy)

**Spec coverage:** dữ liệu file (T5), mã 8 số (T1), quy đổi RoO (T5), bảng VAT + admin (T3, T8), `rank_markets` (T2), API (T4), giới hạn EU backend (T6) và FE (T7), giao diện xếp hạng + RoO (T7), test golden theo file Excel (T2, T4, T5), ngoài phạm vi ghi ở T9. Không thiếu mục nào của spec.

**Placeholder scan:** không có "TBD/TODO". Các chỗ phụ thuộc nội dung file hiện có (kiểu mock trong test FE, vị trí đặt liên kết trong `OriginCalculator`, kiểu `TariffLineInput` trong `adminApi`) đều chỉ rõ file, dòng/khối cần đọc và mẫu code cần đặt.

**Nhất quán kiểu:** `lookup_lines`/`lookup_rules` (T1) ↔ `rank_markets_for` (T4); `CountryTerms`/`MarketRow`/`MarketRanking`/`rank_markets` (T2) ↔ `MarketRowOut`/`MarketsOut` (T4, dùng `MarketRowOut(**row.__dict__)` nên tên trường phải trùng: `country,status,rank,duty,vat_rate,vat,total,label_languages,note,note_en`); `find_terms` (T3) ↔ T4/T5; `CountryTermIn` (T3) ↔ `term_rows` (T5); `MarketsResult`/`rankMarkets` (T7) ↔ schema sinh từ T4.
