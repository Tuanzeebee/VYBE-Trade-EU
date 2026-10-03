# Hành trình khách hàng — ai dùng gì, ai trả tiền ở bước nào

Áp dụng cho bản nâng cấp sau demo 30/09/2026. Giá các gói là **tạm tính**, chờ khách chốt; admin sửa trên tab Thanh toán. Cơ chế thanh toán: [ADR-0005](../adr/0005-manual-bank-transfer-orders.md).

## Nguyên tắc

- **Buyer miễn phí** trong giai đoạn MVP.
- **Công cụ tuân thủ luôn miễn phí** cho mọi người: công cụ tính thuế, quy tắc xuất xứ và EUR.1 nháp, trợ lý AI.
- Seller chỉ trả tiền cho **dịch vụ thêm**: duyệt xác minh Nâng cao, báo cáo go-to-market đầy đủ, danh sách đầy đủ "ai đã xem hồ sơ".
- Thanh toán bằng chuyển khoản ngân hàng: đội ngũ VYBE đối soát rồi xác nhận, quyền dùng mở ngay. Không có cổng thẻ, không giữ tiền hộ.

## Seller sản phẩm

| Bước | Seller làm | Hệ thống làm | Phí |
|---|---|---|---|
| 1. Đăng ký | Tạo tài khoản, chọn "Sản phẩm" | — | Miễn phí |
| 2. Hồ sơ vừa đủ | Thông tin công ty, người đại diện, năng lực nhà máy, mã vùng trồng / cơ sở | Kiểm tự động email, website, địa chỉ | Miễn phí |
| 3. Sản phẩm | Tên → gợi ý mã HS, bậc giá, quy cách, mô tả một ngôn ngữ | Dịch máy phần còn lại; giá tham khảo EU; cảnh báo ngành | Miễn phí |
| 4. Xác minh Cơ bản | Tải giấy ĐKKD, gửi yêu cầu | Admin đối chiếu Cổng ĐKDN, duyệt → hiện ở danh bạ | Miễn phí |
| 5. Nhận khách | Trả lời tin nhắn, RFQ, gửi báo giá | Thông báo; thống kê cho điểm tín nhiệm | Miễn phí |
| 6. Biết nên bán ở đâu | Xem gợi ý thị trường, tạo báo cáo go-to-market | Bản tóm tắt | Miễn phí |
| 7. Báo cáo đầy đủ | Đặt mua "Báo cáo go-to-market đầy đủ" → chuyển khoản | Admin xác nhận → mở mọi phần + PDF trong 90 ngày | **Trả phí** (tạm tính 1.500.000 đ) |
| 8. Ai đã xem hồ sơ | Đặt mua "Danh sách đầy đủ" | Miễn phí: 3 tên gần nhất. Trả phí: tất cả, trong 90 ngày | **Trả phí** (tạm tính 500.000 đ) |
| 9. Xác minh Nâng cao | Đặt mua "Duyệt xác minh Nâng cao" → nộp bằng chứng năng lực → gửi yêu cầu | Admin đối chiếu tổ chức cấp, mã cơ sở EU, bằng chứng xuất khẩu → cấp Nâng cao trong 1 năm | **Trả phí** (tạm tính 2.000.000 đ/năm) |
| 10. Tư vấn triển khai | Bấm "Tư vấn qua mạng lưới VBA" từ báo cáo | Admin chuyển yêu cầu cho mạng lưới VBA | Theo thỏa thuận VBA (ngoài nền tảng) |

## Nhà cung cấp dịch vụ (logistics, hải quan, kế toán…)

| Bước | Làm | Phí |
|---|---|---|
| Đăng ký, chọn "Dịch vụ", khai loại dịch vụ và phạm vi | Hiện ở tab Dịch vụ của danh bạ sau khi xác minh Cơ bản | Miễn phí |
| Xác minh Nâng cao | Giấy phép hành nghề theo loại dịch vụ (danh sách do luật TM duyệt) | Trả phí như seller |

## Buyer

| Bước | Làm | Phí |
|---|---|---|
| Đăng ký tối giản | Tên công ty, quốc gia, thành phố, người liên hệ, email | Miễn phí |
| Tìm và liên hệ | Xem hồ sơ, nhắn tin trực tiếp, gửi RFQ (chưa xác minh: 3 RFQ/ngày) | Miễn phí |
| Xác minh KYB nhẹ (tùy chọn) | Mã VAT (VIES), LEI, email tên miền, website → nhãn "Doanh nghiệp đã xác minh", hạn mức cao hơn, seller thấy tên khi buyer xem hồ sơ | Miễn phí |
| Giao dịch | Chấp nhận báo giá; hợp đồng và thanh toán giữa hai bên diễn ra ngoài nền tảng | — |

## Admin (đội ngũ VYBE)

- Duyệt xác minh và cấp.
- Xem kết quả kiểm tự động và ghi kiểm tay.
- Xác nhận chuyển khoản.
- Theo dõi yêu cầu tư vấn.
- Nạp thống kê thương mại.
- Quản lý dữ liệu tuân thủ; phần này do luật TM duyệt.

Mọi thao tác nhạy cảm được ghi nhật ký.

## Giai đoạn 2 (sau khoảng 100 người dùng)

Thanh toán qua nền tảng, bảo lãnh, ký quỹ và stablecoin; buyer B2 (điều khoản thanh toán): xem [GD2_THANH_TOAN.md](GD2_THANH_TOAN.md).
