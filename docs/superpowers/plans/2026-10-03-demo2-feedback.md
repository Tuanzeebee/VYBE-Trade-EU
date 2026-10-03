# Nâng cấp sau demo 2 (C1 + C2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đến 08/10/2026, seller dùng được hành trình hai chặng (Sản phẩm → Bán hàng) với một "việc tiếp theo", máy tính thuế gọn và có gợi ý cước/bảo hiểm, Request nhiều loại, go-to-market hỏi theo bước, giao diện buyer kiểu Ankorstore, và giới hạn gói Basic 3 sản phẩm.

**Architecture:** Backend thêm hàm thuần `next_step` (dashboard), hai bảng benchmark (compliance), cột `rfqs.kind` (messaging), trường mới trong `ReportIn` (markets, lưu trong JSONB `input` sẵn có, không cần migration), bảng `market_insights` và `plan_limits`. Giới hạn gói đi qua hook `core.entitlements.limit_for` (cùng mẫu với `has_feature`) để `companies` không import `billing`. Frontend thay shell `SellerWorkspace` bằng khung hành trình, tái dùng route/tab hiện có.

**Tech Stack:** FastAPI, Pydantic v2, SQLAlchemy 2 async, Alembic, pytest (Postgres thật), Next.js App Router, TypeScript, Tailwind, vitest.

**Spec:** `docs/superpowers/specs/2026-10-03-demo2-feedback-design.md`

## Global Constraints

- Tiền và tỷ lệ dùng `Decimal`/`numeric`, cấm float (AGENTS.md §5.7).
- Thuế suất, giá benchmark, dữ kiện thị trường nằm trong bảng DB, không viết cứng trong code (§5.6). Dòng thiếu `reviewed_by` không bao giờ lộ ra API công khai/exporter.
- Router mỏng; logic ở `service.py`; tính toán là hàm thuần không đụng DB/HTTP (§5.2, §5.3).
- Module A không import `models` của module B; chỉ gọi `service`/`schemas` (§5.1). Cross-module phản ứng qua event hoặc hook.
- Phân quyền hai lớp: `require_role(...)` trên router và service tự kiểm chủ sở hữu; mọi route mới có test 401 (thiếu phiên) và 403 (sai vai trò).
- Mỗi thay đổi schema = một migration Alembic, đánh số tiếp từ `0056` (migration mới đầu tiên là `0057`). Không sửa migration đã merge.
- Sau khi sửa schema/route backend: chạy `npm run generate:api` trong `frontend/` trước khi sửa FE.
- Chuỗi UI hiện là tiếng Việt viết thẳng trong code, bọc `tr("...")`, bản dịch ở `frontend/i18n/catalog.json` dạng `"câu tiếng Việt": ["en","fr","ja"]`. Chuỗi mới phải thêm khóa vào catalog đủ en/fr/ja.
- Giữ nguyên tên API `/rfqs` và tên bảng `rfqs`; chỉ đổi nhãn hiển thị "RFQ" → "Request".
- Trợ lý/Công cụ: nhãn "Trợ lý", "Công cụ hỗ trợ", không chữ "AI"/"tuân thủ" hướng người dùng. Không sửa AGENTS.md.
- Luồng exporter dùng được ở bề rộng 390px; chữ tương phản ≥ 4.5:1; ô chưa có dữ liệu hiện hướng dẫn.
- Trước khi báo xong từng task: chạy lint + typecheck + test của phần đã sửa (`uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest <đường dẫn>`; FE: `npm run lint && npm run typecheck && npm test`) và báo kết quả thật.
- Commit nhỏ, dạng `<mã>: <mô tả>` (mã N1…N9 theo spec).
- Không chạy migration/script trên DB staging/prod; không push.

## Review Focus

- Người dùng chưa có công ty mở "Hành trình": phải ra "việc tiếp theo" = tạo hồ sơ, không lỗi 500 (test `next_step` + endpoint).
- `ReportIn` thương hiệu riêng không nhập ngân sách, hoặc không nhập doanh thu: 422 rõ ràng, không tạo báo cáo.
- Dòng benchmark chưa duyệt hoặc quá hạn: không lộ ra; tuyến không có dòng: trả danh sách rỗng, UI hiện "chưa có giá tham khảo", không đoán.
- Request loại `meeting`/`packaging`/`quality`/`other`: không được tạo báo giá và không bị tính nhầm vào luồng số lượng/giá; loại cũ (`quote`) vẫn chạy như trước.
- Seller tạo sản phẩm thứ 4 với gói Basic → 409; sửa/xóa sản phẩm hiện có không bị chặn; có entitlement thì qua.
- Ô "thuế ưu đãi" hiện 0% khi dòng thuế không có trích dẫn: phải kèm cờ "chưa có trích dẫn nguồn", không để ô trơ.

---

## C1: trước demo 04/10

### Task 1: Hàm thuần `next_step` và trường `journey` trong dashboard (N1, N3)

**Files:**
- Create: `backend/app/modules/dashboard/journey.py`
- Create: `backend/app/modules/dashboard/tests/test_journey.py`
- Modify: `backend/app/modules/dashboard/schemas.py` (thêm `JourneyStepOut`, `JourneyOut`; thêm `journey` vào `ExporterDashboard`; bỏ `copilot`)
- Modify: `backend/app/modules/dashboard/service.py` (dựng `JourneyState`, gọi `next_step`)
- Modify: `backend/app/modules/dashboard/tests/test_exporter_dashboard.py` (thêm test endpoint; sửa test dùng `copilot` nếu có)
- Modify: `backend/app/modules/markets/report_service.py` (thêm `count_reports`)

**Interfaces:**
- Consumes: `companies.get_company_id`, `companies.get_completeness`, `companies.get_verification_state`, `compliance.sum_tariff_savings` (trả `(Decimal, int)`), `messaging.summarize_rfqs(...).total`, `product_service.list_products` (chỉ để đếm; xem Step 4).
- Produces:
  - `JourneyState` (dataclass frozen): `has_company: bool`, `completeness_score: Decimal`, `product_count: int`, `verification_status: str`, `gtm_report_count: int`, `tariff_runs: int`, `rfq_total: int`.
  - `JourneyStep` (dataclass frozen): `key: str`, `track: Literal["product","sales"]`, `done: bool`.
  - `build_steps(state) -> list[JourneyStep]` (8 bước, thứ tự cố định).
  - `next_step(state) -> str | None` trả `key` của bước chưa xong đầu tiên; `None` khi mọi bước đã xong.
  - `track_progress(steps, track) -> tuple[int, int]` = (số xong, tổng).
  - Schema `JourneyOut`: `next_step: str | None`, `steps: list[JourneyStepOut{key, track, done}]`, `product_done: int`, `product_total: int`, `sales_done: int`, `sales_total: int`.
  - Hằng `COMPANY_DONE_SCORE = Decimal("60")`.

Quy ước bước (key → điều kiện xong):
`company` (has_company và score ≥ 60) · `products` (product_count ≥ 1) · `evidence` (verification_status ∈ {pending, verified}) · `verification` (== verified) · `market` (gtm_report_count ≥ 1) · `tariff` (tariff_runs ≥ 1) · `requests` (rfq_total ≥ 1) · `services` (luôn False: bước thông tin, chưa có dữ liệu để "xong").
`next_step` bỏ qua `services` (không bao giờ là việc tiếp theo); nếu mọi bước còn lại xong thì trả `None`.
Nếu `has_company` False thì `next_step` luôn là `company` bất kể các giá trị khác.

- [ ] **Step 1: Viết test hàm thuần**

```python
# backend/app/modules/dashboard/tests/test_journey.py
"""N1: hành trình seller — hàm thuần, không DB."""

from decimal import Decimal

import pytest

from app.modules.dashboard.journey import (
    JourneyState,
    build_steps,
    next_step,
    track_progress,
)


def state(**kw: object) -> JourneyState:
    base: dict[str, object] = {
        "has_company": True,
        "completeness_score": Decimal("80"),
        "product_count": 1,
        "verification_status": "verified",
        "gtm_report_count": 1,
        "tariff_runs": 1,
        "rfq_total": 1,
    }
    base.update(kw)
    return JourneyState(**base)  # type: ignore[arg-type]


@pytest.mark.parametrize(
    ("overrides", "expected"),
    [
        ({"has_company": False, "completeness_score": Decimal("0"), "product_count": 0}, "company"),
        ({"completeness_score": Decimal("59.99")}, "company"),
        ({"product_count": 0}, "products"),
        ({"verification_status": "unverified"}, "evidence"),
        ({"verification_status": "rejected"}, "evidence"),
        ({"verification_status": "pending"}, "verification"),
        ({"gtm_report_count": 0}, "market"),
        ({"tariff_runs": 0}, "tariff"),
        ({"rfq_total": 0}, "requests"),
        ({}, None),
    ],
)
def test_next_step_is_first_unfinished(overrides: dict[str, object], expected: str | None) -> None:
    assert next_step(state(**overrides)) == expected


def test_no_company_always_points_at_company_even_if_other_signals_set() -> None:
    assert next_step(state(has_company=False)) == "company"


def test_services_step_is_never_the_next_step_and_never_done() -> None:
    steps = {s.key: s for s in build_steps(state())}
    assert steps["services"].done is False
    assert next_step(state()) is None


def test_track_progress_counts_per_track() -> None:
    steps = build_steps(state(product_count=0, tariff_runs=0))
    assert track_progress(steps, "product") == (3, 4)
    assert track_progress(steps, "sales") == (2, 4)


def test_steps_keep_a_fixed_order() -> None:
    assert [s.key for s in build_steps(state())] == [
        "company", "products", "evidence", "verification",
        "market", "tariff", "requests", "services",
    ]  # fmt: skip
```

- [ ] **Step 2: Chạy để thấy test fail**

Run: `cd backend && uv run pytest app/modules/dashboard/tests/test_journey.py -v`
Expected: FAIL (`ModuleNotFoundError: app.modules.dashboard.journey`).

- [ ] **Step 3: Viết hàm thuần**

```python
# backend/app/modules/dashboard/journey.py
"""Hành trình seller (N1): hàm thuần, không đụng DB/HTTP (AGENTS.md §5.3).

Hai chặng: "product" (hoàn thiện sản phẩm) và "sales" (bán hàng). `next_step` là việc đầu tiên
chưa xong; dùng để giao diện chỉ hiện MỘT nút nổi bật.
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

Track = Literal["product", "sales"]

COMPANY_DONE_SCORE = Decimal("60")


@dataclass(frozen=True)
class JourneyState:
    has_company: bool
    completeness_score: Decimal  # 0–100
    product_count: int
    verification_status: str  # unverified | pending | verified | rejected
    gtm_report_count: int
    tariff_runs: int
    rfq_total: int


@dataclass(frozen=True)
class JourneyStep:
    key: str
    track: Track
    done: bool


def build_steps(s: JourneyState) -> list[JourneyStep]:
    return [
        JourneyStep(
            "company", "product", s.has_company and s.completeness_score >= COMPANY_DONE_SCORE
        ),
        JourneyStep("products", "product", s.product_count >= 1),
        JourneyStep("evidence", "product", s.verification_status in ("pending", "verified")),
        JourneyStep("verification", "product", s.verification_status == "verified"),
        JourneyStep("market", "sales", s.gtm_report_count >= 1),
        JourneyStep("tariff", "sales", s.tariff_runs >= 1),
        JourneyStep("requests", "sales", s.rfq_total >= 1),
        JourneyStep("services", "sales", False),  # bước thông tin: chưa có dữ liệu để "xong"
    ]


def next_step(s: JourneyState) -> str | None:
    if not s.has_company:
        return "company"
    for step in build_steps(s):
        if step.key != "services" and not step.done:
            return step.key
    return None


def track_progress(steps: list[JourneyStep], track: Track) -> tuple[int, int]:
    in_track = [x for x in steps if x.track == track]
    return sum(1 for x in in_track if x.done), len(in_track)
```

- [ ] **Step 4: Chạy test hàm thuần → PASS**

Run: `cd backend && uv run pytest app/modules/dashboard/tests/test_journey.py -v`
Expected: PASS (5 nhóm test).

- [ ] **Step 5: Viết test endpoint (fail trước)**

Thêm vào cuối `backend/app/modules/dashboard/tests/test_exporter_dashboard.py` (dùng các helper đã có: `login_as`, `company_body`, `dashboard`):

```python
# ── N1: hành trình ───────────────────────────────────────────────────────────
async def test_journey_without_company_points_at_company(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "new@x.vn")
    journey = (await dashboard(api_client))["journey"]
    assert journey["next_step"] == "company"
    assert [s["key"] for s in journey["steps"]][0] == "company"
    assert journey["product_total"] == 4
    assert journey["sales_total"] == 4


async def test_journey_with_company_but_no_product_points_at_products(
    api_client: AsyncClient,
) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    await api_client.post("/api/me/company", json=company_body())
    journey = (await dashboard(api_client))["journey"]
    assert journey["next_step"] in ("company", "products")
    assert "copilot" not in (await dashboard(api_client))
```

Run: `cd backend && uv run pytest app/modules/dashboard/tests/test_exporter_dashboard.py -k journey -v`
Expected: FAIL (KeyError `journey`).

- [ ] **Step 6: Schema, service, `count_reports`**

`schemas.py`: thêm trước `ExporterDashboard`, bỏ `CopilotTile`/`QuestionBrief` khỏi `ExporterDashboard` (giữ định nghĩa lớp nếu nơi khác dùng; kiểm bằng `grep -rn "CopilotTile\|QuestionBrief" backend/app` trước khi xóa):

```python
class JourneyStepOut(BaseModel):
    key: str
    track: str  # "product" | "sales"
    done: bool


class JourneyOut(BaseModel):
    next_step: str | None
    steps: list[JourneyStepOut]
    product_done: int
    product_total: int
    sales_done: int
    sales_total: int


class ExporterDashboard(BaseModel):
    completeness: CompletenessTile
    profile_views: ProfileViewsTile
    rfqs: RfqTile
    verification: VerificationTile
    tariff_savings: SavingsTile
    journey: JourneyOut
```

`markets/report_service.py`: thêm (cạnh `_count_since`; `select`, `func`, `MarketReport` đã import ở file này — kiểm tra import trước):

```python
async def count_reports(session: AsyncSession, company_id: uuid.UUID) -> int:
    """Số báo cáo go-to-market đã tạo của công ty (N1: bước 'market' của hành trình)."""
    return int(
        await session.scalar(
            select(func.count()).select_from(MarketReport).where(MarketReport.company_id == company_id)
        )
        or 0
    )
```

`dashboard/service.py`: thêm import `from decimal import Decimal` (đã có), `from app.modules.dashboard.journey import JourneyState, build_steps, next_step, track_progress`, `from app.modules.markets import report_service as markets`, `JourneyOut`, `JourneyStepOut`; xóa import `copilot`, `CopilotTile`, `QuestionBrief` và hàm `_copilot_tile` nếu không còn dùng. Thêm:

```python
async def _journey(
    session: AsyncSession,
    user: CurrentUser,
    company_id: uuid.UUID | None,
    dashboard_parts: tuple[CompletenessTile, VerificationTile, SavingsTile, RfqTile],
) -> JourneyOut:
    completeness, verification, savings, rfqs = dashboard_parts
    score = Decimal(completeness.data.score) if completeness.data else Decimal(0)
    products = await product_service.count_company_products(session, company_id) if company_id else 0
    state = JourneyState(
        has_company=company_id is not None,
        completeness_score=score,
        product_count=products,
        verification_status=verification.data.status if verification.data else "unverified",
        gtm_report_count=await markets.count_reports(session, company_id) if company_id else 0,
        tariff_runs=savings.data.runs if savings.data else 0,
        rfq_total=rfqs.data.total if rfqs.data else 0,
    )
    steps = build_steps(state)
    pd, pt = track_progress(steps, "product")
    sd, st = track_progress(steps, "sales")
    return JourneyOut(
        next_step=next_step(state),
        steps=[JourneyStepOut(key=s.key, track=s.track, done=s.done) for s in steps],
        product_done=pd,
        product_total=pt,
        sales_done=sd,
        sales_total=st,
    )
```

**Đếm sản phẩm:** `product_service.list_products` cần `storage` và dựng cả ảnh, không phù hợp để chỉ đếm. Thêm vào `companies/product_service.py` hàm nhẹ sau (đã được `_journey` ở trên dùng):

```python
async def count_company_products(session: AsyncSession, company_id: uuid.UUID) -> int:
    """Số sản phẩm của công ty (đếm thuần, không dựng ảnh/dịch)."""
    return int(
        await session.scalar(
            select(func.count()).select_from(Product).where(Product.company_id == company_id)
        )
        or 0
    )
```

Trong `exporter_dashboard`, tính các ô trước rồi gọi `_journey(session, user, company_id, (completeness, verification, savings, rfqs))` và gán `journey=`; bỏ `copilot=` và khóa `"copilot"` trong dict dấu vân tay (thay bằng `"journey": dashboard.journey.model_dump()`).

- [ ] **Step 7: Chạy test dashboard**

Run: `cd backend && uv run pytest app/modules/dashboard -v && uv run ruff check . && uv run ruff format --check . && uv run mypy app`
Expected: PASS; sửa mọi test cũ còn tham chiếu `copilot` (chỉ sửa lệnh tham chiếu, không xóa test kiểm hành vi khác).

- [ ] **Step 8: Sinh client API**

Run: `cd frontend && npm run generate:api`
Expected: `frontend/lib/api/schema.d.ts` có `JourneyOut`; `ExporterDashboard` không còn `copilot`.

- [ ] **Step 9: Commit**

```bash
git add backend/app/modules/dashboard backend/app/modules/markets/report_service.py backend/app/modules/companies/product_service.py frontend/lib/api
git commit -m "N1: hàm next_step và hành trình seller trong dashboard"
```

---

### Task 2: Khung hành trình FE và trang "Hành trình" (N1, N3, N9 phần khung)

**Files:**
- Create: `frontend/lib/journey.ts`
- Create: `frontend/lib/journey.test.ts`
- Create: `frontend/components/JourneyHome.tsx`
- Create: `frontend/components/JourneyRail.tsx`
- Modify: `frontend/components/SellerWorkspace.tsx` (thay `navItems`/`toolLinks`/sidebar bằng `JourneyRail`; chuyển Gói dịch vụ/Thông báo vào menu avatar)
- Modify: `frontend/components/ExporterDashboard.tsx` (dùng ô "Hành trình"; bỏ ô trợ lý; gộp tiến độ)
- Modify: `frontend/lib/dashboardApi.ts` (xóa hint `no_copilot_questions` nếu không còn dùng)

**Interfaces:**
- Consumes: `ExporterDashboardData['journey']` (`next_step`, `steps[{key,track,done}]`, `product_done/total`, `sales_done/total`) từ client sinh tự động ở Task 1.
- Produces:
  - `STEP_META: Record<StepKey, { label: string; hint: string; tab: WorkspaceTabId | null; href: string | null }>` trong `frontend/lib/journey.ts`; `StepKey = 'company'|'products'|'evidence'|'verification'|'market'|'tariff'|'requests'|'services'`.
  - `nextAfter(current: StepKey, steps: {key:string; done:boolean}[]): StepKey | null` (bước kế tiếp theo thứ tự cố định, bỏ qua không điều kiện — phục vụ nút "Tiếp theo").
  - `<JourneyRail steps activeKey onSelect />` và `<JourneyHome />`.

Bảng `STEP_META` (nhãn tiếng Việt, đã tránh "AI"/"tuân thủ"):

| key | label | tab (WorkspaceTabId) | href |
|---|---|---|---|
| company | Hồ sơ công ty | `profile` | — |
| products | Sản phẩm | `products` | — |
| evidence | Nhà máy và chứng nhận | `licenses` | — |
| verification | Xác minh | `verification` | — |
| market | Chọn thị trường | `report` | — |
| tariff | Tính thuế và xuất xứ | — | `/tools/tariff` |
| requests | Request và báo giá | `rfq` | — |
| services | Dịch vụ hỗ trợ | — | `/tools/origin` |

(`tab: null` + `href` → bước mở trang công cụ ngoài workspace; `services` tạm trỏ tới công cụ xuất xứ cho đến khi có nhà cung cấp dịch vụ.)

- [ ] **Step 1: Viết test cho `journey.ts`**

```ts
// frontend/lib/journey.test.ts
import { describe, expect, it } from 'vitest';
import { nextAfter, STEP_META, STEP_ORDER } from './journey';

describe('journey', () => {
  it('có đủ 8 bước theo thứ tự cố định và mỗi bước có đích', () => {
    expect(STEP_ORDER).toEqual(['company', 'products', 'evidence', 'verification', 'market', 'tariff', 'requests', 'services']);
    for (const key of STEP_ORDER) {
      const meta = STEP_META[key];
      expect(meta.tab !== null || meta.href !== null).toBe(true);
    }
  });

  it('nextAfter trả bước kế tiếp, và null ở bước cuối', () => {
    expect(nextAfter('company')).toBe('products');
    expect(nextAfter('requests')).toBe('services');
    expect(nextAfter('services')).toBeNull();
  });

  it('nhãn không chứa "AI" hay "tuân thủ"', () => {
    for (const key of STEP_ORDER) {
      expect(STEP_META[key].label).not.toMatch(/\bAI\b|tuân thủ/i);
    }
  });
});
```

Run: `cd frontend && npx vitest run lib/journey.test.ts` → Expected: FAIL (module không tồn tại).

- [ ] **Step 2: Viết `journey.ts`**

```ts
// frontend/lib/journey.ts
// Hành trình seller (N1): siêu dữ liệu từng bước. Thứ tự và khoá khớp backend dashboard/journey.py.
import type { WorkspaceTabId } from '../components/SellerWorkspace';

export type StepKey = 'company' | 'products' | 'evidence' | 'verification' | 'market' | 'tariff' | 'requests' | 'services';

export const STEP_ORDER: StepKey[] = ['company', 'products', 'evidence', 'verification', 'market', 'tariff', 'requests', 'services'];

export const STEP_META: Record<StepKey, { label: string; hint: string; tab: WorkspaceTabId | null; href: string | null }> = {
  company: { label: 'Hồ sơ công ty', hint: 'Điền thông tin cơ bản để buyer biết bạn là ai.', tab: 'profile', href: null },
  products: { label: 'Sản phẩm', hint: 'Thêm sản phẩm bạn muốn bán.', tab: 'products', href: null },
  evidence: { label: 'Nhà máy và chứng nhận', hint: 'Tải chứng nhận để tăng độ tin cậy.', tab: 'licenses', href: null },
  verification: { label: 'Xác minh', hint: 'Gửi hồ sơ để được xác minh và hiện trong danh bạ.', tab: 'verification', href: null },
  market: { label: 'Chọn thị trường', hint: 'Xem thị trường phù hợp cho sản phẩm của bạn.', tab: 'report', href: null },
  tariff: { label: 'Tính thuế và xuất xứ', hint: 'Biết trước thuế nhập khẩu và giấy tờ xuất xứ.', tab: null, href: '/tools/tariff' },
  requests: { label: 'Request và báo giá', hint: 'Trả lời yêu cầu từ buyer.', tab: 'rfq', href: null },
  services: { label: 'Dịch vụ hỗ trợ', hint: 'Hải quan, logistics, kế toán thuế.', tab: null, href: '/tools/origin' },
};

export function nextAfter(current: StepKey): StepKey | null {
  const i = STEP_ORDER.indexOf(current);
  return i >= 0 && i < STEP_ORDER.length - 1 ? STEP_ORDER[i + 1] : null;
}
```

Run: `cd frontend && npx vitest run lib/journey.test.ts` → Expected: PASS.

- [ ] **Step 3: Viết `JourneyRail.tsx`**

```tsx
'use client';
// Thanh bước hành trình: rail trái (desktop) và thanh ngang cuộn (mobile 390px). Không khóa cứng bước nào.
import React from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import { STEP_META, STEP_ORDER, type StepKey } from '../lib/journey';
import type { WorkspaceTabId } from './SellerWorkspace';

export type JourneyStepState = { key: string; track: string; done: boolean };

type Props = {
  steps: JourneyStepState[];
  activeTab: WorkspaceTabId;
  onSelectTab: (tab: WorkspaceTabId) => void;
};

const TRACKS: { id: 'product' | 'sales'; title: string }[] = [
  { id: 'product', title: 'Hoàn thiện sản phẩm' },
  { id: 'sales', title: 'Bán hàng' },
];

export default function JourneyRail({ steps, activeTab, onSelectTab }: Props) {
  const { tr } = useLanguage();
  const doneOf = (key: StepKey) => steps.find((s) => s.key === key)?.done ?? false;
  const row = (key: StepKey) => {
    const meta = STEP_META[key];
    const active = meta.tab !== null && meta.tab === activeTab;
    const cls = `flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-semibold ${
      active ? 'bg-[#e6f4f2] text-[#0d766e]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;
    const mark = (
      <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${doneOf(key) ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300'}`}>
        {doneOf(key) ? <Check className="h-3 w-3" /> : STEP_ORDER.indexOf(key) + 1}
      </span>
    );
    return meta.tab ? (
      <button key={key} type="button" aria-current={active ? 'page' : undefined} onClick={() => onSelectTab(meta.tab as WorkspaceTabId)} className={cls}>
        {mark}
        <span>{tr(meta.label)}</span>
      </button>
    ) : (
      <Link key={key} href={meta.href as string} className={cls}>
        {mark}
        <span>{tr(meta.label)}</span>
      </Link>
    );
  };
  return (
    <nav aria-label={tr('Hành trình')} className="space-y-5">
      {TRACKS.map((track) => (
        <div key={track.id}>
          <p className="mb-2 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{tr(track.title)}</p>
          <div className="space-y-1">{STEP_ORDER.filter((k) => steps.find((s) => s.key === k)?.track === track.id).map(row)}</div>
        </div>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Viết `JourneyHome.tsx`** (thay `ExporterDashboard` làm nội dung tab `overview`)

```tsx
'use client';
// Trang "Hành trình" (N1, N3): MỘT việc tiếp theo, hai thanh tiến độ, vài chỉ số nhỏ.
import React, { useEffect, useState } from 'react';
import DashboardTile from './DashboardTile';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import { fetchExporterDashboard, HINTS, type ExporterDashboardData } from '../lib/dashboardApi';
import { STEP_META, type StepKey } from '../lib/journey';
import { PageLoader } from './PageLoader';
import type { WorkspaceTabId } from './SellerWorkspace';

function Bar({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold text-slate-700">
        <span>{label}</span>
        <span>{done}/{total}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-2 rounded-full bg-teal-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function JourneyHome({ onGoTab }: { onGoTab: (tab: WorkspaceTabId) => void }) {
  const { tr, language } = useLanguage();
  const [data, setData] = useState<ExporterDashboardData | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    fetchExporterDashboard().then((d) => active && setData(d));
    return () => {
      active = false;
    };
  }, []);
  if (data === undefined) return <PageLoader />;
  if (data === null) {
    return <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{tr('Không tải được bảng điều khiển. Vui lòng thử lại.')}</p>;
  }
  const money = (v: string) => new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'vi-VN', { style: 'currency', currency: 'EUR' }).format(Number(v));
  const j = data.journey;
  const next = j.next_step ? STEP_META[j.next_step as StepKey] : null;
  const big = 'text-3xl font-extrabold text-[#083832]';
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-teal-200 bg-teal-50/60 p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-teal-800">{tr('Việc tiếp theo')}</p>
        {next ? (
          <>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">{tr(next.label)}</h2>
            <p className="mt-1 text-sm text-slate-700">{tr(next.hint)}</p>
            {next.tab ? (
              <button type="button" onClick={() => onGoTab(next.tab as WorkspaceTabId)} className="mt-4 rounded-xl bg-[#083832] px-5 py-2.5 text-sm font-semibold text-white">
                {tr('Bắt đầu')}
              </button>
            ) : (
              <Link href={next.href as string} className="mt-4 inline-block rounded-xl bg-[#083832] px-5 py-2.5 text-sm font-semibold text-white">
                {tr('Bắt đầu')}
              </Link>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-700">{tr('Bạn đã hoàn thành các bước chính. Theo dõi Request mới ở mục Bán hàng.')}</p>
        )}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Bar label={tr('Hoàn thiện sản phẩm')} done={j.product_done} total={j.product_total} />
          <Bar label={tr('Bán hàng')} done={j.sales_done} total={j.sales_total} />
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <DashboardTile title="Lượt xem hồ sơ tuần này" hint={data.profile_views.empty_hint_key}>
          {data.profile_views.data && <p className={big}>{data.profile_views.data.this_week}</p>}
        </DashboardTile>
        <DashboardTile title="Request mới" hint={data.rfqs.empty_hint_key}>
          {data.rfqs.data && data.rfqs.data.total > 0 && <p className={big}>{data.rfqs.data.counts.new ?? 0}</p>}
        </DashboardTile>
        <DashboardTile title="Tiết kiệm thuế ước tính" hint={data.tariff_savings.empty_hint_key}>
          {data.tariff_savings.data && data.tariff_savings.data.runs > 0 && <p className={big}>{money(data.tariff_savings.data.total_eur)}</p>}
        </DashboardTile>
      </div>
    </div>
  );
}
```

`ExporterDashboard.tsx` giữ lại nhưng không còn được `SellerWorkspace` dùng; xóa file nếu `grep -rn "ExporterDashboard" frontend` không còn tham chiếu nào khác (kể cả test), nếu còn thì cập nhật test cho khớp `JourneyHome`.

- [ ] **Step 5: Sửa `SellerWorkspace.tsx`**

- Bỏ `navItems`, `toolLinks` và nhóm "Công cụ tuân thủ". Trong `<aside>`: thay khối `<nav>…</nav>` và khối công cụ bằng `<JourneyRail steps={journeySteps} activeTab={activeTab} onSelectTab={goTab} />`. Lấy `journeySteps` từ một `useEffect` gọi `fetchExporterDashboard()` (state `journeySteps: JourneyStepState[]`, mặc định `[]` → rail hiện đủ bước chưa tích).
- Mục "Tổng quan" (`overview`) render `<JourneyHome onGoTab={goTab} />` thay cho `<ExporterDashboard />` (giữ `VerificationStatusCard` cho tới Task 3 gộp tiến độ).
- Trên thanh mobile (`<nav aria-label="Menu exporter">`): thay nội dung bằng `<JourneyRail ... />` trong container `overflow-x-auto flex`; kiểm ở 390px.
- Trên header: thêm hai nút `Tin nhắn` (`goTab('messages')`, icon `MessageSquare`) cạnh `NotificationBell`; menu avatar thêm hai dòng `Gói dịch vụ` (`goTab('billing')`) và `Thông báo` (`goTab('notifications')`). Giữ `viewers` truy cập được từ thẻ "Lượt xem hồ sơ" (link `/exporter/profile-views` đã có).
- Mở rộng `WorkspaceTabId` không cần đổi; breadcrumb (`activeTab === 'overview'`) đổi chuỗi thành `'Hành trình'`.

- [ ] **Step 6: Thêm khóa catalog**

Thêm vào `frontend/i18n/catalog.json` (đủ `[en, fr, ja]`) các khóa mới: `Hành trình`, `Việc tiếp theo`, `Bắt đầu`, `Hoàn thiện sản phẩm`, `Bán hàng`, `Hồ sơ công ty`, `Sản phẩm`, `Nhà máy và chứng nhận`, `Xác minh`, `Chọn thị trường`, `Tính thuế và xuất xứ`, `Request và báo giá`, `Dịch vụ hỗ trợ`, `Request mới`, `Bạn đã hoàn thành các bước chính. Theo dõi Request mới ở mục Bán hàng.` và các `hint` trong `STEP_META`. Chỉ thêm khóa chưa có (kiểm bằng `grep -c`); giữ nguyên định dạng file.

- [ ] **Step 7: Kiểm FE**

Run: `cd frontend && npm run lint && npm run typecheck && npm test`
Expected: PASS. Mở `npm run dev`, đăng nhập exporter, kiểm tay ở 1280px và 390px: rail hiện 8 bước, nút "Bắt đầu" chuyển đúng tab, không còn mục "Công cụ tuân thủ".

- [ ] **Step 8: Commit**

```bash
git add frontend
git commit -m "N1: khung hành trình seller, trang Hành trình, bỏ sidebar 11 mục"
```

---

### Task 3: Gộp tiến độ hồ sơ + xác minh và đổi nhãn (N2, N3)

**Files:**
- Modify: `frontend/components/VerificationStatusCard.tsx` (thành thẻ tiến độ gộp)
- Modify: `frontend/components/HomePage.tsx:364-377` và `frontend/context/LanguageContext.tsx:84,87,116-127,211` (nhãn trang chủ)
- Modify: `frontend/components/SellerWorkspace.tsx`, `frontend/components/app-shell/BuyerShell.tsx:43,119`, `frontend/components/PricingPlans.tsx:16`, `frontend/components/CopilotChat.tsx`, `frontend/components/SolutionsPage.tsx`, `RfqInbox.tsx`, `BuyerSellerDetail.tsx`, `BuyerDashboard.tsx`, `Conversations.tsx`, `QuotePanel.tsx`, `ProductVerification.tsx`, `SellerOnboarding.tsx`, `SupplierProfile.tsx`, `MessageSupplier.tsx` (đổi chữ "RFQ" hiển thị)
- Modify: `frontend/i18n/catalog.json`
- Create: `frontend/lib/labels.test.ts`

**Interfaces:**
- Consumes: không.
- Produces: bảng đổi nhãn (xem Step 1); không đổi hàm công khai.

Bảng đổi nhãn (chuỗi nguồn → chuỗi mới):

| Nguồn | Mới |
|---|---|
| `Công cụ tuân thủ` | `Công cụ hỗ trợ` |
| `Trợ lý AI tuân thủ` | `Trợ lý` |
| `Gửi RFQ` và các chuỗi chứa `RFQ` hiển thị | thay `RFQ` bằng `Request` (giữ nguyên tên biến, API, route) |
| `Hỗ trợ bởi AI` (vi) / `AI-Powered Assurance` (en), `features.ai` | `Trợ lý cá nhân hóa` / `Personal assistant` |
| Hero `NHÀ CUNG CẤP VIỆT NAM UY TÍN. CƠ HỘI TOÀN CẦU.`, `' từ Việt Nam cho thị trường quốc tế'`, `Nhà cung cấp Việt Nam đã xác minh` | giữ "Việt Nam" và thêm "Đông Nam Á": `NHÀ CUNG CẤP UY TÍN TỪ VIỆT NAM VÀ ĐÔNG NAM Á` / `' từ Việt Nam và Đông Nam Á cho thị trường quốc tế'` |

- [ ] **Step 1: Viết test không còn nhãn cũ**

```ts
// frontend/lib/labels.test.ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', 'components');
const files = readdirSync(root, { recursive: true, withFileTypes: false } as never) as string[];
const sources = files.filter((f) => f.endsWith('.tsx')).map((f) => [f, readFileSync(join(root, f), 'utf8')] as const);

describe('nhãn hiển thị', () => {
  it('không còn "Trợ lý AI tuân thủ" hay "Công cụ tuân thủ" trong component', () => {
    for (const [name, src] of sources) {
      expect(src, name).not.toMatch(/Trợ lý AI tuân thủ|Công cụ tuân thủ/);
    }
  });
  it('không còn chữ "RFQ" trong chuỗi hiển thị (tr("…"))', () => {
    for (const [name, src] of sources) {
      const shown = [...src.matchAll(/tr\((["'`])([^"'`]*)\1/g)].map((m) => m[2]);
      expect(shown.filter((s) => /\bRFQ\b/.test(s)), name).toEqual([]);
    }
  });
});
```

Run: `cd frontend && npx vitest run lib/labels.test.ts` → Expected: FAIL (liệt kê file còn nhãn cũ).

- [ ] **Step 2: Đổi chuỗi theo bảng**

Với mỗi file trong danh sách: thay chuỗi nguồn bằng chuỗi mới trong `tr("…")` và các hằng nhãn; không đổi tên biến/route/API. Với mỗi chuỗi mới, thêm khóa vào `catalog.json` (en/fr/ja); giữ khóa cũ (không xóa) để không vỡ nơi khác. Sửa `LanguageContext.tsx` các dòng đã nêu (vi và en: `features.ai` en = `Personal assistant`).

- [ ] **Step 3: Gộp tiến độ**

Trong `VerificationStatusCard.tsx`: hiển thị MỘT thẻ "Hồ sơ và xác minh" gồm % hoàn thiện (từ `company.profile_completeness_score`), trạng thái xác minh (`STATUS_BADGE`) và một nút (`Hoàn thiện hồ sơ` hoặc `Xem tiến trình xác minh` theo trạng thái). Xóa khỏi `JourneyHome` mọi ô riêng "Hoàn thiện hồ sơ"/"Xác minh" (đã không có sau Task 2); chỉ còn thẻ này ở tab `overview`.

- [ ] **Step 4: Chạy test**

Run: `cd frontend && npx vitest run lib/labels.test.ts && npm run lint && npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "N2: đổi nhãn Trợ lý, Công cụ hỗ trợ, Request; gộp tiến độ hồ sơ và xác minh"
```

---

### Task 4: Máy tính thuế — test tái hiện và cờ "chưa có trích dẫn nguồn" (N6b)

**Files:**
- Modify: `backend/app/modules/compliance/calculators.py` (`TariffLineData`, `TariffResult`, `tariff_savings`)
- Modify: `backend/app/modules/compliance/schemas.py` (thêm trường vào schema kết quả thuế)
- Modify: `backend/app/modules/compliance/service.py` (truyền cờ khi dựng `TariffLineData`)
- Modify: `backend/app/modules/compliance/tests/test_tariff_calculator.py`
- Modify: `backend/app/modules/compliance/tests/test_tariff_api.py`
- Modify: `frontend/components/TariffCalculator.tsx:141-166`

**Interfaces:**
- Consumes: `TariffLineData`/`TariffResult` hiện có (`calculators.py:33-58`).
- Produces: trường `citation_missing: bool` (mặc định `True`) trên `TariffLineData` và `TariffResult`; `tariff_savings` chép từ `line.citation_missing`. `TariffLineData.citation_missing` là True khi dòng thuế chưa có thông tin điều khoản (hiện tại luôn True vì chưa có cột điều khoản — sẽ đổi ở C3 khi có dữ liệu).

- [ ] **Step 1: Test tái hiện (fail trước)**

Thêm vào `test_tariff_calculator.py` (dùng hằng/helper đã có trong file để dựng `TariffLineData`; nếu file không có helper thì dựng trực tiếp như dưới):

```python
from decimal import Decimal

from app.modules.compliance.calculators import TariffLineData, tariff_savings
from app.modules.compliance.models import DutyType


def _line(**kw: object) -> TariffLineData:
    base: dict[str, object] = {
        "duty_type": DutyType.ad_valorem,
        "mfn_rate": Decimal("10"),
        "evfta_rate_current": Decimal("0"),
        "quota_required": False,
        "quota_note": None,
        "condition_note": None,
    }
    base.update(kw)
    return TariffLineData(**base)  # type: ignore[arg-type]


def test_zero_percent_preferential_rate_is_flagged_as_missing_citation() -> None:
    """Ca demo 2: ô xanh 0% không được trơ trọi; phải biết là chưa có trích dẫn nguồn."""
    result = tariff_savings(_line(), 1, Decimal("50000"), None)
    assert result.status == "ok"
    assert result.evfta_rate == Decimal("0")
    assert result.citation_missing is True


def test_quota_line_still_needs_review_not_zero() -> None:
    result = tariff_savings(_line(quota_required=True), 1, Decimal("50000"), None)
    assert result.status == "needs_review"
    assert result.evfta_rate is None
```

Run: `cd backend && uv run pytest app/modules/compliance/tests/test_tariff_calculator.py -k "citation or quota_line" -v`
Expected: FAIL (`citation_missing` không tồn tại).

- [ ] **Step 2: Cài đặt tối thiểu**

`calculators.py`: thêm `citation_missing: bool = True` (có mặc định, đặt SAU các trường mặc định hiện có) vào `TariffLineData` và `TariffResult`; trong `tariff_savings`, ở nhánh `"ok"` thêm `citation_missing=line.citation_missing`. Giữ `unsupported`/`needs_review` với mặc định.

`schemas.py`: thêm `citation_missing: bool = True` vào schema trả kết quả thuế (class dùng `evfta_rate`; tìm bằng `grep -n "evfta_rate" backend/app/modules/compliance/schemas.py`). `service.py`: chỗ gán trường kết quả thuế từ `TariffResult`, thêm `citation_missing=result.citation_missing` (tìm bằng `grep -n "evfta_duty=" backend/app/modules/compliance/service.py`).

- [ ] **Step 3: Test API phản chiếu cờ (đặt cạnh test API hiện có; tái dùng fixture seed dòng thuế đã duyệt của file)**

```python
async def test_tariff_result_exposes_citation_missing(...) -> None:
    # Dùng đúng fixture/seed và URL mà các test `ok` khác trong file đang dùng, rồi:
    body = response.json()
    assert body["status"] == "ok"
    assert body["citation_missing"] is True
```

(Chép khung từ test thuế `ok` gần nhất trong `test_tariff_api.py`; chỉ thêm hai dòng khẳng định cuối.)

- [ ] **Step 4: FE hiển thị cờ**

Trong `TariffCalculator.tsx` ngay dưới nhãn `Thuế ưu đãi · …` (dòng ~158-165) thêm:

```tsx
{result.citation_missing && (
  <p data-testid="citation-missing" className="mt-1 text-xs font-semibold text-amber-800">
    {tr('Chưa có trích dẫn nguồn (điều khoản, ngày ký, danh mục) cho mức thuế này. Hãy đối chiếu trước khi dùng.')}
  </p>
)}
```

Thêm khóa catalog cho chuỗi trên. Chạy `npm run generate:api` trước.

- [ ] **Step 5: Chạy toàn bộ test compliance và FE**

Run: `cd backend && uv run pytest app/modules/compliance -q && uv run ruff check . && uv run mypy app`; `cd frontend && npm run generate:api && npm run lint && npm run typecheck && npm test`
Expected: PASS (golden test cũ không đổi vì thêm trường có mặc định).

- [ ] **Step 6: Commit**

```bash
git add backend frontend
git commit -m "N6b: cờ citation_missing cho thuế ưu đãi chưa có trích dẫn nguồn"
```

---

### Task 5: Benchmark cước và bảo hiểm (N6a backend)

**Files:**
- Create: `backend/alembic/versions/0057_shipping_benchmarks.py`
- Modify: `backend/app/modules/compliance/models.py` (thêm `FreightBenchmark`, `InsuranceBenchmark`)
- Create: `backend/app/modules/compliance/benchmarks.py` (hàm thuần lọc/chọn)
- Modify: `backend/app/modules/compliance/schemas.py` (`ShippingHintsOut`)
- Modify: `backend/app/modules/compliance/service.py` (`shipping_hints`)
- Modify: `backend/app/modules/compliance/router.py` (`GET /api/public/shipping-hints`)
- Create: `backend/app/modules/compliance/tests/test_shipping_hints.py`

**Interfaces:**
- Consumes: `app.core.db.Base`, kiểu `Mapped`/`mapped_column`, mẫu bảng trong `compliance/models.py`.
- Produces:
  - Bảng `freight_benchmarks(id uuid pk, origin_port varchar(64), dest_country varchar(2), dest_port varchar(64) null, container_type varchar(16), cargo_class varchar(16), price_low numeric(12,2), price_typical numeric(12,2), price_high numeric(12,2), currency varchar(3), valid_from date, valid_until date, source varchar(255), reviewed_by uuid null → users.id, reviewed_at timestamptz null, check price_low<=price_typical<=price_high, check container_type in (20GP,40GP,40HC,20RF,40RF), check cargo_class in (dry,reefer,hazard))`.
  - Bảng `insurance_benchmarks(id uuid pk, cargo_class varchar(16), rate_percent numeric(6,4), basis varchar(16) in (cif,invoice), currency_note varchar(255) null, source varchar(255), reviewed_by uuid null, reviewed_at timestamptz null, valid_from date, valid_until date)`.
  - Hàm thuần `usable_freight(rows, today) -> list`: giữ dòng có `reviewed_by` khác None và `valid_from <= today <= valid_until`.
  - API công khai `GET /api/public/shipping-hints?dest_country=DE&cargo_class=dry` → `ShippingHintsOut{freight: list[FreightHintOut{container_type, price_low, price_typical, price_high, currency, source, valid_until}], insurance: InsuranceHintOut | None{rate_percent, basis, source}}`. Giá trị tiền là `Decimal` serialize chuỗi theo mẫu schema hiện có của module. Không có dòng đã duyệt → `freight=[]`, `insurance=None` (không lỗi, không đoán).

- [ ] **Step 1: Test hàm thuần**

```python
# backend/app/modules/compliance/tests/test_shipping_hints.py
"""N6a: benchmark cước/bảo hiểm — chỉ dòng đã duyệt và còn hạn mới lộ ra."""

import datetime as dt
from dataclasses import dataclass
from decimal import Decimal

import pytest

from app.modules.compliance.benchmarks import usable


@dataclass
class Row:
    reviewed_by: object | None
    valid_from: dt.date
    valid_until: dt.date


TODAY = dt.date(2026, 10, 4)


@pytest.mark.parametrize(
    ("row", "shown"),
    [
        (Row("u", dt.date(2026, 10, 1), dt.date(2026, 12, 31)), True),
        (Row(None, dt.date(2026, 10, 1), dt.date(2026, 12, 31)), False),  # chưa duyệt
        (Row("u", dt.date(2026, 1, 1), dt.date(2026, 9, 30)), False),  # quá hạn
        (Row("u", dt.date(2026, 10, 5), dt.date(2026, 12, 31)), False),  # chưa hiệu lực
        (Row("u", dt.date(2026, 10, 4), dt.date(2026, 10, 4)), True),  # biên: đúng hôm nay
    ],
)
def test_usable_requires_review_and_validity(row: Row, shown: bool) -> None:
    assert (usable([row], TODAY) == [row]) is shown
```

Run: `cd backend && uv run pytest app/modules/compliance/tests/test_shipping_hints.py -v` → Expected: FAIL (module không có).

- [ ] **Step 2: Hàm thuần**

```python
# backend/app/modules/compliance/benchmarks.py
"""Lọc benchmark cước/bảo hiểm: hàm thuần (AGENTS.md §5.3, §6.1)."""

import datetime as dt
from collections.abc import Sequence
from typing import Protocol, TypeVar


class _Reviewed(Protocol):
    reviewed_by: object | None
    valid_from: dt.date
    valid_until: dt.date


T = TypeVar("T", bound=_Reviewed)


def usable(rows: Sequence[T], today: dt.date) -> list[T]:
    """Chỉ dòng ĐÃ DUYỆT (`reviewed_by` khác None) và còn hiệu lực vào `today`."""
    return [r for r in rows if r.reviewed_by is not None and r.valid_from <= today <= r.valid_until]
```

Run lại → Expected: PASS.

- [ ] **Step 3: Models và migration**

Thêm vào `compliance/models.py` hai lớp `FreightBenchmark`, `InsuranceBenchmark` theo đúng cột ở mục Produces (kiểu `Numeric(12,2)`/`Numeric(6,4)`, `CheckConstraint` như mô tả, `Uuid` pk giống bảng khác trong file). Migration `0057_shipping_benchmarks.py` (`revision="0057"`, `down_revision="0056"`), tạo hai bảng bằng `op.create_table(...)` với đúng cột/ràng buộc; `downgrade` drop hai bảng. Sau đó chạy `uv run alembic revision --autogenerate -m "check"` vào file tạm để so, **đọc lại** rồi xóa file tạm, chỉ giữ file `0057` viết tay.

Run: `cd backend && uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head` (trên DB dev cục bộ).
Expected: không lỗi.

- [ ] **Step 4: Test API (fail trước)** — thêm vào `test_shipping_hints.py`; dùng fixture `api_client` và `db_session` như test khác trong module (xem `test_markets_api.py` để chép cách tạo dữ liệu và `User` duyệt):

```python
async def test_hints_hide_unreviewed_and_return_empty_when_none(api_client, db_session) -> None:
    r = await api_client.get("/api/public/shipping-hints?dest_country=DE&cargo_class=dry")
    assert r.status_code == 200
    assert r.json() == {"freight": [], "insurance": None}


async def test_hints_show_only_reviewed_unexpired(api_client, db_session) -> None:
    # Chèn 2 dòng freight_benchmarks (DE, dry, 40HC): một có reviewed_by (user admin test), một không.
    # Gọi API: chỉ dòng đã duyệt xuất hiện; price_typical là chuỗi thập phân; có 'source'.
    ...
```

Điền thân test thứ hai bằng cách `INSERT` hai dòng qua `db_session.execute(text(...))` hoặc model, và `reviewed_by` = id một user admin tạo bằng helper của module (`login_as`/tạo user trong `compliance/tests/conftest.py`). Test khẳng định đúng một phần tử trả về và `price_typical == "3000.00"`.

Run → Expected: FAIL (route chưa có).

- [ ] **Step 5: Schema, service, router**

`schemas.py`:

```python
class FreightHintOut(BaseModel):
    container_type: str
    price_low: Decimal
    price_typical: Decimal
    price_high: Decimal
    currency: str
    source: str
    valid_until: dt.date


class InsuranceHintOut(BaseModel):
    rate_percent: Decimal
    basis: str
    source: str


class ShippingHintsOut(BaseModel):
    freight: list[FreightHintOut]
    insurance: InsuranceHintOut | None
```

`service.py`: `async def shipping_hints(session, dest_country: str, cargo_class: str, today: dt.date | None = None) -> ShippingHintsOut` — query `FreightBenchmark` theo `dest_country`, `cargo_class`; query `InsuranceBenchmark` theo `cargo_class`; lọc bằng `benchmarks.usable`; chọn dòng bảo hiểm có `valid_from` mới nhất; trả `ShippingHintsOut`. Router: `GET /api/public/shipping-hints` với query `dest_country: Annotated[str, Field(pattern=r"^[A-Z]{2}$")]`, `cargo_class: Literal["dry","reefer","hazard"] = "dry"`; áp dụng rate limit công khai y như các route `/api/public/*` hiện có trong `compliance/router.py` (chép decorator/dependency của route công khai gần nhất).

- [ ] **Step 6: Chạy test và lint**

Run: `cd backend && uv run pytest app/modules/compliance -q && uv run ruff check . && uv run ruff format --check . && uv run mypy app`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend
git commit -m "N6a: bảng benchmark cước/bảo hiểm và API shipping-hints (chỉ dòng đã duyệt)"
```

---

### Task 6: Máy tính thuế FE — ẩn trường thừa và gợi ý cước/bảo hiểm (N6a frontend)

**Files:**
- Modify: `frontend/components/TariffCalculator.tsx` (trường cước/bảo hiểm ở dòng ~509-555; trường tùy chọn ở ~558-577)
- Create: `frontend/lib/shippingHintsApi.ts`
- Create: `frontend/lib/shippingHintsApi.test.ts`
- Modify: `frontend/i18n/catalog.json`

**Interfaces:**
- Consumes: `GET /api/public/shipping-hints` (Task 5); client sinh tự động.
- Produces: `fetchShippingHints(destCountry: string, cargoClass?: 'dry'|'reefer'|'hazard'): Promise<ShippingHints | null>` và `insuranceFromRate(rate: string, goodsValue: number): string` (hàm thuần; làm tròn 2 số, trả chuỗi thập phân).

- [ ] **Step 1: Test hàm thuần**

```ts
// frontend/lib/shippingHintsApi.test.ts
import { describe, expect, it } from 'vitest';
import { insuranceFromRate } from './shippingHintsApi';

describe('insuranceFromRate', () => {
  it('tính phí bảo hiểm = tỷ lệ % × giá trị lô hàng, 2 chữ số', () => {
    expect(insuranceFromRate('2.0000', 50000)).toBe('1000.00');
    expect(insuranceFromRate('0.1500', 50000)).toBe('75.00');
  });
  it('không NaN khi thiếu giá trị', () => {
    expect(insuranceFromRate('2.0000', 0)).toBe('0.00');
  });
});
```

Run: `cd frontend && npx vitest run lib/shippingHintsApi.test.ts` → Expected: FAIL.

- [ ] **Step 2: Cài đặt**

```ts
// frontend/lib/shippingHintsApi.ts
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type ShippingHints = components['schemas']['ShippingHintsOut'];

export async function fetchShippingHints(destCountry: string, cargoClass: 'dry' | 'reefer' | 'hazard' = 'dry'): Promise<ShippingHints | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/public/shipping-hints', {
      params: { query: { dest_country: destCountry, cargo_class: cargoClass } },
    });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

/** Phí bảo hiểm gợi ý = rate% × giá trị lô hàng. Tính bằng số nguyên cent để tránh sai số float. */
export function insuranceFromRate(rate: string, goodsValue: number): string {
  const cents = Math.round(goodsValue * 100);
  const bp = Math.round(Number(rate) * 10000); // % → phần mười nghìn
  return (Math.round((cents * bp) / 1_000_000) / 100).toFixed(2);
}
```

Run → Expected: PASS.

- [ ] **Step 3: Sửa form**

Trong `TariffCalculator.tsx`:
- Bọc ba ô "Ngày nhập khẩu dự kiến", "Số lô hàng mỗi năm" và "Kết quả kiểm tra xuất xứ" trong một `<details>` có tiêu đề `Thêm thông tin tùy chọn` (mặc định đóng), để mặc định chỉ còn: mã HS, thị trường nhập khẩu, giá trị lô hàng, cước, bảo hiểm.
- Sau ô `freight`: khi `destination` đổi, gọi `fetchShippingHints(destination)`; nếu `hints.freight.length > 0` hiện dải gợi ý `Giá tham khảo: {low}–{high} {currency} / {container} (nguồn: {source})` và nút `Dùng giá này` điền `price_typical` vào ô cước (chỉ khi đơn vị tiền khớp tiền tệ lô hàng; nếu khác hiện hint nhưng không có nút). Nếu rỗng hiện `Chưa có giá tham khảo cho tuyến này. Nhập giá từ báo giá thật của đơn vị vận chuyển.`.
- Sau ô `insurance`: nếu `hints.insurance` có và đã nhập giá trị lô hàng, nút `Dùng {rate}% = {x}` gọi `insuranceFromRate`.
- Không có ô container trong form (container chỉ xuất hiện trong dải gợi ý).
- Thêm các chuỗi mới vào `catalog.json`.

- [ ] **Step 4: Kiểm**

Run: `cd frontend && npm run generate:api && npm run lint && npm run typecheck && npm test`
Expected: PASS. Kiểm tay: tuyến không có dữ liệu hiện lời "Chưa có giá tham khảo…", không có số nào được tự điền.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "N6a: máy tính thuế ẩn trường thừa, gợi ý cước và bảo hiểm có nguồn"
```

---

### Task 7: Checkpoint C1

**Files:** không sửa file.

- [ ] **Step 1: Chạy toàn bộ kiểm tra**

Run: `cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest -q`; `cd frontend && npm run lint && npm run typecheck && npm test`
Expected: tất cả PASS; ghi lại số test thật.

- [ ] **Step 2: Báo cáo**

Tóm tắt theo AGENTS.md §11.5 (đã làm, file đổi, kết quả thật, việc còn dở). Nêu rõ: hai điểm cần xác nhận về seed benchmark (USD/EUR và tỷ lệ bảo hiểm 2%) **chưa seed**; bảng benchmark đang rỗng nên UI hiện "chưa có giá tham khảo". Theo bộ nhớ người dùng ("chạy P0 liên tục") tiếp tục sang Task 8 trừ khi cần quyết định pháp lý/thuế/nhà cung cấp.

---

## C2: trước demo VBA 06–08/10

### Task 8: Request nhiều loại (N4)

**Files:**
- Create: `backend/alembic/versions/0058_rfq_kind.py`
- Modify: `backend/app/modules/messaging/models.py` (`RfqKind`, cột `kind`)
- Modify: `backend/app/modules/messaging/schemas.py` (`RfqIn.kind`, `RfqOut.kind`)
- Modify: `backend/app/modules/messaging/service.py:115-160` (`create_rfq`)
- Modify: `backend/app/modules/messaging/quote_service.py` (chặn báo giá cho loại ≠ quote)
- Modify: `backend/app/modules/messaging/tests/test_rfq.py`, `test_quotes.py`
- Modify: `frontend/components/RfqForm.tsx`, `RfqInbox.tsx`, `BuyerRfqs.tsx`, `lib/rfqApi.ts`

**Interfaces:**
- Consumes: `RfqIn`, `Rfq`, `create_rfq` hiện có.
- Produces: `RfqKind(StrEnum)` = `quote|meeting|packaging|quality|other`; cột `rfqs.kind` (enum PG `rfq_kind`, NOT NULL, mặc định `quote`); `RfqIn.kind: RfqKind = RfqKind.quote`; `RfqOut.kind: RfqKind`. Với `kind != quote`: `quantity`, `unit`, `incoterms`, `destination_country`, `required_date` vẫn lưu được nhưng form FE chỉ yêu cầu `product_id` + `message`; nên `RfqIn` đổi các trường này thành tùy chọn **chỉ khi** `kind != quote` (xem Step 3).

Quy tắc (validator `model_validator(mode="after")` trong `RfqIn`):
- `kind == quote`: bắt buộc `quantity`, `unit`, `incoterms`, `destination_country`, `required_date` (hành vi cũ).
- `kind != quote`: bắt buộc `message` không rỗng; các trường còn lại tùy chọn, nếu thiếu thì lưu giá trị mặc định kỹ thuật: `quantity=1`, `unit="n/a"`, `incoterms=EXW`, `destination_country="VN"`, `required_date=ngày tạo + 30`.

- [ ] **Step 1: Test (fail trước)** — thêm vào `test_rfq.py` (dùng `rfq_body`, `make_buyer`, `make_exporter` của `messaging/tests/conftest.py`; chép cách gọi từ test tạo RFQ hiện có):

```python
async def test_rfq_kind_defaults_to_quote(api_client, db_session) -> None:
    ...  # tạo RFQ như test cũ, không gửi kind → response["kind"] == "quote"


async def test_meeting_request_needs_message_not_quantity(api_client, db_session) -> None:
    ...  # body = {"product_id": ..., "kind": "meeting", "message": "Hẹn họp 15 phút"} → 201, kind == "meeting"


async def test_non_quote_request_without_message_is_rejected(api_client, db_session) -> None:
    ...  # kind "packaging" không message → 422


async def test_quote_request_still_requires_quantity(api_client, db_session) -> None:
    ...  # kind quote thiếu quantity → 422


async def test_exporter_cannot_quote_a_non_quote_request(api_client, db_session) -> None:
    ...  # tạo Request kind "quality"; seller gọi POST báo giá → 409 code "rfq_not_quotable"
```

Điền thân bằng đúng khung của các test trong file (đăng nhập buyer/exporter, gọi `/api/buyer/rfqs` hoặc URL mà test cũ dùng). Chạy: `cd backend && uv run pytest app/modules/messaging/tests/test_rfq.py -k "kind or meeting or non_quote or quote_request" -v` → Expected: FAIL.

- [ ] **Step 2: Model và migration**

`models.py`:

```python
class RfqKind(StrEnum):
    quote = "quote"
    meeting = "meeting"
    packaging = "packaging"
    quality = "quality"
    other = "other"
```

Trong `Rfq`: `kind: Mapped[RfqKind] = mapped_column(Enum(RfqKind, name="rfq_kind"), default=RfqKind.quote, server_default="quote")`. Migration `0058_rfq_kind.py` (`revision="0058"`, `down_revision="0057"`): tạo enum `rfq_kind` bằng `sa.Enum(..., name="rfq_kind").create(op.get_bind())`, thêm cột `kind` với `server_default="quote"`, `nullable=False`; `downgrade` drop cột rồi drop enum.

- [ ] **Step 3: Schema, service**

`RfqIn`: thêm `kind: RfqKind = RfqKind.quote`; chuyển `quantity`, `unit`, `incoterms`, `destination_country`, `required_date` sang tùy chọn (`| None = None`) và thêm:

```python
    @model_validator(mode="after")
    def _by_kind(self) -> "RfqIn":
        if self.kind is RfqKind.quote:
            missing = [
                f for f in ("quantity", "unit", "incoterms", "destination_country", "required_date")
                if getattr(self, f) is None
            ]
            if missing:
                raise ValueError(f"quote request requires: {', '.join(missing)}")
        elif not (self.message and self.message.strip()):
            raise ValueError("message is required for this request type")
        return self
```

(`from pydantic import model_validator`; validators `_quantity` đã nhận `None`? — `_quantity` hiện gọi `_amount(value)` bất kể; sửa `_quantity` trả `None` khi `value is None`.) `RfqOut.kind: RfqKind` (nếu `RfqOut` dựng thủ công trong `_to_out`, thêm `kind=r.kind`).

`create_rfq`: giữ kiểm ngày CHỈ khi `data.kind is RfqKind.quote`; ghép mặc định cho loại khác: `quantity=data.quantity or Decimal(1)`, `unit=data.unit or "n/a"`, `incoterms=data.incoterms or Incoterm.EXW`, `destination_country=data.destination_country or "VN"`, `required_date=data.required_date or (today + dt.timedelta(days=30))`, `kind=data.kind`. Hạn mức RFQ hằng ngày vẫn tính cho mọi loại.

`quote_service.py`: ở hàm tạo báo giá, sau khi lấy `rfq`, thêm `if rfq.kind is not RfqKind.quote: raise AppError("rfq_not_quotable", "This request type cannot be quoted", 409)`.

- [ ] **Step 4: Chạy test messaging**

Run: `cd backend && uv run pytest app/modules/messaging -q && uv run ruff check . && uv run ruff format --check . && uv run mypy app`
Expected: PASS (test cũ giữ nguyên vì `kind` mặc định `quote`).

- [ ] **Step 5: FE form theo loại**

`npm run generate:api`. Trong `RfqForm.tsx`: thêm bộ chọn `Loại Request` (5 giá trị, nhãn: `Báo giá`, `Hẹn meeting`, `Hỏi đóng gói`, `Hỏi chất lượng`, `Khác`); khi `kind==='quote'` hiện bộ trường cũ; khi khác chỉ hiện `Sản phẩm` + `Nội dung` (bắt buộc). `lib/rfqApi.ts`: thêm `kind` vào kiểu input/ output và nhãn hiển thị. `RfqInbox.tsx`/`BuyerRfqs.tsx`: hiện nhãn loại; nút "Báo giá" chỉ khi `kind==='quote'`. Thêm khóa catalog. Chạy `npm run lint && npm run typecheck && npm test`.

- [ ] **Step 6: Commit**

```bash
git add backend frontend
git commit -m "N4: Request nhiều loại (báo giá, meeting, đóng gói, chất lượng, khác)"
```

---

### Task 9: Go-to-market — schema và validator (N5 backend phần 1)

**Files:**
- Modify: `backend/app/modules/markets/schemas.py:126-142` (`ReportIn`)
- Create: `backend/app/modules/markets/orientation.py` (hàm thuần nhãn/ràng buộc ngân sách)
- Modify: `backend/app/modules/markets/report_service.py:107-146` (lưu trường mới vào `input` JSONB)
- Create: `backend/app/modules/markets/tests/test_orientation.py`
- Modify: `backend/app/modules/markets/tests/test_market_report.py`

**Interfaces:**
- Consumes: `ReportIn`, `create_report`.
- Produces:
  - `SalesOrientation = Literal["bulk","oem","own_brand","other"]`.
  - `budget_kind(orientation) -> Literal["sales","brand"]`: `own_brand` → `"brand"`, còn lại `"sales"`.
  - `budget_required(orientation) -> bool`: True chỉ khi `own_brand`.
  - `ReportIn` thêm: `target_market: Annotated[str|None, Field(pattern=r"^([A-Z]{2}|EU)$")] = None`, `sales_orientation: SalesOrientation | None = None`, `other_text: Annotated[str|None, Field(max_length=200)] = None`, `annual_volume: Money | None = None`, `budget: Money | None = None`. Giữ `marketing_budget`, `brand_model`, `expected_revenue` để tương thích.
  - Quy tắc `model_validator`: nếu `sales_orientation` được gửi thì `expected_revenue` **bắt buộc** (> 0); `own_brand` thì `budget` bắt buộc (> 0); `other` thì `other_text` bắt buộc. Request cũ (không gửi `sales_orientation`) hành xử như trước.

- [ ] **Step 1: Test hàm thuần và validator**

```python
# backend/app/modules/markets/tests/test_orientation.py
"""N5: hướng bán quyết định ngân sách nào bắt buộc."""

from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.modules.markets.orientation import budget_kind, budget_required
from app.modules.markets.schemas import ReportIn


@pytest.mark.parametrize(
    ("orientation", "kind", "required"),
    [("bulk", "sales", False), ("oem", "sales", False), ("other", "sales", False), ("own_brand", "brand", True)],
)
def test_budget_rules(orientation: str, kind: str, required: bool) -> None:
    assert budget_kind(orientation) == kind  # type: ignore[arg-type]
    assert budget_required(orientation) is required  # type: ignore[arg-type]


def test_legacy_payload_still_valid() -> None:
    ReportIn(q="gạo")  # không có hướng bán → như cũ


def test_orientation_requires_revenue() -> None:
    with pytest.raises(ValidationError):
        ReportIn(q="gạo", sales_orientation="bulk")


def test_own_brand_requires_budget() -> None:
    with pytest.raises(ValidationError):
        ReportIn(q="gạo", sales_orientation="own_brand", expected_revenue=Decimal("100000"))
    ok = ReportIn(q="gạo", sales_orientation="own_brand", expected_revenue=Decimal("100000"), budget=Decimal("5000"))
    assert ok.budget == Decimal("5000")


def test_other_orientation_requires_text() -> None:
    with pytest.raises(ValidationError):
        ReportIn(q="gạo", sales_orientation="other", expected_revenue=Decimal("1"))


def test_zero_revenue_is_rejected_when_orientation_given() -> None:
    with pytest.raises(ValidationError):
        ReportIn(q="gạo", sales_orientation="bulk", expected_revenue=Decimal("0"))
```

Run: `cd backend && uv run pytest app/modules/markets/tests/test_orientation.py -v` → Expected: FAIL.

- [ ] **Step 2: Cài đặt**

```python
# backend/app/modules/markets/orientation.py
"""Hướng bán hàng (N5): hàm thuần quyết định loại ngân sách (AGENTS.md §5.3)."""

from typing import Literal

SalesOrientation = Literal["bulk", "oem", "own_brand", "other"]
BudgetKind = Literal["sales", "brand"]


def budget_kind(orientation: SalesOrientation) -> BudgetKind:
    """Thương hiệu riêng → ngân sách làm thương hiệu; còn lại → ngân sách bán hàng."""
    return "brand" if orientation == "own_brand" else "sales"


def budget_required(orientation: SalesOrientation) -> bool:
    return orientation == "own_brand"
```

`schemas.py`: thêm import `from app.modules.markets.orientation import SalesOrientation, budget_required`; thêm các trường vào `ReportIn` và mở rộng validator:

```python
    target_market: Annotated[str | None, Field(pattern=r"^([A-Z]{2}|EU)$")] = None
    sales_orientation: SalesOrientation | None = None
    other_text: Annotated[str | None, Field(max_length=200)] = None
    annual_volume: Money | None = None
    budget: Money | None = None

    @model_validator(mode="after")
    def _orientation_rules(self) -> "ReportIn":
        if self.sales_orientation is None:
            return self
        if not self.expected_revenue or self.expected_revenue <= 0:
            raise ValueError("expected_revenue is required and must be greater than 0")
        if budget_required(self.sales_orientation) and (not self.budget or self.budget <= 0):
            raise ValueError("budget is required for own brand")
        if self.sales_orientation == "other" and not (self.other_text or "").strip():
            raise ValueError("other_text is required when orientation is other")
        return self
```

`report_service.create_report`: trong dict `input` thêm `"target_market": data.target_market, "sales_orientation": data.sales_orientation, "other_text": data.other_text, "annual_volume": _str(data.annual_volume), "budget": _str(data.budget)`; khi `sales_orientation` có mặt, đặt `brand_model` suy ra cho logic cũ: `own_brand`→`own_brand`, `oem`→`oem`, còn lại → `None` (không đổi `branding_advice`).

- [ ] **Step 3: Test API** — thêm vào `test_market_report.py` (chép khung tạo báo cáo hiện có): gửi `sales_orientation="own_brand"` thiếu `budget` → 422; đủ trường → 201 và `GET` báo cáo cho thấy `input` được lưu (kiểm qua `db_session` truy `MarketReport.input["sales_orientation"]`).

Run: `cd backend && uv run pytest app/modules/markets -q && uv run ruff check . && uv run ruff format --check . && uv run mypy app`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend
git commit -m "N5: ReportIn hỏi hướng bán, doanh thu bắt buộc, ngân sách theo hướng bán"
```

---

### Task 10: Go-to-market — định vị, `market_insights` và cấu trúc báo cáo mới (N5 backend phần 2)

**Files:**
- Create: `backend/alembic/versions/0059_market_insights.py`
- Modify: `backend/app/modules/markets/models.py` (`MarketInsight`)
- Create: `backend/app/modules/markets/positioning.py` (hàm thuần điểm định vị)
- Create: `backend/app/modules/markets/tests/test_positioning.py`
- Modify: `backend/app/modules/markets/report.py` (`SECTIONS`, `SECTION_TITLES`)
- Modify: `backend/app/modules/markets/report_service.py` (dựng mục `positioning`, `segments`, đọc `market_insights`)
- Modify: `backend/app/modules/markets/schemas.py` (`PositioningOut` trong `ReportOut`)
- Modify: `backend/app/modules/markets/tests/test_market_report.py`

**Interfaces:**
- Consumes: `ReportIn` mới (Task 9), `MarketReport.input`, `report.SECTIONS`.
- Produces:
  - Bảng `market_insights(id uuid pk, country varchar(2), hs_prefix varchar(6), segment varchar(32), note_vi text, note_en text, source varchar(255), reviewed_by uuid null, reviewed_at timestamptz null, created_at)`; `segment` ∈ `horeca|retail|industrial_kitchen|consumer_asian|consumer_european|general`.
  - `positioning.score(capacity: CapacityInput) -> PositioningResult` (hàm thuần): `CapacityInput{annual_volume: Decimal|None, certification_count: int, verified: bool, has_export_history: bool, has_brand_budget: bool}`; `PositioningResult{score: Decimal (0–100, 1 chữ số thập phân), axes: dict[str, Decimal]}` với bốn trục `volume`, `certification`, `trust`, `experience` mỗi trục 0–100, `score` = trung bình bốn trục. Ngưỡng: `volume` = min(100, annual_volume/1000)·... (xem Step 2 code).
  - `SECTIONS` mới (thứ tự): `positioning, market, recommendations, segments, opportunities, summary_next`? — **dùng đúng**: `("positioning","summary","recommendations","segments","competition","compliance","branding","risks","next_steps")`; `SUMMARY_SECTIONS` đổi thành `("positioning","summary","recommendations")`. Mục `market` (bức tranh thị trường dài) bị loại khỏi `SECTIONS` (gộp vào `summary` ngắn). Mục `segments`: chỉ liệt kê `market_insights` đã duyệt khớp `country`/`hs_prefix`; không có thì text rỗng + cờ `empty_hint`.
  - `ReportOut.positioning: PositioningOut | None` (`score`, `axes`) để FE vẽ biểu đồ.

- [ ] **Step 1: Test hàm thuần định vị**

```python
# backend/app/modules/markets/tests/test_positioning.py
from decimal import Decimal

from app.modules.markets.positioning import CapacityInput, score


def test_empty_capacity_scores_zero() -> None:
    r = score(CapacityInput(None, 0, False, False, False))
    assert r.score == Decimal("0.0")
    assert set(r.axes) == {"volume", "certification", "trust", "experience"}


def test_axes_are_bounded_0_to_100() -> None:
    r = score(CapacityInput(Decimal("10000000"), 50, True, True, True))
    assert all(Decimal(0) <= v <= Decimal(100) for v in r.axes.values())
    assert r.score <= Decimal("100.0")


def test_verified_and_certified_beats_unverified() -> None:
    low = score(CapacityInput(Decimal("100"), 0, False, False, False))
    high = score(CapacityInput(Decimal("100"), 3, True, True, False))
    assert high.score > low.score
```

Run → Expected: FAIL.

- [ ] **Step 2: Cài đặt hàm thuần**

```python
# backend/app/modules/markets/positioning.py
"""Điểm định vị và năng lực (N5): hàm thuần, không DB/HTTP (AGENTS.md §5.3).

Bốn trục 0–100; điểm tổng là trung bình. Ngưỡng là quy ước hiển thị, không phải dữ liệu luật.
"""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

HUNDRED = Decimal(100)
VOLUME_FULL = Decimal(1000)  # tấn/năm đạt 100 điểm trục sản lượng
CERT_FULL = 3  # số chứng nhận đạt 100 điểm


@dataclass(frozen=True)
class CapacityInput:
    annual_volume: Decimal | None
    certification_count: int
    verified: bool
    has_export_history: bool
    has_brand_budget: bool


@dataclass(frozen=True)
class PositioningResult:
    score: Decimal
    axes: dict[str, Decimal]


def _clamp(value: Decimal) -> Decimal:
    return max(Decimal(0), min(HUNDRED, value))


def score(c: CapacityInput) -> PositioningResult:
    volume = _clamp((c.annual_volume or Decimal(0)) / VOLUME_FULL * HUNDRED)
    cert = _clamp(Decimal(c.certification_count) / Decimal(CERT_FULL) * HUNDRED)
    trust = HUNDRED if c.verified else Decimal(0)
    experience = Decimal(50) * (int(c.has_export_history) + int(c.has_brand_budget))
    axes = {"volume": volume, "certification": cert, "trust": trust, "experience": experience}
    total = (sum(axes.values()) / Decimal(len(axes))).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
    return PositioningResult(score=total, axes={k: v.quantize(Decimal("0.1")) for k, v in axes.items()})
```

Run → Expected: PASS.

- [ ] **Step 3: Model + migration `market_insights`** (như Task 5 Step 3, `0059`, `down_revision="0058"`, cột đúng mục Produces, check `segment` trong danh sách).

- [ ] **Step 4: Test mục báo cáo mới (fail trước)** — thêm vào `test_market_report.py` (chép khung tạo báo cáo; `GET /api/exporter/market-reports/{id}` hoặc URL hiện có):

```python
async def test_report_sections_start_with_positioning(...) -> None:
    ...  # sau khi tạo và chạy báo cáo: [s["key"] for s in body["sections"]][0] == "positioning"
    ...  # body["positioning"]["score"] là chuỗi thập phân; có 4 trục


async def test_segments_empty_when_no_reviewed_insight(...) -> None:
    ...  # mục "segments": text == "" và không bịa nội dung; có insight CHƯA duyệt trong DB vẫn không lộ


async def test_segments_show_only_reviewed_insight(...) -> None:
    ...  # chèn 1 market_insights đã duyệt khớp country/hs_prefix → text chứa note_vi, đúng 1 mục
```

Run → Expected: FAIL.

- [ ] **Step 5: Cài đặt cấu trúc mới**

`report.py`: đặt `SECTIONS = ("positioning","summary","recommendations","segments","competition","compliance","branding","risks","next_steps")`, `SUMMARY_SECTIONS = ("positioning","summary","recommendations")`; trong `SECTION_TITLES` (vi, en) thêm `positioning`: `Định vị và năng lực` / `Positioning and capacity` (thay tiêu đề cũ của `positioning` là "Định vị giá và năng lực"), `segments`: `Phân khúc thị trường` / `Market segments`; bỏ khóa `market`. Kiểm `grep -rn '"market"' backend/app/modules/markets` để sửa mọi chỗ còn dùng khóa `market` (template lời văn, PDF, test cũ).

`report_service.py`: trong `run_report`, tính `CapacityInput` từ `row.input` (`annual_volume`), số chứng nhận (gọi service module `compliance`/`verification` hiện có để lấy số bằng chứng đã duyệt — tìm hàm trả danh sách bằng chứng của công ty bằng `grep -n "def .*evidence" backend/app/modules/compliance/service.py`, chỉ dùng số đếm), trạng thái xác minh (`companies.get_verification_state`), lịch sử xuất khẩu (trường hồ sơ công ty có sẵn hoặc `False` nếu chưa có), `budget` có mặt; lưu `PositioningResult` vào `metrics["positioning"]`. Mục `segments`: truy `MarketInsight` có `reviewed_by IS NOT NULL`, khớp `country` ∈ top thị trường và `hs_prefix` là tiền tố của mã HS báo cáo; ghép `note_vi`/`note_en` (theo `language`) thành text; không có dòng → text rỗng. Lời văn do model viết vẫn chỉ qua placeholder `{metric_key}` (không đổi cơ chế); mục `segments` là văn bản người duyệt, không đi qua model.

`schemas.py`: thêm `PositioningOut{score: Decimal, axes: dict[str, Decimal]}` và `ReportOut.positioning: PositioningOut | None = None`; `_out` điền từ `row.metrics`.

- [ ] **Step 6: Chạy test + eval**

Run: `cd backend && uv run pytest app/modules/markets -q && uv run ruff check . && uv run ruff format --check . && uv run mypy app`
Expected: PASS. Nếu sửa prompt/logic truy xuất của trợ lý thì chạy `uv run python -m app.modules.copilot.eval` và nêu chênh lệch (AGENTS.md §6.11); task này không đụng prompt trợ lý nên không bắt buộc.

- [ ] **Step 7: Commit**

```bash
git add backend
git commit -m "N5: báo cáo go-to-market bắt đầu bằng định vị, thêm market_insights đã duyệt"
```

---

### Task 11: Go-to-market — form hỏi theo bước và biểu đồ định vị (N5 frontend)

**Files:**
- Modify: `frontend/components/MarketReportPanel.tsx` (form ~294-340, submit ~252-270)
- Create: `frontend/lib/orientation.ts`
- Create: `frontend/lib/orientation.test.ts`
- Create: `frontend/components/PositioningChart.tsx`
- Modify: `frontend/components/SellerWorkspace.tsx` (xóa link `Gợi ý thị trường EU`: đã gỡ ở Task 2; kiểm lại)
- Modify: `frontend/i18n/catalog.json`

**Interfaces:**
- Consumes: `ReportIn` mới và `ReportOut.positioning` (client sinh tự động); sản phẩm của công ty (`productsList` truyền vào `MarketReportPanel`).
- Produces: `budgetLabel(o: Orientation): string`; `budgetRequired(o): boolean`; `validateStep(step: 1|2|3, v: FormValues): string | null` (thông báo lỗi tiếng Việt hoặc `null`); `<PositioningChart axes />` (radar SVG thuần, không thư viện mới).

- [ ] **Step 1: Test hàm thuần**

```ts
// frontend/lib/orientation.test.ts
import { describe, expect, it } from 'vitest';
import { budgetLabel, budgetRequired, validateStep } from './orientation';

describe('orientation', () => {
  it('nhãn ngân sách theo hướng bán', () => {
    expect(budgetLabel('own_brand')).toBe('Ngân sách làm thương hiệu');
    expect(budgetLabel('bulk')).toBe('Ngân sách bán hàng');
    expect(budgetLabel('oem')).toBe('Ngân sách bán hàng');
  });
  it('chỉ thương hiệu riêng bắt buộc ngân sách', () => {
    expect(budgetRequired('own_brand')).toBe(true);
    expect(budgetRequired('oem')).toBe(false);
  });
  it('bước 1 cần sản phẩm và hướng bán; bước 2 cần doanh thu > 0', () => {
    expect(validateStep(1, { productId: '', orientation: null } as never)).not.toBeNull();
    expect(validateStep(1, { productId: 'p1', orientation: 'bulk' } as never)).toBeNull();
    expect(validateStep(2, { expectedRevenue: '', orientation: 'bulk' } as never)).not.toBeNull();
    expect(validateStep(2, { expectedRevenue: '100000', orientation: 'own_brand', budget: '' } as never)).not.toBeNull();
    expect(validateStep(2, { expectedRevenue: '100000', orientation: 'own_brand', budget: '5000' } as never)).toBeNull();
  });
});
```

Run: `cd frontend && npx vitest run lib/orientation.test.ts` → Expected: FAIL.

- [ ] **Step 2: Cài đặt**

```ts
// frontend/lib/orientation.ts
export type Orientation = 'bulk' | 'oem' | 'own_brand' | 'other';

export type FormValues = {
  productId: string;
  targetMarket: string; // 'EU' | mã nước | ''
  orientation: Orientation | null;
  otherText: string;
  expectedRevenue: string;
  annualVolume: string;
  budget: string;
};

export function budgetLabel(o: Orientation): string {
  return o === 'own_brand' ? 'Ngân sách làm thương hiệu' : 'Ngân sách bán hàng';
}

export function budgetRequired(o: Orientation): boolean {
  return o === 'own_brand';
}

const positive = (s: string) => /^[0-9]+$/.test(s) && Number(s) > 0;

export function validateStep(step: 1 | 2 | 3, v: FormValues): string | null {
  if (step === 1) {
    if (!v.productId) return 'Chọn sản phẩm.';
    if (!v.orientation) return 'Chọn định hướng bán hàng.';
    if (v.orientation === 'other' && !v.otherText.trim()) return 'Mô tả định hướng bán hàng của bạn.';
    return null;
  }
  if (step === 2) {
    if (!positive(v.expectedRevenue)) return 'Nhập doanh thu xuất khẩu dự kiến (EUR/năm).';
    if (v.orientation && budgetRequired(v.orientation) && !positive(v.budget)) return 'Nhập ngân sách làm thương hiệu (EUR/năm).';
    return null;
  }
  return null;
}
```

Run → Expected: PASS.

- [ ] **Step 3: Sửa `MarketReportPanel.tsx`**

Thay form một khối bằng bước `1 → 2 → 3` (state `step`, `values: FormValues`): Bước 1 (Định hướng): chọn sản phẩm (bỏ ô tên sản phẩm `q`), thị trường quan tâm (`EU`/một nước/`Chưa biết` → `targetMarket` rỗng), định hướng bán 4 lựa chọn + ô tự điền khi chọn `other`. Bước 2 (Mục tiêu): doanh thu dự kiến (bắt buộc), sản lượng/năm, và ô ngân sách với nhãn `budgetLabel(values.orientation)`; **ẩn** ô ngân sách khi `bulk` hoặc `oem` (không bắt buộc, cho phép thêm bằng nút `Thêm ngân sách bán hàng`). Bước 3 (Năng lực): hiển thị thông tin lấy từ hồ sơ (chỉ đọc) và nút `Tạo báo cáo`. Mỗi nút `Tiếp` gọi `validateStep` và hiện lỗi bằng `role="alert"`. Body gửi lên: `product_id`, `target_market` (null nếu rỗng), `sales_orientation`, `other_text`, `expected_revenue`, `annual_volume`, `budget`, `language`.

`PositioningChart.tsx`: radar bốn trục bằng SVG thuần (đa giác 4 đỉnh, giá trị 0–100 từ `positioning.axes`), có `role="img"` + `aria-label` mô tả số liệu và bảng văn bản ẩn cho trình đọc màn hình; không thêm thư viện. Hiển thị ngay dưới tiêu đề mục `Định vị và năng lực` trong kết quả báo cáo; ô tương tác: rê/focus từng trục hiện giá trị.

Khi mục `segments` có `text` rỗng, hiện `Chưa có dữ liệu thị trường cho nhóm hàng này.` (chuỗi catalog), không để trống.

- [ ] **Step 4: Kiểm**

Run: `cd frontend && npm run generate:api && npm run lint && npm run typecheck && npm test`
Expected: PASS. Kiểm tay 390px: form đi được qua 3 bước; chọn "Thương hiệu riêng" bắt buộc ngân sách; chọn "Bán thô" ẩn ngân sách thương hiệu.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "N5: form go-to-market theo bước, ngân sách theo hướng bán, biểu đồ định vị"
```

---

### Task 12: Giới hạn gói Basic 3 sản phẩm (N8)

**Files:**
- Modify: `backend/app/core/entitlements.py` (hook `limit_for`, hằng `MAX_PRODUCTS`, `MORE_PRODUCTS`)
- Create: `backend/alembic/versions/0060_plan_limits.py`
- Modify: `backend/app/modules/billing/models.py` (`PlanLimit`)
- Modify: `backend/app/modules/billing/service.py` (`limit_for`)
- Modify: `backend/app/main.py:49` (đăng ký hook cạnh `entitlements.register`)
- Modify: `backend/app/modules/companies/product_service.py:321-340` (`create_product`)
- Create: `backend/app/modules/billing/tests/test_plan_limits.py`
- Modify: `backend/app/modules/companies/tests/` (test tạo sản phẩm thứ 4; tìm file bằng `ls backend/app/modules/companies/tests | grep product`)

**Interfaces:**
- Consumes: `entitlements.register`/`has_feature` (mẫu hiện có); `Entitlement`, `BillingItem` trong `billing/models.py`.
- Produces:
  - `entitlements.MAX_PRODUCTS = "max_products"`, `entitlements.MORE_PRODUCTS = "more_products"` (thêm vào `FEATURES`).
  - `entitlements.register_limit(provider) -> provider` và `async def limit_for(session, company_id, key) -> int | None` (None = không giới hạn; mặc định chưa đăng ký → `None`).
  - Bảng `plan_limits(key varchar(32) pk, free_limit int not null, check free_limit >= 0)` seed `('max_products', 3)` trong chính migration `0060`.
  - `billing.service.limit_for(session, company_id, key) -> int | None`: nếu công ty có entitlement `more_products` còn hiệu lực → `None`; ngược lại → `free_limit` của `key` (không có dòng → `None`).
  - `create_product` ném `AppError("product_limit_reached", "...", 409)` khi `count >= limit`.

- [ ] **Step 1: Test hook thuần (fail trước)**

```python
# backend/app/modules/billing/tests/test_plan_limits.py
import uuid

import pytest

from app.core import entitlements


async def test_limit_for_defaults_to_unlimited_when_no_provider(db_session) -> None:  # type: ignore[no-untyped-def]
    previous = entitlements.register_limit(entitlements._no_limit)
    try:
        assert await entitlements.limit_for(db_session, uuid.uuid4(), entitlements.MAX_PRODUCTS) is None
    finally:
        entitlements.register_limit(previous)


async def test_provider_value_is_returned(db_session) -> None:  # type: ignore[no-untyped-def]
    async def provider(session, company_id, key):  # type: ignore[no-untyped-def]
        return 3

    previous = entitlements.register_limit(provider)
    try:
        assert await entitlements.limit_for(db_session, uuid.uuid4(), entitlements.MAX_PRODUCTS) == 3
    finally:
        entitlements.register_limit(previous)
```

Run: `cd backend && uv run pytest app/modules/billing/tests/test_plan_limits.py -v` → Expected: FAIL.

- [ ] **Step 2: Hook trong `entitlements.py`**

Thêm sau `has_feature`:

```python
MAX_PRODUCTS = "max_products"
MORE_PRODUCTS = "more_products"

LimitProvider = Callable[[AsyncSession, uuid.UUID, str], Awaitable[int | None]]


async def _no_limit(session: AsyncSession, company_id: uuid.UUID, key: str) -> int | None:
    return None


_limit_provider: LimitProvider = _no_limit


def register_limit(provider: LimitProvider) -> LimitProvider:
    """Đặt nguồn giới hạn (billing lúc khởi động). Trả về nguồn cũ để khôi phục."""
    global _limit_provider
    previous, _limit_provider = _limit_provider, provider
    return previous


async def limit_for(session: AsyncSession, company_id: uuid.UUID, key: str) -> int | None:
    """Giới hạn số lượng của `key`; None = không giới hạn."""
    return await _limit_provider(session, company_id, key)
```

Và đổi `FEATURES = (GTM_REPORT_FULL, PROFILE_VIEWERS_FULL, VERIFICATION_ENHANCED, MORE_PRODUCTS)` **sau** khi định nghĩa `MORE_PRODUCTS` (di chuyển hai hằng lên đầu file cùng nhóm hằng khác). Run test → Expected: PASS.

- [ ] **Step 3: Model, migration, `billing.service.limit_for`**

`billing/models.py`: `class PlanLimit(Base)`: `key: str` pk `String(32)`, `free_limit: int`, check `free_limit >= 0`. Migration `0060_plan_limits.py` (`down_revision="0059"`): `op.create_table("plan_limits", ...)` rồi `op.execute("INSERT INTO plan_limits (key, free_limit) VALUES ('max_products', 3)")`; `downgrade` drop bảng.

`billing/service.py` (cạnh `has_entitlement`, dòng ~250):

```python
async def limit_for(session: AsyncSession, company_id: uuid.UUID, key: str) -> int | None:
    """None = không giới hạn: công ty có quyền `more_products` hoặc `key` chưa cấu hình."""
    if key == entitlements.MAX_PRODUCTS and await has_entitlement(
        session, company_id, entitlements.MORE_PRODUCTS
    ):
        return None
    row = await session.get(PlanLimit, key)
    return row.free_limit if row else None
```

(`from app.core import entitlements` và `PlanLimit` import nếu chưa có.) `main.py`: ngay sau dòng đăng ký `has_feature` (dòng 49), thêm `entitlements.register_limit(billing_service.limit_for)` theo đúng cách `has_entitlement` đang được đăng ký ở đó.

- [ ] **Step 4: Test chặn tạo sản phẩm (fail trước)**

Trong file test sản phẩm của `companies` (chép helper tạo công ty + body sản phẩm từ test tạo sản phẩm hiện có):

```python
async def test_fourth_product_is_blocked_on_basic_plan(api_client, db_session) -> None:  # type: ignore[no-untyped-def]
    # đăng ký provider thật qua app startup đã có; tạo 3 sản phẩm → 201 cả ba, sản phẩm thứ 4 → 409
    ...
    assert r.status_code == 409
    assert r.json()["code"] == "product_limit_reached"


async def test_editing_existing_product_not_blocked_at_limit(api_client, db_session) -> None:  # type: ignore[no-untyped-def]
    ...  # đã 3 sản phẩm, PATCH sản phẩm đầu → 200


async def test_more_products_entitlement_lifts_the_limit(api_client, db_session) -> None:  # type: ignore[no-untyped-def]
    ...  # chèn Entitlement(company_id, feature="more_products", valid_until tương lai) → sản phẩm thứ 4 → 201
```

Điền thân theo khung hiện có (đăng nhập exporter, `POST /api/exporter/products` hoặc URL mà test hiện dùng; mã lỗi đọc từ cấu trúc `AppError` — kiểm `app/core/errors.py` để chép đúng khóa `code`). Run → Expected: FAIL.

- [ ] **Step 5: Chặn trong `create_product`**

Ở đầu `create_product` (sau `_owned_exporter`):

```python
    limit = await entitlements.limit_for(session, company.id, entitlements.MAX_PRODUCTS)
    if limit is not None:
        count = await count_company_products(session, company.id)
        if count >= limit:
            raise AppError(
                "product_limit_reached",
                f"Your plan allows up to {limit} products. Upgrade to add more.",
                409,
            )
```

(`count_company_products` đã thêm ở Task 1; import `entitlements` từ `app.core`.) Không áp giới hạn cho `update_product`/`delete_product`.

- [ ] **Step 6: FE**

Trong `ProductDialog.tsx`/nơi gọi tạo sản phẩm: khi API trả `409` với `code === 'product_limit_reached'` hiện `Gói hiện tại cho phép tối đa 3 sản phẩm. Nâng cấp gói để thêm sản phẩm.` kèm nút `Xem gói dịch vụ` (mở tab `billing`). Thêm khóa catalog. `npm run generate:api && npm run lint && npm run typecheck && npm test`.

- [ ] **Step 7: Chạy test và commit**

Run: `cd backend && uv run pytest app/modules/billing app/modules/companies -q && uv run ruff check . && uv run ruff format --check . && uv run mypy app`
Expected: PASS.

```bash
git add backend frontend
git commit -m "N8: giới hạn gói Basic 3 sản phẩm qua hook limit_for, mở khóa bằng entitlement"
```

---

### Task 13: Giao diện buyer kiểu Ankorstore/Faire (N7)

**Files:**
- Modify: `frontend/components/HomePage.tsx`, `FeaturedSuppliers.tsx`, `SupplierDirectory.tsx`
- Create: `frontend/components/CategoryStrip.tsx`
- Create: `frontend/components/ProductTile.tsx`
- Create: `frontend/lib/categories.ts` + `frontend/lib/categories.test.ts`
- Modify: `frontend/app/[locale]/(public)/suppliers/page.tsx` (nếu cần truyền bộ lọc nhóm hàng)
- Modify: `backend/scripts/` — script seed dữ liệu synthetic demo (tìm script seed demo hiện có bằng `ls backend/scripts`; chỉ mở rộng nếu đã có, ngược lại bỏ bước dữ liệu và ghi vào báo cáo checkpoint)
- Modify: `frontend/i18n/catalog.json`

**Interfaces:**
- Consumes: API danh bạ công khai hiện có (`/api/public/suppliers`, `/api/public/products` — xác nhận đường dẫn bằng `grep -rn "public/suppliers\|public/products" frontend/lib`); chỉ công ty `verified` (AGENTS.md §6.10).
- Produces: `CATEGORIES: { key: string; label: string; industry: string }[]` (nhóm hàng từ taxonomy ngành sẵn có của hồ sơ; không bịa nhóm mới ngoài danh sách ngành hiện có) và `filterByCategory<T extends { industry?: string | null }>(items: T[], key: string | null): T[]`.

- [ ] **Step 1: Test hàm thuần**

```ts
// frontend/lib/categories.test.ts
import { describe, expect, it } from 'vitest';
import { filterByCategory } from './categories';

describe('filterByCategory', () => {
  const items = [{ industry: 'seafood' }, { industry: 'coffee' }, { industry: null }];
  it('null = tất cả', () => expect(filterByCategory(items, null)).toHaveLength(3));
  it('lọc theo ngành', () => expect(filterByCategory(items, 'coffee')).toEqual([{ industry: 'coffee' }]));
  it('khóa lạ → rỗng, không lỗi', () => expect(filterByCategory(items, 'zzz')).toEqual([]));
});
```

Run: `cd frontend && npx vitest run lib/categories.test.ts` → Expected: FAIL.

- [ ] **Step 2: Cài đặt** `categories.ts` với `CATEGORIES` lấy khóa ngành từ danh sách ngành hiện có (đọc `frontend/lib/` tìm hằng danh sách ngành của hồ sơ công ty: `grep -rn "industry" frontend/lib | head`; dùng đúng khóa đó) và hàm:

```ts
export function filterByCategory<T extends { industry?: string | null }>(items: T[], key: string | null): T[] {
  return key === null ? items : items.filter((i) => i.industry === key);
}
```

Run → Expected: PASS.

- [ ] **Step 3: Giao diện**

- `HomePage.tsx`: hero giữ cấu trúc, đổi chữ theo Task 3; thêm `<CategoryStrip />` (dải nhóm hàng cuộn ngang, bấm nhóm → `/suppliers?category=<key>`); khối "Nhà cung cấp nổi bật" dùng `ProductTile` ưu tiên ảnh sản phẩm + tên + nhà cung cấp + huy hiệu `Đã xác minh` duy nhất (bỏ cấp L0–L3 trên thẻ công khai, đúng feedback H3).
- `SupplierDirectory.tsx`: đọc `category` từ query, áp `filterByCategory`; tiêu đề `Nhà cung cấp đã xác minh từ Việt Nam và Đông Nam Á`.
- `ProductTile.tsx`: thẻ vuông, ảnh `object-cover`, tên, giá tham khảo nếu có (dùng `formatPrice`), nút `Gửi Request`.
- Trang vẫn render phía server như hiện tại (không thêm `'use client'` cho trang `app/**/page.tsx`); chỉ component tương tác mới `'use client'`.
- Dữ liệu synthetic: nếu đã có script seed demo, thêm ≥ 8 công ty/≥ 20 sản phẩm mẫu `verified` gắn nhãn tên có tiền tố `[Mẫu]` trong `company.legal_name` và chỉ chạy khi `ENV != prod`; nếu không có script, bỏ bước này và nêu trong báo cáo.

- [ ] **Step 4: Kiểm**

Run: `cd frontend && npm run lint && npm run typecheck && npm test`
Expected: PASS. Kiểm tay: trang chủ và `/suppliers` ở 390px không tràn ngang; link không có `#`; tương phản chữ ≥ 4.5:1.

- [ ] **Step 5: Commit**

```bash
git add frontend backend/scripts
git commit -m "N7: giao diện buyer kiểu Ankorstore, duyệt theo nhóm hàng, bỏ cấp L0–L3 trên thẻ công khai"
```

---

### Task 14: Nút "Tiếp theo" xuyên suốt (N9)

**Files:**
- Create: `frontend/components/JourneyNextButton.tsx`
- Modify: `frontend/components/SellerWorkspace.tsx` (chèn nút dưới mỗi tab thuộc hành trình)
- Modify: `frontend/lib/journey.ts` (thêm `stepForTab`)
- Modify: `frontend/lib/journey.test.ts`

**Interfaces:**
- Consumes: `STEP_META`, `STEP_ORDER`, `nextAfter` (Task 2).
- Produces: `stepForTab(tab: WorkspaceTabId): StepKey | null` (ánh xạ ngược `STEP_META.tab`); `<JourneyNextButton current: StepKey onGoTab />` hiện `Tiếp theo: {label}` hoặc không hiện ở bước cuối.

- [ ] **Step 1: Test (fail trước)** — thêm vào `journey.test.ts`:

```ts
import { stepForTab } from './journey';

it('stepForTab ánh xạ tab về bước, tab ngoài hành trình → null', () => {
  expect(stepForTab('profile')).toBe('company');
  expect(stepForTab('licenses')).toBe('evidence');
  expect(stepForTab('messages')).toBeNull();
  expect(stepForTab('billing')).toBeNull();
});
```

Run → Expected: FAIL.

- [ ] **Step 2: Cài đặt**

```ts
// thêm vào frontend/lib/journey.ts
export function stepForTab(tab: WorkspaceTabId): StepKey | null {
  return STEP_ORDER.find((k) => STEP_META[k].tab === tab) ?? null;
}
```

```tsx
// frontend/components/JourneyNextButton.tsx
'use client';
import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import { nextAfter, STEP_META, type StepKey } from '../lib/journey';
import type { WorkspaceTabId } from './SellerWorkspace';

export default function JourneyNextButton({ current, onGoTab }: { current: StepKey; onGoTab: (tab: WorkspaceTabId) => void }) {
  const { tr } = useLanguage();
  const next = nextAfter(current);
  if (!next) return null;
  const meta = STEP_META[next];
  const cls = 'inline-flex items-center gap-2 rounded-xl bg-[#083832] px-5 py-2.5 text-sm font-semibold text-white';
  const body = (
    <>
      <span>{tr('Tiếp theo')}: {tr(meta.label)}</span>
      <ArrowRight className="h-4 w-4" aria-hidden />
    </>
  );
  return (
    <div className="mt-8 flex justify-end">
      {meta.tab ? (
        <button type="button" className={cls} onClick={() => onGoTab(meta.tab as WorkspaceTabId)}>{body}</button>
      ) : (
        <Link href={meta.href as string} className={cls}>{body}</Link>
      )}
    </div>
  );
}
```

Run `npx vitest run lib/journey.test.ts` → Expected: PASS.

- [ ] **Step 3: Gắn vào workspace**

Cuối `<main>` của `SellerWorkspace.tsx` thêm:

```tsx
{(() => {
  const step = stepForTab(activeTab);
  return step ? <JourneyNextButton current={step} onGoTab={goTab} /> : null;
})()}
```

(import `stepForTab`, `JourneyNextButton`.) Thêm khóa catalog `Tiếp theo`. Chạy `npm run lint && npm run typecheck && npm test`.

- [ ] **Step 4: Commit**

```bash
git add frontend
git commit -m "N9: nút Tiếp theo xuyên suốt các bước hành trình"
```

---

### Task 15: Checkpoint C2 và kiểm cuối

**Files:** không sửa file.

- [ ] **Step 1: Chạy toàn bộ**

Run: `cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest -q`; `cd frontend && npm run generate:api && npm run lint && npm run typecheck && npm test`
Expected: PASS; ghi số test thật. Rà tay luồng exporter ở 390px: Hành trình → Sản phẩm (thêm 3 sản phẩm, sản phẩm 4 bị chặn) → Chọn thị trường (3 bước) → Tính thuế (gợi ý cước hiện "chưa có giá tham khảo" nếu bảng rỗng) → Request (5 loại).

- [ ] **Step 2: Báo cáo checkpoint (AGENTS.md §11.5)**

Tóm tắt đã làm, file đổi, kết quả thật, việc dở/rủi ro. Nêu rõ: bảng `freight_benchmarks`, `insurance_benchmarks`, `market_insights` đang **rỗng** (cần người duyệt nhập); xác nhận USD/EUR và tỷ lệ bảo hiểm 2% trước khi seed; chuỗi "Trợ lý AI tuân thủ" lệch AGENTS.md §6.8 (cần người có quyền sửa); C3 (trích dẫn điều khoản/ngày ký/danh mục) còn lại; EUDR/truy xuất vùng trồng/agent-readiness nằm ngoài phạm vi. Dừng tại đây chờ người dùng review.
