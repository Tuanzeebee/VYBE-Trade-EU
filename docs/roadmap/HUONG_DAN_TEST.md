# Hướng dẫn thử nghiệm thủ công

Tài liệu gồm hai phần:

- **Phần A — bản nâng cấp sau demo 30/09/2026** (nhánh `feat/demo-feedback-upgrade`, U1–U25), dùng bộ dữ liệu `seed_demo_journey`.
- **Phần B — bộ thử cũ** (`seed_testkit`): máy tính thuế, xuất xứ và EUR.1 trên gói luật TM v0.

Kịch bản trình diễn cho khách nằm ở [KICH_BAN_DEMO.md](KICH_BAN_DEMO.md).

---

# Phần A — Bản nâng cấp sau demo

## A1. Chuẩn bị (DB mới)

```bash
docker compose up -d                      # Postgres, MinIO, Mailpit
cd backend
cp .env.example .env                      # rồi bật các dòng dưới đây trong .env
#   DEMO_COMPLIANCE_DATA=true             # thuế / hạn ngạch / cảnh báo MINH HOẠ (chỉ dev/staging)
#   TRUST_SCORE_PUBLIC=true               # hiện điểm tín nhiệm trên hồ sơ công khai (staging)
#   CHAT_BACKEND=ollama                   # tuỳ chọn: lời văn báo cáo do model viết (mặc định: mẫu)
#   LOOKUP_BACKEND=live                   # tuỳ chọn: kiểm tự động gọi VIES/GLEIF/DNS/website thật
uv run alembic upgrade head
uv run python -m scripts.seed_demo_journey --approve-evidence-types
uv run fastapi dev app/main.py            # API :8000
uv run procrastinate --app=app.jobs.app.app worker   # job nền: kiểm tự động, AI đọc giấy tờ, báo cáo, email
cd ../frontend && npm run dev             # web :3000 → http://localhost:3000/vi
```

- `--approve-evidence-types` ghi admin DEMO là người duyệt các loại bằng chứng nháp, để seller nộp được. Chỉ dùng trong môi trường demo.
- Script chạy lại không tạo trùng. Muốn làm lại từ đầu thì tạo DB mới.
- Nếu MinIO chưa chạy, script vẫn chạy xong nhưng báo cáo mẫu không có PDF (có dòng "LƯU Ý").

## A2. Tài khoản (mật khẩu chung `VybeDemo-2026!`)

| Email | Vai trò | Trạng thái sau khi seed |
|---|---|---|
| admin@vybe-demo.example | admin | Hàng đợi có 1 công ty chờ duyệt (cà phê) và 1 đơn chờ xác nhận chuyển khoản |
| mekong@vybe-demo.example | seller sản phẩm | Thủy sản Mekong Xanh — **cấp Nâng cao** (đã mua gói duyệt); có hội thoại, RFQ, báo giá đã được chấp nhận; 1 đơn "báo cáo đầy đủ" **đang chờ chuyển khoản** |
| gaothom@vybe-demo.example | seller sản phẩm | Gạo Thơm Sóc Trăng — cấp Cơ bản; **đã mua** báo cáo đầy đủ, có báo cáo GTM "gạo" và 1 yêu cầu tư vấn VBA |
| dieu@vybe-demo.example | seller sản phẩm | Điều Bình Phước — cấp Cơ bản |
| caphe@vybe-demo.example | seller sản phẩm | Cà Phê Tây Nguyên — **chờ duyệt**; email gmail (để thấy cảnh báo mail miễn phí) |
| logistics@ / haiquan@ / ketoan@vybe-demo.example | nhà cung cấp dịch vụ | Giao nhận + kho lạnh, đại lý hải quan, kế toán thuế — cấp Cơ bản |
| hanse@vybe-demo.example | buyer (DE) | **Đã xác minh KYB nhẹ** (tùy chọn) |
| rotterdam@ / epices@ / horeca@ / milano@vybe-demo.example | buyer (NL/FR/ES/IT) | Chưa xác minh — vẫn xem, nhắn tin, gửi RFQ (3 RFQ/ngày) |

Ngoài ra có 12 công ty nền `[DEMO]` để danh bạ trông đầy đủ.

## A3. Checklist theo tính năng

Mỗi dòng: bước thử → kết quả phải thấy.

### Hồ sơ seller và onboarding (U1–U4)

- [ ] `mekong` → **Hồ sơ doanh nghiệp**: không còn "96/100", "L2", khối nhà máy giả. Số liệu lấy từ hồ sơ thật (mã cơ sở `DL 481`, công suất 12.000 tấn/năm).
- [ ] Đăng ký seller mới → B1 hỏi "Bạn cung cấp: Sản phẩm / Dịch vụ / Cả hai". Chọn Dịch vụ thì B2 hỏi loại dịch vụ và phạm vi, không hỏi sản phẩm.
- [ ] Trường cơ quan cấp ghi "Sở Kế hoạch và Đầu tư…" → phần hiển thị ghi "Sở Tài chính". Chọn quốc gia khác Việt Nam → được; công cụ tuân thủ ghi "không áp dụng".
- [ ] **Sản phẩm cung cấp** → Thêm: gõ "cá tra" → gợi ý mã HS 0304.62. Nút "Tôi không chắc mã HS". Nhập bậc giá theo MOQ và nhiều quy cách đóng gói. Mô tả chỉ cần một ngôn ngữ, bản kia gắn nhãn "dịch máy".
- [ ] Form sản phẩm hiện **giá tham khảo** nhập khẩu EU từ Việt Nam và từ đối thủ (Eurostat, năm 2025), có ghi "không phải giá sàn".
- [ ] **Chứng nhận**: chỉ bắt buộc loại + file; có loại "Khác (ghi tên)". Admin duyệt loại có hạn dùng thì phải nhập ngày cấp.

### Buyer (U5–U6)

- [ ] Đăng ký buyer mới: B1 chỉ gồm tên công ty, quốc gia, thành phố, người liên hệ, email. Nhu cầu nhập hàng nằm ở tab "Hoàn thiện hồ sơ" và lưu lên server (tải lại trang vẫn còn).
- [ ] `rotterdam` (chưa xác minh) → gửi RFQ được, tới RFQ thứ 4 trong 24h thì bị chặn. Phía seller thấy nhãn "Buyer chưa xác minh" và khuyến nghị điều khoản an toàn (đặt cọc, L/C).
- [ ] `epices` → xác minh doanh nghiệp (tùy chọn): phải có mã VAT hoặc số đăng ký.

### Nhắn tin, báo giá, ai đã xem hồ sơ (U7–U9)

- [ ] `horeca` → hồ sơ Mekong → **Nhắn tin**: mở hội thoại không cần RFQ. Nhắn lần nữa vẫn vào đúng hội thoại cũ.
- [ ] `mekong` → **Cơ hội kết nối** → mở RFQ của Hanse → thấy báo giá đã được chấp nhận (đặt cọc 30%, phần còn lại khi nhận bản sao B/L).
- [ ] `mekong` → **Ai đã xem hồ sơ**: thấy tên Hanse (buyer đã xác minh). Chưa mua gói thì chỉ hiện 3 tên gần nhất, phần còn lại ghi "Còn N buyer…" kèm liên kết bảng giá.

### Danh bạ và hồ sơ công khai (U10, U20, U23)

- [ ] `/vi/suppliers`, tìm "cá tra": Mekong nằm trong nhóm đầu (xếp theo độ giống tên sản phẩm), tên sản phẩm khớp được tô sáng. Tab Dịch vụ thấy 3 nhà cung cấp dịch vụ.
- [ ] Hồ sơ Mekong: huy hiệu **"Đã xác minh · Nâng cao"**, di chuột thấy ai kiểm, ngày duyệt, hạn, phạm vi. Thứ tự các khối: giới thiệu → bản đồ → dữ liệu đã kiểm → năng lực → chứng nhận → sản phẩm → nút Nhắn tin/RFQ.
- [ ] Khi `TRUST_SCORE_PUBLIC=true`: có "Điểm tín nhiệm: N/100", biểu tượng (i) dẫn tới `/vi/trust-score`. Tắt cờ thì không hiện.

### Công cụ tính thuế (U11–U14) — cần `DEMO_COMPLIANCE_DATA=true`

- [ ] Tên công cụ là "Công cụ tính thuế"; tên hiệp định chỉ hiện trong kết quả.
- [ ] Chọn thị trường → chỉ hiện các hiệp định có dữ liệu; thị trường chưa có dữ liệu thì báo "chưa có dữ liệu đã duyệt".
- [ ] Gạo 1006.30, phân nhóm **"Gạo thơm thuộc danh sách giống"**, khối lượng 100 tấn → bảng **kịch bản trong / ngoài hạn ngạch** (0% và 175 EUR/tấn × 100 tấn), kèm điều kiện (xuất xứ đạt, giấy chứng nhận gạo thơm theo NĐ 103/2020). Không bao giờ ghi 0% vô điều kiện.
- [ ] Gạo, phân nhóm **"giống khác (vd ST25)"** → cần chuyên gia rà soát, **không có con số**.
- [ ] Mọi kết quả dùng dữ liệu minh hoạ đều có banner "Dữ liệu minh hoạ — chưa được chuyên gia pháp lý duyệt".
- [ ] Tôm 0306.17, cá tra 0304.62 → cảnh báo **thẻ vàng IUU**, hiện cả ở kết quả thuế và form sản phẩm.

### Gợi ý thị trường và báo cáo go-to-market (U15–U18)

- [ ] `/vi/tools/market-insights` → bấm "cá tra": 3 thị trường chính (Tây Ban Nha, Đức, Hà Lan), mỗi nước có lý do bằng số; thị trường tiềm năng; bảng đối thủ; dòng nguồn "Eurostat Comext".
- [ ] Admin → tab **Thị trường**: thấy lô nạp; nạp file CSV hoặc chạy nạp Eurostat (cần worker và mạng).
- [ ] `gaothom` → **Báo cáo go-to-market**: báo cáo "gạo" có mọi phần, bảng đối thủ và nút **Tải PDF** (PDF có dấu tiếng Việt).
- [ ] `mekong` (chưa trả tiền) → tạo báo cáo "cá tra" → chỉ phần Tóm tắt và Thị trường nên ưu tiên có nội dung; phần còn lại khoá, kèm liên kết bảng giá; không có PDF.
- [ ] Nút **Tư vấn triển khai qua mạng lưới VBA** → gửi form → admin → tab "Yêu cầu tư vấn" thấy yêu cầu, đổi trạng thái được.

### Thanh toán chuyển khoản (U19)

- [ ] `/vi/pricing`: giá lấy từ hệ thống, gắn nhãn "Giá tạm tính — chờ chốt"; khối "Miễn phí" ghi rõ buyer và công cụ tuân thủ miễn phí.
- [ ] `mekong` → **Gói dịch vụ & thanh toán**: đơn "Báo cáo go-to-market đầy đủ" có hướng dẫn chuyển khoản (số tài khoản minh hoạ, nội dung = mã `VYBE…`).
- [ ] Admin → tab **Thanh toán** → "Đã nhận chuyển khoản" → đơn thành "Đã thanh toán". Bấm lại không có tác dụng. `mekong` nhận thông báo; báo cáo "cá tra" mở đủ phần và có PDF.

### Xác minh theo cấp, kiểm tự động, điểm tín nhiệm, AI đọc giấy tờ (U20–U24)

- [ ] Admin → **Chờ duyệt** → Cà Phê Tây Nguyên: có khối **Kiểm tự động và kiểm tay** (mail miễn phí → "Cần xem thêm"), **Cờ kiểm chéo**, danh sách yêu cầu theo cấp. Ghi kết quả kiểm tay "Đối chiếu Cổng ĐKDN" (bắt buộc ghi chú; nút mở dangkykinhdoanh.gov.vn) → Duyệt → công ty lên cấp Cơ bản.
- [ ] `dieu` → **Xác minh doanh nghiệp** → khối **Cấp xác minh**: nút "Yêu cầu duyệt cấp Nâng cao" bị khoá, kèm liên kết mua gói. Mua gói, admin xác nhận chuyển khoản → gửi được yêu cầu → admin thấy nhãn "Xin lên cấp Nâng cao" → "Nâng lên cấp Nâng cao".
- [ ] Admin hạ cấp phải nhập lý do.
- [ ] `mekong` → **Điểm tín nhiệm**: điểm tổng, 3 điểm thành phần, từng tiêu chí, ngày tính, câu "Không phải chứng nhận hay xếp hạng tín dụng". Dữ kiện tự khai ghi "không tính điểm". Seller ít tương tác thì có nhãn "Mới trên nền tảng".
- [ ] Nộp chứng nhận PDF có chữ (worker đang chạy) → **Xem gợi ý từ AI**: số chứng chỉ, tổ chức cấp, ngày. Bỏ chọn một trường rồi "Áp gợi ý đã chọn" → bằng chứng về trạng thái chờ duyệt. Admin → "So sánh với AI đọc giấy tờ" thấy từng trường khớp / lệch. PDF dạng ảnh scan → "chưa đọc tự động được".

## A4. Những gì cố ý chưa làm

- Đổi logo và nhận diện.
- Thanh toán qua nền tảng, escrow, stablecoin: giai đoạn 2, xem [GD2_THANH_TOAN.md](GD2_THANH_TOAN.md).
- Dữ liệu thuế, hạn ngạch, danh sách FTA, tiêu chí điểm và yêu cầu theo cấp hiện đều là **bản nháp minh hoạ**. Danh sách việc chờ duyệt: [CAN_CHOT_SAU_NANG_CAP.md](CAN_CHOT_SAU_NANG_CAP.md).

---

# Phần B — Bộ thử cũ (gói luật TM v0)

## B1. Chuẩn bị

```bash
cd backend
uv run python -m scripts.seed_hs_codes                 # mã HS
uv run python -m scripts.seed_evidence_types           # loại bằng chứng (chưa duyệt)
uv run python -m scripts.seed_testkit                  # tài khoản + công ty + sản phẩm + thuế/PSR nháp
```

Xóa dữ liệu thử: `uv run python -m scripts.seed_testkit --purge`. Thêm công ty giả: `uv run python -m scripts.seed_demo --count 20`.

## B2. Tài khoản (mật khẩu chung: `TestKit-2026-evfta`)

| Email | Vai trò | Ghi chú |
|---|---|---|
| admin.test@example.com | admin | duyệt dữ liệu luật, hàng đợi xác minh, nhật ký |
| xuatkhau.daxacminh@example.com | exporter | Nông Sản Việt — đã xác minh; gạo 1006.30, cà phê 0901.11 |
| xuatkhau.thuysan@example.com | exporter | Thủy Sản Mekong — đã xác minh, đủ bằng chứng xuất xứ; tôm 0306.17, cá tra 0304.62 |
| xuatkhau.chuaxacminh@example.com | exporter | chưa xác minh → KHÔNG hiện ở danh bạ / hồ sơ công khai |
| buyer.daxacminh@example.com | buyer (en) | đã xác minh |
| buyer.chuaxacminh@example.com | buyer (en) | chưa xác minh → vẫn gửi được RFQ trong hạn mức (U6) |

## B3. Bước bắt buộc trước khi thử máy tính: DUYỆT dữ liệu luật

Gói luật TM v0 do Claude soạn, **chưa ai duyệt**, nên máy tính đang trả "chưa hỗ trợ". Đăng nhập admin → `/vi/admin` → tab **Dữ liệu tuân thủ** → bấm **Duyệt** từng dòng cần thử. Dòng độ tin cậy C (ghi trong ghi chú) đã bị bỏ mức EVFTA — muốn thử ra số phải sửa qua API rồi duyệt.

## B4. Công cụ tính thuế `/vi/tools/tariff` (nước nhận: Germany)

| Mã HS | Giá trị lô | Kỳ vọng (theo gói v0, sau khi duyệt dòng đó) |
|---|---|---|
| 0306.17 tôm đông lạnh | 10000 | MFN 12% = 1.200 · EVFTA 0% · **tiết kiệm 1.200 EUR** |
| 1605.21 tôm chế biến | 10000 | MFN 20% = 2.000 · EVFTA 2,5% = 250 · tiết kiệm 1.750 (độ tin cậy B — cần đối chiếu) |
| 0304.87 phi lê cá ngừ | 10000 | MFN 18% = 1.800 · EVFTA 0% · tiết kiệm 1.800 |
| 0307.43 mực | 10000 | MFN 8% · EVFTA 0% · tiết kiệm 800 |
| 1604.14 cá ngừ đóng hộp | 10000 | **needs_review** (hạn ngạch) khi chưa có dòng hạn ngạch đã duyệt |
| 1006.30 gạo | 10000 | **needs_review** (hạn ngạch, thuế theo EUR/tấn) khi chưa có dòng hạn ngạch đã duyệt |
| 0901.11 cà phê nhân | 10000 | Không có mức EVFTA trong dữ liệu (độ tin cậy C) → needs_review |
| 6109.10 áo phông | 10000 | needs_review (chưa xác định nhóm lộ trình) |
| 8517.12 (mã ngoài danh mục) | 10000 | **unsupported**, không có con số nào |

Kiểm thêm: nhập số tiền `10.000,5` hoặc `-5` phải báo lỗi; gọi quá 30 lần/phút → "quá nhiều lần".

## B5. Máy tính xuất xứ `/vi/tools/origin`

Ca kiểm của gói luật TM (kết quả kỳ vọng do PO/luật TM ghi, CHƯA ký). Duyệt quy tắc PSR tương ứng trước.

| Ca | Mã HS | Nhập | Kỳ vọng |
|---|---|---|---|
| TC01 | 0306.17 | EXW 10000; nguyên liệu Ch.3 100% VN | Đạt |
| TC02 | 0306.17 | tôm nhập Ấn Độ (IN) 100% | Không đạt |
| TC03 | 1605.21 | nguyên liệu Ecuador (EC) chiếm 60% giá EXW | Không đạt |
| TC04 | 1604.14 | chưa khai nguyên liệu | Chưa kết luận (quy tắc yêu cầu chuyên gia) |
| TC05 | 0901.11 | 100% VN | Đạt (độ tin cậy C) |
| TC06–TC08 | 0901.21, 6109.10, 6203.42 | bất kỳ | **Chưa hỗ trợ** |
| TC09–TC10 | 6403.99, 6404.11 | bất kỳ | **Chưa hỗ trợ** — loại CTH_EXCEPT chưa hỗ trợ |

EUR.1 nháp: chỉ thử được sau một ca **Đạt**. PDF phải có watermark "DRAFT — for review before submission to issuing authority" trên mọi trang và dòng "Bộ Công Thương".

## B6. Trợ lý AI `/vi/copilot`

Chưa có corpus và chưa chọn LLM thật (Q5), nên trợ lý dùng bản giả và trả `out_of_scope` cho hầu hết câu hỏi. Bộ 50 câu: `backend/evals/copilot_50.jsonl`; `uv run python -m app.modules.copilot.eval` chỉ có ý nghĩa sau khi nạp và duyệt corpus.

## B7. Pháp lý, tài khoản

- `/vi/terms`, `/vi/privacy`: bản dự thảo còn `[•]` và `[TÊN PHÁP NHÂN VẬN HÀNH]`. Chính sách đã thêm mục "ai đã xem hồ sơ" (U9).
- `/vi/account` → Xóa tài khoản (nhập mật khẩu): công ty biến khỏi danh bạ, email không đăng nhập lại được.

---

## Chạy kiểm tra tự động

```bash
cd backend && uv run ruff check . && uv run mypy app && uv run pytest -q
uv run alembic downgrade 0028 && uv run alembic upgrade head     # kiểm migration hạ / nâng cấp
cd ../frontend && npm run lint && npm run typecheck && npm test && npm run i18n:check && npm run build
```
