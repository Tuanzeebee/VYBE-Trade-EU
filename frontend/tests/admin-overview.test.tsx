import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminAuditLog from '@/components/AdminAuditLog';
import AdminModeration from '@/components/AdminModeration';
import AdminOverview from '@/components/AdminOverview';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/admin',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const company = (over: Record<string, unknown> = {}) => ({
  id: 'c-1',
  slug: 'cong-ty-a',
  type: 'exporter',
  legal_name: 'Công ty A',
  country: 'VN',
  tax_id: '0312345678',
  website: null,
  address: null,
  contact_email: null,
  description_vi: null,
  description_en: null,
  verification_status: 'unverified',
  verification_level: 'basic',
  is_hidden: false,
  profile_completeness_score: '55.00',
  owner_email: 'a@x.vn',
  created_at: '2026-09-29T00:00:00Z',
  ...over,
});

const product = (over: Record<string, unknown> = {}) => ({
  id: 'p-1',
  company_id: 'c-1',
  company_name: 'Công ty A',
  name: 'Gạo thơm',
  hs_code: '100630',
  description_vi: null,
  description_en: null,
  is_active: true,
  approval_status: 'approved',
  ...over,
});

const log = (over: Record<string, unknown> = {}) => ({
  id: 'l-1',
  actor_id: 'u-1',
  action_type: 'company.hide',
  entity_type: 'company',
  entity_id: 'c-1',
  before_state: { is_hidden: false },
  after_state: { is_hidden: true },
  created_at: '2026-09-30T01:00:00Z',
  ...over,
});

let calls: { method: string; path: string; search: string; body?: unknown }[] = [];

function serve(world: { stats?: unknown; companies?: unknown[]; products?: unknown[]; logs?: unknown[]; fail?: boolean } = {}) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      const body = req.method === 'PATCH' ? await req.clone().json().catch(() => undefined) : undefined;
      calls.push({ method: req.method, path: url.pathname, search: url.search, body });
      if (req.method === 'PATCH') return json(200, {});
      if (world.fail) return json(500, {});
      if (url.pathname === '/api/admin/stats') return json(200, world.stats ?? { verified_count: 0, pending_count: 0 });
      if (url.pathname === '/api/admin/companies') return json(200, world.companies ?? []);
      if (url.pathname === '/api/admin/products') return json(200, world.products ?? []);
      if (url.pathname === '/api/admin/audit-logs') return json(200, world.logs ?? []);
      throw new Error(`unexpected ${req.method} ${url.pathname}`);
    }),
  );
}

function wrap(node: React.ReactNode, locale: 'vi' | 'en' = 'vi') {
  render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <LanguageProvider>{node}</LanguageProvider>
    </NextIntlClientProvider>,
  );
}

describe('Tổng quan quản trị (I5)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('hiện số công ty đã xác minh và hồ sơ chờ duyệt', async () => {
    serve({ stats: { verified_count: 7, pending_count: 3 } });
    wrap(<AdminOverview />);
    const verified = await screen.findByRole('group', { name: 'Doanh nghiệp đã xác minh' });
    expect(verified).toHaveTextContent('7');
    expect(screen.getByRole('group', { name: 'Hồ sơ chờ duyệt' })).toHaveTextContent('3');
  });

  it('số 0 vẫn hiện số 0 kèm hướng dẫn, không để trống', async () => {
    serve({ stats: { verified_count: 0, pending_count: 0 } });
    wrap(<AdminOverview />);
    expect(await screen.findByRole('group', { name: 'Doanh nghiệp đã xác minh' })).toHaveTextContent('0');
    expect(screen.getAllByText(/Chưa có/).length).toBeGreaterThan(0);
  });

  it('không tải được: báo lỗi thay vì hiện số 0', async () => {
    serve({ fail: true });
    wrap(<AdminOverview />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được số liệu');
    expect(screen.queryByRole('group', { name: 'Doanh nghiệp đã xác minh' })).not.toBeInTheDocument();
  });
});

describe('Kiểm duyệt hồ sơ và sản phẩm (I4)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('liệt kê hồ sơ với trạng thái xác minh, chủ sở hữu và cờ ẩn', async () => {
    serve({ companies: [company(), company({ id: 'c-2', legal_name: 'Công ty B', is_hidden: true, verification_status: 'verified' })] });
    wrap(<AdminModeration />);
    const a = await screen.findByRole('listitem', { name: /Công ty A/ });
    expect(a).toHaveTextContent('a@x.vn');
    expect(a).toHaveTextContent('Chưa xác minh');
    const b = screen.getByRole('listitem', { name: /Công ty B/ });
    expect(b).toHaveTextContent('Đã ẩn');
    expect(b).toHaveTextContent('Đã xác minh');
  });

  it('ẩn hồ sơ gọi PATCH is_hidden=true; hiện lại gọi is_hidden=false', async () => {
    serve({ companies: [company(), company({ id: 'c-2', legal_name: 'Công ty B', is_hidden: true })] });
    wrap(<AdminModeration />);
    fireEvent.click(within(await screen.findByRole('listitem', { name: /Công ty A/ })).getByRole('button', { name: 'Ẩn hồ sơ' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ is_hidden: true }));
    expect(calls.find((c) => c.method === 'PATCH')?.path).toBe('/api/admin/companies/c-1');
    fireEvent.click(within(screen.getByRole('listitem', { name: /Công ty B/ })).getByRole('button', { name: 'Hiện hồ sơ' }));
    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(2));
    expect(calls.filter((c) => c.method === 'PATCH')[1].body).toEqual({ is_hidden: false });
  });

  it('tìm theo tên gửi tham số q', async () => {
    serve({ companies: [company()] });
    wrap(<AdminModeration />);
    fireEvent.change(await screen.findByLabelText('Tìm theo tên'), { target: { value: 'green' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tìm' }));
    await waitFor(() => expect(calls.some((c) => c.path === '/api/admin/companies' && c.search.includes('q=green'))).toBe(true));
  });

  it('lọc theo trạng thái xác minh', async () => {
    serve({ companies: [company()] });
    wrap(<AdminModeration />);
    fireEvent.change(await screen.findByLabelText('Trạng thái xác minh'), { target: { value: 'pending' } });
    await waitFor(() => expect(calls.some((c) => c.search.includes('status=pending'))).toBe(true));
  });

  it('mở sản phẩm của hồ sơ và ẩn sản phẩm', async () => {
    serve({ companies: [company()], products: [product()] });
    wrap(<AdminModeration />);
    const row = await screen.findByRole('listitem', { name: /Công ty A/ });
    fireEvent.click(within(row).getByRole('button', { name: 'Xem sản phẩm' }));
    const item = await screen.findByText('Gạo thơm');
    expect(calls.some((c) => c.path === '/api/admin/products' && c.search.includes('company_id=c-1'))).toBe(true);
    fireEvent.click(within(item.closest('li') as HTMLElement).getByRole('button', { name: 'Ẩn sản phẩm' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH' && c.path === '/api/admin/products/p-1')?.body).toEqual({ approval_status: 'hidden' }));
  });

  it('sản phẩm đã ẩn có nút Hiện sản phẩm', async () => {
    serve({ companies: [company()], products: [product({ approval_status: 'hidden' })] });
    wrap(<AdminModeration />);
    fireEvent.click(within(await screen.findByRole('listitem', { name: /Công ty A/ })).getByRole('button', { name: 'Xem sản phẩm' }));
    await screen.findByText('Gạo thơm');
    expect(screen.getByRole('button', { name: 'Hiện sản phẩm' })).toBeInTheDocument();
  });

  it('không tải được: báo lỗi', async () => {
    serve({ fail: true });
    wrap(<AdminModeration />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được danh sách');
  });

  it('chú thích: ẩn không đổi trạng thái xác minh và mọi thao tác được ghi nhật ký', async () => {
    serve({ companies: [] });
    wrap(<AdminModeration />);
    expect(await screen.findByText(/không đổi trạng thái xác minh/)).toBeInTheDocument();
  });
});

describe('Nhật ký thao tác (I6)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('hiện hành động, đối tượng, người thực hiện và thay đổi trước/sau', async () => {
    serve({ logs: [log()] });
    wrap(<AdminAuditLog />);
    const row = await screen.findByRole('row', { name: /company\.hide/ });
    expect(row).toHaveTextContent('company');
    expect(row).toHaveTextContent('c-1');
    expect(row).toHaveTextContent('u-1');
    expect(row).toHaveTextContent('"is_hidden":false');
    expect(row).toHaveTextContent('"is_hidden":true');
  });

  it('lọc theo loại đối tượng và mã đối tượng gửi tham số', async () => {
    serve({ logs: [log()] });
    wrap(<AdminAuditLog />);
    fireEvent.change(await screen.findByLabelText('Loại đối tượng'), { target: { value: 'company' } });
    fireEvent.change(screen.getByLabelText('Mã đối tượng'), { target: { value: 'c-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lọc' }));
    await waitFor(() =>
      expect(calls.some((c) => c.path === '/api/admin/audit-logs' && c.search.includes('entity_type=company') && c.search.includes('entity_id=c-1'))).toBe(true),
    );
  });

  it('không có nhật ký: hiện hướng dẫn', async () => {
    serve({ logs: [] });
    wrap(<AdminAuditLog />);
    expect(await screen.findByRole('status')).toHaveTextContent('Chưa có nhật ký');
  });

  it('không tải được: báo lỗi', async () => {
    serve({ fail: true });
    wrap(<AdminAuditLog />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được nhật ký');
  });

  it('bản tiếng Anh dùng nhãn tiếng Anh', async () => {
    serve({ logs: [log()] });
    wrap(<AdminAuditLog />, 'en');
    expect(await screen.findByRole('button', { name: 'Filter' })).toBeInTheDocument();
  });
});
