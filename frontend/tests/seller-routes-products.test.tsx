import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OnboardingRoute, SellerProfileRoute } from '@/components/routes/AccountRoutes';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => window.location.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const ME = { id: 'u-1', email: 'a@congtyb.vn', role: 'exporter', preferred_language: 'vi' };

const COMPANY = {
  id: 'c-1',
  type: 'exporter',
  legal_name: 'Công ty B',
  tax_id: '0399999999',
  registration_number: '0399999999',
  business_type: 'TNHH',
  founded_year: 2015,
  address: 'Cần Thơ',
  website: null,
  contact_email: 'lienhe@congtyb.vn',
  description_vi: 'Thủy sản',
  description_en: 'Seafood',
  industry_sector: 'seafood',
  languages_spoken: ['vi'],
  export_markets: ['EU'],
  company_size: null,
  procurement_estimate: null,
  vat_number: null,
  sourcing_categories: [],
};

const product = (id: string, name: string) => ({
  id,
  name,
  hs_code: '100630',
  hs_formatted: '1006.30',
  hs_name_vi: 'Gạo xát',
  hs_name_en: 'Rice',
  description_vi: null,
  description_en: null,
  price_min: '480.00',
  price_max: '560.50',
  currency: 'USD',
  unit: 'tonne',
  moq: '25.00',
  moq_unit: 'tonne',
  is_active: true,
  approval_status: 'approved',
  images: [],
  created_at: '2026-09-29T00:00:00Z',
});

let calls: string[] = [];

function serve(opts: { products: ReturnType<typeof product>[]; failProduct?: number }) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      calls.push(`${req.method} ${path}`);
      if (path === '/api/me') return json(200, ME);
      if (path === '/api/me/company') return req.method === 'GET' ? json(200, COMPANY) : json(200, COMPANY);
      if (path === '/api/exporter/products' && req.method === 'GET') return json(200, opts.products);
      if (path.startsWith('/api/exporter/products')) {
        if (opts.failProduct) return json(opts.failProduct, { error: { code: 'invalid_hs_code' } });
        if (req.method === 'DELETE') return new Response(null, { status: 204 });
        return json(req.method === 'POST' ? 201 : 200, product('saved', 'Đã lưu'));
      }
      throw new Error(`unexpected ${req.method} ${path}`);
    }),
  );
}

function renderRoute(node: React.ReactNode, path: string) {
  window.history.replaceState(null, '', `/vi${path}`);
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>{node}</LanguageProvider>
    </NextIntlClientProvider>,
  );
}

const finishFromStepOne = async () => {
  await screen.findByDisplayValue('Công ty B');
  fireEvent.submit(screen.getByRole('button', { name: /^Tiếp tục$/ }).closest('form') as HTMLFormElement);
  // Mỗi bước lưu nháp lên server (A2) rồi mới sang bước sau.
  fireEvent.click(await screen.findByRole('button', { name: /Tiếp tục \(Tải lên giấy phép\)/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Tiếp tục \(Xem lại hồ sơ\)/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Hoàn tất & Gửi hồ sơ/ }));
};

describe('route hồ sơ exporter dùng sản phẩm trên server (B5)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('/exporter/profile nạp sản phẩm đã lưu, hiện mã HS và giá', async () => {
    localStorage.setItem('vybe_profiles_v2', JSON.stringify({ 'u-1': { onboardingCompleted: true, onboardingVersion: 2 } }));
    serve({ products: [product('p1', 'Gạo thơm Jasmine')] });
    renderRoute(<SellerProfileRoute />, '/exporter/profile');
    expect(await screen.findByDisplayValue('Gạo thơm Jasmine')).toBeInTheDocument();
    expect((screen.getByRole('combobox', { name: /Mã HS/ }) as HTMLInputElement).value).toBe('1006.30 — Gạo xát');
    expect(screen.getByDisplayValue('480.00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('560.50')).toBeInTheDocument();
  });

  it('chưa có sản phẩm nào trên server: hiện hướng dẫn thay vì dữ liệu mẫu', async () => {
    localStorage.setItem('vybe_profiles_v2', JSON.stringify({ 'u-1': { onboardingCompleted: true, onboardingVersion: 2 } }));
    serve({ products: [] });
    renderRoute(<SellerProfileRoute />, '/exporter/profile');
    expect(await screen.findByRole('status')).toHaveTextContent('Chưa có sản phẩm');
    expect(screen.queryByText(/Robusta/)).not.toBeInTheDocument();
  });

  it('hoàn tất onboarding: lưu công ty trước rồi đồng bộ sản phẩm (PATCH sản phẩm đã có)', async () => {
    serve({ products: [product('p1', 'Gạo thơm Jasmine')] });
    renderRoute(<OnboardingRoute />, '/exporter/onboarding');
    await finishFromStepOne();
    await waitFor(() => expect(calls).toContain('PATCH /api/exporter/products/p1'));
    const iCompany = calls.indexOf('PATCH /api/me/company');
    const iProduct = calls.indexOf('PATCH /api/exporter/products/p1');
    expect(iCompany).toBeGreaterThan(-1);
    expect(iProduct).toBeGreaterThan(iCompany);
    expect(calls).not.toContain('POST /api/exporter/products');
    expect(calls.some((c) => c.startsWith('DELETE'))).toBe(false);
  });

  it('sản phẩm bị xóa khỏi form thì bị xóa trên server', async () => {
    serve({ products: [product('p1', 'Gạo thơm Jasmine'), product('p2', 'Cà phê')] });
    renderRoute(<OnboardingRoute />, '/exporter/onboarding');
    await screen.findByDisplayValue('Công ty B');
    fireEvent.submit(screen.getByRole('button', { name: /^Tiếp tục$/ }).closest('form') as HTMLFormElement);
    fireEvent.click((await screen.findAllByRole('button', { name: /Xóa sản phẩm/ }))[1]);
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục \(Tải lên giấy phép\)/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Tiếp tục \(Xem lại hồ sơ\)/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Hoàn tất & Gửi hồ sơ/ }));
    await waitFor(() => expect(calls).toContain('DELETE /api/exporter/products/p2'));
    expect(calls).toContain('PATCH /api/exporter/products/p1');
  });

  it('server từ chối sản phẩm (422): báo lỗi có tên sản phẩm ngay ở bước 2, không sang bước sau, không đánh dấu hoàn tất', async () => {
    serve({ products: [product('p1', 'Gạo thơm Jasmine')], failProduct: 422 });
    renderRoute(<OnboardingRoute />, '/exporter/onboarding');
    await screen.findByDisplayValue('Công ty B');
    fireEvent.submit(screen.getByRole('button', { name: /^Tiếp tục$/ }).closest('form') as HTMLFormElement);
    fireEvent.click(await screen.findByRole('button', { name: /Tiếp tục \(Tải lên giấy phép\)/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sản phẩm "Gạo thơm Jasmine" chưa hợp lệ');
    expect(screen.queryByRole('button', { name: /Tiếp tục \(Xem lại hồ sơ\)/ })).not.toBeInTheDocument();
    expect(localStorage.getItem('vybe_profiles_v2') ?? '').not.toContain('onboardingCompleted');
  });
});
