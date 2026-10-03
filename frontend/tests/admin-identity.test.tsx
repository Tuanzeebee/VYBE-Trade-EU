import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminIdentity from '@/components/AdminIdentity';
import AdminVerificationQueue from '@/components/AdminVerificationQueue';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/admin',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const cluster = {
  identifier_type: 'tax_id',
  value: '0314892345',
  companies: [
    { id: 'c-1', legal_name: 'Công ty A' },
    { id: 'c-2', legal_name: 'Công ty B' },
  ],
};
const entry = {
  id: 'b-1',
  identifier_type: 'phone',
  value: '84912345678',
  reason: 'mạo danh',
  added_by: 'u-1',
  created_at: '2026-09-30T01:00:00Z',
};
const queueItem = {
  request_id: 'r-1',
  company_id: 'c-1',
  legal_name: 'Công ty A',
  tax_id: '0314892345',
  country: 'VN',
  submitted_at: '2026-09-29T08:00:00Z',
  evidences: [],
  products: [],
  company: {
    id: 'c-1',
    legal_name: 'Công ty A',
    tax_id: '0314892345',
    country: 'VN',
    export_markets: ['EU'],
    languages_spoken: ['vi'],
  },
  signals: [{ code: 'shared_tax_id', severity: 'high' }],
  ownership_proven: false,
};

let calls: { method: string; path: string; body?: unknown }[] = [];

function serve(world: { clusters?: unknown[]; blocklist?: unknown[]; queue?: unknown[]; fail?: boolean; post?: Response } = {}) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      const body = req.method === 'POST' ? await req.clone().json().catch(() => undefined) : undefined;
      calls.push({ method: req.method, path: url.pathname, body });
      if (req.method === 'POST') return world.post ?? json(201, {});
      if (req.method === 'DELETE') return new Response(null, { status: 204 });
      if (world.fail) return json(500, {});
      if (url.pathname === '/api/admin/identity-clusters/export.xlsx') return new Response('xlsx', { status: 200 });
      if (url.pathname === '/api/admin/identity-clusters') return json(200, world.clusters ?? []);
      if (url.pathname === '/api/admin/blocklist') return json(200, world.blocklist ?? []);
      if (url.pathname === '/api/admin/verification-queue') return json(200, world.queue ?? []);
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

describe('Danh tính & chặn (I11)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('hiện cụm tài khoản dùng chung định danh và danh sách chặn', async () => {
    serve({ clusters: [cluster], blocklist: [entry] });
    wrap(<AdminIdentity />);
    const first = await screen.findByRole('row', { name: /0314892345/ });
    expect(first).toHaveTextContent('Mã số thuế');
    expect(first).toHaveTextContent('Công ty A');
    // Mỗi doanh nghiệp một dòng; ô định danh và giá trị gộp dọc cả cụm (như merge cell).
    expect(within(first).getByRole('cell', { name: '0314892345' })).toHaveAttribute('rowspan', '2');
    const second = screen.getByRole('row', { name: 'Công ty B' });
    expect(within(second).getAllByRole('cell')).toHaveLength(1);
    expect(screen.getByRole('row', { name: /84912345678/ })).toHaveTextContent('mạo danh');
  });

  it('xuất Excel danh sách cụm gọi đúng endpoint', async () => {
    const createObjectURL = vi.fn(() => 'blob:x');
    const saved = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    serve({ clusters: [cluster] });
    wrap(<AdminIdentity />);
    await screen.findByRole('row', { name: /0314892345/ });
    fireEvent.click(screen.getByRole('button', { name: 'Xuất Excel' }));
    await waitFor(() => expect(calls.some((c) => c.path === '/api/admin/identity-clusters/export.xlsx')).toBe(true));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
    click.mockRestore();
    URL.createObjectURL = saved.create;
    URL.revokeObjectURL = saved.revoke;
  });

  it('chưa có cụm: nút xuất Excel bị tắt', async () => {
    serve();
    wrap(<AdminIdentity />);
    await screen.findByText('Chưa phát hiện doanh nghiệp nào dùng chung định danh.');
    expect(screen.getByRole('button', { name: 'Xuất Excel' })).toBeDisabled();
  });

  it('người đại diện chỉ hiện dạng đã băm, không hiện tên', async () => {
    serve({ clusters: [{ ...cluster, identifier_type: 'representative', value: 'f'.repeat(64) }] });
    wrap(<AdminIdentity />);
    expect(await screen.findByText('(đã băm, không lưu tên)')).toBeInTheDocument();
  });

  it('chặn một định danh gửi loại, giá trị và lý do', async () => {
    serve();
    wrap(<AdminIdentity />);
    fireEvent.change(await screen.findByLabelText('Loại định danh'), { target: { value: 'domain' } });
    fireEvent.change(screen.getByLabelText('Giá trị'), { target: { value: 'fraud-co.vn' } });
    fireEvent.change(screen.getByLabelText('Lý do chặn'), { target: { value: 'mạo danh công ty thật' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chặn' }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')).toEqual({
        method: 'POST',
        path: '/api/admin/blocklist',
        body: { identifier_type: 'domain', value: 'fraud-co.vn', reason: 'mạo danh công ty thật' },
      }),
    );
  });

  it('thiếu lý do thì không gửi', async () => {
    serve();
    wrap(<AdminIdentity />);
    fireEvent.change(await screen.findByLabelText('Giá trị'), { target: { value: '0314892345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chặn' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng nhập giá trị và lý do chặn.');
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('định danh đã bị chặn: báo lỗi 409', async () => {
    serve({ post: json(409, {}) });
    wrap(<AdminIdentity />);
    fireEvent.change(await screen.findByLabelText('Giá trị'), { target: { value: '0314892345' } });
    fireEvent.change(screen.getByLabelText('Lý do chặn'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chặn' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('đã nằm trong danh sách chặn');
  });

  it('gỡ chặn gọi DELETE', async () => {
    serve({ blocklist: [entry] });
    wrap(<AdminIdentity />);
    fireEvent.click(within(await screen.findByRole('row', { name: /84912345678/ })).getByRole('button', { name: 'Gỡ chặn' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/admin/blocklist/b-1')).toBe(true));
  });

  it('chưa có dữ liệu: hiện hướng dẫn thay vì để trống', async () => {
    serve();
    wrap(<AdminIdentity />);
    expect(await screen.findByText('Chưa phát hiện doanh nghiệp nào dùng chung định danh.')).toBeInTheDocument();
    expect(screen.getByText('Danh sách chặn đang trống.')).toBeInTheDocument();
  });

  it('không tải được: báo lỗi', async () => {
    serve({ fail: true });
    wrap(<AdminIdentity />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được dữ liệu danh tính');
  });

  it('bản tiếng Anh dùng nhãn tiếng Anh', async () => {
    serve();
    wrap(<AdminIdentity />, 'en');
    expect(await screen.findByRole('button', { name: 'Block' })).toBeInTheDocument();
  });
});

describe('Kiểm danh tính trong hàng đợi (I11)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('hiện cờ danh tính và trạng thái quyền sở hữu', async () => {
    serve({ queue: [queueItem] });
    wrap(<AdminVerificationQueue />);
    const group = await screen.findByRole('group', { name: 'Kiểm danh tính' });
    expect(group).toHaveTextContent('Chưa chứng minh quyền sở hữu');
    expect(within(group).getByRole('list', { name: 'Cờ danh tính' })).toHaveTextContent('Dùng chung mã số thuế với doanh nghiệp khác');
  });

  it('ghi kết quả gọi lại số chính thức', async () => {
    serve({ queue: [queueItem] });
    wrap(<AdminVerificationQueue />);
    const group = await screen.findByRole('group', { name: 'Kiểm danh tính' });
    fireEvent.change(within(group).getByLabelText('Ghi chú kiểm'), { target: { value: 'giám đốc xác nhận' } });
    fireEvent.click(within(group).getByRole('button', { name: 'Ghi kết quả kiểm' }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')).toEqual({
        method: 'POST',
        path: '/api/admin/companies/c-1/identity-checks',
        body: { check_type: 'phone_callback', result: 'match', note: 'giám đốc xác nhận' },
      }),
    );
  });

  it('tra sổ đăng ký gửi kèm dữ kiện sổ', async () => {
    serve({ queue: [queueItem] });
    wrap(<AdminVerificationQueue />);
    const group = await screen.findByRole('group', { name: 'Kiểm danh tính' });
    fireEvent.change(within(group).getByLabelText('Loại kiểm'), { target: { value: 'registry_lookup' } });
    fireEvent.change(within(group).getByLabelText('Kết quả'), { target: { value: 'mismatch' } });
    fireEvent.change(within(group).getByLabelText('Người đại diện theo sổ đăng ký'), { target: { value: 'Nguyễn Văn An' } });
    fireEvent.change(within(group).getByLabelText('Năm thành lập theo sổ đăng ký'), { target: { value: '2025' } });
    fireEvent.change(within(group).getByLabelText('Trạng thái thuế'), { target: { value: 'inactive' } });
    fireEvent.click(within(group).getByLabelText('Vừa đổi tên'));
    fireEvent.click(within(group).getByRole('button', { name: 'Ghi kết quả kiểm' }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
        check_type: 'registry_lookup',
        result: 'mismatch',
        note: null,
        registry: {
          legal_representative: 'Nguyễn Văn An',
          founded_year: 2025,
          tax_status: 'inactive',
          name_changed_recently: true,
          representative_changed_recently: false,
        },
      }),
    );
  });
});
