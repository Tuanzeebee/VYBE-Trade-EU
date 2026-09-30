# Thuế tại sản phẩm, tự điền tên từ mã HS, thông báo gợi ý nhà cung cấp mới

Ngày: 2026-09-30. Trạng thái: chờ người dùng duyệt bản viết. Chưa có mã backlog (chưa mở `EVFTA_eu_Backlog_MVP.xlsx`).

## Mục tiêu

1. Seller thấy thuế MFN so với EVFTA ngay tại sản phẩm, không phải vào máy tính riêng.
2. Chọn mã HS xong thì tên sản phẩm tự điền (onboarding seller).
3. Buyer nhận gợi ý chủ động "có nhà cung cấp mới phù hợp" ở chuông thông báo và dashboard.

Ràng buộc: không thêm bảng, không migration, không thêm dependency. Thứ tự làm: 2 → 1 → 3, mỗi việc một commit `<mã>: <mô tả>`.

## Việc 2 — Tự điền tên (chỉ frontend)

- `frontend/components/ProductsEditor.tsx`: khi chọn mã HS từ `HsCodePicker` mà ô tên trống, điền `name_vi` hoặc `name_en` theo ngôn ngữ đang dùng.
- Đổi sang mã HS khác thì tên đổi theo, chỉ khi tên hiện tại vẫn bằng đúng tên đã tự điền lần trước. Tên seller đã gõ hoặc sửa tay không bị ghi đè.
- Test: thêm vào `frontend/tests/products-editor.test.tsx`.

## Việc 1 — Thuế tại sản phẩm

### Backend (`compliance`)
- `service.preview_tariff(hs_code)`: chỉ đọc, dùng lại `lookup_lines` và hàm thuần `tariff_savings`. **Không ghi `compliance_checks`** (người dùng chọn phương án A; đây là xem thông tin, không phải lần chạy máy tính chủ động).
- Chỉ dùng dòng có `reviewed_by` và còn hiệu lực, như `_reviewed_lines`.
- Route `GET /api/exporter/tariff-preview?hs_code=`, `require_role(exporter)`. Tra theo mã HS để hiện được cả khi sản phẩm chưa lưu. Router mỏng; `companies` không import gì từ `compliance`.
- Kết quả giữ ba trạng thái:
  - `ok`: thuế MFN, thuế EVFTA hiện hành, lộ trình cắt giảm, năm về 0%, ghi chú điều kiện, nguồn.
  - `needs_review`: có lý do (hạn ngạch hoặc thuế không phải tỷ lệ phần trăm), không có con số nào, không bao giờ 0%.
  - `unsupported`: không có con số nào.
- Không hiện "tiết kiệm hàng năm" (cần giá trị hoặc sản lượng nhập khẩu mà sản phẩm không có). Chỉ hiện chênh lệch thuế suất.

### Frontend
- Component `TariffPanel`: trong `ProductsEditor` tự tính khi chọn mã HS và hiện tóm tắt MFN so với EVFTA. Bấm vào sản phẩm thì mở đủ thông tin.
- Chuỗi hiển thị có đủ `vi` và `en` qua next-intl. Chạy `npm run generate:api` sau khi sửa backend.

### Test
- Bảng ca chuẩn (`parametrize`): một ca `ok`, gạo ST25 `needs_review`, một mã `unsupported`.
- Dòng chưa duyệt không lộ ra API.
- Một lần gọi preview không tạo dòng `compliance_checks`.
- 401 khi thiếu phiên, 403 khi sai vai trò.

## Việc 3 — Thông báo gợi ý chủ động (dùng logic có sẵn)

- `notifications/handlers.py`: handler cho `VerificationStatusChanged` khi trạng thái mới là `verified`. Handler gọi hàm mới ở `companies/service.py` để lấy buyer có ngành nguồn hàng trùng với ngành của công ty vừa được xác minh, dựa trên cách khớp của `list_recently_verified` (ô `new_verified`). Cách khớp cụ thể sẽ chốt sau khi đọc lại hàm này khi bắt đầu code.
- Với mỗi buyer khớp, tạo thông báo `new_match` (loại đã có) qua `create_notification`, link tới hồ sơ công ty. Chống trùng theo cặp buyer và công ty.
- Chỉ thông báo trong ứng dụng (chuông và dashboard), không gửi email đợt này.
- Không thêm bảng, không làm `saved_searches`, không sửa module `matching`.
- Test: buyer khớp nhận thông báo, buyer không khớp không nhận; phát lại sự kiện không tạo bản trùng; công ty chưa `verified` thì không thông báo.

## Ngoài phạm vi

`saved_searches` và job khớp (K1/K2, P1), email `new_match`, `expiry_alert`, "tiết kiệm hàng năm", gợi ý chủ động cho exporter.

## Kết thúc mỗi việc

Chạy lint, typecheck và test của phần đã sửa, báo kết quả thật.
