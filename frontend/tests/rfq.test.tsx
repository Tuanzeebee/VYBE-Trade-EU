import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RfqForm from '@/components/RfqForm';
import RfqInbox from '@/components/RfqInbox';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/suppliers/nong-san',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const PRODUCTS = [
  { id: 'p-1', name: 'Gạo thơm Jasmine', unit: 'kg' },
  { id: 'p-2', name: 'Cà phê nhân', unit: 'tấn' },
];

const rfq = (over: Record<string, unknown> = {}) => ({
  id: 'r-1',
  product_id: 'p-1',
  product_name: 'Gạo thơm Jasmine',
  buyer_company_id: 'b-1',
  buyer_name: 'Global Foods GmbH',
  buyer_verified: false,
  exporter_company_id: 'e-1',
  exporter_name: 'Nông Sản Lúa Vàng',
  quantity: '500.50',
  unit: 'kg',
  target_price: '2.35',
  currency: 'EUR',
  incoterms: 'CIF',
  destination_country: 'DE',
  destination_port: 'Hamburg',
  required_date: '2026-12-01',
  message: 'Cần báo giá gấp.',
  status: 'new',
  created_at: '2026-09-30T01:00:00Z',
  updated_at: '2026-09-30T01:00:00Z',
  ...over,
});

interface World {
  role?: 'buyer' | 'exporter' | null;
  create?: () => Response;
  rfqs?: unknown[] | null;
  opened?: unknown;
  patched?: unknown;
  quota?: unknown;
}
let calls: { method: string; path: string; body: unknown }[] = [];

function serve(world: World) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      const text = await req.text();
      calls.push({ method: req.method, path, body: text ? JSON.parse(text) : null });
      if (path === '/api/me') {
        return world.role ? json(200, { id: 'u-1', email: 'u@x.vn', role: world.role, preferred_language: 'vi' }) : json(401, {});
      }
      if (path === '/api/buyer/rfqs') return world.create ? world.create() : json(201, rfq());
      if (path === '/api/buyer/rfq-quota') return world.quota ? json(200, world.quota) : json(404, {});
      if (path === '/api/me/rfqs') return world.rfqs === null ? json(500, {}) : json(200, world.rfqs ?? []);
      if (req.method === 'GET' && path.startsWith('/api/me/rfqs/')) return json(200, world.opened ?? rfq({ status: 'viewed' }));
      if (req.method === 'PATCH') return world.patched ? json(200, world.patched) : json(409, {});
      return json(404, {});
    }),
  );
}

const wrap = (ui: React.ReactElement) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>{ui}</LanguageProvider>
    </NextIntlClientProvider>,
  );

afterEach(() => vi.unstubAllGlobals());

async function fillAndSend(quantity = '500.50') {
  fireEvent.change(await screen.findByLabelText('Số lượng'), { target: { value: quantity } });
  fireEvent.change(screen.getByLabelText('Ngày cần hàng'), { target: { value: '2099-01-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu báo giá' }));
}

describe('Form yêu cầu báo giá (F1)', () => {
  it('khách: hướng dẫn đăng nhập, không có form', async () => {
    serve({ role: null });
    wrap(<RfqForm products={PRODUCTS} supplierName="Nông Sản Lúa Vàng" />);
    expect(await screen.findByRole('link', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Số lượng')).toBeNull();
  });

  it('exporter: chỉ buyer mới gửi được', async () => {
    serve({ role: 'exporter' });
    wrap(<RfqForm products={PRODUCTS} supplierName="X" />);
    expect(await screen.findByRole('status')).toHaveTextContent('Chỉ tài khoản buyer');
    expect(screen.queryByLabelText('Số lượng')).toBeNull();
  });

  it('buyer gửi đủ trường; số lượng và giá đi lên dưới dạng chuỗi', async () => {
    serve({ role: 'buyer' });
    wrap(<RfqForm products={PRODUCTS} supplierName="Nông Sản Lúa Vàng" />);
    fireEvent.change(await screen.findByLabelText('Sản phẩm'), { target: { value: 'p-2' } });
    expect(screen.getByLabelText('Đơn vị')).toHaveValue('tấn'); // đơn vị theo sản phẩm
    fireEvent.change(screen.getByLabelText('Giá mục tiêu (không bắt buộc)'), { target: { value: '2.35' } });
    fireEvent.change(screen.getByLabelText('Điều kiện giao hàng (Incoterms)'), { target: { value: 'FOB' } });
    fireEvent.change(screen.getByLabelText('Cảng nhận hàng (không bắt buộc)'), { target: { value: ' Hamburg ' } });
    await fillAndSend();
    expect(await screen.findByRole('status')).toHaveTextContent('Đã gửi yêu cầu báo giá tới Nông Sản Lúa Vàng');
    const post = calls.find((c) => c.path === '/api/buyer/rfqs');
    expect(post?.body).toEqual({
      product_id: 'p-2',
      quantity: '500.50',
      unit: 'tấn',
      target_price: '2.35',
      currency: 'EUR',
      incoterms: 'FOB',
      destination_country: 'DE',
      destination_port: 'Hamburg',
      required_date: '2099-01-01',
      message: null,
    });
    expect(screen.getByRole('link', { name: 'Xem các yêu cầu đã gửi' }).getAttribute('href')).toContain('/buyer/rfqs');
  });

  it.each(['abc', '0', '-3', '1.234', '1e3', ''])('số lượng "%s" bị chặn trước khi gọi API', async (bad) => {
    serve({ role: 'buyer' });
    wrap(<RfqForm products={PRODUCTS} supplierName="X" />);
    await fillAndSend(bad);
    expect((await screen.findByRole('alert')).textContent).toContain('Số lượng phải là số dương');
    expect(calls.some((c) => c.path === '/api/buyer/rfqs')).toBe(false);
  });

  it('thiếu ngày cần hàng không gọi API', async () => {
    serve({ role: 'buyer' });
    wrap(<RfqForm products={PRODUCTS} supplierName="X" />);
    fireEvent.change(await screen.findByLabelText('Số lượng'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu báo giá' }));
    expect((await screen.findByRole('alert')).textContent).toContain('ngày cần hàng');
    expect(calls.some((c) => c.path === '/api/buyer/rfqs')).toBe(false);
  });

  it.each([
    [429, {}, 'quá nhiều yêu cầu báo giá'],
    [403, { error: { code: 'buyer_not_verified' } }, 'cần được xác minh'],
    [409, { error: { code: 'company_required' } }, 'hoàn thiện hồ sơ doanh nghiệp'],
    [404, {}, 'không còn nhận yêu cầu'],
    [422, {}, 'Thông tin chưa hợp lệ'],
    [500, {}, 'Không kết nối được'],
  ])('lỗi %s hiện thông báo phù hợp', async (status, body, text) => {
    serve({ role: 'buyer', create: () => json(status as number, body) });
    wrap(<RfqForm products={PRODUCTS} supplierName="X" />);
    await fillAndSend();
    expect((await screen.findByRole('alert')).textContent).toContain(text);
  });

  it('U6: buyer chưa xác minh thấy hạn mức còn lại và lối xác minh tùy chọn', async () => {
    serve({ role: 'buyer', quota: { limit: 3, used: 1, remaining: 2, verified: false } });
    wrap(<RfqForm products={PRODUCTS} supplierName="X" />);
    const note = await screen.findByTestId('rfq-quota');
    expect(note).toHaveTextContent('Còn 2/3 yêu cầu báo giá trong 24 giờ.');
    expect(note).toHaveTextContent('vẫn gửi được');
    expect(within(note).getByRole('link', { name: 'Xác minh doanh nghiệp' }).getAttribute('href')).toContain('/buyer/profile');
    expect(screen.getByRole('button', { name: 'Gửi yêu cầu báo giá' })).toBeEnabled();
  });

  it('U6: buyer đã xác minh chỉ thấy số còn lại', async () => {
    serve({ role: 'buyer', quota: { limit: 5, used: 0, remaining: 5, verified: true } });
    wrap(<RfqForm products={PRODUCTS} supplierName="X" />);
    const note = await screen.findByTestId('rfq-quota');
    expect(note).toHaveTextContent('Còn 5/5');
    expect(within(note).queryByRole('link')).toBeNull();
  });

  it('không có sản phẩm nào thì không hiện form', async () => {
    serve({ role: 'buyer' });
    const { container } = wrap(<RfqForm products={[]} supplierName="X" />);
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(container.querySelector('form')).toBeNull();
  });
});

describe('Danh sách RFQ (F1)', () => {
  it('buyer thấy yêu cầu đã gửi kèm trạng thái, không có nút đổi trạng thái', async () => {
    serve({ rfqs: [rfq({ status: 'quoted' })] });
    wrap(<RfqInbox role="buyer" />);
    const item = await screen.findByRole('listitem', { name: /Nông Sản Lúa Vàng/ });
    expect(within(item).getByTestId('rfq-status')).toHaveTextContent('Đã báo giá');
    fireEvent.click(within(item).getByRole('button', { name: /Nông Sản Lúa Vàng/ }));
    expect(within(item).getByText('2.35 EUR')).toBeInTheDocument();
    expect(within(item).getByText('Hamburg, DE')).toBeInTheDocument();
    expect(within(item).queryByRole('button', { name: /Đánh dấu/ })).toBeNull();
    expect(calls.some((c) => c.method !== 'GET')).toBe(false); // buyer mở không đổi gì
  });

  it('exporter mở RFQ mới thì thành "Đã xem" và có thể đánh dấu đã báo giá', async () => {
    serve({ rfqs: [rfq()], opened: rfq({ status: 'viewed' }), patched: rfq({ status: 'quoted' }) });
    wrap(<RfqInbox role="exporter" />);
    const item = await screen.findByRole('listitem', { name: /Global Foods GmbH/ });
    expect(within(item).getByTestId('rfq-status')).toHaveTextContent('Mới');
    fireEvent.click(within(item).getByRole('button', { name: /Global Foods GmbH/ }));
    await waitFor(() => expect(within(item).getByTestId('rfq-status')).toHaveTextContent('Đã xem'));
    fireEvent.click(within(item).getByRole('button', { name: /Đánh dấu: Đã báo giá/ }));
    await waitFor(() => expect(within(item).getByTestId('rfq-status')).toHaveTextContent('Đã báo giá'));
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ status: 'quoted' });
    expect(within(item).queryByRole('button', { name: /Đánh dấu: Đã xem/ })).toBeNull(); // không lùi trạng thái
  });

  it('U6: seller thấy buyer chưa xác minh kèm khuyến nghị điều khoản thanh toán an toàn', async () => {
    serve({ rfqs: [rfq({ status: 'viewed' })] });
    wrap(<RfqInbox role="exporter" />);
    const item = await screen.findByRole('listitem', { name: /Global Foods GmbH/ });
    expect(within(item).getByTestId('buyer-verification')).toHaveTextContent('Buyer chưa xác minh');
    fireEvent.click(within(item).getByRole('button', { name: /Global Foods GmbH/ }));
    const note = within(item).getByRole('note');
    expect(note).toHaveTextContent('Đặt cọc 30–50%');
    expect(note).toHaveTextContent('L/C at sight');
    expect(note).toHaveTextContent('không phải tư vấn pháp lý');
  });

  it('U6: buyer đã xác minh — nhãn xanh, không có khuyến nghị; buyer không thấy nhãn này', async () => {
    serve({ rfqs: [rfq({ status: 'viewed', buyer_verified: true })] });
    const { unmount } = wrap(<RfqInbox role="exporter" />);
    const item = await screen.findByRole('listitem', { name: /Global Foods GmbH/ });
    expect(within(item).getByTestId('buyer-verification')).toHaveTextContent('Doanh nghiệp đã xác minh');
    fireEvent.click(within(item).getByRole('button', { name: /Global Foods GmbH/ }));
    expect(within(item).queryByRole('note')).toBeNull();
    unmount();
    serve({ rfqs: [rfq({ status: 'viewed' })] });
    wrap(<RfqInbox role="buyer" />);
    await screen.findByRole('listitem', { name: /Nông Sản Lúa Vàng/ });
    expect(screen.queryByTestId('buyer-verification')).toBeNull();
  });

  it('đổi trạng thái thất bại: báo lỗi và giữ trạng thái cũ', async () => {
    serve({ rfqs: [rfq({ status: 'viewed' })] });
    wrap(<RfqInbox role="exporter" />);
    fireEvent.click(await screen.findByRole('button', { name: /Global Foods GmbH/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Đánh dấu: Đóng/ }));
    expect((await screen.findByRole('alert')).textContent).toContain('Không đổi được trạng thái');
    expect(screen.getByTestId('rfq-status')).toHaveTextContent('Đã xem');
  });

  it.each([
    ['buyer', 'Bạn chưa gửi yêu cầu báo giá nào'],
    ['exporter', 'Chưa có yêu cầu báo giá nào'],
  ] as const)('%s chưa có RFQ: hướng dẫn thay vì để trống', async (role, text) => {
    serve({ rfqs: [] });
    wrap(<RfqInbox role={role} />);
    expect(await screen.findByRole('status')).toHaveTextContent(text);
  });

  it('không tải được: báo lỗi, không giả làm rỗng', async () => {
    serve({ rfqs: null });
    wrap(<RfqInbox role="buyer" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được danh sách');
    expect(screen.queryByRole('status')).toBeNull();
  });
});
