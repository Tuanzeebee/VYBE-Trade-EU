# Nâng cấp sau demo 2 (02/10/2026) — thiết kế

- **Nguồn:** biên bản "Vybe-trade demo 2" 02/10/2026 (góp ý chính: chị Hà My Trần), khảo sát code nhánh `main` tại `bdffce4`.
- **Người đọc:** PO, luật TM, đội kỹ thuật, người review PR.
- **Liên quan:** spec `2026-10-01-demo-feedback-upgrade-design.md` (U0–U27); AGENTS.md §4, §5, §6, §10; ADR-0004, ADR-0005.
- **Mốc:** demo lại 04/10 (CN) · demo hội viên VBA 06–08/10 · ra mắt Paris 19/10.
- **Phạm vi plan này:** C1 + C2 (đến hết 08/10). C3 là việc sau.

## 1. Mục tiêu và nguyên tắc

Người dùng chính là doanh nghiệp vừa và nhỏ, IT yếu, nhiều người thế hệ 6x–8x. Nguyên tắc từ khách:

1. Seller chỉ có **hai trụ**: hoàn thiện sản phẩm, và bán hàng.
2. Mỗi lúc **một việc tiếp theo**; không để người dùng chọn giữa hàng chục mục.
3. Chỉ hiện trường cần thiết; thiếu thông tin thì hỏi, không đoán.
4. Không chữ "AI" hay "tuân thủ" trên nhãn hướng người dùng.

## 2. Thực trạng đã khảo sát (ảnh hưởng thiết kế)

- Chuỗi UI nằm thẳng trong code, bọc `tr()`, bản dịch ở `frontend/i18n/catalog.json`; `messages/*.json` chỉ có `Metadata`. Spec này **không** sửa nợ đó; đổi nhãn = đổi chuỗi trong code và thêm khóa catalog.
- Sidebar exporter có 11 mục + 4 công cụ (`SellerWorkspace.tsx:121-140`).
- Dashboard có 6 ô; "Hoàn thiện hồ sơ" và "Xác minh" tách riêng; không có ô "Gợi ý thị trường EU" (chỉ có link công cụ).
- `tariff_savings` (`calculators.py:65-110`) không xét RoO; `TariffResult` không có trường trích dẫn điều khoản.
- Không có giới hạn số sản phẩm theo gói; `Rfq` không có trường loại.

## 3. Feedback → hạng mục

| Mã | Hạng mục | Giai đoạn | Chạm |
|---|---|---|---|
| N1 | Hành trình hai chặng thay sidebar; gộp tiến độ hồ sơ + xác minh | C1 | FE, dashboard |
| N2 | Đổi nhãn (Trợ lý, Công cụ hỗ trợ, Request); bỏ "hỗ trợ bởi AI"; từ khoá "Việt Nam và Đông Nam Á" | C1 | FE, catalog |
| N3 | Trang "Hành trình": bỏ ô trợ lý, thêm ngành hàng/dịch vụ | C1 | FE, dashboard |
| N6a | Máy tính thuế: ẩn trường thừa, gợi ý cước/bảo hiểm, nhãn "chưa có trích dẫn nguồn" | C1 | compliance, FE |
| N6b | Test tái hiện "thuế 0% không giải thích" | C1 | compliance |
| N4 | Request nhiều loại | C2 | messaging, migration |
| N5 | Go-to-market hỏi theo bước, trường động, cấu trúc báo cáo mới | C2 | markets, FE |
| N7 | Giao diện buyer kiểu Ankorstore/Faire, dữ liệu synthetic | C2 | FE, seed |
| N8 | Gói Basic 3 sản phẩm | C2 | billing, catalog |
| N9 | Nút "Tiếp theo" xuyên suốt các bước | C2 | FE |
| (C3) | Trích dẫn điều khoản/ngày ký/danh mục cho thuế ưu đãi | sau | compliance (cần dữ liệu luật TM) |

Ngoài phạm vi (ghi lộ trình, hỏi lại khi làm): EUDR, truy xuất vùng trồng, ảnh vệ tinh, agent-readiness, danh sách đối tác importer, kho ngoại quan, đổi tên "Trợ lý AI tuân thủ" trong AGENTS.md §6.8.

## 4. Thiết kế

### 4.1 Hành trình seller (N1, N2, N3, N9)

- **Chặng 1, Hoàn thiện sản phẩm:** Hồ sơ công ty → Sản phẩm → Nhà máy và chứng nhận → Xác minh. Hoàn thiện hồ sơ và xác minh gộp thành **một thanh tiến độ**.
- **Chặng 2, Bán hàng:** Chọn thị trường (go-to-market) → Tính thuế và xuất xứ → Request và báo giá → Dịch vụ hỗ trợ.
- **Trang `/exporter` = "Hành trình":** thẻ "Việc tiếp theo" với một nút, hai thanh tiến độ, chỉ số nhỏ (lượt xem hồ sơ, Request, tiết kiệm thuế). Bỏ ô câu hỏi trợ lý.
- **Không khóa cứng:** thanh bước (rail trái desktop, thanh ngang mobile 390px) cho nhảy tới bước bất kỳ; mỗi trang có nút "Tiếp theo".
- **Ngoài hành trình** (header/avatar): Tin nhắn, Thông báo (chuông), Gói dịch vụ, Hồ sơ công khai, Đăng xuất. Trợ lý là nút nổi, nhãn "Trợ lý".
- **Kỹ thuật:** hàm thuần `next_step(state)` trong `dashboard`, đầu vào là completeness, verification, số sản phẩm, Request; trả `next_step` trong `ExporterDashboard`. Không thêm bảng. Tái dùng route hiện có; đổi shell trong `SellerWorkspace.tsx` và `WorkspaceRoute.tsx`.
- **Nhãn:** "Công cụ tuân thủ" → "Công cụ hỗ trợ"; "Trợ lý AI tuân thủ" → "Trợ lý"; "RFQ" → "Request"; bỏ `features.ai` 'Hỗ trợ bởi AI'; hero "Việt Nam và Đông Nam Á".

### 4.2 Request nhiều loại (N4)

- Thêm cột `kind` vào `rfqs` (`quote | meeting | packaging | quality | other`), mặc định `quote`, một migration. `RfqIn` thêm `kind` (vẫn `extra="forbid"`).
- Form buyer đổi trường theo loại; chỉ `quote` vào luồng báo giá (`quote_service`).
- UI đổi "RFQ" → "Request". **Giữ nguyên** tên API `/rfqs` và tên bảng để không phá client sinh tự động; chạy `npm run generate:api` sau khi sửa schema.

### 4.3 Go-to-market (N5)

- **Bước 1, Định hướng:** thị trường (một nước / EU / chưa biết), sản phẩm (chọn từ sản phẩm đã đăng; bỏ ô tên), *Định hướng bán hàng*: bán thô / OEM / thương hiệu riêng / khác (tự điền).
- **Bước 2, Mục tiêu:** doanh thu dự kiến **bắt buộc**; sản lượng/năm; ngân sách đổi nhãn theo hướng bán (thô/OEM: "Ngân sách bán hàng", không bắt buộc; thương hiệu riêng: "Ngân sách làm thương hiệu", bắt buộc).
- **Bước 3, Năng lực:** vùng nhà máy, sản lượng, chứng nhận, thị trường đã xuất lấy từ hồ sơ; chỉ hỏi phần thiếu, kể cả "đã có hạn ngạch chưa" với nhóm hàng hạn ngạch.
- **Schema:** `ReportIn` thêm `target_market`, `sales_orientation` (+ `other_text`), `annual_volume`, `budget`; validator bắt buộc doanh thu, và bắt buộc ngân sách khi thương hiệu riêng; `brand_model` cũ giữ để tương thích.
- **Cấu trúc báo cáo:** Định vị và năng lực (đầu tiên, biểu đồ tương tác) → tổng quan thị trường (ngắn) → vì sao gợi ý các thị trường này → phân khúc (Horeca / siêu thị / bếp ăn công nghiệp) → cơ hội, thách thức, rủi ro. Điểm định vị là hàm thuần.
- **Dữ kiện thị trường:** bảng `market_insights` (nước, nhóm hàng, phân khúc, ghi chú, nguồn, `reviewed_by`) do admin nhập. Thiếu dữ liệu thì mục hiện "chưa có dữ liệu". AI chỉ viết lời văn theo cơ chế placeholder `{metric_key}` đã có (AGENTS.md §10); không tự bịa dữ kiện.
- **Không làm:** mục "đối tác chính" (cần danh sách importer); thay bằng nút tư vấn qua VBA.
- **Bỏ** link "Gợi ý thị trường EU" khỏi sidebar (go-to-market đã bao phủ). Giữ trang công khai `/tools/market-insights`.

### 4.4 Máy tính thuế (N6a, N6b)

- Ẩn trường không cần; container chỉ hỏi khi người dùng muốn gợi ý cước.
- Cước và bảo hiểm có nút "giá tham khảo" từ hai bảng cấu hình (AGENTS.md §5.6):
  - `freight_benchmarks`: `origin_port`, `dest_port`/`dest_country`, `container_type` (20GP/40GP/40HC/reefer), `cargo_class`, `price_low/typical/high` (numeric), `currency`, `valid_from/until`, `source`, `reviewed_by/at`.
  - `insurance_benchmarks`: `cargo_class`, `rate_percent` (numeric), `basis`, `source`, `reviewed_by`.
- Dòng thiếu `reviewed_by` hoặc quá hạn không lộ ra. Không có dòng thì UI hiện "chưa có giá tham khảo".
- Seed chỉ gồm số chị My nêu trong họp, gắn nhãn "tham khảo"; **chờ xác nhận**: đơn vị tiền (USD hay EUR) và tỷ lệ bảo hiểm 2%.
- Thuế ưu đãi hiện kèm dòng "Chưa có trích dẫn nguồn" khi dữ liệu thiếu điều khoản; không để ô 0% trơ trọi. Trích dẫn đầy đủ là C3.
- **Test trước khi sửa (AGENTS.md §9):** tái hiện "thuế 0% không giải thích" và "RoO `pass` nhưng hạn ngạch chưa xét". Tuân thủ §6.3, §6.4: nhóm hạn ngạch/ST25 vẫn `needs_review`.

### 4.5 Giao diện buyer (N7)

Trang chủ và `/suppliers` theo mẫu Ankorstore/Faire: duyệt theo nhóm hàng, thẻ sản phẩm ưu tiên, huy hiệu tin cậy gọn ("Đã xác minh"). Dữ liệu synthetic gắn rõ là dữ liệu mẫu trong môi trường demo. Trang công khai vẫn render phía server (AGENTS.md §8).

### 4.6 Giới hạn gói (N8)

Bảng cấu hình `plan_limits` (mặc định Basic = 3 sản phẩm); entitlement trả phí nâng giới hạn. `catalog` gọi `billing.service` (không import `models`) trước khi tạo sản phẩm; vượt giới hạn trả 409 kèm gợi ý nâng cấp.

## 5. Kiểm thử

- `next_step`: bảng ca `@pytest.mark.parametrize` (hồ sơ trống, thiếu sản phẩm, chờ xác minh, đã xong…).
- `ReportIn`: doanh thu bắt buộc; ngân sách bắt buộc khi thương hiệu riêng; nhãn ngân sách theo hướng bán.
- `Rfq.kind`: mặc định `quote`; loại khác không tạo báo giá.
- Benchmark: dòng chưa duyệt/quá hạn không lộ ra API công khai; thiếu thì trả "chưa có".
- Giới hạn gói: sản phẩm thứ 4 trả 409; có entitlement thì qua.
- Phân quyền: 401 thiếu phiên, 403 sai vai trò cho mọi route mới.
- FE: `npm run lint && npm run typecheck && npm test`; luồng exporter dùng được ở 390px.
- Báo cáo go-to-market: chạy lại eval nếu sửa prompt (AGENTS.md §6.11).

## 6. Rủi ro

- C1 trong một ngày rất chặt. Phương án dự phòng: demo 04/10 trên sidebar cũ với nhãn và dashboard đã sửa, rồi chuyển hành trình ở C2.
- Dữ liệu benchmark và `market_insights` phụ thuộc người duyệt; thiếu thì UI hiện "chưa có", không đoán.
- Đổi nhãn "Trợ lý AI tuân thủ" lệch AGENTS.md §6.8; cần người có quyền sửa AGENTS.md.
- Chuỗi UI ngoài `messages/*.json` (nợ có sẵn) làm đổi nhãn phải sửa nhiều file.
