# evfta.eu — Trust & Anti-fraud Framework

> Bản 1.0 · 30/09/2026 · Trạng thái: **chờ duyệt** cùng các hạng mục backlog I8–I11, E5–E6, F4, B6, X9.
> Bổ sung cho `KE_HOACH_CODE_THEO_MODULE.md` (module `verification`, `directory`, `messaging`) và tuân theo `AGENTS.md` §6.

---

## 1. Mục tiêu

Buyer EU mở hồ sơ một seller Việt Nam và trả lời được ba câu trong một phút:

1. **Công ty này có thật và đúng là người đang nói chuyện với tôi không?**
2. **Họ có đủ năng lực và giấy tờ cho mặt hàng tôi cần không?**
3. **Họ đã từng giao hàng tử tế chưa, hay có dấu hiệu gì đáng lo?**

Mỗi câu trả lời phải **truy được về bằng chứng**: kiểm cái gì, đối chiếu với nguồn nào, ngày nào, ai kiểm.

## 2. Nguyên tắc

1. **Xác minh theo tuyên bố (claim), không theo cả doanh nghiệp.** Mỗi tuyên bố có nguồn kiểm, kết quả và hạn riêng.
2. **Nguồn gốc thắng tài liệu.** Người làm giả sửa được file, nhưng không sửa được cơ sở dữ liệu của cơ quan hay tổ chức cấp.
3. **Việc đã làm nặng hơn giấy tờ đang có.** Một lô hàng đã qua hải quan EU nặng hơn mười tờ chứng nhận.
4. **Trung thực về chỗ chưa kiểm được.** Ghi "không có nguồn công khai để đối chiếu" thay vì bôi xanh.
5. **Tín hiệu tự động chỉ xếp ưu tiên; con người quyết định.** Không cơ chế tự động nào được đổi trạng thái xác minh (AGENTS.md §6.9).
6. **Giám sát liên tục.** Xác minh có hạn, được kiểm lại, và bị thu hồi được.
7. **Không công khai file gốc.** Chỉ hiện các trường đã trích và kết quả kiểm. File gốc chỉ mở khi seller đồng ý, có ghi nhật ký.

## 3. Bốn trục tin cậy — thay cho một điểm số

Bốn trục độc lập, không nối tiếp nhau. Nhờ vậy seller mới vẫn đạt mức cao ở trục danh tính và năng lực.

| Trục | Trả lời câu hỏi | Mức |
|---|---|---|
| **Danh tính** | Có thật, đúng người | Chưa xác minh → Pháp nhân khớp nguồn → **Đã chứng minh quyền sở hữu** |
| **Năng lực** | Đủ giấy tờ, cơ sở có thật | Theo tỷ lệ tuyên bố bắt buộc của nhóm hàng đã kiểm chéo nguồn |
| **Lịch sử thương mại** | Đã giao hàng chưa | Nhà xuất khẩu mới → Kênh trong nước có kiểm soát chất lượng → Xuất khẩu gián tiếp → Xuất sang thị trường khó ngoài EU → **Đã xuất sang EU** |
| **Toàn vẹn** | Có dấu hiệu đáng lo không | Các dòng như: không có khiếu nại được xác nhận · thông tin ngân hàng không đổi trong 180 ngày · tuổi tên miền · lần kiểm lại gần nhất |

`verification_level = evfta_verified` (theo backlog I7/C6) tương ứng: Danh tính = đã chứng minh quyền sở hữu **và** Năng lực = đủ tuyên bố bắt buộc còn hạn.

## 4. Nguồn đối chiếu

### 4.1 Bốn loại nguồn

| Loại | Mô tả | Cách xử lý |
|---|---|---|
| **A** | Tra cứu online từng hồ sơ (MST, IAF CertSearch, CSDL GlobalG.A.P./BRCGS, tra cứu công bố sản phẩm) | Admin tra + lưu ảnh chụp kết quả; tự động hoá sau MVP nếu nguồn cho phép |
| **B** | Danh sách công bố định kỳ (vd. danh sách cơ sở thủy sản EU phê duyệt; danh sách của Sở/Chi cục ATTP) | Nhập định kỳ vào `reference_lists`; hệ thống tự so khớp |
| **C** | Không có dữ liệu công khai (HACCP, tổ chức cấp nhỏ, hợp đồng) | Email xác nhận tới địa chỉ chính thức của tổ chức cấp; hoặc yêu cầu bằng chứng mạnh hơn; hoặc ghi rõ "không có nguồn công khai" |
| **D** | Dữ liệu nền tảng tự tích luỹ | Tổ chức cấp đã xác nhận, mẫu chứng nhận thật, buyer đã giao dịch xác nhận |

### 4.2 Ma trận nguồn theo nhóm hàng

Khung dưới đây là **minh hoạ**. Nguồn cụ thể do BA soạn, luật TM duyệt (sheet "Ma trận nguồn" trong backlog). Không code nguồn nào chưa được duyệt.

| Nhóm hàng | Tuyên bố bắt buộc | Tuyên bố tăng điểm | Nguồn chính |
|---|---|---|---|
| Thủy sản | Pháp nhân; cơ sở trong danh sách EU phê duyệt | IUU/chứng nhận khai thác; BRCGS, ASC | A + B |
| Gạo | Pháp nhân; ATTP | Giống thơm NĐ 103/2020; GlobalG.A.P. | A + C |
| Cà phê, tiêu, điều | Pháp nhân; ATTP | GlobalG.A.P., hữu cơ EU, Rainforest; hồ sơ EUDR | A |
| Trái cây tươi | Pháp nhân; ATTP | GlobalG.A.P.; mã số vùng trồng, cơ sở đóng gói | A + B |
| Thực phẩm chế biến | Pháp nhân; ATTP; hồ sơ công bố sản phẩm | ISO 22000, FSSC 22000, BRCGS, HACCP | A + C |

### 4.3 Ghép dữ liệu phân mảnh về đúng doanh nghiệp

1. Khớp theo **MST**.
2. Khớp theo **mã số cơ sở / số chứng nhận**.
3. Khớp gần đúng **tên + địa chỉ**: chuẩn hoá (bỏ dấu, bỏ "CÔNG TY TNHH", "CO., LTD", "JSC"), so bằng `pg_trgm`. **Luôn cần admin xác nhận.**

## 5. Bằng chứng tăng uy tín

| Bằng chứng | Chống làm giả |
|---|---|
| Đã xuất hàng: EUR.1 đã cấp, tờ khai, vận đơn (che giá) | Chữ số kiểm tra container ISO 6346; số vận đơn tra được trên web hãng tàu; tên người gửi hàng = tên pháp nhân |
| Buyer cũ xác nhận | Buyer EU phải có VAT hợp lệ trên VIES; VYBE tự tìm liên hệ qua website chính thức, không dùng email seller đưa |
| Kiểm nghiệm theo lô | Phòng thí nghiệm ISO/IEC 17025; xác nhận số phiếu với phòng thí nghiệm; phiếu gắn số lô |
| Sẵn sàng xuất khẩu (từ công cụ của nền tảng) | Kết quả RoO = Đạt, EUR.1 nháp, đủ tuyên bố bắt buộc — dữ liệu do chính hệ thống sinh |
| Cơ sở có thật *(sau MVP)* | Chụp trong app kèm mã dùng một lần + giờ + GPS; video call do VYBE hẹn giờ |
| Giám định bên thứ ba *(sau MVP)* | Xác nhận số báo cáo với hãng giám định |

## 6. Chống chỉnh sửa tài liệu (I9)

Chỉ cho tín hiệu, không kết luận thật/giả.

| Mức | Kiểm | Ghi chú |
|---|---|---|
| Mạnh | Chữ ký số PDF hợp lệ, người ký khớp tổ chức cấp | pyHanko |
| Mạnh | QR trỏ về đúng domain chính thức, nội dung khớp | domain lấy từ `certification_bodies` |
| Trung bình | Producer/Creator lạ; sửa nối tiếp; ModDate sau ngày cấp; font lệch giữa các trường | pikepdf |
| Trung bình | Trùng perceptual hash với file của công ty khác | imagehash — bắt kiểu "đổi tên chứng nhận của người khác" |
| Trung bình | Logic ngày (cấp < hết hạn; ISO ≤ 3 năm) | quy tắc |
| Yếu — không dùng để từ chối | ELA, máy dò ảnh AI | sau MVP, nếu có |

Quy trình bổ trợ: bắt buộc PDF gốc cho chứng nhận chính; cho phép tổ chức cấp gửi thẳng cho VYBE; ô cam kết tính xác thực khi upload.

## 7. Chống gian lận

| Kiểu gian lận | Phát hiện | Xử lý / Hạng mục |
|---|---|---|
| **Mạo danh công ty thật** (MST thật, email giả) | Gọi lại số điện thoại trên hồ sơ đăng ký chính thức; email thuộc domain chính thức; domain mới đăng ký hoặc email miễn phí → cờ | I11 |
| Công ty thương mại tự nhận nhà sản xuất | Địa chỉ nhà máy trên chứng nhận ≠ địa chỉ seller | Phân loại Nhà sản xuất / Thương mại — I8 |
| Mượn chứng nhận của nhà cung ứng | Tên người giữ chứng nhận ≠ tên seller | Hiện riêng mục "Chứng nhận của nhà cung ứng" — I8 |
| Công ty vỏ | Thành lập < 1 năm nhưng khai lâu năm; vừa đổi tên/người đại diện; trạng thái thuế không hoạt động | Cờ — I11 |
| Một người nhiều tài khoản | Dùng chung điện thoại, domain, hash file, người đại diện, thiết bị | Gom cụm cho admin — I11 |
| Thổi phồng năng lực | Công suất/MOQ/giá lệch hẳn so với seller cùng mã HS | Cờ để admin hỏi lại — sau MVP |
| **Lừa thanh toán** | Số tài khoản hoặc câu yêu cầu chuyển tiền trong chat; thông tin ngân hàng vừa đổi | Cảnh báo cho buyer; thư xác nhận ngân hàng làm bằng chứng — F4 |
| Mẫu tốt, hàng kém | Đánh giá sau giao dịch; khiếu nại được xác nhận | Hạ mức, hiện công khai sau khi seller được phản hồi — sau MVP |
| Chứng nhận bị thu hồi sau khi duyệt | Kiểm lại định kỳ nguồn A/B; kiểm tra ngẫu nhiên vài % hồ sơ mỗi tháng | I7 + I10 |
| Tái đăng ký sau khi bị phát hiện | Danh sách chặn: MST, domain, điện thoại, hash file | I11 |

Khi xác nhận gian lận: thu hồi xác minh, giữ nhật ký, đưa định danh vào danh sách chặn, báo cho các buyer đã liên hệ.

## 8. Trường hợp đặc biệt

### 8.1 Seller chưa từng xuất khẩu (E6)
- Nhãn trung thực **"Nhà xuất khẩu mới"** — không phải điểm trừ.
- Dồn bằng chứng vào trục Danh tính và Năng lực, cộng "sẵn sàng xuất khẩu" từ công cụ của nền tảng và kiểm nghiệm theo lô.
- Hướng dẫn buyer giảm rủi ro: đơn thử nhỏ (lô ≤ 6.000 EUR được tự chứng nhận xuất xứ), giám định trước xếp hàng, phương thức thanh toán an toàn. VYBE không xử lý thanh toán.

### 8.2 Người Việt, công ty ở nước ngoài
| Kiểu | Xử lý | Phạm vi |
|---|---|---|
| (a) Công ty VN, chủ hoặc người liên hệ ở nước ngoài | Như seller VN; số/IP nước ngoài **không** tự động là cờ | MVP |
| (b) Công ty đăng ký tại EU phân phối hàng Việt | Xác minh qua sổ đăng ký nước đó + VIES + EORI; chỉ gắn tên nhà máy khi **nhà sản xuất VN đã xác minh bấm xác nhận** liên kết | MVP, P1 — B6 |
| (c) Công ty ở nước thứ ba ngoài EU | Rủi ro mất ưu đãi EVFTA khi hàng đi vòng; cần luật TM làm rõ | Sau MVP — X9 |

## 9. Buyer thấy gì

- Đầu hồ sơ: **bốn trục** với mức hiện tại.
- Bấm vào trục: danh sách tuyên bố — kết quả, nguồn, ngày kiểm, vai trò người duyệt, link tra cứu chính thức.
- Ba nhãn độ mạnh cho mỗi tuyên bố: **Đã xác nhận với nơi cấp** · **Tài liệu điện tử chưa bị sửa** · **Đã xem tài liệu, chưa xác nhận nguồn**. Tuyên bố còn cờ chưa xử lý thì không hiện.
- Mục Toàn vẹn và cảnh báo thanh toán.
- Câu miễn trừ: xác minh là mức đối chiếu bằng chứng, không phải bảo lãnh pháp lý (E4).

## 10. Mô hình dữ liệu bổ sung

| Bảng | Hạng mục | Ghi chú |
|---|---|---|
| `certification_bodies` | I8 | Dữ liệu cấu hình có người duyệt |
| `evidence_checks` | I8 | Append-only; mọi lần đối chiếu |
| `claim_types`, `category_claim_rules` | I10 | Nhóm hàng → tuyên bố bắt buộc / tăng điểm |
| `sources`, `reference_lists`, `reference_list_entries` | I10 | Nguồn A/B/C/D; danh sách nhập có phiên bản |
| `identity_signals`, `account_clusters`, `blocklist_identifiers` | I11 | Chống mạo danh, gom cụm, danh sách chặn |
| `trade_records` + `companies.trade_history_level` | E6 | Bằng chứng giao hàng, xác nhận của buyer cũ |
| `document_access_requests` | E5 | Buyer xin xem file gốc |
| `payment_detail_changes` | F4 | Lịch sử đổi thông tin ngân hàng |
| `company_relationships` | B6 | Nhà sản xuất VN ↔ đại diện tại EU |

## 11. Ánh xạ backlog (chờ duyệt)

| ID | Hạng mục | Ưu tiên | Giai đoạn | Dev | Luật TM |
|---|---|---|---|---|---|
| I11 | Chống mạo danh và gian lận danh tính | P0 | GĐ2 | 3 | 0 |
| I8 | Kiểm chéo bằng chứng với nguồn cấp | P0 | GĐ3 | 3 | 0.5 |
| I10 | Ma trận nguồn + danh sách tham chiếu | P0 | GĐ3 | 2.5 | 0.5 |
| I9 | Tín hiệu chỉnh sửa file | P1 | GĐ4 | 3 | 0 |
| E6 | Lịch sử thương mại + nhà xuất khẩu mới | P0 | GĐ4 | 3.5 | 0 |
| E5 | Trust Profile bốn trục | P0 | GĐ5 | 2.5 | 0 |
| F4 | Cảnh báo lừa thanh toán | P0 | GĐ6 | 1.5 | 0 |
| B6 | Nhà phân phối tại EU liên kết nhà sản xuất VN | P1 | GĐ6 | 3 | 0 |
| X9 | Các mục để sau MVP | — | Sau MVP | 0 | 0 |

## 12. Cần xác nhận

- **Luật TM:** ma trận nguồn (§4.2); quy tắc vận chuyển và hoá đơn nước thứ ba (§8.2c).
- **Luật sư:** Điều khoản cho việc quét nội dung chat tìm thông tin thanh toán; quy trình công khai khiếu nại.
- **PO:** duyệt 4 dependency của I9 (pyHanko, pikepdf, imagehash, thư viện QR); mở rộng phạm vi cho kiểu (b).
