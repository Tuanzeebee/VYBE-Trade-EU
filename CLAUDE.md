# CLAUDE.md

@AGENTS.md

Mọi quy tắc dự án nằm trong `AGENTS.md` (import ở trên). File này chỉ bổ sung phần riêng cho Claude Code. Khi hai file có vẻ khác nhau, `AGENTS.md` thắng.

## Cách Claude Code làm việc trong repo này

- **Bắt đầu mỗi hạng mục:** đọc dòng backlog tương ứng (mã, "Việc cần làm", "Xong khi", "Phụ thuộc") và phần module đó trong `KE_HOACH_CODE_THEO_MODULE.md` (gốc repo). Nếu hạng mục phụ thuộc còn chưa xong, báo lại trước khi code.
- **Plan mode:** dùng cho mọi việc chạm >1 module, thêm/sửa bảng, hoặc đụng module `compliance`, `verification`, `copilot`. Trình kế hoạch và chờ duyệt.
- **Task list:** hạng mục có ≥3 bước thì tạo task list. Bước cuối luôn là "chạy lint + typecheck + test và báo kết quả".
- **Subagent:** chỉ dùng `Explore` để tìm kiếm rộng trong repo khi cần. Không giao việc sửa code nghiệp vụ tuân thủ cho subagent.
- **Checkpoint:** xong một hạng mục thì dừng, tóm tắt theo AGENTS.md §11.5 và chờ người dùng. Không tự làm hạng mục tiếp theo.

## Những việc Claude Code không tự làm khi chưa được yêu cầu rõ

- `git push`, tạo PR, merge, rebase, `git reset --hard`, xóa nhánh.
- Chạy migration hoặc script trên DB staging/prod; deploy; đổi cấu hình CI/hạ tầng.
- Cài thêm dependency (`uv add`, `npm install <gói>`).
- Sửa file trong `docs/spec/`, `docs/backlog/`, `docs/adr/`, hoặc sửa `AGENTS.md` / `CLAUDE.md`.
- Sửa migration đã merge, sửa dữ liệu fixture tuân thủ do luật TM soạn (`backend/tests/fixtures/compliance/`, `backend/evals/`).
- Xóa hoặc tắt test đang đỏ để CI xanh.

## Mẹo kỹ thuật

- Sau khi sửa schema hoặc route backend, chạy `npm run generate:api` trong `frontend/` trước khi sửa code FE.
- Kiểm nhanh ranh giới module: `grep -rn "from app.modules" backend/app/modules/<module>` — chỉ được import `service`/`schemas` của module khác, không import `models`.
- Chạy test một file khi đang lặp nhanh; chạy lại toàn bộ test module trước khi báo xong.
