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
  quota_note_en: null,
  condition_note_en: null,
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

const term = (over: Record<string, unknown> = {}) => ({
  id: 't-1',
  hs_code: '090121',
  country: 'DE',
  vat_rate: '7.0000',
  label_languages: 'de',
  note: null,
  note_en: null,
  source: null,
  valid_from: '2026-01-01',
  valid_until: null,
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
  terms?: unknown[];
  fail?: boolean;
  action?: (method: string, path: string) => Response;
  importResult?: (search: string) => Response;
}

const IMPORT_OK = { created: 2, updated: 1, unchanged: 3, dry_run: true, applied: false, errors: [] };

let calls: { method: string; path: string; search: string; body: string }[] = [];

function serve(world: World = {}) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const { pathname, search } = new URL(req.url);
      const body = req.method === 'GET' || req.body === null ? '' : await req.clone().text().catch(() => '');
      calls.push({ method: req.method, path: pathname, search, body });
      if (pathname.endsWith('/import')) return world.importResult ? world.importResult(search) : json(200, IMPORT_OK);
      if (pathname.endsWith('.xlsx')) return new Response('xlsx', { status: 200 });
      if (req.method !== 'GET') return world.action ? world.action(req.method, pathname) : new Response(null, { status: req.method === 'DELETE' ? 204 : 200 });
      if (world.fail) return json(500, {});
      if (pathname === '/api/admin/tariff-lines') return json(200, world.lines ?? []);
      if (pathname === '/api/admin/roo-rules') return json(200, world.rules ?? []);
      if (pathname === '/api/admin/evidence-types') return json(200, world.types ?? []);
      if (pathname === '/api/admin/evidence-rules') return json(200, world.evRules ?? []);
      if (pathname === '/api/admin/country-terms') return json(200, world.terms ?? []);
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
const actions = () => calls.filter((c) => c.method !== 'GET').map(({ method, path }) => ({ method, path }));

describe('Dữ liệu tuân thủ (admin)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('có năm nhóm dữ liệu và chú thích: chưa duyệt không ra công khai', async () => {
    serve();
    renderData();
    expect(await screen.findByText(/không bao giờ hiện ra công khai/)).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Dòng thuế',
      'Quy tắc xuất xứ',
      'VAT theo nước',
      'Loại bằng chứng',
      'Luật bằng chứng theo nhóm hàng',
      'Hiệp định thương mại',
    ]);
  });

  it('chưa có dữ liệu: hướng dẫn dùng nút Thêm hoặc Nhập Excel', async () => {
    serve();
    renderData();
    expect(await screen.findByRole('status')).toHaveTextContent('Nhập Excel');
  });

  it('dòng thuế: hiện thuế suất, trạng thái và đếm số dòng chưa duyệt', async () => {
    serve({ lines: [line(), line({ id: 'l-2', hs_code: '090111', reviewed_by: REVIEWER })] });
    renderData();
    const table = await screen.findByRole('region', { name: 'Dòng thuế' });
    expect(table).toHaveTextContent('1 dòng chưa duyệt / 2');
    expect(table).toHaveTextContent('7.5%');
    const grid = within(within(table).getByRole('table'));
    expect(grid.getAllByText('Chưa duyệt')).toHaveLength(1);
    expect(grid.getAllByText('Đã duyệt')).toHaveLength(1);
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

  it('VAT theo nước: hiện VAT và nút Duyệt; duyệt gọi đúng id', async () => {
    serve({ terms: [term()] });
    renderData();
    tab('VAT theo nước');
    const table = await screen.findByRole('region', { name: 'VAT theo nước' });
    expect(table).toHaveTextContent('7%');
    expect(table).toHaveTextContent('DE');
    fireEvent.click(within(table).getByRole('button', { name: 'Duyệt' }));
    await waitFor(() => expect(actions()).toEqual([{ method: 'POST', path: '/api/admin/country-terms/t-1/review' }]));
  });

  it('VAT theo nước không có nút Excel; Dòng thuế vẫn có', async () => {
    serve({ terms: [term()] });
    renderData();
    expect(await screen.findByRole('button', { name: 'Xuất Excel' })).toBeInTheDocument();
    tab('VAT theo nước');
    await screen.findByRole('region', { name: 'VAT theo nước' });
    expect(screen.getByRole('button', { name: 'Thêm' })).toBeInTheDocument();
    for (const name of ['Tải template', 'Xuất Excel', 'Nhập Excel']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
  });

  it('VAT theo nước chưa có dữ liệu: hướng dẫn chỉ nhắc nút Thêm, không nhắc Excel', async () => {
    serve();
    renderData();
    tab('VAT theo nước');
    const hint = await screen.findByText('Chưa có dữ liệu. Dùng nút Thêm để bắt đầu.');
    expect(hint).not.toHaveTextContent('Excel');
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
  it('cột hiệu lực tách thành Từ ngày và Đến ngày; để trống hiện Không thời hạn', async () => {
    serve({ lines: [line({ valid_from: '2026-01-01', valid_until: '2027-06-30' }), line({ id: 'l-2', hs_code: '090111' })] });
    renderData();
    const table = await screen.findByRole('region', { name: 'Dòng thuế' });
    const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toContain('Từ ngày');
    expect(headers).toContain('Đến ngày');
    expect(headers).not.toContain('Hiệu lực');
    expect(table).toHaveTextContent('2027-06-30');
    expect(table).toHaveTextContent('Không thời hạn');
  });

  it('chú thích giải thích các giá trị của cột Loại thuế', async () => {
    serve({ lines: [line()] });
    renderData();
    const legend = (await screen.findByText('Chú thích các cột và giá trị')).closest('details') as HTMLElement;
    for (const value of ['ad_valorem', 'specific', 'mixed']) expect(within(legend).getByText(value)).toBeInTheDocument();
    expect(legend).toHaveTextContent('cần xem xét');
  });

  it('phân trang: 25 dòng chia 2 trang, Sau/Trước chuyển trang', async () => {
    const lines = Array.from({ length: 25 }, (_, i) => line({ id: `l-${i}`, hs_code: String(100000 + i) }));
    serve({ lines });
    renderData();
    const table = await screen.findByRole('region', { name: 'Dòng thuế' });
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 20);
    expect(table).toHaveTextContent('1–20 / 25');
    fireEvent.click(screen.getByRole('button', { name: 'Sau' }));
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 5);
    expect(table).toHaveTextContent('21–25 / 25');
    expect(screen.getByRole('button', { name: 'Sau' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Trước' }));
    expect(table).toHaveTextContent('1–20 / 25');
  });

  it('ít hơn 21 dòng thì không hiện phân trang', async () => {
    serve({ lines: [line()] });
    renderData();
    await screen.findByRole('region', { name: 'Dòng thuế' });
    expect(screen.queryByRole('navigation', { name: 'Phân trang' })).not.toBeInTheDocument();
  });

  it('tìm kiếm lọc dòng (không phân biệt dấu) và về trang 1; không khớp thì báo', async () => {
    const lines = [
      line({ id: 'a', hs_code: '090121', condition_note: 'Cà phê rang xay' }),
      line({ id: 'b', hs_code: '100630' }),
      ...Array.from({ length: 22 }, (_, i) => line({ id: `x-${i}`, hs_code: String(200000 + i) })),
    ];
    serve({ lines });
    renderData();
    const table = await screen.findByRole('region', { name: 'Dòng thuế' });
    fireEvent.click(screen.getByRole('button', { name: 'Sau' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm kiếm' }), { target: { value: 'ca phe' } });
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 1);
    expect(table).toHaveTextContent('090121');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm kiếm' }), { target: { value: 'không có gì' } });
    expect(await screen.findByRole('status')).toHaveTextContent('Không có dòng nào khớp');
  });

  it('lọc theo trạng thái duyệt', async () => {
    serve({ lines: [line(), line({ id: 'l-2', hs_code: '090111', reviewed_by: REVIEWER })] });
    renderData();
    const table = await screen.findByRole('region', { name: 'Dòng thuế' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Trạng thái' }), { target: { value: 'reviewed' } });
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 1);
    expect(table).toHaveTextContent('090111');
  });

  it('thêm dòng thuế: bắt buộc nhập, gửi đúng body, thuế suất là chuỗi', async () => {
    serve();
    renderData();
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Mã HS');
    expect(actions()).toEqual([]);
    fireEvent.change(within(dialog).getByLabelText(/Mã HS/), { target: { value: '090121' } });
    fireEvent.change(within(dialog).getByLabelText(/MFN/), { target: { value: '7.5' } });
    fireEvent.change(within(dialog).getByLabelText(/Từ ngày/), { target: { value: '2026-01-01' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(actions()).toEqual([{ method: 'POST', path: '/api/admin/tariff-lines' }]));
    const sent = JSON.parse(calls.find((c) => c.method === 'POST')!.body);
    expect(sent).toMatchObject({ hs_code: '090121', destination: 'EU', duty_type: 'ad_valorem', mfn_rate: '7.5', quota_required: false, valid_from: '2026-01-01' });
    expect(sent).not.toHaveProperty('valid_until');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('thêm lỗi: hiện thông báo trong form và giữ form mở', async () => {
    serve({ action: () => json(422, { error: { code: 'unknown_hs_code', message: 'x' } }) });
    renderData();
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Mã HS/), { target: { value: '999999' } });
    fireEvent.change(within(dialog).getByLabelText(/Từ ngày/), { target: { value: '2026-01-01' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Mã HS không có trong danh mục');
  });

  it('sửa dòng đã duyệt: cảnh báo về chưa duyệt, PATCH chỉ trường đã đổi', async () => {
    serve({ lines: [line({ reviewed_by: REVIEWER })] });
    renderData();
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('về Chưa duyệt');
    expect(within(dialog).getByLabelText(/MFN/)).toHaveValue('7.5');
    fireEvent.change(within(dialog).getByLabelText(/MFN/), { target: { value: '9' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(actions()).toEqual([{ method: 'PATCH', path: '/api/admin/tariff-lines/l-1' }]));
    expect(JSON.parse(calls.find((c) => c.method === 'PATCH')!.body)).toEqual({ mfn_rate: '9' });
  });

  it('sửa loại bằng chứng: mã bị khóa; xóa ô trống gửi null', async () => {
    serve({ types: [type({ validity_months: 12 })] });
    renderData();
    tab('Loại bằng chứng');
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText(/^Mã/)).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/Hạn \(tháng\)/), { target: { value: '' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(actions()).toEqual([{ method: 'PATCH', path: '/api/admin/evidence-types/iso_9001' }]));
    expect(JSON.parse(calls.find((c) => c.method === 'PATCH')!.body)).toEqual({ validity_months: null });
  });

  it('luật bằng chứng sửa được qua PATCH', async () => {
    serve({ evRules: [evRule()] });
    renderData();
    tab('Luật bằng chứng theo nhóm hàng');
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText(/Bắt buộc/));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(actions()).toEqual([{ method: 'PATCH', path: '/api/admin/evidence-rules/er-1' }]));
    expect(JSON.parse(calls.find((c) => c.method === 'PATCH')!.body)).toEqual({ is_required: false });
  });

  it('tải template và xuất Excel gọi đúng endpoint theo nhóm dữ liệu', async () => {
    const createObjectURL = vi.fn(() => 'blob:x');
    const saved = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    serve();
    renderData();
    fireEvent.click(await screen.findByRole('button', { name: 'Tải template' }));
    await waitFor(() => expect(calls.some((c) => c.path === '/api/admin/tariff-lines/template.xlsx')).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'Xuất Excel' }));
    await waitFor(() => expect(calls.some((c) => c.path === '/api/admin/tariff-lines/export.xlsx')).toBe(true));
    tab('Quy tắc xuất xứ');
    fireEvent.click(await screen.findByRole('button', { name: 'Xuất Excel' }));
    await waitFor(() => expect(calls.some((c) => c.path === '/api/admin/roo-rules/export.xlsx')).toBe(true));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(3));
    click.mockRestore();
    URL.createObjectURL = saved.create;
    URL.revokeObjectURL = saved.revoke;
  });

  it('nhập Excel: kiểm tra thử trước, xác nhận rồi mới ghi', async () => {
    serve({ importResult: (search) => json(200, search.includes('dry_run=true') ? IMPORT_OK : { ...IMPORT_OK, dry_run: false, applied: true }) });
    renderData();
    fireEvent.click(await screen.findByRole('button', { name: 'Nhập Excel' }));
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Nhập vào hệ thống' });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Chọn file .xlsx'), { target: { files: [new File(['x'], 'tariff.xlsx')] } });
    expect(await within(dialog).findByRole('status')).toHaveTextContent('Dòng mới2');
    expect(calls.filter((c) => c.path.endsWith('/import')).map((c) => c.search)).toEqual(['?dry_run=true']);
    await waitFor(() => expect(confirm).toBeEnabled());
    fireEvent.click(confirm);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(calls.filter((c) => c.path.endsWith('/import')).map((c) => c.search)).toEqual(['?dry_run=true', '?dry_run=false']);
    expect(screen.getByText(/Đã nhập xong/)).toBeInTheDocument();
  });

  it('nhập Excel có lỗi: liệt kê theo dòng và không cho xác nhận', async () => {
    serve({ importResult: () => json(200, { ...IMPORT_OK, created: 0, errors: [{ row: 3, message: 'hs_code: sai' }] }) });
    renderData();
    fireEvent.click(await screen.findByRole('button', { name: 'Nhập Excel' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Chọn file .xlsx'), { target: { files: [new File(['x'], 'a.xlsx')] } });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Dòng 3: hs_code: sai');
    expect(within(dialog).getByRole('button', { name: 'Nhập vào hệ thống' })).toBeDisabled();
  });
});
