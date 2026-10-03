// C2-C: bộ máy hạn ngạch trên giao diện: đơn vị, chi phí, chu kỳ, số dư, tỷ trọng lô, điểm hòa vốn.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TariffCalculator from '@/components/TariffCalculator';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/tools/tariff',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const RICE = {
  code: '100630',
  formatted: '1006.30',
  name_vi: 'Gạo xát',
  name_en: 'Milled rice',
  chapter: '10',
  category: 'agriculture',
  supported: true,
};

const QUOTA = {
  quota_code: '09.TEST',
  quota_year: 2026,
  volume: '30000.000',
  volume_unit: 'tonne',
  specific_unit: 'tonne',
  licence_note_vi: null,
  licence_note_en: null,
  allocation_note_vi: null,
  allocation_note_en: null,
  source_url: null,
  period_start: '2026-01-01',
  period_end: '2026-12-31',
  days_left: 90,
  in_period: true,
  allocation_method: 'EXPORT_LICENCE',
  licence_required: true,
  licence_issuer_vi: 'Bộ Công Thương',
  balance: { status: 'open', as_of: '2026-09-30', used: '10000.000', remaining: '20000.000', remaining_pct: '66.67', stale: false, source: 'Cổng hải quan' },
  share_pct: '0.33',
  economics: { savings: '10000.00', savings_per_unit: '100.00', savings_pct_of_value: '20.00', access_cost: null, net_benefit: null, worthwhile: null },
};

const RESULT = (over: Record<string, unknown> = {}, quota: Record<string, unknown> = {}) => ({
  check_id: 'c-1',
  status: 'quota_scenarios',
  hs_code: '100630',
  hs_formatted: '1006.30',
  destination: 'DE',
  product_value: '50000',
  mfn_rate: null,
  evfta_rate: null,
  mfn_duty: null,
  evfta_duty: null,
  savings: '10000.00',
  annual_savings: null,
  quota_note: null,
  condition_note: null,
  quota_note_en: null,
  condition_note_en: null,
  scenarios: [
    { kind: 'in_quota', duty_type: 'ad_valorem', rate: '0.0000', specific: null, duty: '0.00' },
    { kind: 'out_of_quota', duty_type: 'specific', rate: null, specific: '100.0000', duty: '10000.00' },
  ],
  conditions: ['origin', 'allocation', 'subtype', 'licence'],
  quota: { ...QUOTA, ...quota },
  subtype: null,
  subtypes: [],
  quantity: '100',
  quota_allocated: 'unknown',
  ...over,
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let bodies: Record<string, unknown>[] = [];

function serve(result: Record<string, unknown> = RESULT()) {
  bodies = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      if (url.pathname === '/api/public/hs-codes') return json(200, [RICE]);
      if (url.pathname === '/api/public/tariff/options') {
        return json(200, {
          hs_code: '100630',
          destination: 'DE',
          agreements: [{ code: 'EVFTA', name_vi: 'EVFTA', name_en: 'EVFTA' }],
          subtypes: [{ code: 'rice_fragrant_listed', name_vi: 'Gạo thơm', name_en: 'Fragrant rice', description_vi: null, description_en: null }],
          quota_agreements: ['EVFTA'],
        });
      }
      if (url.pathname === '/api/public/tariff') {
        bodies.push(await req.json());
        return json(200, result);
      }
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

async function fill() {
  fireEvent.change(screen.getByRole('combobox', { name: /Sản phẩm/ }), { target: { value: 'gao' } });
  fireEvent.click(await screen.findByRole('option', { name: /1006/ }));
  await screen.findByTestId('quota-fields');
  fireEvent.change(screen.getByLabelText(/Giá trị lô hàng/), { target: { value: '50000' } });
  fireEvent.change(screen.getByLabelText('Phân nhóm hàng'), { target: { value: 'rice_fragrant_listed' } });
  fireEvent.change(screen.getByLabelText(/Khối lượng lô hàng/), { target: { value: '100' } });
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Tính tiết kiệm thuế' }));

describe('Hạn ngạch: nhập liệu', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('mặc định không gửi đơn vị và chi phí hạn ngạch', async () => {
    serve();
    renderCalc();
    await fill();
    submit();
    await screen.findByTestId('quota-insights');
    expect(bodies[0]).toMatchObject({ subtype_code: 'rice_fragrant_listed', quantity: '100' });
    expect(bodies[0]).not.toHaveProperty('quantity_unit');
    expect(bodies[0]).not.toHaveProperty('quota_access_cost');
  });

  it('gửi đơn vị kg và chi phí để có hạn ngạch (kể cả "0")', async () => {
    serve();
    renderCalc();
    await fill();
    fireEvent.change(screen.getByLabelText('Đơn vị khối lượng'), { target: { value: 'kg' } });
    expect(screen.getByLabelText('Khối lượng lô hàng (kg)')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Chi phí để có hạn ngạch/), { target: { value: '0' } });
    submit();
    await screen.findByTestId('quota-insights');
    expect(bodies[0]).toMatchObject({ quantity_unit: 'kg', quota_access_cost: '0' });
  });

  it.each(['-1', 'abc', '1e3', '1.234'])('chi phí hạn ngạch %j không hợp lệ thì báo lỗi và không gọi server', async (bad) => {
    serve();
    renderCalc();
    await fill();
    fireEvent.change(screen.getByLabelText(/Chi phí để có hạn ngạch/), { target: { value: bad } });
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Chi phí phải là số không âm');
    expect(bodies).toEqual([]);
  });

  it('không có khối lượng thì không gửi đơn vị', async () => {
    serve();
    renderCalc();
    await fill();
    fireEvent.change(screen.getByLabelText(/Khối lượng lô hàng/), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Đơn vị khối lượng'), { target: { value: 'kg' } });
    submit();
    await screen.findByTestId('quota-insights');
    expect(bodies[0]).not.toHaveProperty('quantity_unit');
  });
});

describe('Hạn ngạch: tình trạng và giá trị kinh tế', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  async function show(result: Record<string, unknown>) {
    serve(result);
    renderCalc();
    await fill();
    submit();
    return screen.findByTestId('quota-insights');
  }

  it('chu kỳ, số dư còn, tỷ trọng lô, cách phân bổ và giấy phép', async () => {
    const box = await show(RESULT());
    expect(within(box).getByTestId('quota-period')).toHaveTextContent(/Chu kỳ: .*2026.* – .*2026/);
    expect(within(box).getByTestId('quota-period')).toHaveTextContent('còn 90 ngày');
    const balance = within(box).getByTestId('quota-balance');
    expect(balance).toHaveTextContent('Còn hạn ngạch');
    expect(balance).toHaveTextContent(/20\.000 \/ 30\.000 tấn \(67\.?\d*%\)|20\.000 \/ 30\.000 tấn \(66\.67%\)/);
    expect(balance).toHaveTextContent('nguồn: Cổng hải quan');
    expect(within(box).queryByTestId('quota-balance-stale')).toBeNull();
    expect(within(box).getByTestId('quota-share')).toHaveTextContent('0.33%');
    const access = within(box).getByTestId('quota-access');
    expect(access).toHaveTextContent('Cơ quan nước xuất khẩu cấp giấy phép');
    expect(access).toHaveTextContent('Cần giấy phép / chứng nhận: Bộ Công Thương');
  });

  it.each([
    ['low', 'Sắp hết', '8.33'],
    ['exhausted', 'Đã hết', '0'],
  ])('số dư %s hiện nhãn %s', async (status, text, pct) => {
    const box = await show(
      RESULT({}, { balance: { status, as_of: '2026-09-30', used: '27500.000', remaining: '2500.000', remaining_pct: pct, stale: false, source: 'Cổng hải quan' } }),
    );
    expect(within(box).getByTestId('quota-balance')).toHaveTextContent(text);
  });

  it('chưa có số dư: nói chưa biết, không hiểu thành còn hạn ngạch', async () => {
    const box = await show(RESULT({}, { balance: { status: 'unknown', as_of: null, used: null, remaining: null, remaining_pct: null, stale: false, source: null } }));
    const balance = within(box).getByTestId('quota-balance');
    expect(balance).toHaveTextContent('Chưa biết số dư');
    expect(balance).toHaveTextContent('không thể khẳng định hạn ngạch còn hay đã hết');
    expect(balance).not.toHaveTextContent('Còn hạn ngạch');
  });

  it('số liệu cũ có cảnh báo', async () => {
    const box = await show(RESULT({}, { balance: { ...QUOTA.balance, stale: true } }));
    expect(within(box).getByTestId('quota-balance-stale')).toHaveTextContent('Số liệu đã cũ');
  });

  it('ngày nhập ngoài chu kỳ có cảnh báo; không khai chu kỳ thì nói chưa có thông tin', async () => {
    const outside = await show(RESULT({}, { in_period: false, days_left: null }));
    expect(within(outside).getByTestId('quota-period')).toHaveTextContent('nằm ngoài chu kỳ');
    cleanup();
    const none = await show(RESULT({}, { period_start: null, period_end: null, in_period: null, days_left: null }));
    expect(within(none).getByTestId('quota-period')).toHaveTextContent('Chưa có thông tin chu kỳ');
  });

  it('giấy phép nhập khẩu do nước nhập cấp hiện đúng nhãn, người bán biết phải nhắc buyer', async () => {
    const box = await show(RESULT({}, { allocation_method: 'IMPORT_LICENCE' }));
    expect(within(box).getByTestId('quota-access')).toHaveTextContent('Nhà nhập khẩu cần có giấy phép nhập khẩu do cơ quan nước nhập cấp');
  });

  it('giá trị của hạn ngạch: tiết kiệm, theo đơn vị và theo % trị giá', async () => {
    const box = await show(RESULT());
    const economics = within(box).getByTestId('quota-economics');
    expect(economics).toHaveTextContent(/10\.000/);
    expect(economics).toHaveTextContent('20% trị giá tính thuế');
    expect(economics).toHaveTextContent(/100.*\/tấn/);
    expect(within(box).queryByTestId('quota-break-even')).toBeNull();
  });

  it('điểm hòa vốn: lợi ích ròng dương → đáng; âm → chưa đáng', async () => {
    const worth = await show(
      RESULT({}, { economics: { ...QUOTA.economics, access_cost: '2500.00', net_benefit: '7500.00', worthwhile: true } }),
    );
    expect(within(worth).getByTestId('quota-break-even')).toHaveTextContent('Đáng để xin hạn ngạch');
    expect(within(worth).getByTestId('quota-break-even')).toHaveTextContent(/7\.500/);
    cleanup();
    const not = await show(
      RESULT({}, { economics: { ...QUOTA.economics, access_cost: '12000.00', net_benefit: '-2000.00', worthwhile: false } }),
    );
    expect(within(not).getByTestId('quota-break-even')).toHaveTextContent('Chưa đáng để xin hạn ngạch');
  });

  it('đơn vị không quy đổi được: cần xem xét, giải thích rõ và không có số', async () => {
    serve(RESULT({ status: 'needs_review', review_reason: 'unit_mismatch', scenarios: [], savings: null, quota: null, conditions: [] }));
    renderCalc();
    await fill();
    submit();
    expect(await screen.findByTestId('review-message')).toHaveTextContent('không quy đổi được');
    expect(screen.queryByTestId('quota-insights')).toBeNull();
  });
});
