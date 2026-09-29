import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import SellerOnboarding from '@/components/SellerOnboarding';
import { LanguageProvider } from '@/context/LanguageContext';
import type { DemoUser } from '@/lib/demoAuth';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter/onboarding',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const ACCOUNT: DemoUser = {
  id: 'u-1',
  name: 'Nguyễn A',
  email: 'a@congtya.vn',
  company: 'Công ty A',
  role: 'seller',
  onboardingCompleted: false,
};

function renderOnboarding(initialCompany?: Record<string, string>) {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <SellerOnboarding
          account={ACCOUNT}
          initialStep={1}
          initialCompany={initialCompany}
          onLogout={vi.fn()}
          onNavigateHome={vi.fn()}
        />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

const input = (label: RegExp) => screen.getByLabelText(label) as HTMLInputElement;

describe('SellerOnboarding bước 1 (B1)', () => {
  it('không còn điền sẵn dữ liệu demo — chỉ tên công ty và email từ tài khoản', () => {
    renderOnboarding();
    expect(screen.getByDisplayValue('Công ty A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('a@congtya.vn')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('0314892345')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('https://vietagri-export.vn')).not.toBeInTheDocument();
  });

  it('có ngành hàng, ngôn ngữ nhân viên, mô tả tiếng Việt và tiếng Anh', () => {
    renderOnboarding();
    expect(screen.getByRole('combobox', { name: /Ngành hàng/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Tiếng Anh' })).toBeInTheDocument();
    expect(input(/Mô tả doanh nghiệp \(tiếng Việt\)/).tagName).toBe('TEXTAREA');
    expect(input(/Mô tả doanh nghiệp \(tiếng Anh\)/).tagName).toBe('TEXTAREA');
  });

  it('trang sửa hồ sơ nạp dữ liệu từ server', () => {
    renderOnboarding({
      companyName: 'Công ty B',
      taxCode: '0399999999',
      descriptionEn: 'Rice exporter',
      industrySector: 'seafood',
      languages: 'vi,ja',
    });
    expect(screen.getByDisplayValue('Công ty B')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0399999999')).toBeInTheDocument();
    expect(input(/Mô tả doanh nghiệp \(tiếng Anh\)/).value).toBe('Rice exporter');
    expect((screen.getByRole('combobox', { name: /Ngành hàng/ }) as HTMLSelectElement).value).toBe('seafood');
    expect((screen.getByRole('checkbox', { name: 'Tiếng Nhật' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: 'Tiếng Anh' }) as HTMLInputElement).checked).toBe(false);
  });
});

describe('SellerOnboarding — mô hình kinh doanh (B3)', () => {
  it('ô này chọn sản xuất / thương mại / cả hai, không còn hình thức pháp lý', () => {
    renderOnboarding();
    const select = screen.getByRole('combobox', { name: /Mô hình kinh doanh/ }) as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(['', 'manufacturer', 'trader', 'both']);
    for (const gone of [/Công ty TNHH/, /Công ty Cổ phần/, /Doanh nghiệp tư nhân/, /Hợp tác xã/, /vốn đầu tư nước ngoài/]) {
      expect(screen.queryByText(gone)).not.toBeInTheDocument();
    }
  });

  it('nạp giá trị đã lưu từ server', () => {
    renderOnboarding({ businessType: 'both' });
    expect((screen.getByRole('combobox', { name: /Mô hình kinh doanh/ }) as HTMLSelectElement).value).toBe('both');
  });
});
