// Checklist bằng chứng cấp công ty + huy hiệu, và hàng đợi luật sư của admin (SPEC §5.4, §6.3).
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminReviewIssues from '@/components/AdminReviewIssues';
import CompanyEvidenceChecklist from '@/components/CompanyEvidenceChecklist';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const wrap = (node: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>{node}</LanguageProvider>
    </NextIntlClientProvider>,
  );

const SHRIMP = {
  code: '03061792',
  formatted: '0306.17.92',
  name_vi: 'Tôm chi Penaeus đông lạnh',
  name_en: 'Frozen Penaeus shrimps',
  chapter: '03',
  category: 'seafood',
  supported: true,
};

const CHECKLIST = (over: Record<string, unknown> = {}) => ({
  hs_code: '03061792',
  hs_formatted: '0306.17.92',
  category: 'seafood',
  items: [
    { code: 'EU_ESTABLISHMENT_LISTING', name_vi: 'Cơ sở có tên trong danh sách EU', name_en: null, blocks: 'IMPORT', legal_status: 'TO_VERIFY', verification_type_code: 'eu_establishment_listing', state: 'missing', review_state: 'UNREVIEWED' },
    { code: 'EUR1_ISSUED_12M', name_vi: 'EUR.1 đã cấp trong 12 tháng', name_en: null, blocks: 'NONE', legal_status: 'PLATFORM_RULE', verification_type_code: 'eur1_issued', state: 'approved', review_state: 'UNREVIEWED' },
  ],
  badge: { category: 'seafood', granted: false, text_vi: null, text_en: null, reason: 'MISSING_EVIDENCE', missing: ['EU_ESTABLISHMENT_LISTING'] },
  review_state: 'UNREVIEWED',
  unreviewed_components: ['evidence_requirement'],
  disclaimer: 'x',
  ...over,
});

let checklistCalls: string[] = [];

function serveChecklist(body: unknown, company: unknown = { id: 'co-1' }) {
  checklistCalls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      if (url.pathname === '/api/me/company') return company ? json(200, company) : json(404, {});
      if (url.pathname === '/api/public/hs-codes') return json(200, [SHRIMP]);
      if (url.pathname === '/api/companies/co-1/evidence-checklist') {
        checklistCalls.push(url.search);
        return json(200, body);
      }
      throw new Error(`unexpected ${url.pathname}`);
    }),
  );
}

async function pick() {
  fireEvent.change(screen.getByRole('combobox', { name: /Sản phẩm/ }), { target: { value: 'tom' } });
  fireEvent.click(await screen.findByRole('option', { name: /0306/ }));
}

describe('CompanyEvidenceChecklist', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('chưa có huy hiệu: nêu lý do, liệt kê bằng chứng theo trạng thái, kèm lưu ý chưa duyệt', async () => {
    serveChecklist(CHECKLIST());
    wrap(<CompanyEvidenceChecklist />);
    await pick();
    const box = await screen.findByTestId('company-checklist');
    expect(within(box).getByText('Chưa có huy hiệu cho nhóm hàng này')).toBeInTheDocument();
    expect(within(box).getByText('Còn thiếu bằng chứng bắt buộc được duyệt và còn hạn.')).toBeInTheDocument();
    expect(within(box).getByText('Chưa nộp')).toBeInTheDocument();
    expect(within(box).getByText('Đã duyệt, còn hạn')).toBeInTheDocument();
    expect(within(box).getByTestId('unreviewed-notice')).toBeInTheDocument();
    expect(checklistCalls).toEqual(['?hs=03061792']);
  });

  it('đã có huy hiệu: dùng đúng câu về C/O EUR.1 đã cấp, không nói "hàng đạt xuất xứ"', async () => {
    const text = 'Đã được cấp C/O EUR.1 cho nhóm hàng này trong 12 tháng gần nhất';
    serveChecklist(
      CHECKLIST({
        badge: { category: 'seafood', granted: true, text_vi: text, text_en: 'x', reason: null, missing: [] },
        review_state: 'REVIEWED',
        unreviewed_components: [],
        disclaimer: null,
      }),
    );
    wrap(<CompanyEvidenceChecklist />);
    await pick();
    const badge = await screen.findByTestId('badge');
    expect(badge).toHaveTextContent(text);
    expect(badge).not.toHaveTextContent(/đạt xuất xứ/);
    expect(screen.queryByTestId('unreviewed-notice')).not.toBeInTheDocument();
  });

  it('người dùng không có công ty thì không hiện panel', async () => {
    serveChecklist(CHECKLIST(), null);
    const { container } = wrap(<CompanyEvidenceChecklist />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});

describe('AdminReviewIssues', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const ISSUE = {
    id: 'i-1',
    entity_type: 'compliance_evidence_requirement',
    entity_id: 'r-1',
    label: '03061792 · EUR1 · CONSIGNMENT_GT_6000',
    note: 'Điều 15.2(a): cần dẫn chiếu thêm',
    created_by: 'u-1',
    created_at: '2026-10-02T10:00:00Z',
    resolved_at: null,
  };

  it('hiện dòng luật sư trả SUA kèm ghi chú; bấm Đã xử lý thì gọi API và tải lại', async () => {
    let open = [ISSUE];
    const resolve = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (req: Request) => {
        const url = new URL(req.url);
        if (url.pathname === '/api/admin/compliance-review-issues') return json(200, open);
        if (url.pathname === '/api/admin/compliance-review-issues/i-1/resolve') {
          resolve(req.method);
          open = [];
          return json(200, { ...ISSUE, resolved_at: '2026-10-02T11:00:00Z' });
        }
        throw new Error(`unexpected ${url.pathname}`);
      }),
    );
    wrap(<AdminReviewIssues />);
    expect(await screen.findByText('Điều 15.2(a): cần dẫn chiếu thêm')).toBeInTheDocument();
    expect(screen.getByText('03061792 · EUR1 · CONSIGNMENT_GT_6000')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đã xử lý' }));
    await waitFor(() => expect(resolve).toHaveBeenCalledWith('POST'));
    expect(await screen.findByTestId('issues-empty')).toBeInTheDocument();
  });

  it('hàng đợi rỗng: có hướng dẫn, không để trống', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(200, [])));
    wrap(<AdminReviewIssues />);
    expect(await screen.findByTestId('issues-empty')).toHaveTextContent(/SUA/);
  });

  it('không tải được: báo lỗi, không giả vờ rỗng', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(500, {})));
    wrap(<AdminReviewIssues />);
    expect(await screen.findByTestId('issues-error')).toBeInTheDocument();
    expect(screen.queryByTestId('issues-empty')).not.toBeInTheDocument();
  });
});
