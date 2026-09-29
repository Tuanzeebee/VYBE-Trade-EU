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
const valid = (name = 'Gạo thơm'): ProductDraft => ({ ...emptyDraft(), name, hs: RICE, priceMin: '480', priceMax: '560' });

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
    for (const gone of [/Sản phẩm chính/, /Quy cách đóng gói/, /Năng lực cung ứng/, /Gạo ST25 Hữu Cơ/, /Thêm thị trường/]) {
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

  it('sản phẩm hợp lệ thì sang bước 3, lỗi cũ được xóa', () => {
    renderOnboarding({ initialProducts: [valid()] });
    nextFromStepTwo();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tiếp tục \(Xem lại hồ sơ\)/ })).toBeInTheDocument();
  });
});

describe('SellerOnboarding bước 1 — thị trường xuất khẩu cấp công ty (B5)', () => {
  it('có ô chọn thị trường xuất khẩu; nạp sẵn từ hồ sơ đã lưu', () => {
    renderOnboarding({ initialStep: 1, initialCompany: { markets: 'EU,JP' } });
    expect(screen.getByRole('checkbox', { name: 'Châu Âu (EU)' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Nhật Bản' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Hoa Kỳ' })).not.toBeChecked();
  });

  it('tick / bỏ tick cập nhật lựa chọn', () => {
    renderOnboarding({ initialStep: 1 });
    const us = screen.getByRole('checkbox', { name: 'Hoa Kỳ' });
    fireEvent.click(us);
    expect(us).toBeChecked();
    fireEvent.click(us);
    expect(us).not.toBeChecked();
  });
});

describe('SellerOnboarding hoàn tất — gửi hồ sơ và danh sách sản phẩm (B5)', () => {
  const walkToFinish = () => {
    fireEvent.submit(screen.getByRole('button', { name: /^Tiếp tục$/ }).closest('form') as HTMLFormElement);
    nextFromStepTwo();
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục \(Xem lại hồ sơ\)/ }));
  };

  it('onComplete nhận hồ sơ (thị trường theo mã, không còn "market" cũ) và danh sách bản nháp', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    const products = [valid('Gạo thơm'), valid('Cà phê')];
    renderOnboarding({
      initialStep: 1,
      initialCompany: { taxCode: '0312345678', markets: 'EU,US' },
      initialProducts: products,
      onComplete,
    });
    walkToFinish();
    expect(screen.getAllByText(/Gạo thơm/).length).toBeGreaterThan(0); // trang xem lại hiện sản phẩm mới
    expect(screen.getAllByText(/1006\.30/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Hoàn tất & Gửi hồ sơ/ }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const [profile, sent] = onComplete.mock.calls[0];
    expect(profile).toMatchObject({ companyName: 'Công ty A', taxCode: '0312345678', markets: 'EU,US', agreeCommitment: 'true' });
    expect(profile).not.toHaveProperty('market');
    expect(JSON.parse(profile.products)).toEqual([{ name: 'Gạo thơm' }, { name: 'Cà phê' }]);
    expect(profile.interest).toBe('1006.30');
    expect(sent).toEqual(products);
  });

  it('lỗi từ server hiện ngay trên form, người dùng không mất dữ liệu', async () => {
    const onComplete = vi.fn().mockRejectedValue(new Error('Sản phẩm "Gạo thơm" chưa hợp lệ. Vui lòng kiểm tra mã HS, giá và ảnh.'));
    renderOnboarding({ initialStep: 1, initialCompany: { taxCode: '0312345678' }, initialProducts: [valid()], onComplete });
    walkToFinish();
    fireEvent.click(screen.getByRole('button', { name: /Hoàn tất & Gửi hồ sơ/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sản phẩm "Gạo thơm" chưa hợp lệ');
    expect(screen.getByRole('button', { name: /Hoàn tất & Gửi hồ sơ/ })).toBeEnabled();
  });
});
