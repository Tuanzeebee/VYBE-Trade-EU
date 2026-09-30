import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminAi from '@/components/AdminAi';
import AdminConsole from '@/components/AdminConsole';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/admin',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const query = (over: Record<string, unknown> = {}) => ({
  id: 'q-1',
  user_id: null,
  company_id: null,
  question: 'Gạo ST25 có hạn ngạch không?',
  language: 'vi',
  hs_code: null,
  answer: null,
  confidence: 'low',
  self_assessment: null,
  error: null,
  citation_ids: [],
  latency_ms: 10,
  created_at: '2026-09-29T00:00:00Z',
  was_helpful: null,
  escalated: false,
  ...over,
});

const doc = (over: Record<string, unknown> = {}) => ({
  id: 'd-1',
  title: 'Nghị định EVFTA',
  source: 'Bộ Công Thương',
  source_url: null,
  doc_type: 'law',
  language: 'vi',
  hs_codes: [],
  reviewed_by: null,
  reviewed_at: null,
  ingested_at: '2026-09-29T00:00:00Z',
  chunk_count: 4,
  ...over,
});

interface World {
  queries?: unknown[];
  sample?: unknown[];
  docs?: unknown[];
  fail?: boolean;
}
let calls: { method: string; path: string; search: string }[] = [];

function serve(world: World = {}) {
  calls = [];
  const docs = world.docs ?? [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      calls.push({ method: req.method, path: url.pathname, search: url.search });
      if (world.fail) return json(500, { detail: 'x' });
      if (url.pathname === '/api/admin/ai-queries') return json(200, world.queries ?? []);
      if (url.pathname === '/api/admin/ai-queries/weekly-sample') return json(200, world.sample ?? []);
      if (url.pathname === '/api/admin/corpus-documents') return json(200, docs);
      if (url.pathname.endsWith('/review')) {
        (docs[0] as Record<string, unknown>).reviewed_by = 'a-1';
        return json(200, docs[0]);
      }
      return json(200, {});
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

describe('Tab trợ lý AI của quản trị (D3, I5)', () => {
  it('mặc định liệt kê câu hỏi tin cậy thấp và đổi mức lọc gọi lại API', async () => {
    serve({ queries: [query({ was_helpful: false, escalated: true })] });
    wrap(<AdminAi />);
    expect(await screen.findByText('Gạo ST25 có hạn ngạch không?')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/api/admin/ai-queries')?.search).toContain('confidence=low');
    expect(screen.getByText(/Chưa hữu ích/)).toBeInTheDocument();
    expect(screen.getByText(/Đã chuyển chuyên gia/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Mức tin cậy'), { target: { value: 'out_of_scope' } });
    await waitFor(() => expect(calls.filter((c) => c.path === '/api/admin/ai-queries').at(-1)?.search).toContain('confidence=out_of_scope'));
  });

  it('có mẫu tuần và trạng thái rỗng có hướng dẫn', async () => {
    serve({ sample: [query({ id: 'q-2', question: 'Mẫu tuần này', confidence: 'high' })] });
    wrap(<AdminAi />);
    expect(await screen.findByText('Mẫu tuần này')).toBeInTheDocument();
    expect(screen.getByText('Chưa có câu hỏi nào ở mức tin cậy này.')).toBeInTheDocument();
    expect(screen.getByText(/Chưa có tài liệu/)).toBeInTheDocument();
  });

  it('duyệt tài liệu corpus rồi tải lại danh sách', async () => {
    serve({ docs: [doc()] });
    wrap(<AdminAi />);
    fireEvent.click(await screen.findByRole('button', { name: 'Duyệt Nghị định EVFTA' }));
    expect(await screen.findByText('Đã duyệt')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST' && c.path === '/api/admin/corpus-documents/d-1/review')).toBe(true);
    expect(screen.queryByRole('button', { name: /Duyệt/ })).toBeNull();
  });

  it('lỗi tải hiện báo lỗi, không giả làm rỗng', async () => {
    serve({ fail: true });
    wrap(<AdminAi />);
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(3));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('console quản trị có tab Trợ lý AI', async () => {
    serve();
    wrap(<AdminConsole />);
    fireEvent.click(screen.getByRole('tab', { name: 'Trợ lý AI' }));
    expect(await screen.findByLabelText('Mức tin cậy')).toBeInTheDocument();
  });
});
