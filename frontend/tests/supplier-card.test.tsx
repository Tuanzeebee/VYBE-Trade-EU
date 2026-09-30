import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SupplierCard from '@/components/SupplierCard';
import SupplierDirectory from '@/components/SupplierDirectory';
import { readQuery, toSearch, type SupplierCardData } from '@/lib/suppliersApi';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/suppliers',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const supplier = (over: Partial<SupplierCardData> = {}): SupplierCardData => ({
  slug: 'nong-san-lua-vang',
  legal_name: 'Nông Sản Lúa Vàng',
  country: 'VN',
  industry_sector: 'agriculture',
  verification_level: 'basic',
  description_vi: 'Gạo và cà phê xuất khẩu sang EU.',
  description_en: 'Rice and coffee exporter to the EU.',
  logo_url: null,
  product_names: ['Gạo thơm Jasmine', 'Cà phê nhân'],
  product_count: 5,
  categories: ['agriculture'],
  ...over,
});

const wrap = (ui: React.ReactElement, locale = 'vi') =>
  render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      {ui}
    </NextIntlClientProvider>,
  );

describe('Thẻ nhà cung cấp (E3)', () => {
  it('hiện đủ 6 thông tin: tên, huy hiệu, nhóm hàng, quốc gia, mô tả ngắn, nút báo giá', () => {
    wrap(
      <ul>
        <SupplierCard supplier={supplier()} locale="vi" />
      </ul>,
    );
    const card = screen.getByRole('listitem', { name: 'Nông Sản Lúa Vàng' });
    expect(within(card).getByRole('heading', { name: 'Nông Sản Lúa Vàng' })).toBeInTheDocument();
    expect(within(card).getByTestId('verified-badge')).toHaveTextContent('Đã xác minh');
    expect(within(card).getByTestId('categories')).toHaveTextContent('Nông sản');
    expect(within(card).getByTestId('country')).toHaveTextContent('Vietnam');
    expect(within(card).getByText('Gạo và cà phê xuất khẩu sang EU.')).toBeInTheDocument();
    const rfq = within(card).getByRole('link', { name: 'Yêu cầu báo giá' });
    expect(rfq.getAttribute('href')).toContain('/suppliers/nong-san-lua-vang?rfq=1');
  });

  it('chọn mô tả theo ngôn ngữ và rơi về ngôn ngữ còn lại khi thiếu', () => {
    wrap(
      <ul>
        <SupplierCard supplier={supplier()} locale="en" />
        <SupplierCard supplier={supplier({ slug: 'b', legal_name: 'B', description_en: null })} locale="en" />
      </ul>,
      'en',
    );
    expect(screen.getByText('Rice and coffee exporter to the EU.')).toBeInTheDocument();
    expect(screen.getByText('Gạo và cà phê xuất khẩu sang EU.')).toBeInTheDocument();
  });

  it('huy hiệu EVFTA-verified cho mức cao và cắt mô tả dài', () => {
    wrap(
      <ul>
        <SupplierCard supplier={supplier({ verification_level: 'evfta_verified', description_vi: 'a'.repeat(400) })} locale="vi" />
      </ul>,
    );
    expect(screen.getByTestId('verified-badge')).toHaveTextContent('EVFTA-verified');
    expect(screen.getByText(/^a+…$/).textContent!.length).toBeLessThanOrEqual(161);
  });
});

describe('Danh bạ nhà cung cấp (E2)', () => {
  afterEach(() => vi.unstubAllGlobals());

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  function serve(page: unknown | null) {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (req: Request) => {
        const url = new URL(req.url);
        calls.push(url.pathname + url.search);
        if (url.pathname === '/api/public/suppliers/filters') return json(200, { categories: ['agriculture'], certificates: [{ code: 'haccp', name_vi: 'HACCP', name_en: 'HACCP' }] });
        return page === null ? json(500, {}) : json(200, page);
      }),
    );
    return calls;
  }

  it('render kết quả từ backend, giữ bộ lọc trong form và gửi đúng tham số', async () => {
    const calls = serve({ items: [supplier()], total: 1, page: 1, page_size: 12 });
    wrap(await SupplierDirectory({ query: { q: 'gạo', country: 'VN' }, locale: 'vi' }));
    expect(screen.getByRole('listitem', { name: 'Nông Sản Lúa Vàng' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Tìm theo tên công ty/)).toHaveValue('gạo');
    expect(screen.getByLabelText('Quốc gia')).toHaveValue('VN');
    expect(screen.getByLabelText('Chứng nhận')).toBeInTheDocument();
    const listing = calls.find((c) => c.startsWith('/api/public/suppliers?'));
    expect(listing).toContain('q=g%E1%BA%A1o');
    expect(listing).toContain('country=VN');
  });

  it('không có kết quả: hướng dẫn thay vì để trống', async () => {
    serve({ items: [], total: 0, page: 1, page_size: 12 });
    wrap(await SupplierDirectory({ query: {}, locale: 'vi' }));
    expect(screen.getByRole('status')).toHaveTextContent('Chưa có nhà cung cấp phù hợp');
  });

  it('backend lỗi: báo lỗi, không giả làm rỗng', async () => {
    serve(null);
    wrap(await SupplierDirectory({ query: {}, locale: 'vi' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được danh bạ');
  });

  it('phân trang giữ bộ lọc', async () => {
    serve({ items: [supplier()], total: 30, page: 2, page_size: 12 });
    wrap(await SupplierDirectory({ query: { q: 'gạo', page: 2 }, locale: 'vi' }));
    const nav = screen.getByRole('navigation', { name: 'Phân trang' });
    expect(within(nav).getByRole('link', { name: 'Trang trước' }).getAttribute('href')).not.toContain('page=');
    expect(within(nav).getByRole('link', { name: 'Trang sau' }).getAttribute('href')).toContain('page=3');
    expect(within(nav).getByRole('link', { name: 'Trang sau' }).getAttribute('href')).toContain('q=');
  });
});

describe('readQuery / toSearch', () => {
  it('bỏ giá trị sai định dạng và chuẩn hóa', () => {
    expect(readQuery({ q: ['a', 'b'], hs: 'abc', country: 'vn', page: '0' })).toMatchObject({ q: 'a', hs: undefined, country: 'VN', page: undefined });
    expect(readQuery({ hs: '1006.30', page: '3' })).toMatchObject({ hs: '1006.30', page: 3 });
  });
  it('toSearch bỏ trang 1 và giá trị rỗng', () => {
    expect(toSearch({ q: 'gạo', page: 1, hs: '' })).toBe('?q=g%E1%BA%A1o');
    expect(toSearch({}, { page: 2 })).toBe('?page=2');
    expect(toSearch({})).toBe('');
  });
});
