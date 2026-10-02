import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OnboardingRoute } from '@/components/routes/OnboardingRoute';
import { SellerProfileRoute } from '@/components/routes/SellerProfileRoute';
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

function serve(company: Record<string, unknown> | null, onboarded: boolean) {
  if (onboarded) {
    localStorage.setItem('vybe_profiles_v2', JSON.stringify({ 'u-1': { onboardingCompleted: true, onboardingVersion: 2 } }));
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === '/api/me') return json(200, ME);
      if (path === '/api/me/company') return company ? json(200, company) : json(404, {});
      throw new Error(`unexpected ${path}`);
    }),
  );
}

const COMPANY = {
  id: 'c-1',
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
};

function renderRoute(node: React.ReactNode, path: string) {
  window.history.replaceState(null, '', `/vi${path}`);
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>{node}</LanguageProvider>
    </NextIntlClientProvider>,
  );
}

describe('route hồ sơ doanh nghiệp dùng dữ liệu server', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('/exporter/profile nạp hồ sơ đã lưu trên server', async () => {
    serve(COMPANY, true);
    renderRoute(<SellerProfileRoute />, '/exporter/profile');
    // Trang sửa hồ sơ cũ mở ở bước 2 (sản phẩm) — bấm về bước 1 như người dùng.
    const [stepOne] = await screen.findAllByText('Thông tin doanh nghiệp');
    fireEvent.click(stepOne);
    expect(await screen.findByDisplayValue('Công ty B')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0399999999')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Seafood')).toBeInTheDocument();
  });

  it('onboarding lần đầu (chưa có hồ sơ trên server) bắt đầu với form trống', async () => {
    serve(null, false);
    renderRoute(<OnboardingRoute />, '/exporter/onboarding');
    expect(await screen.findByDisplayValue('a@congtyb.vn')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Công ty B')).not.toBeInTheDocument();
  });

  it('onboarding dở dang trên thiết bị khác: nạp lại hồ sơ đã lưu', async () => {
    serve(COMPANY, false);
    renderRoute(<OnboardingRoute />, '/exporter/onboarding');
    expect(await screen.findByDisplayValue('Công ty B')).toBeInTheDocument();
  });
});
