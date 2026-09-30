# Việc cần người khác chốt sau bản nâng cấp (U0–U27)

Mọi dữ liệu dưới đây hiện là **bản nháp**. Dữ liệu tuân thủ chỉ hiện khi bật `DEMO_COMPLIANCE_DATA` ngoài production, kèm banner "chưa duyệt". Các mục còn lại hiện với nhãn "nháp".

## Luật thương mại

| Việc | Nơi dữ liệu | Ghi chú |
|---|---|---|
| Ký sửa đổi AGENTS.md §6.4 (hạn ngạch trả kịch bản khi có dòng hạn ngạch và phân nhóm đã duyệt) | AGENTS.md | Chưa ký thì không dùng dữ liệu hạn ngạch thật ở production |
| Hạn ngạch gạo EVFTA | `scripts/seed_demo_compliance.py`, bảng `tariff_quotas` | Bản nháp: 80.000 t/năm (30.000 xay xát, 20.000 chưa xay xát, 30.000 gạo thơm), ngoài hạn ngạch 175 EUR/t. **Khác ví dụ 40.000 / 40.000 khách nêu hôm 30/09** → đối chiếu Phụ lục 2-A |
| Danh sách giống gạo thơm đủ điều kiện (ST24/ST25?) | `product_subtypes` | Hiện ST25 ở nhóm "giống khác" → luôn cần chuyên gia rà soát |
| Hạn ngạch cá ngừ chế biến (11.500 t, 0% / 24%) và dòng CN8 nào thuộc hạn ngạch | `tariff_quotas` | Loins 1604 14 16 chưa xác nhận |
| Danh sách 17 FTA của Việt Nam và dữ liệu thuế ngoài EVFTA (UKVFTA, CPTPP, RCEP…) | `trade_agreements`, `tariff_lines.agreement_code` | Hiện chỉ có dòng minh hoạ; không có dữ liệu thật ngoài EVFTA |
| Loại bằng chứng và thời hạn | `data/evidence_types_draft.csv` | Seller chỉ nộp được loại đã duyệt |
| Yêu cầu theo cấp xác minh | `data/tier_requirements_draft.csv` | Job chỉ hạ cấp theo dòng đã duyệt |
| Giấy phép hành nghề theo loại dịch vụ | `tier_requirements` (service_provider) | Đại lý hải quan, vận tải đa phương thức, kế toán, đại lý thuế |
| Tiêu chí và trọng số điểm tín nhiệm | `data/trust_criteria_draft.csv` | 35 / 15 / 50 theo nghiên cứu 29/09 |
| Mốc ngân sách thương hiệu (marketing ≈ 5% doanh thu) | `data/gtm_benchmarks.csv` | Dùng cho phần "OEM hay thương hiệu riêng" của báo cáo |
| Cảnh báo ngành (thẻ vàng IUU…) | `sector_alerts` | Nội dung và nguồn |

## PO / khách hàng

| Việc | Hiện tại |
|---|---|
| Giá các mục thu phí | Tạm tính: duyệt Nâng cao 2.000.000 đ/năm, báo cáo đầy đủ 1.500.000 đ/90 ngày, "ai đã xem" 500.000 đ/90 ngày |
| Tài khoản nhận chuyển khoản (ngân hàng, số tài khoản, IBAN/SWIFT) | Tài khoản minh hoạ; production từ chối chạy khi chưa đặt `BANK_TRANSFER_ACCOUNT_NUMBER` |
| Hạn mức RFQ của buyer chưa xác minh | 3 RFQ/ngày (`RFQ_DAILY_LIMIT_UNVERIFIED`) |
| Số tên hiện miễn phí ở "ai đã xem hồ sơ" | 3 |
| Bật điểm tín nhiệm công khai ở production | Tắt (`TRUST_SCORE_PUBLIC=false`) |
| Chọn LLM thật cho lời văn báo cáo và AI đọc giấy tờ (Q5) | Mặc định bản giả / Ollama cục bộ; báo cáo dùng lời văn mẫu |
| Nội dung và đối tác "Tư vấn triển khai qua mạng lưới VBA" | Yêu cầu chỉ lưu cho admin theo dõi |

## Pháp lý / GDPR

- "Ai đã xem hồ sơ": tên buyer đã xác minh hiện cho seller; buyer tắt được. Chính sách bảo mật và điều khoản đã thêm mục này (bản dự thảo).
- Công bố điểm tín nhiệm doanh nghiệp.
- Gửi nội dung chứng nhận cho LLM: đã che email và số điện thoại có nhãn. Nếu dùng LLM đặt ngoài EU thì cần thỏa thuận xử lý dữ liệu.
- Kiểm tự động gọi VIES, GLEIF, DNS, RDAP, Nominatim: ghi vào chính sách bảo mật khi bật `LOOKUP_BACKEND=live`.

## Hoãn sang việc tiếp theo

| Việc | Lý do |
|---|---|
| AI trích bảng luật (`compliance_drafts`) | Luật TM đang nhập qua xlsx |
| UN Comtrade cho thị trường ngoài EU | Hiện chỉ có Eurostat (thị trường EU) |
| `products.subtype_code` (gắn phân nhóm vào sản phẩm) | Phân nhóm hiện chọn ở công cụ tính thuế |
| Engine mô phỏng SIM | Chờ adapter |
| Kiểm nhà máy bằng ảnh vệ tinh / Google Maps | Cần nguồn dữ liệu và khóa |
| Giá sàn chống bán phá giá, gợi ý giá bằng agent | Chưa có dữ liệu chống bán phá giá |
| Duyệt trước sản phẩm | Đang hậu kiểm + cờ lệch ngành |
| Buyer B2, thanh toán qua nền tảng, escrow, stablecoin | Giai đoạn 2 ([GD2_THANH_TOAN.md](GD2_THANH_TOAN.md)) |
| Rasterize PDF scan không có ảnh nhúng | Cần thêm thư viện; hiện chỉ đọc ảnh nhúng khi có model đọc ảnh |
| Đổi logo | Theo yêu cầu khách |
