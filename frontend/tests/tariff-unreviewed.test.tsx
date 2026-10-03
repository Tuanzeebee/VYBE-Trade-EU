// SPEC_compliance_data_20_codes §8 (kiểm thử FE): trang máy tính thuế với dữ liệu chưa duyệt hiển
// thị dòng lưu ý ngay dưới con số tiết kiệm, nhìn thấy được không cần thao tác.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TariffCalculator from '@/components/TariffCalculator';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/tools/tariff',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const COFFEE = {
  code: '03046200',
  formatted: '0304.62.00',
  name_vi: 'Phi lê cá tra đông lạnh',
  name_en: 'Frozen pangasius fillets',
  chapter: '03',
  category: 'seafood',
  supported: true,
};

const OK = {
  check_id: 'c-1',
  status: 'ok',
  hs_code: '03046200',
  hs_formatted: '0304.62.00',
  destination: 'DE',
  product_value: '100000.00',
  mfn_rate: '5.5000',
  evfta_rate: '0.0000',
  mfn_duty: '5500.00',
  evfta_duty: '0.00',
  savings: '5500.00',
  annual_savings: null,
  quota_note: null,
  condition_note: null,
  quota_note_en: null,
  condition_note_en: null,
};

const NOTICE = /Lưu ý: Thông tin này chưa được luật sư thương mại xác nhận/;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function serve(body: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      if (url.pathname === '/api/public/hs-codes') return json(200, [COFFEE]);
      if (url.pathname === '/api/public/tariff/options') {
        return json(200, { hs_code: '03046200', destination: 'DE', agreements: [{ code: 'EVFTA', name_vi: 'EVFTA', name_en: 'EVFTA' }], subtypes: [], quota_agreements: [] });
      }
      if (url.pathname === '/api/public/tariff') return json(200, body);
      if (url.pathname === '/api/public/markets') return json(200, { check_id: 'm', status: 'no_data', basis: 'mfn', hs_code: '03046200', hs_formatted: '0304.62.00', product_value: '1', duty_rate: null, rows: [] });
      throw new Error(`unexpected ${url.pathname}`);
    }),
  );
}

async function run() {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <TariffCalculator />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
  fireEvent.change(screen.getByRole('combobox', { name: /Sản phẩm/ }), { target: { value: 'ca tra' } });
  fireEvent.click(await screen.findByRole('option', { name: /0304/ }));
  fireEvent.change(screen.getByLabelText(/Giá trị lô hàng/), { target: { value: '100000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Tính tiết kiệm thuế' }));
  await screen.findByText(/Tiết kiệm mỗi lô/);
}

describe('Dòng lưu ý dữ liệu chưa duyệt trên máy tính thuế', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('UNREVIEWED: lưu ý nằm ngay dưới con số tiết kiệm, hiện sẵn, không thu gọn, không ẩn sau tooltip', async () => {
    serve({ ...OK, review_state: 'UNREVIEWED', unreviewed_components: ['tariff_line', 'mfn_taric'], disclaimer: 'x' });
    await run();
    const savings = screen.getByText(/5\.500/, { selector: 'p' });
    const notice = screen.getByTestId('unreviewed-notice');
    expect(notice).toBeVisible();
    expect(notice).toHaveTextContent(NOTICE);
    expect(savings.nextElementSibling).toBe(notice); // ngay dưới con số
    expect(notice.closest('details')).toBeNull();
    expect(notice).not.toHaveAttribute('title');
  });

  it('REVIEWED: không hiện lưu ý', async () => {
    serve({ ...OK, review_state: 'REVIEWED', unreviewed_components: [], disclaimer: null });
    await run();
    expect(screen.queryByTestId('unreviewed-notice')).not.toBeInTheDocument();
  });
});
