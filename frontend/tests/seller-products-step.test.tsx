import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import SellerOnboarding from '@/components/SellerOnboarding';
import { LanguageProvider } from '@/context/LanguageContext';
import type { DemoUser } from '@/lib/demoAuth';
import { emptyDraft, type ProductDraft } from '@/lib/productsApi';

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

const RICE = { code: '100630', formatted: '1006.30', name_vi: 'Gạo xát', name_en: 'Semi-milled or wholly milled rice' };
const valid = (name = 'Gạo thơm'): ProductDraft => ({ ...emptyDraft(), name, hs: RICE, pricingMode: 'estimate', priceMin: '480', priceMax: '560', unit: 'tonne', moq: '25', moqUnit: 'tonne' });

interface Options {
  initialStep?: number;
  initialCompany?: Record<string, string>;
  initialProducts?: ProductDraft[];
  onComplete?: (profile: Record<string, string>, products: ProductDraft[]) => void | Promise<void>;
}

function renderOnboarding({ initialStep = 2, initialCompany, initialProducts, onComplete }: Options = {}) {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <SellerOnboarding
          account={ACCOUNT}
          initialStep={initialStep}
          initialCompany={initialCompany}
          initialProducts={initialProducts}
          onComplete={onComplete}
          onLogout={vi.fn()}
          onNavigateHome={vi.fn()}
        />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

const nextFromStepTwo = () => fireEvent.click(screen.getByRole('button', { name: /Tiếp tục \(Tải lên giấy phép\)/ }));

describe('SellerOnboarding bước 2 — sản phẩm (B5)', () => {
  it('không còn sản phẩm demo điền sẵn: hiện hướng dẫn thêm sản phẩm', () => {
    renderOnboarding();
    expect(screen.getByRole('status')).toHaveTextContent('Chưa có sản phẩm');
    expect(screen.queryByText(/Robusta/)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(/Hạt điều nhân/)).not.toBeInTheDocument();
    expect(screen.queryAllByRole('img').filter((img) => (img.getAttribute('src') ?? '').includes('unsplash'))).toEqual([]);
  });

  it('bỏ các thành phần của form cũ: sản phẩm chính, quy cách, năng lực, thị trường theo sản phẩm, gợi ý mẫu', () => {
    renderOnboarding({ initialProducts: [valid()] });
    for (const gone of [/Sản phẩm chính/, /Năng lực cung ứng/, /Gạo ST25 Hữu Cơ/, /Thêm thị trường/]) {
      expect(screen.queryByText(gone)).not.toBeInTheDocument();
    }
    expect(screen.queryByTitle(/Thêm thị trường/)).not.toBeInTheDocument();
  });

  it('chỉ có một nút "Thêm sản phẩm" và nó thêm một thẻ trống', () => {
    renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: /Thêm sản phẩm/ }));
    expect(screen.getAllByRole('group', { name: /^Sản phẩm \d+/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Thêm sản phẩm/ })).toHaveLength(1);
  });

  it('chưa có sản phẩm nào thì không qua được bước 2', () => {
    renderOnboarding();
    nextFromStepTwo();
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng thêm ít nhất một sản phẩm.');
    expect(screen.queryByRole('button', { name: /Tiếp tục \(Xem lại hồ sơ\)/ })).not.toBeInTheDocument();
  });

  it('sản phẩm thiếu mã HS thì không qua được bước 2 và báo tên sản phẩm', () => {
    renderOnboarding({ initialProducts: [{ ...emptyDraft(), name: 'Gạo ST25' }] });
    nextFromStepTwo();
    expect(screen.getByRole('alert')).toHaveTextContent('Sản phẩm "Gạo ST25" chưa chọn mã HS.');
    expect(screen.queryByRole('button', { name: /Tiếp tục \(Xem lại hồ sơ\)/ })).not.toBeInTheDocument();
  });

  it('giá không hợp lệ cũng chặn ở bước 2', () => {
    renderOnboarding({ initialProducts: [{ ...valid(), priceMin: '600', priceMax: '500' }] });
    nextFromStepTwo();
    expect(screen.getByRole('alert')).toHaveTextContent('Giá thấp nhất không được lớn hơn giá cao nhất.');
  });

  it('sản phẩm hợp lệ thì sang bước 3, lỗi cũ được xóa', async () => {
    renderOnboarding({ initialProducts: [valid()] });
    nextFromStepTwo();
    expect(await screen.findByRole('button', { name: /Tiếp tục \(Xem lại hồ sơ\)/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('SellerOnboarding bước 2 — năng lực và thị trường xuất khẩu cấp công ty (U2)', () => {
  it('có ô chọn thị trường xuất khẩu (không giới hạn ở EU); nạp sẵn từ hồ sơ đã lưu', () => {
    renderOnboarding({ initialStep: 2, initialCompany: { markets: 'EU,DE,US' } });
    expect(screen.getByRole('checkbox', { name: 'Châu Âu (EU)' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Germany' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'United States' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'France' })).not.toBeChecked();
  });

  it('tick / bỏ tick cập nhật lựa chọn', () => {
    renderOnboarding({ initialStep: 2 });
    const fr = screen.getByRole('checkbox', { name: 'France' });
    fireEvent.click(fr);
    expect(fr).toBeChecked();
    fireEvent.click(fr);
    expect(fr).not.toBeChecked();
  });

  it('có khu năng lực đáp ứng: sản lượng, quy mô nhân sự, mã vùng trồng', () => {
    renderOnboarding({ initialStep: 2, initialCompany: { growingAreaCodes: 'VN-DL-1' } });
    expect(screen.getByRole('heading', { name: 'Năng lực đáp ứng' })).toBeInTheDocument();
    expect(screen.getByLabelText('Sản lượng có thể cung cấp')).toBeInTheDocument();
    expect(screen.getByLabelText('Quy mô nhân sự')).toBeInTheDocument();
    expect(screen.getByLabelText('Mã số vùng trồng')).toHaveValue('VN-DL-1');
  });
});

describe('SellerOnboarding — sản phẩm hay dịch vụ (U2)', () => {
  it('bước 1 hỏi doanh nghiệp cung cấp gì, mặc định là sản phẩm', () => {
    renderOnboarding({ initialStep: 1 });
    expect(screen.getByRole('radio', { name: /^Sản phẩm/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^Dịch vụ/ })).not.toBeChecked();
  });

  it('chỉ làm dịch vụ: bước 2 hỏi dịch vụ, không hỏi sản phẩm hay năng lực nhà máy', () => {
    renderOnboarding({ initialStep: 2, initialCompany: { offeringType: 'services' } });
    expect(screen.getByRole('heading', { name: 'Dịch vụ cung cấp' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sản phẩm cung cấp' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Năng lực đáp ứng' })).not.toBeInTheDocument();
  });

  it('chỉ làm dịch vụ mà chưa thêm dịch vụ nào thì không qua được bước 2', () => {
    renderOnboarding({ initialStep: 2, initialCompany: { offeringType: 'services' } });
    nextFromStepTwo();
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng thêm ít nhất một dịch vụ.');
  });

  it('cơ quan cấp cũ "Sở Kế hoạch và Đầu tư" được báo tên hiện hành', () => {
    renderOnboarding({ initialStep: 1, initialCompany: { issuingAuthority: 'Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh' } });
    expect(screen.getByText('Sở Tài chính TP. Hồ Chí Minh')).toBeInTheDocument();
  });
});

describe('SellerOnboarding hoàn tất — gửi hồ sơ và danh sách sản phẩm (B5)', () => {
  const walkToFinish = async () => {
    fireEvent.submit(screen.getByRole('button', { name: /^Tiếp tục$/ }).closest('form') as HTMLFormElement);
    nextFromStepTwo();
    fireEvent.click(await screen.findByRole('button', { name: /Tiếp tục \(Xem lại hồ sơ\)/ }));
  };
  const commitmentBox = () => screen.getByRole('checkbox', { name: /Tôi cam kết/ });

  it('chưa tick cam kết thì nút gửi bị khóa và không gọi onComplete; tick rồi mới gửi được', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    renderOnboarding({ initialStep: 1, initialCompany: { taxCode: '0312345678' }, initialProducts: [valid()], onComplete });
    await walkToFinish();
    expect(commitmentBox()).not.toBeChecked();
    const send = screen.getByRole('button', { name: /Hoàn tất & Gửi hồ sơ/ });
    expect(send).toBeDisabled();
    fireEvent.click(send);
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(commitmentBox());
    expect(send).toBeEnabled();
  });

  it('onComplete nhận hồ sơ (thị trường theo mã, không còn "market" cũ) và danh sách bản nháp', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    const products = [valid('Gạo thơm'), valid('Cà phê')];
    renderOnboarding({
      initialStep: 1,
      initialCompany: { taxCode: '0312345678', markets: 'EU,FR' },
      initialProducts: products,
      onComplete,
    });
    await walkToFinish();
    expect(screen.getAllByText(/Gạo thơm/).length).toBeGreaterThan(0); // trang xem lại hiện sản phẩm mới
    expect(screen.getAllByText(/1006\.30/).length).toBeGreaterThan(0);
    fireEvent.click(commitmentBox());
    fireEvent.click(screen.getByRole('button', { name: /Hoàn tất & Gửi hồ sơ/ }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const [profile, sent] = onComplete.mock.calls[0];
    expect(profile).toMatchObject({ companyName: 'Công ty A', taxCode: '0312345678', markets: 'EU,FR', agreeCommitment: 'true' });
    expect(profile).not.toHaveProperty('market');
    // Không còn chứng chỉ/mã vùng trồng mẫu trong hồ sơ gửi đi (bằng chứng thật lưu trên server, C6).
    for (const gone of ['certificates', 'pucCode', 'phcCode']) expect(profile).not.toHaveProperty(gone);
    expect(JSON.parse(profile.products)).toEqual([{ name: 'Gạo thơm' }, { name: 'Cà phê' }]);
    expect(profile.interest).toBe('1006.30');
    expect(sent).toEqual(products);
  });

  it('lỗi từ server hiện ngay trên form, người dùng không mất dữ liệu', async () => {
    const onComplete = vi.fn().mockRejectedValue(new Error('Sản phẩm "Gạo thơm" chưa hợp lệ. Vui lòng kiểm tra mã HS, giá và ảnh.'));
    renderOnboarding({ initialStep: 1, initialCompany: { taxCode: '0312345678' }, initialProducts: [valid()], onComplete });
    await walkToFinish();
    fireEvent.click(commitmentBox());
    fireEvent.click(screen.getByRole('button', { name: /Hoàn tất & Gửi hồ sơ/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sản phẩm "Gạo thơm" chưa hợp lệ');
    expect(screen.getByRole('button', { name: /Hoàn tất & Gửi hồ sơ/ })).toBeEnabled();
  });
});
