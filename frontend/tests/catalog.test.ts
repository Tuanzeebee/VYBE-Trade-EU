import { describe, expect, it } from 'vitest';
import { translateText } from '@/i18n/translate';

// Chuỗi mới thêm ở A1 phải có bản tiếng Anh trong catalog cũ (tr()), tới khi A3 chuyển sang next-intl.
const A1_STRINGS = [
  'Tài khoản tạm khóa 15 phút do đăng nhập sai nhiều lần.',
  'Mật khẩu cần ít nhất 10 ký tự.',
  'Vui lòng đồng ý Điều khoản sử dụng và Chính sách bảo mật.',
  'Không kết nối được máy chủ. Vui lòng thử lại.',
  'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
  'Ít nhất 10 ký tự',
  'Mật khẩu được mã hóa và phiên đăng nhập được bảo vệ phía máy chủ.',
  'Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật của nền tảng.',
];

// Chuỗi mới ở B1 (form hồ sơ doanh nghiệp).
const B1_STRINGS = [
  'Ngôn ngữ nhân viên sử dụng',
  'Mô tả doanh nghiệp (tiếng Việt)',
  'Mô tả doanh nghiệp (tiếng Anh)',
  'Tiếng Việt',
  'Tiếng Anh',
  'Tiếng Trung',
  'Tiếng Nhật',
  'Tiếng Hàn',
  'Tiếng Pháp',
  'Tiếng Đức',
  'Thực phẩm & Đồ uống',
  'Dệt may',
  'Thủ công mỹ nghệ',
  'Thông tin doanh nghiệp chưa hợp lệ. Vui lòng kiểm tra lại.',
];

// Chuỗi mới ở B2 (form hồ sơ buyer).
const B2_STRINGS = [
  'Chọn quốc gia',
  'Mã số VAT',
  'Ví dụ: DE123456789',
  'Nhóm hàng cần tìm *',
  'Chọn một hoặc nhiều nhóm hàng bạn quan tâm.',
  'Ước lượng mua hàng mỗi năm',
  'Chọn mức ước lượng',
  'Dưới 100.000 EUR/năm',
  '100.000 – 500.000 EUR/năm',
  '500.000 – 2 triệu EUR/năm',
  '2 – 10 triệu EUR/năm',
  'Trên 10 triệu EUR/năm',
  'Vui lòng chọn ít nhất một nhóm hàng cần tìm.',
  'Vui lòng chọn quốc gia từ danh sách.',
  'Nhóm hàng',
  'Ước lượng mua hàng'
];

// Chuỗi mới ở B4 (ô chọn mã HS).
const B4_STRINGS = [
  'Gõ tên sản phẩm hoặc mã HS, ví dụ: gạo, rice, 1006',
  'Đã hỗ trợ máy tính',
  'Chưa hỗ trợ máy tính',
  'Không tìm thấy mã HS phù hợp',
  'Không tải được danh sách mã HS. Vui lòng thử lại.'
];

// Chuỗi mới ở B5 (sản phẩm, thị trường xuất khẩu). Mẫu có tên sản phẩm được thay bằng ví dụ cụ thể.
const B5_STRINGS = [
  'Chưa có sản phẩm. Hãy thêm ít nhất một sản phẩm kèm mã HS để buyer tìm thấy bạn.',
  'Sản phẩm',
  'Ví dụ: Gạo thơm Jasmine xuất khẩu',
  'Mã HS',
  'Giá thấp nhất',
  'Giá cao nhất',
  'Tiền tệ',
  'Đơn vị giá',
  'Chọn đơn vị',
  'MOQ (số lượng đặt tối thiểu)',
  'Đơn vị MOQ',
  'Mô tả (tiếng Việt)',
  'Mô tả (tiếng Anh)',
  'Ảnh sản phẩm',
  'Ảnh',
  'Xóa ảnh',
  'Đang tải…',
  'Thêm ảnh',
  'Đã đủ 10 ảnh',
  'Hiển thị công khai',
  'Cái',
  'Thùng',
  'Lít',
  'Ảnh phải là PNG, JPEG hoặc WebP.',
  'Ảnh tối đa 5MB.',
  'Không tải được ảnh lên. Bạn vẫn có thể lưu sản phẩm không có ảnh.',
  'Vui lòng thêm ít nhất một sản phẩm.',
  'Sản phẩm chưa hợp lệ. Vui lòng kiểm tra lại.',
  'Thị trường xuất khẩu đã phục vụ',
  'Mỗi sản phẩm cần có mã HS. Buyer tìm thấy bạn qua mã HS, giá và MOQ.',
  'Mỗi sản phẩm cần có tên.',
  'Giá thấp nhất không được lớn hơn giá cao nhất.',
  'Chưa có hồ sơ doanh nghiệp. Hãy lưu thông tin doanh nghiệp trước.',
  'Không tải được danh sách sản phẩm. Vui lòng thử lại.',
  'Chưa có sản phẩm. Thêm sản phẩm kèm mã HS để buyer tìm thấy bạn.',
  'Đang ẩn',
  'Giá:',
  'Từ',
  'Đến',
  'Sản phẩm "Gạo thơm" chưa chọn mã HS.',
  'Sản phẩm "Gạo thơm" chưa hợp lệ. Vui lòng kiểm tra mã HS, giá và ảnh.',
  'Không lưu được sản phẩm "Gạo thơm". Vui lòng thử lại.',
  'Giá thấp nhất không hợp lệ (số dương, dùng dấu chấm cho phần thập phân, tối đa 2 chữ số).'
];

// Chuỗi mới ở B3 (mô hình kinh doanh, EORI, thẻ hoàn thiện hồ sơ).
const B3_STRINGS = [
  'Mô hình kinh doanh *',
  'Mô hình kinh doanh',
  'Chọn mô hình',
  'Nhà sản xuất',
  'Công ty thương mại',
  'Vừa sản xuất vừa thương mại',
  'Mô hình:',
  'Mã EORI',
  'Ví dụ: DE123456789012345',
  'Mức độ hoàn thiện hồ sơ',
  'Đang tính điểm hoàn thiện…',
  'Không tải được điểm hoàn thiện hồ sơ.',
  'hoàn thiện',
  'Hồ sơ đã đầy đủ thông tin cần thiết.',
  'Việc cần bổ sung',
  'Điểm này chỉ đo mức đầy đủ của hồ sơ, không phải kết quả xác minh.',
  'Mã số thuế / ĐKKD',
  'Năm thành lập',
  'Địa chỉ',
  'Mô tả tiếng Anh (≥ 150 ký tự)',
  'Mô tả tiếng Việt (≥ 150 ký tự)',
  'Ngành hàng',
  'Thị trường xuất khẩu',
  'Ngoại ngữ nhân viên',
  'Sản phẩm kèm mã HS',
  'Ảnh sản phẩm',
  'Mô tả sản phẩm (≥ 30 ký tự)',
  'Giá sản phẩm',
  'Bằng chứng đã nộp',
  'Nhóm hàng quan tâm',
  'Mã VAT hoặc EORI',
  'Quy mô công ty',
  'Ước lượng mua hàng',
  'Loại hình doanh nghiệp'
];

const A2_STRINGS = [
  'Giấy phép và chứng nhận chưa được lưu lên hệ thống ở phiên bản này; phần tải lên thật sẽ được bổ sung sau. Bạn vẫn có thể hoàn tất hồ sơ với công ty và sản phẩm.',
  'Không thể lưu sản phẩm. Vui lòng thử lại.'
];

const C2_STRINGS = [
  'Kết quả',
  'Tiết kiệm mỗi lô',
  'Thuế MFN',
  'Thuế EVFTA',
  'Tiết kiệm mỗi năm',
  'Mã HS này chưa được hỗ trợ. Vui lòng liên hệ để được tư vấn.',
  'Trường hợp này cần kiểm tra thêm (ví dụ hạn ngạch hoặc thuế tuyệt đối), nên chúng tôi không đưa ra con số.',
  'Kết quả chỉ mang tính tham khảo, không thay thế tư vấn pháp lý hoặc xác nhận của cơ quan hải quan.',
  'Xem nhà cung cấp cho mã HS này',
  'Máy tính tiết kiệm thuế EVFTA',
  'Nhập mã HS, nước EU nhập khẩu và giá trị lô hàng để ước tính thuế nhập khẩu tiết kiệm được nhờ EVFTA.',
  'Sản phẩm (mã HS)',
  'Nước EU nhập khẩu',
  'Giá trị lô hàng (EUR)',
  'Số lô hàng mỗi năm (không bắt buộc)',
  'Tính tiết kiệm thuế',
  'Đang tính...',
  'Bạn đã tính quá nhiều lần. Vui lòng thử lại sau một phút.',
  'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại mã HS, nước nhập khẩu và giá trị lô hàng.',
  'Không kết nối được máy chủ. Vui lòng thử lại.',
  'Vui lòng chọn mã HS.',
  'Giá trị lô hàng phải là số dương, tối đa 2 chữ số thập phân (ví dụ 10000 hoặc 10000.50).',
  'Số lô hàng mỗi năm phải là số nguyên từ 1 đến 10000.'
];

const C4_STRINGS = [
  'Bạn đã kiểm tra quá nhiều lần. Vui lòng thử lại sau một phút.',
  'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại mã HS, giá xuất xưởng và nguyên liệu.',
  'Trường hợp này cần chuyên gia đánh giá nên hệ thống không tự kết luận.',
  'Có nhiều hơn một quy tắc cho mã HS này nên cần chuyên gia đánh giá.',
  'Bạn chưa khai nguyên liệu nên chưa thể kết luận.',
  'Còn thiếu dữ liệu để kết luận (ví dụ giá xuất xưởng hoặc mã HS của nguyên liệu).',
  'Đạt',
  'Không đạt',
  'Chưa kết luận',
  'Chưa hỗ trợ',
  'Mã HS này nằm ngoài phạm vi dữ liệu của hệ thống. Điều đó không có nghĩa là hàng hóa không có quy tắc xuất xứ; vui lòng liên hệ để được tư vấn.',
  'Nguyên liệu không xuất xứ (NOM)',
  'Ngưỡng tối đa',
  'Kết quả chỉ mang tính tham khảo. Cơ quan cấp chứng nhận xuất xứ chính thức là Bộ Công Thương.',
  'Vui lòng chọn mã HS.',
  'Giá xuất xưởng phải là số dương, tối đa 2 chữ số thập phân (ví dụ 1000 hoặc 1000.50).',
  'Máy tính quy tắc xuất xứ EVFTA',
  'Kiểm tra hàng Việt Nam xuất sang EU có đạt quy tắc xuất xứ hay không. Mọi số tiền dùng cùng một đơn vị tiền tệ.',
  'Giá xuất xưởng (EXW)',
  'Nguyên liệu nhập khẩu',
  'Chưa khai nguyên liệu',
  'Không có nguyên liệu nhập khẩu',
  'Có nguyên liệu nhập khẩu (khai bên dưới)',
  'Nguyên liệu',
  'Nước xuất xứ (mã 2 chữ cái)',
  'Giá trị nguyên liệu',
  'Mã HS nguyên liệu (nếu có)',
  'Xóa nguyên liệu',
  'Thêm nguyên liệu',
  'Đang kiểm tra...',
  'Kiểm tra xuất xứ'
];

describe('catalog.json có bản tiếng Anh cho chuỗi A1, B1, B2, B3, B4, B5, A2, C2, C4', () => {
  it.each([...A1_STRINGS, ...B1_STRINGS, ...B2_STRINGS, ...B3_STRINGS, ...B4_STRINGS, ...B5_STRINGS, ...A2_STRINGS, ...C2_STRINGS, ...C4_STRINGS])('%s', (vi) => {
    const en = translateText(vi, 'en');
    expect(en).not.toBe(vi);
    expect(en.trim()).not.toBe('');
  });
});
