# Kế hoạch thực thi — Trust & Anti-fraud (I11, I8, I10, I9, E6, E5, F4, B6)

> Nguồn: `docs/TRUST_ANTI_FRAUD_FRAMEWORK.md` (v1.0, 30/09/2026) + `docs/EVFTA_eu_Backlog_MVP_bosung_trust (1).xlsx` (sheet Backlog, Mô hình dữ liệu, Ma trận nguồn, Lịch tuần).
> Sau khi duyệt: lưu bản này thành `docs/TRUST_IMPLEMENTATION_PLAN.md` (không nằm trong `docs/spec|backlog|adr` nên được phép tạo).

## 0. Context

Buyer EU cần trả lời trong 1 phút: công ty có thật/đúng người không, có đủ năng lực/giấy tờ không, đã giao hàng tử tế chưa. Framework thay **một huy hiệu tổng** bằng **4 trục độc lập** (Danh tính, Năng lực, Lịch sử thương mại, Toàn vẹn), xác minh **theo từng tuyên bố (claim)** có nguồn, ngày, người kiểm. Tín hiệu tự động chỉ xếp ưu tiên — **không bao giờ tự đổi trạng thái xác minh** (AGENTS §6.9).

Tổng công sức: **22 ngày-dev + 1.5 ngày luật TM**, rải GĐ2 → GĐ6 (13/10 → 21/12).

## 1. Hiện trạng repo — điểm nghẽn lớn nhất

Code hiện chỉ có **A1 (auth)**. Mọi hạng mục trust đều phụ thuộc thứ **chưa tồn tại**:

| Thiếu | Hạng mục backlog | Ai cần |
|---|---|---|
| `core/audit.py` + bảng `audit_logs` | I6 | I11, I8, E5, B6 |
| `core/events.py` | (hạ tầng) | I11, I9, E6 |
| Procrastinate (job nền) — chưa có trong `pyproject.toml`, `app/jobs/` rỗng | J7/hạ tầng | I9, I10, I7, F4 |
| module `companies` (bảng `companies`) | B1, B2 | **tất cả** |
| `hs_codes` + nhóm hàng | B4 | I10 |
| `verification_status/level`, `verification_requests/decisions` | I7, I1, I2 | I8, I11, E5 |
| `evidences` | C6 | I8, I9, E6, F4 |
| `conversations/messages` | F2 | F4 |
| `docs/KE_HOACH_CODE_THEO_MODULE.md` | — | CLAUDE.md yêu cầu đọc, **file không có trong repo** |

→ **Không bắt đầu code trust được ngay.** Thứ tự bắt buộc: I6 → B1/B2 → B4 → I7 → I1 → C6 → I2, rồi mới đến trust.

## 2. Việc cần chốt TRƯỚC khi code (không phải việc dev)

| # | Việc | Ai | Chặn hạng mục |
|---|---|---|---|
| 1 | Duyệt 9 hạng mục mới (đang "chờ duyệt") vào backlog chính `docs/backlog/EVFTA_eu_Backlog_MVP.xlsx` | PO | tất cả |
| 2 | Luật TM duyệt sheet **Ma trận nguồn** — hiện 11 dòng đều **chưa ký**, 5 dòng nguồn "Cần xác định"/"?" (IUU, ATTP gạo, NĐ 103/2020, vùng trồng, danh sách EU thủy sản) | BA + Luật TM (T6) | seed dữ liệu I10, checklist I8 |
| 3 | Xác định nguồn chính thức có **số điện thoại** trên hồ sơ đăng ký (dòng "Đã chứng minh quyền sở hữu") | BA | I11 |
| 4 | Duyệt 4 dependency I9: `pyhanko`, `pikepdf`, `imagehash`, thư viện đọc QR | PO | I9 |
| 5 | Luật sư duyệt điều khoản quét chat tìm thông tin thanh toán | Luật sư (T11) | F4 |
| 6 | Duyệt mở rộng phạm vi seller đăng ký tại EU (spec §3 chỉ có exporter VN) | PO | B6 |
| 7 | Hai file xlsx `..._bosung_trust.xlsx` và `..._bosung_trust (1).xlsx` **khác nhau** — chốt bản nào là chuẩn | PO | — |
| 8 | AGENTS.md §7 chỉ liệt kê 4 bảng append-only; `evidence_checks` cũng append-only → cần cập nhật AGENTS.md (người dùng sửa) | Tech lead | I8 |

## 3. Phân bổ bảng vào module (đề xuất — giữ đúng danh sách module AGENTS §4, không thêm module mới)

| Module | Bảng mới | Hạng mục |
|---|---|---|
| `verification` | `certification_bodies`, `evidence_checks` (append-only), `claim_types`, `category_claim_rules`, `sources`, `reference_lists`, `reference_list_entries`, `identity_signals`, `account_clusters`, `blocklist_identifiers`, `document_access_requests` | I8, I10, I11, I9, E5 |
| `companies` | `trade_records`, cột `companies.trade_history_level`, `payment_detail_changes`, `company_relationships` | E6, F4, B6 |
| `messaging` | (không bảng mới) hàm thuần phát hiện thông tin thanh toán | F4 |
| `directory` | (không bảng mới) API Trust Profile công khai đọc qua `verification.service` + `companies.service` | E5 |

Quy tắc chung áp cho mọi hạng mục:
- Dữ liệu cấu hình (`certification_bodies`, `sources`, `category_claim_rules`, `claim_types`) có `reviewed_by` + `reviewed_at`; dòng chưa duyệt **không được dùng** trong logic/API (giống §6.2).
- Logic so khớp/tính mức là **hàm thuần** (`verification/rules.py`, `companies/trade.py`) → test bằng bảng `parametrize`.
- Mỗi migration một hạng mục; trigger chặn UPDATE/DELETE cho `evidence_checks`.
- Mọi hành động admin (xác nhận khớp, thêm blocklist, xác nhận trade record, mở file gốc) ghi `core.audit.record()`.
- Router mới: test 401/403.

## 4. Kế hoạch từng hạng mục (theo thứ tự thực thi)

### I11 — Chống mạo danh & gian lận danh tính · P0 · GĐ2 (T3–4) · 3 ngày
**Phụ thuộc:** B1, I6. (Ràng buộc "không lên evfta_verified" cần I7 — làm phần đó khi I7 xong.)
- Bảng: `identity_signals` (company_id, type, value, severity, detected_at), `account_clusters` (shared_identifier, company_ids), `blocklist_identifiers` (identifier_type: tax_id|domain|phone|file_hash, value, reason, added_by).
- Hàm thuần `verification/signals.py`: email miễn phí cho công ty, tuổi domain, thành lập < 1 năm nhưng khai lâu năm, đổi tên/người đại diện, trạng thái thuế không hoạt động. **Số/IP nước ngoài không là cờ.**
- Gom cụm theo điện thoại, domain, hash file, người đại diện, thiết bị.
- Kiểm blocklist tại `auth.service.register` và khi nộp bằng chứng (gọi `verification.service.is_blocked()`).
- Ghi kết quả "gọi lại số điện thoại chính thức" + "email thuộc domain chính thức" → claim "Đã chứng minh quyền sở hữu".
- FE admin: màn hình cụm tài khoản, danh sách chặn.
- **Test "Xong khi":** 5/5 ca gom cụm; định danh bị chặn không đăng ký lại được; tín hiệu chỉ đẩy hàng đợi (test không có đường code nào đổi `verification_status`); thiếu quyền sở hữu → không lên `evfta_verified`.
- ⚠ Chạy trong GĐ2 nhưng B1 thuộc GĐ1 — nếu B1 trễ thì I11 trễ theo.

### I8 — Kiểm chéo bằng chứng với nguồn cấp · P0 · GĐ3 (T5–6) · 3 + 0.5 luật TM
**Phụ thuộc:** C6, I1, I6.
- Bảng `certification_bodies` (name, official_domain, lookup_url, accreditation_body, iaf_mla, reviewed_by), `evidence_checks` append-only (evidence_id, check_type `registry_lookup|issuer_email|internal_consistency|tamper_signal`, source_id, reference_entry_id, result `match|mismatch|not_found|unchecked`, snapshot_file, note, checked_by, checked_at).
- Checklist trên màn hình duyệt I2: tra MST (tracuunnt — tra tay, upload ảnh chụp qua `core.storage`), IAF CertSearch, **mẫu email xác nhận gửi tới địa chỉ lấy từ `certification_bodies`, không từ file**.
- So khớp nội bộ tự động bằng quy tắc (không LLM): tên pháp nhân chứng nhận = ERC = MST; địa chỉ; phạm vi chứng nhận bao nhóm HS đang bán; domain email = website; trùng MST/điện thoại/domain giữa hồ sơ. Chuẩn hoá tên dùng `unaccent` + bỏ "CÔNG TY TNHH / CO., LTD / JSC".
- Gate trong `verification.service.decide()`: không cấp `evfta_verified` khi bằng chứng bắt buộc chưa có check `match`.
- **Test:** 5/5 ca cờ (tên lệch, địa chỉ lệch, phạm vi lệch, trùng MST, domain lệch); bằng chứng đã duyệt luôn có ≥1 check đủ nguồn/ảnh/người/ngày.

### I10 — Ma trận nguồn + danh sách tham chiếu · P0 · GĐ3 (T6) · 2.5 + 0.5 luật TM
**Phụ thuộc:** I8, B4. **Chặn bởi việc #2 (luật TM duyệt ma trận).**
- Bảng `claim_types`, `category_claim_rules` (category_id, claim_type_id, required, market), `sources` (type A/B/C/D, url, coverage, update_frequency, reviewed_by), `reference_lists` (source_id, version, imported_at), `reference_list_entries` (tax_id, facility_code, name_norm, address_norm; index `gin_trgm_ops`).
- Nhập CSV/Excel loại B qua màn hình admin (dùng `csv` stdlib; Excel cần dependency — **đề xuất chỉ nhận CSV ở MVP**).
- So khớp: MST → mã cơ sở/số chứng nhận → tên+địa chỉ (`pg_trgm similarity`). **Khớp gần đúng không bao giờ tự nhận** — tạo check `unchecked` chờ admin xác nhận.
- Job kiểm lại khi có phiên bản danh sách mới (cần Procrastinate).
- Checklist I8 đọc tuyên bố bắt buộc từ `category_claim_rules` (xoá mọi danh sách viết cứng).
- Seed: chỉ dòng đã có tên luật TM duyệt; đợt đầu danh sách cơ sở thủy sản EU phê duyệt.
- **Test:** 1 danh sách B nhập được + khớp đúng trên dữ liệu thử; khớp gần đúng không tự nhận; checklist lấy từ DB.

### I9 — Tín hiệu chỉnh sửa file · **P1** · GĐ4 (T7) · 3 ngày
**Phụ thuộc:** C6, I8. **Chặn bởi việc #4 (dependency).** Cắt được nếu trễ.
- Job nền sau upload: chữ ký số (pyHanko), QR → domain phải khớp `official_domain`, cấu trúc PDF (pikepdf: Producer lạ, >1 incremental update, ModDate > ngày cấp, font lệch), perceptual hash so mọi file (trùng khác công ty → cờ), logic ngày (cấp < hết hạn; ISO ≤ 3 năm).
- Ghi `evidence_checks` `tamper_signal` + lý do; cờ chỉ đẩy lên đầu hàng đợi I1.
- Form upload: bắt PDF gốc cho chứng nhận chính + ô cam kết.
- **Test:** bộ file mẫu (thật, sửa Photoshop/Canva, đổi tên từ công ty khác, PDF ký hợp lệ, PDF sửa sau ký) cho cờ đúng; test không có đường code nào đổi `verification_status`.

### E6 — Lịch sử thương mại + nhãn nhà xuất khẩu mới · P0 · GĐ4 (T8) · 3.5 ngày
**Phụ thuộc:** C6, I8.
- Bảng `trade_records` (company_id, type `domestic_qc|indirect_export|non_eu_export|eu_export`, counterparty, documents, container_no, bl_no, confirmation_status) + `companies.trade_history_level`.
- Hàm thuần: chữ số kiểm tra **ISO 6346** (chặn khi sai), tính `trade_history_level` từ record đã xác nhận.
- Xác nhận buyer cũ: VAT hợp lệ trên VIES (qua interface mới trong `core` + bản fake để test — **gọi API ngoài phải qua job nền**), liên hệ do admin tự tìm.
- "Sẵn sàng xuất khẩu" đọc từ `compliance.service` (RoO pass, EUR.1 nháp, đủ claim bắt buộc).
- Nhãn "Nhà xuất khẩu mới" khi chưa có trade_record — không trừ điểm trục khác.
- **Test:** container sai chữ số kiểm tra bị chặn; buyer cũ chỉ tính khi VAT hợp lệ; seller chưa xuất khẩu vẫn đạt đủ Danh tính + Năng lực.

### E5 — Trust Profile 4 trục · P0 · GĐ5 (T9) · 2.5 ngày
**Phụ thuộc:** I8, I10, I11, E6, E3, E4.
- Hàm thuần tính mức 4 trục + nhãn độ mạnh claim (`Đã xác nhận với nơi cấp` / `Tài liệu điện tử chưa bị sửa` / `Đã xem tài liệu, chưa xác nhận nguồn`); claim còn cờ chưa xử lý → ẩn.
- API `/api/public/companies/{id}/trust` (chỉ công ty `verified`, §6.10) — không trả file gốc.
- Bảng `document_access_requests`: buyer xin → seller đồng ý → pre-signed URL ngắn hạn (`core.storage`) + audit mỗi lần mở.
- FE: 4 trục đầu hồ sơ, drill-down claim, link tra cứu MST chính thức, câu miễn trừ E4, chuỗi vi/en. **Đây là thay đổi UI → trình mockup trước khi làm** (theo yêu cầu giữ UI prototype).
- **Test:** file gốc không mở được khi seller chưa đồng ý; mọi lượt mở có nhật ký; mọi claim hiển thị có nguồn + ngày.

### F4 — Cảnh báo lừa thanh toán · P0 · GĐ6 (T11) · 1.5 ngày
**Phụ thuộc:** F2, C6. **Chặn bởi việc #5 (luật sư).**
- Hàm thuần regex: IBAN (kiểm mod-97), số tài khoản, cụm từ yêu cầu chuyển tiền (vi/en) → banner cho buyer; **không chặn tin nhắn**.
- Loại bằng chứng "thư xác nhận ngân hàng"; bảng `payment_detail_changes` → cảnh báo 30 ngày trên hồ sơ và chat.
- **Test:** 5/5 mẫu có thông tin thanh toán → cảnh báo; 0/20 mẫu thường báo nhầm (bộ mẫu cần BA soạn).

### B6 — Nhà phân phối EU liên kết nhà sản xuất VN · **P1** · GĐ6 (T11) · 3 ngày
**Phụ thuộc:** B2, I7, I8, E5. **Chặn bởi việc #6.** Cắt được.
- Bảng `company_relationships` (producer_id, representative_id, relation_type, evidence_id, producer_confirmed_at, expires_at); xác minh công ty EU qua VIES + EORI.
- Chỉ hiện "Sản xuất bởi … · Phân phối bởi …" khi producer đã xác nhận; hết hạn tự gỡ (job hằng ngày); producer thu hồi được.
- **Test:** chưa xác nhận → không gắn tên nhà sản xuất; hết hạn tự gỡ; thu hồi được.

### X9 — Sau MVP: không làm (GPS/video call, RASFF, thổi phồng năng lực, khiếu nại công khai, nước thứ ba, ELA/AI detector).

## 5. Lịch tổng hợp

| Tuần | Trust | Điều kiện tiên quyết phải xong |
|---|---|---|
| T3–4 (13–26/10) | I11 | B1, I6 |
| T5–6 (27/10–9/11) | I8 (T5 bảng+so khớp, T6 checklist), I10 (T6) | C6, I1, I2, B4; luật TM duyệt ma trận T6 |
| T7 | I9 | dependency đã duyệt |
| T8 | E6 | — |
| T9 | E5 | E3, E4 |
| T11 | F4, B6 | F2; luật sư duyệt; PO duyệt B6 |

## 6. Rủi ro

- **Nền tảng chưa có** (mục 1): nếu GĐ1 trễ, I11 ở GĐ2 không kịp.
- **Luật TM là điểm nghẽn** đã quá tải GĐ1–2; ma trận nguồn cần duyệt T6.
- Tra MST có captcha → chỉ tra tay + ảnh chụp ở MVP.
- VIES/tuổi domain là gọi API ngoài → cần interface + fake + job nền; có thể cần thêm thư viện (whois) → hỏi trước.
- Procrastinate chưa cài: I9, I10, I7, B6 đều cần job nền.

## 7. Verification (mỗi hạng mục)

```bash
cd backend
uv run alembic upgrade head
uv run ruff check . && uv run ruff format --check .
uv run mypy app
uv run pytest app/modules/verification app/modules/companies app/modules/messaging
cd ../frontend && npm run generate:api && npm run lint && npm run typecheck && npm test
```
Mỗi hạng mục kết thúc bằng checkpoint AGENTS §11.5, commit `<mã>: <mô tả>`, dừng chờ review.

## 8. Bước tiếp theo đề xuất

1. Lưu plan này vào `docs/TRUST_IMPLEMENTATION_PLAN.md`.
2. Không code trust lúc này — làm tiếp nền tảng theo backlog chính: **I6 (audit_logs)** → **B1 (companies)**, vì I11 cần cả hai trước 13/10.
