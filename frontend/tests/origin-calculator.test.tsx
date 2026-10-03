import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import OriginCalculator from '@/components/OriginCalculator';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/tools/origin',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const COFFEE = {
  code: '090121',
  formatted: '0901.21',
  name_vi: 'Cà phê rang',
  name_en: 'Coffee, roasted, not decaffeinated',
  chapter: '09',
  category: 'agriculture',
  supported: true,
};

const result = (over: Record<string, unknown>) => ({
  check_id: 'c-1',
  status: 'pass',
  reason: null,
  hs_code: '090121',
  hs_formatted: '0901.21',
  ex_works_value: '1000.00',
  nom_pct: null,
  rvc_pct: null,
  rule_type: null,
  threshold_pct: null,
  rule_text: null,
  source: null,
  ...over,
});
const PASS = result({ status: 'pass', nom_pct: '69.00', rvc_pct: '31.00', rule_type: 'MaxNOM', threshold_pct: '70.00' });

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// Mã không thuộc 20 mã đợt 1: máy tính hướng dẫn trả unsupported → giữ form nguyên liệu cũ.
const UNSUPPORTED_QUESTIONS = {
  status: 'unsupported',
  hs_code: '090121',
  hs_formatted: '0901.21',
  rule_type: null,
  requires_expert: false,
  questions: [],
  inputs: [],
  review_state: 'REVIEWED',
  unreviewed_components: [],
  disclaimer: null,
};

let bodies: Record<string, unknown>[] = [];

function serve(roo: () => Response | Promise<Response>) {
  bodies = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === '/api/public/hs-codes') return json(200, [COFFEE]);
      if (path.endsWith('/origin-questions')) return json(200, UNSUPPORTED_QUESTIONS);
      if (path === '/api/public/roo') {
        bodies.push(await req.json());
        return roo();
      }
      throw new Error(`unexpected ${path}`);
    }),
  );
}

function renderCalc(locale: 'vi' | 'en' = 'vi') {
  render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <LanguageProvider>
        <OriginCalculator />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

async function pickCoffee() {
  fireEvent.change(screen.getByRole('combobox', { name: /Sản phẩm/ }), { target: { value: 'ca phe' } });
  fireEvent.click(await screen.findByRole('option', { name: /0901\.21/ }));
  await screen.findByLabelText(/Giá xuất xưởng/); // form hiện sau khi biết mã không có máy tính hướng dẫn
}
const setExWorks = (v: string) => fireEvent.change(screen.getByLabelText(/Giá xuất xưởng/), { target: { value: v } });
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra xuất xứ' }));
const addMaterial = () => fireEvent.click(screen.getByRole('button', { name: 'Thêm nguyên liệu' }));
const declareNone = () => fireEvent.click(screen.getByRole('radio', { name: /Không có nguyên liệu nhập khẩu/ }));
const declareList = () => fireEvent.click(screen.getByRole('radio', { name: /Có nguyên liệu nhập khẩu/ }));
const notDeclared = () => fireEvent.click(screen.getByRole('radio', { name: /Chưa khai nguyên liệu/ }));

function fillMaterial(index: number, origin: string, value: string, hs = '') {
  const rows = screen.getAllByRole('group', { name: /^Nguyên liệu \d+/ });
  const row = within(rows[index]);
  fireEvent.change(row.getByLabelText(/Nước xuất xứ/), { target: { value: origin } });
  fireEvent.change(row.getByLabelText(/Giá trị nguyên liệu/), { target: { value } });
  fireEvent.change(row.getByLabelText(/Mã HS nguyên liệu/), { target: { value: hs } });
}

describe('Máy tính quy tắc xuất xứ (C4)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('mặc định là "chưa khai nguyên liệu" và không có dòng nguyên liệu nào', () => {
    serve(() => json(200, PASS));
    renderCalc();
    expect(screen.getByRole('radio', { name: /Chưa khai nguyên liệu/ })).toBeChecked();
    expect(screen.queryAllByRole('group', { name: /^Nguyên liệu \d+/ })).toHaveLength(0);
  });

  it('không chọn mã HS thì báo lỗi và không gọi server', async () => {
    serve(() => json(200, PASS));
    renderCalc();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng chọn mã HS');
    expect(bodies).toEqual([]);
  });

  it('chưa khai nguyên liệu: gửi materials_declared=false, không có danh sách', async () => {
    serve(() => json(200, result({ status: 'inconclusive', reason: 'materials_not_declared' })));
    renderCalc();
    await pickCoffee();
    setExWorks('1000');
    submit();
    await screen.findByRole('region', { name: 'Kết quả' });
    expect(bodies).toEqual([{ hs_code: '090121', ex_works_value: '1000', materials_declared: false, materials: [] }]);
  });

  it('không có nguyên liệu nhập khẩu: materials_declared=true và danh sách rỗng', async () => {
    serve(() => json(200, PASS));
    renderCalc();
    await pickCoffee();
    setExWorks('1000');
    declareNone();
    submit();
    await screen.findByRole('region', { name: 'Kết quả' });
    expect(bodies[0]).toMatchObject({ materials_declared: true, materials: [] });
  });

  it('có nguyên liệu: gửi giá trị dạng chuỗi, mã nước viết hoa, mã HS chuẩn hóa; bỏ HS trống', async () => {
    serve(() => json(200, PASS));
    renderCalc();
    await pickCoffee();
    setExWorks(' 1000.50 ');
    declareList(); // tự có sẵn 1 dòng
    addMaterial();
    fillMaterial(0, 'cn', '690.25', '3901.10');
    fillMaterial(1, 'VN', '100');
    submit();
    await screen.findByRole('region', { name: 'Kết quả' });
    expect(bodies[0]).toEqual({
      hs_code: '090121',
      ex_works_value: '1000.50',
      materials_declared: true,
      materials: [
        { origin_country: 'CN', value: '690.25', hs_code: '390110' },
        { origin_country: 'VN', value: '100' },
      ],
    });
  });

  it('giá xuất xưởng để trống vẫn gửi được (ex_works_value=null)', async () => {
    serve(() => json(200, PASS));
    renderCalc();
    await pickCoffee();
    declareNone();
    submit();
    await screen.findByRole('region', { name: 'Kết quả' });
    expect(bodies[0]).toMatchObject({ ex_works_value: null });
  });

  it.each(['0', '-5', 'abc', '1e3', '100.123', '1,000'])('giá xuất xưởng %j không hợp lệ thì không gọi server', async (value) => {
    serve(() => json(200, PASS));
    renderCalc();
    await pickCoffee();
    setExWorks(value);
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Giá xuất xưởng phải là số dương');
    expect(bodies).toEqual([]);
  });

  it.each([
    ['C', '10', ''],
    ['CHN', '10', ''],
    ['1A', '10', ''],
    ['CN', '', ''],
    ['CN', '0', ''],
    ['CN', 'abc', ''],
    ['CN', '10', '12'],
    ['CN', '10', 'abcdef'],
  ])('nguyên liệu (%j, %j, %j) không hợp lệ thì không gọi server', async (origin, value, hs) => {
    serve(() => json(200, PASS));
    renderCalc();
    await pickCoffee();
    setExWorks('1000');
    declareList();
    fillMaterial(0, origin, value, hs);
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Nguyên liệu 1/);
    expect(bodies).toEqual([]);
  });

  it('thêm và xóa dòng nguyên liệu; tối đa 50 dòng', () => {
    serve(() => json(200, PASS));
    renderCalc();
    declareList();
    // Tra bằng DOM trực tiếp: getByRole rất chậm khi có 50 dòng.
    const buttons = (text: string) => [...document.querySelectorAll('button')].filter((b) => b.textContent?.startsWith(text));
    const rows = () => document.querySelectorAll('fieldset[aria-label^="Nguyên liệu"]').length;
    for (let i = 0; i < 49; i++) fireEvent.click(buttons('Thêm nguyên liệu')[0]); // đã có sẵn 1 dòng
    expect(rows()).toBe(50);
    expect(buttons('Thêm nguyên liệu')[0]).toBeDisabled();
    fireEvent.click(buttons('Xóa nguyên liệu')[0]);
    expect(rows()).toBe(49);
    expect(buttons('Thêm nguyên liệu')[0]).toBeEnabled();
  }, 30_000);

  it('chuyển sang "chưa khai" thì danh sách nguyên liệu bị bỏ (không gửi kèm)', async () => {
    serve(() => json(200, PASS));
    renderCalc();
    await pickCoffee();
    setExWorks('1000');
    declareList();
    fillMaterial(0, 'CN', '10');
    notDeclared();
    submit();
    await screen.findByRole('region', { name: 'Kết quả' });
    expect(bodies[0]).toMatchObject({ materials_declared: false, materials: [] });
  });

  it('pass: hiện "Đạt", NOM, ngưỡng và lưu ý; không hứa cấp C/O', async () => {
    serve(() => json(200, PASS));
    renderCalc();
    await pickCoffee();
    setExWorks('1000');
    declareNone();
    submit();
    const region = await screen.findByRole('region', { name: 'Kết quả' });
    expect(region).toHaveTextContent('Đạt');
    expect(region).toHaveTextContent('69');
    expect(region).toHaveTextContent('70');
    expect(region).toHaveTextContent('Bộ Công Thương');
    expect(within(region).getByRole('link', { name: /thị trường EU nên xuất/ })).toHaveAttribute('href', '/vi/tools/tariff?roo=pass');
  });

  it('fail: hiện "Không đạt" khác với chưa kết luận', async () => {
    serve(() => json(200, result({ status: 'fail', nom_pct: '80.00', rvc_pct: '20.00', rule_type: 'MaxNOM', threshold_pct: '70.00' })));
    renderCalc();
    await pickCoffee();
    setExWorks('1000');
    declareNone();
    submit();
    const region = await screen.findByRole('region', { name: 'Kết quả' });
    expect(region).toHaveTextContent('Không đạt');
    expect(region).not.toHaveTextContent('Chưa kết luận');
  });

  it.each([
    ['requires_expert', 'chuyên gia'],
    ['materials_not_declared', 'chưa khai'],
    ['insufficient_data', 'thiếu dữ liệu'],
    ['ambiguous_rule', 'chuyên gia'],
  ])('inconclusive (%s): "Chưa kết luận" kèm lý do, không có phần trăm', async (reason, text) => {
    serve(() => json(200, result({ status: 'inconclusive', reason })));
    renderCalc();
    await pickCoffee();
    setExWorks('1000');
    declareNone();
    submit();
    const region = await screen.findByRole('region', { name: 'Kết quả' });
    expect(region).toHaveTextContent('Chưa kết luận');
    expect(region.textContent?.toLowerCase()).toContain(text);
    expect(region.textContent).not.toMatch(/\d+(\.\d+)?%/);
  });

  it('unsupported: nói rõ ngoài phạm vi dữ liệu, không có nghĩa là không có quy tắc', async () => {
    serve(() => json(200, result({ status: 'unsupported', reason: 'no_rule' })));
    renderCalc();
    await pickCoffee();
    setExWorks('1000');
    declareNone();
    submit();
    const region = await screen.findByRole('region', { name: 'Kết quả' });
    expect(region).toHaveTextContent('ngoài phạm vi dữ liệu');
    expect(region).toHaveTextContent('không có nghĩa');
  });

  it('429, 422 và mất kết nối đều báo lỗi rõ ràng', async () => {
    for (const [response, text] of [
      [() => json(429, {}), 'quá nhiều lần'],
      [() => json(422, {}), 'chưa hợp lệ'],
      [
        () => {
          throw new TypeError('network');
        },
        'Không kết nối được máy chủ',
      ],
    ] as const) {
      serve(response);
      renderCalc();
      await pickCoffee();
      setExWorks('1000');
      declareNone();
      submit();
      expect(await screen.findByRole('alert')).toHaveTextContent(text);
      screen.getByRole('button', { name: 'Kiểm tra xuất xứ' });
      vi.unstubAllGlobals();
      cleanup();
    }
  });

  it('kết quả cũ biến mất khi kiểm tra lại', async () => {
    let calls = 0;
    serve(() => (++calls === 1 ? json(200, PASS) : json(200, result({ status: 'unsupported', reason: 'no_rule' }))));
    renderCalc();
    await pickCoffee();
    setExWorks('1000');
    declareNone();
    submit();
    await screen.findByText('Đạt');
    submit();
    await waitFor(() => expect(screen.queryByText('Đạt')).not.toBeInTheDocument());
  });

  it('bản tiếng Anh dùng nhãn tiếng Anh', () => {
    serve(() => json(200, PASS));
    renderCalc('en');
    expect(screen.getByRole('button', { name: /Check origin/ })).toBeInTheDocument();
  });
});
