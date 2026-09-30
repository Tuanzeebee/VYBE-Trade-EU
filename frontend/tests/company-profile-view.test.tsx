import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CompanyProfileView from '@/components/CompanyProfileView';
import { LanguageProvider } from '@/context/LanguageContext';
import type { CompanyOut } from '@/lib/companyApi';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter/company',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const company = (over: Partial<CompanyOut> = {}): CompanyOut => ({
  id: 'c1',
  slug: 'mekong-rice',
  type: 'exporter',
  legal_name: 'Công ty TNHH Gạo Mekong',
  registration_number: '0312345678',
  tax_id: '0312345678',
  business_type: 'manufacturer',
  country: 'VN',
  industry_sector: 'agriculture',
  founded_year: 2012,
  address: '12 Nguyễn Huệ, Cần Thơ',
  website: null,
  contact_email: 'sales@mekongrice.vn',
  description_vi: 'Nhà máy xay xát gạo thơm.',
  description_en: null,
  logo_key: null,
  industry_other: null,
  phone: null,
  legal_rep_name: null,
  legal_rep_title: null,
  issuing_authority: null,
  offering_type: 'products',
  factory_address: null,
  capacity_value: null,
  capacity_unit: null,
  capacity_period: null,
  main_customers: null,
  location_public: false,
  facility_codes: [],
  export_markets: ['DE'],
  languages_spoken: ['vi', 'en'],
  company_size: null,
  procurement_estimate: null,
  vat_number: null,
  eori_number: null,
  sourcing_categories: [],
  verification_status: 'unverified',
  verification_level: 'basic',
  verified_at: null,
  expires_at: null,
  profile_completeness_score: '62.00',
  created_at: '2026-09-29T00:00:00Z',
  updated_at: '2026-09-29T00:00:00Z',
  ...over,
});

function serve(evidence: unknown[] = []) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === '/api/exporter/evidences') return json(200, evidence);
      if (path === '/api/me/company/completeness') return json(200, { score: '62.00', missing: [] });
      throw new Error(`unexpected ${path}`);
    }),
  );
}

function renderView(value: CompanyOut | null) {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <CompanyProfileView company={value} products={[]} onEdit={vi.fn()} onNavigateTab={vi.fn()} />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

describe('CompanyProfileView — chỉ dữ liệu thật (U1)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('hiện dữ liệu công ty từ server, không có số liệu mẫu', async () => {
    serve();
    renderView(company());
    expect(await screen.findByRole('heading', { name: 'Công ty TNHH Gạo Mekong' })).toBeInTheDocument();
    expect(screen.getAllByText('0312345678').length).toBeGreaterThan(0);
    expect(screen.getByText('sales@mekongrice.vn')).toBeInTheDocument();
    for (const fake of [/96\/100/, /L2 Enhanced/, /VIET AGRI/, /Hạng A\+/, /15,000/, /VN-DL-0489/]) {
      expect(screen.queryByText(fake)).not.toBeInTheDocument();
    }
  });

  it('trường chưa khai báo hiện "Chưa khai báo" thay vì dữ liệu mẫu', async () => {
    serve();
    renderView(company({ website: null }));
    const legal = (await screen.findByRole('heading', { name: 'Thông tin pháp lý & liên hệ' })).closest('section') as HTMLElement;
    expect(within(legal).getAllByText('Chưa khai báo').length).toBeGreaterThan(0);
  });

  it('chưa xác minh: không có lối xem hồ sơ công khai', async () => {
    serve();
    renderView(company());
    await screen.findByRole('heading', { name: 'Công ty TNHH Gạo Mekong' });
    expect(screen.queryByRole('link', { name: 'Xem hồ sơ công khai' })).not.toBeInTheDocument();
    expect(screen.getByText(/Hồ sơ công khai hiển thị với buyer sau khi/)).toBeInTheDocument();
  });

  it('đã xác minh: có liên kết tới hồ sơ công khai thật theo slug', async () => {
    serve();
    renderView(company({ verification_status: 'verified' }));
    const link = await screen.findByRole('link', { name: 'Xem hồ sơ công khai' });
    expect(link.getAttribute('href')).toContain('/suppliers/mekong-rice');
  });

  it('chứng nhận lấy từ server kèm trạng thái duyệt', async () => {
    serve([
      {
        id: 'e1', type_code: 'haccp', type_name_vi: 'HACCP', type_name_en: 'HACCP', certificate_number: null, issuer: null,
        issued_at: '2026-01-01', expires_at: '2027-01-01', approval_status: 'pending', reject_reason: null, file_url: null,
      },
    ]);
    renderView(company());
    const section = (await screen.findByRole('heading', { name: 'Chứng nhận & giấy phép' })).closest('section') as HTMLElement;
    expect(await within(section).findByText('HACCP')).toBeInTheDocument();
    expect(within(section).getByText('Chờ duyệt')).toBeInTheDocument();
  });
});
