import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SellerWorkspace from '@/components/SellerWorkspace';
import { LanguageProvider } from '@/context/LanguageContext';
import type { DemoUser } from '@/lib/demoAuth';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const ACCOUNT: DemoUser = {
  id: 'u-1',
  name: 'Nguyễn A',
  email: 'a@congtya.vn',
  company: 'Công ty A',
  role: 'seller',
  onboardingCompleted: true,
  onboardingVersion: 2,
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const product = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  name: 'Gạo thơm Jasmine',
  hs_code: '100630',
  hs_formatted: '1006.30',
  hs_name_vi: 'Gạo xát',
  hs_name_en: 'Semi-milled or wholly milled rice',
  description_vi: 'Gạo thơm hạt dài.',
  description_en: 'Long-grain fragrant rice.',
  price_min: '480.00',
  price_max: '560.50',
  currency: 'USD',
  unit: 'tonne',
  moq: '25.00',
  moq_unit: 'tonne',
  is_active: true,
  approval_status: 'approved',
  images: [{ key: 'products/c/1.png', url: 'https://cdn.test/1.png' }],
  created_at: '2026-09-29T00:00:00Z',
  ...over,
});

function serve(products: unknown[] | 'error', tariff: unknown = null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === '/api/exporter/products') {
        return products === 'error' ? json(500, {}) : json(200, products);
      }
      if (path === '/api/exporter/tariff-preview' && tariff) return json(200, tariff);
      throw new Error(`unexpected ${path}`);
    }),
  );
}

function renderWorkspace(initialTab: 'products' | 'profile' | 'overview') {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <SellerWorkspace
          account={ACCOUNT}
          initialTab={initialTab}
          onLogout={vi.fn()}
          onNavigateHome={vi.fn()}
          onNavigateOnboarding={vi.fn()}
        />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

describe('SellerWorkspace — sản phẩm lấy từ server (B5)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('tab Sản phẩm hiện sản phẩm thật: tên, mã HS, giá, MOQ, ảnh, mô tả', async () => {
    serve([product()]);
    renderWorkspace('products');
    const heading = await screen.findByRole('heading', { name: 'Gạo thơm Jasmine' });
    const card = heading.closest('div.rounded-3xl') as HTMLElement;
    expect(within(card).getByText(/1006\.30/)).toBeInTheDocument();
    expect(within(card).getByText(/Gạo xát/)).toBeInTheDocument();
    expect(within(card).getByText('480.00 – 560.50 USD / Tấn')).toBeInTheDocument();
    expect(within(card).getByText('25.00 Tấn')).toBeInTheDocument();
    expect(within(card).getByText('Gạo thơm hạt dài.')).toBeInTheDocument();
    expect(within(card).getByRole('img', { name: 'Gạo thơm Jasmine' })).toHaveAttribute('src', 'https://cdn.test/1.png');
  });

  it('không còn danh sách demo và các dòng của form cũ', async () => {
    serve([product()]);
    renderWorkspace('products');
    await screen.findByRole('heading', { name: 'Gạo thơm Jasmine' });
    for (const gone of [/Robusta Đắk Lắk/, /Hạt điều nhân xuất khẩu W240/, /Sản phẩm chủ lực/, /Năng lực:/, /Thị trường:/]) {
      expect(screen.queryByText(gone)).not.toBeInTheDocument();
    }
  });

  it('chưa có sản phẩm: hiện hướng dẫn, không để trống', async () => {
    serve([]);
    renderWorkspace('products');
    expect(await screen.findByRole('status')).toHaveTextContent('Chưa có sản phẩm');
  });

  it('sản phẩm đang ẩn được đánh dấu; sản phẩm không có ảnh/giá không làm hỏng thẻ', async () => {
    serve([product({ id: 'p2', name: 'Chưa có giá', is_active: false, images: [], price_min: null, price_max: null, moq: null, moq_unit: null })]);
    renderWorkspace('products');
    const heading = await screen.findByRole('heading', { name: 'Chưa có giá' });
    const card = heading.closest('div.rounded-3xl') as HTMLElement;
    expect(within(card).getByText('Đang ẩn')).toBeInTheDocument();
    expect(within(card).queryByRole('img')).not.toBeInTheDocument();
    expect(within(card).getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('server lỗi: báo lỗi nhẹ nhàng thay vì hiện sai là chưa có sản phẩm', async () => {
    serve('error');
    renderWorkspace('products');
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được danh sách sản phẩm');
    expect(screen.queryByText(/Chưa có sản phẩm/)).not.toBeInTheDocument();
  });

  it('nút Sản phẩm trong menu hiện đúng số lượng thật', async () => {
    serve([product(), product({ id: 'p2', name: 'Cà phê' })]);
    renderWorkspace('overview');
    const [nav] = await screen.findAllByRole('button', { name: /Sản phẩm xuất khẩu/ }); // menu bên + menu mobile
    expect(nav).toHaveTextContent('2');
  });

  it('tab Hồ sơ (mặc định) có danh sách sản phẩm rút gọn từ server, bấm Quản lý sang tab Sản phẩm', async () => {
    serve([product()]);
    renderWorkspace('profile');
    expect(await screen.findByText('Gạo thơm Jasmine')).toBeInTheDocument();
    const block = screen.getByText('4. Sản phẩm xuất khẩu').closest('div.rounded-3xl') as HTMLElement;
    fireEvent.click(within(block).getByRole('button', { name: /Quản lý \(1\)/ }));
    expect(await screen.findByRole('heading', { name: 'Gạo thơm Jasmine' })).toBeInTheDocument();
  });

  it('tab Sản phẩm: bấm "Xem thuế MFN / EVFTA" mở đủ thông tin thuế của sản phẩm đó', async () => {
    serve([product()], {
      status: 'ok',
      hs_code: '100630',
      hs_formatted: '1006.30',
      mfn_rate: '12.0000',
      evfta_rate: '6.0000',
      staging_category: 'B5',
      zero_from: '2030-01-01',
      quota_note: null,
      condition_note: 'Cần EUR.1',
      quota_note_en: null,
      condition_note_en: null,
      source_url: 'https://example.test/tariff',
    });
    renderWorkspace('products');
    const heading = await screen.findByRole('heading', { name: 'Gạo thơm Jasmine' });
    const card = heading.closest('div.rounded-3xl') as HTMLElement;
    expect(within(card).queryByText(/MFN 12%/)).not.toBeInTheDocument(); // chưa bấm: chưa tra
    const toggle = within(card).getByRole('button', { name: /Xem thuế MFN/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(await within(card).findByText(/MFN 12%/)).toBeInTheDocument();
    expect(within(card).getByText('Cần EUR.1')).toBeInTheDocument();
    expect(within(card).getByText('B5')).toBeInTheDocument();
  });
});
