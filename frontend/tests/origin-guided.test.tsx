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

const SHRIMP = {
  code: '03061792',
  formatted: '0306.17.92',
  name_vi: 'Tôm chi Penaeus đông lạnh',
  name_en: 'Frozen Penaeus shrimps',
  chapter: '03',
  category: 'seafood',
  supported: true,
};

const NOTICE = /Lưu ý: Thông tin này chưa được luật sư thương mại xác nhận/;

const QUESTIONS = (over: Record<string, unknown> = {}) => ({
  status: 'ok',
  hs_code: '03061792',
  hs_formatted: '0306.17.92',
  rule_type: 'WO_PRODUCT',
  requires_expert: false,
  questions: [{ order: 1, text_vi: 'Nguyên liệu nuôi tại VN hay đánh bắt tại VN?', text_en: null }],
  inputs: [
    { name: 'transit_third_country', kind: 'boolean', options: [], required_if: null },
    { name: 'transit_handling', kind: 'enum', options: ['STORAGE_UNDER_CUSTOMS', 'PROCESSED'], required_if: 'transit_third_country=true' },
    { name: 'sourcing', kind: 'enum', options: ['FARMED_IN_VN', 'CAUGHT_BY_VESSEL', 'IMPORTED'], required_if: null },
  ],
  review_state: 'UNREVIEWED',
  unreviewed_components: ['origin_rule'],
  disclaimer: 'x',
  ...over,
});

const EVIDENCE = [
  {
    code: 'IUU_CATCH_CERT',
    name_vi: 'Giấy khai thác IUU',
    name_en: 'IUU catch certificate',
    layer: 'MARKET_ACCESS',
    scope: 'SHIPMENT',
    blocks: 'IMPORT',
    legal_status: 'VERIFIED',
    status: 'NEEDS_INPUT',
    conditions: ['IF_WILD_CAUGHT'],
    review_state: 'UNREVIEWED',
  },
  {
    code: 'ORIGIN_DECLARATION',
    name_vi: 'Tự chứng nhận xuất xứ',
    name_en: 'Origin declaration',
    layer: 'TARIFF',
    scope: 'SHIPMENT',
    blocks: 'TARIFF_PREFERENCE',
    legal_status: 'VERIFIED',
    status: 'REQUIRED',
    conditions: ['CONSIGNMENT_LE_6000'],
    review_state: 'UNREVIEWED',
  },
];

const RESULT = (over: Record<string, unknown> = {}) => ({
  check_id: 'c-1',
  status: 'pass',
  reasons: [{ code: 'WHOLLY_OBTAINED', vi: 'Sản phẩm có xuất xứ thuần túy tại Việt Nam.', en: 'The product is wholly obtained in Viet Nam.' }],
  inputs_missing: [],
  additional_evidence: [],
  required_evidence: { items: EVIDENCE, review_state: 'UNREVIEWED', disclaimer: 'x' },
  hs_code: '03061792',
  hs_formatted: '0306.17.92',
  rule_type: 'WO_PRODUCT',
  rule_text_vi: null,
  rule_text_en: null,
  insufficient_operations_vi: null,
  tolerance_note_vi: null,
  risk_note_vi: null,
  requires_expert: false,
  preference_applicable: true,
  savings: '12000.00',
  review_state: 'UNREVIEWED',
  unreviewed_components: ['origin_rule'],
  disclaimer: 'x',
  ...over,
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let bodies: Record<string, unknown>[] = [];

function serve(questions: unknown, origin: () => Response = () => json(200, RESULT())) {
  bodies = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === '/api/public/hs-codes') return json(200, [SHRIMP]);
      if (path.endsWith('/origin-questions')) return json(200, questions);
      if (path === '/api/public/origin') {
        bodies.push(await req.json());
        return origin();
      }
      if (path === '/api/me/company') return json(401, { error: { code: 'unauthorized', message: 'x' } });
      throw new Error(`unexpected ${path}`);
    }),
  );
}

function renderCalc() {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <OriginCalculator />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

async function pickShrimp() {
  fireEvent.change(screen.getByRole('combobox', { name: /Sản phẩm/ }), { target: { value: 'tom' } });
  fireEvent.click(await screen.findByRole('option', { name: /0306/ }));
  await screen.findByTestId('origin-guided');
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra xuất xứ' }));

describe('Máy tính xuất xứ có hướng dẫn (20 mã Chương 3/7/8)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('mã được hỗ trợ: hiện câu hỏi và các trường trả lời theo loại quy tắc', async () => {
    serve(QUESTIONS());
    renderCalc();
    await pickShrimp();
    expect(screen.getByText('Nguyên liệu nuôi tại VN hay đánh bắt tại VN?')).toBeInTheDocument();
    expect(screen.getByLabelText('Nguồn sản phẩm / nguyên liệu')).toBeInTheDocument();
    // chưa có kết quả thì chưa có lưu ý; cột kết quả hiện hướng dẫn thay vì để trống
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
    expect(screen.getByTestId('result-placeholder')).toBeInTheDocument();
    // trường chỉ hiện khi câu điều kiện được trả lời Có
    expect(screen.queryByLabelText('Ở nước thứ ba, hàng được xử lý thế nào?')).not.toBeInTheDocument();
    const transit = screen.getByRole('group', { name: /quá cảnh, lưu kho/ });
    fireEvent.click(within(transit).getByLabelText('Có'));
    expect(screen.getByLabelText('Ở nước thứ ba, hàng được xử lý thế nào?')).toBeInTheDocument();
  });

  it('REVIEWED thì kết quả không có dòng lưu ý', async () => {
    serve(QUESTIONS({ review_state: 'REVIEWED', unreviewed_components: [] }), () =>
      json(200, RESULT({ review_state: 'REVIEWED', unreviewed_components: [], disclaimer: null })),
    );
    renderCalc();
    await pickShrimp();
    submit();
    await screen.findByLabelText('Kết quả');
    expect(screen.queryByTestId('unreviewed-notice')).not.toBeInTheDocument();
  });

  it('chia hai cột: câu hỏi một bên, kết quả một bên', async () => {
    serve(QUESTIONS());
    renderCalc();
    await pickShrimp();
    const questions = screen.getByRole('heading', { name: 'Trả lời câu hỏi' });
    const results = screen.getByRole('heading', { name: 'Kết quả kiểm tra' });
    const grid = questions.closest('div.grid');
    expect(grid).not.toBeNull();
    expect(grid).toContainElement(results);
    expect(grid?.className).toMatch(/lg:grid-cols-2/);
    // mỗi tiêu đề thuộc một cột khác nhau
    expect(questions.parentElement).not.toBe(results.parentElement);
    expect(within(questions.parentElement as HTMLElement).getByLabelText('Nguồn sản phẩm / nguyên liệu')).toBeInTheDocument();
    submit();
    const section = await screen.findByLabelText('Kết quả');
    expect(within(results.parentElement as HTMLElement).getByLabelText('Kết quả')).toBe(section);
    expect(within(questions.parentElement as HTMLElement).queryByLabelText('Kết quả')).not.toBeInTheDocument();
  });

  it('gửi câu trả lời đúng kiểu; "Chưa rõ" không được gửi', async () => {
    serve(QUESTIONS());
    renderCalc();
    await pickShrimp();
    const transit = screen.getByRole('group', { name: /quá cảnh, lưu kho/ });
    fireEvent.click(within(transit).getByLabelText('Không'));
    fireEvent.change(screen.getByLabelText('Nguồn sản phẩm / nguyên liệu'), { target: { value: 'FARMED_IN_VN' } });
    fireEvent.change(screen.getByLabelText('Trị giá lô hàng (EUR)'), { target: { value: '5000' } });
    fireEvent.change(screen.getByLabelText('Nguồn nguyên liệu của lô'), { target: { value: 'AQUACULTURE' } });
    submit();
    await screen.findByLabelText('Kết quả');
    expect(bodies).toEqual([
      {
        hs_code: '03061792',
        consignment_value_eur: '5000',
        raw_material_source: 'AQUACULTURE',
        transit_third_country: false,
        sourcing: 'FARMED_IN_VN',
      },
    ]);
  });

  it('kết quả Đạt: kết luận, lý do, tiết kiệm, giấy tờ nhóm theo mức chặn và chỉ MỘT lưu ý', async () => {
    serve(QUESTIONS());
    renderCalc();
    await pickShrimp();
    submit();
    const section = await screen.findByLabelText('Kết quả');
    expect(within(section).getByText('Đạt')).toBeInTheDocument();
    expect(within(section).getByText('Theo dữ liệu hiện có, lô hàng đáp ứng quy tắc xuất xứ.')).toBeInTheDocument();
    expect(within(section).getByText('Sản phẩm có xuất xứ thuần túy tại Việt Nam.')).toBeInTheDocument();
    expect(within(section).getByTestId('origin-savings')).toHaveTextContent(/12\.000/);
    // đúng một dòng lưu ý trên cả trang, cỡ chữ nhỏ, nằm ngay dưới kết luận (trước danh sách giấy tờ)
    const notices = screen.getAllByTestId('unreviewed-notice');
    expect(notices).toHaveLength(1);
    expect(notices[0].className).toMatch(/text-xs/);
    const list = within(section).getByTestId('evidence-list');
    expect(notices[0].compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(list).queryByTestId('unreviewed-notice')).not.toBeInTheDocument();
    // nhóm theo mức chặn, kèm nhãn trạng thái
    expect(within(list).getByText('Bắt buộc để nhập khẩu vào EU')).toBeInTheDocument();
    expect(within(list).getByText('Để hưởng ưu đãi thuế')).toBeInTheDocument();
    expect(within(list).getByText('Giấy khai thác IUU')).toBeInTheDocument();
    expect(within(list).getByText('Tùy thông tin lô hàng')).toBeInTheDocument();
    expect(within(list).getByText('Bắt buộc')).toBeInTheDocument();
    expect(within(section).getByText(/Bộ Công Thương/)).toBeInTheDocument();
  });

  it('chi tiết quy tắc gom vào mục thu gọn, ghi nhãn từng ghi chú', async () => {
    serve(QUESTIONS(), () =>
      json(
        200,
        RESULT({
          rule_text_vi: 'Sản phẩm phải có xuất xứ thuần túy.',
          insufficient_operations_vi: 'Đông lạnh, bảo quản; đóng gói đơn giản',
          tolerance_note_vi: 'Không áp dụng dung sai',
          risk_note_vi: 'Thấp',
        }),
      ),
    );
    renderCalc();
    await pickShrimp();
    submit();
    const details = await screen.findByTestId('rule-details');
    expect(details.tagName).toBe('DETAILS');
    expect(details).not.toHaveAttribute('open');
    for (const title of ['Quy tắc áp dụng', 'Thao tác chưa đủ để tạo xuất xứ', 'Dung sai', 'Mức rủi ro']) {
      expect(within(details).getByText(title)).toBeInTheDocument();
    }
    expect(within(details).getByText('Thấp')).toBeInTheDocument();
  });

  it('giấy tờ huy hiệu của nền tảng không nằm trong danh sách giấy tờ của lô', async () => {
    const badge = {
      ...EVIDENCE[0],
      code: 'EUR1_ISSUED_12M',
      name_vi: 'EUR.1 đã cấp trong 12 tháng',
      layer: 'PLATFORM_BADGE',
      scope: 'COMPANY',
      blocks: 'NONE',
      status: 'REQUIRED',
    };
    serve(QUESTIONS(), () => json(200, RESULT({ required_evidence: { items: [...EVIDENCE, badge], review_state: 'UNREVIEWED', disclaimer: 'x' } })));
    renderCalc();
    await pickShrimp();
    submit();
    const list = await screen.findByTestId('evidence-list');
    expect(within(list).queryByText('EUR.1 đã cấp trong 12 tháng')).not.toBeInTheDocument();
    expect(within(list).getByText('Giấy khai thác IUU')).toBeInTheDocument();
  });

  it('Chưa kết luận: liệt kê câu còn thiếu, không phải Không đạt', async () => {
    serve(QUESTIONS(), () =>
      json(
        200,
        RESULT({
          status: 'inconclusive',
          reasons: [{ code: 'INPUTS_MISSING', vi: 'Chưa đủ câu trả lời để kết luận.', en: 'x' }],
          inputs_missing: ['sourcing'],
          savings: null,
          preference_applicable: false,
        }),
      ),
    );
    renderCalc();
    await pickShrimp();
    submit();
    const section = await screen.findByLabelText('Kết quả');
    expect(within(section).getByText('Chưa kết luận')).toBeInTheDocument();
    expect(within(section).queryByText('Không đạt')).not.toBeInTheDocument();
    expect(within(section).getByText('Nguồn sản phẩm / nguyên liệu')).toBeInTheDocument();
    expect(within(section).queryByTestId('origin-savings')).not.toBeInTheDocument();
  });

  it('quy tắc cần chuyên gia: báo rõ chỉ có thể trả "Chưa kết luận"', async () => {
    serve(QUESTIONS({ requires_expert: true }));
    renderCalc();
    await pickShrimp();
    expect(screen.getByText(/cần chuyên gia xác nhận nên hệ thống chỉ có thể trả/)).toBeInTheDocument();
  });

  it('phần trăm sai thì báo lỗi và không gọi server', async () => {
    serve(QUESTIONS({ inputs: [{ name: 'restricted_nonorig_pct_weight', kind: 'percent', options: [], required_if: null }] }));
    renderCalc();
    await pickShrimp();
    fireEvent.change(screen.getByLabelText(/theo trọng lượng/), { target: { value: '120' } });
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Tỷ lệ phần trăm phải là số từ 0 đến 100');
    expect(bodies).toEqual([]);
  });

  it('lỗi 429 báo rõ ràng', async () => {
    serve(QUESTIONS(), () => json(429, {}));
    renderCalc();
    await pickShrimp();
    submit();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('quá nhiều lần'));
  });

  it('mã chưa hỗ trợ: giữ form nguyên liệu cũ', async () => {
    serve({
      ...QUESTIONS(),
      status: 'unsupported',
      rule_type: null,
      inputs: [],
      questions: [],
      review_state: 'REVIEWED',
      unreviewed_components: [],
      disclaimer: null,
    });
    renderCalc();
    fireEvent.change(screen.getByRole('combobox', { name: /Sản phẩm/ }), { target: { value: 'tom' } });
    fireEvent.click(await screen.findByRole('option', { name: /0306/ }));
    expect(await screen.findByLabelText(/Giá xuất xưởng/)).toBeInTheDocument();
    expect(screen.queryByTestId('origin-guided')).not.toBeInTheDocument();
  });
});
