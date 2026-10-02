# Rà soát feedback demo 30/09/2026 so với code

- **Ngày rà:** 02/10/2026 · **Nhánh:** `feat/demo-feedback-upgrade`
- **Nguồn đối chiếu:** `Vybe-trade_Demo_Feedback_30-09-2026.md` (mã A–J)
- **Cách làm:** đọc code, migration (0037–0048), docs và dữ liệu seed. Bản rà đầu (02/10) chưa chạy test; bản cập nhật 05/10 có kết quả kiểm ở mục "Kết quả kiểm" cuối file. Mục chưa soi sâu ghi "chưa kiểm".

Ký hiệu: ✅ xong · 🟡 xong một phần · ❌ chưa làm · — không phải việc code.

## Tóm tắt

Cập nhật 05/10/2026 sau đợt bổ sung D5, B9, B10, J4 và các mục 🟡 nhỏ (xem từng dòng). Chỗ còn thiếu tập trung ở ba nhóm:

1. **Dữ liệu thuế chưa được luật TM duyệt** — điểm yếu nhất của demo (F1, F3, F5, F7).
2. **Phụ thuộc quyết định hoặc nguồn dữ liệu ngoài:** C3 cho Việt Nam, J4 qua email, giá và LLM thật cho báo cáo GTM.
3. **Các mục cố ý hoãn** (D3, G4, A7, dữ liệu 17 FTA).

## A. Định vị và mô hình kinh doanh

| # | Task | TT | Hiện trạng |
|---|---|---|---|
| A1 | Không giới hạn VN–EU: exporter và buyer từ bất kỳ nước nào (EU, Đài Loan, Canada, Úc…). Mâu thuẫn Spec (chỉ VN→EU). | 🟡 | Chưa kiểm sâu. Bảng thuế đã có `destination` mở, nhưng thị trường xuất khẩu của exporter vẫn chỉ nhận EU. |
| A2 | Hỗ trợ cả 17 FTA, không chỉ EVFTA. Mâu thuẫn Spec (top 50 mã HS EVFTA); chờ quyết định scope. | 🟡 | Có khung `trade_agreements` và `agreement_code`. Dữ liệu chỉ có EVFTA và vài dòng minh hoạ, không có dữ liệu thật cho 17 FTA. |
| A3 | Thêm role **Nhà cung cấp dịch vụ** (logistics, hải quan, kế toán–thuế, thủ tục), phục vụ cả hai phía, phải xác minh giấy phép hành nghề. | ✅ | Có role dịch vụ. Danh sách giấy phép theo loại dịch vụ chưa được duyệt. |
| A4 | Phân nhóm phụ: Seller = exporter / manufacturer; Buyer = importer / distributor / wholesaler / siêu thị / HORECA. | 🟡 | Chưa kiểm sâu. |
| A5 | Làm rõ hành trình trả tiền: seller trả ở bước nào (xác minh L2), buyer trả ở bước nào, bao nhiêu. Demo mô phỏng như thật. | ✅ | Bảng giá, đơn chuyển khoản, admin xác nhận, quyền dùng (U19). Giá và tài khoản nhận tiền đang là minh hoạ. |
| A6 | Giá trị cốt lõi cho buyer là ổn định nguồn cung và giảm rủi ro; dashboard buyer thể hiện điều này. | ✅ | Thông điệp "nguồn cung ổn định" có ở onboarding buyer. |
| A7 | Thanh toán qua nền tảng, bảo lãnh đơn hàng, stablecoin/crypto (giảm chi phí FX/SWIFT 2–3%). GĐ2: nghiên cứu từ giờ, triển khai khi ~100 người dùng. | ❌ | Cố ý hoãn sang giai đoạn 2 (`GD2_THANH_TOAN.md`). |
| A8 | Đổi logo theo nhận diện VYBE (2 màu chủ đạo, có thể dùng chữ V), giữ giao diện hiện tại. | ✅ | Logo chữ V hai màu (U28). |

## B. Onboarding seller

| # | Task | TT | Hiện trạng |
|---|---|---|---|
| B1 | Câu hỏi đầu bước 2: "Bạn cung cấp sản phẩm hay dịch vụ?" (phụ thuộc A3). | ✅ | Có hỏi sản phẩm hay dịch vụ. |
| B2 | Gợi ý mã HS tự động từ tên sản phẩm (gõ "cá tra" ra mã), có label. | ✅ | Có `/api/public/hs-codes` và `HsSuggestions`. |
| B3 | Bỏ giá thấp nhất/cao nhất; dùng giá theo bậc MOQ (kiểu Alibaba) hoặc giá ước tính. Nghiên cứu agent đề xuất giá theo HS + dữ liệu thị trường, tính ngưỡng chống bán phá giá (UX sửa ngay, agent P1). | 🟡 | Có bậc giá MOQ và giá tham khảo EU (U17). `price_min/max` vẫn còn trong DB, tự suy ra từ bậc giá. Agent đề xuất giá và ngưỡng chống bán phá giá chưa làm (hoãn). |
| B4 | Thêm quy cách đóng gói (20kg, 100kg…), khác nhau theo phân khúc (HORECA vs siêu thị). | ✅ | Bảng `product_packagings` có `pack_size` và `channel`. |
| B5 | Thêm gia công OEM hay thương hiệu riêng, và ngân sách sẵn sàng đầu tư thâm nhập thị trường (đầu vào cho mục G). | ✅ | Có `brand_model` (oem / own_brand / both) và `budget_amount` + `budget_currency`. |
| B6 | Tối giản nhập liệu: chỉ mô tả tiếng Việt (tự dịch), cho upload tài liệu để tự trích xuất. Nguyên tắc vừa đủ, không thừa, không thiếu. | 🟡 | Mô tả một ngôn ngữ, tự dịch. AI tự trích từ tài liệu mới có cho chứng nhận. PDF scan không có ảnh nhúng chưa đọc được. |
| B7 | Kiểm soát "Thêm sản phẩm": tránh khai một mẫu nhưng thêm nhiều sản phẩm khác loại. | 🟡 | Có cờ lệch ngành, hậu kiểm. Duyệt trước sản phẩm chưa làm. |
| B8 | Đổi nhãn "Sản phẩm xuất khẩu" thành "Sản phẩm cung cấp". | ✅ | Tab "Sản phẩm cung cấp" (U2). |
| B9 | Chứng nhận: chỉ upload + chọn loại. Bỏ số chứng chỉ, tổ chức cấp, ngày cấp, ngày hết hạn (hệ thống tự đọc). | ✅ | Form chỉ còn loại + file (đã bỏ hẳn khối số / tổ chức cấp / ngày ở `EvidenceManager.tsx`); admin đọc và nhập ngày khi duyệt. Backend vẫn nhận các trường này tuỳ chọn. |
| B10 | Thị trường xuất khẩu: thêm trường tùy chọn "Khách hàng của bạn là ai" + upload bằng chứng (hợp đồng, B/L). Phân biệt chính ngạch / tiểu ngạch. | ✅ | Cột `company_export_markets.trade_channel` (migration 0047): chính ngạch / tiểu ngạch **theo từng thị trường**, tự khai, tuỳ chọn; chọn ở form onboarding seller. Không lộ hồ sơ công khai, không vào điểm tín nhiệm hay cấp xác minh. "Khách hàng chính" và bằng chứng xuất khẩu có từ trước. |
| B11 | Mọi danh mục có lựa chọn "Khác". | ✅ | "Khác" có ở ngành, loại bao bì, loại chứng nhận, nhóm buyer, và nay thêm ô "Chứng chỉ khác" cho chứng chỉ buyer yêu cầu. Các danh sách còn lại là danh sách đóng có chủ đích (kênh, mô hình OEM, đơn vị, Incoterms, quy mô công ty) hoặc ràng buộc enum ở DB, không thêm "Khác". |

## C. Thông tin pháp lý doanh nghiệp

| # | Task | TT | Hiện trạng |
|---|---|---|---|
| C1 | Sửa lỗi: "Sở Kế hoạch và Đầu tư" không còn, tự chuyển "Sở Tài chính". Doanh nghiệp nước ngoài dùng nhãn chung "Cơ quan có thẩm quyền cấp". | ✅ | Lưu đúng như in trên ĐKKD, hiển thị "Sở Tài chính" kèm giải thích. Nhãn chung cho doanh nghiệp nước ngoài: chưa kiểm. |
| C2 | Tự lấy thông tin từ tên công ty / MST thay vì bắt upload. EU: tra registry quốc gia (ĐKKD, BCTC). VN: cần đánh giá khả thi. | 🟡 | EU: tra VIES (VAT, tên, địa chỉ) và GLEIF (LEI, số đăng ký quốc gia, địa chỉ pháp lý) từ job nền, kết quả là tín hiệu cho admin; buyer khai mã ở bước 2 onboarding. **Chưa có:** registry quốc gia (ĐKKD) và BCTC tự động. Repo chưa có API chung cho EU, ADR-0003 chưa nêu, BCTC cần bảng mới; admin dùng mã kiểm tay `national_registry` / `company_registry`. Việt Nam: chưa đánh giá khả thi (Cổng ĐKDN có captcha). |
| C3 | Đối chiếu địa chỉ trên ĐKKD với địa chỉ khai báo. | 🟡 | Thêm kiểm `vies_address_match`: so địa chỉ khai báo với địa chỉ VIES, ra `pass` / `warning` cho admin (không đổi trạng thái). Chỉ áp dụng khi VIES công bố địa chỉ (nhiều nước trả "---"); **Việt Nam chưa có nguồn tự động**, vẫn do admin đối chiếu tay. |

## D. Xác minh (Verification)

| # | Task | TT | Hiện trạng |
|---|---|---|---|
| D1 | Nền tảng tự xác minh thay người dùng: địa chỉ tồn tại, email, website, Google Maps (P0). | ✅ | Tự kiểm email/MX/RDAP, website (chống SSRF), định vị. Dùng Nominatim, không phải Google Maps. |
| D2 | Cross-check ngầm: mã vùng trồng khớp sản phẩm; ISO nhưng không liên kết vùng nguyên liệu; công suất khai báo vs nguồn nguyên liệu (P0/P1). | ✅ | `consistency.py` làm luật kiểm chéo. Chưa kiểm từng luật. |
| D3 | Ảnh vệ tinh đánh giá nhà máy có hoạt động thật (lưu lượng ra vào vs số nhân sự khai báo). Ngoài scope, **ước tính chi phí trước**. | ❌ | Hoãn. Yêu cầu "ước tính chi phí trước" chưa thấy ở đâu. |
| D4 | Xác minh truyền miệng qua mạng lưới (anh Trung, anh Hưng…): chỉ tham khảo, không phải bằng chứng. | — | Việc vận hành, không phải code. |
| D5 | Đổi tên cấp độ: L1 Basic (miễn phí, thu data) · L2 Enhanced (trả phí) · L3 Advanced (cân nhắc có cần không). Bỏ "VB Certified". | ✅ | Đã bỏ dropdown cấp độ ở trang chủ (không lọc gì thật). Trang `/products` (`ProductVerification`, `ProductAiTrust`) dùng tên Cơ bản / Nâng cao / Chuyên sâu, bỏ "VYBE Certified" và các lời hứa không có căn cứ (tăng 3.5x phản hồi, bảo hiểm, tài trợ vốn). Còn mã chết `BuyerSellerDetail.tsx` và `lib/constants.ts` (không có nơi hiển thị). |
| D6 | Badge chỉ "Đã xác minh / Chưa xác minh". Bỏ "EVFTA Verified" (tối nghĩa). | ✅ | Badge "Đã xác minh · cấp". Không còn "EVFTA Verified" trong tsx. |
| D7 | Độ sâu xác minh tương xứng giá (ví dụ $20/tháng chỉ đến một mức nhất định). Quyết định cùng A5. | 🟡 | Chờ chốt giá cùng A5. |
| D8 | Xác minh buyer làm lại: chỉ hỏi thông tin định danh (form hiện gây hiểu buyer phải có chứng nhận). Cảnh báo seller về buyer rủi ro (tín nhiệm ngân hàng, ship trước rồi mất tiền). | ✅ | Buyer xác minh tuỳ chọn, seller thấy trạng thái buyer. |

## E. Điểm tín nhiệm (Trust Score)

| # | Task | TT | Hiện trạng |
|---|---|---|---|
| E1 | Ghi rõ điểm do hệ thống Vybe-trade đánh giá; dấu (*) + tooltip khi di chuột. Tránh rủi ro pháp lý khi doanh nghiệp copy điểm đi quảng bá. | ✅ | Dấu `(*)` ngay sau điểm, rê chuột ra "Điểm do hệ thống VYBE Trade tính…"; ghi chú cùng nội dung ở panel; trang phương pháp. |
| E2 | Hiệu chỉnh thang điểm: 96 là quá cao khi chưa có bằng chứng khách hàng thật. | 🟡 | Thang 35/15/50 (giấy tờ / tự động / hành vi) là bản nháp, chưa duyệt. Công khai bị tắt ở production. |

## F. Công cụ tính thuế (điểm yếu nhất của demo)

| # | Task | TT | Hiện trạng |
|---|---|---|---|
| F1 | Hàm tính phải có giá trị sử dụng: ra số thuế và số tiền tiết kiệm thật (P0). | 🟡 | Giao diện ra số thuế, tiết kiệm, tiết kiệm mỗi năm. **Dữ liệu chỉ là nháp, chưa duyệt**: ở production khi chưa duyệt sẽ ra `unsupported`, không có số. |
| F2 | Đổi tên "Công cụ tính thuế EVFTA" thành "Công cụ tính thuế". | ✅ | Đã đổi. |
| F3 | Hạn ngạch thuế quan (TRQ): 0% chỉ trong hạn ngạch, ngoài chịu thuế thường. Hỏi người dùng đã có hạn ngạch chưa; hiển thị lộ trình cắt giảm theo năm. Ví dụ gạo thơm / gạo tấm. Số trong họp (40.000 tấn, 25%) cần đối chiếu Phụ lục EVFTA (P0). | 🟡 | Hàm `quota_scenarios`, giao diện và câu hỏi "đã có hạn ngạch chưa" đều có. Hạn ngạch gạo trong seed là 80.000 t, **khác 40.000 t khách nêu**, chưa đối chiếu Phụ lục 2-A. §6.4 sửa đổi **chưa được luật TM ký**. Lộ trình cắt giảm theo năm: chưa kiểm. |
| F4 | Phân nhóm sản phẩm theo nhóm hạn ngạch thay vì theo thị trường (P0). | 🟡 | Phân nhóm chọn ở công cụ tính thuế. Gắn vào sản phẩm (`products.subtype_code`) hoãn. |
| F5 | Dữ liệu: team đang tự cào, mới vài mã. Cần nguồn chính thức, đầy đủ (TARIC / Access2Markets) cho 50 mã (P0, critical path). | ❌ | **Việc nghẽn nhất.** Chỉ khoảng 20 mã, trong file nháp chưa ký. Chưa có nạp tự động từ TARIC / Access2Markets. |
| F6 | Thủy sản: cảnh báo thẻ vàng IUU (bị kiểm tra 100%) (P1). | 🟡 | Có `sector_alerts` và hiển thị. Nội dung (IUU) là nháp. |
| F7 | Phần quy tắc xuất xứ (RoO) hiện là placeholder, cần build thật (P0 theo Spec). | 🟡 | `roo_verdict` đã build thật, đủ pass/fail/inconclusive. Quy tắc PSR chỉ khoảng 13 dòng nháp, chưa duyệt. |
| F8 | Mở rộng 17 FTA (phụ thuộc A2). | 🟡 | Xem A2. |

## G. Gợi ý thị trường và Go-to-Market (module mới)

| # | Task | TT | Hiện trạng |
|---|---|---|---|
| G1 | Gợi ý thị trường không chỉ dựa trên thuế (thuế giữa các nước EU gần như nhau). Cần đa đầu vào: nhu cầu tiêu thụ, thị phần đối thủ, logistics; giải thích vì sao chọn nước này. | ✅ | Module `markets` dùng Eurostat Comext (snapshot ~11.000 dòng). Top 3 + 2 tiềm năng, lý do bằng số, có đối thủ. Chưa kiểm phần logistics. |
| G2 | Báo cáo Market Entry giá rẻ ($5–10), cá nhân hóa theo sản phẩm và quy mô doanh nghiệp: top 3 thị trường tiêu thụ + 2 tiềm năng, thị phần đối thủ, định vị, cơ hội cho doanh nghiệp Việt. | 🟡 | Có báo cáo theo công ty và sản phẩm, có PDF, số do server điền. Lời văn đang là mẫu, chưa nối LLM thật. Giá tạm 1.500.000 đ, lệch xa mức $5–10. |
| G3 | Upsell: tư vấn GTM may đo + mạng lưới triển khai của VYBE. | ✅ | Yêu cầu tư vấn qua VBA, lưu cho admin theo dõi. |
| G4 | Kết nối engine SIM chạy kịch bản: OEM vs thương hiệu; ngân sách GTM vs mục tiêu doanh thu (marketing thực tế ~5% doanh thu, doanh nghiệp chỉ muốn 1%). | ❌ | Engine SIM hoãn. Mới có `gtm_benchmarks.csv` làm mốc. |
| G5 | Bắt buộc có bản demo trước khi đưa nhóm VYBE vào dùng thử. | ✅ | Có dữ liệu demo theo hành trình và kịch bản demo (U25/U26). |

## H. Onboarding buyer

| # | Task | TT | Hiện trạng |
|---|---|---|---|
| H1 | Viết lại headline "Find Vietnamese product suitable for you" theo hướng ổn định nguồn cung, giảm rủi ro. | ✅ | Headline "Nguồn cung Việt Nam ổn định, đã được xác minh". |
| H2 | Company size thành tuỳ chọn. Bỏ VAT number giai đoạn này. | ✅ | Company size tuỳ chọn; không hỏi VAT/EORI. |
| H3 | Chuyển nhu cầu mua (ngành, sản phẩm, khối lượng, chứng nhận yêu cầu, thị trường, cảng) sang tab "Hoàn thiện hồ sơ". Bước đầu chỉ hỏi thông tin cơ bản. | ✅ | Nhu cầu mua lưu server, ở `BuyerNeedsForm`. |
| H4 | Thêm danh mục "Khác". Tiền tệ mặc định EUR. | ✅ | Tiền tệ mặc định EUR đã đúng ở model, schema và form (chỉ EUR / USD). |

## I. Tìm kiếm và trang hồ sơ công ty

| # | Task | TT | Hiện trạng |
|---|---|---|---|
| I1 | Tìm kiếm theo tên sản phẩm là chính (hạt điều, tiêu…), không chỉ mã HS / tên công ty. | ✅ | Tìm theo tên sản phẩm (U10). |
| I2 | Trang hồ sơ: giới thiệu, Google Map, dữ liệu đã xác minh (nhân sự, ngành nghề), sau đó mới đến sản phẩm. | ✅ | Bố cục mới có bản đồ và dữ liệu đã kiểm (U10). |
| I3 | Fix bug lag/lỗi khi bấm View profile. | ✅ | Đã sửa trong U10. Chưa tái hiện lại lỗi. |

## J. RFQ, tin nhắn, thông báo

| # | Task | TT | Hiện trạng |
|---|---|---|---|
| J1 | Thiết kế lại luồng RFQ; tạo tài khoản buyer test, chạy end-to-end. | ✅ | Báo giá có cấu trúc (U8), dữ liệu demo mọi vai trò (U25). |
| J2 | Làm rõ điều kiện thanh toán (cọc 50%/100%, thời điểm thanh toán, Incoterms). | ✅ | Báo giá có cọc % và điều khoản; Incoterms 2020 có ở RFQ, báo giá và nhu cầu buyer. |
| J3 | Làm rõ cách chủ động nhắn tin cho một doanh nghiệp bất kỳ. | ✅ | Nhắn tin trực tiếp không cần RFQ, chống spam (U7). |
| J4 | Thêm thông báo "Ai đã xem hồ sơ của bạn" và các thông báo kéo người dùng quay lại. | 🟡 | "Ai đã xem hồ sơ" + thông báo (U9). Thêm thông báo tổng hợp kéo quay lại (job hằng ngày 08:30 UTC, loại `reengagement`, migration 0048): người vắng 7–30 ngày có thông báo chưa đọc thì nhận một thông báo, tối đa 1 lần / 14 ngày. **Chỉ trong ứng dụng, chưa gửi email** vì chưa có opt-out / hủy đăng ký. |

## Thiếu gì, theo thứ tự ưu tiên

1. **Dữ liệu thuế / hạn ngạch / RoO được luật TM duyệt (F1, F3, F5, F7).** Chặn nhất để công cụ tính thuế "có giá trị sử dụng". Cần chữ ký §6.4 và đối chiếu 40.000 t với 80.000 t.
2. **Cần quyết định hoặc nguồn ngoài:**
   - J4 qua email: cần chính sách opt-out / hủy đăng ký trước khi gửi.
   - C3 cho Việt Nam: chưa có nguồn tự động, cần đánh giá khả thi.
   - Registry quốc gia EU (ĐKKD) và BCTC (C2): cần interface nhà cung cấp mới, ADR bổ sung, chọn nước đầu tiên; BCTC cần bảng mới.
   - Giá báo cáo GTM (lệch $5–10), LLM thật cho lời văn, giá tier xác minh (D7).
3. **Hoãn có chủ đích:** D3, G4, A7 (GĐ2), dữ liệu 17 FTA (A2/F8).
4. **Dọn mã chết (tuỳ chọn):** `BuyerSellerDetail.tsx`, `lib/constants.ts` còn nhãn L3 giả nhưng không có nơi hiển thị.

## Lưu ý

- Có thay đổi chưa commit, gồm cả phần tồn từ trước (`product_service.py`, `test_rfq.py`, `SellerWorkspace.tsx`).
- `ingest.log` ở thư mục gốc chứa traceback của `copilot/ingest.py`; chưa mở ra đọc, có thể nạp corpus đã lỗi.
- Ba test (`verification/test_trust.py` x2, `compliance/test_demo_data.py` x1) đỏ khi chạy với `.env` hiện tại (`DEMO_COMPLIANCE_DATA=true`, `TRUST_SCORE_PUBLIC=true`) và xanh khi đặt hai biến này về `false`; không liên quan đợt bổ sung. Nên chạy test với hai biến này tắt (hoặc dùng `.env` riêng cho test).

## Đợt bổ sung 05/10/2026: đã làm gì

| Nhóm | Mục | Thay đổi chính |
|---|---|---|
| Dọn chuỗi cũ | D5, B9 | Bỏ dropdown cấp độ ở trang chủ; viết lại nhãn và lời hứa ở `/products`; bỏ khối số / tổ chức / ngày ở form chứng nhận |
| Chính ngạch / tiểu ngạch | B10 | Migration 0047 (`company_export_markets.trade_channel`), schema `export_market_channels`, chọn kênh ở onboarding seller |
| Kéo quay lại | J4 | Migration 0048 (`notification_type` thêm `reengagement`), `notifications/reengagement.py`, job `jobs/reengagement.py`, hàm tra cứu ở `auth` và `dashboard` |
| Mục nhỏ | E1, B11, C3, H4, J2 | Dấu `(*)` ở điểm tín nhiệm; ô "Chứng chỉ khác" cho buyer; kiểm `vies_address_match`; H4 và J2 đã đúng từ trước, chỉ cập nhật trạng thái |
| Onboarding buyer 4 bước | H2, H3, D8, C2 | Bước 1 thông tin doanh nghiệp; bước 2 giấy phép & chứng nhận (chỉ khai mã: VAT, số đăng ký, LEI, cơ quan và địa chỉ đăng ký; không tải file; bỏ qua được; có mã thì tự gửi yêu cầu xác minh khi hoàn tất, không còn checkbox); bước 3 nhu cầu mua hàng (bắt buộc chọn nhóm hàng để ghép nhà cung cấp); bước 4 xem lại và hoàn tất. Seller và buyer dùng chung bộ component `components/onboarding/*` (khung trang, thanh bước, cột giới thiệu, tiêu đề bước, nút điều hướng, khối xem lại). Backend: cột `companies.lei_code` (migration 0049), GLEIF trả thêm số đăng ký quốc gia / cơ quan đăng ký / địa chỉ pháp lý, hai kiểm tự động mới `gleif_registration_match` và `gleif_address_match` (tín hiệu cho admin) |

Ngoài kế hoạch: thêm bản dịch còn thiếu cho chuỗi "Sản phẩm và năng lực" (lỗi có sẵn từ commit U2 làm `i18n-coverage` đỏ).

## Kết quả kiểm

| Phần | Kết quả |
|---|---|
| Frontend `npm run lint` | 0 lỗi, 95 cảnh báo (phần lớn có sẵn) |
| Frontend `npm run typecheck` | Sạch |
| Frontend `npm test` | 65 file, 1193 test xanh |
| Backend `ruff check`, `ruff format`, `mypy app` | Sạch (282 file) |
| Migration 0047, 0048 | Chạy lên và xuống được trên DB dev |
| Backend `pytest` toàn bộ, `.env` hiện tại | 1991 xanh, 3 đỏ: 2 test ở `verification/test_trust.py` và `compliance/test_demo_data.py::test_flag_off_demo_rows_never_leak` (cùng nguyên nhân: `.env` bật cờ demo) |
| Backend `pytest` toàn bộ, `DEMO_COMPLIANCE_DATA=false TRUST_SCORE_PUBLIC=false` | **1994 xanh, 0 đỏ** (khoảng 7 phút) |

Chưa commit, chưa push.
