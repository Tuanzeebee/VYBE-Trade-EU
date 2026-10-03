import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SupplierProfile, { mapQuery } from '@/components/SupplierProfile';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/suppliers/ca-phe',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const PROFILE = {
  slug: 'ca-phe',
  legal_name: 'Cà Phê Tây Nguyên',
  country: 'VN',
  industry_sector: 'coffee_tea',
  founded_year: 2010,
  website: 'https://caphe.example.vn',
  description_vi: 'Rang xay và xuất khẩu cà phê Robusta.',
  description_en: null,
  logo_url: null,
  export_markets: ['DE', 'EU'],
  languages_spoken: ['vi', 'en'],
  verification_level: 'evfta_verified',
  verified_at: '2026-09-01T00:00:00Z',
  offering_type: 'both',
  city: 'Đắk Lắk',
  company_size: '51_200',
  capacity_value: '1200.00',
  capacity_unit: 'tonne',
  capacity_period: 'year',
  facility_codes: [{ code_type: 'growing_area', code: 'VN-DL-001' }],
  location_public: false,
  factory_address: null,
  latitude: null,
  longitude: null,
  services: [
    { id: 's-1', category_code: 'warehousing', category_name_vi: 'Kho', category_name_en: 'Warehouse', title: 'Kho lạnh Buôn Ma Thuột', description_vi: null, description_en: null, coverage_countries: ['VN'], is_active: true, created_at: '2026-09-01T00:00:00Z' },
  ],
  products: [
    {
      id: 'p-1', name: 'Cà phê Robusta nhân', hs_code: '090111', hs_formatted: '0901.11', hs_name_vi: 'Cà phê chưa rang', hs_name_en: 'Coffee, not roasted',
      description_vi: null, description_en: null, price_min: '2.10', price_max: '2.50', currency: 'USD', unit: 'kg', moq: '19200', moq_unit: 'kg',
      images: [], brand_model: null, packagings: [{ pack_size: '60', pack_unit: 'kg', pack_type: 'sack', channel: 'any' }],
      price_tiers: [{ min_quantity: '19200', unit_price: '2.50' }, { min_quantity: '57600', unit_price: '2.10' }],
    },
  ],
};

const CREDENTIALS = {
  verified_at: '2026-09-01T00:00:00Z',
  expires_at: '2027-09-01T00:00:00Z',
  verified_by: 'VYBE Trade',
  origin_evidence_complete: true,
  certificates: [{ type_code: 'haccp', name_vi: 'HACCP', name_en: 'HACCP', issuer: 'SGS', expires_at: '2027-03-01', reviewed_at: '2026-09-01T00:00:00Z' }],
};

function serve(profile: unknown = PROFILE) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === '/api/public/companies/ca-phe') return profile ? json(200, profile) : json(404, {});
      if (path === '/api/public/suppliers/ca-phe/credentials') return json(200, CREDENTIALS);
      return json(401, {});
    }),
  );
}

async function renderProfile() {
  const ui = await SupplierProfile({ slug: 'ca-phe', locale: 'vi' });
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>{ui}</LanguageProvider>
    </NextIntlClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('Hồ sơ nhà cung cấp (U10)', () => {
  it('các mục theo thứ tự: giới thiệu → vị trí → dữ liệu đã kiểm → năng lực → sản phẩm → dịch vụ', async () => {
    serve();
    await renderProfile();
    const order = ['Giới thiệu', 'Vị trí', 'Dữ liệu đã kiểm', 'Năng lực đáp ứng', 'Sản phẩm', 'Dịch vụ'];
    const regions = screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'));
    expect(regions.filter((r) => order.includes(r ?? ''))).toEqual(order);
    expect(screen.getByTestId('verified-badge')).toHaveTextContent('Đã xác minh');
    expect(screen.queryByText('EVFTA-verified')).toBeNull();
  });

  it('bản đồ mặc định ở mức tỉnh/thành, không lộ địa chỉ nhà máy', async () => {
    serve();
    await renderProfile();
    const map = screen.getByTitle('Bản đồ vị trí nhà cung cấp');
    expect(map.getAttribute('src')).toContain(encodeURIComponent('Đắk Lắk, Vietnam'));
    expect(map.getAttribute('src')).toContain('z=8');
    expect(screen.getByTestId('map-precision')).toHaveTextContent('mức tỉnh/thành phố');
  });

  it('dữ liệu đã kiểm: ngày xác minh, đủ bằng chứng xuất xứ, chứng nhận còn hạn', async () => {
    serve();
    await renderProfile();
    const verified = screen.getByRole('region', { name: 'Dữ liệu đã kiểm' });
    expect(verified).toHaveTextContent('Pháp lý doanh nghiệp được VYBE Trade đối chiếu');
    expect(verified).toHaveTextContent('Đủ bằng chứng xuất xứ bắt buộc');
    expect(within(verified).getByText('HACCP')).toBeInTheDocument();
    expect(verified).toHaveTextContent('SGS');
  });

  it('năng lực và sản phẩm có bậc giá, MOQ, quy cách', async () => {
    serve();
    await renderProfile();
    const capacity = screen.getByRole('region', { name: 'Năng lực đáp ứng' });
    expect(capacity).toHaveTextContent('1200');
    expect(capacity).toHaveTextContent('VN-DL-001');
    const products = screen.getByRole('region', { name: 'Sản phẩm' });
    const tiers = within(products).getByRole('list', { name: 'Bậc giá' });
    expect(within(tiers).getAllByRole('listitem')).toHaveLength(2);
    expect(products).toHaveTextContent('MOQ: 19200');
    expect(products).toHaveTextContent('60');
    expect(screen.getByRole('region', { name: 'Dịch vụ' })).toHaveTextContent('Kho lạnh Buôn Ma Thuột');
  });

  it('không tìm thấy hồ sơ → notFound', async () => {
    serve(null);
    await expect(SupplierProfile({ slug: 'ca-phe', locale: 'vi' })).rejects.toThrow('NOT_FOUND');
  });
});

describe('mapQuery (U10)', () => {
  const base = { location_public: false, latitude: null, longitude: null, factory_address: 'Km 5 QL14', city: 'Đắk Lắk', country: 'VN' };
  it('mặc định: tỉnh/thành + quốc gia, không chính xác', () => {
    expect(mapQuery(base)).toEqual({ query: 'Đắk Lắk, Vietnam', precise: false });
  });
  it('đồng ý công khai: toạ độ nếu có, không thì địa chỉ nhà máy', () => {
    expect(mapQuery({ ...base, location_public: true })).toEqual({ query: 'Km 5 QL14', precise: true });
    expect(mapQuery({ ...base, location_public: true, latitude: '12.67', longitude: '108.04' })).toEqual({ query: '12.67,108.04', precise: true });
  });
});
