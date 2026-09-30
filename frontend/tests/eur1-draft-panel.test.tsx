import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Eur1DraftPanel from '@/components/Eur1DraftPanel';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/tools/origin',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const doc = (over: Record<string, unknown> = {}) => ({
  id: 'd-1',
  document_type: 'eur1_draft',
  compliance_check_id: 'chk-1',
  status: 'queued',
  created_at: '2026-09-30T00:00:00Z',
  file_url: null,
  ...over,
});

interface World {
  loggedIn?: boolean;
  post?: () => Response;
  statuses?: unknown[]; // các lần GET document lần lượt
}

let calls: { method: string; path: string; body?: Record<string, unknown> }[] = [];

function serve(world: World = {}) {
  calls = [];
  let poll = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const { pathname } = new URL(req.url);
      const body = req.method === 'POST' ? await req.clone().json().catch(() => undefined) : undefined;
      calls.push({ method: req.method, path: pathname, body });
      if (pathname === '/api/me/company') return world.loggedIn === false ? json(401, {}) : json(200, { id: 'c-1' });
      if (pathname === '/api/exporter/documents/eur1') return world.post ? world.post() : json(202, doc());
      if (pathname.startsWith('/api/exporter/documents/')) {
        const list = world.statuses ?? [doc({ status: 'ready', file_url: 'https://fake/documents/c-1/x.pdf' })];
        return json(200, list[Math.min(poll++, list.length - 1)]);
      }
      throw new Error(`unexpected ${req.method} ${pathname}`);
    }),
  );
}

function renderPanel(locale: 'vi' | 'en' = 'vi') {
  render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <LanguageProvider>
        <Eur1DraftPanel checkId="chk-1" goodsName="Cà phê rang" />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

const set = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

function fillForm() {
  set(/Tên người nhận hàng/, 'Global Foods GmbH');
  set(/Địa chỉ người nhận hàng/, 'Hafenstrasse 12, Hamburg');
  set(/Nước người nhận hàng/, 'DE');
  set(/Số hóa đơn/, 'INV-2026-001');
  set(/Ngày hóa đơn/, '2026-09-20');
  set(/Mô tả hàng hóa/, 'Roasted coffee');
  set(/Quy cách đóng gói/, '100 bags');
  set(/Khối lượng cả bì/, '6200.50');
}
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Tạo bản nháp EUR.1' }));

describe('Bản nháp EUR.1 (C5)', () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => vi.unstubAllGlobals());

  it('khách chưa đăng nhập: hướng dẫn đăng nhập nhà xuất khẩu, không có form', async () => {
    serve({ loggedIn: false });
    renderPanel();
    expect(await screen.findByRole('status')).toHaveTextContent('Đăng nhập bằng tài khoản nhà xuất khẩu');
    expect(screen.queryByRole('button', { name: 'Tạo bản nháp EUR.1' })).not.toBeInTheDocument();
  });

  it('nói rõ đây là bản nháp, không phải chứng từ chính thức; cơ quan cấp là Bộ Công Thương', async () => {
    serve();
    renderPanel();
    const notice = await screen.findByRole('note');
    expect(notice).toHaveTextContent('bản nháp');
    expect(notice).toHaveTextContent('Bộ Công Thương');
    expect(notice).not.toHaveTextContent(/cấp C\/O|đã cấp/);
  });

  it('điền sẵn mô tả hàng hóa theo tên sản phẩm', async () => {
    serve();
    renderPanel();
    expect((await screen.findByLabelText(/Mô tả hàng hóa/)) as HTMLTextAreaElement).toHaveValue('Cà phê rang');
  });

  it.each([
    ['tên người nhận', () => set(/Tên người nhận hàng/, ''), 'Vui lòng nhập tên người nhận hàng'],
    ['số hóa đơn', () => set(/Số hóa đơn/, ''), 'Vui lòng nhập số hóa đơn'],
    ['ngày hóa đơn', () => set(/Ngày hóa đơn/, ''), 'Vui lòng nhập ngày hóa đơn'],
    ['ngày hóa đơn tương lai', () => set(/Ngày hóa đơn/, '2999-01-01'), 'Ngày hóa đơn không được ở tương lai'],
    ['khối lượng 0', () => set(/Khối lượng cả bì/, '0'), 'Khối lượng phải là số dương'],
    ['khối lượng chữ', () => set(/Khối lượng cả bì/, 'abc'), 'Khối lượng phải là số dương'],
    ['khối lượng 3 chữ số thập phân', () => set(/Khối lượng cả bì/, '1.234'), 'Khối lượng phải là số dương'],
  ])('%s: báo lỗi và không gọi server', async (_name, mutate, message) => {
    serve();
    renderPanel();
    await screen.findByLabelText(/Tên người nhận hàng/);
    fillForm();
    mutate();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(calls.filter((c) => c.method === 'POST')).toEqual([]);
  });

  it('gửi đúng dữ liệu: khối lượng là chuỗi, mã nước EU, gắn check id', async () => {
    serve();
    renderPanel();
    await screen.findByLabelText(/Tên người nhận hàng/);
    fillForm();
    submit();
    await screen.findByRole('link', { name: /Tải bản nháp/ }, { timeout: 8000 });
    const post = calls.find((c) => c.method === 'POST');
    expect(post?.body).toEqual({
      compliance_check_id: 'chk-1',
      consignee_name: 'Global Foods GmbH',
      consignee_address: 'Hafenstrasse 12, Hamburg',
      consignee_country: 'DE',
      invoice_number: 'INV-2026-001',
      invoice_date: '2026-09-20',
      goods_description: 'Roasted coffee',
      packages: '100 bags',
      gross_mass_kg: '6200.50',
      transport_details: null,
      remarks: null,
    });
  }, 15000);

  it('theo dõi trạng thái: đang tạo rồi hiện liên kết tải khi sẵn sàng', async () => {
    serve({ statuses: [doc(), doc({ status: 'ready', file_url: 'https://fake/documents/c-1/x.pdf' })] });
    renderPanel();
    await screen.findByLabelText(/Tên người nhận hàng/);
    fillForm();
    submit();
    expect(await screen.findByText(/Đang tạo bản nháp/)).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: /Tải bản nháp/ }, { timeout: 8000 });
    expect(link).toHaveAttribute('href', 'https://fake/documents/c-1/x.pdf');
    expect(screen.getByText(/watermark/i)).toBeInTheDocument();
  }, 15000);

  it('409: chỉ tạo được khi kết quả xuất xứ là Đạt', async () => {
    serve({ post: () => json(409, {}) });
    renderPanel();
    await screen.findByLabelText(/Tên người nhận hàng/);
    fillForm();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('kết quả xuất xứ là Đạt');
  });

  it('422 và mất kết nối đều báo lỗi và cho thử lại', async () => {
    serve({ post: () => json(422, {}) });
    renderPanel();
    await screen.findByLabelText(/Tên người nhận hàng/);
    fillForm();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('chưa hợp lệ');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo bản nháp EUR.1' })).toBeEnabled());
  });

  it('tạo thất bại (failed): báo lỗi', async () => {
    serve({ statuses: [doc({ status: 'failed' })] });
    renderPanel();
    await screen.findByLabelText(/Tên người nhận hàng/);
    fillForm();
    submit();
    expect(await screen.findByRole('alert', {}, { timeout: 8000 })).toHaveTextContent('Không tạo được bản nháp');
  }, 15000);

  it('bản tiếng Anh dùng nhãn tiếng Anh', async () => {
    serve();
    renderPanel('en');
    expect(await screen.findByRole('button', { name: 'Create EUR.1 draft' })).toBeInTheDocument();
  });

});
