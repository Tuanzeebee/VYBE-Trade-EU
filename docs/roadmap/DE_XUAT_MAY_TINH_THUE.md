# Đề xuất nâng cấp công cụ tính thuế: từ "tra thuế suất" thành "tính thuế cho lô hàng"

Trạng thái: **đề xuất để chủ dự án duyệt** (chưa có code). Ngày soạn: 02/10/2026.
Phạm vi: máy tính thuế (C2) và liên quan tới máy tính xuất xứ (C4), danh sách bằng chứng (C6).
Quy tắc không đổi: mọi con số chỉ đến từ dữ liệu pháp lý trong DB (AGENTS.md §6.1); thiếu căn cứ thì `needs_review`, không đoán; tiền và tỷ lệ dùng `Decimal`; mọi lần tính ghi `compliance_checks`.

---

## 1. Vấn đề

Máy tính hiện nay nhận một trị giá lô, một nước đến, một hiệp định, rồi nhân trị giá với thuế suất MFN và thuế suất ưu đãi để ra khoản tiết kiệm. Đó là **tra cứu có nhân**, chưa phải tính thuế. Doanh nghiệp xuất khẩu cần biết *lô hàng này sẽ phải nộp bao nhiêu thuế, nếu dùng FTA thì tiết kiệm bao nhiêu, dùng FTA nào là tốt nhất, có hạn ngạch thì có đáng chờ không*.

Các khoảng trống so với thực tế (đối chiếu với code ở `compliance/calculators.py`, `service.py`):

| # | Khoảng trống | Hệ quả |
|---|---|---|
| 1 | Trị giá nhập vào được coi là trị giá tính thuế | Nhiều nước (EU, UK, Nhật…) tính thuế trên giá CIF tại cửa khẩu nhập. Doanh nghiệp khai giá FOB sẽ bị tính thiếu |
| 2 | Không có tiền tệ, tỷ giá, ngày nhập khẩu | Số liệu lệch; thuế EVFTA giảm theo năm nhưng ngày áp dụng không do người dùng chọn |
| 3 | Không có khối lượng tịnh, cả bì, đơn vị | Không tính được thuế tuyệt đối (€/100 kg…) |
| 4 | Thuế tuyệt đối chỉ tính trong kịch bản hạn ngạch; thuế hỗn hợp luôn `needs_review` (AGENTS.md §6.4) | Nhiều dòng thuế nông sản, thủy sản không ra số |
| 5 | Mỗi lần so một hiệp định với MFN | Chưa trả lời được "nên dùng FTA nào" |
| 6 | Chưa có số dư hạn ngạch, chưa theo dõi khối lượng đã dùng của công ty | Không biết hạn ngạch còn hay hết |
| 7 | Không có chi phí khác (VAT, thuế khác, phí) | Người mua không thấy chi phí về đến kho |

---

## 2. Mô hình tính theo tầng

### Tầng 1. Trị giá tính thuế

Mặc định là CIF tại cửa khẩu nhập: `CIF = giá hóa đơn + cước quốc tế + bảo hiểm (+ chi phí liên quan theo Incoterm)`.

| Incoterm khai báo | Cách xử lý |
|---|---|
| CIF, CIP | Giá hóa đơn đã là CIF, không cộng thêm |
| FOB, FCA, FAS, EXW | Cộng cước quốc tế và bảo hiểm (và chi phí chuyển đến điểm giao tương ứng) |
| CFR, CPT | Cộng bảo hiểm |
| DAP, DPU, DDP | Trừ phần chi phí sau cửa khẩu nhập; DDP phải trừ ngược thuế đã gồm trong giá |

Trường: Incoterm, giá hóa đơn, tiền tệ, tỷ giá, cước, bảo hiểm. Cước và bảo hiểm do người dùng nhập; nếu bỏ trống thì hiện rõ "đang dùng ước tính" và cho sửa.
Tỷ giá tính thuế phải theo quy định của nước nhập (EU công bố tỷ giá hải quan hằng tháng). Phiên bản đầu cho nhập tay hoặc lấy tham chiếu và ghi nhãn "ước tính".

### Tầng 2. Cơ sở tính

| Cơ sở | Dùng khi |
|---|---|
| Trị giá (CIF) | Thuế theo % trị giá |
| Khối lượng tịnh (kg, 100 kg, tấn) | Thuế tuyệt đối theo khối lượng |
| Số đơn vị (cái, lít, hl, cặp) | Thuế tuyệt đối theo đơn vị |

Trường: khối lượng tịnh, khối lượng cả bì, số lượng và đơn vị. Chuyển đổi đơn vị (kg, 100 kg, tấn) bằng hàm thuần có test.

### Tầng 3. Loại thuế và công thức

| Loại | Công thức | Ghi chú |
|---|---|---|
| Theo % trị giá | `thuế = CIF × tỷ lệ` | Đã có |
| Tuyệt đối | `thuế = khối lượng/đơn vị × mức tuyệt đối` | Cần khối lượng đúng đơn vị của dòng thuế |
| Hỗn hợp | `thuế = CIF × % + khối lượng × mức tuyệt đối`, có thể có mức **tối thiểu / tối đa** | Cần đủ thành phần; thiếu thì `needs_review` |
| Hệ thống giá nhập khẩu tối thiểu (rau quả của EU) | Thuế phụ thuộc giá nhập khẩu khai báo so với giá tham chiếu | Phức tạp: giai đoạn đầu `needs_review` có giải thích |
| Thành phần nông sản (đường, sữa…) | Cộng theo hàm lượng | Cần trường hàm lượng; giai đoạn sau |
| Phòng vệ thương mại (chống bán phá giá, chống trợ cấp, tự vệ) | Cộng thêm theo văn bản có hiệu lực theo ngày | Dữ liệu theo thời điểm, cần nguồn riêng |

Làm tròn: `ROUND_HALF_UP`, tiền 2 chữ số thập phân, tỷ lệ 4 chữ số thập phân (đã áp dụng).

### Tầng 4. Ưu đãi FTA

Thuế ưu đãi áp dụng khi **đủ cả bốn điều kiện**:
1. Thuế suất ưu đãi tại **ngày nhập** (lộ trình cắt giảm theo năm: `thuế cơ sở × (số bậc − số bậc đã qua) / số bậc`, đã có hàm `evfta_rate`).
2. Hàng **đạt xuất xứ** theo quy tắc của hiệp định (kết nối với máy tính xuất xứ; chưa đạt hoặc chưa kết luận thì ưu đãi là "có điều kiện").
3. Có **chứng từ xuất xứ đúng mẫu** của hiệp định.
4. Vận chuyển trực tiếp hoặc quá cảnh đủ điều kiện, cộng gộp nếu có.

Không đủ điều kiện thì kết quả cuối là MFN, kèm lý do. Khoản tiết kiệm luôn là `thuế MFN − thuế ưu đãi` trên **cùng** trị giá tính thuế và khối lượng.

### Tầng 5. Hạn ngạch (TRQ)

Cần mô hình hóa đủ bốn phần:

1. **Định nghĩa:** số hiệu, khối lượng, đơn vị, chu kỳ (năm hoặc đợt), thuế trong hạn ngạch, thuế ngoài hạn ngạch, danh sách phân nhóm đủ điều kiện (đã có `tariff_quotas`, `product_subtypes`).
2. **Cơ chế phân bổ:** do cơ quan nước xuất khẩu hay nước nhập khẩu cấp; giấy phép hoặc chứng nhận cần có; xét theo thứ tự nộp hồ sơ hay phân bổ theo hạn mức. Kết quả luôn kèm điều kiện, không bao giờ trình bày như 0% vô điều kiện.
3. **Số dư còn lại:** dữ liệu bên ngoài, cập nhật theo ngày. Chưa có nguồn thì hiển thị "chưa biết số dư", không đoán.
4. **Kịch bản kinh tế:** hai con số (có hạn ngạch / không có), chênh lệch chính là *giá trị của việc có hạn ngạch*, và **điểm hòa vốn** trên khối lượng hoặc giá. Kèm khối lượng đã dùng trong kỳ của chính công ty.

### Tầng 6. Chi phí khác (tuỳ chọn)

VAT nhập khẩu (đã có trong `import_country_terms`), thuế tiêu thụ đặc biệt, phí hải quan và thuế bổ sung theo thời điểm (ví dụ các biện pháp thuế bổ sung của một số nước). Hiển thị riêng để người mua thấy chi phí về đến kho; VAT phân biệt rõ với thuế nhập khẩu vì thường được khấu trừ.

---

## 3. Nhiều FTA: so sánh theo nước đến

Máy tính không nên "chọn một FTA" mà **so sánh các lựa chọn khả thi** của một nước đến.

Mỗi dòng so sánh:

| Cột | Nội dung |
|---|---|
| Hiệp định | Mã, tên (từ bảng `trade_agreements`) |
| Thuế MFN, thuế FTA tại ngày nhập | Từ dòng thuế theo (mã HS, nước, hiệp định) |
| Đủ điều kiện xuất xứ | Đạt / Không đạt / Chưa kết luận (theo máy tính xuất xứ) |
| Chứng từ cần có | Tên mẫu (EUR.1, Form D, Form E, AK, AJ, VJ… tuỳ hiệp định), tự chứng nhận nếu hiệp định cho phép |
| Hạn ngạch | Có/không, trạng thái |
| Tiết kiệm | Trên lô này |
| Khuyến nghị | Lựa chọn thấp nhất trong các hiệp định **đủ điều kiện**, giải thích vì sao |

Mỗi hiệp định khác nhau ở: quy tắc xuất xứ theo mặt hàng, mẫu chứng từ, lộ trình thuế, cộng gộp, quy định vận chuyển trực tiếp. Vì vậy dữ liệu phải nạp **theo cặp (mã HS, nước, hiệp định)** như thiết kế U12 hiện có, không dùng công thức chung.

### Danh sách FTA (nháp, cần xác nhận)

Số lượng 17 FTA do chủ dự án nêu; danh sách đầy đủ cần đối chiếu với Bộ Công Thương trước khi nạp. Các hiệp định tôi chắc chắn thuộc nhóm FTA của Việt Nam:
- Khối ASEAN và ASEAN+: ATIGA, ACFTA (Trung Quốc), AKFTA (Hàn Quốc), AIFTA (Ấn Độ), AJCEP (Nhật Bản), AANZFTA (Úc, New Zealand), AHKFTA (Hồng Kông).
- Song phương: VJEPA (Nhật Bản), VKFTA (Hàn Quốc), VCFTA (Chile), Việt Nam – EAEU, EVFTA (EU), UKVFTA (Anh), VIFTA (Israel).
- Đa phương: CPTPP, RCEP.

---

## 4. Trường dữ liệu

### 4.1 Người dùng nhập

| Nhóm | Trường |
|---|---|
| Chung | Mã HS (8 số trở lên), nước đến, ngày nhập hoặc ngày giao dự kiến (mặc định hôm nay) |
| Trị giá | Giá hóa đơn, tiền tệ, tỷ giá, Incoterm, cước quốc tế, bảo hiểm |
| Khối lượng | Khối lượng tịnh, cả bì, số lượng và đơn vị |
| Đặc tính hàng | Trạng thái (tươi/đông lạnh), hàm lượng đường hoặc sữa, độ cồn… khi dòng thuế phụ thuộc |
| Hạn ngạch | Phân nhóm hàng, đã được cấp phép/phân bổ chưa, khối lượng đã xuất trong kỳ, ngày giao so với chu kỳ |
| FTA | Hiệp định (hoặc "so sánh tất cả"), loại chứng từ có thể cấp, vận chuyển trực tiếp hay quá cảnh, có dùng cộng gộp không |
| Kế hoạch | Số lô mỗi năm |

### 4.2 Dữ liệu pháp lý do luật TM nhập và duyệt

| Bảng | Bổ sung cần có |
|---|---|
| Dòng thuế (đã có) | Thành phần thuế: % trị giá, mức tuyệt đối, đơn vị, tiền tệ, min/max, cờ giá nhập khẩu tối thiểu, hiệu lực theo ngày |
| Lộ trình cắt giảm (đã có `staging_categories`) | Bổ sung cho các hiệp định khác |
| Hạn ngạch (đã có `tariff_quotas`) | Chu kỳ, đợt, số hiệu, cơ quan cấp, giấy phép cần có, phương thức phân bổ |
| Hiệp định (đã có `trade_agreements`) | Mẫu chứng từ, yêu cầu vận chuyển trực tiếp, quy định cộng gộp |
| Thuế phòng vệ | Biện pháp, mức, đối tượng, hiệu lực theo ngày |
| Số dư hạn ngạch | Bảng cập nhật theo ngày từ nguồn ngoài qua interface (AGENTS.md §5.5) |

---

## 5. Giá trị cho người dùng

Từ "tra thuế suất" thành "tôi báo giá và chọn thị trường thế nào":
- **Người xuất khẩu:** biết thuế của lô, khoản tiết kiệm nhờ FTA, nên dùng hiệp định nào, hạn ngạch có đáng chờ không, chuẩn bị những giấy tờ gì (liên thông máy tính xuất xứ và danh sách bằng chứng đã có).
- **Người mua:** chi phí về đến kho để so sánh nhà cung cấp.
- **Tư vấn hải quan và logistics:** bảng phân rã từng bước để đối chiếu, bản kê xuất PDF.

Thước đo: tỷ lệ người dùng tính xong một lô; tổng khoản tiết kiệm đã hiển thị; số người chuyển từ máy tính thuế sang kiểm tra xuất xứ rồi tải bản nháp EUR.1; tỷ lệ quay lại.

---

## 6. Phương án thực thi

| Giai đoạn | Nội dung | Kết quả | Phụ thuộc |
|---|---|---|---|
| **A. Tính đúng cơ bản** (~1 tuần) | Trị giá CIF theo Incoterm, tiền tệ và tỷ giá, khối lượng và đơn vị, ngày nhập; bảng phân rã từng bước | Con số đúng cho thuế theo % trị giá, kèm giải trình | Chỉ code. Chốt quy ước tỷ giá |
| **C. Bộ máy hạn ngạch** (~2–3 tuần) | Hai kịch bản, điểm hòa vốn, theo dõi khối lượng đã dùng của công ty, cảnh báo cần giấy phép | Gạo và nhóm hàng đã có dữ liệu hạn ngạch | Dữ liệu hạn ngạch đã duyệt; số dư theo ngày làm sau |
| **B. Thuế tuyệt đối và hỗn hợp** (~2 tuần) | Bảng thành phần thuế, công thức min/max | Mã có thuế €/100 kg, hỗn hợp | Cập nhật AGENTS.md §6.4 (xem mục 7, quyết định 2) |
| **D. So sánh nhiều FTA** (~3–4 tuần) | Bảng so sánh theo nước đến, nối với kết quả xuất xứ | Hiệp định tốt nhất, giải thích | Nạp dữ liệu theo đợt (mục 7, quyết định 1) |
| **E. Chi phí về kho và báo cáo** | VAT, thuế khác, PDF, lưu phương án, cảnh báo thay đổi | Bản kê gửi khách, báo khi thuế đổi | Nguồn dữ liệu thay đổi theo thời điểm |

Thứ tự đề xuất: **A → C → B → D → E**. A đem lại giá trị ngay mà không cần dữ liệu mới. C chạy trên dữ liệu hạn ngạch gạo đã có. B chờ luật TM nên đặt sau. D cần nhiều dữ liệu nhất nên đặt sau cùng trước E.

### Tiêu chí nghiệm thu mỗi giai đoạn
- Golden test dạng bảng (`@pytest.mark.parametrize`) theo ca do luật TM soạn: lô FOB so với CIF, thuế tuyệt đối, hỗn hợp có min/max, trong và ngoài hạn ngạch, ngày trước và sau mốc cắt giảm.
- Mỗi kết quả có phân rã đối chiếu từng dòng với biểu thuế gốc.
- Mỗi lần chạy ghi đúng một `compliance_checks`; test 401/403 cho router mới.
- Dùng được ở 390px; chuỗi đủ vi/en.

---

## 7. Quyết định đề xuất

Mỗi quyết định có lựa chọn **mặc định** để chủ dự án chỉ cần xác nhận hoặc sửa.

### Quyết định 1. Danh sách FTA và thứ tự nạp dữ liệu

**Đề xuất:** nạp theo đợt, mỗi đợt sâu trước rộng sau.
- **Đợt 1:** EVFTA và UKVFTA, đầy đủ cả 20 mã, vì sản phẩm là evfta.eu và dữ liệu EU đã có.
- **Đợt 2:** CPTPP và RCEP cho 20 mã đó, để chứng minh thiết kế so sánh nhiều FTA.
- **Đợt 3:** các FTA còn lại, theo **nhu cầu thật** của người dùng (thị trường xuất khẩu họ khai ở onboarding) và theo khả năng lấy dữ liệu chính thức.

Lý do: nạp đủ 17 FTA cho mọi mã cùng lúc vượt xa khả năng duyệt của luật TM và dễ làm dữ liệu sai. Làm sâu từng đợt để mỗi con số đều có người duyệt.

### Quyết định 2. Thuế tuyệt đối và hỗn hợp

**Đề xuất:** tính, kèm điều kiện, theo đúng nguyên tắc đã chốt ("hiển thị dữ liệu chưa duyệt kèm lưu ý").
- Chỉ tính khi dòng thuế **đủ thành phần** (mức, đơn vị, tiền tệ, min/max) và người dùng nhập đúng cơ sở (khối lượng tịnh hoặc số đơn vị). Thiếu một thành phần thì `needs_review`, không số.
- Hệ thống giá nhập khẩu tối thiểu của rau quả: **giữ `needs_review`** ở giai đoạn đầu, kèm giải thích; tính sau khi luật TM duyệt cách xử lý.
- Cập nhật AGENTS.md §6.4: bỏ "thuế hỗn hợp vẫn `needs_review`", thay bằng "chỉ `needs_review` khi thiếu thành phần hoặc thuộc nhóm đặc biệt". Chủ dự án tự sửa tài liệu này.
- Bật theo cờ cấu hình để tắt nhanh nếu luật TM phản đối.

### Quyết định 3. Nguồn dữ liệu thuế và hạn ngạch

**Đề xuất:** quy trình một chiều, có người duyệt ở giữa.

```
Nguồn chính thức → job nạp (staging, chưa duyệt) → luật sư duyệt (import-review) → công bố
```

| Nhóm dữ liệu | Nguồn gợi ý | Tần suất |
|---|---|---|
| Thuế EU và UK | Cơ sở dữ liệu thuế chính thức của EU (TARIC) và Access2Markets; Trade Tariff của UK (có API công khai) | Theo thay đổi, kiểm tra hằng tuần |
| Thuế FTA khác | Phụ lục biểu thuế của từng hiệp định (Bộ Công Thương, WTO/ITC Market Access Map) | Theo mốc cắt giảm hằng năm |
| Hạn ngạch và số dư | Cổng tra cứu hạn ngạch của cơ quan hải quan nước nhập (EU có tra cứu số dư theo số hiệu) | Hằng ngày nếu có API; nếu không thì ghi rõ "chưa có số dư" |
| Thuế phòng vệ | Văn bản chính thức theo ngày hiệu lực | Theo công báo |

Vai trò: kỹ sư viết job nạp và interface nguồn ngoài (không gọi thẳng từ request người dùng, theo AGENTS.md §5.5); luật sư thương mại duyệt qua `import-review` (đã có); PO sở hữu lịch cập nhật. Cần kiểm tra khả năng truy xuất tự động của từng nguồn trước khi cam kết tiến độ.

### Quyết định 4. Tỷ giá

**Đề xuất:** hai bước.
- **Phiên bản đầu:** người dùng chọn tiền tệ và nhập tỷ giá; hệ thống đề xuất giá trị tham chiếu (ví dụ tỷ giá tham chiếu hằng ngày của ECB) và ghi nhãn "ước tính, tỷ giá hải quan có thể khác".
- **Phiên bản sau:** thêm interface `ExchangeRateSource`, nạp tỷ giá hải quan theo nước nhập (EU công bố tỷ giá hải quan hằng tháng), có bản fake cho test.

Lý do: tỷ giá hải quan thay đổi theo kỳ và theo nước; lấy sai còn nguy hiểm hơn để người dùng tự nhập. Mọi con số quy đổi phải hiện rõ tỷ giá đã dùng.

### Quyết định 5. Làm giai đoạn nào trước

**Đề xuất:** A trước (khoảng 1 tuần), rồi C trên dữ liệu gạo (hạn ngạch và ca ST25 đã có trong dữ liệu minh họa), sau đó B khi luật TM đã trả lời, rồi D theo từng đợt FTA.

Nếu sắp demo: A là đủ để thấy rõ khác biệt (chọn Incoterm và cước, thấy bảng phân rã tính ra thuế thật).

---

## 8. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Nguồn dữ liệu 17 FTA lớn, khó cập nhật | Nạp theo đợt; mỗi đợt có người duyệt; lịch cập nhật do PO sở hữu |
| Sai mã phân loại HS dẫn đến sai thuế | Giữ cảnh báo khi mã 6 số có nhiều mã con khác thuế; gợi ý mã từ tên sản phẩm |
| Số dư hạn ngạch không có thời gian thực | Hiển thị đúng trạng thái "chưa biết"; không đoán |
| Tỷ giá hải quan thay đổi theo kỳ | Hiện tỷ giá đã dùng; cho sửa; nhãn "ước tính" |
| Người dùng hiểu kết quả là cam kết | Dòng lưu ý chưa duyệt, ghi nhãn "tham khảo", cơ quan cấp chứng nhận xuất xứ chính thức là Bộ Công Thương |
| Thay đổi chính sách thuế đột ngột (thuế bổ sung theo thời điểm) | Tách tầng riêng, có hiệu lực theo ngày, cảnh báo khi dữ liệu quá cũ |

---

## 9. Việc kế tiếp nếu duyệt

1. Chủ dự án xác nhận 5 quyết định ở mục 7 (hoặc sửa mặc định).
2. Chủ dự án cập nhật AGENTS.md §6.4 nếu chọn tính thuế hỗn hợp.
3. Luật TM soạn bảng ca chuẩn cho giai đoạn A (và C): ít nhất lô FOB và CIF, một dòng thuế tuyệt đối, một dòng hạn ngạch.
4. Bắt đầu giai đoạn A: trình kế hoạch ngắn (bảng, API, file, test), chờ đồng ý, rồi mới code.
