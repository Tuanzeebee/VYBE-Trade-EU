import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EvidenceManager from '@/components/EvidenceManager';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter/onboarding',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const TYPES = [
  { code: 'iso_9001', name_vi: 'ISO 9001', name_en: 'ISO 9001', group: 'quality', validity_months: null },
  { code: 'eur1_issued', name_vi: 'EUR.1 đã cấp', name_en: 'Issued EUR.1', group: 'origin', validity_months: 12 },
];

const evidence = (over: Record<string, unknown>) => ({
  id: 'e-1',
  type_code: 'iso_9001',
  type_name_vi: 'ISO 9001',
  type_name_en: 'ISO 9001',
  certificate_number: 'VN-123',
  issuer: 'SGS',
  issued_at: '2026-01-01',
  expires_at: '2027-01-01',
  approval_status: 'pending',
  reject_reason: null,
  file_url: 'https://fake/e-1.pdf',
  ...over,
});

const item = (over: Record<string, unknown>) => ({
  type_code: 'iso_9001',
  name_vi: 'ISO 9001',
  name_en: 'ISO 9001',
  required: true,
  note: null,
  state: 'missing',
  ...over,
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

interface World {
  types?: unknown;
  list?: unknown[];
  checklist?: unknown[];
  products?: unknown[];
  preview?: unknown;
  create?: () => Response | Promise<Response>;
  presign?: () => Response | Promise<Response>;
  put?: () => Response | Promise<Response>;
}

let calls: { method: string; path: string; body?: unknown }[] = [];

function serve(world: World = {}) {
  calls = [];
  let list = world.list ?? [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      const body = ['POST', 'PATCH', 'PUT'].includes(req.method) && url.host === 'localhost:8000' ? await req.clone().json().catch(() => undefined) : undefined;
      calls.push({ method: req.method, path: url.pathname, body });
      if (url.pathname === '/api/exporter/evidence-types') return json(200, world.types ?? TYPES);
      if (url.pathname === '/api/exporter/evidences/checklist') return json(200, world.checklist ?? []);
      if (url.pathname === '/api/exporter/products') return json(200, world.products ?? []);
      if (url.pathname === '/api/exporter/evidences/extract-preview') {
        return json(200, world.preview ?? { status: 'failed', method: null, fields: {}, error: 'unreadable_model_output' });
      }
      if (url.pathname === '/api/exporter/evidences' && req.method === 'GET') return json(200, list);
      if (url.pathname === '/api/exporter/evidences' && req.method === 'POST') {
        const res = await (world.create ?? (() => json(201, evidence({ id: 'new' }))))();
        if (res.ok) list = [...list, evidence({ id: 'new' })];
        return res;
      }
      if (url.pathname.startsWith('/api/exporter/evidences/') && req.method === 'DELETE') {
        list = list.filter((e) => (e as { id: string }).id !== url.pathname.split('/').pop());
        return new Response(null, { status: 204 });
      }
      if (url.pathname === '/api/uploads/presign') {
        return world.presign ? world.presign() : json(200, { upload_url: 'https://storage.test/upload', key: 'evidence/c-1/abc.pdf' });
      }
      if (url.host === 'storage.test') return world.put ? world.put() : new Response(null, { status: 200 });
      throw new Error(`unexpected ${req.method} ${req.url}`);
    }),
  );
}

function renderManager(props: { locale?: 'vi' | 'en'; onCount?: (n: number) => void } = {}) {
  render(
    <NextIntlClientProvider locale={props.locale ?? 'vi'} messages={{}}>
      <LanguageProvider>
        <EvidenceManager onCountChange={props.onCount} />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

const pdf = (name = 'chung-chi.pdf', size = 1000) => {
  const file = new File(['x'.repeat(size)], name, { type: 'application/pdf' });
  return file;
};

/** Chọn file rồi chờ hệ thống đọc xong (tải lên + đọc thử) — nút Nộp bị khoá trong lúc đọc. */
async function chooseFile(file: File = pdf()) {
  fireEvent.change(screen.getByLabelText(/File bằng chứng/), { target: { files: [file] } });
  await waitFor(() => expect(screen.queryByText('Đang đọc giấy tờ…')).not.toBeInTheDocument());
}

async function fillForm(opts: { type?: string; file?: File | null } = {}) {
  const select = await screen.findByLabelText(/Loại bằng chứng/);
  fireEvent.change(select, { target: { value: opts.type ?? 'iso_9001' } });
  if (opts.file !== null) await chooseFile(opts.file ?? pdf());
}

const READ = {
  status: 'ready',
  method: 'rules',
  fields: {
    type_code: 'iso_9001',
    certificate_number: 'VN-ISO-2026-001',
    issuer: 'SGS Vietnam',
    issued_at: '2026-03-01',
    expires_at: '2029-02-28',
    holder_name: null,
    holder_address: null,
  },
  error: null,
};

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Nộp bằng chứng' }));

describe('EvidenceManager (C6)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('chưa có bằng chứng: hiện hướng dẫn, không có dữ liệu mẫu', async () => {
    serve();
    renderManager();
    expect(await screen.findByRole('status')).toHaveTextContent('Chưa có bằng chứng');
    expect(screen.queryByText(/HACCP Codex/)).not.toBeInTheDocument();
    expect(screen.queryByText(/OCR/)).not.toBeInTheDocument();
  });

  it('danh sách kiểm: bắt buộc và chỉ nhắc, mỗi loại kèm trạng thái', async () => {
    serve({
      checklist: [
        item({ state: 'missing' }),
        item({ type_code: 'haccp', name_vi: 'HACCP', name_en: 'HACCP', state: 'approved' }),
        item({ type_code: 'eudr_file', name_vi: 'Hồ sơ EUDR', name_en: 'EUDR file', required: false, note: 'Nộp hồ sơ EUDR', state: 'pending' }),
      ],
    });
    renderManager();
    const region = await screen.findByRole('region', { name: 'Danh sách kiểm theo nhóm hàng' });
    expect(within(region).getByText('ISO 9001')).toBeInTheDocument();
    expect(region).toHaveTextContent('Bắt buộc');
    expect(region).toHaveTextContent('Chỉ nhắc');
    expect(region).toHaveTextContent('Nộp hồ sơ EUDR');
    expect(region).toHaveTextContent('Chưa nộp');
    expect(region).toHaveTextContent('Đã duyệt');
    expect(region).toHaveTextContent('Chờ duyệt');
  });

  it('chưa có sản phẩm nào: hướng dẫn thêm sản phẩm có mã HS', async () => {
    serve({ checklist: [], products: [] });
    renderManager();
    expect(await screen.findByText(/Thêm sản phẩm có mã HS/)).toBeInTheDocument();
  });

  it('đã có sản phẩm kèm mã HS nhưng chưa có luật bằng chứng: không bảo thêm sản phẩm nữa, nói rõ chưa có danh sách và vẫn cho nộp', async () => {
    serve({ checklist: [], products: [{ id: 'p-1', name: 'Gạo ST25', hs_code: '100630' }] });
    renderManager();
    expect(await screen.findByText(/Chưa có danh sách bằng chứng bắt buộc cho nhóm hàng của bạn/)).toBeInTheDocument();
    expect(screen.queryByText(/Thêm sản phẩm có mã HS/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nộp bằng chứng' })).toBeInTheDocument();
  });

  it('không tải được danh sách sản phẩm: lùi về hướng dẫn mặc định, không vỡ trang', async () => {
    serve({ checklist: [] });
    const original = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn(async (req: Request) => (new URL(req.url).pathname === '/api/exporter/products' ? Promise.reject(new Error('offline')) : (original as typeof fetch)(req))));
    renderManager();
    expect(await screen.findByText(/Thêm sản phẩm có mã HS/)).toBeInTheDocument();
  });

  it.each([
    ['pending', 'Chờ duyệt'],
    ['approved', 'Đã duyệt'],
    ['rejected', 'Bị từ chối'],
  ])('hiện trạng thái %s thành "%s"', async (status, label) => {
    serve({ list: [evidence({ approval_status: status, reject_reason: status === 'rejected' ? 'Ảnh mờ' : null })] });
    renderManager();
    const row = await screen.findByRole('listitem', { name: /ISO 9001/ });
    expect(row).toHaveTextContent(label);
    if (status === 'rejected') expect(row).toHaveTextContent('Ảnh mờ');
    expect(row).toHaveTextContent('VN-123');
    expect(row).toHaveTextContent('SGS');
  });

  it('bằng chứng đã hết hạn hiện "Hết hạn" dù từng được duyệt', async () => {
    serve({ list: [evidence({ approval_status: 'approved', expires_at: '2020-01-01' })] });
    renderManager();
    expect(await screen.findByRole('listitem', { name: /ISO 9001/ })).toHaveTextContent('Hết hạn');
  });

  it('báo số bằng chứng cho nơi gọi', async () => {
    serve({ list: [evidence({}), evidence({ id: 'e-2' })] });
    const onCount = vi.fn();
    renderManager({ onCount });
    await waitFor(() => expect(onCount).toHaveBeenLastCalledWith(2));
  });

  it('chỉ cho chọn loại lấy từ server', async () => {
    serve();
    renderManager();
    const select = await screen.findByLabelText(/Loại bằng chứng/);
    const options = [...select.querySelectorAll('option')].map((o) => (o as HTMLOptionElement).value);
    expect(options).toEqual(['', 'iso_9001', 'eur1_issued']);
  });

  it('B9: form chỉ có loại và file — không hỏi số, tổ chức cấp, ngày cấp, ngày hết hạn', async () => {
    serve();
    renderManager();
    await screen.findByLabelText(/Loại bằng chứng/);
    fireEvent.change(screen.getByLabelText(/Loại bằng chứng/), { target: { value: 'eur1_issued' } });
    expect(screen.getByLabelText(/File bằng chứng/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Số chứng chỉ/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Tổ chức cấp/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Ngày cấp/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Ngày hết hạn/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thông tin thêm/ })).not.toBeInTheDocument();
  });

  it('nộp thành công: tải file lên, gửi khóa file, làm mới danh sách và xóa form', async () => {
    serve();
    const onCount = vi.fn();
    renderManager({ onCount });
    await fillForm();
    submit();
    expect(await screen.findByRole('listitem', { name: /ISO 9001/ })).toBeInTheDocument();
    const post = calls.find((c) => c.method === 'POST' && c.path === '/api/exporter/evidences');
    expect(post?.body).toEqual({
      type_code: 'iso_9001',
      file_key: 'evidence/c-1/abc.pdf',
      certificate_number: null,
      issuer: null,
      issued_at: null,
      expires_at: null,
      custom_type_name: null,
    });
    expect(calls.some((c) => c.method === 'PUT' && c.path === '/upload')).toBe(true);
    // Nộp xong form được xóa.
    expect((screen.getByLabelText(/Loại bằng chứng/) as HTMLSelectElement).value).toBe('');
    expect(onCount).toHaveBeenLastCalledWith(1);
  });

  it('U4: chỉ loại + file là đủ, số/tổ chức/ngày gửi null', async () => {
    serve();
    renderManager();
    fireEvent.change(await screen.findByLabelText(/Loại bằng chứng/), { target: { value: 'iso_9001' } });
    await chooseFile();
    submit();
    await screen.findByRole('listitem', { name: /ISO 9001/ });
    expect(calls.find((c) => c.method === 'POST' && c.path === '/api/exporter/evidences')?.body).toMatchObject({
      issued_at: null,
      expires_at: null,
      certificate_number: null,
    });
  });

  it.each([
    ['chưa chọn loại', { type: '' }, 'Vui lòng chọn loại bằng chứng'],
    ['chưa chọn file', { file: null }, 'Vui lòng chọn file'],
  ])('%s: báo lỗi và không gọi server', async (_name, opts, message) => {
    serve();
    renderManager();
    await fillForm(opts as Parameters<typeof fillForm>[0]);
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(calls.filter((c) => c.method === 'POST' && c.path === '/api/exporter/evidences')).toEqual([]);
  });

  it.each([
    ['file sai định dạng', new File(['x'], 'a.zip', { type: 'application/zip' }), 'File phải là PDF, PNG hoặc JPEG'],
    ['file quá lớn', pdf('to.pdf', 10 * 1024 * 1024 + 1), 'File tối đa 10MB'],
  ])('%s: báo lỗi trước khi tải lên', async (_name, file, message) => {
    serve();
    renderManager();
    await fillForm({ file });
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(calls.filter((c) => c.path === '/api/uploads/presign')).toEqual([]);
  });

  it('tải file lỗi: báo lỗi, không nộp bằng chứng', async () => {
    serve({ put: () => new Response(null, { status: 500 }) });
    renderManager();
    await fillForm();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được file lên');
    expect(calls.filter((c) => c.method === 'POST' && c.path === '/api/exporter/evidences')).toEqual([]);
  });

  it('server từ chối (422): báo lỗi, giữ nguyên dữ liệu form', async () => {
    serve({ create: () => json(422, { error: { code: 'invalid_dates' } }) });
    renderManager();
    await fillForm();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Bằng chứng chưa hợp lệ');
    expect((screen.getByLabelText(/Loại bằng chứng/) as HTMLSelectElement).value).toBe('iso_9001');
  });

  it('xóa bằng chứng: gọi DELETE và bỏ dòng khỏi danh sách', async () => {
    serve({ list: [evidence({})] });
    renderManager();
    const row = await screen.findByRole('listitem', { name: /ISO 9001/ });
    fireEvent.click(within(row).getByRole('button', { name: /Xóa/ }));
    await waitFor(() => expect(screen.queryByRole('listitem', { name: /ISO 9001/ })).not.toBeInTheDocument());
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/exporter/evidences/e-1')).toBe(true);
  });

  it('có chú thích: bằng chứng do quản trị viên duyệt, không phải kết quả xác minh', async () => {
    serve();
    renderManager();
    expect(await screen.findByText(/không phải kết quả xác minh/)).toBeInTheDocument();
  });

  it('bản tiếng Anh dùng nhãn tiếng Anh', async () => {
    serve();
    renderManager({ locale: 'en' });
    expect(await screen.findByRole('button', { name: 'Submit evidence' })).toBeInTheDocument();
  });

  // ── Đọc file ngay khi chọn: điền sẵn loại, số, tổ chức cấp, ngày để seller kiểm tra và sửa ──────────
  it('chọn file: tải lên rồi đọc thử, điền sẵn loại giấy tờ, số, tổ chức cấp và ngày', async () => {
    serve({ preview: READ });
    renderManager();
    await screen.findByLabelText(/Loại bằng chứng/);
    await chooseFile();
    expect((screen.getByLabelText(/Loại bằng chứng/) as HTMLSelectElement).value).toBe('iso_9001');
    expect(screen.getByLabelText(/Số chứng chỉ/)).toHaveValue('VN-ISO-2026-001');
    expect(screen.getByLabelText(/Tổ chức cấp/)).toHaveValue('SGS Vietnam');
    expect(screen.getByLabelText(/Ngày cấp/)).toHaveValue('2026-03-01');
    expect(screen.getByLabelText(/Ngày hết hạn/)).toHaveValue('2029-02-28');
    expect(screen.getByTestId('read-fields')).toHaveTextContent('Gợi ý từ giấy tờ, hãy kiểm tra trước khi nộp');
    const preview = calls.find((c) => c.path === '/api/exporter/evidences/extract-preview');
    expect(preview?.body).toEqual({ file_key: 'evidence/c-1/abc.pdf' });
  });

  it('seller sửa giá trị đã điền rồi nộp: gửi giá trị đã sửa, dùng lại file đã tải (không tải lần hai)', async () => {
    serve({ preview: READ });
    renderManager();
    await screen.findByLabelText(/Loại bằng chứng/);
    await chooseFile();
    fireEvent.change(screen.getByLabelText(/Số chứng chỉ/), { target: { value: 'VN-ISO-2026-999' } });
    fireEvent.change(screen.getByLabelText(/Tổ chức cấp/), { target: { value: '' } });
    submit();
    await screen.findByRole('listitem', { name: /ISO 9001/ });
    const post = calls.find((c) => c.method === 'POST' && c.path === '/api/exporter/evidences');
    expect(post?.body).toEqual({
      type_code: 'iso_9001',
      file_key: 'evidence/c-1/abc.pdf',
      certificate_number: 'VN-ISO-2026-999',
      issuer: null,
      issued_at: '2026-03-01',
      expires_at: '2029-02-28',
      custom_type_name: null,
    });
    expect(calls.filter((c) => c.path === '/api/uploads/presign')).toHaveLength(1);
    expect(calls.filter((c) => c.method === 'PUT' && c.path === '/upload')).toHaveLength(1);
    // Nộp xong: form và các ô đọc được đều được xóa.
    expect(screen.queryByTestId('read-fields')).not.toBeInTheDocument();
  });

  it('không ghi đè loại giấy tờ seller đã tự chọn', async () => {
    serve({ preview: READ });
    renderManager();
    fireEvent.change(await screen.findByLabelText(/Loại bằng chứng/), { target: { value: 'eur1_issued' } });
    await chooseFile();
    expect((screen.getByLabelText(/Loại bằng chứng/) as HTMLSelectElement).value).toBe('eur1_issued');
    expect(screen.getByLabelText(/Số chứng chỉ/)).toHaveValue('VN-ISO-2026-001');
  });

  it('loại không có trong danh mục đã duyệt thì không điền; các trường khác vẫn điền', async () => {
    serve({ preview: { ...READ, fields: { ...READ.fields, type_code: 'halal' } } });
    renderManager();
    await screen.findByLabelText(/Loại bằng chứng/);
    await chooseFile();
    expect((screen.getByLabelText(/Loại bằng chứng/) as HTMLSelectElement).value).toBe('');
    expect(screen.getByLabelText(/Số chứng chỉ/)).toHaveValue('VN-ISO-2026-001');
  });

  it('loại có hạn tự tính: không hỏi ngày hết hạn, không gửi ngày hết hạn đọc được', async () => {
    serve({ preview: { ...READ, fields: { ...READ.fields, type_code: 'eur1_issued' } } });
    renderManager();
    await screen.findByLabelText(/Loại bằng chứng/);
    await chooseFile();
    expect(screen.queryByLabelText(/Ngày hết hạn/)).not.toBeInTheDocument();
    expect(screen.getByText(/tự tính 12 tháng/)).toBeInTheDocument();
    submit();
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/api/exporter/evidences')).toBe(true));
    expect(calls.find((c) => c.method === 'POST' && c.path === '/api/exporter/evidences')?.body).toMatchObject({
      type_code: 'eur1_issued',
      issued_at: '2026-03-01',
      expires_at: null,
    });
  });

  it('đọc không ra gì: giải thích, ẩn các ô, vẫn chọn loại và nộp tay được', async () => {
    serve();
    renderManager();
    await screen.findByLabelText(/Loại bằng chứng/);
    await chooseFile();
    expect(screen.getByTestId('read-none')).toHaveTextContent('Chưa đọc được thông tin từ file');
    expect(screen.queryByTestId('read-fields')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Loại bằng chứng/), { target: { value: 'iso_9001' } });
    submit();
    await screen.findByRole('listitem', { name: /ISO 9001/ });
  });

  it('ảnh hoặc bản scan (skipped): nói rõ chưa đọc tự động được', async () => {
    serve({ preview: { status: 'skipped', method: null, fields: {}, error: 'scanned_document_needs_vision' } });
    renderManager();
    await screen.findByLabelText(/Loại bằng chứng/);
    await chooseFile(new File(['x'], 'scan.png', { type: 'image/png' }));
    expect(screen.getByTestId('read-none')).toHaveTextContent('ảnh hoặc bản scan');
  });

  it('nút Nộp bị khoá khi đang đọc file', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    serve({ preview: READ });
    const original = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn(async (req: Request) => {
      if (new URL(req.url).pathname === '/api/exporter/evidences/extract-preview') await gate;
      return (original as typeof fetch)(req);
    }));
    renderManager();
    await screen.findByLabelText(/Loại bằng chứng/);
    fireEvent.change(screen.getByLabelText(/File bằng chứng/), { target: { files: [pdf()] } });
    expect(await screen.findByText('Đang đọc giấy tờ…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nộp bằng chứng' })).toBeDisabled();
    release();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nộp bằng chứng' })).toBeEnabled());
  });

  it('đổi sang file khác: đọc lại và xóa các ô của file trước', async () => {
    serve({ preview: READ });
    renderManager();
    await screen.findByLabelText(/Loại bằng chứng/);
    await chooseFile();
    expect(screen.getByLabelText(/Số chứng chỉ/)).toHaveValue('VN-ISO-2026-001');
    serve();
    await chooseFile(pdf('khac.pdf'));
    expect(screen.queryByTestId('read-fields')).not.toBeInTheDocument();
    expect(screen.getByTestId('read-none')).toBeInTheDocument();
  });

  it('ngày cấp ở tương lai (do đọc nhầm hoặc nhập sai): báo lỗi và không gọi server', async () => {
    serve({ preview: { ...READ, fields: { ...READ.fields, issued_at: '2999-01-01', expires_at: null } } });
    renderManager();
    await screen.findByLabelText(/Loại bằng chứng/);
    await chooseFile();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Ngày cấp không được ở tương lai');
    expect(calls.filter((c) => c.method === 'POST' && c.path === '/api/exporter/evidences')).toEqual([]);
  });

});
