# Kịch bản demo — bản nâng cấp sau góp ý 30/09/2026

Thời lượng: khoảng 30 phút. Chuẩn bị theo [HUONG_DAN_TEST.md](HUONG_DAN_TEST.md) mục A1: DB mới, `seed_demo_journey`, bật `DEMO_COMPLIANCE_DATA=true` và `TRUST_SCORE_PUBLIC=true`, worker đang chạy. Mở sẵn 3 cửa sổ trình duyệt (hoặc 3 hồ sơ trình duyệt) cho seller, buyer, admin. Mật khẩu chung `VybeDemo-2026!`.

Thông điệp xuyên suốt: **nguồn cung ổn định, đã xác minh, giảm rủi ro** cho buyer; **ít việc giấy tờ, biết nên bán ở đâu** cho seller.

## 1. Seller: hồ sơ thật, không còn số giả (5 phút)

1. Đăng nhập `mekong@vybe-demo.example`.
2. **Hồ sơ doanh nghiệp**: mọi con số lấy từ hồ sơ thật. Không còn 96/100 hay "L2".
3. **Sản phẩm cung cấp** → sửa "Phi lê cá tra": bậc giá theo MOQ, quy cách túi 1 kg (siêu thị) và thùng 10 kg (Horeca), OEM.
   - Chỉ ra khối **giá tham khảo EU**: hàng Việt Nam so với đối thủ, nguồn Eurostat.
   - Chỉ ra **cảnh báo thẻ vàng IUU**.
4. **Xác minh doanh nghiệp**:
   - Cấp **Nâng cao**, di chuột vào huy hiệu để thấy ai kiểm, ngày duyệt, hạn.
   - Khối **Điểm tín nhiệm**: 3 thành phần, từng tiêu chí, câu "không phải chứng nhận".
5. **Chứng nhận** → mở gợi ý AI của một giấy tờ để thấy AI chỉ gợi ý, người dùng chọn áp.

Nhấn mạnh:
- Xác minh sâu dành cho seller.
- AI không bao giờ tự duyệt.
- Điểm tín nhiệm giải thích được từng phần.

## 2. Buyer: tìm, tin, liên hệ ngay (5 phút)

1. Không đăng nhập, mở `/vi/suppliers`, tìm **"cá tra"**: Mekong nằm trong nhóm đầu, sản phẩm khớp được tô sáng.
2. Mở hồ sơ Mekong:
   - huy hiệu "Đã xác minh · Nâng cao" và điểm tín nhiệm có biểu tượng (i);
   - bản đồ, khối "Dữ liệu đã kiểm" có ghi ai kiểm và lúc nào;
   - chứng nhận còn hạn, sản phẩm có bậc giá.
3. Đăng nhập `rotterdam@vybe-demo.example` (buyer **chưa xác minh**):
   - bấm **Nhắn tin** → hội thoại mở ngay, không cần RFQ;
   - gửi một RFQ → thành công.
   Nhấn mạnh: không chặn buyer. Seller thấy nhãn "Buyer chưa xác minh" và khuyến nghị điều khoản an toàn.
4. Quay lại cửa sổ seller:
   - **Cơ hội kết nối** → RFQ của Hanse đã có báo giá được chấp nhận (cọc 30%, phần còn lại khi nhận bản sao B/L);
   - **Ai đã xem hồ sơ** → thấy Hanse.

## 3. Nhà cung cấp dịch vụ (2 phút)

1. `/vi/suppliers` → tab **Dịch vụ**: Giao nhận Sài Gòn Logistics, Đại lý Hải quan Cát Lái, Kế toán Thuế Việt Á.
2. Mở một hồ sơ: phạm vi quốc gia, loại dịch vụ, cùng một huy hiệu xác minh.

## 4. Công cụ tính thuế: gạo có hạn ngạch (5 phút)

1. `/vi/tools/tariff`, thị trường **Đức**, mã **1006.30**.
2. Chọn phân nhóm **"Gạo thơm thuộc danh sách giống"**, trả lời "Bạn đã được phân bổ hạn ngạch chưa?", nhập **100 tấn**. Kết quả là bảng kịch bản:
   - trong hạn ngạch 0%;
   - ngoài hạn ngạch 175 EUR/tấn × 100 tấn;
   - kèm điều kiện: xuất xứ đạt, chứng nhận gạo thơm theo NĐ 103/2020.
3. Đổi sang **"giống khác (vd ST25)"** → cần chuyên gia rà soát, không đưa con số. Nói rõ: ST25 chưa được xác nhận thuộc danh sách, nên hệ thống không đoán.
4. Chỉ banner **"Dữ liệu minh hoạ — chưa được chuyên gia pháp lý duyệt"**.

Nói trước với khách: bản nháp dùng tổng hạn ngạch gạo 80.000 tấn chia theo nhóm, khác ví dụ 40.000/40.000 khách nêu hôm 30/09. Luật TM sẽ đối chiếu Phụ lục 2-A trước khi dùng thật.

## 5. Go-to-market: cá tra (6 phút)

1. `/vi/tools/market-insights` → "cá tra":
   - thị trường chính: Tây Ban Nha, Đức, Hà Lan, mỗi nước có lý do bằng số;
   - thị trường tiềm năng: Áo (hàng Việt Nam mới chiếm 2%);
   - Việt Nam đứng thứ nhất trong nguồn cung ngoài EU.
2. Seller Mekong → **Báo cáo go-to-market** → tạo báo cáo "cá tra":
   - bản tóm tắt miễn phí hiện ngay;
   - các phần đối thủ, định vị giá, OEM hay thương hiệu riêng, rủi ro, bước tiếp theo bị khoá.
3. Đăng nhập `gaothom@vybe-demo.example` → báo cáo "gạo" (đã mua gói):
   - đủ các phần, bảng đối thủ;
   - **Tải PDF**.
   Nhấn mạnh: mọi con số do hệ thống điền từ thống kê, AI không được viết số.
4. Bấm **Tư vấn triển khai qua mạng lưới VBA** → gửi yêu cầu.

## 6. Mua gói bằng chuyển khoản (4 phút)

1. Seller Mekong → **Gói dịch vụ & thanh toán**: đơn "Báo cáo go-to-market đầy đủ" có hướng dẫn chuyển khoản, nội dung là mã `VYBE…`.
2. Admin (`admin@vybe-demo.example`) → tab **Thanh toán** → **Đã nhận chuyển khoản** → xác nhận.
3. Seller: nhận thông báo; mở lại báo cáo "cá tra" → đủ các phần, có PDF.

Nói rõ: giai đoạn này chỉ chuyển khoản và admin xác nhận. Thanh toán qua nền tảng, ký quỹ, stablecoin là giai đoạn 2, sau khi có khoảng 100 người dùng.

## 7. Admin: duyệt một công ty mới (3 phút)

1. Admin → **Chờ duyệt** → Cà Phê Tây Nguyên:
   - kiểm tự động: email gmail → "Cần xem thêm";
   - cờ kiểm chéo;
   - danh sách yêu cầu theo cấp.
2. Ghi kết quả kiểm tay **Cổng ĐKDN quốc gia** (có nút mở trang) → **Duyệt xác minh** → công ty lên cấp Cơ bản và xuất hiện ở danh bạ.

## Câu hỏi khách hay hỏi

| Câu hỏi | Trả lời ngắn |
|---|---|
| Số liệu thuế lấy từ đâu? | Luật TM nhập và duyệt. Dữ liệu trong demo là bản nháp minh hoạ, có banner cảnh báo. Production không bao giờ hiện dòng chưa duyệt. |
| Điểm tín nhiệm có phải xếp hạng? | Không. Đây là điểm giải thích được, không dùng để xếp thứ tự danh bạ và không quyết định việc xác minh. Production chỉ bật công khai sau khi pháp lý/GDPR duyệt. |
| AI có tự duyệt giấy tờ? | Không. AI chỉ gợi ý; admin quyết định; mọi quyết định có nhật ký. |
| Vì sao buyer không phải xác minh? | Theo thông lệ quốc tế (Alibaba, Global Sources…): xác minh sâu dành cho seller. Buyer xác minh tùy chọn để nhận nhãn và hạn mức cao hơn. |
| Giá các gói? | Hiện là giá tạm tính, chờ khách chốt. Admin sửa được ngay trên tab Thanh toán. |
