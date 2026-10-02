// C2-A: điều kiện giao hàng (Incoterm), cước, bảo hiểm, ngày nhập và bảng phân rã trị giá tính thuế.
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

const FISH = {
  code: '03046200',
  formatted: '0304.62.00',
  name_vi: 'Phi lê cá tra đông lạnh',
  name_en: 'Frozen pangasius fillets',
  chapter: '03',
  category: 'seafood',
  supported: true,
};

const BASE = {
  check_id: 'c-1',
  status: 'ok',
  hs_code: '03046200',
  hs_formatted: '0304.62.00',
  destination: 'DE',
  product_value: '100000',
  mfn_rate: '5.5000',
  evfta_rate: '1.3750',
  mfn_duty: '5692.50',
  evfta_duty: '1423.13',
  savings: '4269.37',
  annual_savings: null,
  quota_note: null,
  condition_note: null,
  quota_note_en: null,
  condition_note_en: null,
  customs_value: '103500.00',
  rate_date: '2022-12-31',
  staging: { category: 'B3', stage: 3, stages: 4, zero_from: '2023-01-01' },
  valuation: {
    incoterm: 'FOB',
    currency: null,
    basis: 'CIF',
    invoice_value: '100000',
    customs_value: '103500.00',
    steps: [
      { code: 'invoice', amount: '100000.00' },
      { code: 'freight', amount: '3000.00' },
      { code: 'insurance', amount: '500.00' },
    ],
    warnings: [],
  },
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let bodies: Record<string, unknown>[] = [];

function serve(result: Record<string, unknown> = BASE) {
  bodies = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      if (url.pathname === '/api/public/hs-codes') return json(200, [FISH]);
      if (url.pathname === '/api/public/tariff/options') {
        return json(200, { hs_code: '03046200', destination: 'DE', agreements: [{ code: 'EVFTA', name_vi: 'EVFTA', name_en: 'EVFTA' }], subtypes: [], quota_agreements: [] });
      }
      if (url.pathname === '/api/public/tariff') {
        bodies.push(await req.json());
        return json(200, result);
      }
      throw new Error(`unexpected ${url.pathname}`);
    }),
  );
}

function renderCalc(locale: 'vi' | 'en' = 'vi') {
  render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <LanguageProvider>
        <TariffCalculator />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

async function pickFish() {
  fireEvent.change(screen.getByRole('combobox', { name: /Sản phẩm/ }), { target: { value: 'ca tra' } });
  fireEvent.click(await screen.findByRole('option', { name: /0304/ }));
}

const value = (v: string) => fireEvent.change(screen.getByLabelText(/Giá trị lô hàng/), { target: { value: v } });
const incoterm = (v: string) => fireEvent.change(screen.getByLabelText('Điều kiện giao hàng (Incoterm)'), { target: { value: v } });
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Tính tiết kiệm thuế' }));
const freightField = () => screen.queryByLabelText(/Cước vận chuyển quốc tế/);
const insuranceField = () => screen.queryByLabelText(/Phí bảo hiểm/);
const postBorderField = () => screen.queryByLabelText(/Chi phí sau cửa khẩu nhập/);

describe('Máy tính thuế: trị giá tính thuế (C2-A)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('ô chi phí hiện theo Incoterm', async () => {
    serve();
    renderCalc();
    await pickFish();
    expect([freightField(), insuranceField(), postBorderField()]).toEqual([null, null, null]);
    incoterm('FOB');
    expect(freightField()).toBeInTheDocument();
    expect(insuranceField()).toBeInTheDocument();
    expect(postBorderField()).toBeNull();
    incoterm('CFR');
    expect(freightField()).toBeNull();
    expect(insuranceField()).toBeInTheDocument();
    incoterm('CIF');
    expect([freightField(), insuranceField(), postBorderField()]).toEqual([null, null, null]);
    incoterm('DAP');
    expect(postBorderField()).toBeInTheDocument();
    expect(freightField()).toBeNull();
    incoterm('DDP');
    expect(screen.getByText(/DDP \(giá đã gồm thuế nhập khẩu\)/)).toBeInTheDocument();
  });

  it('gửi Incoterm, cước, bảo hiểm, ngày nhập và tiền tệ (chỉ khi khác EUR)', async () => {
    serve();
    renderCalc();
    await pickFish();
    value('100000');
    fireEvent.change(screen.getByLabelText('Tiền tệ'), { target: { value: 'USD' } });
    incoterm('FOB');
    fireEvent.change(screen.getByLabelText(/Cước vận chuyển quốc tế/), { target: { value: '3000' } });
    fireEvent.change(screen.getByLabelText(/Phí bảo hiểm/), { target: { value: '500.50' } });
    fireEvent.change(screen.getByLabelText(/Ngày nhập khẩu dự kiến/), { target: { value: '2022-12-31' } });
    submit();
    await screen.findByTestId('valuation-breakdown');
    expect(bodies).toEqual([
      {
        hs_code: '03046200',
        destination: 'DE',
        product_value: '100000',
        incoterm: 'FOB',
        currency: 'USD',
        freight: '3000',
        insurance: '500.50',
        import_date: '2022-12-31',
      },
    ]);
  });

  it('mặc định không gửi trường mới; tiền tệ EUR không gửi', async () => {
    serve();
    renderCalc();
    await pickFish();
    value('100000');
    submit();
    await screen.findByTestId('valuation-breakdown');
    expect(bodies[0]).toEqual({ hs_code: '03046200', destination: 'DE', product_value: '100000' });
  });

  it('chi phí của ô đã ẩn không được gửi', async () => {
    serve();
    renderCalc();
    await pickFish();
    value('100000');
    incoterm('FOB');
    fireEvent.change(screen.getByLabelText(/Cước vận chuyển quốc tế/), { target: { value: '3000' } });
    incoterm('CIF'); // ô cước bị ẩn
    submit();
    await screen.findByTestId('valuation-breakdown');
    expect(bodies[0]).toEqual({ hs_code: '03046200', destination: 'DE', product_value: '100000', incoterm: 'CIF' });
  });

  it('"0" là đã khai không có chi phí (hợp lệ), khác với để trống', async () => {
    serve();
    renderCalc();
    await pickFish();
    value('100000');
    incoterm('FOB');
    fireEvent.change(screen.getByLabelText(/Cước vận chuyển quốc tế/), { target: { value: '0' } });
    submit();
    await screen.findByTestId('valuation-breakdown');
    expect(bodies[0]).toMatchObject({ freight: '0' });
    expect(bodies[0]).not.toHaveProperty('insurance');
  });

  it.each(['-5', 'abc', '1e3', '10.123', '1,000'])('chi phí %j không hợp lệ thì báo lỗi và không gọi server', async (bad) => {
    serve();
    renderCalc();
    await pickFish();
    value('100000');
    incoterm('FOB');
    fireEvent.change(screen.getByLabelText(/Cước vận chuyển quốc tế/), { target: { value: bad } });
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Chi phí phải là số không âm');
    expect(bodies).toEqual([]);
  });

  it('ngày nhập ngoài khoảng cho phép thì báo lỗi và không gọi server', async () => {
    serve();
    renderCalc();
    await pickFish();
    value('100000');
    fireEvent.change(screen.getByLabelText(/Ngày nhập khẩu dự kiến/), { target: { value: '2020-07-31' } });
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Ngày nhập khẩu phải từ 01/08/2020');
    expect(bodies).toEqual([]);
  });

  it('kết quả có bảng phân rã: từng bước, trị giá tính thuế, ngày và bậc thuế áp dụng', async () => {
    serve();
    renderCalc();
    await pickFish();
    value('100000');
    submit();
    const box = await screen.findByTestId('valuation-breakdown');
    expect(within(box).getByText('Giá hóa đơn')).toBeInTheDocument();
    expect(within(box).getByText('Cước vận chuyển quốc tế')).toBeInTheDocument();
    expect(within(box).getByText('Bảo hiểm hàng hóa')).toBeInTheDocument();
    expect(within(box).getByText('Trị giá tính thuế (CIF tại cửa khẩu nhập)')).toBeInTheDocument();
    expect(within(box).getByTestId('customs-value')).toHaveTextContent(/103\.500/);
    expect(within(box).getByText(/\+\s*3\.000/)).toBeInTheDocument();
    expect(within(box).getByTestId('rate-date')).toHaveTextContent(/bậc 3\/4 của lộ trình B3/);
    expect(within(box).queryByTestId('valuation-warnings')).toBeNull();
  });

  it('cảnh báo thiếu cước và chưa chọn Incoterm hiện bằng chữ, không hiện mã', async () => {
    serve({
      ...BASE,
      valuation: { ...BASE.valuation, incoterm: null, warnings: ['INCOTERM_NOT_GIVEN', 'MISSING_FREIGHT'] },
    });
    renderCalc();
    await pickFish();
    value('100000');
    submit();
    const warnings = await screen.findByTestId('valuation-warnings');
    expect(warnings).toHaveTextContent('Chưa chọn điều kiện giao hàng (Incoterm)');
    expect(warnings).toHaveTextContent('Chưa khai cước vận chuyển quốc tế: thuế có thể thấp hơn thực tế.');
    expect(warnings).not.toHaveTextContent('INCOTERM_NOT_GIVEN');
  });

  it('DDP: cần xem xét, giải thích rõ và không có con số', async () => {
    serve({
      ...BASE,
      status: 'needs_review',
      review_reason: 'ddp_not_supported',
      customs_value: null,
      mfn_rate: null,
      evfta_rate: null,
      mfn_duty: null,
      evfta_duty: null,
      savings: null,
      valuation: { ...BASE.valuation, incoterm: 'DDP', customs_value: null, steps: [{ code: 'invoice', amount: '100000.00' }] },
    });
    renderCalc();
    await pickFish();
    value('100000');
    incoterm('DDP');
    submit();
    expect(await screen.findByTestId('review-message')).toHaveTextContent('DDP');
    expect(screen.queryByTestId('customs-value')).toBeNull();
    expect(screen.queryByText(/Tiết kiệm mỗi lô/)).toBeNull();
  });

  it('kết quả cũ không có khối valuation vẫn hiển thị bình thường', async () => {
    const { valuation: _v, customs_value: _c, rate_date: _r, staging: _s, ...legacy } = BASE;
    serve(legacy);
    renderCalc();
    await pickFish();
    value('100000');
    submit();
    expect(await screen.findByText(/Tiết kiệm mỗi lô/)).toBeInTheDocument();
    expect(screen.queryByTestId('valuation-breakdown')).toBeNull();
  });

  it('đổi tiền tệ đổi nhãn và định dạng tiền của kết quả', async () => {
    serve({ ...BASE, valuation: { ...BASE.valuation, currency: 'USD' } });
    renderCalc();
    await pickFish();
    fireEvent.change(screen.getByLabelText('Tiền tệ'), { target: { value: 'USD' } });
    expect(screen.getByLabelText('Giá trị lô hàng (USD)')).toBeInTheDocument();
    value('100000');
    submit();
    const box = await screen.findByTestId('valuation-breakdown');
    expect(within(box).getByTestId('customs-value').textContent).toMatch(/US\$|\$/);
    expect(within(box).getByTestId('customs-value').textContent).not.toMatch(/€/);
  });

  it('chia hai cột: form một bên, kết quả một bên; chưa có kết quả thì cột phải hiện hướng dẫn', async () => {
    serve();
    renderCalc();
    await pickFish();
    const form = screen.getByRole('heading', { name: 'Thông tin lô hàng' });
    const results = screen.getByRole('heading', { name: 'Kết quả tính thuế' });
    const grid = form.closest('div.grid');
    expect(grid).not.toBeNull();
    expect(grid).toContainElement(results);
    expect(grid?.className).toMatch(/lg:grid-cols-2/);
    expect(form.parentElement).not.toBe(results.parentElement);
    expect(within(form.parentElement as HTMLElement).getByLabelText(/Giá trị lô hàng/)).toBeInTheDocument();
    expect(within(results.parentElement as HTMLElement).getByTestId('result-placeholder')).toBeInTheDocument();
    value('100000');
    submit();
    const section = await screen.findByLabelText('Kết quả');
    expect(within(results.parentElement as HTMLElement).getByLabelText('Kết quả')).toBe(section);
    expect(within(form.parentElement as HTMLElement).queryByLabelText('Kết quả')).toBeNull();
    expect(screen.queryByTestId('result-placeholder')).toBeNull();
    // nút xem thị trường nằm cùng cột kết quả
    expect(within(results.parentElement as HTMLElement).getByRole('button', { name: 'Xem thị trường nên xuất' })).toBeInTheDocument();
  });
});

