import { fireEvent, render, screen } from '@testing-library/react';
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

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const PRODUCTS = [{ id: 'p-1', name: 'Gạo thơm Jasmine', unit: 'kg' }];

const rfq = (over: Record<string, unknown> = {}) => ({
  id: 'r-1',
  product_id: 'p-1',
  product_name: 'Gạo thơm Jasmine',
  buyer_company_id: 'b-1',
  buyer_name: 'Global Foods GmbH',
  buyer_verified: true,
  exporter_company_id: 'e-1',
  exporter_name: 'Nông Sản Lúa Vàng',
  quantity: '1.00',
  unit: 'n/a',
  target_price: null,
  currency: 'EUR',
  incoterms: 'EXW',
  destination_country: 'VN',
  destination_port: null,
  required_date: '2026-12-01',
  message: 'Hẹn họp 15 phút',
  status: 'new',
  kind: 'meeting',
  created_at: '2026-09-30T01:00:00Z',
  updated_at: '2026-09-30T01:00:00Z',
  ...over,
});

let posted: unknown[] = [];

function serve(role: 'buyer' | 'exporter', rows: unknown[] = []) {
  posted = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === '/api/me') return json(200, { id: 'u-1', email: 'u@x.vn', role, preferred_language: 'vi' });
      if (path === '/api/buyer/rfqs' && req.method === 'POST') {
        posted.push(await req.json());
        return json(201, rfq());
      }
      if (path === '/api/buyer/rfq-quota') return json(404, {});
      if (path === '/api/me/rfqs') return json(200, rows);
      if (req.method === 'GET' && path.endsWith('/quotes')) return json(200, []);
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

describe('Request nhiều loại (N4)', () => {
  it('mặc định là báo giá và vẫn hỏi số lượng', async () => {
    serve('buyer');
    wrap(<RfqForm products={PRODUCTS} supplierName="X" />);
    expect(await screen.findByLabelText('Loại Request')).toHaveValue('quote');
    expect(screen.getByLabelText('Số lượng')).toBeInTheDocument();
  });

  it('loại hẹn meeting: ẩn số lượng/giá, bắt buộc nội dung, gửi kind và nội dung', async () => {
    serve('buyer');
    wrap(<RfqForm products={PRODUCTS} supplierName="Nông Sản Lúa Vàng" />);
    fireEvent.change(await screen.findByLabelText('Loại Request'), { target: { value: 'meeting' } });
    expect(screen.queryByLabelText('Số lượng')).toBeNull();
    expect(screen.queryByLabelText('Ngày cần hàng')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi Request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng nhập nội dung');
    expect(posted).toEqual([]);
    fireEvent.change(screen.getByLabelText('Nội dung'), { target: { value: ' Hẹn họp 15 phút ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi Request' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Đã gửi');
    expect(posted).toEqual([{ product_id: 'p-1', kind: 'meeting', message: 'Hẹn họp 15 phút' }]);
  });

  it('hộp thư exporter: Request không phải báo giá hiện nhãn loại và không có khung báo giá', async () => {
    serve('exporter', [rfq()]);
    wrap(<RfqInbox role="exporter" />);
    const row = await screen.findByRole('listitem', { name: /Global Foods GmbH/ });
    expect(row).toHaveTextContent('Hẹn meeting');
    fireEvent.click(row.querySelector('button') as HTMLElement);
    expect(await screen.findByText('Hẹn họp 15 phút')).toBeInTheDocument();
    expect(screen.queryByText(/Gửi báo giá/)).toBeNull();
  });
});
