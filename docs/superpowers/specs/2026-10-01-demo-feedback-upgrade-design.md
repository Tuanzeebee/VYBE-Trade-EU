# Nâng cấp sau demo khách hàng 30/09/2026 — thiết kế

- **Nguồn:** biên bản demo "Vybe-trade demo" 30/09/2026 (góp ý chính: chị Ha My TRAN), khảo sát code nhánh `dev` tại `177d6ff`.
- **Người đọc:** PO, luật TM, đội kỹ thuật, người review PR.
- **Liên quan:** AGENTS.md §4, §5.5, §6.2, §6.4, §10 (đã sửa đổi 01/10/2026); ADR-0003, ADR-0004, ADR-0005; backlog mã `U0`–`U27`.

## 1. Mục tiêu

Nâng cấp toàn bộ sản phẩm để demo lại cho khách và cho nhóm hội viên VBA dùng thử. Khách chốt hai phần bắt buộc có trong demo tới: **công cụ tính thuế** (có hạn ngạch) và **go-to-market**.

## 2. Lỗi nền phát hiện khi khảo sát (khách chưa nêu)

| Lỗi | Hệ quả | Sửa ở |
|---|---|---|
| Tab "Hồ sơ công ty" của seller là dữ liệu giả cứng: 96/100, 95%, "L2", khối nhà máy, danh sách chứng nhận | Khách thấy số không có thật; rủi ro pháp lý | U1 |
| Buyer không có đường xác minh, còn buyer chưa xác minh bị giới hạn 0 RFQ/ngày | Buyer thật không gửi được RFQ | U6 |
| Hội thoại chỉ mở qua RFQ | Buyer thật không nhắn tin được | U7 |
| Phần lớn dữ liệu onboarding buyer chỉ lưu trong localStorage | Đổi máy là mất; seller không thấy nhu cầu | U5 |
| Trang Pricing là mock | Không có hành trình trả phí | U19 |
| Máy tính thuế cứng EVFTA, VN→EU; không có mô hình hạn ngạch | Khách: "chưa có giá trị sử dụng thật" | U11–U14 |
| Xếp hạng thị trường chỉ theo thuế + VAT, thuế như nhau trong EU | Thực chất xếp theo VAT; không thuyết phục | U15–U18 |

## 3. Góp ý của khách → hạng mục

| # | Góp ý (chuẩn hoá) | Mã |
|---|---|---|
| A1 | Seller không cần biết mã HS: gõ tên sản phẩm → gợi ý mã | U3 |
| A2 | Bỏ giá thấp nhất / cao nhất; bậc giá theo MOQ kiểu Alibaba; giá tham khảo theo thị trường | U3, U17 |
| A3 | Giữ MOQ; thêm ảnh; thêm quy cách đóng gói (20 kg, 100 kg; Horeca khác siêu thị) | U3 |
| A4 | Mô tả chỉ bắt buộc một ngôn ngữ, tự dịch | U3 |
| A5 | Nguyên tắc "vừa đủ, không thừa không thiếu" — người dùng thế hệ 6x–8x, IT yếu | U2, U3, U4, U5 |
| A6 | Nhiều sản phẩm trong một hộp thoại; kiểm duyệt sản phẩm lệch nhau | U3 |
| A7 | "Sản phẩm xuất khẩu" → "Sản phẩm cung cấp" | U2 |
| A8 | Hỏi gia công OEM hay thương hiệu riêng, ngân sách tối đa cho thâm nhập thị trường | U3, U18 |
| A9 | Danh mục luôn có "Khác"; nhóm hàng bám theo nhóm hạn ngạch/thuế | U2, U13 |
| B1 | Chứng nhận: bỏ ngày cấp, ngày hết hạn, số, tổ chức cấp; chỉ cần loại + file | U4, U24 |
| C1 | Hỏi "cung cấp sản phẩm hay dịch vụ" trước bước 2; nhóm dịch vụ (logistics, hải quan, kế toán-thuế) phải verify giấy phép | U2, U20 |
| C2 | Seller là exporter hoặc manufacturer, Việt Nam hoặc nước ngoài; buyer không giới hạn EU | U2, U5 |
| C3 | Thông tin lấy tự động được thì không bắt tải lên | U21, U24 |
| D1 | "Sở Kế hoạch và Đầu tư" không còn (đã sáp nhập vào Sở Tài chính) | U2 |
| D2 | Tự verify email, website, địa chỉ; địa chỉ ĐKKD khớp địa chỉ trên giấy tờ | U21, U22 |
| D3 | Kiểm chéo ngầm: mã vùng trồng ↔ sản phẩm; ISO ↔ vùng trồng; thị trường xuất khẩu ↔ bằng chứng | U22 |
| D4 | Trường tùy chọn "khách hàng chính"; bằng chứng xuất khẩu; phân biệt chính ngạch / tiểu ngạch | U2, U4 |
| D5 | Điểm tín nhiệm ghi rõ do hệ thống Vybe-trade tính, tooltip giải thích | U23 |
| E1 | "Công cụ tính thuế EVFTA" → "Công cụ tính thuế"; 17 FTA | U11, U12 |
| E2 | Hạn ngạch (gạo: 0% chỉ trong hạn ngạch, lộ trình theo năm), phân nhóm sản phẩm, hỏi "đã có hạn ngạch chưa?" | U13, U14 |
| E3 | Cảnh báo ngành (thẻ vàng IUU thủy sản) | U14 |
| F1 | Gợi ý thị trường phải dựa trên tiêu thụ, thị phần đối thủ, logistics; giải thích vì sao | U15, U16 |
| F2 | Báo cáo go-to-market theo từng công ty; định vị; phân theo quy mô; upsell tư vấn qua mạng lưới VBA | U18 |
| G1 | Buyer quan tâm nhất là **sự ổn định nguồn cung**, không phải giá hay chất lượng | U5 |
| G2 | Onboarding buyer tối giản; nhu cầu hỏi ở tab "Hoàn thiện hồ sơ"; bỏ VAT; tiền tệ EUR | U5 |
| G3 | Cấp xác minh buyer gây hiểu nhầm (buyer bị hỏi chứng nhận); tên cấp Basic / Enhanced / Advanced; L1 miễn phí | U5, U20 |
| G4 | Cảnh báo seller về buyer rủi ro | U6 |
| H1 | Tìm theo tên sản phẩm là chính | U10 |
| H2 | Trang hồ sơ: giới thiệu, bản đồ, dữ liệu đã xác minh, rồi mới đến sản phẩm | U10 |
| H3 | Huy hiệu chỉ "Đã xác minh / Chưa xác minh"; bỏ "EVFTA Verified" | U10, U20 |
| H4 | Trang hồ sơ bị lag | U10 |
| I1 | Thiết kế lại RFQ; test bằng tài khoản buyer thật | U8, U25 |
| I2 | Thông báo "ai đã xem hồ sơ của bạn" | U9 |
| I3 | Cách bắt đầu nhắn tin với một công ty chưa rõ | U7 |
| J1 | Hành trình trả phí như thật: ai trả, trả ở bước nào, bao nhiêu | U19, U26 |
| J2 | Đặt cọc 50/100%, điều khoản thanh toán trong báo giá | U8 |
| J3 | Thanh toán qua nền tảng, bảo lãnh, stablecoin: giai đoạn 2 sau ~100 người dùng | U26 (ghi chú) |
| K1 | Đổi logo | Hoãn (PO: tập trung tính năng) |

## 4. Thiết kế chính

- **Xác minh và tín nhiệm:** ADR-0004.
- **Tra cứu ngoài:** ADR-0003.
- **Trả phí:** ADR-0005.
- **Thuế và hạn ngạch:**
  - Bảng `trade_agreements`; `tariff_lines.agreement_code` mặc định `EVFTA`. Không đổi tên `evfta_rate_current`, vì file của luật TM đang dùng.
  - `tariff_quotas`, `product_subtypes`, `tariff_quota_subtypes`, `sector_alerts`. Hàm thuần `quota_scenarios()` theo AGENTS.md §6.4 (sửa đổi).
  - Cờ DEMO theo §6.2 (sửa đổi).
- **Thị trường:**
  - Module `markets`: `trade_flows` nạp từ Eurostat Comext.
  - Chỉ số là hàm thuần: quy mô, CAGR, thị phần Việt Nam và đối thủ, HHI, đơn giá.
  - Gợi ý top 3 + 2 nước tiềm năng, mỗi nước có lý do.
  - Báo cáo go-to-market: ChatModel chỉ viết lời văn với placeholder `{metric_key}`; server điền số; validator loại chữ số lạ.

## 5. Hoãn

- AI trích bảng luật.
- UN Comtrade (thị trường ngoài EU).
- Engine mô phỏng SIM.
- Kiểm nhà máy bằng vệ tinh.
- Gợi ý giá bằng agent, giá sàn chống bán phá giá.
- Duyệt trước sản phẩm.
- Buyer B2 / escrow / crypto.
- Đổi logo.

## 6. Cần chốt

- **Luật TM:**
  - Ký sửa đổi §6.4.
  - Duyệt số liệu hạn ngạch gạo. File nháp `docs/roadmap/tariff_20_draft.csv` ghi TRQ 80.000 t chia nhóm, khác ví dụ 40.000 t / 40.000 t khách nêu trong demo.
  - Duyệt danh sách giống gạo thơm, danh sách 17 FTA, giấy phép theo loại dịch vụ, `trust_criteria`, `tier_requirements`, benchmark OEM / thương hiệu.
- **PO / khách:** giá các mục thu phí; hạn mức RFQ của buyer chưa xác minh (mặc định 3/ngày); tài khoản nhận chuyển khoản; bật điểm tín nhiệm công khai ở production.
- **Pháp lý / GDPR:** "ai đã xem hồ sơ", công bố điểm tín nhiệm.
