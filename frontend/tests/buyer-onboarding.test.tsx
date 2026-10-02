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

/** Điền bước 1, bỏ qua bước 2, dừng ở bước 3 (nhu cầu mua hàng). */
async function toNeedsStep() {
  fillStepOne();
  submitStep();
  fireEvent.click(await screen.findByRole('button', { name: 'Bỏ qua, bổ sung sau' }));
  await screen.findByText('Bước 3 / 4');
}
/** Từ bước 3 sang bước 4 rồi hoàn tất. */
async function finishFromNeeds() {
  submitStep();
  await screen.findByTestId('buyer-review');
  submitStep();
}

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

  it('có 4 bước như seller: thông tin doanh nghiệp, giấy phép & chứng nhận, nhu cầu mua hàng, xác nhận & hoàn tất', () => {
    renderBuyer();
    const steps = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(steps).toEqual(['1Thông tin doanh nghiệp', '2Giấy phép & chứng nhận', '3Nhu cầu mua hàng', '4Xác nhận & hoàn tất']);
    expect(screen.getByText('Bước 1 / 4')).toBeInTheDocument();
  });

  it('bước 2 chỉ khai mã định danh, không tải file; bỏ qua được và sang thẳng bước 3', async () => {
    renderBuyer();
    fillStepOne();
    submitStep();
    expect(await screen.findByText('Bước 2 / 4')).toBeInTheDocument();
    expect(screen.getByLabelText(/Mã số VAT/)).not.toBeRequired();
    expect(screen.getByLabelText(/Số đăng ký doanh nghiệp/)).not.toBeRequired();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua, bổ sung sau' }));
    expect(await screen.findByText('Bước 3 / 4')).toBeInTheDocument();
  });

  it('bước 2: các trường tra registry EU (VAT, số đăng ký, LEI, cơ quan và địa chỉ đăng ký), không có ô gửi yêu cầu xác minh', async () => {
    renderBuyer();
    fillStepOne();
    submitStep();
    await screen.findByText('Bước 2 / 4');
    for (const label of [/Mã số VAT/, /Số đăng ký doanh nghiệp/, /Mã LEI/, /Cơ quan đăng ký/, /Địa chỉ đăng ký/]) {
      expect(screen.getByLabelText(label)).not.toBeRequired();
    }
    expect(screen.queryByRole('checkbox', { name: /xác minh/ })).not.toBeInTheDocument();
  });

  it('bước 2: mã LEI sai định dạng thì báo lỗi và ở lại bước 2; đúng thì chuẩn hoá chữ hoa và đi tiếp', async () => {
    renderBuyer();
    fillStepOne();
    submitStep();
    fireEvent.change(await screen.findByLabelText(/Mã LEI/), { target: { value: 'ABC' } });
    submitStep();
    expect(await screen.findByRole('alert')).toHaveTextContent('Mã LEI gồm 20 ký tự');
    expect(screen.getByText('Bước 2 / 4')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Mã LEI/), { target: { value: '5493 001kjtiigc8y1r12' } });
    submitStep();
    expect(await screen.findByText('Bước 3 / 4')).toBeInTheDocument();
  });

  it('bước 3 bắt buộc có nhóm hàng (để ghép nhà cung cấp): chưa chọn thì báo lỗi và không sang bước 4', async () => {
    const { onComplete } = renderBuyer();
    fillStepOne();
    submitStep();
    fireEvent.click(await screen.findByRole('button', { name: 'Bỏ qua, bổ sung sau' }));
    await screen.findByText('Bước 3 / 4');
    expect(screen.queryByRole('button', { name: 'Bỏ qua, bổ sung sau' })).not.toBeInTheDocument();
    submitStep();
    expect(await screen.findByRole('alert')).toHaveTextContent('chọn ít nhất một nhóm hàng');
    expect(screen.getByText('Bước 3 / 4')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Thủy sản' }));
    submitStep();
    expect(await screen.findByText('Bước 4 / 4')).toBeInTheDocument();
  });

  it('bước 4 hiện bản xem lại, cho sửa từng phần rồi hoàn tất; hồ sơ mang theo mã định danh, LEI chuẩn hoá', async () => {
    const { onComplete } = renderBuyer();
    fillStepOne();
    submitStep();
    fireEvent.change(await screen.findByLabelText(/Mã số VAT/), { target: { value: 'DE123456789' } });
    fireEvent.change(screen.getByLabelText(/Mã LEI/), { target: { value: '5493001kjtiigc8y1r12' } });
    fireEvent.change(screen.getByLabelText(/Cơ quan đăng ký/), { target: { value: 'Handelsregister Hamburg' } });
    fireEvent.change(screen.getByLabelText(/Địa chỉ đăng ký/), { target: { value: 'Hafenstraße 12, 20457 Hamburg' } });
    submitStep();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Thủy sản' }));
    submitStep();
    const review = await screen.findByTestId('buyer-review');
    expect(review).toHaveTextContent('Global Foods GmbH');
    expect(review).toHaveTextContent('DE123456789');
    expect(review).toHaveTextContent('5493001KJTIIGC8Y1R12');
    expect(review).toHaveTextContent('Handelsregister Hamburg');
    expect(review).toHaveTextContent('Sẽ gửi tự động khi hoàn tất');
    expect(review).toHaveTextContent('Thủy sản');
    // Sửa: quay lại bước 1 từ bản xem lại.
    fireEvent.click(screen.getByRole('button', { name: /Sửa: Thông tin doanh nghiệp/ }));
    expect(await screen.findByText('Bước 1 / 4')).toBeInTheDocument();
    expect(screen.getByLabelText(/Tên công ty/)).toHaveValue('Global Foods GmbH');
    submitStep();
    submitStep();
    submitStep();
    await screen.findByTestId('buyer-review');
    submitStep();
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const [profile, needs] = onComplete.mock.calls[0];
    expect(profile).toMatchObject({
      vatNumber: 'DE123456789',
      leiCode: '5493001KJTIIGC8Y1R12',
      issuingAuthority: 'Handelsregister Hamburg',
      address: 'Hafenstraße 12, 20457 Hamburg',
      interest: 'Thủy sản',
    });
    expect(needs).not.toBeNull();
  });

  it('bản xem lại: chưa khai mã thì "Yêu cầu xác minh" là Chưa khai', async () => {
    renderBuyer();
    await toNeedsStep();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Thủy sản' }));
    submitStep();
    const review = await screen.findByTestId('buyer-review');
    expect(review).toHaveTextContent('Yêu cầu xác minh: Chưa khai');
    expect(review).not.toHaveTextContent('Sẽ gửi tự động');
  });

  it('điền nhu cầu: nhóm hàng, chứng chỉ yêu cầu ở NHÀ CUNG CẤP, tiền tệ mặc định EUR', async () => {
    const { onComplete } = renderBuyer();
    await toNeedsStep();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Thủy sản' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'BRCGS' }));
    fireEvent.change(screen.getByLabelText(/Khối lượng mỗi lần mua/), { target: { value: '40' } });
    expect(screen.getByLabelText(/^Tiền tệ/)).toHaveValue('EUR');
    expect(screen.getByText('Chứng chỉ bạn yêu cầu ở nhà cung cấp')).toBeInTheDocument();
    await finishFromNeeds();
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    const [profile, needs] = onComplete.mock.calls[0];
    expect(profile.interest).toBe('Thủy sản');
    expect(needs).toMatchObject({ quantity: '40', certifications: ['BRCGS'], budgetCurrency: 'EUR' });
  });

  it('B11: chứng chỉ ngoài danh sách gợi ý nhập ở ô "Chứng chỉ khác", cùng tồn tại với mục đã tick', async () => {
    const { onComplete } = renderBuyer();
    await toNeedsStep();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Thủy sản' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'BRCGS' }));
    fireEvent.change(screen.getByLabelText(/Chứng chỉ khác/), { target: { value: 'SMETA, Kosher,  , SMETA' } });
    await finishFromNeeds();
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    const [, needs] = onComplete.mock.calls[0];
    expect(needs.certifications).toEqual(['BRCGS', 'SMETA', 'Kosher']);
  });

  it('lỗi khi lưu hiện ngay trên form', async () => {
    renderBuyer(undefined, vi.fn().mockRejectedValue(new Error('Không thể lưu hồ sơ. Vui lòng thử lại.')));
    await toNeedsStep();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Thủy sản' }));
    await finishFromNeeds();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể lưu hồ sơ');
  });
});
