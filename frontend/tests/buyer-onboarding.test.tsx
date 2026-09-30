import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import BuyerOnboarding from '@/components/BuyerOnboarding';
import { LanguageProvider } from '@/context/LanguageContext';
import type { DemoUser } from '@/lib/demoAuth';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/buyer/onboarding',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const USER: DemoUser = {
  id: 'u-2',
  name: 'Alex Nguyen',
  email: 'alex@globalfoods.de',
  company: '',
  role: 'buyer',
  onboardingCompleted: false,
};

function renderBuyer(initialCompany?: Record<string, string>, onComplete = vi.fn()) {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <BuyerOnboarding user={USER} initialCompany={initialCompany} onComplete={onComplete} onLogout={vi.fn()} />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
  return { onComplete };
}

const goNext = () => fireEvent.click(screen.getByRole('button', { name: /Tiếp tục|Tiếp theo|Continue/ }));

describe('BuyerOnboarding (B2)', () => {
  it('bước 1: quốc gia gợi ý theo chữ gõ (có nước EU), có ô mã số VAT', () => {
    renderBuyer();
    const country = screen.getByRole('combobox', { name: /Quốc gia/ });
    fireEvent.focus(country);
    fireEvent.change(country, { target: { value: 'ger' } });
    expect(country).toHaveAttribute('aria-expanded', 'true');
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Germany']);
    fireEvent.change(country, { target: { value: '' } });
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(
      expect.arrayContaining(['Germany', 'France', 'Netherlands', 'United States']),
    );
    expect((screen.getByLabelText(/Mã số VAT/) as HTMLInputElement).type).toBe('text');
  });

  it('bước 1: chọn quốc gia bằng phím mũi tên + Enter mà không gửi form', () => {
    const { onComplete } = renderBuyer();
    const country = screen.getByRole('combobox', { name: /Quốc gia/ }) as HTMLInputElement;
    fireEvent.focus(country);
    fireEvent.change(country, { target: { value: 'ger' } });
    fireEvent.keyDown(country, { key: 'ArrowDown' });
    expect(country).toHaveAttribute('aria-activedescendant', 'buyer-country-0');
    fireEvent.keyDown(country, { key: 'Enter' });
    expect(country.value).toBe('Germany');
    expect(country).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('heading', { name: 'Thông tin công ty' })).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('bước 1: quốc gia ngoài danh sách thì báo lỗi và ở lại bước 1', () => {
    renderBuyer();
    fillStepOne();
    fireEvent.change(screen.getByRole('combobox', { name: /Quốc gia/ }), { target: { value: 'Vietnam' } });
    goNext();
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng chọn quốc gia trong danh sách.');
    expect(screen.getByRole('heading', { name: 'Thông tin công ty' })).toBeInTheDocument();
  });

  it('nạp hồ sơ đã lưu trên server vào form', () => {
    renderBuyer({
      companyName: 'Global Foods Trading GmbH',
      country: 'Germany',
      companySize: '51–200 nhân sự',
      vatNumber: 'DE123456789',
      interest: 'Nông sản, Gia vị & Hương liệu',
    });
    expect(screen.getByDisplayValue('Global Foods Trading GmbH')).toBeInTheDocument();
    expect(screen.getByDisplayValue('DE123456789')).toBeInTheDocument();
    expect((screen.getByRole('combobox', { name: /Quốc gia/ }) as HTMLSelectElement).value).toBe('Germany');
    expect((screen.getByRole('combobox', { name: /Quy mô công ty/ }) as HTMLSelectElement).value).toBe('51–200 nhân sự');
  });

  function fillStepOne() {
    fireEvent.change(screen.getByLabelText(/Tên công ty/), { target: { value: 'Global Foods' } });
    fireEvent.change(screen.getByRole('combobox', { name: /Quốc gia/ }), { target: { value: 'Germany' } });
    fireEvent.change(screen.getByRole('combobox', { name: /Khu vực/ }), { target: { value: 'Châu Âu' } });
    fireEvent.change(screen.getByRole('combobox', { name: /Quy mô công ty/ }), { target: { value: '11–50 nhân sự' } });
    fireEvent.change(screen.getByLabelText(/Người liên hệ/), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByLabelText(/Email liên hệ/), { target: { value: 'alex@globalfoods.de' } });
  }

  it('bước 2: chọn nhiều nhóm hàng bằng ô tick (6 nhóm ngành) và ước lượng mua hàng', () => {
    renderBuyer();
    fillStepOne();
    goNext();
    for (const label of ['Nông sản', 'Thủy sản', 'Thực phẩm & Đồ uống', 'Dệt may', 'Thủ công mỹ nghệ', 'Gia vị & Hương liệu']) {
      expect(screen.getByRole('checkbox', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('combobox', { name: /Ước lượng mua hàng/ })).toBeInTheDocument();
  });

  it('bước 2: chưa chọn nhóm hàng nào thì báo lỗi và ở lại bước 2', () => {
    renderBuyer();
    fillStepOne();
    goNext();
    fireEvent.change(screen.getByLabelText(/Khối lượng dự kiến/), { target: { value: '10' } });
    fireEvent.change(screen.getByRole('combobox', { name: /Tần suất/ }), { target: { value: 'Hàng tháng' } });
    goNext();
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng chọn ít nhất một nhóm hàng cần tìm.');
    expect(screen.getByRole('checkbox', { name: 'Nông sản' })).toBeInTheDocument();
  });

  it('bước 2: chọn nhóm hàng rồi sang được bước 3', () => {
    renderBuyer();
    fillStepOne();
    goNext();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Nông sản' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Gia vị & Hương liệu' }));
    fireEvent.change(screen.getByLabelText(/Khối lượng dự kiến/), { target: { value: '10' } });
    fireEvent.change(screen.getByRole('combobox', { name: /Tần suất/ }), { target: { value: 'Hàng tháng' } });
    goNext();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Tiêu chí xác minh', { selector: 'h2' })).toBeInTheDocument();
  });
});

describe('BuyerOnboarding — mã EORI (B3)', () => {
  it('có ô EORI cạnh mã VAT, nạp sẵn từ hồ sơ đã lưu', () => {
    renderBuyer({ eoriNumber: 'DE123456789012' });
    expect((screen.getByLabelText(/Mã EORI/) as HTMLInputElement).value).toBe('DE123456789012');
    expect(screen.getByLabelText(/Mã số VAT/)).toBeInTheDocument();
  });
});
