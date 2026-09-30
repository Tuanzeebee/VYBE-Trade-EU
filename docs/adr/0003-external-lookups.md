# ADR-0003: Tra cứu dữ liệu bên ngoài (kiểm tự động, thống kê thương mại)

- Trạng thái: Đề xuất (01/10/2026)
- Ngày: 2026-10-01
- Hạng mục: U15, U21

## Bối cảnh

Sau demo 30/09/2026, khách yêu cầu nền tảng tự kiểm những gì kiểm được thay vì bắt doanh nghiệp tải giấy tờ lên: email có tồn tại không, website có sống không, địa chỉ có thật không, mã VAT EU có hợp lệ không. Khách cũng yêu cầu gợi ý thị trường dựa trên số liệu tiêu thụ và thị phần đối thủ, không chỉ dựa trên thuế. Những việc này đều cần gọi dịch vụ ngoài.

AGENTS.md §5.5 cấm gọi thẳng nhà cung cấp ngoài; §2 cấm thêm thư viện khi chưa được đồng ý. `httpx` đã có sẵn.

## Quyết định

Mỗi nguồn ngoài là một interface trong `app/core/`, có bản thật (dùng `httpx`) và bản fake cho test:

| Interface | Bản thật | Dùng cho |
|---|---|---|
| `CompanyLookup` | VIES REST (VAT EU), GLEIF API (LEI) | Buyer B1, công ty EU |
| `DomainChecker` | DNS-over-HTTPS (MX), RDAP (tuổi domain), danh sách mail miễn phí trong repo | Email liên hệ |
| `WebsiteProbe` | HTTP GET có giới hạn | Website khai báo |
| `Geocoder` | Nominatim (OpenStreetMap) | Bản đồ trên hồ sơ, chỉ khi owner đồng ý |
| `TradeStatsSource` | Eurostat Comext (SDMX-CSV) + nạp file CSV | Gợi ý thị trường, giá tham khảo, báo cáo |

Nguyên tắc:

- **Chỉ gọi từ job nền** (Procrastinate), không bao giờ trong request của người dùng. Kết quả ghi vào DB (`verification_checks`, `trade_flows`) và đọc lại từ DB.
- **Kết quả kiểm tự động chỉ là tín hiệu cho admin.** Không module nào tự đổi trạng thái xác minh (§6.9).
- **Chống SSRF cho `WebsiteProbe`:** chỉ `http`/`https`; phân giải DNS rồi chặn IP private, loopback, link-local, multicast, reserved; không theo redirect sang host khác; timeout 5 giây; đọc tối đa 64 KB; không gửi cookie.
- **Tôn trọng điều khoản dịch vụ:** Nominatim tối đa 1 yêu cầu/giây, có `User-Agent` riêng; Eurostat không cần khóa. Không cào dữ liệu trang có captcha (Cổng ĐKDN Việt Nam: admin kiểm tay theo checklist, ghi kết quả là một bản ghi `verification_checks` loại `manual`).
- Cấu hình (URL, timeout, bật/tắt) nằm trong `core.config`; mặc định ở test là bản fake.

## Phương án đã loại

- **Thêm SDK/thư viện** (dnspython, geopy, sdmx1…): thêm phụ thuộc, trái §2; `httpx` đủ dùng.
- **Gọi trực tiếp khi người dùng bấm lưu:** làm chậm và làm hỏng luồng khi dịch vụ ngoài lỗi.
- **Dịch vụ KYB trả phí (OpenCorporates, D&B):** chi phí và hợp đồng dữ liệu chưa có; để giai đoạn sau.

## Hệ quả

- Kết quả kiểm có thể trễ vài phút sau khi nộp hồ sơ; giao diện hiện "đang kiểm".
- Mỗi nguồn ngoài lỗi thì bản ghi kiểm có trạng thái `unknown`, không chặn xác minh thủ công.
- Số liệu thị trường có kỳ và nguồn ghi rõ ("Eurostat Comext, năm 2025").
