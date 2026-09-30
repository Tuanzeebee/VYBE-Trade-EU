# Hướng dẫn thử nghiệm thủ công (DB dev)

## 1. Chuẩn bị

```bash
docker compose up -d                                   # Postgres, MinIO, Mailpit
cd backend
uv run alembic upgrade head
uv run python -m scripts.seed_hs_codes                 # 30 mã HS
uv run python -m scripts.seed_evidence_types           # 15 loại bằng chứng (chưa duyệt)
uv run python -m scripts.seed_testkit                  # tài khoản + công ty + sản phẩm + thuế/PSR nháp
uv run fastapi dev app/main.py                         # API :8000
cd ../frontend && npm run dev                          # web :3000  → http://localhost:3000/vi
```

Xóa dữ liệu thử: `uv run python -m scripts.seed_testkit --purge`.
Thêm 15–20 công ty giả để thấy danh bạ đầy: `uv run python -m scripts.seed_demo --count 20` (xóa bằng `--purge`).

## 2. Tài khoản (mật khẩu chung: `TestKit-2026-evfta`)

| Email | Vai trò | Ghi chú |
|---|---|---|
| admin.test@example.com | admin | duyệt dữ liệu luật, hàng đợi xác minh, nhật ký |
| xuatkhau.daxacminh@example.com | exporter | Nông Sản Việt — đã xác minh; gạo 1006.30, cà phê 0901.11 |
| xuatkhau.thuysan@example.com | exporter | Thủy Sản Mekong — đã xác minh mức EVFTA-verified; tôm 0306.17, cá tra 0304.62 |
| xuatkhau.chuaxacminh@example.com | exporter | chưa xác minh → KHÔNG được hiện ở danh bạ / hồ sơ công khai |
| buyer.daxacminh@example.com | buyer (en) | đã xác minh → gửi được tối đa 5 RFQ/24h |
| buyer.chuaxacminh@example.com | buyer (en) | chưa xác minh → gửi RFQ bị chặn (403) |

## 3. Bước bắt buộc trước khi thử máy tính: DUYỆT dữ liệu luật

Gói luật TM v0 do Claude soạn, **chưa ai duyệt** nên máy tính đang trả "chưa hỗ trợ". Đăng nhập admin →
`/vi/admin` → tab **Dữ liệu tuân thủ** → bấm **Duyệt** từng dòng cần thử (hoặc duyệt hết để thử đủ ca).
Dòng độ tin cậy C (ghi trong ghi chú) đã bị bỏ mức EVFTA — muốn thử ra số phải sửa qua API rồi duyệt.

## 4. Máy tính thuế `/vi/tools/tariff` (nước nhận: Germany)

| Mã HS | Giá trị lô | Kỳ vọng (theo gói v0, sau khi duyệt dòng đó) |
|---|---|---|
| 0306.17 tôm đông lạnh | 10000 | MFN 12% = 1.200 · EVFTA 0% · **tiết kiệm 1.200 EUR** |
| 1605.21 tôm chế biến | 10000 | MFN 20% = 2.000 · EVFTA 2,5% = 250 · tiết kiệm 1.750 (độ tin cậy B — cần đối chiếu) |
| 0304.87 phi lê cá ngừ | 10000 | MFN 18% = 1.800 · EVFTA 0% · tiết kiệm 1.800 |
| 0307.43 mực | 10000 | MFN 8% · EVFTA 0% · tiết kiệm 800 |
| 1604.14 cá ngừ đóng hộp | 10000 | **needs_review** (hạn ngạch) — không có con số |
| 1006.30 gạo | 10000 | **needs_review** (hạn ngạch, thuế theo EUR/tấn) — không có con số (ca ST25) |
| 0901.11 cà phê nhân | 10000 | Không có mức EVFTA trong dữ liệu (độ tin cậy C) → needs_review cho tới khi tra và điền |
| 6109.10 áo phông | 10000 | needs_review (chưa xác định nhóm lộ trình) |
| 8517.12 (mã ngoài danh mục) | 10000 | **unsupported**, không có con số nào |

Kiểm thêm: nhập số tiền `10.000,5` hoặc `-5` phải báo lỗi; gọi >30 lần/phút → thông báo "quá nhiều lần".

## 4b. Máy tính xuất xứ `/vi/tools/origin`

Ca kiểm của gói luật TM (kết quả kỳ vọng do PO/luật TM ghi, CHƯA ký). Duyệt quy tắc PSR tương ứng trước.

| Ca | Mã HS | Nhập | Kỳ vọng |
|---|---|---|---|
| TC01 | 0306.17 | EXW 10000; nguyên liệu Ch.3 100% VN (chọn "không có nguyên liệu nhập khẩu") | Đạt |
| TC02 | 0306.17 | tôm nhập Ấn Độ (IN) 100% — nhập nguyên liệu IN, giá trị bằng giá EXW | Không đạt |
| TC03 | 1605.21 | nguyên liệu Ecuador (EC) chiếm 60% giá EXW | Không đạt |
| TC04 | 1604.14 | chưa khai nguyên liệu | Chưa kết luận (quy tắc yêu cầu chuyên gia) |
| TC05 | 0901.11 | 100% VN | Đạt (duyệt quy tắc 0901.11; độ tin cậy C) |
| TC06–TC08 | 0901.21, 6109.10, 6203.42 | bất kỳ | **Chưa hỗ trợ** — gói v0 để "CẦN TRA/PROCESS", hệ thống chưa có loại quy tắc này (khác kỳ vọng "Chưa kết luận" của gói) |
| TC09–TC10 | 6403.99, 6404.11 | bất kỳ | **Chưa hỗ trợ** — loại CTH_EXCEPT chưa hỗ trợ (gói kỳ vọng Đạt / Không đạt) |

EUR.1 nháp: chỉ thử được sau khi một ca **Đạt** (đăng nhập exporter, nút tạo bản nháp trên kết quả). PDF phải có watermark
"DRAFT — for review before submission to issuing authority" trên mọi trang và dòng "Bộ Công Thương".

## 5. Danh bạ và RFQ

1. `/vi/suppliers` (không đăng nhập): thấy 2 công ty đã xác minh; tìm `gạo`, `rice`, `1006`, `tôm`, `HACCP`; lọc quốc gia VN, nhóm hàng seafood.
2. `/vi/suppliers/test-chua-xac-minh` → 404.
3. Đăng nhập `buyer.chuaxacminh` → mở hồ sơ Nông Sản Việt → gửi RFQ → báo "cần được xác minh".
4. Đăng nhập `buyer.daxacminh` → gửi RFQ (số lượng `500.50`, kg, CIF, DE, ngày cần hàng ≥ hôm nay) → thành công; gửi lần thứ 6 trong 24h → bị chặn.
5. Đăng nhập `xuatkhau.daxacminh` → chuông có thông báo; tab RFQ mở RFQ → "Đã xem"; đổi "Đã báo giá"; email hiện ở Mailpit (http://localhost:8025) nếu worker chạy.
6. `/vi/conversations` (cả hai bên): nhắn qua lại. Chưa nối nhà cung cấp dịch (Q5) nên tin đi bằng bản gốc, không có nút "Xem bản gốc".
7. Đăng nhập buyer → `/vi/buyer` (dashboard); exporter → tab "Tổng quan" (6 ô, ô trống có hướng dẫn); admin → tab Tổng quan (tỷ lệ quay lại).

## 6. Xác minh doanh nghiệp

`xuatkhau.chuaxacminh` → tab Xác minh → nộp bằng chứng (loại bằng chứng phải được admin duyệt trước:
admin → Dữ liệu tuân thủ → loại bằng chứng) → nộp yêu cầu → admin: hàng đợi → Duyệt / Từ chối (bắt buộc lý do) / Yêu cầu bổ sung.
Sau duyệt: công ty hiện ở danh bạ; email + thông báo gửi tới exporter.

## 7. Trợ lý AI `/vi/copilot`

Chưa có corpus (10 văn bản DOC01–DOC10 của gói luật TM chưa có file) và chưa chọn LLM thật (Q5), nên trợ lý đang dùng bản giả
và trả `out_of_scope` cho hầu hết câu hỏi (nút "Chuyển chuyên gia" + nhập email). Bộ 50 câu: `backend/evals/copilot_50.jsonl`;
chạy `uv run python -m app.modules.copilot.eval` chỉ có ý nghĩa sau khi nạp và duyệt corpus.

## 8. Pháp lý và chân trang

`/vi/terms` → chọn Doanh nghiệp / Người mua; `/vi/privacy`. Đây là bản dự thảo còn `[•]` và `[TÊN PHÁP NHÂN VẬN HÀNH]`.
Chân trang: mọi liên kết phải mở đúng trang, không có `#`.

## 9. Tài khoản và dữ liệu cá nhân

Đăng nhập một tài khoản thử → chọn "Tài khoản của tôi" (`/vi/account`) → Xóa tài khoản (nhập mật khẩu): công ty biến khỏi danh bạ,
email không đăng nhập lại được. Chạy lại `seed_testkit` để tạo lại.

## 10. Chạy kiểm tra tự động

```bash
cd backend && uv run pytest -q && uv run ruff check . && uv run mypy app
cd frontend && npm test && npm run lint && npm run i18n:check
```
