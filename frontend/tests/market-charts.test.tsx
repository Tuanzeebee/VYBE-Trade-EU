import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MarketRecommendation from '@/components/MarketRecommendation';
import { CompetitorCharts } from '@/components/market/CompetitorCharts';
import { CountryCompareChart } from '@/components/market/CountryCompareChart';
import { HhiMeter } from '@/components/market/HhiMeter';
import { ImportBarChart } from '@/components/market/ImportBarChart';
import { LanguageProvider } from '@/context/LanguageContext';
import type { MarketItem } from '@/lib/marketInsightsApi';

// jsdom không có bố cục nên ResponsiveContainer không đo được khung: cho khung cố định để biểu đồ vẽ ra.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) => React.cloneElement(children, { width: 640, height: 360 } as object),
  };
});

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/tools/market-insights',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const market = (country: string, over: Partial<MarketItem> = {}): MarketItem =>
  ({
    country,
    score: '72.4',
    import_value: '42700000',
    import_cagr: '0.1200',
    vn_value: '30689023',
    vn_share: '0.7200',
    vn_cagr: '0.0800',
    world_unit_price: '3.40',
    vn_unit_price: '3.39',
    reasons: [],
    ...over,
  }) as MarketItem;

const ui = (node: React.ReactElement) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>{node}</LanguageProvider>
    </NextIntlClientProvider>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('ImportBarChart', () => {
  it('mô tả cho trình đọc màn hình liệt kê từng nước kèm trị giá, và có chú giải hai nhóm', () => {
    ui(<ImportBarChart top={[market('ES'), market('DE', { import_value: '90000000' })]} potential={[market('AT')]} />);
    const chart = screen.getByRole('img');
    const label = chart.getAttribute('aria-label') ?? '';
    expect(label).toContain('Biểu đồ cột: trị giá nhập khẩu theo nước');
    for (const country of ['Tây Ban Nha', 'Đức', 'Áo']) expect(label).toContain(country);
    expect(screen.getByText('Thị trường tiêu thụ chính')).toBeInTheDocument();
    expect(screen.getByText('Thị trường tiềm năng')).toBeInTheDocument();
  });

  it('nước có trị giá không hợp lệ bị bỏ, không vẽ thành 0', () => {
    ui(<ImportBarChart top={[market('ES'), market('DE', { import_value: 'n/a' })]} potential={[]} />);
    const label = screen.getByRole('img').getAttribute('aria-label') ?? '';
    expect(label).toContain('Tây Ban Nha');
    expect(label).not.toContain('Đức');
    expect(screen.queryByText('Thị trường tiềm năng')).not.toBeInTheDocument();
  });

  it('không có dữ liệu thì không vẽ gì', () => {
    const { container } = ui(<ImportBarChart top={[]} potential={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('CompetitorCharts', () => {
  const competitors = [
    { partner: 'VN', value: '150000000', share: '0.4000', unit_price: '2.61' },
    { partner: 'IN', value: '90000000', share: '0.2400', unit_price: '3.10' },
    { partner: 'CN', value: '30000000', share: '0.0800', unit_price: null },
  ];

  it('hai biểu đồ: thị phần và đơn giá; nước thiếu đơn giá được ghi chú, không vẽ thành 0', () => {
    ui(<CompetitorCharts competitors={competitors} />);
    const [share, price] = screen.getAllByRole('img');
    expect(share.getAttribute('aria-label')).toContain('Việt Nam');
    expect(share.getAttribute('aria-label')).toContain('Trung Quốc');
    expect(price.getAttribute('aria-label')).toContain('Ấn Độ 3.10');
    expect(price.getAttribute('aria-label')).not.toContain('Trung Quốc');
    expect(screen.getByText(/Chưa có đơn giá: Trung Quốc/)).toBeInTheDocument();
  });

  it('không nước nào có đơn giá: hiện hướng dẫn thay vì biểu đồ trống', () => {
    ui(<CompetitorCharts competitors={competitors.map((c) => ({ ...c, unit_price: null }))} />);
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Chưa có đơn giá của các nước cung cấp');
  });

  it('không có nước nào có thị phần hợp lệ thì không vẽ gì', () => {
    const { container } = ui(<CompetitorCharts competitors={[{ partner: 'VN', value: '1', share: 'x', unit_price: null }]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('CountryCompareChart', () => {
  const countries = [
    market('ES', { import_value: '40000000', import_cagr: '0.1000', vn_share: '0.7000', score: '80.0' }),
    market('DE', { import_value: '90000000', import_cagr: null, vn_share: '0.0300', score: '60.0' }),
    market('NL', { import_value: '60000000', import_cagr: '0.0500', vn_share: '0.2000', score: '70.0' }),
  ];

  it('mặc định xếp theo nhập khẩu; chọn tiêu chí khác thì biểu đồ đổi theo', () => {
    ui(<CountryCompareChart countries={countries} />);
    const bars = () => screen.getAllByRole('img')[0].getAttribute('aria-label') ?? '';
    expect(bars()).toContain('Nhập khẩu');
    expect(bars().indexOf('Đức')).toBeLessThan(bars().indexOf('Hà Lan')); // 90 tr > 60 tr
    fireEvent.change(screen.getByLabelText('Xếp theo'), { target: { value: 'score' } });
    expect(bars()).toContain('Điểm');
    expect(bars().indexOf('Tây Ban Nha')).toBeLessThan(bars().indexOf('Hà Lan')); // 80 > 70
  });

  it('nước thiếu số liệu của tiêu chí đang chọn bị bỏ và được ghi chú, không vẽ thành 0', () => {
    ui(<CountryCompareChart countries={countries} />);
    fireEvent.change(screen.getByLabelText('Xếp theo'), { target: { value: 'import_cagr' } });
    const label = screen.getAllByRole('img')[0].getAttribute('aria-label') ?? '';
    expect(label).not.toContain('Đức');
    expect(screen.getByText(/Chưa có số liệu: Đức/)).toBeInTheDocument();
  });

  it('biểu đồ bong bóng chỉ gồm nước có số liệu tăng trưởng', () => {
    ui(<CountryCompareChart countries={countries} />);
    const bubble = screen.getAllByRole('img')[1].getAttribute('aria-label') ?? '';
    expect(bubble).toContain('Biểu đồ bong bóng');
    expect(bubble).toContain('Tây Ban Nha');
    expect(bubble).not.toContain('Đức');
    expect(screen.getByText(/Cỡ bong bóng = thị phần Việt Nam/)).toBeInTheDocument();
  });

  it('không nước nào đủ số liệu: hiện hướng dẫn', () => {
    ui(<CountryCompareChart countries={[market('DE', { import_value: 'x', import_cagr: null })]} />);
    expect(screen.getByRole('status')).toHaveTextContent('Chưa đủ số liệu');
  });
});

describe('HhiMeter', () => {
  it('hiện số HHI trên thang 0–10.000 bằng role=meter, không gắn nhãn ngưỡng', () => {
    ui(<HhiMeter hhi="9801" />);
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', '9801');
    expect(meter).toHaveAttribute('aria-valuemax', '10000');
    expect(screen.getByTestId('hhi-meter')).toHaveTextContent('9801');
    expect(screen.getByTestId('hhi-meter')).not.toHaveTextContent(/rủi ro|nguy hiểm|an toàn/);
  });

  it('giá trị ngoài thang được chặn trong 0–10.000; thiếu thì không vẽ', () => {
    ui(<HhiMeter hhi="12000" />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '10000');
  });

  it('thiếu HHI thì không hiện', () => {
    const { container } = ui(<HhiMeter hhi={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Trang gợi ý thị trường có biểu đồ', () => {
  const OK = {
    status: 'ok',
    query: 'cá tra',
    family: { family: 'pangasius', name_vi: 'Phi lê cá tra đông lạnh', name_en: 'Frozen pangasius fillets', products: ['030462'] },
    year: 2025,
    source: 'Eurostat Comext (DS-045409)',
    retrieved_at: '2026-10-01T00:00:00Z',
    top_markets: [market('ES'), market('DE'), market('NL')],
    potential_markets: [market('AT', { vn_share: '0.0200' })],
    countries: [market('ES'), market('DE'), market('NL'), market('AT')],
    competitors: [
      { partner: 'VN', value: '153616600', share: '0.9900', unit_price: '2.61' },
      { partner: 'IN', value: '1000000', share: '0.0100', unit_price: '3.10' },
    ],
    vn_extra_eu_share: '0.9900',
    vn_rank: 1,
    hhi: '9801',
    weights: { size: '0.35' },
    suggestions: [],
  };

  it('có biểu đồ quy mô, thị phần, đơn giá, so sánh và HHI; bảng số liệu gốc vẫn còn trong mục thu gọn', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(OK), { status: 200, headers: { 'content-type': 'application/json' } })),
    );
    ui(<MarketRecommendation />);
    fireEvent.click(screen.getByRole('button', { name: 'cá tra' }));
    const results = await screen.findByTestId('market-results');
    // Biểu đồ tải theo yêu cầu (next/dynamic) nên xuất hiện sau khi có kết quả.
    await waitFor(() => expect(within(results).getAllByRole('img').length).toBeGreaterThanOrEqual(5));
    expect(within(results).getByRole('meter')).toBeInTheDocument();
    const toggles = within(results).getAllByText('Xem bảng số liệu');
    expect(toggles).toHaveLength(2);
    for (const toggle of toggles) {
      const details = toggle.closest('details') as HTMLDetailsElement;
      expect(details.open).toBe(false);
      expect(within(details).getByRole('table')).toBeInTheDocument();
    }
    // Thẻ top 3 vẫn đúng ba mục và nguồn số liệu + lưu ý tham khảo không bị biểu đồ thay thế.
    expect(within(screen.getByRole('region', { name: 'Thị trường tiêu thụ chính' })).getAllByRole('listitem', { name: /./ })).toHaveLength(3);
    expect(screen.getByTestId('market-method')).toHaveTextContent('Eurostat Comext');
    expect(screen.getByTestId('market-method')).toHaveTextContent('không thay thế nghiên cứu thị trường');
  });
});
