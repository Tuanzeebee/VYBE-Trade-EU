# Nghiên cứu trọng số uy tín Exporter và Buyer — tóm tắt và lộ trình

- **Trạng thái:** lộ trình sau MVP (giai đoạn seed). Chưa quyết định xây điểm uy tín. Các phần đã đưa vào P0 được nêu ở mục 2.
- **Nguồn:** nghiên cứu do PO cung cấp ngày 29/09/2026 (hai bảng trọng số và ba "bẫy rủi ro").
- **Người đọc:** PO, luật sư thương mại (luật TM), đội kỹ thuật.
- **Liên quan:** backlog C6, X4, B3; `KE_HOACH_CODE_THEO_MODULE.md` mục M6; AGENTS.md §6.9–6.10 và §10.

---

## 1. Nghiên cứu nói gì

### 1.1 Khung đánh giá Exporter Việt Nam (góc nhìn buyer EU)

| Nhóm | Trọng số | Tiêu chí chi tiết (trọng số) | Cách kiểm chứng đề xuất |
|---|---|---|---|
| 1. Tuân thủ xanh và bền vững | 30% | Quy định chống phá rừng EUDR (nếu là gỗ, cà phê, cao su) hoặc báo cáo phát thải CBAM (sắt thép, xi măng, nhôm…) 12%; trách nhiệm xã hội BSCI, WRAP, SMETA 10%; kinh tế tuần hoàn (năng lượng tái tạo, bao bì tái chế) 8% | Tọa độ vùng trồng (geolocation) với nông sản; audit an sinh xã hội độc lập |
| 2. Chứng nhận chất lượng và an toàn | 25% | CE marking hoặc kết quả kiểm nghiệm lab (Eurofins, SGS) 15%; hệ thống quản lý ISO 9001, ISO 14001, HACCP, BRC, IFS 10% | Dữ liệu từ lab đạt chuẩn quốc tế; đối chiếu số hiệu chứng chỉ trên cơ sở dữ liệu của tổ chức cấp |
| 3. Năng lực sản xuất và logistics | 20% | OTIF và lead-time 10%; quy mô và công nghệ nhà máy 10% | Lịch sử hãng tàu; báo cáo đánh giá kỹ thuật nhà máy |
| 4. Minh bạch và sức khỏe tài chính | 15% | Truy xuất nguồn gốc 8%; sức khỏe tài chính 7% | Giấy chứng nhận xuất xứ EUR.1; báo cáo kiểm toán độc lập |
| 5. Phối hợp và chuyển đổi số | 10% | Tích hợp ERP/EDI, tốc độ phản hồi tiếng Anh, tác phong làm việc 10% | Họp trực tuyến; độ chuẩn hóa của tài liệu kỹ thuật |

### 1.2 Khung đánh giá Buyer EU (góc nhìn exporter)

| Nhóm | Trọng số | Tiêu chí chi tiết (trọng số) | Cách kiểm chứng đề xuất |
|---|---|---|---|
| 1. Uy tín thanh toán và tài chính | 35% | Lịch sử thanh toán đúng hạn 15%; phương thức thanh toán an toàn (L/C, T/T đặt cọc cao, bảo hiểm tín dụng) 15%; xếp hạng tín dụng 5% | Ngân hàng trung gian; báo cáo D&B; bảo hiểm tín dụng (Coface, Euler Hermes) |
| 2. Cam kết sản lượng và lộ trình đơn hàng | 25% | Quy mô đơn hàng ổn định, có dự báo 10%; tần suất đặt hàng đều 10%; hợp đồng khung dài hạn 5% | Lịch sử mua hàng; hệ thống phân phối của buyer |
| 3. Hợp lý trong điều khoản hợp đồng | 15% | Điều khoản phạt công bằng 5%; thời hạn thanh toán hợp lý (Net 30/60 thay vì 90/120) 5%; chia sẻ chi phí chứng chỉ và mẫu 5% | Đàm phán hợp đồng thử nghiệm |
| 4. Đồng hành chuyển đổi xanh | 15% | Hỗ trợ chi phí, kỹ thuật hoặc bao tiêu khi exporter đầu tư đạt chuẩn EU 10%; tiêu chí đánh giá rõ ràng 5% | Tuyên bố phát triển bền vững; lịch sử hợp tác với nhà cung ứng cũ |
| 5. Chuyên nghiệp và văn hóa làm việc | 10% | Quy trình nghiệm thu minh bạch 4%; tốc độ phản hồi mẫu 3%; tôn trọng văn hóa và luật pháp bản địa 3% | Làm việc trực tiếp; thời gian phản hồi email |

Cả hai khung cộng đúng 100%, chi tiết khớp từng nhóm.

### 1.3 Ba "bẫy rủi ro" nghiên cứu nêu

1. **Chứng từ xuất xứ (EUR.1, quy tắc xuất xứ):** exporter nhập nguyên liệu từ nước thứ 3 rồi gia công đơn giản, buyer có thể bị truy thu thuế. Đề xuất hạ điểm mạnh nếu không chứng minh được chuỗi cung ứng nguyên liệu.
2. **Cam kết EUDR "ảo":** doanh nghiệp nhỏ chưa có định vị GPS cho từng hộ trồng. Đề xuất coi EUDR là "điểm liệt" (không đạt thì loại ngay).
3. **Lao động và an toàn nhà xưởng:** buyer EU rất nhạy cảm. Đề xuất tăng điểm phạt nếu không có chứng chỉ an sinh xã hội còn hiệu lực.

---

## 2. Phần đã đưa vào P0 (cập nhật 29/09/2026)

| Nội dung nghiên cứu | Đã đưa vào đâu |
|---|---|
| Chứng chỉ hệ thống quản lý (ISO 9001/14001, HACCP, BRCGS, IFS), trách nhiệm xã hội (BSCI, WRAP, SMETA), CE marking, kết quả kiểm nghiệm lab | **Backlog C6**: loại bằng chứng có cấu trúc, thêm `certificate_number` và `issuer` để đối chiếu với tổ chức cấp. Danh sách loại và nhóm hàng bắt buộc do luật TM duyệt (`required_evidence_rules` là dữ liệu). Cũng cập nhật `KE_HOACH_CODE_THEO_MODULE.md` M6 và plan thực thi Task 19 |
| EUDR | **Backlog C6 và X4**: nếu luật TM yêu cầu, checklist của mã cà phê (0901.11, 0901.21) **nhắc** nộp hồ sơ EUDR. Chỉ nhắc, không loại tự động, không làm công cụ EUDR |
| Truy xuất nguồn gốc, chứng từ xuất xứ | Đã có: máy tính quy tắc xuất xứ (C4) và bản nháp EUR.1 (C5) |
| Mức đầy đủ của hồ sơ theo chứng chỉ | **B3**: dòng `evidence` (15 điểm) đang tắt, bật ở C6; đếm bằng chứng đã nộp và còn hạn; thêm job nền hằng ngày tính lại điểm vì bằng chứng hết hạn không phát sự kiện |

## 3. Phần thuộc lộ trình (chưa làm)

| Tiêu chí | Vì sao chưa làm | Điều kiện để làm |
|---|---|---|
| OTIF, lead-time, xếp hạng hãng tàu | Cần dữ liệu vận chuyển thực; logistics thuộc P2 | Có luồng đơn hàng và dữ liệu giao hàng |
| Quy mô, công nghệ nhà máy; audit kỹ thuật | Không có nguồn kiểm chứng trong MVP | Nhận báo cáo audit của bên thứ ba như một loại bằng chứng; nếu tự khai thì gắn nhãn "tự khai" |
| Sức khỏe tài chính | Cần báo cáo tài chính hoặc D&B (nguồn ngoài) | Hợp đồng nguồn dữ liệu và duyệt pháp lý |
| Tích hợp ERP/EDI | Khó đo từ nền tảng | Khảo sát hoặc tích hợp kỹ thuật ở giai đoạn sau |
| Tốc độ phản hồi | Đo được từ thời gian tin nhắn (F2, F3) | Có dữ liệu nhắn tin thật ở pilot |
| Kinh tế tuần hoàn (năng lượng tái tạo, bao bì) | Chỉ tự khai, khó kiểm chứng | Chứng nhận hoặc audit riêng |
| Toàn bộ khung buyer (thanh toán, D&B, điều khoản, đồng hành ESG) | Cần dữ liệu giao dịch (thanh toán và escrow thuộc P2), bên thứ ba, và phản hồi của exporter | Có giao dịch thật, cơ chế đánh giá hai chiều, và pháp lý duyệt |
| Phạt điểm khi thiếu chứng chỉ an sinh xã hội; "điểm liệt" EUDR | Đụng ranh giới xác minh (xem mục 4) | Chỉ làm dưới dạng yêu cầu bằng chứng hiển thị, không tự loại |

## 4. Nguyên tắc bắt buộc trước khi xây điểm uy tín

1. **Ba khái niệm tách bạch:** mức đầy đủ của hồ sơ (B3) ≠ xác minh (`verification.decide()`) ≠ uy tín/rủi ro. Không đặt cạnh nhau trên giao diện theo cách gây hiểu lầm.
2. **Không tự loại, không tự đổi trạng thái:** "điểm liệt" chỉ là yêu cầu bằng chứng hiển thị. Chỉ admin qua `verification.decide()` mới đổi trạng thái xác minh (AGENTS.md §6.9–6.10).
3. **Chỉ chấm dựa trên dữ kiện kiểm chứng được**, ghi rõ nguồn và mức tin cậy; thông tin tự khai phải gắn nhãn.
4. **Trọng số và ngưỡng là dữ liệu** có người duyệt (luật TM), không viết cứng trong code (AGENTS.md §5.6, §6.1).
5. **Pháp lý và GDPR duyệt trước khi công bố** điểm của một công ty có tên, nhất là buyer là cá nhân kinh doanh; có quyền phản hồi và khiếu nại; mọi thay đổi ghi audit.
6. **Không xếp hạng danh bạ theo điểm** trước khi lọc `verified` (AGENTS.md §6.10).
7. **Giải thích được:** người dùng thấy lý do từng điểm, không có "hộp đen".

## 5. Câu hỏi mở cho luật TM và PO

- Phạm vi và mốc áp dụng **hiện hành** của EUDR và CBAM đối với các nhóm hàng của nền tảng.
- BSCI, WRAP, SMETA là yêu cầu pháp lý hay yêu cầu thương mại do buyer đặt ra? Áp cho nhóm hàng nào?
- Loại chứng nhận nào áp cho nhóm hàng nào (dữ liệu `required_evidence_rules`)?
- Với cà phê: có nhắc hồ sơ EUDR không, và nội dung nhắc là gì?
- Chính sách công bố điểm; có làm đánh giá hai chiều exporter ↔ buyer không?
- Nguồn dữ liệu bên thứ ba nào được dùng và điều khoản sử dụng ra sao?

## 6. Điểm nối kỹ thuật đã có trong code

- `completeness_weights` và `completeness.py` (B3): mẫu trọng số cấu hình được kèm hàm thuần, **chỉ dùng cho mức đầy đủ hồ sơ**.
- `evidences`, `required_evidence_rules` (C6, chưa làm): nguồn dữ kiện kiểm chứng cho các tiêu chí ở mục 2.
- `verification.service.decide()` (I2, chưa làm): nơi duy nhất đổi trạng thái xác minh.
- `audit_logs`: ghi mọi thay đổi nhạy cảm.

Khi tới lúc xây điểm uy tín, nên dùng bảng tiêu chí riêng (dữ liệu, có `reviewed_by`), tách khỏi `completeness_weights`. Việc thiết kế bảng này chưa được làm.
