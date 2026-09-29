# ADR-0001: Hosting — tạm thời tại Việt Nam

- Trạng thái: Đã duyệt (29/09/2026)
- Ngày: 2026-09-29
- Hạng mục: J7

## Bối cảnh

Backlog và AGENTS.md ghi hosting vùng EU (GDPR). Ngày 29/09/2026 người dùng quyết định: **giai đoạn MVP tạm host tại Việt Nam; hosting không thêm yêu cầu nào vào phạm vi P0.** Chuyển sang vùng EU là việc sau MVP.

## Quyết định

- MVP chạy trên hạ tầng tại Việt Nam. Nhà cung cấp cụ thể chưa chốt; không phải điều kiện để hoàn thành hạng mục P0 nào.
- Code không phụ thuộc vùng: mọi địa chỉ DB, S3, email đọc từ biến môi trường qua `core.config`, để sau này chuyển sang EU chỉ cần đổi cấu hình và di chuyển dữ liệu.
- Giữ nguyên các thực hành GDPR ở mức ứng dụng (spec §6 — chúng không phụ thuộc nơi host): consent (A1), tối thiểu dữ liệu, xóa tài khoản bằng ẩn danh hóa (J2), bucket private + pre-signed URL, không gửi PII không cần thiết vào LLM/log.

## Rủi ro đã chấp nhận

- Dữ liệu cá nhân của buyer EU lưu ngoài EU. Nếu có buyer EU thật trong pilot, cần cơ sở pháp lý cho việc chuyển dữ liệu ra ngoài EU (ví dụ điều khoản hợp đồng mẫu) và nêu rõ trong Chính sách bảo mật (E4, J2).
- Lệch với backlog (J7 "môi trường dev/staging/prod vùng EU"), AGENTS.md §2 ("S3-compatible vùng EU") và `KE_HOACH_CODE_THEO_MODULE.md` (bảng mâu thuẫn tài liệu: "Hosting — Vùng EU (GDPR)"). Agent không tự sửa các tài liệu này; người có quyền cần cập nhật để tránh code nhầm.

## Hệ quả

- J7 tiêu chí "ADR hosting đã ký" đạt khi ADR này được ký; không còn phụ thuộc chọn nhà cung cấp EU.
- Khi chuyển EU: di chuyển Postgres (pg_dump/restore), object storage, đổi biến môi trường; cập nhật Chính sách bảo mật.
