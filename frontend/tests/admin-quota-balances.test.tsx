// C2-C: màn admin nhập số dư hạn ngạch (ngày và nguồn bắt buộc, cùng ngày thì cập nhật).
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminQuotaBalances from '@/components/AdminQuotaBalances';
import type { Row } from '@/components/admin-compliance/datasets';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/admin',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const ROWS: Row[] = [
  { id: 'q-1', reviewed: true, canDelete: false, cells: ['EVFTA', 'EU', '100630', '30000 tonne', '0%', '100 EUR/tonne', '2026-01-01', 'Không thời hạn'], values: {}, search: '' },
  { id: 'q-2', reviewed: false, canDelete: true, cells: ['EVFTA', 'EU', '1604', '5000 tonne', '0%', '5%', '2026-01-01', 'Không thời hạn'], values: {}, search: '' },
];

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

interface Call {
  method: string;
  path: string;
  body?: Record<string, unknown>;
}
let calls: Call[] = [];
let balances: Record<string, unknown>[] = [];

function serve(post: () => Response = () => json(201, {})) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      const body = req.method === 'POST' ? ((await req.json()) as Record<string, unknown>) : undefined;
      calls.push({ method: req.method, path: url.pathname, body });
      if (req.method === 'GET') return json(200, balances);
      return post();
    }),
  );
}

function renderPanel(rows: Row[] = ROWS) {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <AdminQuotaBalances rows={rows} />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

const choose = (id: string) => fireEvent.change(screen.getByLabelText('Hạn ngạch'), { target: { value: id } });

describe('AdminQuotaBalances', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('chưa có hạn ngạch: hướng dẫn, không hiện form', () => {
    serve();
    renderPanel([]);
    expect(screen.getByTestId('quota-balances-empty')).toBeInTheDocument();
    expect(screen.queryByLabelText('Hạn ngạch')).toBeNull();
  });

  it('nói rõ các dòng cùng số hiệu và chu kỳ dùng chung số dư', () => {
    serve();
    renderPanel();
    expect(screen.getByText(/dùng chung một số dư/)).toBeInTheDocument();
  });

  it('chọn hạn ngạch: tải số dư; chưa có số liệu thì nói máy tính sẽ hiện "chưa biết số dư"', async () => {
    balances = [];
    serve();
    renderPanel();
    expect(screen.getAllByRole('option')).toHaveLength(3); // placeholder + 2 hạn ngạch
    choose('q-1');
    expect(await screen.findByTestId('balances-none')).toHaveTextContent('chưa biết số dư');
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/admin/tariff-quotas/q-1/balances' });
  });

  it('hiện các số dư đã nhập, mới nhất trước', async () => {
    balances = [
      { id: 'b-2', quota_id: 'q-1', as_of: '2026-09-30', used_volume: '8000.500', source: 'Cổng hải quan', entered_by: null },
      { id: 'b-1', quota_id: 'q-1', as_of: '2026-09-01', used_volume: '5000.000', source: 'Cổng cũ', entered_by: null },
    ];
    serve();
    renderPanel();
    choose('q-1');
    const table = await screen.findByTestId('balances-table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('2026-09-30');
    expect(rows[0]).toHaveTextContent('Cổng hải quan');
    expect(rows[1]).toHaveTextContent('2026-09-01');
  });

  it('lưu: gửi ngày, khối lượng dạng chuỗi và nguồn rồi tải lại danh sách', async () => {
    balances = [];
    serve();
    renderPanel();
    choose('q-2');
    await screen.findByTestId('balances-none');
    fireEvent.change(screen.getByLabelText('Số liệu tại ngày'), { target: { value: '2026-09-30' } });
    fireEvent.change(screen.getByLabelText('Khối lượng đã dùng'), { target: { value: '8000.5' } });
    fireEvent.change(screen.getByLabelText('Nguồn số liệu'), { target: { value: ' Cổng hải quan EU ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu số dư' }));
    expect(await screen.findByText('Đã lưu số dư.')).toBeInTheDocument();
    const post = calls.find((c) => c.method === 'POST');
    expect(post).toMatchObject({
      path: '/api/admin/tariff-quotas/q-2/balances',
      body: { as_of: '2026-09-30', used_volume: '8000.5', source: 'Cổng hải quan EU' },
    });
    expect(calls.filter((c) => c.method === 'GET')).toHaveLength(2);
  });

  it.each([
    ['', 'Cổng hải quan', 'Khối lượng đã dùng phải là số không âm'],
    ['-5', 'Cổng hải quan', 'Khối lượng đã dùng phải là số không âm'],
    ['1e3', 'Cổng hải quan', 'Khối lượng đã dùng phải là số không âm'],
    ['100.1234', 'Cổng hải quan', 'Khối lượng đã dùng phải là số không âm'],
    ['100', '', 'Vui lòng ghi nguồn số liệu'],
    ['100', 'ab', 'Vui lòng ghi nguồn số liệu'],
  ])('khối lượng %j, nguồn %j không hợp lệ thì báo lỗi và không gọi server', async (used, source, message) => {
    balances = [];
    serve();
    renderPanel();
    choose('q-1');
    await screen.findByTestId('balances-none');
    fireEvent.change(screen.getByLabelText('Khối lượng đã dùng'), { target: { value: used } });
    fireEvent.change(screen.getByLabelText('Nguồn số liệu'), { target: { value: source } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu số dư' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('máy chủ trả 422 hoặc 404 thì báo lỗi rõ ràng, không báo đã lưu', async () => {
    balances = [];
    serve(() => json(422, { error: { code: 'validation_error' } }));
    renderPanel();
    choose('q-1');
    await screen.findByTestId('balances-none');
    fireEvent.change(screen.getByLabelText('Khối lượng đã dùng'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Nguồn số liệu'), { target: { value: 'Cổng hải quan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu số dư' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Dữ liệu chưa hợp lệ');
    expect(screen.queryByText('Đã lưu số dư.')).toBeNull();
    cleanup();
    serve(() => json(404, {}));
    renderPanel();
    choose('q-1');
    await waitFor(() => screen.getByLabelText('Khối lượng đã dùng'));
    fireEvent.change(screen.getByLabelText('Khối lượng đã dùng'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Nguồn số liệu'), { target: { value: 'Cổng hải quan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu số dư' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy hạn ngạch');
  });
});
