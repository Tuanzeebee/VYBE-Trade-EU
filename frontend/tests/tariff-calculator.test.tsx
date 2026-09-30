import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  code: '090111',
  formatted: '0901.11',
  name_vi: 'Cà phê nhân, chưa rang',
  name_en: 'Coffee, not roasted, not decaffeinated',
  chapter: '09',
  category: 'agriculture',
  supported: true,
};

const NO_NUMBERS = { mfn_rate: null, evfta_rate: null, mfn_duty: null, evfta_duty: null, savings: null, annual_savings: null };
const result = (over: Record<string, unknown>) => ({
  check_id: 'c-1',
  status: 'ok',
  hs_code: '090111',
  hs_formatted: '0901.11',
  destination: 'DE',
  product_value: '10000.00',
  quota_note: null,
  condition_note: null,
  quota_note_en: null,
  condition_note_en: null,
  ...NO_NUMBERS,
  ...over,
});
const OK = result({
  mfn_rate: '12.0000',
  evfta_rate: '6.0000',
  mfn_duty: '1200.00',
  evfta_duty: '600.00',
  savings: '600.00',
  annual_savings: '2400.00',
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let tariffBodies: unknown[] = [];
let marketBodies: unknown[] = [];

const RANKED = (over: Record<string, unknown> = {}) => ({
  check_id: 'm-1',
  status: 'ok',
  basis: 'mfn',
  hs_code: '090111',
  hs_formatted: '0901.11',
  product_value: '10000.00',
  duty_rate: '12.0000',
  rows: [
    {
      country: 'FR',
      status: 'ranked',
      rank: 1,
      duty: '1200.00',
      vat_rate: '5.5000',
      vat: '616.00',
      total: '1816.00',
      label_languages: 'fr',
      note: null,
      note_en: null,
    },
  ],
  ...over,
});

function serve(tariff: () => Response | Promise<Response>, markets: () => Response | Promise<Response> = () => json(200, RANKED())) {
  tariffBodies = [];
  marketBodies = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === '/api/public/hs-codes') return json(200, [COFFEE]);
      if (path === '/api/public/tariff') {
        tariffBodies.push(await req.json());
        return tariff();
      }
      if (path === '/api/public/markets') {
        marketBodies.push(await req.json());
        return markets();
      }
      throw new Error(`unexpected ${path}`);
    }),
  );
}

function renderCalc(locale: 'vi' | 'en' = 'vi', initialRoo?: 'pass' | 'fail' | 'inconclusive') {
  render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <LanguageProvider>
        <TariffCalculator initialRoo={initialRoo} />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

async function pickCoffee() {
  fireEvent.change(screen.getByRole('combobox', { name: /Sản phẩm/ }), { target: { value: 'ca phe' } });
  fireEvent.click(await screen.findByRole('option', { name: /0901\.11/ }));
}

const fillValue = (v: string) => fireEvent.change(screen.getByLabelText(/Giá trị lô hàng/), { target: { value: v } });
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Tính tiết kiệm thuế' }));

describe('Máy tính tiết kiệm thuế (C2)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('không chọn mã HS thì báo lỗi và không gọi server', async () => {
    serve(() => json(200, OK));
    renderCalc();
    fillValue('10000');
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng chọn mã HS');
    expect(tariffBodies).toEqual([]);
  });

  it.each(['', '0', '-5', 'abc', '1e3', '100.123', '1,000'])('giá trị %j không hợp lệ thì không gọi server', async (value) => {
    serve(() => json(200, OK));
    renderCalc();
    await pickCoffee();
    fillValue(value);
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Giá trị lô hàng phải là số dương');
    expect(tariffBodies).toEqual([]);
  });

  it('gửi số tiền dạng chuỗi (không qua float), mã HS chuẩn hóa và số lô hàng', async () => {
    serve(() => json(200, OK));
    renderCalc();
    await pickCoffee();
    fireEvent.change(screen.getByLabelText(/Nước EU nhập khẩu/), { target: { value: 'FR' } });
    fillValue(' 10000.50 ');
    fireEvent.change(screen.getByLabelText(/Số lô hàng mỗi năm/), { target: { value: '4' } });
    submit();
    await screen.findByText(/Tiết kiệm mỗi lô/);
    expect(tariffBodies).toEqual([{ hs_code: '090111', destination: 'FR', product_value: '10000.50', shipments_per_year: 4 }]);
  });

  it('không nhập số lô hàng thì không gửi shipments_per_year', async () => {
    serve(() => json(200, OK));
    renderCalc();
    await pickCoffee();
    fillValue('10000');
    submit();
    await screen.findByText(/Tiết kiệm mỗi lô/);
    expect(tariffBodies[0]).not.toHaveProperty('shipments_per_year', expect.anything());
  });

  it('kết quả ok: hiện thuế MFN/EVFTA, tiết kiệm mỗi lô và mỗi năm, lưu ý, nút xem nhà cung cấp', async () => {
    serve(() => json(200, OK));
    renderCalc();
    await pickCoffee();
    fillValue('10000');
    submit();
    const region = await screen.findByRole('region', { name: 'Kết quả' });
    expect(region).toHaveTextContent('600');
    expect(region).toHaveTextContent('1.200');
    expect(region).toHaveTextContent('2.400');
    expect(region).toHaveTextContent('12%');
    expect(region).toHaveTextContent('6%');
    expect(screen.getByText(/chỉ mang tính tham khảo/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Xem nhà cung cấp/ })).toHaveAttribute('href', expect.stringContaining('/suppliers?hs=090111'));
  });

  it('mã 8 số: link nhà cung cấp dùng nhóm 6 số (danh bạ lọc theo 6 số)', async () => {
    serve(() => json(200, result({ ...OK, hs_code: '03061792', hs_formatted: '0306.17.92' })));
    renderCalc();
    await pickCoffee();
    fillValue('10000');
    submit();
    await screen.findByRole('region', { name: 'Kết quả' });
    expect(screen.getByRole('link', { name: /Xem nhà cung cấp/ })).toHaveAttribute('href', '/suppliers?hs=030617');
  });

  it('unsupported: báo chưa hỗ trợ, không có con số nào', async () => {
    serve(() => json(200, result({ status: 'unsupported' })));
    renderCalc();
    await pickCoffee();
    fillValue('10000');
    submit();
    const region = await screen.findByRole('region', { name: 'Kết quả' });
    expect(region).toHaveTextContent('chưa được hỗ trợ');
    expect(region.textContent).not.toMatch(/€|\d+%/);
  });

  it('needs_review: cần kiểm tra thêm, hiện ghi chú hạn ngạch, không có con số', async () => {
    serve(() => json(200, result({ status: 'needs_review', quota_note: 'Hạn ngạch TRQ synthetic' })));
    renderCalc();
    await pickCoffee();
    fillValue('10000');
    submit();
    const region = await screen.findByRole('region', { name: 'Kết quả' });
    expect(region).toHaveTextContent('cần kiểm tra thêm');
    expect(region).toHaveTextContent('Hạn ngạch TRQ synthetic');
    expect(region.textContent).not.toMatch(/€|\d+%/);
  });

  it('needs_review: giao diện EN hiện ghi chú EN, thiếu bản EN thì rơi về bản vi', async () => {
    serve(() =>
      json(200, result({ status: 'needs_review', quota_note: 'Hạn ngạch vi', quota_note_en: 'Quota en', condition_note: 'Điều kiện vi' })),
    );
    renderCalc('en');
    fireEvent.change(screen.getByRole('combobox', { name: /Product/ }), { target: { value: 'ca phe' } });
    fireEvent.click(await screen.findByRole('option', { name: /0901\.11/ }));
    fireEvent.change(screen.getByLabelText(/Shipment value/), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: /Calculate/ }));
    const region = await screen.findByRole('region');
    expect(region).toHaveTextContent('Quota en');
    expect(region).toHaveTextContent('Điều kiện vi');
    expect(region).not.toHaveTextContent('Hạn ngạch vi');
  });

  it('needs_review: giao diện vi hiện ghi chú vi, không hiện bản EN', async () => {
    serve(() => json(200, result({ status: 'needs_review', quota_note: 'Hạn ngạch vi', quota_note_en: 'Quota en' })));
    renderCalc();
    await pickCoffee();
    fillValue('10000');
    submit();
    const region = await screen.findByRole('region', { name: 'Kết quả' });
    expect(region).toHaveTextContent('Hạn ngạch vi');
    expect(region).not.toHaveTextContent('Quota en');
  });

  it('429: báo tính quá nhiều lần', async () => {
    serve(() => json(429, { error: { code: 'rate_limited', message: 'x' } }));
    renderCalc();
    await pickCoffee();
    fillValue('10000');
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('quá nhiều lần');
  });

  it('422 từ server: báo dữ liệu chưa hợp lệ', async () => {
    serve(() => json(422, { detail: [] }));
    renderCalc();
    await pickCoffee();
    fillValue('10000');
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('chưa hợp lệ');
  });

  it('mất kết nối: báo lỗi mạng và cho thử lại', async () => {
    serve(() => {
      throw new TypeError('network');
    });
    renderCalc();
    await pickCoffee();
    fillValue('10000');
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không kết nối được máy chủ');
    expect(screen.getByRole('button', { name: 'Tính tiết kiệm thuế' })).toBeEnabled();
  });

  it('kết quả cũ biến mất khi tính lại (không hiện số của lần trước)', async () => {
    let calls = 0;
    serve(() => (++calls === 1 ? json(200, OK) : json(200, result({ status: 'unsupported' }))));
    renderCalc();
    await pickCoffee();
    fillValue('10000');
    submit();
    await screen.findByText(/Tiết kiệm mỗi lô/);
    submit();
    await waitFor(() => expect(screen.queryByText(/Tiết kiệm mỗi lô/)).not.toBeInTheDocument());
    expect(await screen.findByText(/chưa được hỗ trợ/)).toBeInTheDocument();
  });

  it('có đủ 27 nước EU để chọn', () => {
    serve(() => json(200, OK));
    renderCalc();
    expect(screen.getByLabelText(/Nước EU nhập khẩu/).querySelectorAll('option')).toHaveLength(27);
  });

  it('bản tiếng Anh dùng nhãn tiếng Anh', () => {
    serve(() => json(200, OK));
    renderCalc('en');
    expect(screen.getByRole('button', { name: /Calculate/ })).toBeInTheDocument();
  });

  describe('thị trường nên xuất', () => {
    const showMarkets = () => screen.queryByRole('button', { name: 'Xem thị trường nên xuất' });
    const rankingRegion = () => screen.queryByRole('region', { name: 'Thị trường nên xuất' });
    async function calculate() {
      renderCalc();
      await pickCoffee();
      fillValue('10000');
      submit();
      await screen.findByRole('region', { name: 'Kết quả' });
    }

    it.each(['unsupported', 'needs_review'])('nút chỉ hiện khi thuế ok, không hiện với %s', async (status) => {
      serve(() => json(200, result({ status })));
      await calculate();
      expect(showMarkets()).not.toBeInTheDocument();
    });

    it('thuế ok: có nút, gửi đúng mã HS, giá trị và kết quả RoO đã tính', async () => {
      serve(() => json(200, OK));
      renderCalc('vi', 'pass');
      await pickCoffee();
      fillValue('10000.50');
      submit();
      await screen.findByRole('region', { name: 'Kết quả' });
      fireEvent.click(showMarkets()!);
      await screen.findByRole('region', { name: 'Thị trường nên xuất' });
      expect(marketBodies).toEqual([{ hs_code: '090111', product_value: '10000.50', roo_status: 'pass' }]);
    });

    it('sửa ô giá trị sau khi tính: xếp hạng dùng giá trị đã tính, không dùng ô đang gõ', async () => {
      serve(() => json(200, OK));
      await calculate();
      fillValue('999999');
      fireEvent.click(showMarkets()!);
      await screen.findByRole('region', { name: 'Thị trường nên xuất' });
      expect(marketBodies).toEqual([{ hs_code: '090111', product_value: '10000' }]);
    });

    it.each([
      ['giá trị', async () => fillValue('20000')],
      ['kết quả RoO', async () => fireEvent.change(screen.getByLabelText(/Kết quả kiểm tra xuất xứ/), { target: { value: 'fail' } })],
      [
        'mã HS',
        async () => {
          fireEvent.change(screen.getByRole('combobox', { name: /Sản phẩm/ }), { target: { value: 'ca phe' } });
          fireEvent.click(await screen.findByRole('option', { name: /0901\.11/ }));
        },
      ],
    ])('đổi %s thì bảng xếp hạng cũ biến mất', async (_name, change) => {
      serve(() => json(200, OK));
      await calculate();
      fireEvent.click(showMarkets()!);
      await screen.findByRole('region', { name: 'Thị trường nên xuất' });
      await change();
      await waitFor(() => expect(rankingRegion()).not.toBeInTheDocument());
    });

    it('tính lại thì bảng xếp hạng cũ biến mất', async () => {
      serve(() => json(200, OK));
      await calculate();
      fireEvent.click(showMarkets()!);
      await screen.findByRole('region', { name: 'Thị trường nên xuất' });
      submit();
      await waitFor(() => expect(rankingRegion()).not.toBeInTheDocument());
    });

    it('tiêu đề bảng xếp hạng nêu mã HS và giá trị đã xếp hạng', async () => {
      serve(() => json(200, OK));
      await calculate();
      fireEvent.click(showMarkets()!);
      const ranking = await screen.findByRole('region', { name: 'Thị trường nên xuất' });
      expect(ranking).toHaveTextContent('0901.11');
      expect(ranking).toHaveTextContent('10.000');
    });
  });
});
