import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminVerificationQueue from '@/components/AdminVerificationQueue';
import { LanguageProvider } from '@/context/LanguageContext';
import { mailtoLink } from '@/lib/adminApi';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/admin',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const SGS = {
  id: 'b-1',
  name: 'SGS Vietnam',
  official_domain: 'sgs.com',
  contact_email: 'certcheck@sgs.com',
  lookup_url: 'https://www.sgs.com/certified-clients',
  accreditation_body: 'UKAS',
  iaf_mla: true,
  reviewed_by: 'u-9',
  reviewed_at: '2026-09-30T00:00:00Z',
};
const UNREVIEWED = { ...SGS, id: 'b-2', name: 'Chưa duyệt Co', reviewed_by: null, reviewed_at: null };

const evidence = {
  id: 'e-1',
  type_code: 'iso_9001',
  type_name_vi: 'ISO 9001',
  type_name_en: 'ISO 9001',
  certificate_number: 'VN-123',
  issuer: 'SGS',
  issued_at: '2026-01-01',
  expires_at: '2029-01-01',
  approval_status: 'pending',
  reject_reason: null,
  file_url: 'https://fake/evidence/c-1/a.pdf',
};

const check = (over: Record<string, unknown> = {}) => ({
  id: 'k-1',
  evidence_id: 'e-1',
  check_type: 'registry_lookup',
  result: 'match',
  source: 'https://www.iafcertsearch.org/',
  certification_body_id: null,
  facts: null,
  note: null,
  checked_by: 'u-1',
  checked_at: '2026-09-30T02:00:00Z',
  snapshot_url: 'https://fake/checks/c-1/a.png',
  ...over,
});

const item = (over: Record<string, unknown> = {}) => ({
  request_id: 'r-1',
  company_id: 'c-1',
  legal_name: 'Công ty A',
  tax_id: '0314892345',
  country: 'VN',
  submitted_at: '2026-09-29T08:00:00Z',
  evidences: [evidence],
  checks: [],
  signals: [],
  ownership_proven: true,
  ...over,
});

let calls: { method: string; path: string; search: string; body?: unknown }[] = [];

function serve(world: { queue?: unknown[]; review?: Response } = {}) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      const body = req.method === 'POST' ? await req.clone().json().catch(() => undefined) : undefined;
      calls.push({ method: req.method, path: url.pathname, search: url.search, body });
      if (url.pathname === '/api/admin/verification-queue') return json(200, world.queue ?? [item()]);
      if (url.pathname === '/api/admin/certification-bodies') return json(200, [SGS, UNREVIEWED]);
      if (url.pathname === '/api/public/suppliers/filters') return json(200, { categories: ['agriculture', 'seafood'], certificates: [] });
      if (url.pathname.endsWith('/check-snapshots')) return json(201, { upload_url: 'https://storage.test/put', key: 'checks/c-1/snap.png' });
      if (req.method === 'PUT') return new Response(null, { status: 200 });
      if (url.pathname.endsWith('/issuer-email')) {
        return json(200, { to: 'certcheck@sgs.com', subject: 'Xác nhận / Certificate verification — VN-123', body: 'Kính gửi SGS' });
      }
      if (url.pathname.endsWith('/review')) return world.review ?? json(200, {});
      if (req.method === 'POST') return json(201, {});
      throw new Error(`unexpected ${req.method} ${url.pathname}`);
    }),
  );
}

function wrap(node: React.ReactNode) {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>{node}</LanguageProvider>
    </NextIntlClientProvider>,
  );
}

async function crossCheckPanel() {
  const summary = await screen.findByText(/^Kiểm chéo/);
  return summary.closest('details') as HTMLElement;
}

describe('Kiểm chéo bằng chứng (I8)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('hiện lịch sử kiểm, ảnh chụp, từng quy tắc so khớp và cờ bằng chứng lệch', async () => {
    serve({
      queue: [
        item({
          signals: [{ code: 'evidence_mismatch', severity: 'high' }],
          checks: [
            check({
              id: 'k-2',
              check_type: 'internal_consistency',
              result: 'mismatch',
              source: 'internal_rules',
              snapshot_url: null,
              facts: { findings: [{ rule: 'name', result: 'mismatch' }, { rule: 'scope', result: 'match' }] },
            }),
            check(),
          ],
        }),
      ],
    });
    wrap(<AdminVerificationQueue />);
    const panel = await crossCheckPanel();
    expect(panel).toHaveTextContent('Kiểm chéo (2)');
    const history = within(panel).getByRole('list', { name: 'Kết quả kiểm' });
    expect(history).toHaveTextContent('So khớp nội bộ');
    expect(history).toHaveTextContent('Tên đơn vị: Không khớp');
    expect(history).toHaveTextContent('Phạm vi nhóm hàng: Khớp');
    expect(within(history).getByRole('link', { name: 'Xem ảnh chụp' })).toHaveAttribute('href', 'https://fake/checks/c-1/a.png');
    expect(screen.getByRole('list', { name: 'Cờ danh tính' })).toHaveTextContent('Bằng chứng có kết quả kiểm lệch');
  });

  it('chỉ tổ chức cấp đã duyệt mới hiện để chọn; chọn thì điền sẵn trang tra cứu', async () => {
    serve();
    wrap(<AdminVerificationQueue />);
    const panel = await crossCheckPanel();
    const select = within(panel).getByLabelText('Tổ chức cấp');
    await waitFor(() => expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Chưa chọn', 'SGS Vietnam']));
    expect(within(panel).getByLabelText('Nguồn')).toHaveValue('https://www.iafcertsearch.org/');
    fireEvent.change(select, { target: { value: 'b-1' } });
    expect(within(panel).getByLabelText('Nguồn')).toHaveValue('https://www.sgs.com/certified-clients');
  });

  it('ghi kiểm chéo: tải ảnh chụp lên rồi gửi nguồn, kết quả, tổ chức cấp', async () => {
    serve();
    wrap(<AdminVerificationQueue />);
    const panel = await crossCheckPanel();
    await waitFor(() => expect(within(panel).getAllByRole('option', { name: 'SGS Vietnam' })).toHaveLength(1));
    fireEvent.change(within(panel).getByLabelText('Cách kiểm'), { target: { value: 'issuer_email' } });
    fireEvent.change(within(panel).getByLabelText('Tổ chức cấp'), { target: { value: 'b-1' } });
    fireEvent.change(within(panel).getByLabelText('Ảnh chụp kết quả'), {
      target: { files: [new File(['pdf'], 'reply.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.click(within(panel).getByRole('button', { name: 'Ghi kiểm chéo' }));
    await waitFor(() =>
      expect(calls.find((c) => c.path === '/api/admin/evidences/e-1/checks')?.body).toEqual({
        check_type: 'issuer_email',
        result: 'match',
        source: 'https://www.sgs.com/certified-clients',
        snapshot_key: 'checks/c-1/snap.png',
        certification_body_id: 'b-1',
        note: null,
      }),
    );
    expect(calls.find((c) => c.path.endsWith('/check-snapshots'))?.path).toBe('/api/admin/companies/c-1/check-snapshots');
    expect(calls.some((c) => c.method === 'PUT')).toBe(true);
  });

  it('thiếu ảnh chụp thì không gửi', async () => {
    serve();
    wrap(<AdminVerificationQueue />);
    const panel = await crossCheckPanel();
    fireEvent.click(within(panel).getByRole('button', { name: 'Ghi kiểm chéo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng chọn ảnh chụp kết quả tra cứu.');
    expect(calls.some((c) => c.path === '/api/admin/evidences/e-1/checks')).toBe(false);
  });

  it('soạn email xác nhận hỏi bản nháp theo tổ chức cấp đã chọn', async () => {
    serve();
    const location = { href: '' };
    vi.stubGlobal('location', location);
    wrap(<AdminVerificationQueue />);
    const panel = await crossCheckPanel();
    const compose = within(panel).getByRole('button', { name: 'Soạn email xác nhận' });
    expect(compose).toBeDisabled(); // chưa chọn tổ chức cấp
    await waitFor(() => expect(within(panel).getAllByRole('option', { name: 'SGS Vietnam' })).toHaveLength(1));
    fireEvent.change(within(panel).getByLabelText('Tổ chức cấp'), { target: { value: 'b-1' } });
    fireEvent.click(compose);
    await waitFor(() =>
      expect(calls.find((c) => c.path === '/api/admin/evidences/e-1/issuer-email')?.search).toBe('?body_id=b-1'),
    );
  });

  it('mailto dùng đúng địa chỉ của tổ chức cấp', () => {
    const link = mailtoLink({ to: 'certcheck@sgs.com', subject: 'Xác nhận VN-123', body: 'Kính gửi' });
    expect(link.startsWith('mailto:certcheck%40sgs.com?subject=')).toBe(true);
    expect(decodeURIComponent(link)).toContain('Xác nhận VN-123');
  });

  it('so khớp nội bộ gửi tên, địa chỉ và phạm vi nhóm hàng đã chọn', async () => {
    serve();
    wrap(<AdminVerificationQueue />);
    const panel = await crossCheckPanel();
    fireEvent.change(within(panel).getByLabelText('Tên đơn vị trên chứng nhận'), { target: { value: 'Nong San Viet Co., Ltd' } });
    const scope = await within(panel).findByRole('group', { name: 'Phạm vi nhóm hàng' });
    fireEvent.click(within(scope).getByLabelText('agriculture'));
    fireEvent.click(within(panel).getByRole('button', { name: 'So khớp' }));
    await waitFor(() =>
      expect(calls.find((c) => c.path === '/api/admin/evidences/e-1/consistency')?.body).toEqual({
        holder_name: 'Nong San Viet Co., Ltd',
        holder_address: null,
        scope_categories: ['agriculture'],
      }),
    );
  });

  it('duyệt bằng chứng khi chưa kiểm chéo: báo cần kiểm chéo trước', async () => {
    serve({ review: json(409, { error: { code: 'cross_check_required', message: 'x' } }) });
    wrap(<AdminVerificationQueue />);
    fireEvent.click(await screen.findByRole('button', { name: 'Duyệt bằng chứng' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cần ít nhất một lần kiểm chéo có nguồn và ảnh chụp trước khi duyệt.');
  });
});
