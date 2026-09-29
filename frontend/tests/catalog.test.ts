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

describe('catalog.json có bản tiếng Anh cho chuỗi A1', () => {
  it.each(A1_STRINGS)('%s', (vi) => {
    const en = translateText(vi, 'en');
    expect(en).not.toBe(vi);
    expect(en.trim()).not.toBe('');
  });
});
