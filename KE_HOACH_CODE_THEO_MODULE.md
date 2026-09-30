# evfta.eu — Kế hoạch code theo module (Next.js · Python · PostgreSQL)

> Căn cứ: `EVFTA_MVP_Build_Specification.md` (spec), `EVFTA_eu_Backlog_MVP.xlsx` (57 hạng mục, mã ID giữ nguyên), `VYBE_Trade_Proposal_FINAL` và `VYBE_Trade_Dac_Ta_Kien_Truc_He_Thong` (lấy các nguyên tắc kiến trúc đáng giữ, chuyển từ .NET sang Python).
> Ngày lập: 29/09/2026 — đúng ngày bắt đầu GĐ1.

---

## 0. Giả định và những điểm cần chốt trước khi code

**Giả định đã dùng:** kế hoạch này là cho **evfta.eu xây mới** (backlog đã chọn FastAPI + Next.js + PostgreSQL). VYBE Trade trên Blazor/XAF vẫn chạy tới launch 10/10 và SIAL, rồi dữ liệu chuyển sang (J6). Nếu ý bạn là **viết lại chính VYBE Trade** sang stack mới trước 10/10 thì không khả thi về thời gian — cần nói lại để đổi kế hoạch.

**Mâu thuẫn giữa các tài liệu — backlog đã xử lý, ghi lại để không ai code nhầm:**

| Chủ đề | VYBE proposal | Spec EVFTA / backlog | Theo |
|---|---|---|---|
| Free → Member, gói trả phí | P0 | P2 (X2), miễn phí trong pilot | Backlog |
| Matching theo Tag + Trust L0–L3 | P0 | Lọc có cấu trúc (E2) + saved search P1 (K1–K2) | Backlog |
| Cấp độ xác minh | L0–L3 | `verification_status` + `verification_level` (basic / evfta_verified) | Backlog, ánh xạ L0–L3 ở J6 |
| AI đọc giấy tờ (OCR + risk score) | P1 | Sau MVP (X8) | Backlog |
| Provider directory | P1 | Không làm (X3) | Backlog |
| Hosting | VPS Singapore | Vùng EU (GDPR) | Backlog — ADR tuần 1 |
| Cơ quan cấp EUR.1 | VCCI (spec) | **Bộ Công Thương** | Backlog — luật TM xác nhận tuần 1 |

**Cần chốt trong tuần 1 (chặn code nếu chưa có):** người duyệt luật TM + % thời gian; 20 mã HS đợt đầu (C0); ADR hosting vùng EU và cơ chế phiên đăng nhập; ai là 2 BE + 2 FE.

---

## 1. Stack và quy ước chung

### 1.1 Công nghệ

| Lớp | Chọn | Ghi chú |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | Trang công khai render phía server (SEO, <3s trên 4G) |
| UI | Tailwind + shadcn/ui | Bộ component ở A0 |
| i18n | next-intl (vi/en) | CI chặn chuỗi cứng (A3) |
| Gọi API | Client sinh từ OpenAPI (`openapi-typescript` + `openapi-fetch`), TanStack Query | Không viết tay kiểu dữ liệu |
| Backend | FastAPI + Pydantic v2 | Python 3.12, quản lý bằng `uv`; `ruff`, `mypy --strict`, `pytest` |
| ORM / migration | SQLAlchemy 2.0 (async) + Alembic | |
| Database | PostgreSQL 16 + `pgvector`, `pg_trgm`, `unaccent` | Một DB cho cả dữ liệu nghiệp vụ và vector |
| Job nền | Procrastinate (hàng đợi trên Postgres) hoặc arq (Redis) | Khuyến nghị Procrastinate: bớt một hạ tầng |
| File | S3-compatible vùng EU (S3 eu-central / R2 EU) | Bucket private, pre-signed URL 5–15 phút |
| Email | SES / Resend qua interface `NotificationChannel` | Zalo/SMS sau này |
| Dịch | DeepL qua `TranslationService` | |
| LLM | Qua interface `ChatModel` | Đổi nhà cung cấp không sửa logic |
| PDF | pypdf + ReportLab | EUR.1 nháp |
| Rate limit | slowapi | Endpoint công khai |

### 1.2 Chuyển các quyết định kiến trúc từ VYBE (.NET) sang stack mới

| VYBE (.NET) | evfta.eu (Python/Postgres) | Vì sao giữ |
|---|---|---|
| Modular monolith, 7 module, không query chéo DbContext | Mỗi module là một package trong `app/modules/`; module khác chỉ gọi qua `service.py` công khai | Tách service sau này không phải viết lại |
| MediatR command/query + domain event | Hàm service thuần + event bus nội tiến trình (`app/core/events.py`); việc chậm đẩy sang job nền | Router FastAPI mỏng, logic nằm ở service |
| SQL Server Temporal Tables (audit bất biến) | Bảng append-only: `REVOKE UPDATE, DELETE` với role ứng dụng + trigger chặn `UPDATE/DELETE` | Không ai, kể cả admin, sửa được lịch sử |
| DevExpress XAF Admin Console | Khu `/admin` trên Next.js, tự làm (I1, I2, I4, I5, I6) | Mất phần XAF sinh sẵn — đã tính công |
| Hangfire | Procrastinate / arq | |
| ASP.NET Identity + RBAC 2 lớp | Cookie HTTP-only + dependency `require_role()` trên mọi router + kiểm tra lại trong service | Bài học VYBE A1: từng vào admin bằng mật khẩu rỗng |
| AI không được ghi VerificationRecord | Copilot chỉ ghi `ai_queries`; chỉ module Verification ghi quyết định | Human-in-the-loop |
| Cấu hình thay vì code cứng | Thuế, quy tắc xuất xứ, danh sách bằng chứng bắt buộc, trọng số hoàn thiện hồ sơ đều là **dữ liệu** có `reviewed_by` | "Không bao giờ đoán luật tuân thủ" |

### 1.3 Cấu trúc repo (J7)

```
evfta/
├── backend/
│   ├── app/
│   │   ├── core/            # config, db session, security, events, audit, storage, errors
│   │   ├── modules/
│   │   │   ├── auth/        # users, phiên, phân quyền, GDPR
│   │   │   ├── companies/   # hồ sơ exporter/buyer, sản phẩm, điểm hoàn thiện
│   │   │   ├── catalog/     # hs_codes, nhóm hàng
│   │   │   ├── compliance/  # tariff, RoO, compliance_checks, EUR.1
│   │   │   ├── verification/# evidences, requests, decisions, hết hạn
│   │   │   ├── copilot/     # corpus, chunk, retrieval, answer, eval
│   │   │   ├── directory/   # tìm kiếm công khai, profile_views
│   │   │   ├── messaging/   # rfqs, conversations, messages, dịch
│   │   │   ├── matching/    # saved_searches, job so khớp
│   │   │   ├── notifications/
│   │   │   ├── dashboard/
│   │   │   └── admin/       # kiểm duyệt, dashboard nội bộ
│   │   ├── jobs/            # đăng ký job nền
│   │   └── main.py
│   │   # mỗi module: models.py · schemas.py · service.py · router.py · events.py · tests/
│   ├── alembic/
│   ├── scripts/             # nạp corpus, seed, chuyển dữ liệu VYBE
│   └── pyproject.toml
├── frontend/
│   ├── app/[locale]/
│   │   ├── (public)/        # trang chủ, /tools/*, /suppliers, /copilot, giới thiệu
│   │   ├── (auth)/          # register, login
│   │   ├── exporter/        # dashboard, hồ sơ, sản phẩm, bằng chứng, RFQ
│   │   ├── buyer/           # dashboard, tìm kiếm đã lưu, RFQ
│   │   └── admin/           # hàng đợi, kiểm duyệt, audit, AI, dữ liệu tuân thủ
│   ├── lib/api/             # client sinh từ OpenAPI
│   ├── messages/{vi,en}.json
│   └── components/
├── docs/                    # spec, ADR, CLAUDE.md
└── .github/workflows/
```

**Quy ước API:** `/api/public/*` không cần đăng nhập (có rate limit) · `/api/me/*`, `/api/exporter/*`, `/api/buyer/*` cần phiên · `/api/admin/*` chỉ admin. Tiền dùng `Decimal`/`numeric`, không dùng float.

---

## 2. Kế hoạch theo module

Mỗi module ghi: bảng dữ liệu → API → màn hình → job nền → test bắt buộc. Mã trong ngoặc là ID backlog.

### M1. Nền tảng (J7, A0) — GĐ1, T1

**Chức năng**
- Monorepo, CI GitHub Actions: lint (ruff, eslint), type check (mypy strict, tsc), test, build; CI đỏ chặn merge; merge vào `main` tự deploy staging.
- Môi trường dev (docker compose: Postgres + pgvector, MinIO, Mailpit) / staging / prod vùng EU.
- Alembic migration đầu tiên: bật extension `pgvector`, `pg_trgm`, `unaccent`.
- `app/core`: settings, session DB, event bus, lỗi chuẩn, storage S3, health check `/health` (DB + storage).
- Frontend: 4 layout (khách, exporter, buyer, admin), bộ component, `npm run generate:api`, next-intl.
- Logging có cấu trúc (JSON), request id.

**Xong khi:** bốn layout chạy trên staging; client API sinh tự động; ADR hosting + phiên đăng nhập đã ký.

### M2. Tài khoản & phân quyền (A1, A2, A3, J2) — GĐ1

**Bảng:** `users` (email unique, phone, password_hash Argon2, role enum `exporter|buyer|admin`, preferred_language, consent_accepted_at, consent_version, failed_login_count, locked_until, last_login_at), `sessions`.

| API | Mô tả |
|---|---|
| `POST /api/auth/register` | Nhận `type` từ `?type=buyer|exporter`; mật khẩu ≥10 ký tự, kiểm ở server; lưu consent |
| `POST /api/auth/login` · `logout` | Cookie HTTP-only, Secure, SameSite=Lax; sai 5 lần khóa 15 phút |
| `GET /api/me` · `PATCH /api/me` | Đổi `preferred_language` |
| `POST /api/me/delete` | GDPR: ẩn danh hóa PII, giữ audit (J2) |

**Màn hình:** đăng ký (chọn vai trò + ngôn ngữ), đăng nhập, nút đổi ngôn ngữ, **wizard 3 bước** sau đăng ký: pháp lý → sản phẩm/mã HS → bằng chứng, lưu nháp từng bước; tài khoản chưa có công ty luôn bị nhắc (A2).

**Phân quyền:** dependency `require_role(...)` gắn ở cấp router, và service kiểm tra lại chủ sở hữu (`company.owner_user_id == user.id`).

**Test bắt buộc:** mật khẩu rỗng bị chặn với cả 4 vai trò; khóa sau 5 lần sai; endpoint cần phiên trả 401; buyer gọi `/api/admin/*` trả 403.

### M3. Hồ sơ doanh nghiệp & sản phẩm (B1, B2, B3, B5) — GĐ1

**Bảng:** `companies` (một bảng, cột `type`), bảng N-N `company_export_markets`, `company_languages`, `company_sourcing_categories`; `products` (hs_code FK **bắt buộc**, price_min/max numeric, currency, unit, moq, moq_unit, is_active, approval_status); `product_images`; `completeness_weights` (cấu hình).

| API | Mô tả |
|---|---|
| `POST/GET/PATCH /api/me/company` | CRUD hồ sơ; trường lọc/ghép là cột riêng, không nhét vào mô tả |
| `GET /api/me/company/completeness` | `{score, missing: [field...]}` tính theo bảng trọng số |
| `CRUD /api/exporter/products` | Không lưu được nếu thiếu mã HS |
| `POST /api/uploads/presign` | Pre-signed URL cho logo, ảnh sản phẩm |
| `GET /api/public/companies/{slug}` | Hồ sơ công khai — chỉ công ty đã xác minh |

**Màn hình:** sửa hồ sơ exporter (song ngữ mô tả), sửa hồ sơ buyer, danh sách/sửa sản phẩm, thanh "68% hoàn thiện" kèm danh sách còn thiếu.

**Event:** `CompanyUpdated` → tính lại điểm hoàn thiện.

**Test:** thêm 1 trường → % tăng đúng trọng số; lọc theo HS/quốc gia qua API.

### M4. Danh mục HS (B4) — GĐ1

**Bảng:** `hs_codes` (code 6–8 số, name_vi, name_en, chapter, is_calculator_supported), `product_categories` ánh xạ theo chương HS. Index GIN trigram trên `unaccent(name_vi)`, `name_en`, `code`.

| API | Mô tả |
|---|---|
| `GET /api/public/hs-codes?q=` | Autocomplete: "gạo", "gao", "rice", "1006" đều ra đúng mã; trả cờ `supported` |

**Màn hình:** component `HsCodePicker` dùng chung cho hồ sơ, sản phẩm, máy tính, bộ lọc danh bạ.

### M5. Tuân thủ — máy tính & chứng từ (C0, C1, C2, C3, C4, C5, J1) — GĐ2–GĐ3 · **module quan trọng nhất**

**Bảng**
- `tariff_lines`: hs_code, destination, duty_type (ad_valorem/specific/mixed), mfn_rate, mfn_specific, evfta_rate_current, staging_category, zero_from, quota_required, quota_note, condition_note, source_url, **reviewed_by, reviewed_at**, valid_from, valid_until.
- `product_specific_rules`: hs_code, rule_type (WO/CTH/MaxNOM%), threshold, rule_text, requires_expert, source, reviewed_by, reviewed_at.
- `compliance_checks`: theo spec §4.4 + tariff_line_id, rule_id; append-only; company_id nullable.
- `documents`: company_id, document_type, compliance_check_id, file_url, status.

**Quy tắc cứng (viết thành test, không thương lượng)**
1. Dòng thiếu `reviewed_by` không bao giờ lộ ra API công khai.
2. Mã ngoài danh mục → `status: "unsupported"`, **không có con số nào**.
3. Có hạn ngạch hoặc thuế tuyệt đối/hỗn hợp → `status: "needs_review"` (ví dụ gạo ST25 không được ra 0%).
4. `requires_expert = true` → RoO luôn `inconclusive`. Ba trạng thái pass/fail/inconclusive không gộp.
5. EUR.1 chỉ sinh khi RoO = `pass`; watermark mọi trang; ghi cơ quan cấp chính thức là Bộ Công Thương.

| API | Mô tả |
|---|---|
| `POST /api/public/tariff` | Input: hs_code, product_value, destination, shipments_per_year → MFN, EVFTA, chênh lệch, dự báo năm, điều kiện; ghi `compliance_checks` |
| `POST /api/public/roo` | Input: hs_code, ex_works_price, materials[{origin, value}] → % NOM so với ngưỡng, kết luận; ghi `compliance_checks` |
| `POST /api/exporter/documents/eur1` | Từ hồ sơ + check RoO + hóa đơn → job nền sinh PDF → S3 |
| `GET /api/exporter/documents` | Danh sách, tải bằng pre-signed URL |
| `CRUD /api/admin/tariff-lines`, `/api/admin/roo-rules` | Nhập liệu + nút "Duyệt" (luật TM) |
| `GET /api/admin/compliance-checks.csv` | Xuất CSV |

**Màn hình:** `/tools/tariff` (số tiết kiệm to, "đáng chụp màn hình", nút xem nhà cung cấp), `/tools/origin` (bảng nhập nguyên liệu động), trang sinh EUR.1 nháp, màn hình admin nhập/duyệt dữ liệu thuế và quy tắc.

**Kỹ thuật:** logic tính đặt trong hàm thuần `compliance/calculators.py` (không phụ thuộc DB) → test chuẩn dễ; rate limit 30 req/phút/IP (J1).

**Test:** bộ golden test cho 20 mã khớp bảng đã duyệt; 10/10 ca RoO do luật TM soạn; mã lạ không ra số; ST25 ra cảnh báo; mỗi lần tính đúng 1 bản ghi.

### M6. Xác minh & Admin (I1, I2, I4, I5, I6, I7, C6) — GĐ1 (I6) + GĐ3

**Bảng**
- `audit_logs` (I6): actor_id, action_type, entity_type, entity_id, before_state jsonb, after_state jsonb, created_at — **append-only bằng trigger + REVOKE**.
- `companies.verification_status` (unverified/pending/verified/rejected), `verification_level` (basic/evfta_verified), verified_at, expires_at (I7).
- `evidences`: loại (EUR.1 đã cấp — che giá, tự chứng nhận lô ≤ 6.000 EUR, gạo thơm NĐ 103/2020, EUDR, IUU; và chứng nhận chất lượng **tách theo loại có cấu trúc** — *danh sách loại do luật TM duyệt trước khi nhập*: hệ thống quản lý ISO 9001, ISO 14001, HACCP, BRCGS, IFS; trách nhiệm xã hội BSCI, WRAP, SMETA; kỹ thuật CE marking; kết quả kiểm nghiệm phòng lab kèm tên phòng lab và số hiệu báo cáo), file, certificate_number, issuer (để đối chiếu với tổ chức cấp), issued_at, expires_at (xuất xứ +12 tháng), approval_status.
- `required_evidence_rules`: nhóm hàng → loại bằng chứng bắt buộc (dữ liệu do luật TM nhập, không code cứng). Với mã cà phê 0901.11 và 0901.21, nếu luật TM yêu cầu thì checklist **nhắc** nộp hồ sơ EUDR (chỉ nhắc, không loại tự động, không phải công cụ EUDR — X4).
- `verification_requests`, `verification_decisions` (reviewer, decision, **reason bắt buộc** khi reject/request_info, decided_at) — append-only.

**Quy tắc:** `evfta_verified` = verified **và** đủ bằng chứng bắt buộc còn hạn. Mọi quyết định đi qua **một** hàm `verification.service.decide()` → ghi decision + audit + phát `VerificationStatusChanged`. Điểm hoàn thiện hồ sơ (B3) và mọi điểm uy tín/rủi ro sau này là khái niệm **khác** xác minh: không có tính năng nào ngoài `decide()` đổi trạng thái xác minh hay loại doanh nghiệp (xem `docs/roadmap/2026-09-29-nghien-cuu-trong-so-uy-tin.md`).

| API | Mô tả |
|---|---|
| `CRUD /api/exporter/evidences` · `POST /api/exporter/verification-requests` | Nộp bằng chứng, gửi yêu cầu xác minh |
| `GET /api/exporter/evidences/checklist` | Danh sách kiểm theo nhóm hàng |
| `GET /api/admin/verification-queue` | Pending, sắp theo ngày gửi, xem bằng chứng tại dòng |
| `POST /api/admin/verification-requests/{id}/decision` | approve / reject / request_info + reason |
| `GET/PATCH /api/admin/companies`, `/api/admin/products` | Xem, sửa, ẩn — mỗi thao tác ghi audit (I4) |
| `GET /api/admin/audit-logs?entity=` | Lọc theo đối tượng |
| `GET /api/admin/stats` | Đã xác minh, chờ duyệt, câu hỏi AI tuần, độ tin cậy TB (I5) |

**Job nền:** quét hằng ngày — hết hạn thì hạ mức/trạng thái, bằng chứng hết hạn thì hạ `evfta_verified`, sắp hết hạn thì gửi `expiry_alert`, và tính lại `profile_completeness_score` (B3) của công ty có bằng chứng hết hạn (bằng chứng hết hạn không phát sự kiện nào).

**Test:** pending → verified trong <5 phút thao tác; 100% quyết định có lý do + audit; thử `UPDATE audit_logs` ở DB phải lỗi.

### M7. Trợ lý AI tuân thủ (D0, D1, D2, D3, D4) — GĐ4 (D0 chạy song song từ T1)

**Bảng:** `corpus_documents` (title, source, article/annex, valid_from, reviewed_by), `corpus_chunks` (text, embedding `vector`, hs_codes[], document_id), `ai_queries` (§4.10 + chunk_ids, citations, confidence, model_version, was_helpful, escalated_to_human), `escalation_tickets`.

**Pipeline (`copilot/`)**
1. `ingest.py` — lệnh CLI `python -m app.modules.copilot.ingest`: cắt đoạn giữ nguyên điều/phụ lục, embedding đa ngữ, lưu pgvector. Nạp lại kho không cần deploy web.
2. `retrieve.py` — tìm vector + lọc theo mã HS (+ từ khóa trigram làm lai nếu cần).
3. `answer.py` — prompt chỉ cho trả lời từ đoạn truy xuất, bắt buộc trả JSON có cấu trúc: `answer`, `citations[]`, `confidence` (high/medium/low/out_of_scope).
4. Điểm tin cậy tính bằng quy tắc tường minh (điểm truy xuất + có trích nguồn hợp lệ + mô hình tự đánh giá), không lấy nguyên con số của LLM.
5. Không đủ căn cứ → trả "ngoài phạm vi" + nút chuyển người thật.

| API | Mô tả |
|---|---|
| `POST /api/public/copilot/ask` | Khách dùng được (rate limit); ghi `ai_queries` 100% |
| `POST /api/copilot/queries/{id}/feedback` | Hữu ích / không |
| `POST /api/copilot/queries/{id}/escalate` | Tạo phiếu cho admin |
| `GET /api/admin/ai-queries?confidence=low&helpful=false` | Soát câu yếu, chọn mẫu hằng tuần |

**Eval (D4):** `evals/copilot_50.jsonl` do luật TM soạn; script chạy trong CI, báo **độ chính xác** và **độ đúng trích nguồn** tách riêng, so với lần chạy trước.

**Test:** câu ngoài phạm vi → `out_of_scope` 100%; mỗi câu trả lời có ít nhất một citation trỏ tới chunk thật.

### M8. Danh bạ & tìm kiếm (E1, E2, E3, E4) — GĐ5

**Chức năng:** trang `/suppliers` render phía server; tìm gộp tên công ty, sản phẩm, tên HS vi/en, chứng nhận đã duyệt (unaccent + pg_trgm); lọc HS, nhóm hàng, quốc gia, chứng nhận; ô trống → liệt kê mọi công ty đã xác minh; thẻ kết quả 6 thông tin + nút "Yêu cầu báo giá"; trang Giới thiệu / Điều khoản (câu miễn trừ cho huy hiệu) / Bảo mật.

| API | Mô tả |
|---|---|
| `GET /api/public/suppliers?q=&hs=&country=&cert=&category=&page=` | **Chỉ `verified`** — bộ lọc đặt ở một hàm query duy nhất |
| `POST /api/public/companies/{id}/view` | Ghi `profile_views` cho dashboard G1 |

**Test:** unverified/pending/rejected không bao giờ xuất hiện; "gạo", "rice", "1006", "HACCP" đều ra kết quả (bài học VYBE E2); <2s với 500 công ty.

### M9. RFQ & nhắn tin (F1, F2, F3) — GĐ5

**Bảng:** `rfqs` (product_id, quantity, unit, target_price, currency, incoterms enum, destination country/port, required_date, message, status Mới/Đã xem/Đã báo giá/Đóng), `conversations` (gắn rfq, cặp công ty), `messages` (§4.7).

| API | Mô tả |
|---|---|
| `POST /api/buyer/rfqs` | Tạo RFQ → tự mở hội thoại → notification + email trong 1 phút |
| `GET /api/me/rfqs` · `PATCH /api/exporter/rfqs/{id}/status` | Theo dõi / đổi trạng thái |
| `GET /api/me/conversations` · `/{id}/messages` | Danh sách, luồng tin |
| `POST /api/me/conversations/{id}/messages` | Dịch lúc gửi sang `preferred_language` người nhận; lỗi dịch vẫn gửi bản gốc |
| `GET /api/me/conversations/{id}/stream` | SSE (hoặc polling 5–10s) |

**Chống lạm dụng:** giới hạn số RFQ/ngày theo công ty, thấp hơn với công ty chưa xác minh (kế thừa VYBE §6.4).

**Test:** một vòng RFQ → trả lời giữa người chỉ đọc tiếng Việt và người chỉ đọc tiếng Anh.

### M10. Ghép nối rule-based (K1, K2) — GĐ5 · P1, cắt đầu tiên nếu trễ

- `saved_searches` (criteria jsonb: hs_codes, countries, keywords; last_notified_at); nút "Lưu tìm kiếm".
- Nghe event `VerificationStatusChanged(→verified)` → job so khớp mọi saved search (tái dùng hàm query của M8) → notification + email.
- **Test:** duyệt một công ty khớp → buyer nhận thông báo dưới 5 phút.

### M11. Thông báo (H1, H2) — GĐ3 (email) + GĐ5 (chuông)

- `notifications` (type, payload jsonb, link, is_read); chuông + số chưa đọc trên header (polling).
- `NotificationChannel` interface; `EmailChannel` trước. Mẫu email song ngữ (Jinja2) theo `preferred_language`.
- 5 loại: tin nhắn mới, RFQ mới, đổi trạng thái xác minh, khớp tìm kiếm, sắp hết hạn xác minh — mỗi loại một handler nghe event, gửi qua job nền.
- **Test:** mỗi loại mở đúng trang liên quan.

### M12. Dashboard (G1, G2, G3) — GĐ6

- **Exporter:** % hoàn thiện + còn thiếu; lượt xem tuần; RFQ mới; trạng thái xác minh + đếm ngược hạn; tổng tiết kiệm thuế từ `compliance_checks`; câu hỏi AI gần đây.
- **Buyer:** tìm kiếm đã lưu + kết quả mới; RFQ đã gửi + trạng thái; nhà cung cấp xem gần đây; nhà cung cấp mới xác minh tuần này trong nhóm hàng quan tâm.
- `GET /api/exporter/dashboard`, `GET /api/buyer/dashboard` — một endpoint gom, mỗi ô là một hàm service độc lập.
- **G3:** `dashboard_events` (user_id, opened_at, had_new_info) → báo cáo tuần cho admin, mục tiêu 90%.
- Ô chưa có dữ liệu hiện hướng dẫn, không để trống.

### M13. Phi chức năng & vận hành (J1–J8, J5, J6)

| ID | Việc |
|---|---|
| J1 | Rate limit endpoint công khai; 429 khi quá 30/phút/IP |
| J2 | GDPR: consent, xóa tài khoản = ẩn danh hóa, giữ audit |
| J3 | Rà mọi luồng exporter ở 390px |
| J4 | Đo 4G giả lập, 500 công ty thử: trang công khai <3s, tìm <2s |
| J6 | Script `scripts/migrate_vybe.py`: users, companies, products, evidences từ XPO/SQL Server → Postgres; ánh xạ L0–L3; chạy thử T10, chạy thật T12; đối soát số lượng |
| J8 | Rà phân quyền mọi endpoint (test tự động quét router), OWASP top 10, bí mật; kiểm tải; thử khôi phục backup Postgres |
| J5 | 15–20 công ty DEMO có nhãn trên staging; onboarding 50–100 công ty thật; 2–3 pilot |

---

## 3. Thứ tự code và cổng kiểm tra (checkpoint)

Mỗi giai đoạn kết thúc bằng một cổng: chỉ sang giai đoạn sau khi các điều kiện "qua cổng" đạt. Không đạt thì cắt P1 trước, không lấn P0.

| GĐ | Thời gian | Code | Qua cổng khi |
|---|---|---|---|
| **1** | 29/9–12/10 | J7 → A0 → A1 → I6 → B1/B2 → B4 → B5 → B3 → A2 → A3 (xuyên suốt); C1 (chỉ tạo bảng) | Staging tự deploy; đăng ký → hồ sơ nháp <3 phút trên điện thoại; test mật khẩu rỗng xanh; 20 mã HS đã ký |
| **2** | 13/10–26/10 | C3 → J1 → C2 (API rồi UI) → C4 | 20 dòng thuế đã duyệt; golden test C2 xanh; ST25 ra cảnh báo; khách dùng máy tính không cần đăng nhập |
| **3** | 27/10–9/11 | I7 → I1 → C6 → C5 → H2 → I2 → I4 → I5 | 10/10 ca RoO đúng; EUR.1 có watermark; pending → verified <5 phút; đủ 50 mã đã ký |
| **4** | 10/11–23/11 | D1 → D4 → D2 → D3 | Bộ 50 câu đạt ngưỡng luật TM ký; ngoài phạm vi 100% |
| **5** | 24/11–7/12 | E1 → E2 → E3 → E4 → H1 → F1 → F2 → F3 → J2 → K1 → K2; J6 chạy thử | Vòng RFQ Việt–Anh hoàn tất; tìm kiếm <2s; test "chỉ verified" xanh |
| **6** | 8/12–21/12 | G1 → G2 → G3 → J3 → J6 thật → J4 → J8 | Đạt Definition of Done spec §11 |

**Đường găng:** C0 và D0 (luật TM). Backlog đã tính thiếu 3.5 ngày luật TM ở GĐ1 và 2 ngày ở GĐ2 — cần tăng % thời gian người duyệt lên 0.5–0.6 trong 4 tuần đầu, nếu không C2/C4 trễ kéo theo cả AI.

---

## 4. Việc có thể bắt đầu ngay hôm nay (T1)

1. Tạo monorepo theo cấu trúc mục 1.3, docker compose dev, CI khung (J7).
2. Migration 001: extensions + `users`, `sessions`, `audit_logs` (kèm trigger append-only).
3. Module `auth`: register/login/logout/me + `require_role` + test 4 vai trò (A1).
4. Frontend: 4 layout + next-intl + `generate:api` (A0, A3).
5. Song song: PO chốt người duyệt luật TM và 20 mã HS (C0); luật TM bắt đầu thu thập corpus (D0).
