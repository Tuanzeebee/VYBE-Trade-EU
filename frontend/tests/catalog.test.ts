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

describe('catalog.json có bản tiếng Anh cho chuỗi A1, B1, B2, B4, B5', () => {
  it.each([...A1_STRINGS, ...B1_STRINGS, ...B2_STRINGS, ...B4_STRINGS, ...B5_STRINGS])('%s', (vi) => {
    const en = translateText(vi, 'en');
    expect(en).not.toBe(vi);
    expect(en.trim()).not.toBe('');
  });
});
