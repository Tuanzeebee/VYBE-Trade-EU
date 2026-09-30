import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import Footer from '@/components/Footer';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const wrap = (locale: 'vi' | 'en') =>
  render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <LanguageProvider>
        <Footer />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );

describe('Footer', () => {
  it('có liên kết thật tới công cụ và trang pháp lý, không có href rỗng hoặc #', () => {
    wrap('vi');
    const href = (name: string) => screen.getByRole('link', { name }).getAttribute('href');
    expect(href('Nhà cung cấp đã xác minh')).toContain('/suppliers');
    expect(href('Máy tính tiết kiệm thuế')).toContain('/tools/tariff');
    expect(href('Máy tính quy tắc xuất xứ')).toContain('/tools/origin');
    expect(href('Trợ lý tuân thủ EVFTA')).toContain('/copilot');
    expect(href('Điều khoản dịch vụ')).toContain('/terms');
    expect(href('Chính sách bảo mật')).toContain('/privacy');
    for (const a of screen.getAllByRole('link')) expect(a.getAttribute('href')).toMatch(/^(\/|mailto:)/);
  });

  it('không còn nội dung xác minh L1–L3 của hệ thống cũ', () => {
    const { container } = wrap('vi');
    expect(container.textContent).not.toMatch(/L1|L2|L3|Kiểm toán VYBE|Inc\./);
  });

  it('nêu Bộ Công Thương là cơ quan cấp chính thức; có bản tiếng Anh', () => {
    wrap('en');
    expect(screen.getByText(/official issuing authority/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Terms of service' })).toBeInTheDocument();
  });
});
