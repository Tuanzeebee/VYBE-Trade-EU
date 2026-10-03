import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  company_size: null, procurement_estimate: null, vat_number: 'DE123456789', eori_number: null, hide_profile_views: false, sourcing_categories: ['seafood'],
  verification_status: 'unverified', verification_level: 'basic', verified_at: null, expires_at: null,
  profile_completeness_score: '0.00', created_at: '2026-09-29T00:00:00Z', updated_at: '2026-09-29T00:00:00Z',
};

let company: Record<string, unknown> = COMPANY;
let requests: unknown[] = [];

function serve(calls: { method: string; path: string; body?: unknown }[], over: Record<string, unknown> = {}, history: unknown[] = []) {
  company = { ...COMPANY, ...over };
  requests = history;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      const raw = await req.text();
      const body = raw ? JSON.parse(raw) : undefined;
      calls.push({ method: req.method, path, body });
      if (path === '/api/me/company') return json(200, company);
      if (path === '/api/buyer/verification-requests') {
        if (req.method === 'POST') {
          company = { ...company, verification_status: 'pending' };
          return json(201, { id: 'vr-1', company_id: 'b-1', status: 'pending', evidence_ids: [], submitted_at: '2026-10-01T00:00:00Z', reviewed_at: null, decision_reason: null });
        }
        return json(200, requests);
      }
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

describe('Xác minh buyer tùy chọn (U6)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('chưa xác minh: nói rõ không bắt buộc, gửi yêu cầu thì chuyển sang chờ duyệt', async () => {
    const calls: { method: string; path: string; body?: unknown }[] = [];
    serve(calls);
    renderProfile();
    const card = await screen.findByRole('region', { name: 'Xác minh doanh nghiệp' });
    expect(card).toHaveTextContent('Xác minh doanh nghiệp (không bắt buộc)');
    expect(card).toHaveTextContent('Bạn vẫn xem hồ sơ, nhắn tin và gửi yêu cầu báo giá khi chưa xác minh');
    fireEvent.click(within(card).getByRole('button', { name: 'Gửi yêu cầu xác minh' }));
    expect(await screen.findByText('Yêu cầu xác minh đang chờ duyệt')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST' && c.path === '/api/buyer/verification-requests')).toBe(true);
  });

  it('thiếu VAT và số đăng ký: nút gửi bị khoá kèm hướng dẫn', async () => {
    serve([], { vat_number: null, registration_number: null });
    renderProfile();
    const card = await screen.findByRole('region', { name: 'Xác minh doanh nghiệp' });
    expect(within(card).getByRole('button', { name: 'Gửi yêu cầu xác minh' })).toBeDisabled();
    expect(card).toHaveTextContent('Cần lưu mã số VAT hoặc số đăng ký doanh nghiệp');
  });

  it('bị từ chối: hiện lý do và cho gửi lại', async () => {
    serve([], { verification_status: 'rejected' }, [
      { id: 'vr-0', company_id: 'b-1', status: 'rejected', evidence_ids: [], submitted_at: '2026-09-30T00:00:00Z', reviewed_at: '2026-09-30T02:00:00Z', decision_reason: 'VAT không khớp trên VIES' },
    ]);
    renderProfile();
    const card = await screen.findByRole('region', { name: 'Xác minh doanh nghiệp' });
    expect(await within(card).findByText('VAT không khớp trên VIES')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Gửi yêu cầu xác minh' })).toBeEnabled();
  });
});

describe('Xem ẩn danh (U9)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('bật ẩn danh rồi lưu gửi hide_profile_views = true', async () => {
    const calls: { method: string; path: string; body?: unknown }[] = [];
    serve(calls);
    renderProfile();
    const toggle = await screen.findByRole('checkbox', { name: /chế độ ẩn danh/ });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')?.body).toMatchObject({ hide_profile_views: true }));
  });
});
