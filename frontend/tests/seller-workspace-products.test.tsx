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

const COMPANY = {
  id: 'c1', slug: 'cong-ty-a', type: 'exporter', legal_name: 'Công ty A', registration_number: null, tax_id: '0312345678',
  business_type: 'manufacturer', country: 'VN', industry_sector: 'agriculture', founded_year: 2015, address: null,
  website: null, contact_email: 'a@congtya.vn', description_vi: null, description_en: null, logo_key: null, export_markets: [],
  industry_other: null, phone: null, legal_rep_name: null, legal_rep_title: null, issuing_authority: null, offering_type: 'products',
  factory_address: null, capacity_value: null, capacity_unit: null, capacity_period: null, main_customers: null, location_public: false, facility_codes: [],
  languages_spoken: [], company_size: null, procurement_estimate: null, vat_number: null, eori_number: null, hide_profile_views: false, sourcing_categories: [],
  verification_status: 'unverified', verification_level: 'basic', verified_at: null, expires_at: null,
  profile_completeness_score: '40.00', created_at: '2026-09-29T00:00:00Z', updated_at: '2026-09-29T00:00:00Z',
};

function serve(products: unknown[] | 'error', tariff: unknown = null, company: unknown = null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === '/api/me/company' && company) return json(200, company);
      if (path === '/api/exporter/evidences') return json(200, []);
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

  it('hành trình có bước Sản phẩm (rail bên + rail mobile) mở tab sản phẩm thật', async () => {
    serve([product(), product({ id: 'p2', name: 'Cà phê' })]);
    renderWorkspace('overview');
    const rails = await screen.findAllByRole('button', { name: /^(1|2|3|✓)?\s*Sản phẩm$/ });
    expect(rails.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(rails[0]);
    expect(await screen.findByRole('heading', { name: 'Gạo thơm Jasmine' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Cà phê' })).toBeInTheDocument();
  });

  it('tab Hồ sơ có danh sách sản phẩm rút gọn từ server, bấm Quản lý sang tab Sản phẩm', async () => {
    serve([product()], null, COMPANY);
    renderWorkspace('profile');
    const section = (await screen.findByRole('heading', { name: 'Sản phẩm cung cấp' })).closest('section') as HTMLElement;
    expect(await within(section).findByText('Gạo thơm Jasmine')).toBeInTheDocument();
    fireEvent.click(within(section).getByRole('button', { name: /Quản lý/ }));
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
