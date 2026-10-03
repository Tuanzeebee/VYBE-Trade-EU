import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TariffCalculator from '@/components/TariffCalculator';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/tools/tariff',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const HINTS = {
  freight: [{ container_type: '40HC', price_low: '2500.00', price_typical: '3000.00', price_high: '3500.00', currency: 'EUR', source: 'Báo giá forwarder (mẫu)', valid_until: '2026-12-31' }],
  insurance: { rate_percent: '0.2000', basis: 'cif', source: 'Mẫu' },
};

function serve(hints: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      if (url.pathname === '/api/public/shipping-hints') return json(200, hints);
      if (url.pathname === '/api/public/tariff/options') return json(200, { hs_code: '', destination: 'DE', agreements: [], subtypes: [], quota_agreements: [] });
      if (url.pathname === '/api/public/hs-codes') return json(200, []);
      throw new Error(`unexpected ${url.pathname}`);
    }),
  );
}

function renderCalc() {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <TariffCalculator />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

describe('Gợi ý cước và bảo hiểm (N6a)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('có giá tham khảo đã duyệt: hiện khoảng giá, nguồn và nút điền vào ô cước', async () => {
    serve(HINTS);
    renderCalc();
    fireEvent.change(screen.getByLabelText(/Điều kiện giao hàng/), { target: { value: 'FOB' } });
    expect(await screen.findByText(/2500\.00.*3500\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Báo giá forwarder \(mẫu\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Dùng giá này/ }));
    expect(screen.getByLabelText(/Cước vận chuyển quốc tế/)).toHaveValue('3000.00');
  });

  it('giá tham khảo khác tiền tệ lô hàng: giải thích cách dùng, không điền sai tiền tệ', async () => {
    serve({ ...HINTS, freight: [{ ...HINTS.freight[0], currency: 'USD' }] });
    renderCalc();
    fireEvent.change(screen.getByLabelText(/Điều kiện giao hàng/), { target: { value: 'FOB' } });
    expect(await screen.findByText(/Đổi tiền tệ lô hàng sang USD để dùng giá này/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dùng giá này/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Tiền tệ/), { target: { value: 'USD' } });
    fireEvent.click(await screen.findByRole('button', { name: /Dùng giá này/ }));
    expect(screen.getByLabelText(/Cước vận chuyển quốc tế/)).toHaveValue('3000.00');
  });

  it('không có giá tham khảo: nói rõ là chưa có, không tự điền số nào', async () => {
    serve({ freight: [], insurance: null });
    renderCalc();
    fireEvent.change(screen.getByLabelText(/Điều kiện giao hàng/), { target: { value: 'FOB' } });
    expect(await screen.findByText(/Chưa có giá tham khảo/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cước vận chuyển quốc tế/)).toHaveValue('');
    expect(screen.queryByRole('button', { name: /Dùng giá này/ })).not.toBeInTheDocument();
  });

  it('bảo hiểm gợi ý tính theo giá trị lô hàng đã nhập', async () => {
    serve(HINTS);
    renderCalc();
    fireEvent.change(screen.getByLabelText(/Giá trị lô hàng/), { target: { value: '50000' } });
    fireEvent.change(screen.getByLabelText(/Điều kiện giao hàng/), { target: { value: 'FOB' } });
    fireEvent.click(await screen.findByRole('button', { name: /Dùng 0\.2% = 100\.00/ }));
    expect(screen.getByLabelText(/Phí bảo hiểm hàng hóa quốc tế/)).toHaveValue('100.00');
  });

  it('lỗi tải gợi ý không chặn form', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    renderCalc();
    fireEvent.change(screen.getByLabelText(/Điều kiện giao hàng/), { target: { value: 'FOB' } });
    expect(await screen.findByLabelText(/Cước vận chuyển quốc tế/)).toBeInTheDocument();
  });
});
