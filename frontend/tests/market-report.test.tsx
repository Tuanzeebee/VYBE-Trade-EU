import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminConsultingLeads from '@/components/AdminConsultingLeads';
import MarketReportPanel from '@/components/MarketReportPanel';
import { LanguageProvider } from '@/context/LanguageContext';
import { moneyInput } from '@/lib/marketReportApi';
import type { ProductOut } from '@/lib/productsApi';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter/market-report',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const ID = '11111111-1111-4111-8111-111111111111';
const base = { id: ID, query: 'cá tra', language: 'vi', product_id: null, created_at: '2026-10-02T08:00:00Z', finished_at: null };
const SECTIONS = ['positioning', 'summary', 'market', 'recommendations', 'segments', 'competition', 'compliance', 'branding', 'risks', 'next_steps'];
const FREE = ['positioning', 'summary', 'recommendations'];
const TITLES: Record<string, string> = { positioning: 'Định vị và năng lực', summary: 'Tóm tắt', recommendations: 'Thị trường nên ưu tiên', segments: 'Phân khúc thị trường', risks: 'Rủi ro cần lưu ý' };
const row = (country: string) => ({ country, value: '42700000', share: '0.7194', growth: '0.1420', unit_price: '3.39' });

function ready(full: boolean) {
  return {
    ...base,
    status: 'ready',
    finished_at: '2026-10-02T08:00:20Z',
    full,
    product_name: 'Phi lê cá tra đông lạnh',
    year: 2025,
    source: 'Eurostat Comext (DS-045409)',
    narrative_source: 'template',
    tariff_data_status: 'demo_unreviewed',
    sections: SECTIONS.map((key) => {
      const locked = !full && !FREE.includes(key);
      return { key, title: TITLES[key] ?? key, text: locked || key === 'segments' ? '' : `Lời văn ${key}: Đức nhập 42,7 triệu EUR.`, locked };
    }),
    positioning: { score: '58.3', axes: { volume: '50.0', certification: '33.3', trust: '100.0', experience: '50.0' } },
    top_markets: [row('ES'), row('DE'), row('NL')],
    potential_markets: [row('AT')],
    competitors: full ? [{ country: 'VN', value: '153616600', share: '0.9976', growth: null, unit_price: '2.61' }] : [],
    pdf_url: full ? 'https://fake/market-reports/x.pdf' : null,
    error: null,
  };
}

type Call = { method: string; path: string; body: unknown };
let calls: Call[] = [];
function serve(routes: (call: Call) => Response | undefined) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      const text = req.method === 'GET' ? '' : await req.text();
      const call = { method: req.method, path: url.pathname + url.search, body: text ? JSON.parse(text) : null };
      calls.push(call);
      return routes(call) ?? json(404, {});
    }),
  );
}

const products = [{ id: 'p-1', name: 'Cá tra phi lê' }] as unknown as ProductOut[];

function fillStep1(orientation: string) {
  fireEvent.change(screen.getByLabelText('Sản phẩm của bạn'), { target: { value: 'p-1' } });
  fireEvent.change(screen.getByLabelText('Định hướng bán hàng'), { target: { value: orientation } });
}
const wrap = (ui: React.ReactElement) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>{ui}</LanguageProvider>
    </NextIntlClientProvider>,
  );

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Báo cáo go-to-market (U18)', () => {
  it('tạo từ sản phẩm của công ty → chờ job → bản tóm tắt: phần đầy đủ khoá, không có PDF, dẫn tới bảng giá', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
    let detail: unknown = { ...base, status: 'queued', full: false };
    serve((call) => {
      if (call.path === '/api/exporter/market-reports' && call.method === 'GET') return json(200, []);
      if (call.path === '/api/exporter/market-reports' && call.method === 'POST') return json(202, { ...base, status: 'queued', full: false });
      if (call.path === `/api/exporter/market-reports/${ID}`) return json(200, detail);
      return undefined;
    });
    wrap(<MarketReportPanel products={products} />);
    fillStep1('oem');
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    fireEvent.change(screen.getByLabelText(/Doanh thu xuất khẩu dự kiến/), { target: { value: '1.000.000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo báo cáo' }));
    expect(await screen.findByText('Đang dựng báo cáo, thường mất dưới một phút…')).toBeInTheDocument();
    const post = calls.find((c) => c.method === 'POST');
    expect(post?.body).toEqual({
      product_id: 'p-1',
      q: '',
      language: 'vi',
      target_market: null,
      sales_orientation: 'oem',
      other_text: null,
      expected_revenue: '1000000',
      annual_volume: null,
      budget: null,
    });

    detail = ready(false);
    await act(() => vi.advanceTimersByTimeAsync(3000));
    const view = await screen.findByTestId('report-view');
    expect(within(view).getByRole('region', { name: 'Tóm tắt' })).toHaveTextContent('Lời văn summary');
    expect(within(view).getByTestId('positioning-chart')).toHaveTextContent('58.3/100');
    expect(within(view).getAllByRole('region')[0]).toHaveAccessibleName('Định vị và năng lực'); // định vị đứng đầu
    expect(within(view).getByRole('region', { name: 'Rủi ro cần lưu ý' })).toHaveTextContent('Phần này có trong bản đầy đủ.');
    expect(within(view).getByRole('table', { name: 'Thị trường nên ưu tiên' })).toBeInTheDocument();
    expect(within(view).queryByRole('link', { name: 'Tải PDF' })).toBeNull();
    expect(within(view).getByRole('link', { name: 'Xem gói báo cáo đầy đủ' })).toHaveAttribute('href', '/vi/pricing');
    expect(view).toHaveTextContent('Dữ liệu thuế minh hoạ, chưa được luật TM duyệt.');
  });

  it('bản đầy đủ: mọi phần mở, có PDF và đối thủ; gửi yêu cầu tư vấn VBA', async () => {
    serve((call) => {
      if (call.path === '/api/exporter/market-reports' && call.method === 'GET') return json(200, [{ ...base, status: 'ready' }]);
      if (call.path === `/api/exporter/market-reports/${ID}`) return json(200, ready(true));
      if (call.path === '/api/exporter/consulting-leads') return json(201, {});
      return undefined;
    });
    wrap(<MarketReportPanel products={products} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Xem' }));
    const view = await screen.findByTestId('report-view');
    expect(within(view).getByRole('link', { name: 'Tải PDF' })).toHaveAttribute('href', 'https://fake/market-reports/x.pdf');
    expect(within(view).queryByText('Phần này có trong bản đầy đủ.')).toBeNull();
    expect(view).toHaveTextContent('Việt Nam: 99,8%');

    fireEvent.click(within(view).getByRole('button', { name: 'Tư vấn triển khai qua mạng lưới VBA' }));
    const form = within(view).getByRole('form', { name: 'Tư vấn triển khai qua mạng lưới VBA' });
    fireEvent.click(within(form).getByRole('button', { name: 'Gửi yêu cầu tư vấn' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('Vui lòng nhập tên và email liên hệ.');
    fireEvent.change(within(form).getByLabelText('Người liên hệ'), { target: { value: 'Nguyễn Văn A' } });
    fireEvent.change(within(form).getByLabelText('Email'), { target: { value: 'a@nongsan.vn' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Gửi yêu cầu tư vấn' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Mạng lưới VBA sẽ liên hệ');
    expect(calls.find((c) => c.path === '/api/exporter/consulting-leads')?.body).toEqual({
      report_id: ID,
      contact_name: 'Nguyễn Văn A',
      contact_email: 'a@nongsan.vn',
      phone: null,
      message: null,
    });
  });

  it('ngay khi mở form đã thấy báo cáo gồm 3 bước và đang ở bước nào', async () => {
    serve(() => json(200, []));
    wrap(<MarketReportPanel products={products} />);
    expect(await screen.findByText(/Báo cáo gồm 3 bước/)).toBeInTheDocument();
    const steps = screen.getByRole('list', { name: 'Các bước tạo báo cáo' });
    const items = within(steps).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['1Định hướng', '2Mục tiêu', '3Xác nhận']);
    expect(items[0]).toHaveAttribute('aria-current', 'step');
    expect(items[1]).not.toHaveAttribute('aria-current');
    fillStep1('bulk');
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(within(steps).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step');
  });

  it('chưa có sản phẩm: hướng dẫn thêm sản phẩm, không có nút tạo báo cáo', async () => {
    serve(() => json(200, []));
    wrap(<MarketReportPanel products={[]} />);
    expect(await screen.findByRole('status')).toHaveTextContent('Bạn cần thêm ít nhất một sản phẩm');
    expect(screen.queryByRole('button', { name: 'Tạo báo cáo' })).toBeNull();
  });

  it('từng bước kiểm dữ liệu: thương hiệu riêng bắt buộc ngân sách thương hiệu, doanh thu bắt buộc', async () => {
    serve((call) => (call.method === 'GET' ? json(200, []) : undefined));
    wrap(<MarketReportPanel products={products} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chọn sản phẩm.');
    fillStep1('own_brand');
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nhập doanh thu xuất khẩu dự kiến');
    fireEvent.change(screen.getByLabelText(/Doanh thu xuất khẩu dự kiến/), { target: { value: '1,5 tỷ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nhập doanh thu xuất khẩu dự kiến');
    fireEvent.change(screen.getByLabelText(/Doanh thu xuất khẩu dự kiến/), { target: { value: '1000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nhập ngân sách làm thương hiệu');
    expect(screen.getByLabelText(/Ngân sách làm thương hiệu/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('bán thô: ngân sách bán hàng không bắt buộc; sản phẩm chưa có thống kê thì báo rõ', async () => {
    serve((call) => {
      if (call.method === 'GET') return json(200, []);
      return json(422, { error: { code: 'no_trade_data', message: 'x' } });
    });
    wrap(<MarketReportPanel products={products} />);
    fillStep1('bulk');
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(screen.getByLabelText(/Ngân sách bán hàng/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Ngân sách làm thương hiệu/)).toBeNull();
    fireEvent.change(screen.getByLabelText(/Doanh thu xuất khẩu dự kiến/), { target: { value: '500000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo báo cáo' }));
    expect(await screen.findByText(/Chưa có thống kê thương mại cho sản phẩm này/)).toBeInTheDocument();
  });

  it('số tiền EUR nguyên chấp nhận dấu phân cách hàng nghìn', () => {
    expect(moneyInput('20.000')).toBe('20000');
    expect(moneyInput(' 1 000 000 ')).toBe('1000000');
    expect(moneyInput('')).toBeNull();
    expect(moneyInput('12a')).toBeUndefined();
  });

  it('admin: danh sách yêu cầu tư vấn và đánh dấu đã liên hệ', async () => {
    const lead = {
      id: 'l-1',
      company_id: 'c-1',
      report_id: ID,
      contact_name: 'Nguyễn Văn A',
      contact_email: 'a@nongsan.vn',
      phone: null,
      message: 'Cần tư vấn thị trường Đức',
      status: 'new',
      handled_at: null,
      created_at: '2026-10-02T08:00:00Z',
      company_name: 'Công ty TNHH Nông Sản Việt',
      report_query: 'cá tra',
    };
    serve((call) => {
      if (call.path.startsWith('/api/admin/consulting-leads') && call.method === 'GET') return json(200, [lead]);
      if (call.method === 'PATCH') return json(200, { ...lead, status: 'contacted' });
      return undefined;
    });
    wrap(<AdminConsultingLeads />);
    const item = await screen.findByRole('listitem', { name: 'Công ty TNHH Nông Sản Việt' });
    expect(item).toHaveTextContent('Từ báo cáo: cá tra');
    expect(calls[0].path).toBe('/api/admin/consulting-leads?status=new');
    fireEvent.click(within(item).getByRole('button', { name: 'Đánh dấu đã liên hệ' }));
    await screen.findByRole('listitem', { name: 'Công ty TNHH Nông Sản Việt' });
    expect(calls.find((c) => c.method === 'PATCH')).toMatchObject({ path: '/api/admin/consulting-leads/l-1', body: { status: 'contacted' } });
  });
});
