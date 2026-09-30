# Kế hoạch thực thi — Trust & Anti-fraud (I11, I8, I10, I9, E6, E5, F4, B6)

> Bản 2 · 30/09/2026 · Viết lại theo code hiện tại (sau các commit I1/I2/I6/C6/F2/E2… trên nhánh `test-dev`).
> Nguồn: `docs/TRUST_ANTI_FRAUD_FRAMEWORK.md` (v1.0, §7 và §10 cập nhật 30/09) + `docs/EVFTA_eu_Backlog_MVP_bosung_trust.xlsx` (sheet Backlog, Mô hình dữ liệu, Ma trận nguồn, Lịch tuần — bản chuẩn, trước đây tên "… (1).xlsx").
> 4 điểm đơn giản hoá so với bản 1 đã được duyệt (xem §4) và đã ghi vào framework §10. Tình trạng các chỗ tài liệu lệch nhau: §3.3.

## 0. Context

Buyer EU cần trả lời trong 1 phút: công ty có thật/đúng người không, có đủ năng lực/giấy tờ không, đã giao hàng tử tế chưa. Framework thay **một huy hiệu tổng** bằng **4 trục độc lập** (Danh tính, Năng lực, Lịch sử thương mại, Toàn vẹn), xác minh **theo từng tuyên bố** có nguồn, ngày, người kiểm. Tín hiệu tự động chỉ xếp ưu tiên — **không bao giờ tự đổi trạng thái xác minh** (AGENTS §6.9).

**Nền tảng kỹ thuật đã xong. Thứ đang chặn giờ chỉ là duyệt của con người** (PO duyệt backlog, luật TM ký ma trận nguồn — §3).

Tổng công sức giữ nguyên: **22 ngày-dev + 1.5 ngày luật TM**.

## 1. Hiện trạng — điểm cắm sẵn có

Bản 1 ghi "code chỉ có A1, không bắt đầu được". Nay đã sai: mọi hạng mục tiên quyết (I6, B1/B2, B4, I7, I1, I2, C6, F2, E2/E3, Procrastinate) đã có trong code. Trust **dùng lại** các điểm sau, không viết mới:

| Đã có | File | Trust dùng cho |
|---|---|---|
| `core.audit.record()` + hàm trigger `forbid_mutation()` (migration 0002) | `backend/app/core/audit.py` | Audit hành động admin; gắn cùng trigger cho `evidence_checks` |
| Event bus `publish/subscribe` | `backend/app/core/events.py` | Thêm `EvidenceCreated` → job tính hash / tín hiệu sửa file |
| Procrastinate + job hằng ngày 02:15 UTC | `backend/app/jobs/verification_expiry.py` | Kiểm lại danh sách tham chiếu (I10), gỡ liên kết B6 hết hạn |
| `decide()` + `_TRANSITIONS` | `verification/service.py:24,64` | Đường duy nhất đổi trạng thái; trust **không thêm transition** |
| Hàm thuần `is_evfta_verified()` + `sync_level()` | `verification/logic.py:44`, `verification/evidence_service.py:310` | Cổng I8/I11 mở rộng tại đây (thêm tham số) |
| `evidence_types` / `required_evidence_rules` (`is_required`, `reviewed_by`) | `verification/models.py` | **Đóng vai** `claim_types` / `category_claim_rules` |
| `request_service.queue()` + `AdminVerificationQueue` | `verification/request_service.py:100`, `frontend/components/AdminVerificationQueue.tsx` | Checklist I8; đẩy hồ sơ có cờ lên đầu |
| Engine xlsx (template/export/dry-run import) + `AdminComplianceData`/`ImportDialog` | `backend/app/core/spreadsheet.py`, `frontend/components/admin-compliance/*` | Nhập danh sách tham chiếu I10 (openpyxl đã cài) |
| `immutable_unaccent()` + index GIN trigram | migration 0006, 0022 | So khớp tên/địa chỉ chuẩn hoá (I10). `similarity()` chưa được dùng ở đâu |
| Mẫu đăng ký callback `register_evidence_counter` | `companies/service.py:192` | companies/auth gọi kiểm blocklist mà không import vòng |
| `is_valid_vn_tax_id`, `is_valid_vat_or_eori` | `companies/completeness.py:66,76` | Kiểm định dạng trước khi gọi VIES (E6, B6) |
| `verified_exporter_conditions`, `get_public_profile` + `SupplierProfile` | `companies/product_service.py:212,411`, `frontend/components/SupplierProfile.tsx` | Trust Profile 4 trục (E5) nằm trong bộ lọc verified sẵn có |
| `conversation_service.send_message`, `MessageOut` | `messaging/conversation_service.py` | F4: phát hiện thông tin thanh toán khi đọc |

## 2. Khoảng trống trong code phải lấp

1. **Không có hash file.** Upload đi qua presigned PUT nên server không bao giờ thấy nội dung file. Cần:
   - thêm `get(key)` vào `Storage`;
   - thêm cột `evidences.file_sha256`;
   - một job chạy sau khi tạo bằng chứng để tính hash.

   Hash cần cho blocklist, gom cụm (I11) và I9. **Làm trong I11.**
2. **`companies` thiếu một số trường:**
   - Không có số điện thoại công ty → dùng `users.phone` của chủ tài khoản.
   - Không có cột domain → suy ra bằng hàm thuần từ `website` / `contact_email`.
   - Không có ngày thành lập đầy đủ (chỉ có `founded_year`), không có người đại diện, không có trạng thái thuế → **admin nhập từ kết quả tra sổ đăng ký**, ghi thành một check. Không tự động hoá.
3. **Ô cam kết onboarding chưa gửi lên backend.** `frontend/components/SellerOnboarding.tsx:886-906` chỉ lưu local. I9 thêm cột `evidences.attested_at` cho cam kết khi upload.
4. **Chiều phụ thuộc module là `verification → companies → auth`.**
   - `auth.register` và `companies.create/update_company` không được import verification.
   - Việc kiểm blocklist ở đó dùng mẫu callback đã có (`register_evidence_counter`).
5. **Frontend:**
   - Chuỗi thật đi qua `frontend/i18n/catalog.json` + `tr()`. `messages/{vi,en}.json` chỉ còn metadata.
   - Còn các trang mock mức L1–L3 mâu thuẫn với mô hình 4 trục: `HomePage`, `BuyerSellerDetail`, tab `/exporter/company` trong `SellerWorkspace`.
   - Mọi thay đổi giao diện phải **trình mockup và hỏi trước** (giữ UI prototype).
6. **Chưa có event `EvidenceCreated`.** Thêm vào `verification/events.py` khi cần (I11).

## 3. Việc cần chốt trước khi code (không phải việc dev)

### 3.1 Chặn hạng mục

| # | Việc | Ai | Chặn | Hiện trạng đã kiểm |
|---|---|---|---|---|
| 1 | Duyệt 9 hạng mục mới vào `docs/backlog/EVFTA_eu_Backlog_MVP.xlsx` | PO | tất cả | Backlog chính **chưa có** I8–I11, E5, E6, F4, B6, X9. **Không chép đè cả file bổ sung lên backlog chính**: file bổ sung tách ra từ bản backlog cũ, thiếu phần "BỔ SUNG 29/09/2026" của C6, X4 và một phần mô hình dữ liệu I1/I2/C6 → chỉ chép các dòng mới + sheet "Ma trận nguồn" |
| 2 | ~~Chốt file xlsx chuẩn~~ | PO | — | **Xong 30/09**: giữ bản `(1)` dưới tên `docs/EVFTA_eu_Backlog_MVP_bosung_trust.xlsx`, bỏ bản nháp cũ (thiếu sheet Ma trận nguồn và I10, I11, E6, F4, B6, X9) |
| 3 | Luật TM ký sheet **Ma trận nguồn** | BA + luật TM | I10, checklist I8 | 11 dòng, **0 dòng đã ký**; 5 dòng còn "Cần xác định"/"?" |
| 4 | Xác định nguồn chính thức có **số điện thoại** trên hồ sơ đăng ký | BA | claim "Đã chứng minh quyền sở hữu" (I11) | Dòng ma trận ghi "Cần BA xác định" |
| 5 | Duyệt 4 dependency: `pyhanko`, `pikepdf`, `imagehash`, thư viện đọc QR | PO | I9 | Chưa cài |
| 6 | Luật sư duyệt điều khoản quét chat tìm thông tin thanh toán | Luật sư | F4 | — |
| 7 | Duyệt mở rộng phạm vi sang seller đăng ký tại EU | PO | B6 | — |
| 8 | Luật TM duyệt loại bằng chứng `bank_letter` (thư xác nhận ngân hàng) | Luật TM | F4 | Nhập như mọi `evidence_types` khác |

### 3.2 Không cần dependency mới cho gọi API ngoài
Tuổi domain (RDAP) và VIES đều là REST/JSON, gọi được bằng `httpx` (đã có qua `fastapi[standard]`). Vẫn phải làm đủ ba thứ theo AGENTS §5.5:
- interface trong `core`;
- bản fake cho test;
- gọi qua job nền.

### 3.3 Tài liệu lệch nhau

Đã sửa 30/09 (theo yêu cầu người dùng):
- AGENTS.md §1 và CLAUDE.md: đường dẫn `KE_HOACH_CODE_THEO_MODULE.md` → **gốc repo** (trước ghi `docs/`).
- AGENTS.md §7: thêm `ai_query_feedback` vào danh sách append-only (trigger có từ migration 0021). Thêm `evidence_checks` khi I11 tạo bảng.
- Framework §10: bỏ `claim_types`, `category_claim_rules`, `account_clusters`, `payment_detail_changes`, cột `companies.trade_history_level`; thêm `evidences.file_sha256`, ghi rõ dùng lại bảng C6.
- Framework §7: gom cụm theo thiết bị chuyển sang sau MVP.

Còn lại cho PO (không tự sửa):
- Cột "Trạng thái" của backlog chính ghi "Chưa bắt đầu" cho **cả 49/49 hạng mục**, kể cả những mục đã có code (A1, I1, I2, C6, F2…). Cột này chưa được cập nhật; việc đánh dấu "xong" cần PO đối chiếu tiêu chí "Xong khi", không để agent tự điền.

## 4. Bảng theo module

Giữ đúng danh sách module ở AGENTS §4, không thêm module.

| Module | Bảng mới | Thay đổi bảng có sẵn |
|---|---|---|
| `verification` | `evidence_checks` (append-only), `certification_bodies`, `sources`, `reference_lists`, `reference_list_entries`, `identity_signals`, `blocklist_identifiers`, `document_access_requests` | `evidences.file_sha256` (I11), `evidences.attested_at` (I9) |
| `companies` | `trade_records` (E6), `company_relationships` (B6) | — |
| `messaging` | — | Hàm thuần phát hiện thông tin thanh toán; `MessageOut.payment_warning` tính khi đọc |
| `directory` | — | Đọc trust qua `verification.service` + `companies.service` |

`evidence_checks` là bảng chung cho mọi lần đối chiếu:
- `company_id` bắt buộc; `evidence_id` nullable.
- `subject`: `legal_entity | ownership | evidence`.
- `check_type`: `registry_lookup | issuer_email | internal_consistency | tamper_signal | reference_match`.
- `result`: `match | mismatch | not_found | unchecked`.
- `source_id`, `reference_entry_id`, `snapshot_key`, `note`, `checked_by` (NULL = hệ thống), `checked_at`.

Hai claim danh tính ("pháp nhân tồn tại", "đã chứng minh quyền sở hữu") áp cho mọi nhóm hàng, nên chúng là check cấp công ty (`evidence_id = NULL`), không phải loại bằng chứng.

**Đã bỏ so với bản 1 (được duyệt 30/09):**

| Bỏ | Thay bằng |
|---|---|
| `claim_types`, `category_claim_rules` | `evidence_types` + `required_evidence_rules` sẵn có. `is_required = true` là bắt buộc, `false` là tăng điểm/nhắc |
| `account_clusters` | Truy vấn gom theo định danh trùng (tax_id, domain, phone, file_sha256) lúc đọc, không lưu bảng |
| Gom cụm theo thiết bị | Không làm ở MVP. `sessions` không lưu IP/UA, và thu fingerprint chạm GDPR |
| `payment_detail_changes` | Hệ thống không lưu thông tin ngân hàng. "Vừa đổi ngân hàng" = có evidence `bank_letter` được duyệt ≤ 30 ngày trong khi đã có thư cũ hơn |
| `companies.trade_history_level` | Hàm thuần tính từ `trade_records` đã xác nhận, lúc đọc |

**Quy tắc chung cho mọi hạng mục:**
- Dữ liệu cấu hình (`certification_bodies`, `sources`, `evidence_types`, `required_evidence_rules`) phải có `reviewed_by` + `reviewed_at`. Dòng chưa duyệt không được dùng trong logic hay API (giống AGENTS §6.2).
- Logic so khớp và tính mức là hàm thuần (`verification/signals.py`, `verification/matching.py`, `verification/trust.py`, `companies/trade.py`, `messaging/payment_detect.py`), test bằng bảng `parametrize`.
- Mỗi hạng mục một migration. `evidence_checks` dùng trigger `forbid_mutation()` sẵn có.
- Mọi hành động admin ghi `core.audit.record()`: xác nhận khớp, thêm/gỡ blocklist, xác nhận trade record, mở file gốc.
- Router mới phải có test 401/403.
- Sửa schema/route → chạy `npm run generate:api`.

## 5. Kế hoạch từng hạng mục (theo thứ tự thực thi)

### I11 — Chống mạo danh & gian lận danh tính · P0 · 3 ngày
**Phụ thuộc:** B1, I6, I7 — **đã xong**. Chỉ còn chờ §3.1 #1, và #4 cho phần quyền sở hữu.

- **Hạ tầng hash.**
  - Thêm `Storage.get()` và cột `evidences.file_sha256`.
  - Thêm event `EvidenceCreated`, và job Procrastinate tính SHA-256 sau khi tạo bằng chứng.
- **Bảng mới:**
  - `identity_signals` (company_id, type, value, severity, detected_at, resolved_by, resolved_at).
  - `blocklist_identifiers` (identifier_type `tax_id|domain|phone|file_sha256`, value, reason, added_by, created_at).
  - `evidence_checks` (xem §4). Tạo ở đây vì claim quyền sở hữu cần nó.
- **Hàm thuần `verification/signals.py`:**
  - email miễn phí cho công ty;
  - domain email ≠ domain website;
  - `founded_year` lệch với năm thành lập admin nhập từ sổ đăng ký;
  - định danh trùng với công ty khác.

  **Số điện thoại hay IP nước ngoài không phải cờ.**
- **Kiểm blocklist** qua callback đăng ký theo mẫu `register_evidence_counter`:
  - `auth.register`: domain email, số điện thoại.
  - `companies.create_company` / `update_company`: tax_id, domain website.
  - Job hash: file_sha256. Việc này chạy bất đồng bộ nên chỉ **gắn cờ**, không chặn.
- **Quyền sở hữu:** admin ghi `evidence_checks` với `subject = ownership`, kèm kết quả gọi lại số chính thức và kiểm email theo domain.
- **Cổng:** thêm tham số `ownership_proven` vào `is_evfta_verified`. `sync_level` tính giá trị này từ `evidence_checks`.
- **FE:** tab mới trong `AdminConsole` (cụm tài khoản + danh sách chặn). **Trình mockup trước.**
- **Test "Xong khi":**
  - 5/5 ca gom cụm;
  - định danh bị chặn không đăng ký hay tạo công ty lại được;
  - không có đường code nào ngoài `decide()` đổi `verification_status`;
  - chưa chứng minh quyền sở hữu thì không lên `evfta_verified`.

### I8 — Kiểm chéo bằng chứng với nguồn cấp · P0 · 3 + 0.5 luật TM
**Phụ thuộc:** C6, I1, I2, I6 (đã xong) và I11 (cần `evidence_checks`).

- **Bảng `certification_bodies`:** name, official_domain, lookup_url, accreditation_body, iaf_mla, reviewed_by, reviewed_at. Nhập/xuất xlsx qua `core/spreadsheet.py` giống `evidence_types`.
- **Checklist ngay trong `AdminVerificationQueue`:**
  - tra MST (tra tay; ảnh chụp tải lên qua `/api/uploads/presign` với purpose mới `check_snapshot`);
  - tra IAF CertSearch;
  - mẫu email xác nhận, gửi tới địa chỉ lấy từ `certification_bodies`, **không lấy từ file**.
- **So khớp nội bộ bằng hàm thuần `verification/matching.py`** (không dùng LLM):
  - tên pháp nhân trên chứng nhận = `legal_name` = MST;
  - địa chỉ;
  - phạm vi chứng nhận bao nhóm HS đang bán;
  - domain email = website.

  Chuẩn hoá tên: bỏ dấu, bỏ "CÔNG TY TNHH / CO., LTD / JSC".
- **Cổng:** mở rộng `is_evfta_verified`. Mỗi loại bằng chứng bắt buộc phải có ít nhất 1 check `match`.
- **Hàng đợi:** `request_service.queue()` sắp hồ sơ có check `mismatch` / `tamper_signal` lên đầu.
- **Test:**
  - 5/5 ca cờ: tên lệch, địa chỉ lệch, phạm vi lệch, trùng MST, domain lệch;
  - bằng chứng đã duyệt luôn có ít nhất 1 check đủ nguồn, ảnh, người, ngày.

### I10 — Ma trận nguồn + danh sách tham chiếu · P0 · 2.5 + 0.5 luật TM
**Phụ thuộc:** I8, B4 (đã có `hs_codes.category`). **Chặn bởi §3.1 #3.**

- **Bảng:**
  - `sources` (type A/B/C/D, url, coverage, update_frequency, reviewed_by, reviewed_at);
  - `reference_lists` (source_id, version, imported_at, imported_by);
  - `reference_list_entries` (tax_id, facility_code, name_norm, address_norm; index `gin_trgm_ops`).
- **Tuyên bố bắt buộc / tăng điểm:** dùng `required_evidence_rules` sẵn có. Checklist đã đọc từ DB, không có danh sách viết cứng cần xoá.
- **Nhập danh sách loại B:** dùng engine xlsx `core/spreadsheet.py` + `ImportDialog` (dry-run rồi mới áp dụng). Bỏ ý "chỉ nhận CSV" của bản 1, vì openpyxl đã cài.
- **So khớp theo thứ tự:**
  1. MST.
  2. Mã cơ sở / số chứng nhận.
  3. Tên + địa chỉ bằng `similarity()` của pg_trgm.

  **Khớp gần đúng không bao giờ tự nhận:** hệ thống ghi check `unchecked`, chờ admin xác nhận.
- **Kiểm lại** khi có phiên bản danh sách mới: thêm bước vào job hằng ngày sẵn có.
- **Seed:** chỉ những dòng ma trận đã có chữ ký luật TM. Đợt đầu là danh sách cơ sở thủy sản EU phê duyệt.
- **Test:**
  - nhập được 1 danh sách B và khớp đúng trên dữ liệu thử;
  - khớp gần đúng không tự nhận;
  - checklist lấy từ DB.

### I9 — Tín hiệu chỉnh sửa file · **P1** · 3 ngày
**Phụ thuộc:** C6, I8, và hạ tầng hash của I11. **Chặn bởi §3.1 #5.** Cắt được nếu trễ.

- **Job nghe `EvidenceCreated`**, đọc file qua `Storage.get`, rồi kiểm:
  - chữ ký số (pyHanko);
  - QR phải trỏ về domain khớp `official_domain`;
  - cấu trúc PDF (pikepdf): Producer lạ, hơn 1 incremental update, ModDate sau ngày cấp, font lệch;
  - perceptual hash: trùng với file của công ty khác → cờ;
  - logic ngày: ngày cấp < ngày hết hạn, ISO ≤ 3 năm.
- **Ghi kết quả** vào `evidence_checks` với `check_type = tamper_signal` kèm lý do. Cờ chỉ đẩy hồ sơ lên đầu hàng đợi.
- **Form upload:**
  - bắt buộc PDF gốc cho chứng nhận chính;
  - ô cam kết lưu vào `evidences.attested_at`. Backend từ chối tạo bằng chứng nếu thiếu cam kết.
- **Test:**
  - bộ file mẫu cho ra cờ đúng: file thật, file sửa bằng Photoshop/Canva, file đổi tên từ công ty khác, PDF ký hợp lệ, PDF sửa sau khi ký;
  - không có đường code nào đổi `verification_status`.

### E6 — Lịch sử thương mại + nhãn nhà xuất khẩu mới · P0 · 3.5 ngày
**Phụ thuộc:** C6, I8.

- **Bảng `trade_records`** (module companies): company_id, type `domestic_qc|indirect_export|non_eu_export|eu_export`, counterparty, counterparty_vat, evidence_id, container_no, bl_no, confirmation_status, confirmed_by, confirmed_at.
- **Hàm thuần `companies/trade.py`:**
  - chữ số kiểm tra **ISO 6346** (sai thì chặn);
  - `trade_history_level()` tính từ các record đã xác nhận. **Không lưu cột.**
- **Xác nhận buyer cũ:**
  - VAT phải hợp lệ trên VIES: kiểm định dạng bằng `is_valid_vat_or_eori`, sau đó gọi VIES qua interface `core` + fake, chạy trong job nền;
  - admin tự tìm liên hệ của buyer.
- **"Sẵn sàng xuất khẩu":** đọc từ `compliance.service` (RoO pass, EUR.1 nháp) + checklist C6 (đủ bằng chứng bắt buộc).
- **Nhãn "Nhà xuất khẩu mới":** hiện khi chưa có trade_record đã xác nhận. Không trừ điểm trục khác.
- **Test:**
  - container sai chữ số kiểm tra bị chặn;
  - buyer cũ chỉ được tính khi VAT hợp lệ;
  - seller chưa xuất khẩu vẫn đạt đủ trục Danh tính + Năng lực.

### E5 — Trust Profile 4 trục · P0 · 2.5 ngày
**Phụ thuộc:** I8, I10, I11, E6 (E3, E4 đã xong).

- **Hàm thuần `verification/trust.py`:**
  - tính mức 4 trục;
  - gán nhãn độ mạnh cho claim: "Đã xác nhận với nơi cấp" / "Tài liệu điện tử chưa bị sửa" / "Đã xem tài liệu, chưa xác nhận nguồn";
  - claim còn cờ chưa xử lý thì ẩn.
- **API:** mở rộng `/api/public/companies/{slug}` (hoặc thêm `/trust`) bên trong bộ lọc `verified_exporter_conditions` sẵn có (§6.10). Không trả file gốc. Không công khai bằng chứng nhóm `origin`, giữ nguyên `NON_PUBLIC_GROUPS`.
- **Bảng `document_access_requests`:**
  - buyer gửi yêu cầu xem file → seller đồng ý → `Storage.presign_get` (10 phút);
  - mỗi lần mở ghi audit.
- **FE:** mở rộng `SupplierProfile`: 4 trục, drill-down từng claim, link tra cứu MST chính thức, câu miễn trừ E4, chuỗi qua `tr()` + `i18n/catalog.json`. **Trình mockup trước.**
- **Test:**
  - file gốc không mở được khi seller chưa đồng ý;
  - mọi lượt mở đều có nhật ký;
  - mọi claim hiển thị đều có nguồn + ngày.

### F4 — Cảnh báo lừa thanh toán · P0 · 1.5 ngày
**Phụ thuộc:** F2 (đã xong), C6. **Chặn bởi §3.1 #6 và #8.**

- **Hàm thuần `messaging/payment_detect.py`:**
  - IBAN có kiểm mod-97;
  - số tài khoản;
  - cụm từ yêu cầu chuyển tiền (vi/en).
- **Hiển thị:** `MessageOut.payment_warning` tính khi đọc, dùng để hiện banner cho buyer. **Không chặn tin nhắn**, không thêm bảng.
- **"Vừa đổi ngân hàng":** có evidence `bank_letter` được duyệt trong ≤ 30 ngày, trong khi đã có thư cũ hơn. Khi đó hiện cảnh báo trên hồ sơ và trong chat.
- **Test:**
  - 5/5 mẫu có thông tin thanh toán ra cảnh báo;
  - 0/20 mẫu thường bị báo nhầm (bộ mẫu do BA soạn);
  - thư ngân hàng mới trong 30 ngày thì hiện cảnh báo.

### B6 — Nhà phân phối EU liên kết nhà sản xuất VN · **P1** · 3 ngày
**Phụ thuộc:** B2, I7, I8, E5. **Chặn bởi §3.1 #7.** Cắt được.

- **Bảng `company_relationships`:** producer_id, representative_id, relation_type, evidence_id, producer_confirmed_at, expires_at, revoked_at.
- **Xác minh công ty EU:** kiểm định dạng VAT/EORI bằng `is_valid_vat_or_eori`, sau đó gọi VIES qua interface của E6.
- **Hiển thị** "Sản xuất bởi … · Phân phối bởi …" chỉ khi producer đã xác nhận. Liên kết hết hạn thì tự gỡ (một bước trong job hằng ngày sẵn có). Producer thu hồi được liên kết.
- **Test:**
  - chưa xác nhận thì không gắn tên nhà sản xuất;
  - hết hạn thì tự gỡ;
  - thu hồi được.

### X9 — Sau MVP
Không làm: GPS/video call, RASFF, phát hiện thổi phồng năng lực, khiếu nại công khai, seller ở nước thứ ba, ELA/máy dò ảnh AI, gom cụm theo thiết bị.

## 6. Lịch

Nền tảng đã xong nên lịch giờ chỉ phụ thuộc việc duyệt.

| Tuần | Trust | Điều kiện còn lại |
|---|---|---|
| T2–4 (từ khi PO duyệt → 26/10) | I11 | §3.1 #1. Có thể bắt đầu **sớm hơn 13/10** |
| T5–6 (27/10–9/11) | I8 (T5 bảng + so khớp, T6 checklist), I10 (T6) | Luật TM ký ma trận trong T6 |
| T7 | I9 | Dependency đã được duyệt |
| T8 | E6 | — |
| T9 | E5 | Mockup UI được duyệt |
| T11 | F4, B6 | Luật sư duyệt; PO duyệt B6; `bank_letter` đã được duyệt |

## 7. Rủi ro

- **Luật TM là điểm nghẽn.** Ma trận nguồn hiện 0/11 dòng đã ký.
- **Cổng mới hạ mức hàng loạt.** Khi triển khai cổng I8/I11, `daily_refresh` sẽ `level_down` mọi công ty đang `evfta_verified` mà chưa có check. Hiện mới chỉ có dữ liệu seed/testkit, nhưng trước pilot cần quyết định cách xử lý dữ liệu cũ.
- **Trang mock L1–L3 mâu thuẫn với mô hình 4 trục** (`HomePage`, `BuyerSellerDetail`, `/exporter/company`). Người mua thấy hai mô hình tin cậy khác nhau cho tới khi các trang này được thay (cần hỏi trước).
- **Tra MST có captcha** → ở MVP chỉ tra tay + lưu ảnh chụp.
- **Phần tính hash chạy bất đồng bộ.** Blocklist theo `file_sha256` chỉ gắn cờ sau khi upload, không chặn được ngay lúc nộp.

## 8. Verification (mỗi hạng mục)

Đọc trước: dòng backlog tương ứng + mục M6/M8/M9 trong `KE_HOACH_CODE_THEO_MODULE.md` (ở **gốc repo**).

```bash
cd backend
uv run alembic upgrade head
uv run ruff check . && uv run ruff format --check .
uv run mypy app
uv run pytest app/modules/verification app/modules/companies app/modules/messaging app/jobs
cd ../frontend && npm run generate:api && npm run lint && npm run typecheck && npm test
```

Mỗi hạng mục kết thúc bằng checkpoint theo AGENTS §11.5, commit dạng `<mã>: <mô tả>`, rồi dừng chờ review.

## 9. Bước tiếp theo

1. PO duyệt 9 hạng mục vào backlog chính (§3.1 #1) — chép dòng mới từ file bổ sung, không chép đè cả file.
2. Bắt đầu **I11** bằng plan mode: trình bảng, API, file sẽ sửa và test để duyệt trước khi code (chạm >1 module và thêm bảng).
3. Song song, BA + luật TM hoàn thiện ma trận nguồn trước T6.
