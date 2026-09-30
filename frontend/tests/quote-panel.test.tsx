import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QuotePanel from '@/components/QuotePanel';
import { LanguageProvider } from '@/context/LanguageContext';
import { previewAmounts } from '@/lib/quotesApi';
import type { Rfq } from '@/lib/rfqApi';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter/rfqs',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const RFQ = {
  id: 'r-1',
  product_id: 'p-1',
  product_name: 'Gạo thơm',
  buyer_company_id: 'b-1',
  buyer_name: 'Global Foods GmbH',
  buyer_verified: false,
  exporter_company_id: 'e-1',
  exporter_name: 'Nông Sản',
  quantity: '500.50',
  unit: 'kg',
  target_price: null,
  currency: 'EUR',
  incoterms: 'CIF',
  destination_country: 'DE',
  destination_port: 'Hamburg',
  required_date: '2099-01-01',
  message: null,
  status: 'viewed',
  created_at: '2026-09-30T01:00:00Z',
  updated_at: '2026-09-30T01:00:00Z',
} as Rfq;

const quote = (over: Record<string, unknown> = {}) => ({
  id: 'q-1',
  rfq_id: 'r-1',
  unit_price: '2.35',
  currency: 'EUR',
  quantity: '500.50',
  unit: 'kg',
  total_amount: '1176.18',
  deposit_percent: 30,
  deposit_amount: '352.85',
  balance_terms: 'against_bl_copy',
  incoterm: 'FOB',
  named_place: 'Cát Lái',
  lead_time_days: 21,
  valid_until: '2099-01-01',
  notes: null,
  status: 'sent',
  decision_reason: null,
  decided_at: null,
  created_at: '2026-10-01T00:00:00Z',
  ...over,
});

let calls: { method: string; path: string; body: unknown }[] = [];
function serve(quotes: unknown[], respond: (path: string) => Response = () => json(201, quote())) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      const text = await req.text();
      calls.push({ method: req.method, path, body: text ? JSON.parse(text) : null });
      if (req.method === 'GET' && path === '/api/me/rfqs/r-1/quotes') return json(200, quotes);
      return respond(path);
    }),
  );
}

const onChanged = vi.fn();
const wrap = (role: 'buyer' | 'exporter', rfq: Rfq = RFQ) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <QuotePanel rfq={rfq} role={role} onChanged={onChanged} />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
  onChanged.mockClear();
});

describe('previewAmounts (U8)', () => {
  it.each([
    ['2.35', '500.50', 30, '1176.18', '352.85'],
    ['2.10', '20000', 100, '42000.00', '42000.00'],
    ['0.01', '0.50', 50, '0.01', '0.01'],
  ])('%s × %s, cọc %s → %s / %s (khớp backend, không qua float)', (price, qty, dep, total, deposit) => {
    expect(previewAmounts(price, qty, dep)).toEqual({ total, deposit });
  });

  it('nhập chưa hợp lệ → null', () => {
    expect(previewAmounts('abc', '1', 30)).toBeNull();
    expect(previewAmounts('0', '1', 30)).toBeNull();
  });
});

describe('Báo giá RFQ (U8)', () => {
  it('seller tạo báo giá: xem trước tổng/cọc, cọc 100% tự chọn "không còn phần phải trả"', async () => {
    serve([]);
    wrap('exporter');
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo báo giá' }));
    const form = screen.getByRole('form', { name: 'Gửi báo giá' });
    fireEvent.change(within(form).getByLabelText('Đơn giá (/kg)'), { target: { value: '2.35' } });
    expect(within(form).getByTestId('quote-preview')).toHaveTextContent('1176.18 EUR');
    expect(within(form).getByTestId('quote-preview')).toHaveTextContent('352.85 EUR');
    fireEvent.click(within(form).getByLabelText('100%'));
    expect(within(form).getByLabelText('Phần còn lại')).toBeDisabled();
    fireEvent.click(within(form).getByLabelText('50%'));
    fireEvent.change(within(form).getByLabelText('Phần còn lại'), { target: { value: 'lc_at_sight' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Gửi báo giá' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(calls.find((c) => c.method === 'POST')?.body).toMatchObject({
      unit_price: '2.35',
      currency: 'EUR',
      incoterm: 'CIF',
      deposit_percent: 50,
      balance_terms: 'lc_at_sight',
      lead_time_days: 30,
    });
  });

  it('đơn giá sai bị chặn trước khi gọi API', async () => {
    serve([]);
    wrap('exporter');
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo báo giá' }));
    fireEvent.change(screen.getByLabelText('Đơn giá (/kg)'), { target: { value: '2,35' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi báo giá' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Đơn giá phải là số dương');
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('buyer thấy điều khoản và chấp nhận', async () => {
    serve([quote()], () => json(200, quote({ status: 'accepted' })));
    wrap('buyer');
    const item = await screen.findByRole('listitem', { name: /Báo giá 2.35 EUR/ });
    expect(item).toHaveTextContent('1176.18 EUR (500.50 kg)');
    expect(item).toHaveTextContent('30% — 352.85 EUR');
    expect(item).toHaveTextContent('bản sao vận đơn');
    expect(screen.queryByRole('button', { name: 'Tạo báo giá' })).toBeNull();
    fireEvent.click(within(item).getByRole('button', { name: 'Chấp nhận báo giá' }));
    await waitFor(() => expect(calls.some((c) => c.path === '/api/buyer/quotes/q-1/decision')).toBe(true));
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ decision: 'accept', reason: null });
  });

  it('buyer từ chối kèm lý do; báo giá hết hiệu lực không có nút chấp nhận', async () => {
    serve([quote(), quote({ id: 'q-0', status: 'expired', unit_price: '2.50' })], () => json(200, quote({ status: 'declined' })));
    wrap('buyer');
    const open = await screen.findByRole('listitem', { name: /Báo giá 2.35 EUR/ });
    fireEvent.change(within(open).getByLabelText('Lý do từ chối (không bắt buộc)'), { target: { value: 'Giá cao' } });
    fireEvent.click(within(open).getByRole('button', { name: 'Từ chối' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ decision: 'decline', reason: 'Giá cao' }));
    const expired = screen.getByRole('listitem', { name: /Báo giá 2.50 EUR/ });
    expect(within(expired).getByTestId('quote-status')).toHaveTextContent('Hết hiệu lực');
    expect(within(expired).queryByRole('button', { name: 'Chấp nhận báo giá' })).toBeNull();
  });

  it('đã chấp nhận: ghi rõ thanh toán ngoài nền tảng, seller không tạo báo giá mới', async () => {
    serve([quote({ status: 'accepted' })]);
    wrap('exporter');
    const item = await screen.findByRole('listitem', { name: /Báo giá 2.35 EUR/ });
    expect(item).toHaveTextContent('VYBE Trade chưa xử lý thanh toán');
    expect(screen.queryByRole('button', { name: /báo giá/i })).toBeNull();
  });

  it('seller rút báo giá đang mở', async () => {
    serve([quote()], () => json(200, quote({ status: 'withdrawn' })));
    wrap('exporter');
    fireEvent.click(await screen.findByRole('button', { name: 'Rút báo giá' }));
    await waitFor(() => expect(calls.some((c) => c.path === '/api/exporter/quotes/q-1/withdraw')).toBe(true));
  });
});
