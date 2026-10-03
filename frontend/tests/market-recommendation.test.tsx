import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MarketRecommendation from '@/components/MarketRecommendation';
import { LanguageProvider } from '@/context/LanguageContext';
import { translateText } from '@/i18n/translate';
import { reasonText } from '@/lib/marketInsightsApi';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/tools/market-insights',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const market = (country: string, over: Record<string, unknown> = {}) => ({
  country,
  score: '72.4',
  import_value: '42700000',
  import_cagr: '0.1200',
  vn_value: '30689023',
  vn_share: '0.7200',
  vn_cagr: '0.0800',
  world_unit_price: '3.40',
  vn_unit_price: '3.39',
  reasons: [
    { code: 'import_size', value: '42700000', year: 2025 },
    { code: 'vn_share', value: '0.7200', year: 2025 },
    { code: 'growth', value: '0.1200', year: null },
  ],
  ...over,
});

const OK = {
  status: 'ok',
  query: 'cá tra',
  family: { family: 'pangasius', name_vi: 'Phi lê cá tra đông lạnh', name_en: 'Frozen pangasius fillets', products: ['030462', '030432'] },
  year: 2025,
  source: 'Eurostat Comext (DS-045409)',
  retrieved_at: '2026-10-01T00:00:00Z',
  top_markets: [market('ES'), market('DE'), market('NL')],
  potential_markets: [market('AT', { vn_share: '0.0200', reasons: [{ code: 'low_vn_share', value: '0.0200', year: 2025 }] })],
  countries: [market('ES'), market('DE'), market('NL'), market('AT')],
  competitors: [{ partner: 'VN', value: '153616600', share: '0.9900', unit_price: '2.61' }],
  vn_extra_eu_share: '0.9900',
  vn_rank: 1,
  hhi: '9801',
  weights: { size: '0.35' },
  suggestions: [],
};

let queries: string[] = [];
function serve(body: unknown) {
  queries = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      queries.push(url.search);
      return json(200, body);
    }),
  );
}

const wrap = () =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <MarketRecommendation />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('Gợi ý thị trường EU (U16)', () => {
  it('chọn nhanh "cá tra": 3 thị trường chính có lý do bằng số, thị trường tiềm năng, đối thủ, nguồn số liệu', async () => {
    serve(OK);
    wrap();
    fireEvent.click(screen.getByRole('button', { name: 'cá tra' }));
    const results = await screen.findByTestId('market-results');
    expect(decodeURIComponent(queries[0])).toBe('?q=cá tra');
    const main = within(results).getByRole('region', { name: 'Thị trường tiêu thụ chính' });
    expect(within(main).getAllByRole('listitem').filter((li) => li.hasAttribute('aria-label'))).toHaveLength(3);
    expect(main).toHaveTextContent('Nhập khẩu năm 2025');
    expect(main).toHaveTextContent('Hàng Việt Nam chiếm 72%');
    const potential = within(results).getByRole('region', { name: 'Thị trường tiềm năng' });
    expect(potential).toHaveTextContent('Hàng Việt Nam mới chiếm 2% — còn dư địa');
    expect(within(results).getByRole('region', { name: 'Đối thủ cạnh tranh' })).toHaveTextContent('Việt Nam đứng thứ 1');
    expect(screen.getByTestId('market-method')).toHaveTextContent('Eurostat Comext');
  });

  it('không nhận ra sản phẩm: gợi ý nhóm có sẵn; ô trống thì báo lỗi, không gọi API', async () => {
    serve({ ...OK, status: 'no_data', family: null, top_markets: [], potential_markets: [], countries: [], competitors: [], suggestions: [{ family: 'shrimp', name_vi: 'Tôm đông lạnh', name_en: 'Frozen shrimps', products: ['030617'] }] });
    wrap();
    fireEvent.click(screen.getByRole('button', { name: 'Xem gợi ý' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Vui lòng nhập tên sản phẩm');
    expect(queries).toHaveLength(0);
    fireEvent.change(screen.getByLabelText('Sản phẩm'), { target: { value: 'xe máy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xem gợi ý' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Tôm đông lạnh');
  });

  it('câu lý do dịch sang tiếng Anh theo mẫu tham số', () => {
    const text = reasonText({ code: 'growth', value: '0.1200', year: null }, 'vi');
    expect(translateText(text, 'en')).toMatch(/^Imports grow 12% ?\/year on average$/);
  });
});
