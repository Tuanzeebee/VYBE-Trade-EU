import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminVerificationQueue from '@/components/AdminVerificationQueue';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/admin',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const evidence = (over: Record<string, unknown> = {}) => ({
  id: 'e-1',
  type_code: 'iso_9001',
  type_name_vi: 'ISO 9001',
  type_name_en: 'ISO 9001',
  certificate_number: 'VN-123',
  issuer: 'SGS',
  issued_at: '2026-01-01',
  expires_at: '2027-01-01',
  approval_status: 'pending',
  reject_reason: null,
  file_url: 'https://fake/evidence/c-1/a.pdf',
  ...over,
});

const item = (over: Record<string, unknown> = {}) => ({
  request_id: 'r-1',
  company_id: 'c-1',
  legal_name: 'Công ty A',
  tax_id: '0312345678',
  country: 'VN',
  submitted_at: '2026-09-29T08:00:00Z',
  evidences: [evidence()],
  company: {
    id: 'c-1',
    legal_name: 'Công ty A',
    tax_id: '0312345678',
    registration_number: '0312345678-001',
    business_type: 'manufacturer',
    country: 'VN',
    founded_year: 2018,
    address: '12 Lê Lợi, Cần Thơ',
    website: 'https://congty-a.vn',
    contact_email: 'lienhe@congty-a.vn',
    industry_sector: 'seafood',
    export_markets: ['EU', 'DE'],
    languages_spoken: ['vi', 'en'],
    description_vi: 'Chuyên cá tra phi lê đông lạnh.',
    description_en: 'Frozen pangasius fillets.',
  },
  products: [
    {
      id: 'p-1',
      name: 'Cá tra phi lê',
      hs_code: '030462',
      hs_formatted: '0304.62',
      hs_name_vi: 'Phi lê cá tra',
      hs_name_en: 'Pangasius fillets',
      price_min: '2.10',
      price_max: '2.80',
      currency: 'USD',
      unit: 'kg',
      moq: '5000.00',
      moq_unit: 'kg',
      is_active: true,
    },
  ],
  ...over,
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let calls: { method: string; path: string; body?: unknown }[] = [];

function serve(queue: unknown[], post: (path: string) => Response = () => json(200, {})) {
  calls = [];
  let current = queue;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      const body = req.method === 'POST' ? await req.clone().json().catch(() => undefined) : undefined;
      calls.push({ method: req.method, path: url.pathname, body });
      if (url.pathname === '/api/admin/verification-queue') return json(200, current);
      if (req.method === 'POST') {
        const res = post(url.pathname);
        if (res.ok && url.pathname.includes('/decision')) current = [];
        return res;
      }
      throw new Error(`unexpected ${req.method} ${url.pathname}`);
    }),
  );
}

function renderQueue(locale: 'vi' | 'en' = 'vi') {
  render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <LanguageProvider>
        <AdminVerificationQueue />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

const posts = () => calls.filter((c) => c.method === 'POST');

describe('Hàng đợi xác minh (I1, I2)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('hàng đợi trống: hiện hướng dẫn', async () => {
    serve([]);
    renderQueue();
    expect(await screen.findByRole('status')).toHaveTextContent('Không có hồ sơ nào đang chờ duyệt');
  });

  it('mỗi dòng có tên, MST, quốc gia, ngày gửi và bằng chứng xem ngay trên dòng', async () => {
    serve([item()]);
    renderQueue();
    const row = await screen.findByRole('listitem', { name: /Công ty A/ });
    expect(row).toHaveTextContent('0312345678');
    expect(row).toHaveTextContent('VN');
    expect(row).toHaveTextContent('2026');
    expect(within(row).getByText('ISO 9001')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: /Xem file/ })).toHaveAttribute('href', 'https://fake/evidence/c-1/a.pdf');
  });

  it('admin xem được hồ sơ doanh nghiệp và sản phẩm đã khai để đối chiếu', async () => {
    serve([item()]);
    renderQueue();
    const row = await screen.findByRole('listitem', { name: /Công ty A/ });
    const info = within(row).getByRole('group', { name: /Thông tin doanh nghiệp/ });
    for (const text of ['0312345678-001', 'manufacturer', '2018', '12 Lê Lợi, Cần Thơ', 'lienhe@congty-a.vn', 'seafood', 'EU, DE', 'Chuyên cá tra phi lê đông lạnh.']) {
      expect(info).toHaveTextContent(text);
    }
    expect(within(info).getByRole('link', { name: 'https://congty-a.vn' })).toHaveAttribute('href', 'https://congty-a.vn');
    const products = within(row).getByRole('group', { name: /Sản phẩm đã khai/ });
    expect(products).toHaveTextContent('Cá tra phi lê');
    expect(products).toHaveTextContent('0304.62');
    expect(products).toHaveTextContent('2.10');
    expect(products).toHaveTextContent('5000.00');
  });

  it('chưa khai sản phẩm: hiện hướng dẫn thay vì để trống', async () => {
    serve([item({ products: [] })]);
    renderQueue();
    const row = await screen.findByRole('listitem', { name: /Công ty A/ });
    expect(within(row).getByText('Chưa khai sản phẩm nào.')).toBeInTheDocument();
  });

  it('giữ thứ tự do server trả (cũ nhất trước)', async () => {
    serve([item({ request_id: 'r-1', legal_name: 'Công ty A' }), item({ request_id: 'r-2', legal_name: 'Công ty B' })]);
    renderQueue();
    const rows = await screen.findAllByRole('listitem', { name: /Công ty/ });
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual(['Công ty A', 'Công ty B']);
  });

  it('duyệt: gọi decision approve rồi tải lại, dòng biến mất', async () => {
    serve([item()]);
    renderQueue();
    const row = await screen.findByRole('listitem', { name: /Công ty A/ });
    fireEvent.click(within(row).getByRole('button', { name: 'Duyệt xác minh' }));
    await waitFor(() => expect(screen.queryByRole('listitem', { name: /Công ty A/ })).not.toBeInTheDocument());
    expect(posts()).toEqual([
      { method: 'POST', path: '/api/admin/verification-requests/r-1/decision', body: { decision: 'approve', reason: null } },
    ]);
  });

  it.each([
    ['Từ chối', 'reject'],
    ['Yêu cầu bổ sung', 'request_info'],
  ])('%s cần lý do: bỏ trống thì báo lỗi và không gọi server', async (label, _decision) => {
    serve([item()]);
    renderQueue();
    const row = await screen.findByRole('listitem', { name: /Công ty A/ });
    fireEvent.click(within(row).getByRole('button', { name: label }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng nhập lý do');
    expect(posts()).toEqual([]);
  });

  it.each([
    ['Từ chối', 'reject'],
    ['Yêu cầu bổ sung', 'request_info'],
  ])('%s kèm lý do: gửi đúng quyết định', async (label, decision) => {
    serve([item()]);
    renderQueue();
    const row = await screen.findByRole('listitem', { name: /Công ty A/ });
    fireEvent.change(within(row).getByLabelText(/Lý do quyết định/), { target: { value: '  Thiếu giấy phép  ' } });
    fireEvent.click(within(row).getByRole('button', { name: label }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0].body).toEqual({ decision, reason: 'Thiếu giấy phép' });
  });

  it('server báo đã xử lý (409): hiện lỗi và giữ dòng để làm mới', async () => {
    serve([item()], () => json(409, {}));
    renderQueue();
    const row = await screen.findByRole('listitem', { name: /Công ty A/ });
    fireEvent.click(within(row).getByRole('button', { name: 'Duyệt xác minh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('đã được xử lý');
    expect(screen.getByRole('listitem', { name: /Công ty A/ })).toBeInTheDocument();
  });

  it('duyệt bằng chứng: gọi review approve', async () => {
    serve([item()]);
    renderQueue();
    const row = await screen.findByRole('listitem', { name: /Công ty A/ });
    fireEvent.click(within(row).getByRole('button', { name: /Duyệt bằng chứng/ }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]).toMatchObject({ path: '/api/admin/evidences/e-1/review', body: { decision: 'approve', reason: null } });
  });

  it('từ chối bằng chứng cần lý do riêng', async () => {
    serve([item()]);
    renderQueue();
    const row = await screen.findByRole('listitem', { name: /Công ty A/ });
    fireEvent.click(within(row).getByRole('button', { name: /Từ chối bằng chứng/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng nhập lý do');
    expect(posts()).toEqual([]);
    fireEvent.change(within(row).getByLabelText(/Lý do từ chối bằng chứng/), { target: { value: 'Ảnh mờ' } });
    fireEvent.click(within(row).getByRole('button', { name: /Từ chối bằng chứng/ }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0].body).toEqual({ decision: 'reject', reason: 'Ảnh mờ' });
  });

  it('công ty không có bằng chứng: nói rõ', async () => {
    serve([item({ evidences: [] })]);
    renderQueue();
    expect(await screen.findByText(/Chưa nộp bằng chứng/)).toBeInTheDocument();
  });

  it('không tải được hàng đợi: báo lỗi, không giả vờ hàng đợi trống', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(500, {})));
    renderQueue();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được hàng đợi');
    expect(screen.queryByText(/Không có hồ sơ nào đang chờ duyệt/)).not.toBeInTheDocument();
  });

  it('có chú thích: quyết định xác minh do quản trị viên, không phải hệ thống hay AI', async () => {
    serve([]);
    renderQueue();
    expect(await screen.findByText(/do quản trị viên quyết định/)).toBeInTheDocument();
  });

  it('bản tiếng Anh dùng nhãn tiếng Anh', async () => {
    serve([item()]);
    renderQueue('en');
    expect(await screen.findByRole('button', { name: 'Approve verification' })).toBeInTheDocument();
  });
});
