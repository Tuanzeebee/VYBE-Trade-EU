# Đề xuất thị trường EU + dữ liệu thuế/RoO đã xác minh — thiết kế

Ngày: 2026-09-30 · Trạng thái: chờ duyệt spec (bản 2, đã gộp quyết định về mã 8 số và quy đổi RoO)

## Mục tiêu
1. Dùng file `EVFTA_20_ma_da_xac_minh (1).xlsx` (20 mã CN 8 số) làm dữ liệu thuế EVFTA và RoO.
2. Kết hợp thuế + RoO để **xếp hạng nước EU nên xuất khẩu**.
3. Mọi ô chọn nước cho exporter chỉ liệt kê nước EU. Nước của công ty exporter vẫn là Việt Nam.

## Đã chốt với người dùng
- Xếp hạng chỉ **DE/FR/NL** (nước có dữ liệu VAT trong file). 24 nước còn lại: `no_data`, không có con số.
- "Chỉ EU": nước nhập khẩu trên máy tính (**đã đúng sẵn**: backend `EU_MEMBERS`, FE `EU_COUNTRIES`) và thị trường xuất khẩu trong hồ sơ/onboarding exporter (**cần sửa**). Nước nguyên liệu trong máy tính RoO không bị giới hạn.
- **Tra theo mã CN 8 số.** File có 3 cặp mã cùng đầu 6 số nhưng khác dòng thuế (081090: 8,8% và 0%). Không gộp về 6 số.
- **Quy đổi RoO:** 4 dòng "All fish and crustaceans… wholly obtained" (03061792, 03061799, 03032400, 03077100) → `WO`, `requires_expert=false`. 16 dòng còn lại → `WO` + `requires_expert=true` (luôn `inconclusive`), nguyên văn Annex II nằm ở `rule_text`. Lý do: "nguyên liệu Chương X xuất xứ thuần tuý", dung sai 10%, ngưỡng đường 20%, điều kiện tàu chưa có loại quy tắc tương ứng.

## Ràng buộc tuân thủ (AGENTS §6)
- Mọi dữ liệu import vào DB ở trạng thái **chưa duyệt**; admin bấm duyệt mới lộ ra API công khai. Cột "Luật sư xác nhận" trong file đang trống nên không tự duyệt.
- Mã HS ngoài danh mục → `unsupported`. Hạn ngạch/thuế hỗn hợp → `needs_review`. Không đoán VAT cho nước thiếu dữ liệu.
- Mỗi lần chạy ghi đúng một `compliance_checks`.
- Cảnh báo dữ liệu (từ chính file): mã CN theo danh mục 2012 cần đối chiếu mã 2026; thuế MFN là mức CCT 26/6/2012 cần đối chiếu TARIC; VAT nhập khẩu là nguồn thứ cấp cần đối chiếu TEDB; VAT nhập khẩu thường được khấu trừ với nhà nhập khẩu B2B đã đăng ký VAT còn thuế nhập khẩu thì không.

## Thiết kế
### Dữ liệu
- `backend/data/compliance/EVFTA_20_ma_da_xac_minh.xlsx` (bản sao file nguồn) + `scripts/verified_pack.py` (đọc file → dòng dữ liệu, hàm thuần) + `scripts/import_verified_pack.py` (ghi DB qua `compliance.admin_service`, chưa duyệt, có audit).
- Danh mục `hs_codes`: thêm 20 mã 8 số (`is_calculator_supported=true`). Cột `code` đã nhận 6–8 số nên **không đổi schema**.
- 20 dòng `tariff_lines` (destination `EU`, `ad_valorem`, MFN = cột "Thuế cơ sở", EVFTA = "Thuế EVFTA năm tính", `staging_category`, `zero_from` và `valid_from` theo bảng lộ trình A→2020-08-01, B3→2023-01-01, B5→2025-01-01, B7→2027-01-01) và 20 dòng `product_specific_rules` (quy đổi ở trên, `valid_from` 2020-08-01).
- Bảng mới `import_country_terms` (migration 0028): `hs_code` (FK `hs_codes`), `country` (27 nước EU), `vat_rate numeric(7,4)` (%), `label_languages`, `note`/`note_en`, `source` (văn bản), `reviewed_by`, `reviewed_at`, `valid_from`, `valid_until`; khóa duy nhất (`hs_code`, `country`, `valid_from`). Nạp 3 nước × 20 mã từ sheet "3 nuoc DE-FR-NL", chưa duyệt.
- Admin: API CRUD + duyệt cho `import_country_terms` qua `admin_service` (generic có sẵn), thêm một nhóm dữ liệu vào màn `AdminComplianceData`.

### Tra cứu mã
`compliance.service` thử mã người dùng nhập trước (8 số), không có dòng đã duyệt thì lùi về nhóm 6 số; chỉ dùng mã có trong danh mục hỗ trợ. Cách lùi này giữ nguyên hành vi cũ khi nhập mã 8 số thuộc dòng thuế 6 số. Nhập mã 6 số mà dữ liệu chỉ có ở mã 8 số con → `unsupported` (người dùng chọn mã 8 số từ ô tìm mã).

### Tính toán (hàm thuần `calculators.rank_markets`)
- Tái dùng `tariff_savings` cho trạng thái và số thuế; `ok` mới xếp hạng.
- Cơ sở VAT = giá trị + thuế nhập khẩu. Tổng = thuế + VAT.
- `roo_status = pass` → thuế EVFTA. Ngược lại → thuế MFN, không hiện "tiết kiệm".
- Xếp tăng dần theo tổng (hòa thì theo mã nước). Nước thiếu dòng VAT đã duyệt → `no_data`, xếp cuối, không số.
- Đối chiếu file (tôm 03061792, 100.000 EUR): có C/O DE 7.000 / FR 5.500 / NL 9.000; không C/O DE 19.840 / FR 18.160 / NL 22.080.

### API
`POST /api/public/markets` (không cần phiên, rate limit như `/api/public/tariff`): `hs_code`, `product_value` (chuỗi), `roo_status` tùy chọn (`pass|fail|inconclusive`) → trạng thái, cơ sở (`evfta|mfn`), 27 dòng nước. Ghi một `compliance_checks` (`check_type=tariff`, destination `EU`, `savings_amount` rỗng). Người dùng bấm nút riêng nên không ghi đôi với lần tính thuế.

### Backend "chỉ EU"
`companies/schemas.py`: giá trị **ghi** mới của `export_markets` phải là `EU` hoặc mã một trong 27 nước EU. Bộ lọc danh bạ (`market`) vẫn nhận mã cũ để đọc dữ liệu cũ. Dữ liệu cũ (US, JP…) giữ nguyên trong DB.

### Frontend
- Nút "Thị trường nên xuất" dưới kết quả `TariffCalculator` (trạng thái RoO chọn được, mặc định "chưa kiểm tra"); `OriginCalculator` có liên kết sang máy tính thuế kèm `?roo=`. Bảng xếp hạng nằm trong component mới `MarketRanking`. Chuỗi qua `tr()` + `i18n/catalog.json`.
- `EXPORT_MARKETS` (`lib/companyApi.ts`) → `EU` + 27 nước EU. `MARKET_NAMES` giữ nguyên để đọc nhãn cũ.
- Nhóm dữ liệu mới trong `admin-compliance/datasets.ts`.

## Test
- Golden test theo bảng từ chính file Excel (DE/FR/NL, có/không C/O).
- Chưa duyệt → không lộ; nước thiếu dữ liệu → không số; RoO ≠ pass → MFN; HS ngoài danh mục → `unsupported`; hạn ngạch → `needs_review`.
- Mã 8 số: khớp dòng 8 số, lùi về 6 số, 6 số không khớp con 8 số.
- 401/403 cho route admin mới; một `compliance_checks` mỗi lần chạy.
- Import: parse file thật đúng 20 + 20 + 60 dòng, quy đổi RoO đúng, tất cả chưa duyệt, chạy lại không trùng.
- `export_markets` chỉ nhận EU khi ghi. Cuối: lint + typecheck + test (backend và frontend), báo kết quả thật.

## Ngoài phạm vi
VAT cho 24 nước còn lại (chờ luật TM), tự duyệt dữ liệu, xếp hạng theo tín hiệu buyer, nâng cấp 16 dòng RoO `requires_expert` (luật TM làm sau), xlsx import/export cho `import_country_terms` (chỉ script + API).
