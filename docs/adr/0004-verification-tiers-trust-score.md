# ADR-0004: Xác minh theo cấp và điểm tín nhiệm seller

- Trạng thái: Đề xuất (01/10/2026) — cần luật TM duyệt tiêu chí, pháp lý/GDPR duyệt trước khi công bố điểm ở production
- Ngày: 2026-10-01
- Hạng mục: U6, U20, U21, U22, U23

## Bối cảnh

Demo 30/09/2026 cho thấy ba vấn đề:

1. Điểm tín nhiệm 96/100 và huy hiệu "L2 Enhanced Verified" trên màn hình seller là dữ liệu giả cứng. Khách lo rủi ro pháp lý khi doanh nghiệp chụp lại con số và đi nói "tôi được chấm 96 điểm".
2. Huy hiệu "EVFTA-verified" khó hiểu với người dùng.
3. Buyer bị chặn gửi RFQ vì chưa xác minh, nhưng buyer không có đường nào để xác minh. PO nhận định: chặn buyer sau bước xác minh là sai logic.

Nghiên cứu các nền tảng B2B (Alibaba, Made-in-China, Global Sources, IndiaMART, Tridge, Amazon Business, Faire) và các khung đánh giá chuỗi cung ứng (EcoVadis, SMETA, amfori BSCI) cho thấy:

- Mọi nền tảng xác minh **seller** sâu, theo cấp; cấp cao nhất là audit tại chỗ của bên thứ ba (SGS, TÜV, BV, Intertek), trả phí.
- Xác minh **buyer** gần như luôn là tùy chọn và chỉ mở thêm quyền lợi; không nền tảng nào chặn buyer xem hàng. Người bán được bảo vệ bằng escrow, bảo hiểm tín dụng, hoặc khuyến nghị điều khoản thanh toán.
- Điểm số được trình bày kèm ai kiểm, phạm vi, ngày, và câu "không phải chứng nhận" (EcoVadis, SMETA, BSCI, Alibaba).

Nguyên tắc có sẵn trong `docs/roadmap/2026-09-29-nghien-cuu-trong-so-uy-tin.md` §4 vẫn áp dụng: tách mức hoàn thiện hồ sơ ≠ xác minh ≠ tín nhiệm; chỉ chấm dữ kiện kiểm chứng được; trọng số là dữ liệu có người duyệt; giải thích được; không tự đổi trạng thái.

## Quyết định

### Cấp xác minh (`companies.verification_tier`, 0–3)

| Cấp | Tên hiển thị | Seller sản phẩm | Nhà cung cấp dịch vụ | Buyer |
|---|---|---|---|---|
| 0 | Chưa xác minh | Đã đăng ký | Đã đăng ký | Đã đăng ký (được xem, nhắn tin, gửi RFQ theo hạn mức) |
| 1 | Cơ bản | Pháp lý: ĐKKD/MST, người đại diện, người liên hệ được ủy quyền. Miễn phí | Pháp lý | KYB nhẹ tùy chọn: VAT (VIES), LEI, domain, website |
| 2 | Nâng cao | Năng lực: chứng nhận đối chiếu tổ chức cấp, mã cơ sở TRACES-NT, bằng chứng xuất khẩu, tour video. Trả phí | Giấy phép hành nghề theo loại dịch vụ | (giai đoạn 2: điều khoản thanh toán) |
| 3 | Chuyên sâu | Báo cáo audit bên thứ ba; SMETA/BSCI/EcoVadis nhập nguyên hạng và hạn | — | — |

- `verification_status` (unverified/pending/verified/rejected) giữ nguyên và vẫn là điều kiện lên danh bạ (§6.10: verified ⇔ cấp ≥ 1).
- Cấp chỉ đổi qua `verification.service.decide()` với quyết định `tier_up` / `tier_down` do admin bấm, hoặc `tier_down` do job hết hạn bằng chứng. AI và kiểm tự động không đổi cấp (§6.9).
- Yêu cầu của từng cấp là dữ liệu (`tier_requirements`), không viết cứng.
- `verification_level` (basic/evfta_verified) giữ nội bộ, hiển thị thành mục checklist "Đủ bằng chứng xuất xứ bắt buộc", không còn là huy hiệu.

### Huy hiệu công khai

Một huy hiệu "Đã xác minh" / "Chưa xác minh" kèm tên cấp, tooltip ghi ai kiểm, phạm vi, ngày duyệt, ngày hết hạn.

### Điểm tín nhiệm (chỉ seller)

- Hàm thuần `verification/trust.py`, trả điểm tổng và điểm thành phần, kèm dữ kiện dùng để tính và ngày tính.
- Ba thành phần; tiêu chí và trọng số nằm trong bảng `trust_criteria` có `reviewed_by`; tiêu chí chưa duyệt bị bỏ qua:
  - Giấy tờ đã kiểm (~35%): trạng thái pháp lý, giấy phép, chứng nhận còn hạn đã được admin duyệt.
  - Kiểm tự động (~15%): VAT/LEI khớp, tuổi domain, website sống và khớp tên, địa chỉ định vị được.
  - Hành vi (~50%): tỷ lệ và thời gian phản hồi tin nhắn, tỷ lệ báo giá RFQ. Dưới ngưỡng dữ liệu tối thiểu → nhãn "Mới trên nền tảng", không chấm phần này.
- Thông tin tự khai được gắn nhãn "tự khai", trọng số 0.
- Không bao giờ là đầu vào của `decide()` và không dùng để xếp thứ tự danh bạ.
- Hiển thị kèm biểu tượng (i): "Điểm do hệ thống VYBE Trade tính theo phương pháp công bố tại /trust-score. Không phải chứng nhận hay xếp hạng tín dụng." Trang `/trust-score` giải thích từng thành phần.
- Cờ `TRUST_SCORE_PUBLIC`: bật ở staging để demo; production chỉ owner và admin thấy cho tới khi pháp lý/GDPR duyệt.

## Phương án đã loại

- **Bắt buộc xác minh buyer trước khi gửi RFQ** (hiện trạng): không nền tảng lớn nào làm vậy; làm buyer thật không dùng được.
- **Đổi enum `verification_level`**: thêm giá trị enum Postgres không hạ cấp được sạch; cột `verification_tier` riêng thì hạ cấp được.
- **Điểm tín nhiệm hộp đen** (một con số không giải thích): trái nguyên tắc §4.7 của tài liệu nghiên cứu và rủi ro pháp lý khách đã nêu.

## Hệ quả

- Buyer chưa xác minh gửi được RFQ theo hạn mức cấu hình (`RFQ_DAILY_LIMIT_UNVERIFIED`); seller thấy trạng thái buyer và khuyến nghị điều khoản an toàn (đặt cọc, L/C).
- Cấp Nâng cao gắn với quyền dùng đã trả phí (ADR-0005).
- Luật TM cần duyệt: `tier_requirements`, `trust_criteria`, danh sách giấy phép theo loại dịch vụ.
