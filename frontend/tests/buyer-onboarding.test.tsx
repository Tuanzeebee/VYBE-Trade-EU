import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

function renderBuyer(initialCompany?: Record<string, string>, onComplete = vi.fn().mockResolvedValue(undefined)) {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <BuyerOnboarding user={USER} initialCompany={initialCompany} onComplete={onComplete} onLogout={vi.fn()} />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
  return { onComplete };
}

function fillStepOne() {
  fireEvent.change(screen.getByLabelText(/Tên công ty/), { target: { value: 'Global Foods GmbH' } });
  fireEvent.change(screen.getByRole('combobox', { name: /Quốc gia/ }), { target: { value: 'Germany' } });
  fireEvent.change(screen.getByLabelText(/Thành phố/), { target: { value: 'Hamburg' } });
}
const submitStep = () => fireEvent.submit(screen.getByRole('button', { name: /Tiếp tục|Hoàn tất/ }).closest('form') as HTMLFormElement);

describe('BuyerOnboarding tối giản (U5)', () => {
  it('bước 1 chỉ hỏi thông tin liên hệ cơ bản — không có VAT/EORI hay cấp xác minh', () => {
    renderBuyer();
    for (const label of [/Tên công ty/, /Thành phố/, /Người liên hệ/, /Email liên hệ/]) {
      expect(screen.getByLabelText(label)).toBeRequired();
    }
    expect(screen.getByLabelText(/Quy mô công ty/)).not.toBeRequired();
    expect(screen.queryByLabelText(/VAT/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/EORI/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tiêu chí xác minh/)).not.toBeInTheDocument();
    const country = screen.getByRole('combobox', { name: /Quốc gia/ }) as HTMLSelectElement;
    expect([...country.options].map((o) => o.value)).toContain('Germany');
  });

  it('headline nhấn nguồn cung ổn định, không còn câu "phù hợp với bạn"', () => {
    renderBuyer();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Nguồn cung Việt Nam ổn định/);
    expect(screen.queryByText(/phù hợp với bạn/)).not.toBeInTheDocument();
    expect(screen.queryByText(/lưu trên trình duyệt/)).not.toBeInTheDocument();
  });

  it('nạp hồ sơ đã lưu trên server vào form', () => {
    renderBuyer({ companyName: 'Đã lưu GmbH', city: 'Berlin', contactName: 'Anna' });
    expect(screen.getByLabelText(/Tên công ty/)).toHaveValue('Đã lưu GmbH');
    expect(screen.getByLabelText(/Thành phố/)).toHaveValue('Berlin');
    expect(screen.getByLabelText(/Người liên hệ/)).toHaveValue('Anna');
  });

  it('bỏ qua bước nhu cầu: hoàn tất chỉ với thông tin công ty (nhu cầu = null)', async () => {
    const { onComplete } = renderBuyer();
    fillStepOne();
    submitStep();
    fireEvent.click(await screen.findByRole('button', { name: 'Bỏ qua, bổ sung sau' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    const [profile, needs] = onComplete.mock.calls[0];
    expect(profile).toMatchObject({ companyName: 'Global Foods GmbH', country: 'Germany', city: 'Hamburg' });
    expect(needs).toBeNull();
  });

  it('điền nhu cầu: nhóm hàng, chứng chỉ yêu cầu ở NHÀ CUNG CẤP, tiền tệ mặc định EUR', async () => {
    const { onComplete } = renderBuyer();
    fillStepOne();
    submitStep();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Thủy sản' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'BRCGS' }));
    fireEvent.change(screen.getByLabelText(/Khối lượng mỗi lần mua/), { target: { value: '40' } });
    expect(screen.getByLabelText(/^Tiền tệ/)).toHaveValue('EUR');
    expect(screen.getByText('Chứng chỉ bạn yêu cầu ở nhà cung cấp')).toBeInTheDocument();
    submitStep();
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    const [profile, needs] = onComplete.mock.calls[0];
    expect(profile.interest).toBe('Thủy sản');
    expect(needs).toMatchObject({ quantity: '40', certifications: ['BRCGS'], budgetCurrency: 'EUR' });
  });

  it('lỗi khi lưu hiện ngay trên form', async () => {
    renderBuyer(undefined, vi.fn().mockRejectedValue(new Error('Không thể lưu hồ sơ. Vui lòng thử lại.')));
    fillStepOne();
    submitStep();
    fireEvent.click(await screen.findByRole('button', { name: 'Bỏ qua, bổ sung sau' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể lưu hồ sơ');
  });
});
