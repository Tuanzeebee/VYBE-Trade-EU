import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BuyerProfile from '@/components/BuyerProfile';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/buyer/profile',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const COMPANY = {
  id: 'b-1', slug: 'global-foods', type: 'buyer', legal_name: 'Global Foods GmbH', registration_number: null, tax_id: null,
  business_type: 'importer', country: 'DE', industry_sector: null, industry_other: null, founded_year: null, address: null,
  website: null, contact_email: 'a@gf.de', phone: null, contact_name: 'Anna', city: 'Hamburg', legal_rep_name: null,
  legal_rep_title: null, issuing_authority: null, description_vi: null, description_en: null, logo_key: null,
  offering_type: null, factory_address: null, capacity_value: null, capacity_unit: null, capacity_period: null,
  main_customers: null, location_public: false, facility_codes: [], export_markets: [], languages_spoken: [],
  company_size: null, procurement_estimate: null, vat_number: null, eori_number: null, sourcing_categories: ['seafood'],
  verification_status: 'unverified', verification_level: 'basic', verified_at: null, expires_at: null,
  profile_completeness_score: '0.00', created_at: '2026-09-29T00:00:00Z', updated_at: '2026-09-29T00:00:00Z',
};

function serve(calls: { method: string; path: string; body?: unknown }[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      const body = ['PUT', 'PATCH', 'POST'].includes(req.method) ? await req.json() : undefined;
      calls.push({ method: req.method, path, body });
      if (path === '/api/me/company') return json(200, COMPANY);
      if (path === '/api/buyer/sourcing-needs') {
        return json(200, req.method === 'PUT' ? body : { products_text: 'Phi lê cá tra', budget_currency: 'EUR', certifications_wanted: [] });
      }
      throw new Error(`unexpected ${req.method} ${path}`);
    }),
  );
}

function renderProfile() {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <BuyerProfile />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

describe('Hồ sơ công ty của buyer (U5)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('nạp hồ sơ và nhu cầu từ server; lưu gửi cả công ty lẫn nhu cầu', async () => {
    const calls: { method: string; path: string; body?: unknown }[] = [];
    serve(calls);
    renderProfile();
    expect(await screen.findByDisplayValue('Global Foods GmbH')).toBeInTheDocument();
    expect(screen.getByLabelText(/Thành phố/)).toHaveValue('Hamburg');
    fireEvent.click(screen.getByRole('tab', { name: 'Nhu cầu mua hàng' }));
    expect(screen.getByLabelText(/Sản phẩm cụ thể/)).toHaveValue('Phi lê cá tra');
    fireEvent.change(screen.getByLabelText(/Sản phẩm cụ thể/), { target: { value: 'Tôm thẻ đông lạnh' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Đã lưu hồ sơ');
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH' && c.path === '/api/me/company')).toBe(true));
    expect(calls.find((c) => c.method === 'PUT')?.body).toMatchObject({ products_text: 'Tôm thẻ đông lạnh' });
  });
});
