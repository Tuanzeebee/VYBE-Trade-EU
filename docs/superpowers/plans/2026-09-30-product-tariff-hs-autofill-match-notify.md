# Thuế tại sản phẩm, tự điền tên từ mã HS, thông báo nhà cung cấp mới — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seller thấy thuế MFN so với EVFTA ngay tại sản phẩm, tên sản phẩm tự điền khi chọn mã HS, và buyer nhận thông báo `new_match` khi có nhà cung cấp phù hợp vừa được xác minh.

**Architecture:** Việc 2 chỉ sửa frontend (`ProductsEditor`). Việc 1 thêm hàm chỉ đọc `preview_tariff` trong `compliance/service.py` (dùng lại `lookup_lines` và hàm thuần `tariff_savings`, không ghi `compliance_checks`), một route exporter, và component `TariffPanel` dùng ở form sản phẩm và tab Sản phẩm. Việc 3 thêm một handler cho `VerificationStatusChanged` trong `notifications/handlers.py`, gọi một hàm mới trong `companies/product_service.py` để tìm buyer khớp ngành.

**Tech Stack:** FastAPI, Pydantic v2, SQLAlchemy 2.0 async, pytest (Postgres thật); Next.js, React, vitest, `tr()` + `frontend/i18n/catalog.json` (cơ chế dịch đang dùng cho các component này).

**Spec:** `docs/superpowers/specs/2026-09-30-product-tariff-hs-autofill-match-notify-design.md`

**Ghi chú thực thi:** commit chỉ khi người dùng cho phép (bước Commit ghi kèm thông điệp gợi ý, cuối message thêm dòng `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Mã backlog chưa xác định nên tiền tố commit tạm là `HS-autofill`, `Tariff-preview`, `New-match`; đổi sang mã backlog thật nếu người dùng cho biết.

## Global Constraints

- Không thêm bảng, migration hay dependency (AGENTS.md §2, CLAUDE.md).
- Không tự điền thuế suất, ngưỡng hay điều khoản từ kiến thức của model. Chỉ dùng dòng có `reviewed_by` (AGENTS.md §6.1–6.2).
- `unsupported` và `needs_review` không có con số nào; hạn ngạch hoặc thuế không phải ad valorem → `needs_review`, không bao giờ 0% (§6.3–6.4).
- Tiền và tỷ lệ dùng `Decimal`, không float (§5.7).
- Router mỏng, không SQL trong router; module khác chỉ gọi `service` (§5.1–5.2). Test dùng Postgres thật (§9).
- Chuỗi hiển thị trong frontend đi qua `tr()` và có bản dịch trong `frontend/i18n/catalog.json` (thứ tự mảng `[en, fr, ja]`); không viết interface tay trùng với schema backend, chạy `npm run generate:api` sau khi sửa backend.
- Luồng exporter dùng được ở bề rộng 390px; độ tương phản chữ ≥ 4.5:1.
- Không dùng float; không gửi PII vào log. Thông báo `new_match` chỉ chứa `company_id`, `company_name`, `slug` (tên doanh nghiệp công khai của công ty đã xác minh).
- Kết thúc mỗi Task chạy lint, typecheck và test của phần đã sửa và báo kết quả thật.

## Review Focus

- Buyer không có ngành nguồn hàng nào: không nhận thông báo, không lỗi (Task 4).
- Cùng sự kiện phát lại hai lần: buyer chỉ có một thông báo `new_match` cho công ty đó (Task 4).
- Công ty vừa được xác minh nhưng bị ẩn hoặc đã hết hạn tại thời điểm xử lý: không thông báo (Task 4).
- Mã HS 8 số mà chỉ nhóm 6 số có dòng thuế: preview vẫn lùi về 6 số như máy tính (Task 2).
- Mã HS sai định dạng ("12ab"): 422, không phải 500 (Task 2).
- Tên đã tự điền bị seller sửa tay rồi đổi mã HS: giữ tên seller sửa (Task 1).
- Mạng lỗi khi tra thuế: hiện thông báo lỗi nhẹ, không làm hỏng form sản phẩm (Task 3).
- Tên HS dài hơn 255 ký tự: cắt còn 255 để khớp `maxLength` của ô tên (Task 1).

---

## Cấu trúc file

| File | Việc |
|---|---|
| `frontend/components/ProductsEditor.tsx` | Sửa: tự điền tên khi chọn mã HS; hiện `TariffPanel` tóm tắt |
| `frontend/tests/products-editor.test.tsx` | Sửa: test tự điền tên và hiện panel |
| `backend/app/modules/compliance/schemas.py` | Sửa: thêm `TariffPreviewOut` |
| `backend/app/modules/compliance/service.py` | Sửa: thêm `preview_tariff` |
| `backend/app/modules/compliance/router.py` | Sửa: thêm route `GET /api/exporter/tariff-preview` |
| `backend/app/modules/compliance/tests/test_tariff_preview.py` | Tạo: test backend |
| `frontend/lib/tariffPreviewApi.ts` | Tạo: gọi API preview |
| `frontend/components/TariffPanel.tsx` | Tạo: hiển thị thuế (tóm tắt và đầy đủ) |
| `frontend/tests/tariff-panel.test.tsx` | Tạo: test component |
| `frontend/components/SellerWorkspace.tsx` | Sửa: nút xem thuế ở thẻ sản phẩm, tab Sản phẩm |
| `frontend/tests/seller-workspace-products.test.tsx` | Sửa: test mở thuế |
| `frontend/i18n/catalog.json` | Sửa: thêm chuỗi mới |
| `frontend/lib/api/schema.d.ts`, `openapi.json` | Sinh tự động |
| `backend/app/modules/companies/product_service.py` | Sửa: thêm `find_buyers_for_new_supplier` |
| `backend/app/modules/notifications/center.py` | Sửa: thêm `has_new_match` |
| `backend/app/modules/notifications/handlers.py` | Sửa: thêm `on_new_supplier_verified`, đăng ký |
| `backend/app/modules/notifications/tests/test_new_match.py` | Tạo: test handler |
| `frontend/lib/notificationsApi.ts` | Sửa: câu mô tả `new_match` có tên công ty |
| `frontend/tests/notification-bell.test.tsx` | Sửa: thêm ca có tên công ty |

---

### Task 1: Tự điền tên sản phẩm khi chọn mã HS (frontend)

**Files:**
- Modify: `frontend/components/ProductsEditor.tsx:5,82-88,138-143`
- Test: `frontend/tests/products-editor.test.tsx`

**Interfaces:**
- Consumes: `HsCodeOption` từ `HsCodePicker` (có `name_vi`, `name_en`); `useLanguage().language` (`'vi' | 'en' | ...`).
- Produces: hành vi: `product.name` tự điền, không đổi chữ ký component.

- [ ] **Step 1: Viết 4 test thất bại**

Thêm vào cuối `describe('ProductsEditor', ...)` trong `frontend/tests/products-editor.test.tsx` (trước dấu `});` đóng cuối), và thêm hằng `COFFEE` cạnh `RICE`:

```tsx
const COFFEE = {
  code: '090111',
  formatted: '0901.11',
  name_vi: 'Cà phê chưa rang, chưa khử caffeine',
  name_en: 'Coffee, not roasted, not decaffeinated',
  chapter: '09',
  category: 'agriculture',
  supported: true,
};

function stubHs(options: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(options), { status: 200, headers: { 'content-type': 'application/json' } })),
  );
}

async function pick(query: string, optionName: RegExp) {
  fireEvent.change(within(card()).getByRole('combobox', { name: /Mã HS/ }), { target: { value: query } });
  fireEvent.click(await screen.findByRole('option', { name: optionName }));
}
```

và các test:

```tsx
  it('chọn mã HS khi ô tên còn trống: tên tự điền bằng tên mã HS', async () => {
    stubHs([RICE]);
    render(<Harness initial={[emptyDraft()]} />);
    await pick('gao', /1006\.30/);
    expect(latest[0].name).toBe('Gạo xát');
    expect((within(card()).getByLabelText(/Tên sản phẩm/) as HTMLInputElement).value).toBe('Gạo xát');
  });

  it('tên seller đã gõ không bị ghi đè khi chọn mã HS', async () => {
    stubHs([RICE]);
    render(<Harness initial={[{ ...emptyDraft(), name: 'Gạo ST25' }]} />);
    await pick('gao', /1006\.30/);
    expect(latest[0].name).toBe('Gạo ST25');
  });

  it('đổi sang mã HS khác: tên tự điền đổi theo, nếu seller chưa sửa', async () => {
    stubHs([RICE, COFFEE]);
    render(<Harness initial={[emptyDraft()]} />);
    await pick('gao', /1006\.30/);
    await pick('ca phe', /0901\.11/);
    expect(latest[0].name).toBe('Cà phê chưa rang, chưa khử caffeine');
  });

  it('seller sửa tay tên đã tự điền rồi đổi mã HS: giữ tên seller sửa', async () => {
    stubHs([RICE, COFFEE]);
    render(<Harness initial={[emptyDraft()]} />);
    await pick('gao', /1006\.30/);
    fireEvent.change(within(card()).getByLabelText(/Tên sản phẩm/), { target: { value: 'Gạo ST25 đặc biệt' } });
    await pick('ca phe', /0901\.11/);
    expect(latest[0].name).toBe('Gạo ST25 đặc biệt');
  });
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run (trong `frontend/`): `npx vitest run tests/products-editor.test.tsx -t "tự điền|đổi sang mã HS khác|sửa tay tên"`
Expected: FAIL (`latest[0].name` là `''`).

- [ ] **Step 3: Cài đặt tối thiểu**

Trong `frontend/components/ProductsEditor.tsx`:

1. Sửa dòng import React (dòng 5) và thêm kiểu `HsCodeOption`:

```tsx
import React, { useId, useRef, useState } from 'react';
```
(đã có `useRef`; giữ nguyên) và đổi dòng 7:

```tsx
import HsCodePicker, { type HsCodeOption } from './HsCodePicker';
```

2. Trong `ProductCard`, sửa `const { tr } = useLanguage();` (dòng 82) thành:

```tsx
  const { tr, language } = useLanguage();
```

và thêm sau dòng `const set = ...` (kết thúc ở dòng 88):

```tsx
  // Tên đã tự điền từ mã HS gần nhất: chỉ tên còn đúng bằng chuỗi này mới bị thay khi đổi mã HS.
  const autoName = useRef('');

  function chooseHs(hs: HsCodeOption | null) {
    onUpdate((p) => {
      if (hs === null) return { ...p, hs: null };
      const suggested = (language === 'en' ? hs.name_en : hs.name_vi).slice(0, 255);
      const replace = p.name.trim() === '' || p.name === autoName.current;
      if (replace) autoName.current = suggested;
      return { ...p, hs, name: replace ? suggested : p.name };
    });
  }
```

3. Sửa `HsCodePicker` (dòng 138-143):

```tsx
      <HsCodePicker
        label={`${tr('Mã HS')} *`}
        required
        value={product.hs}
        onChange={chooseHs}
      />
```

- [ ] **Step 4: Chạy lại test, xác nhận đạt**

Run: `npx vitest run tests/products-editor.test.tsx tests/seller-products-step.test.tsx tests/onboarding-draft.test.tsx`
Expected: PASS (toàn bộ test trong 3 file, gồm cả test cũ).

- [ ] **Step 5: Lint và typecheck**

Run: `npm run lint && npm run typecheck`
Expected: không lỗi.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/ProductsEditor.tsx frontend/tests/products-editor.test.tsx
git commit -m "HS-autofill: chọn mã HS thì tên sản phẩm tự điền, không ghi đè tên seller đã gõ"
```

---

### Task 2: Backend xem thuế chỉ đọc (`preview_tariff` và route)

**Files:**
- Modify: `backend/app/modules/compliance/schemas.py` (thêm sau `TariffOut`, ~dòng 69)
- Modify: `backend/app/modules/compliance/service.py` (import và hàm mới sau `calculate_tariff`, ~dòng 296)
- Modify: `backend/app/modules/compliance/router.py:4,25-34,50-59`
- Test: `backend/app/modules/compliance/tests/test_tariff_preview.py` (tạo)

**Interfaces:**
- Consumes: `lookup_lines(session, code, on_date)`, `_line_data(line)`, `tariff_savings(line, lines_found, product_value, shipments)` (`compliance/service.py`, `calculators.py`); `catalog.normalize_code`, `catalog.format_code`; `require_role("exporter")`.
- Produces: `service.preview_tariff(session: AsyncSession, hs_code: str) -> TariffPreviewOut`; route `GET /api/exporter/tariff-preview?hs_code=` trả `TariffPreviewOut`:
  `status`, `hs_code`, `hs_formatted`, `mfn_rate`, `evfta_rate` (`Decimal|None`), `staging_category` (`str|None`), `zero_from` (`date|None`), `quota_note`, `condition_note`, `quota_note_en`, `condition_note_en`, `source_url` (`str|None`).

- [ ] **Step 1: Viết test thất bại**

Tạo `backend/app/modules/compliance/tests/test_tariff_preview.py`:

```python
"""GET /api/exporter/tariff-preview: xem thuế chỉ đọc, KHÔNG ghi compliance_checks.

Dòng thuế trong test là SYNTHETIC (không phải thuế suất thật)."""

import datetime as dt
import uuid
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.tests.helpers import login_as
from app.modules.compliance.tests.test_tariff_api import (
    COFFEE,
    RICE,
    TODAY,
    add_line,
    checks,
)

pytestmark = pytest.mark.usefixtures("hs_seeded")

URL = "/api/exporter/tariff-preview"
NUMBERS = ("mfn_rate", "evfta_rate", "staging_category", "zero_from")


async def preview(client: AsyncClient, hs: str) -> dict[str, Any]:
    r = await client.get(URL, params={"hs_code": hs})
    assert r.status_code == 200, r.text
    return dict(r.json())


async def as_exporter(client: AsyncClient) -> None:
    await login_as(client, "exporter", "exp@x.vn")


async def test_ok_shows_rates_schedule_and_source_without_logging_a_check(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_line(
        db_session,
        reviewer_id,
        staging_category="B5",
        zero_from=dt.date(2030, 1, 1),
        source_url="https://example.test/tariff",
        condition_note="Cần EUR.1",
    )
    await as_exporter(api_client)
    before = await checks(db_session)
    d = await preview(api_client, COFFEE)
    assert d["status"] == "ok"
    assert (d["mfn_rate"], d["evfta_rate"]) == ("12.0000", "6.0000")
    assert (d["staging_category"], d["zero_from"]) == ("B5", "2030-01-01")
    assert d["condition_note"] == "Cần EUR.1"
    assert d["source_url"] == "https://example.test/tariff"
    assert d["hs_formatted"] == "0901.11"
    assert await checks(db_session) == before  # không ghi compliance_checks


async def test_quota_is_needs_review_with_no_numbers(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_line(
        db_session,
        reviewer_id,
        hs=RICE,
        quota_required=True,
        quota_note="Hạn ngạch gạo",
        mfn_rate=Decimal("0"),
        evfta_rate_current=Decimal("0"),
        staging_category="B0",
        zero_from=dt.date(2020, 8, 1),
    )
    await as_exporter(api_client)
    d = await preview(api_client, RICE)
    assert d["status"] == "needs_review"
    assert {k: d[k] for k in NUMBERS} == dict.fromkeys(NUMBERS)  # không bao giờ trả 0%
    assert d["quota_note"] == "Hạn ngạch gạo"


async def test_unsupported_hs_has_no_numbers(api_client: AsyncClient) -> None:
    await as_exporter(api_client)
    d = await preview(api_client, "999999")
    assert d["status"] == "unsupported"
    assert {k: d[k] for k in NUMBERS} == dict.fromkeys(NUMBERS)
    assert d["source_url"] is None


async def test_unreviewed_line_is_never_exposed(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await add_line(db_session, None, source_url="https://example.test/draft")
    await as_exporter(api_client)
    d = await preview(api_client, COFFEE)
    assert d["status"] == "unsupported"
    assert d["mfn_rate"] is None and d["source_url"] is None


async def test_expired_line_is_not_used(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_line(db_session, reviewer_id, valid_until=TODAY - dt.timedelta(days=1))
    await as_exporter(api_client)
    assert (await preview(api_client, COFFEE))["status"] == "unsupported"


async def test_eight_digit_code_falls_back_to_the_six_digit_heading(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_line(db_session, reviewer_id)
    await as_exporter(api_client)
    d = await preview(api_client, "09011100")
    assert d["status"] == "ok" and d["hs_code"] == "09011100"


async def test_malformed_hs_code_is_422(api_client: AsyncClient) -> None:
    await as_exporter(api_client)
    r = await api_client.get(URL, params={"hs_code": "12ab"})
    assert r.status_code == 422


async def test_requires_a_session(api_client: AsyncClient) -> None:
    assert (await api_client.get(URL, params={"hs_code": COFFEE})).status_code == 401


@pytest.mark.parametrize("role", ["buyer", "admin"])
async def test_wrong_role_is_403(api_client: AsyncClient, role: str) -> None:
    await login_as(api_client, role, f"{role}@x.de")
    assert (await api_client.get(URL, params={"hs_code": COFFEE})).status_code == 403
```

> Trước khi chạy, mở `backend/app/modules/companies/tests/helpers.py` để xác nhận `login_as` nhận `role="admin"`. Nếu không, thay tham số `admin` bằng cách tạo admin qua `create_admin` (như `test_handlers.py`) rồi đăng nhập qua `/api/auth/login`.

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run (trong `backend/`): `uv run pytest app/modules/compliance/tests/test_tariff_preview.py -v`
Expected: FAIL (404 vì route chưa có).

- [ ] **Step 3: Thêm schema**

Trong `backend/app/modules/compliance/schemas.py`, thêm sau class `TariffOut`:

```python
class TariffPreviewOut(BaseModel):
    """Xem thuế tại sản phẩm (chỉ đọc). `unsupported` và `needs_review` không có con số nào."""

    status: Literal["ok", "unsupported", "needs_review"]
    hs_code: str
    hs_formatted: str
    mfn_rate: Decimal | None
    evfta_rate: Decimal | None
    staging_category: str | None
    zero_from: dt.date | None
    quota_note: str | None
    condition_note: str | None
    quota_note_en: str | None
    condition_note_en: str | None
    source_url: str | None
```

- [ ] **Step 4: Thêm hàm dịch vụ**

Trong `backend/app/modules/compliance/service.py`: thêm `TariffPreviewOut` vào khối import `from app.modules.compliance.schemas import (...)` (theo thứ tự chữ cái, sau `TariffOut`), thêm hằng sau `HEADING_LENGTH`:

```python
# Cơ sở tính chỉ để lấy thuế suất (%); không hiển thị tiền nào ở màn xem thuế.
_RATE_BASIS = Decimal(100)
```

và thêm hàm sau `calculate_tariff` (sau dòng `)` kết thúc hàm, trước `rank_markets_for`):

```python
async def preview_tariff(session: AsyncSession, hs_code: str) -> TariffPreviewOut:
    """Xem thuế MFN so với EVFTA của một mã HS. Chỉ đọc: KHÔNG ghi compliance_checks
    (không phải lần chạy máy tính chủ động). Dùng cùng dòng đã duyệt và cùng hàm thuần với C2."""
    code = catalog.normalize_code(hs_code)
    if code is None:
        raise AppError("invalid_hs_code", "HS code must be 6 to 8 digits", 422)
    lines = await lookup_lines(session, code, dt.datetime.now(dt.UTC).date())
    line = lines[0] if lines else None
    result = tariff_savings(
        None if line is None else _line_data(line), len(lines), _RATE_BASIS, None
    )
    ok = result.status == "ok" and line is not None
    return TariffPreviewOut(
        status=result.status,
        hs_code=code,
        hs_formatted=catalog.format_code(code),
        mfn_rate=result.mfn_rate,
        evfta_rate=result.evfta_rate,
        staging_category=line.staging_category if ok and line is not None else None,
        zero_from=line.zero_from if ok and line is not None else None,
        quota_note=result.quota_note,
        condition_note=result.condition_note,
        quota_note_en=result.quota_note_en,
        condition_note_en=result.condition_note_en,
        source_url=line.source_url if line is not None else None,
    )
```

- [ ] **Step 5: Thêm route**

Trong `backend/app/modules/compliance/router.py`: sửa dòng 4 thành `from fastapi import APIRouter, Depends, Query, UploadFile`, thêm `TariffPreviewOut` vào import từ `compliance.schemas` (sau `TariffOut`), và thêm route sau `calculate_tariff` (sau dòng 58):

```python
@router.get("/api/exporter/tariff-preview")
async def tariff_preview(
    hs_code: Annotated[str, Query(max_length=32)],
    _: Annotated[CurrentUser, Depends(require_role("exporter"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TariffPreviewOut:
    return await service.preview_tariff(session, hs_code)
```

- [ ] **Step 6: Chạy test, xác nhận đạt**

Run: `uv run pytest app/modules/compliance -q`
Expected: PASS toàn bộ test module compliance (gồm cả test mới và cũ).

- [ ] **Step 7: Lint và typecheck**

Run: `uv run ruff check . && uv run ruff format --check . && uv run mypy app`
Expected: không lỗi.

- [ ] **Step 8: Commit**

```bash
git add backend/app/modules/compliance
git commit -m "Tariff-preview: API xem thuế MFN so với EVFTA theo mã HS, chỉ đọc, không ghi compliance_checks"
```

---

### Task 3: Hiện thuế ở form sản phẩm và tab Sản phẩm (frontend)

**Files:**
- Modify: `frontend/lib/api/schema.d.ts`, `frontend/lib/api/openapi.json` (sinh tự động)
- Create: `frontend/lib/tariffPreviewApi.ts`
- Create: `frontend/components/TariffPanel.tsx`
- Modify: `frontend/components/ProductsEditor.tsx` (hiện panel tóm tắt)
- Modify: `frontend/components/SellerWorkspace.tsx:1123-1160` (nút mở thuế đầy đủ)
- Modify: `frontend/i18n/catalog.json`
- Test: `frontend/tests/tariff-panel.test.tsx` (tạo), `frontend/tests/products-editor.test.tsx`, `frontend/tests/seller-workspace-products.test.tsx`

**Interfaces:**
- Consumes: `GET /api/exporter/tariff-preview` (Task 2), kiểu `components['schemas']['TariffPreviewOut']`; `useLanguage().tr/language`.
- Produces: `getTariffPreview(hsCode: string): Promise<TariffPreview | null>`; `<TariffPanel hsCode: string; variant?: 'summary' | 'full' />`.

- [ ] **Step 1: Sinh lại client API**

Run (trong `frontend/`): `npm run generate:api`
Expected: in `generate:api — N path`; `grep -n "tariff-preview" lib/api/schema.d.ts` có kết quả và có `TariffPreviewOut`. (Script chạy `uv run python` trong `backend/`, không cần server chạy.)

- [ ] **Step 2: Viết test thất bại cho component**

Tạo `frontend/tests/tariff-panel.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TariffPanel from '@/components/TariffPanel';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const base = {
  hs_code: '090111',
  hs_formatted: '0901.11',
  mfn_rate: null,
  evfta_rate: null,
  staging_category: null,
  zero_from: null,
  quota_note: null,
  condition_note: null,
  quota_note_en: null,
  condition_note_en: null,
  source_url: null,
};

function serve(body: unknown, status = 200) {
  const fetchMock = vi.fn(async (_req: Request) => json(status, body));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPanel(variant: 'summary' | 'full' = 'summary', hsCode = '090111') {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <TariffPanel hsCode={hsCode} variant={variant} />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

describe('TariffPanel', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('ok: hiện thuế MFN, thuế EVFTA và chênh lệch', async () => {
    serve({ ...base, status: 'ok', mfn_rate: '12.0000', evfta_rate: '6.0000' });
    renderPanel();
    expect(await screen.findByText(/MFN/)).toHaveTextContent('12');
    expect(screen.getByText(/EVFTA/)).toHaveTextContent('6');
    expect(screen.getByRole('status')).toHaveTextContent(/6/);
  });

  it('full: hiện lộ trình, năm về 0%, ghi chú điều kiện và nguồn', async () => {
    serve({
      ...base,
      status: 'ok',
      mfn_rate: '12.0000',
      evfta_rate: '6.0000',
      staging_category: 'B5',
      zero_from: '2030-01-01',
      condition_note: 'Cần EUR.1',
      source_url: 'https://example.test/tariff',
    });
    renderPanel('full');
    expect(await screen.findByText('B5')).toBeInTheDocument();
    expect(screen.getByText(/2030/)).toBeInTheDocument();
    expect(screen.getByText('Cần EUR.1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Nguồn/ })).toHaveAttribute('href', 'https://example.test/tariff');
  });

  it('needs_review: nêu lý do, không có con số thuế nào', async () => {
    serve({ ...base, status: 'needs_review', quota_note: 'Hạn ngạch gạo' });
    renderPanel();
    expect(await screen.findByText(/cần chuyên gia xem lại/i)).toBeInTheDocument();
    expect(screen.getByText('Hạn ngạch gạo')).toBeInTheDocument();
    expect(screen.queryByText(/\d+(\.\d+)?\s*%/)).not.toBeInTheDocument();
  });

  it('unsupported: nói chưa hỗ trợ, không có con số nào', async () => {
    serve({ ...base, status: 'unsupported' });
    renderPanel();
    expect(await screen.findByText(/chưa có dữ liệu thuế/i)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('mạng lỗi: báo lỗi nhẹ và cho thử lại', async () => {
    const fetchMock = vi.fn(async (_req: Request) => {
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Không tải được thông tin thuế/);
    fetchMock.mockImplementation(async () => json(200, { ...base, status: 'unsupported' }));
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('phản hồi không đúng dạng: coi là lỗi, không hiện số bậy', async () => {
    serve([{ code: '100630' }]);
    renderPanel();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('gọi đúng route với mã HS', async () => {
    const fetchMock = serve({ ...base, status: 'unsupported' });
    renderPanel('summary', '100630');
    await screen.findByText(/chưa có dữ liệu thuế/i);
    const url = new URL(fetchMock.mock.calls[0][0].url);
    expect(url.pathname).toBe('/api/exporter/tariff-preview');
    expect(url.searchParams.get('hs_code')).toBe('100630');
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận thất bại**

Run: `npx vitest run tests/tariff-panel.test.tsx`
Expected: FAIL (không tìm thấy `@/components/TariffPanel`).

- [ ] **Step 4: Viết client API**

Tạo `frontend/lib/tariffPreviewApi.ts`:

```ts
// Xem thuế MFN so với EVFTA của một mã HS ngay tại sản phẩm (chỉ đọc, không tính vào máy tính).
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type TariffPreview = components['schemas']['TariffPreviewOut'];

const STATUSES = ['ok', 'needs_review', 'unsupported'];

/** Trả null khi lỗi mạng, lỗi server hoặc phản hồi sai dạng (không hiện số nào trong các ca này). */
export async function getTariffPreview(hsCode: string): Promise<TariffPreview | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/exporter/tariff-preview', {
      params: { query: { hs_code: hsCode } },
    });
    if (!response.ok || !data || !STATUSES.includes(data.status)) return null;
    return data;
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Viết component**

Tạo `frontend/components/TariffPanel.tsx`:

```tsx
'use client';

// Thuế MFN so với EVFTA của một mã HS, hiện tại sản phẩm. Chỉ đọc số liệu đã được người duyệt luật TM duyệt.
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getTariffPreview, type TariffPreview } from '../lib/tariffPreviewApi';

interface TariffPanelProps {
  hsCode: string;
  /** summary: MFN/EVFTA gọn (form sản phẩm). full: thêm lộ trình, điều kiện, nguồn. */
  variant?: 'summary' | 'full';
}

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; data: TariffPreview };

const pct = (value: string) => `${Number(value)}%`;

export default function TariffPanel({ hsCode, variant = 'summary' }: TariffPanelProps) {
  const { tr, language } = useLanguage();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    getTariffPreview(hsCode).then((data) => {
      if (!cancelled) setState(data ? { kind: 'ready', data } : { kind: 'error' });
    });
    return () => {
      cancelled = true;
    };
  }, [hsCode, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const note = (vi: string | null, en: string | null) => (language === 'en' ? (en ?? vi) : (vi ?? en));

  const box = 'rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1.5';

  if (state.kind === 'loading') {
    return <p role="status" className={box}>{tr('Đang tra thuế…')}</p>;
  }
  if (state.kind === 'error') {
    return (
      <div role="alert" className={`${box} border-rose-200 bg-rose-50 text-rose-800`}>
        <p>{tr('Không tải được thông tin thuế.')}</p>
        <button type="button" onClick={retry} className="font-semibold underline cursor-pointer">
          {tr('Thử lại')}
        </button>
      </div>
    );
  }

  const d = state.data;
  const conditionText = note(d.condition_note, d.condition_note_en);
  const quotaText = note(d.quota_note, d.quota_note_en);

  if (d.status === 'unsupported') {
    return (
      <p role="status" className={box}>
        {tr('Mã HS này chưa có dữ liệu thuế được duyệt. Bạn vẫn lưu được sản phẩm.')}
      </p>
    );
  }

  if (d.status === 'needs_review') {
    return (
      <div role="status" className={`${box} border-amber-200 bg-amber-50 text-amber-900`}>
        <p className="font-semibold">{tr('Mã HS này cần chuyên gia xem lại thuế (hạn ngạch hoặc thuế đặc biệt).')}</p>
        {quotaText && <p>{quotaText}</p>}
        {variant === 'full' && conditionText && <p>{conditionText}</p>}
      </div>
    );
  }

  const mfn = Number(d.mfn_rate);
  const evfta = Number(d.evfta_rate);
  return (
    <div role="status" className={box}>
      <p className="font-semibold text-slate-900">
        <span>MFN {pct(d.mfn_rate ?? '0')}</span>
        {' → '}
        <span>EVFTA {pct(d.evfta_rate ?? '0')}</span>
        <span className="ml-2 font-normal text-teal-800">
          {tr('Giảm')} {Number((mfn - evfta).toFixed(4))} {tr('điểm phần trăm')}
        </span>
      </p>
      {variant === 'full' && (
        <dl className="space-y-1">
          {d.staging_category && (
            <div className="flex justify-between gap-3">
              <dt>{tr('Lộ trình cắt giảm')}</dt>
              <dd className="font-semibold">{d.staging_category}</dd>
            </div>
          )}
          {d.zero_from && (
            <div className="flex justify-between gap-3">
              <dt>{tr('Về 0% từ')}</dt>
              <dd className="font-semibold">{d.zero_from}</dd>
            </div>
          )}
        </dl>
      )}
      {variant === 'full' && conditionText && <p>{conditionText}</p>}
      {variant === 'full' && quotaText && <p>{quotaText}</p>}
      {variant === 'full' && d.source_url && (
        <a href={d.source_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-800 underline">
          {tr('Nguồn')}
        </a>
      )}
    </div>
  );
}
```

> Kiểm tra sau khi chạy test: hai đoạn `getByText(/MFN/)` và `getByText(/EVFTA/)` trong test phải khớp đúng một phần tử. Nếu nhiều phần tử khớp (do ký tự "MFN"/"EVFTA" lặp), đổi test sang `getByRole('status')` + `toHaveTextContent('MFN 12%')`, không đổi component.

- [ ] **Step 6: Thêm chuỗi vào catalog dịch**

Trong `frontend/i18n/catalog.json` thêm các khóa sau (mỗi khóa là mảng `[en, fr, ja]`, đặt cạnh khóa `"Chưa hỗ trợ máy tính"`; dùng bản tiếng Anh cho cả ba như các mục đã có):

```json
  "Đang tra thuế…": ["Checking duty…", "Checking duty…", "Checking duty…"],
  "Không tải được thông tin thuế.": ["Could not load duty information.", "Could not load duty information.", "Could not load duty information."],
  "Thử lại": ["Try again", "Try again", "Try again"],
  "Mã HS này chưa có dữ liệu thuế được duyệt. Bạn vẫn lưu được sản phẩm.": ["No reviewed duty data for this HS code yet. You can still save the product.", "No reviewed duty data for this HS code yet. You can still save the product.", "No reviewed duty data for this HS code yet. You can still save the product."],
  "Mã HS này cần chuyên gia xem lại thuế (hạn ngạch hoặc thuế đặc biệt).": ["This HS code needs expert review of duty (quota or special duty).", "This HS code needs expert review of duty (quota or special duty).", "This HS code needs expert review of duty (quota or special duty)."],
  "Giảm": ["Down", "Down", "Down"],
  "điểm phần trăm": ["percentage points", "percentage points", "percentage points"],
  "Lộ trình cắt giảm": ["Reduction schedule", "Reduction schedule", "Reduction schedule"],
  "Về 0% từ": ["Zero duty from", "Zero duty from", "Zero duty from"],
  "Nguồn": ["Source", "Source", "Source"],
  "Xem thuế MFN / EVFTA": ["View MFN / EVFTA duty", "View MFN / EVFTA duty", "View MFN / EVFTA duty"],
  "Ẩn thuế": ["Hide duty", "Hide duty", "Hide duty"]
```

Trước khi thêm, tìm `"Thử lại"`, `"Nguồn"`, `"Giảm"` trong file: nếu khóa đã tồn tại thì không thêm trùng (JSON không cho khóa trùng).

- [ ] **Step 7: Chạy test component, xác nhận đạt**

Run: `npx vitest run tests/tariff-panel.test.tsx tests/catalog.test.ts`
Expected: PASS. (Test trong `tariff-panel.test.tsx` kiểm chuỗi tiếng Việt; catalog test giữ nguyên.)

- [ ] **Step 8: Viết test thất bại cho form sản phẩm**

Thêm vào `frontend/tests/products-editor.test.tsx`:

```tsx
  it('chọn mã HS: hiện thuế MFN so với EVFTA ngay trong thẻ sản phẩm', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (req: Request) => {
        const path = new URL(req.url).pathname;
        const body =
          path === '/api/exporter/tariff-preview'
            ? {
                status: 'ok',
                hs_code: '100630',
                hs_formatted: '1006.30',
                mfn_rate: '12.0000',
                evfta_rate: '6.0000',
                staging_category: null,
                zero_from: null,
                quota_note: null,
                condition_note: null,
                quota_note_en: null,
                condition_note_en: null,
                source_url: null,
              }
            : [RICE];
        return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
      }),
    );
    render(<Harness initial={[emptyDraft()]} />);
    fireEvent.change(within(card()).getByRole('combobox', { name: /Mã HS/ }), { target: { value: 'gao' } });
    fireEvent.click(await screen.findByRole('option', { name: /1006\.30/ }));
    expect(await within(card()).findByText(/MFN 12%/)).toBeInTheDocument();
    expect(within(card()).getByText(/EVFTA 6%/)).toBeInTheDocument();
  });

  it('chưa chọn mã HS: không gọi tra thuế', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<Harness initial={[emptyDraft()]} />);
    expect(fetchMock).not.toHaveBeenCalled();
  });
```

- [ ] **Step 9: Chạy, xác nhận thất bại**

Run: `npx vitest run tests/products-editor.test.tsx -t "hiện thuế MFN|không gọi tra thuế"`
Expected: FAIL (test đầu: không thấy "MFN 12%").

- [ ] **Step 10: Gắn panel vào thẻ sản phẩm**

Trong `frontend/components/ProductsEditor.tsx`: thêm import `import TariffPanel from './TariffPanel';` cạnh import `HsCodePicker`, và ngay sau `<HsCodePicker ... />` (khối vừa sửa ở Task 1) thêm:

```tsx
      {product.hs && <TariffPanel hsCode={product.hs.code} />}
```

Các test cũ trong file này dùng `fetch` giả trả `[RICE]` cho mọi URL; panel sẽ nhận phản hồi sai dạng và hiện lỗi nhẹ (không làm hỏng các assertion hiện có). Nếu test cũ nào dùng `getByRole('alert')` sẽ bị nhiễu (test "tải ảnh lên lỗi" dùng `within(card()).findByRole('alert')` nhưng sản phẩm đó không có mã HS nên không có panel); chạy toàn bộ file để xác nhận.

- [ ] **Step 11: Chạy toàn bộ test frontend liên quan**

Run: `npx vitest run tests/products-editor.test.tsx tests/seller-products-step.test.tsx tests/seller-routes-products.test.tsx tests/onboarding-draft.test.tsx tests/hs-code-picker.test.tsx`
Expected: PASS. Nếu test cũ nào dùng `fetch` giả ném lỗi với đường dẫn lạ (như `seller-workspace-products` khi có `throw new Error('unexpected ...')`), panel bắt lỗi trong `getTariffPreview` (try/catch) nên không làm sập.

- [ ] **Step 12: Viết test thất bại cho tab Sản phẩm**

Trong `frontend/tests/seller-workspace-products.test.tsx`, sửa `serve` để trả thêm thuế:

```tsx
function serve(products: unknown[] | 'error', tariff: unknown = null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === '/api/exporter/products') {
        return products === 'error' ? json(500, {}) : json(200, products);
      }
      if (path === '/api/exporter/tariff-preview' && tariff) return json(200, tariff);
      throw new Error(`unexpected ${path}`);
    }),
  );
}
```

và thêm test:

```tsx
  it('tab Sản phẩm: bấm "Xem thuế MFN / EVFTA" mở đủ thông tin thuế của sản phẩm đó', async () => {
    serve([product()], {
      status: 'ok',
      hs_code: '100630',
      hs_formatted: '1006.30',
      mfn_rate: '12.0000',
      evfta_rate: '6.0000',
      staging_category: 'B5',
      zero_from: '2030-01-01',
      quota_note: null,
      condition_note: 'Cần EUR.1',
      quota_note_en: null,
      condition_note_en: null,
      source_url: 'https://example.test/tariff',
    });
    renderWorkspace('products');
    const heading = await screen.findByRole('heading', { name: 'Gạo thơm Jasmine' });
    const card = heading.closest('div.rounded-3xl') as HTMLElement;
    expect(within(card).queryByText(/MFN 12%/)).not.toBeInTheDocument(); // chưa bấm: chưa tra
    const toggle = within(card).getByRole('button', { name: /Xem thuế MFN/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(await within(card).findByText(/MFN 12%/)).toBeInTheDocument();
    expect(within(card).getByText('Cần EUR.1')).toBeInTheDocument();
    expect(within(card).getByText('B5')).toBeInTheDocument();
  });
```

- [ ] **Step 13: Chạy, xác nhận thất bại**

Run: `npx vitest run tests/seller-workspace-products.test.tsx -t "Xem thuế"`
Expected: FAIL (không có nút).

- [ ] **Step 14: Thêm nút và panel đầy đủ vào tab Sản phẩm**

Trong `frontend/components/SellerWorkspace.tsx`:

1. Thêm import: `import TariffPanel from './TariffPanel';` cạnh import `ProductsEditor`/`productsApi` (dòng ~12).
2. Thêm state cạnh các `useState` khác của component có `productsList` (dòng ~250):

```tsx
  const [taxOpenId, setTaxOpenId] = useState<string | null>(null);
```

3. Trong thẻ sản phẩm ở tab Sản phẩm (khối bắt đầu dòng 1153 `<div className="pt-4 mt-2">`), đổi thành:

```tsx
                    <div className="pt-4 mt-2 space-y-2">
                      <button
                        type="button"
                        aria-expanded={taxOpenId === product.id}
                        onClick={() => setTaxOpenId(taxOpenId === product.id ? null : product.id)}
                        className="w-full py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {taxOpenId === product.id ? tr("Ẩn thuế") : tr("Xem thuế MFN / EVFTA")}</button>
                      {taxOpenId === product.id && <TariffPanel hsCode={product.hs_code} variant="full" />}
                      <button 
                        onClick={() => setActiveModal('public-preview')}
                        className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {tr("Xem hiển thị B2B")}</button>
                    </div>
```

(Chỉ thay khối `<div className="pt-4 mt-2">…</div>`; giữ nguyên nút "Xem hiển thị B2B".)

- [ ] **Step 15: Chạy test, lint, typecheck**

Run: `npx vitest run && npm run lint && npm run typecheck`
Expected: PASS toàn bộ; không lỗi lint/type. (Nếu `npm test` có bước `node --test tests/dev-config.test.mjs`, chạy `npm test` thay cho `npx vitest run`.)

- [ ] **Step 16: Kiểm tra ở bề rộng 390px**

Chạy `npm run dev`, mở form onboarding bước sản phẩm và tab Sản phẩm ở bề rộng 390px, chọn mã HS đã có dữ liệu và một mã chưa hỗ trợ; xác nhận panel không tràn ngang. Ghi lại kết quả (nếu không chạy được dev server, nói rõ là chưa kiểm).

- [ ] **Step 17: Commit**

```bash
git add frontend/lib/api frontend/lib/tariffPreviewApi.ts frontend/components/TariffPanel.tsx frontend/components/ProductsEditor.tsx frontend/components/SellerWorkspace.tsx frontend/i18n/catalog.json frontend/tests
git commit -m "Tariff-preview: hiện thuế MFN so với EVFTA ở form sản phẩm và tab Sản phẩm"
```

---

### Task 4: Thông báo gợi ý nhà cung cấp mới cho buyer

**Files:**
- Modify: `backend/app/modules/companies/product_service.py` (import + hàm mới sau `list_recently_verified`, ~dòng 388)
- Modify: `backend/app/modules/notifications/center.py` (thêm `has_new_match`)
- Modify: `backend/app/modules/notifications/handlers.py:1-19,145-150`
- Modify: `frontend/lib/notificationsApi.ts:64-65`
- Modify: `frontend/i18n/catalog.json`
- Test: `backend/app/modules/notifications/tests/test_new_match.py` (tạo), `frontend/tests/notification-bell.test.tsx`

**Interfaces:**
- Consumes: `VerificationStatusChanged(company_id, old_status, new_status, ...)`; `verified_exporter_conditions(now)`, `_ref(company)` trong `product_service.py`; `Company`, `CompanyType`, `CompanySourcingCategory` (`companies/models.py`); `center.create_notification(session, user_id, type, payload, *, role, link=None, commit=True)`.
- Produces:
  - `product_service.find_buyers_for_new_supplier(session, company_id: uuid.UUID, now: datetime) -> tuple[PublicCompanyRef, list[uuid.UUID]] | None`
  - `center.has_new_match(session, user_id: uuid.UUID, company_id: uuid.UUID) -> bool`
  - `handlers.on_new_supplier_verified(event: VerificationStatusChanged) -> None`
  - Thông báo `new_match` với payload `{company_id, company_name, slug}` và link `/suppliers/{slug}`.

- [ ] **Step 1: Viết test thất bại**

Tạo `backend/app/modules/notifications/tests/test_new_match.py`:

```python
"""Exporter vừa được xác minh → buyer có nhóm hàng quan tâm trùng ngành nhận thông báo new_match."""

import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.messaging.tests.conftest import make_buyer, make_exporter, notifications_on  # noqa: F401
from app.modules.notifications import handlers
from app.modules.notifications.models import NotificationType
from app.modules.verification.events import VerificationStatusChanged

pytestmark = pytest.mark.usefixtures("notifications_on")


def verified(company_id: str, old: str = "pending") -> VerificationStatusChanged:
    return VerificationStatusChanged(
        company_id=uuid.UUID(company_id),
        old_status=old,
        new_status="verified",
        old_level="basic",
        new_level="basic",
        decision="approve",
    )


async def matches(session: AsyncSession, email: str) -> list[dict[str, Any]]:
    rows = await session.execute(
        text(
            "SELECT n.payload, n.link FROM notifications n JOIN users u ON u.id = n.user_id "
            "WHERE u.email = :e AND n.type = 'new_match' ORDER BY n.created_at"
        ),
        {"e": email},
    )
    return [{"payload": r.payload, "link": r.link} for r in rows]


async def test_matching_buyer_gets_one_notification_with_a_profile_link(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    exporter_id, _ = await make_exporter(
        api_client, db_session, legal_name="Nông sản mới", industry_sector="agriculture"
    )
    await make_buyer(api_client)  # buyer_body quan tâm agriculture và spices
    await handlers.on_new_supplier_verified(verified(exporter_id))
    [found] = await matches(db_session, "buyer@x.de")
    assert found["payload"]["company_name"] == "Nông sản mới"
    assert found["payload"]["company_id"] == exporter_id
    assert found["link"] == f"/suppliers/{found['payload']['slug']}"


async def test_buyer_with_other_categories_gets_nothing(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    exporter_id, _ = await make_exporter(api_client, db_session, industry_sector="seafood")
    await make_buyer(api_client, sourcing_categories=["textiles"])
    await handlers.on_new_supplier_verified(verified(exporter_id))
    assert await matches(db_session, "buyer@x.de") == []


async def test_buyer_without_categories_gets_nothing_and_no_error(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    exporter_id, _ = await make_exporter(api_client, db_session)
    await make_buyer(api_client, sourcing_categories=[])
    await handlers.on_new_supplier_verified(verified(exporter_id))
    assert await matches(db_session, "buyer@x.de") == []


async def test_replayed_event_does_not_duplicate(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    exporter_id, _ = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    await handlers.on_new_supplier_verified(verified(exporter_id))
    await handlers.on_new_supplier_verified(verified(exporter_id))
    assert len(await matches(db_session, "buyer@x.de")) == 1


@pytest.mark.parametrize(
    ("old", "new"), [("pending", "rejected"), ("verified", "verified"), ("unverified", "pending")]
)
async def test_only_a_fresh_transition_to_verified_notifies(
    api_client: AsyncClient, db_session: AsyncSession, old: str, new: str
) -> None:
    exporter_id, _ = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    event = VerificationStatusChanged(
        company_id=uuid.UUID(exporter_id),
        old_status=old,
        new_status=new,
        old_level="basic",
        new_level="basic",
        decision="approve",
    )
    await handlers.on_new_supplier_verified(event)
    assert await matches(db_session, "buyer@x.de") == []


async def test_hidden_or_expired_supplier_does_not_notify(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    hidden, _ = await make_exporter(api_client, db_session, "h@x.vn", legal_name="Ẩn")
    expired, _ = await make_exporter(api_client, db_session, "e@x.vn", legal_name="Hết hạn")
    await make_buyer(api_client)
    await db_session.execute(
        text("UPDATE companies SET is_hidden = true WHERE id = :id"), {"id": hidden}
    )
    await db_session.execute(
        text("UPDATE companies SET expires_at = now() - interval '1 day' WHERE id = :id"),
        {"id": expired},
    )
    await handlers.on_new_supplier_verified(verified(hidden))
    await handlers.on_new_supplier_verified(verified(expired))
    assert await matches(db_session, "buyer@x.de") == []


async def test_exporter_companies_never_receive_it(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    exporter_id, _ = await make_exporter(api_client, db_session, "a@x.vn")
    await make_exporter(api_client, db_session, "b@x.vn", legal_name="Nhà B")
    await handlers.on_new_supplier_verified(verified(exporter_id))
    assert await matches(db_session, "b@x.vn") == []
    assert NotificationType.new_match.value == "new_match"


async def test_full_flow_through_the_event_bus(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    from app.core.events import publish

    exporter_id, _ = await make_exporter(api_client, db_session)
    await make_buyer(api_client)
    await publish(verified(exporter_id))
    assert len(await matches(db_session, "buyer@x.de")) == 1
```

> Trước khi chạy: (1) mở `backend/app/core/events.py` để xác nhận `publish` là coroutine (`await publish(event)`) và tên hàm đúng; nếu khác, sửa test cuối theo chữ ký thật. (2) `make_exporter(... industry_sector=...)` truyền vào `company_body(**company)`: xác nhận `company_body` nhận `industry_sector` (test dashboard đã dùng `industry_sector="seafood"`). (3) Fixture `notifications_on` nằm trong `messaging/tests/conftest.py`; nếu pytest không thấy nó ở thư mục `notifications/tests`, chuyển fixture đó sang `backend/app/conftest.py` hoặc tạo `notifications/tests/conftest.py` chỉ import lại: `from app.modules.messaging.tests.conftest import notifications_on, hs_seeded  # noqa: F401`, thay vì import trong file test. `make_exporter` cần fixture `hs_seeded` (autouse ở conftest messaging), nên cần import cả hai.

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run (trong `backend/`): `uv run pytest app/modules/notifications/tests/test_new_match.py -v`
Expected: FAIL (`handlers` chưa có `on_new_supplier_verified`).

- [ ] **Step 3: Thêm hàm tìm buyer khớp ngành**

Trong `backend/app/modules/companies/product_service.py`: thêm `CompanySourcingCategory` vào khối `from app.modules.companies.models import (...)` (dòng 18-25, theo thứ tự chữ cái), rồi thêm sau hàm `list_recently_verified`:

```python
async def find_buyers_for_new_supplier(
    session: AsyncSession, company_id: uuid.UUID, now: datetime
) -> tuple[PublicCompanyRef, list[uuid.UUID]] | None:
    """Exporter còn hiển thị công khai (cùng điều kiện với danh bạ) và `owner_user_id` của các buyer
    có nhóm hàng quan tâm trùng ngành của nó. None nếu công ty không hiển thị hoặc chưa khai ngành."""
    company = await session.scalar(
        select(Company).where(Company.id == company_id, *verified_exporter_conditions(now))
    )
    if company is None or company.industry_sector is None:
        return None
    owners = await session.scalars(
        select(Company.owner_user_id)
        .join(CompanySourcingCategory, CompanySourcingCategory.company_id == Company.id)
        .where(
            Company.type == CompanyType.buyer,
            Company.is_hidden.is_(False),
            CompanySourcingCategory.category == company.industry_sector,
        )
        .order_by(Company.id)
    )
    return _ref(company), list(owners)
```

- [ ] **Step 4: Thêm kiểm tra chống trùng**

Trong `backend/app/modules/notifications/center.py`, thêm sau `create_notification`:

```python
async def has_new_match(
    session: AsyncSession, user_id: uuid.UUID, company_id: uuid.UUID
) -> bool:
    """Đã có thông báo new_match cho cặp (người nhận, công ty) này chưa: chống trùng khi phát lại event."""
    found = await session.scalar(
        select(Notification.id)
        .where(
            Notification.user_id == user_id,
            Notification.type == NotificationType.new_match,
            Notification.payload["company_id"].as_string() == str(company_id),
        )
        .limit(1)
    )
    return found is not None
```

- [ ] **Step 5: Thêm handler**

Trong `backend/app/modules/notifications/handlers.py`:

1. Thêm import: `import datetime as dt` (đầu file, cạnh `import logging`) và `from app.modules.companies import product_service`.
2. Thêm hàm sau `on_verification_status_changed`:

```python
async def on_new_supplier_verified(event: VerificationStatusChanged) -> None:
    """Exporter vừa chuyển sang `verified`: gợi ý cho buyer có nhóm hàng quan tâm trùng ngành
    (chỉ thông báo trong ứng dụng). Lỗi chỉ ghi log, không làm hỏng quyết định xác minh."""
    if event.new_status != "verified" or event.old_status == "verified":
        return
    try:
        async with _session_factory()() as session:
            found = await product_service.find_buyers_for_new_supplier(
                session, event.company_id, dt.datetime.now(dt.UTC)
            )
            if found is None:
                return
            supplier, buyer_user_ids = found
            for user_id in buyer_user_ids:
                if await center.has_new_match(session, user_id, supplier.id):
                    continue
                await center.create_notification(
                    session,
                    user_id,
                    NotificationType.new_match,
                    {
                        "company_id": str(supplier.id),
                        "company_name": supplier.legal_name,
                        "slug": supplier.slug,
                    },
                    role="buyer",
                    link=f"/suppliers/{supplier.slug}",
                    commit=False,
                )
            await session.commit()
    except Exception:
        log.exception("Không tạo được thông báo new_match cho công ty %s", event.company_id)
```

3. Trong `register()` thêm dòng sau `subscribe(VerificationStatusChanged, on_verification_status_changed)`:

```python
    subscribe(VerificationStatusChanged, on_new_supplier_verified)
```

- [ ] **Step 6: Chạy test, xác nhận đạt**

Run: `uv run pytest app/modules/notifications app/modules/dashboard app/modules/companies -q`
Expected: PASS (gồm test mới, test thông báo và dashboard cũ; test `test_handlers.py` không đổi vì `register()` vẫn phục vụ `on_verification_status_changed`).

- [ ] **Step 7: Lint và typecheck backend**

Run: `uv run ruff check . && uv run ruff format --check . && uv run mypy app`
Expected: không lỗi. (Kiểm ranh giới module: `grep -rn "from app.modules" backend/app/modules/notifications/handlers.py` chỉ trỏ tới `service`, `schemas`, `events`, `center`, không import `models` của module khác. `NotificationType` là model của chính notifications.)

- [ ] **Step 8: Viết test thất bại cho câu mô tả ở chuông thông báo**

Trong `frontend/tests/notification-bell.test.tsx`, ngay dưới danh sách ca dòng 135-141 (hoặc thành test riêng bên cạnh), thêm:

```tsx
  it('new_match có tên công ty: nêu tên nhà cung cấp mới', () => {
    expect(describe({ type: 'new_match', payload: { company_name: 'Nông sản mới' } })).toBe(
      'Nhà cung cấp mới phù hợp với nhóm hàng bạn quan tâm: Nông sản mới',
    );
  });
```

Nếu file chưa import `describe` từ `@/lib/notificationsApi` (tên trùng với `describe` của vitest), import với bí danh: `import { describe as describeNotification } from '@/lib/notificationsApi';` và dùng `describeNotification(...)`. Đọc phần đầu file để khớp cách nó đã gọi hàm này ở các ca tham số hóa.

- [ ] **Step 9: Chạy, xác nhận thất bại**

Run (trong `frontend/`): `npx vitest run tests/notification-bell.test.tsx`
Expected: FAIL (ca mới trả câu cũ).

- [ ] **Step 10: Sửa câu mô tả**

Trong `frontend/lib/notificationsApi.ts` thay nhánh `new_match` (dòng 64-65):

```ts
    case 'new_match': {
      const name = notification.payload.company_name;
      return typeof name === 'string' && name
        ? `Nhà cung cấp mới phù hợp với nhóm hàng bạn quan tâm: ${name}`
        : 'Có nhà cung cấp mới phù hợp với tìm kiếm của bạn.';
    }
```

Thêm vào `frontend/i18n/catalog.json` (mẫu có tham số `{0}`; hàm `translateText` khớp mẫu `{n}` khi phần còn lại dài hơn 3 ký tự):

```json
  "Nhà cung cấp mới phù hợp với nhóm hàng bạn quan tâm: {0}": [
    "New supplier matching your product categories: {0}",
    "New supplier matching your product categories: {0}",
    "New supplier matching your product categories: {0}"
  ]
```

- [ ] **Step 11: Chạy test frontend, lint, typecheck**

Run: `npx vitest run tests/notification-bell.test.tsx tests/dashboards.test.tsx tests/catalog.test.ts && npm run lint && npm run typecheck`
Expected: PASS. Thêm vào `tests/notification-bell.test.tsx` một assertion rằng `translateText('Nhà cung cấp mới phù hợp với nhóm hàng bạn quan tâm: Nông sản mới', 'en')` bằng `'New supplier matching your product categories: Nông sản mới'` (đảm bảo mẫu tham số khớp); nếu lệch, sửa khóa catalog cho khớp.

- [ ] **Step 12: Chạy toàn bộ kiểm tra cuối**

Run: `cd backend && uv run pytest && uv run ruff check . && uv run mypy app`, rồi `cd ../frontend && npm test && npm run lint && npm run typecheck`
Expected: báo kết quả thật (số test đạt/hỏng). Nếu bất kỳ thứ gì đỏ và không thuộc phần đã sửa, ghi lại và báo, không tắt test.

- [ ] **Step 13: Commit**

```bash
git add backend/app/modules/companies/product_service.py backend/app/modules/notifications frontend/lib/notificationsApi.ts frontend/i18n/catalog.json frontend/tests/notification-bell.test.tsx
git commit -m "New-match: buyer nhận thông báo khi nhà cung cấp cùng ngành vừa được xác minh"
```

---

## Self-review

**Phủ spec.**
- Việc 2 → Task 1 (tự điền, không ghi đè, đổi theo khi chưa sửa).
- Việc 1 → Task 2 (preview chỉ đọc, ba trạng thái, không ghi log, 401/403, dòng chưa duyệt, mã sai) và Task 3 (panel tóm tắt ở form, đầy đủ ở tab Sản phẩm, generate:api, chuỗi vi/en).
- Việc 3 → Task 4 (handler, hàm tìm buyer, chống trùng, chuông). Dashboard: ô `new_verified` của buyer đã có sẵn và không cần sửa; chuông đã hiển thị `new_match` qua `describe()`. Nếu người dùng muốn số chưa đọc hoặc dẫn link riêng trên dashboard, đó là thay đổi ngoài spec.

**Chênh lệch so với spec (báo người dùng):**
1. Spec ghi "next-intl vi/en"; code hiện tại của các component này dùng `tr()` + `frontend/i18n/catalog.json` (`[en, fr, ja]`), nên plan theo cơ chế đó.
2. Spec ghi route trong module `compliance` tính "theo mã HS"; đúng như vậy. Plan dùng `tariff_savings` với giá trị cơ sở 100 chỉ để lấy thuế suất; số tiền không được trả ra.
3. `staging_category`, `zero_from` chỉ trả khi `ok` (không lộ chi tiết lộ trình cho ca `needs_review`).

**Quét chỗ giữ chỗ:** không còn "TBD/TODO". Các ô "Trước khi chạy… xác nhận" là bước kiểm tra tên hàm và fixture cần đọc file thật (`login_as` cho admin, `publish` trong `events.py`, vị trí fixture `notifications_on`), không phải chỗ trống.

**Nhất quán kiểu.** `TariffPreviewOut` (backend) ↔ `TariffPreview` (frontend) ↔ `getTariffPreview`/`TariffPanel`; `find_buyers_for_new_supplier` trả `tuple[PublicCompanyRef, list[uuid.UUID]] | None` và handler giải nén đúng; `has_new_match(session, user_id, company_id)` khớp chỗ gọi.
