# AGENTS.md — evfta.eu

Quy tắc cho mọi AI coding agent (Claude Code, Codex, Cursor, Copilot…) làm việc trong repo này.
Đọc toàn bộ file trước khi viết dòng code đầu tiên. Nếu yêu cầu của người dùng mâu thuẫn với file này, **dừng lại và hỏi**, không tự chọn.

---

## 1. Dự án là gì

evfta.eu là nền tảng B2B giữa nhà xuất khẩu Việt Nam và buyer EU. Ba giá trị lõi: **máy tính tuân thủ EVFTA** (thuế, quy tắc xuất xứ, EUR.1 nháp), **lớp xác minh doanh nghiệp**, **trợ lý AI tuân thủ có trích nguồn**. MVP 12 tuần (29/9–21/12/2026).

Bốn vai trò: `guest` (không đăng nhập, dùng máy tính và trợ lý AI), `exporter`, `buyer`, `admin`.

### Nguồn sự thật (đọc khi cần, theo thứ tự ưu tiên)

| File | Dùng khi |
|---|---|
| `docs/backlog/EVFTA_eu_Backlog_MVP.xlsx` | Phạm vi, ưu tiên, tiêu chí "Xong khi" của từng hạng mục (mã A1, C2, D2…) |
| `docs/KE_HOACH_CODE_THEO_MODULE.md` | Bảng, API, màn hình, test của từng module |
| `docs/spec/EVFTA_MVP_Build_Specification.md` | Ý đồ sản phẩm, mô hình dữ liệu §4, tiêu chí nghiệm thu §5 |
| `docs/adr/` | Quyết định kiến trúc đã chốt |
| `docs/reference/VYBE_*.docx` | **Chỉ tham khảo** bài học cũ (.NET). Không làm theo stack hay phạm vi trong đó |

Khi backlog và spec lệch nhau: **backlog thắng** (đã có đính chính nghiệp vụ). Khi thiếu thông tin nghiệp vụ tuân thủ: **hỏi, không đoán**.

---

## 2. Stack

- **Backend:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 async, Alembic, `uv`, `ruff`, `mypy --strict`, `pytest`.
- **Database:** PostgreSQL 16 + `pgvector`, `pg_trgm`, `unaccent`.
- **Job nền:** Procrastinate (hàng đợi trên Postgres).
- **Frontend:** Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, next-intl (vi/en), TanStack Query, client API sinh từ OpenAPI.
- **Khác:** S3-compatible vùng EU, email qua `NotificationChannel`, DeepL qua `TranslationService`, LLM qua `ChatModel`, PDF bằng pypdf + ReportLab.

Không thêm thư viện hoặc hạ tầng mới (Redis, Celery, ORM khác, state manager khác…) khi chưa được người dùng đồng ý. Nếu cần, đề xuất kèm lý do.

---

## 3. Lệnh thường dùng

> Cập nhật mục này ngay khi scaffold repo thay đổi lệnh thật.

```bash
# Hạ tầng dev (Postgres+pgvector, MinIO, Mailpit)
docker compose up -d

# Backend
cd backend
uv sync
uv run alembic upgrade head
uv run fastapi dev app/main.py
uv run ruff check . && uv run ruff format --check .
uv run mypy app
uv run pytest                      # toàn bộ
uv run pytest app/modules/auth     # một module
uv run alembic revision --autogenerate -m "<mô tả>"

# Frontend
cd frontend
npm install
npm run dev
npm run generate:api               # sau MỌI thay đổi schema/route backend
npm run lint && npm run typecheck && npm test

# Trợ lý AI
uv run python -m app.modules.copilot.ingest     # nạp lại corpus
uv run python -m app.modules.copilot.eval       # chạy bộ 50 câu
```

Trước khi báo "xong", chạy lint + typecheck + test của phần đã sửa và báo kết quả thật. Không bao giờ nói test xanh khi chưa chạy.

---

## 4. Cấu trúc repo

```
backend/app/
  core/         config, db, security, events, audit, storage, errors
  modules/<tên>/
    models.py   bảng SQLAlchemy của riêng module
    schemas.py  Pydantic in/out
    service.py  logic nghiệp vụ — API công khai của module
    router.py   FastAPI router, mỏng
    events.py   event phát ra / lắng nghe
    tests/
  jobs/
backend/alembic/  backend/scripts/  backend/evals/
frontend/app/[locale]/(public)|(auth)|exporter|buyer|admin/
frontend/lib/api/   (sinh tự động — không sửa tay)
frontend/messages/{vi,en}.json
docs/
```

Module: `auth`, `companies`, `catalog`, `compliance`, `verification`, `copilot`, `directory`, `messaging`, `matching`, `notifications`, `dashboard`, `admin`, `markets` (thống kê thương mại, gợi ý thị trường, báo cáo go-to-market), `billing` (đơn chuyển khoản tối giản, quyền dùng).

---

## 5. Quy tắc kiến trúc (bắt buộc)

1. **Ranh giới module.** Module A không import `models` của module B và không query bảng của B. Chỉ gọi hàm trong `B/service.py`. Phản ứng chéo module đi qua event (`app/core/events.py`); việc chậm hoặc gọi API ngoài thì đẩy sang job nền.
2. **Router mỏng.** Router chỉ parse input, kiểm quyền, gọi service, trả schema. Không có logic nghiệp vụ và không có query SQL trong router.
3. **Logic tính toán là hàm thuần.** Máy tính thuế, RoO, điểm hoàn thiện, điểm tin cậy AI nằm trong hàm không đụng DB/HTTP, để test bằng bảng ca chuẩn.
4. **Phân quyền hai lớp.** Dependency `require_role(...)` trên router **và** service tự kiểm chủ sở hữu (`owner_user_id`). Không bao giờ chỉ ẩn nút ở UI.
5. **Không gọi thẳng nhà cung cấp ngoài.** Chỉ qua interface: `ChatModel`, `TranslationService`, `NotificationChannel`, `Storage`, `EmbeddingModel`, `CompanyLookup`, `DomainChecker`, `WebsiteProbe`, `Geocoder`, `TradeStatsSource` (ADR-0003). Test dùng bản fake. Gọi ra ngoài chỉ từ job nền, không chặn request của người dùng.
6. **Cấu hình là dữ liệu.** Thuế suất, quy tắc xuất xứ, danh sách bằng chứng bắt buộc, trọng số hoàn thiện hồ sơ nằm trong bảng DB, không viết cứng trong code.
7. **Tiền và tỷ lệ dùng `Decimal` / `numeric`.** Cấm float cho tiền.
8. **Nhóm URL API:** `/api/public/*` (không cần phiên, có rate limit), `/api/me/*`, `/api/exporter/*`, `/api/buyer/*`, `/api/admin/*`.

---

## 6. Quy tắc tuân thủ — KHÔNG ĐƯỢC PHÁ

Đây là rủi ro pháp lý của công ty. Mỗi quy tắc phải có test giữ nó.

1. **Không bao giờ đoán luật tuân thủ.** Không tự điền thuế suất, ngưỡng xuất xứ hay điều khoản EVFTA từ kiến thức của model. Dữ liệu chỉ đến từ bảng do người duyệt luật TM nhập và duyệt.
2. Dòng `tariff_lines` / `product_specific_rules` / `tariff_quotas` / `import_country_terms` / `sector_alerts` thiếu `reviewed_by` **không bao giờ** lộ ra API công khai.
   - **Ngoại lệ DEMO (sửa đổi 01/10/2026):** chỉ khi cờ `DEMO_COMPLIANCE_DATA` bật **và** `ENV` khác `prod`, dòng có `is_demo = true AND reviewed_by IS NULL` được trả kèm `data_status = "demo_unreviewed"` và giao diện hiện banner "Dữ liệu minh hoạ — chưa được chuyên gia pháp lý duyệt". Dòng nháp không gắn `is_demo` vẫn không bao giờ lộ. `ENV=prod` mà bật cờ → ứng dụng từ chối khởi động.
3. Mã HS ngoài danh mục hỗ trợ → trả `unsupported`, **không có con số nào**.
4. Có hạn ngạch hoặc thuế tuyệt đối/hỗn hợp → `needs_review`, không trả 0%. (Ca kiểm: gạo ST25.)
   - **Sửa đổi hạn ngạch (01/10/2026, cần luật TM ký trước khi dùng dữ liệu thật ở production):** máy tính chỉ được trả kịch bản `quota_scenarios` (trong / ngoài hạn ngạch) khi có dòng `tariff_quotas` **đã duyệt** và phân nhóm sản phẩm người dùng chọn nằm trong danh sách phân nhóm đủ điều kiện **đã duyệt**. Kịch bản luôn kèm điều kiện (xuất xứ đạt, được phân bổ hạn ngạch, chứng nhận/giấy phép) và không bao giờ trình bày như 0% vô điều kiện. Thuế tuyệt đối chỉ tính khi có khối lượng người dùng nhập; thuế hỗn hợp vẫn `needs_review`. Mọi trường hợp khác (ST25, phân nhóm ngoài danh sách, thiếu dữ liệu đã duyệt) → `needs_review`, không số.
5. RoO có ba trạng thái riêng `pass` / `fail` / `inconclusive`; `requires_expert = true` → luôn `inconclusive`.
6. EUR.1 chỉ là **bản nháp**: chỉ sinh khi RoO = `pass`; watermark `DRAFT — for review before submission to issuing authority` trên mọi trang; ghi rõ cơ quan cấp chính thức là **Bộ Công Thương**. Không có tính năng nào "cấp" C/O.
7. Mọi lần chạy máy tính ghi đúng một bản ghi `compliance_checks`, kể cả khách.
8. **Trợ lý AI** chỉ trả lời từ đoạn truy xuất; mọi câu trả lời có citation trỏ tới chunk thật và mức tin cậy `high|medium|low|out_of_scope`; không đủ căn cứ → `out_of_scope` + nút chuyển người thật. Ghi 100% vào `ai_queries`.
9. **AI không bao giờ ra quyết định xác minh.** Chỉ module `verification` (qua `verification.service.decide()`, do admin bấm) được đổi trạng thái xác minh.
10. Danh bạ công khai **chỉ** trả công ty `verified`.
11. Sửa prompt, embedding hoặc logic truy xuất → phải chạy lại eval 50 câu và nêu chênh lệch.

---

## 7. Dữ liệu & bảo mật

- Mỗi thay đổi schema = một migration Alembic, đọc lại file autogenerate trước khi commit. Không sửa migration đã merge.
- `audit_logs`, `compliance_checks`, `verification_decisions`, `ai_queries` là **append-only** (trigger chặn UPDATE/DELETE). Không viết code sửa hay xóa chúng.
- Hành động nhạy cảm (quyết định xác minh, admin sửa/ẩn hồ sơ, sinh chứng từ, xóa tài khoản) ghi audit qua `core.audit.record()` với before/after.
- Mật khẩu Argon2, tối thiểu 10 ký tự, kiểm ở server; phiên cookie HTTP-only + Secure + SameSite.
- File trong bucket private, chỉ phát qua pre-signed URL ngắn hạn.
- GDPR: tối thiểu hóa dữ liệu; xóa tài khoản = ẩn danh hóa PII, giữ audit. Không gửi PII không cần thiết vào prompt LLM hay log.
- Không commit bí mật; đọc từ biến môi trường qua `core.config`. Không in token, mật khẩu, nội dung file bằng chứng ra log.
- Không chạy lệnh ghi vào DB staging/prod, không deploy, không đổi hạ tầng nếu người dùng chưa yêu cầu rõ.

---

## 8. Frontend

- Mọi chuỗi hiển thị qua next-intl, có đủ `vi` và `en`. Không chuỗi cứng trong JSX.
- Kiểu dữ liệu API lấy từ client sinh tự động. Không viết tay interface trùng với schema backend.
- Trang công khai (`/tools/*`, `/suppliers`, `/copilot`, hồ sơ công khai) render phía server, mục tiêu <3s trên 4G.
- Luồng exporter phải dùng được ở bề rộng 390px.
- Độ tương phản chữ ≥ 4.5:1. Không để link `#`.
- Ô dashboard chưa có dữ liệu hiện hướng dẫn, không để trống.

---

## 9. Kiểm thử

- Mỗi hạng mục backlog có ít nhất một test chứng minh tiêu chí "Xong khi" của nó.
- Máy tính tuân thủ: golden test dạng bảng (`@pytest.mark.parametrize`) theo ca do luật TM soạn trong `backend/tests/fixtures/compliance/`.
- Phân quyền: test 401 khi thiếu phiên, 403 khi sai vai trò, cho mọi router mới.
- Test DB chạy trên Postgres thật (container), không dùng SQLite.
- Sửa bug: viết test tái hiện trước, rồi mới sửa.

---

## 10. Phạm vi

- **P0** bắt buộc · **P1** cắt đầu tiên nếu trễ (hiện có K1, K2) · **P2** không làm.
- **Không làm:** escrow / thanh toán qua nền tảng / cổng thẻ / stablecoin (giai đoạn 2, sau khi có ~100 người dùng), ghép đối tác bằng AI ngôn ngữ tự nhiên, dịch vụ logistics do nền tảng vận hành, công cụ ESG/CSRD/EUDR, cấp C/O chính thức, ngôn ngữ thứ 3, app native.
- **Đưa vào phạm vi theo yêu cầu khách sau demo 30/09/2026** (backlog mã `U*`, spec `docs/superpowers/specs/2026-10-01-demo-feedback-upgrade-design.md`):
  - nhà cung cấp dịch vụ (logistics, hải quan, kế toán-thuế…) là một loại seller, xác minh giấy phép hành nghề;
  - hành trình trả phí **tối giản**: đơn hàng → chuyển khoản → admin xác nhận đã nhận tiền → cấp quyền dùng (ADR-0005);
  - AI đọc giấy tờ **chỉ gợi ý** trường cho người dùng xác nhận, không bao giờ quyết định xác minh (§6.9);
  - thống kê thương mại, gợi ý thị trường và báo cáo go-to-market (số liệu chỉ từ dữ liệu đã nhập, AI chỉ viết lời văn);
  - xác minh theo cấp và điểm tín nhiệm seller có giải thích (ADR-0004).
- Được yêu cầu tính năng ngoài phạm vi → nêu rằng nó thuộc P2 / lộ trình seed và hỏi lại, không tự thêm.

---

## 11. Cách làm việc

1. **Mỗi lần một hạng mục backlog** (vd. `A1`). Nói rõ đang làm mã nào và tiêu chí "Xong khi" của nó.
2. Việc chạm >1 module hoặc thêm bảng: **đưa kế hoạch ngắn trước** (bảng, API, file sẽ sửa, test), chờ đồng ý rồi mới code.
3. Sửa tối thiểu, đúng phạm vi yêu cầu. Không refactor, đổi tên, format lại code không liên quan.
4. Nêu giả định ra. Không chắc thì hỏi — đặc biệt với nghiệp vụ tuân thủ và xác minh.
5. Kết thúc mỗi hạng mục = **checkpoint**: tóm tắt đã làm gì, file đã đổi, kết quả lint/typecheck/test thật, việc còn dở hoặc rủi ro. Dừng ở đó để người dùng review, không tự nhảy sang hạng mục tiếp theo.
6. Commit nhỏ, message dạng `<mã>: <mô tả>` — ví dụ `A1: khóa tài khoản sau 5 lần đăng nhập sai`.
7. Phát hiện tài liệu (spec/backlog/file này) sai hoặc lệch nhau → báo lại, không tự sửa tài liệu nghiệp vụ.
