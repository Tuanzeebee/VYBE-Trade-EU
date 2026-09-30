# ADR-0005: Đơn chuyển khoản thủ công cho hành trình trả phí

- Trạng thái: Đề xuất (01/10/2026)
- Ngày: 2026-10-01
- Hạng mục: U19

## Bối cảnh

Khách muốn bản demo đi đúng hành trình của một người dùng thật: trả tiền ở bước nào, trả bao nhiêu, trả xong thì được gì. Thanh toán qua nền tảng có bảo lãnh, escrow và stablecoin là giai đoạn 2, chỉ triển khai sau khi có khoảng 100 người dùng. PO chốt: hiện tại chỉ cần bản ngắn gọn "chuyển khoản, nhận được".

## Quyết định

- Module mới `billing` với ba bảng:
  - `billing_items`: danh mục mục thu phí là **dữ liệu** (mã, tên vi/en, đối tượng seller/buyer, giá `numeric`, tiền tệ, thời hạn quyền dùng tính bằng ngày, quyền được cấp). Giá khởi tạo là placeholder chờ khách chốt.
  - `orders`: đơn mua (công ty, mục, số tiền, mã tham chiếu duy nhất, trạng thái `pending` / `paid` / `cancelled`, người xác nhận, lúc xác nhận).
  - `entitlements`: quyền dùng đã cấp (công ty, quyền, hết hạn, đơn gốc).
- Luồng: người dùng chọn mục → tạo đơn → trang hướng dẫn chuyển khoản (tên tài khoản, số tài khoản/IBAN, ngân hàng từ cấu hình; nội dung chuyển khoản là mã tham chiếu) → admin đối soát sao kê và bấm "Đã nhận chuyển khoản" → hệ thống cấp quyền dùng và gửi thông báo.
- Xác nhận là thao tác nhạy cảm: ghi `core.audit.record()` trước/sau; xác nhận lần hai không có tác dụng (idempotent).
- Tiền dùng `Decimal`/`numeric` (§5.7).
- Quyền dùng được kiểm ở service của module dùng nó (qua `billing.service.has_entitlement()`), không chỉ ẩn nút ở giao diện.
- Công cụ tuân thủ cho khách (máy tính thuế, xuất xứ, trợ lý AI) **không bao giờ** thu phí.

## Phương án đã loại

- **Cổng thẻ (Stripe, VNPay…):** cần tài khoản merchant, hợp đồng và phụ thuộc mới; PO chưa cần.
- **Gói thuê bao định kỳ tự gia hạn:** phức tạp, chưa cần cho demo; quyền dùng có hạn là đủ.
- **Escrow / bảo lãnh / stablecoin:** giai đoạn 2, ghi chú nghiên cứu riêng.

## Hệ quả

- Admin cần đối soát sao kê thủ công; phù hợp quy mô pilot.
- Hóa đơn VAT xuất ngoài hệ thống; đơn lưu thông tin xuất hóa đơn người mua cung cấp.
- Khi có cổng thanh toán, chỉ thay bước xác nhận bằng webhook; bảng `orders` và `entitlements` giữ nguyên.
