# ADR-0002: Cơ chế phiên đăng nhập

- Trạng thái: Đã duyệt (29/09/2026)
- Ngày: 2026-09-29
- Hạng mục: J7, A1

## Bối cảnh

AGENTS.md §7 yêu cầu phiên bằng cookie HTTP-only + Secure + SameSite, mật khẩu Argon2 ≥ 10 ký tự, khóa 15 phút sau 5 lần sai. Bài học VYBE A1: từng vào được admin bằng mật khẩu rỗng. Cần thu hồi phiên ngay khi đăng xuất, khóa tài khoản hoặc xóa tài khoản (GDPR, J2). Không muốn thêm hạ tầng (Redis).

## Quyết định

Phiên phía server lưu trong PostgreSQL.

- Đăng nhập thành công → sinh token `secrets.token_urlsafe(32)` (256 bit).
- Cookie `evfta_session`: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age` = 14 ngày.
- Bảng `sessions(id, user_id, token_hash, expires_at, created_at)`; chỉ lưu SHA-256 của token, không lưu token gốc.
- Mỗi request cần phiên: tra `token_hash` + `expires_at > now()` + user chưa bị xóa.
- Đăng xuất xóa dòng phiên. Xóa tài khoản xóa mọi phiên của user.
- Phân quyền hai lớp: dependency `require_role(...)` trên router + service kiểm chủ sở hữu.
- CSRF: dựa vào `SameSite=Lax`; bổ sung kiểm header `Origin` cho POST/PATCH/DELETE ở J8.
- Admin chỉ tạo bằng `scripts/create_admin.py`, không qua API đăng ký.

## Phương án đã loại

- **JWT không trạng thái:** không thu hồi được ngay khi đăng xuất/khóa nếu không có danh sách chặn — tức là quay lại lưu trạng thái.
- **Phiên trong Redis:** thêm hạ tầng, trái AGENTS.md §2.
- **Thư viện auth bên ngoài (fastapi-users…):** thêm phụ thuộc, khó kiểm soát quy tắc khóa và audit.

## Hệ quả

- Mỗi request cần phiên tốn một truy vấn có index (`token_hash` unique) — chấp nhận ở quy mô MVP.
- Cần job dọn phiên hết hạn (gộp vào job hằng ngày của I7).
- Frontend gọi API với `credentials: "include"`; API và web phải cùng site (cùng eTLD+1) để `SameSite=Lax` hoạt động — ràng buộc cho ADR-0001.
