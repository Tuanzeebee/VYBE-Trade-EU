import { render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PriceReference from '@/components/PriceReference';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter/products',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function serve(body: unknown) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      calls.push(new URL(req.url).search);
      return json(200, body);
    }),
  );
  return calls;
}

const wrap = (hs: string) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <PriceReference hsCode={hs} />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('Giá tham khảo nhập khẩu EU (U17)', () => {
  it('hiện đơn giá từ Việt Nam, trung bình ngoài EU, đối thủ và ghi rõ không phải giá sàn', async () => {
    const calls = serve({
      status: 'ok',
      hs_code: '030462',
      year: 2025,
      source: 'Eurostat Comext (DS-045409)',
      vietnam: { partner: 'VN', unit_price: '2.61', value: '153616600' },
      extra_eu_average: { partner: 'EXT_EU27_2020', unit_price: '2.62', value: '155000000' },
      competitors: [{ partner: 'CN', unit_price: '3.10', value: '500000' }],
    });
    wrap('030462');
    const note = await screen.findByTestId('price-reference');
    expect(note).toHaveTextContent('Giá tham khảo nhập khẩu EU năm 2025');
    expect(note).toHaveTextContent('Từ Việt Nam: 2.61 EUR/kg');
    expect(note).toHaveTextContent('Trung bình hàng ngoài EU: 2.62 EUR/kg');
    expect(note).toHaveTextContent('không phải giá sàn');
    expect(calls).toEqual(['?hs=030462']);
  });

  it('không có dữ liệu thì không hiện gì', async () => {
    const calls = serve({ status: 'no_data', hs_code: '090111', year: null, source: 'x', vietnam: null, extra_eu_average: null, competitors: [] });
    const { container } = wrap('090111');
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(container).toBeEmptyDOMElement();
  });
});
