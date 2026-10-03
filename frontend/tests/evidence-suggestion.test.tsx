import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminExtractionCompare, EvidenceSuggestion } from '@/components/EvidenceSuggestion';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter/certificates',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const READY = {
  evidence_id: 'e-1',
  status: 'ready',
  method: 'text',
  model: 'fake-chat',
  fields: {
    type_code: 'haccp',
    certificate_number: 'VN-HACCP-2026-00123',
    issuer: 'Bureau Veritas',
    issued_at: '2026-03-01',
    expires_at: null,
    holder_name: 'Nong San Viet',
    holder_address: null,
  },
  error: null,
  finished_at: '2026-10-04T09:00:00Z',
  applied_at: null,
  comparison: [
    { field: 'certificate_number', declared: 'VN-HACCP-2026-00123', extracted: 'VN-HACCP-2026-00123', match: true },
    { field: 'issuer', declared: 'SGS', extracted: 'Bureau Veritas', match: false },
  ],
};

let posts: unknown[] = [];
function serve(body: unknown, status = 200) {
  posts = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      if (req.method === 'POST') {
        posts.push(JSON.parse(await req.text()));
        return json(200, {});
      }
      return json(status, body);
    }),
  );
}

const wrap = (ui: React.ReactElement) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>{ui}</LanguageProvider>
    </NextIntlClientProvider>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('AI đọc chứng nhận (U24)', () => {
  it('seller xem gợi ý, bỏ chọn một trường rồi áp — chỉ gửi trường đã chọn', async () => {
    serve(READY);
    const applied = vi.fn();
    wrap(<EvidenceSuggestion evidenceId="e-1" onApplied={applied} />);
    fireEvent.click(screen.getByRole('button', { name: 'Xem gợi ý từ AI' }));
    const group = await screen.findByRole('group', { name: 'Gợi ý từ AI' });
    expect(group).toHaveTextContent('Số chứng chỉ:VN-HACCP-2026-00123');
    expect(group).toHaveTextContent('Đơn vị được cấp:Nong San Viet');
    fireEvent.click(within(group).getByRole('checkbox', { name: 'Tổ chức cấp' }));
    fireEvent.click(within(group).getByRole('button', { name: 'Áp gợi ý đã chọn' }));
    expect(await within(group).findByRole('status')).toHaveTextContent('Bằng chứng sẽ được duyệt lại.');
    expect(posts).toEqual([{ fields: ['certificate_number', 'issued_at'] }]);
    expect(applied).toHaveBeenCalled();
  });

  it('bản scan chưa đọc được: báo rõ, không có nút áp', async () => {
    serve({ ...READY, status: 'skipped', fields: {}, comparison: [] });
    wrap(<EvidenceSuggestion evidenceId="e-1" onApplied={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Xem gợi ý từ AI' }));
    expect(await screen.findByText(/Bản scan \(ảnh\) chưa đọc tự động được/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Áp gợi ý đã chọn' })).toBeNull();
  });

  it('admin thấy bảng so sánh: khớp / lệch từng trường', async () => {
    serve(READY);
    wrap(<AdminExtractionCompare evidenceId="e-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'So sánh với AI đọc giấy tờ' }));
    const table = await screen.findByRole('table', { name: 'So sánh với AI đọc giấy tờ' });
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Số chứng chỉVN-HACCP-2026-00123VN-HACCP-2026-00123Khớp');
    expect(rows[2]).toHaveTextContent('Tổ chức cấpSGSBureau VeritasLệch');
  });
});
