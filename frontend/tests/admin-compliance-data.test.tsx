import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminComplianceData from '@/components/AdminComplianceData';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/admin',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const REVIEWER = '11111111-1111-1111-1111-111111111111';

const line = (over: Record<string, unknown> = {}) => ({
  id: 'l-1',
  hs_code: '090121',
  destination: 'EU',
  duty_type: 'ad_valorem',
  mfn_rate: '7.5000',
  mfn_specific: null,
  evfta_rate_current: '0.0000',
  staging_category: 'A',
  zero_from: null,
  quota_required: false,
  quota_note: null,
  condition_note: null,
  source_url: null,
  valid_from: '2026-01-01',
  valid_until: null,
  reviewed_by: null,
  reviewed_at: null,
  ...over,
});

const rule = (over: Record<string, unknown> = {}) => ({
  id: 'r-1',
  hs_code: '030617',
  rule_type: 'MaxNOM',
  threshold_pct: '70.00',
  rule_text: null,
  requires_expert: false,
  source: null,
  valid_from: '2026-01-01',
  valid_until: null,
  reviewed_by: null,
  reviewed_at: null,
  ...over,
});

const type = (over: Record<string, unknown> = {}) => ({
  code: 'iso_9001',
  name_vi: 'ISO 9001',
  name_en: 'ISO 9001',
  group: 'quality',
  validity_months: null,
  is_active: true,
  source: null,
  reviewed_by: null,
  reviewed_at: null,
  ...over,
});

const evRule = (over: Record<string, unknown> = {}) => ({
  id: 'er-1',
  category: 'agriculture',
  evidence_type_code: 'iso_9001',
  is_required: true,
  note: null,
  reviewed_by: null,
  reviewed_at: null,
  ...over,
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

interface World {
  lines?: unknown[];
  rules?: unknown[];
  types?: unknown[];
  evRules?: unknown[];
  fail?: boolean;
  action?: (method: string, path: string) => Response;
}

let calls: { method: string; path: string }[] = [];

function serve(world: World = {}) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const { pathname } = new URL(req.url);
      calls.push({ method: req.method, path: pathname });
      if (req.method !== 'GET') return world.action ? world.action(req.method, pathname) : new Response(null, { status: req.method === 'DELETE' ? 204 : 200 });
      if (world.fail) return json(500, {});
      if (pathname === '/api/admin/tariff-lines') return json(200, world.lines ?? []);
      if (pathname === '/api/admin/roo-rules') return json(200, world.rules ?? []);
      if (pathname === '/api/admin/evidence-types') return json(200, world.types ?? []);
      if (pathname === '/api/admin/evidence-rules') return json(200, world.evRules ?? []);
      throw new Error(`unexpected ${pathname}`);
    }),
  );
}

function renderData(locale: 'vi' | 'en' = 'vi') {
  render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <LanguageProvider>
        <AdminComplianceData />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

const tab = (name: string) => fireEvent.click(screen.getByRole('tab', { name }));
const actions = () => calls.filter((c) => c.method !== 'GET');

describe('Dữ liệu tuân thủ (admin)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('có bốn nhóm dữ liệu và chú thích: chưa duyệt không ra công khai', async () => {
    serve();
    renderData();
    expect(await screen.findByText(/không bao giờ hiện ra công khai/)).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Dòng thuế',
      'Quy tắc xuất xứ',
      'Loại bằng chứng',
      'Luật bằng chứng theo nhóm hàng',
    ]);
  });

  it('chưa có dữ liệu: hướng dẫn nhập bằng script CSV', async () => {
    serve();
    renderData();
    expect(await screen.findByRole('status')).toHaveTextContent('script CSV');
  });

  it('dòng thuế: hiện thuế suất, trạng thái và đếm số dòng chưa duyệt', async () => {
    serve({ lines: [line(), line({ id: 'l-2', hs_code: '090111', reviewed_by: REVIEWER })] });
    renderData();
    const table = await screen.findByRole('region', { name: 'Dòng thuế' });
    expect(table).toHaveTextContent('1 dòng chưa duyệt / 2');
    expect(table).toHaveTextContent('7.5%');
    expect(within(table).getAllByText('Chưa duyệt')).toHaveLength(1);
    expect(within(table).getAllByText('Đã duyệt')).toHaveLength(1);
  });

  it('chỉ dòng chưa duyệt có nút Duyệt và Xóa; dòng đã duyệt thì không', async () => {
    serve({ lines: [line({ reviewed_by: REVIEWER })] });
    renderData();
    await screen.findByRole('region', { name: 'Dòng thuế' });
    expect(screen.queryByRole('button', { name: 'Duyệt' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xóa' })).not.toBeInTheDocument();
  });

  it('duyệt dòng thuế gọi đúng endpoint rồi tải lại', async () => {
    serve({ lines: [line()] });
    renderData();
    fireEvent.click(await screen.findByRole('button', { name: 'Duyệt' }));
    await waitFor(() => expect(actions()).toEqual([{ method: 'POST', path: '/api/admin/tariff-lines/l-1/review' }]));
    await waitFor(() => expect(calls.filter((c) => c.method === 'GET' && c.path === '/api/admin/tariff-lines').length).toBeGreaterThan(1));
  });

  it('xóa dòng thuế chưa duyệt gọi DELETE', async () => {
    serve({ lines: [line()] });
    renderData();
    fireEvent.click(await screen.findByRole('button', { name: 'Xóa' }));
    await waitFor(() => expect(actions()).toEqual([{ method: 'DELETE', path: '/api/admin/tariff-lines/l-1' }]));
  });

  it('quy tắc xuất xứ: hiện loại, ngưỡng, duyệt và xóa', async () => {
    serve({ rules: [rule()] });
    renderData();
    tab('Quy tắc xuất xứ');
    const table = await screen.findByRole('region', { name: 'Quy tắc xuất xứ' });
    expect(table).toHaveTextContent('MaxNOM');
    expect(table).toHaveTextContent('70%');
    fireEvent.click(within(table).getByRole('button', { name: 'Duyệt' }));
    await waitFor(() => expect(actions()).toEqual([{ method: 'POST', path: '/api/admin/roo-rules/r-1/review' }]));
  });

  it('loại bằng chứng: duyệt theo mã, không có nút Xóa', async () => {
    serve({ types: [type()] });
    renderData();
    tab('Loại bằng chứng');
    fireEvent.click(await screen.findByRole('button', { name: 'Duyệt' }));
    await waitFor(() => expect(actions()).toEqual([{ method: 'POST', path: '/api/admin/evidence-types/iso_9001/review' }]));
    expect(screen.queryByRole('button', { name: 'Xóa' })).not.toBeInTheDocument();
  });

  it('luật bằng chứng: phân biệt Bắt buộc và Chỉ nhắc; xóa được cả luật đã duyệt', async () => {
    serve({
      evRules: [
        evRule({ reviewed_by: REVIEWER }),
        evRule({ id: 'er-2', evidence_type_code: 'eudr_file', is_required: false, note: 'Nộp hồ sơ EUDR' }),
      ],
    });
    renderData();
    tab('Luật bằng chứng theo nhóm hàng');
    const table = await screen.findByRole('region', { name: 'Luật bằng chứng theo nhóm hàng' });
    expect(table).toHaveTextContent('Bắt buộc');
    expect(table).toHaveTextContent('Chỉ nhắc');
    expect(table).toHaveTextContent('Nộp hồ sơ EUDR');
    fireEvent.click(within(table).getAllByRole('button', { name: 'Xóa' })[0]);
    await waitFor(() => expect(actions()).toEqual([{ method: 'DELETE', path: '/api/admin/evidence-rules/er-1' }]));
  });

  it('thao tác lỗi: hiện thông báo và tải lại danh sách', async () => {
    serve({ lines: [line({ reviewed_by: null })], action: () => json(409, {}) });
    renderData();
    fireEvent.click(await screen.findByRole('button', { name: 'Xóa' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Dòng đã duyệt không xóa được');
  });

  it('không tải được: báo lỗi, không giả vờ chưa có dữ liệu', async () => {
    serve({ fail: true });
    renderData();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được dữ liệu');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('bản tiếng Anh dùng nhãn tiếng Anh', async () => {
    serve({ lines: [line()] });
    renderData('en');
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });
});
