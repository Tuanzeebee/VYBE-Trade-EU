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

function serve(tariff: () => Response | Promise<Response>) {
  tariffBodies = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === '/api/public/hs-codes') return json(200, [COFFEE]);
      if (path === '/api/public/tariff') {
        tariffBodies.push(await req.json());
        return tariff();
      }
      throw new Error(`unexpected ${path}`);
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
});
