# Giai đoạn 2 — thanh toán qua nền tảng (ghi chú nghiên cứu)

Trạng thái: **ghi chú để thảo luận, chưa phải quyết định**. Giai đoạn 1 chỉ dùng chuyển khoản do admin xác nhận ([ADR-0005](../adr/0005-manual-bank-transfer-orders.md)). PO chốt 01/10/2026: phần này rất phức tạp, chỉ làm sau khi có khoảng 100 người dùng hoạt động.

## Vì sao chưa làm

- **Pháp lý**: giữ tiền hộ (escrow) tại Việt Nam cần giấy phép trung gian thanh toán của Ngân hàng Nhà nước, hoặc hợp tác với ngân hàng / đơn vị có phép. Giao dịch B2B xuyên biên giới còn thêm quản lý ngoại hối.
- **Tài sản mã hóa / stablecoin**: khung pháp lý tại Việt Nam còn đang hình thành. Cần luật sư tư vấn trước khi thiết kế; rủi ro AML/KYC cao.
- **Chi phí vận hành**: đối soát, hoàn tiền, tranh chấp, bảo hiểm. Chưa đáng làm khi quy mô còn nhỏ.
- **Hành vi thị trường**: thương mại nông sản và thủy sản xuất khẩu EU phần lớn dùng T/T có đặt cọc, thanh toán theo bản sao B/L, hoặc L/C. Báo giá trên nền tảng (U8) đã mô tả được các điều khoản này.

## Phương án cần đánh giá khi tới ngưỡng

| Phương án | Mô tả | Ưu | Nhược / việc phải làm |
|---|---|---|---|
| Cổng thẻ / ví nội địa (VNPay, MoMo…) cho phí dịch vụ | Seller trả phí gói bằng thẻ / QR | Tự động hóa ADR-0005 (chỉ thay bước xác nhận bằng webhook) | Hợp đồng merchant, hóa đơn điện tử |
| Hợp tác ngân hàng cho **escrow** giao dịch hàng | Ngân hàng giữ tiền cọc, giải ngân theo mốc (B/L, kiểm hàng) | Giảm rủi ro cho cả hai bên | Tích hợp API ngân hàng, quy trình tranh chấp, phí |
| L/C số / trade finance qua đối tác | Kết nối nền tảng tài trợ thương mại | Quen thuộc với doanh nghiệp xuất khẩu | Phụ thuộc đối tác, chỉ hợp đơn lớn |
| Bảo hiểm tín dụng thương mại | Đối tác bảo hiểm thanh toán cho seller | Không giữ tiền | Chọn đối tác, định phí |
| Stablecoin (USDT/USDC) | Thanh toán xuyên biên giới nhanh | Nhanh, phí thấp | Pháp lý chưa rõ; AML; biến động quy đổi. Chỉ xem xét khi có ý kiến pháp lý bằng văn bản |

## Điều kiện kích hoạt

- Khoảng 100 người dùng hoạt động, trong đó có seller đã giao dịch qua RFQ và báo giá.
- Có số liệu báo giá được chấp nhận (U8) để ước lượng giá trị giao dịch.
- Có ý kiến pháp lý về escrow và tài sản mã hóa.
- Chọn được đối tác ngân hàng / cổng thanh toán.

## Tính năng liên quan cần làm cùng lúc

- **Buyer B2**: xác minh điều khoản thanh toán hoặc bảo lãnh (ADR-0004 đã chừa chỗ).
- Trạng thái đơn hàng đi theo mốc giao hàng (booking, B/L, hàng tới).
- Tranh chấp và hoàn tiền; nhật ký đầy đủ.
