import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CopilotChat from '@/components/CopilotChat';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/copilot',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const ANSWER = (over: Record<string, unknown> = {}) => ({
  query_id: 'q-1',
  answer: 'Gạo thơm chịu hạn ngạch [1].',
  confidence: 'high',
  citations: [{ chunk_id: 'k-1', title: 'Phụ lục 2-A', source: 'EVFTA', source_url: 'https://example.eu/evfta', heading: 'Điều 1' }],
  can_escalate: false,
  ...over,
});

let calls: { path: string; body: unknown }[] = [];
function serve(ask: () => Response, escalateStatus = 201) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      const text = await req.text();
      calls.push({ path, body: text ? JSON.parse(text) : null });
      if (path === '/api/public/copilot/ask') return ask();
      if (path.endsWith('/feedback')) return new Response(null, { status: 204 });
      if (path.endsWith('/escalate')) {
        return json(escalateStatus, escalateStatus === 201 ? { ticket_id: 't-1', status: 'open' } : { detail: 'x' });
      }
      return json(200, []);
    }),
  );
}

function setup() {
  return render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <CopilotChat />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

function ask(question = 'Gạo thơm có hạn ngạch không?') {
  fireEvent.change(screen.getByLabelText('Câu hỏi của bạn'), { target: { value: question } });
  fireEvent.click(screen.getByRole('button', { name: 'Hỏi trợ lý' }));
}

afterEach(() => vi.unstubAllGlobals());

describe('CopilotChat (D2, D3)', () => {
  it('hiện câu trả lời kèm trích dẫn có liên kết và mức tin cậy', async () => {
    serve(() => json(200, ANSWER()));
    setup();
    ask();
    expect(await screen.findByText('Độ tin cậy cao')).toBeTruthy();
    expect(screen.getByText(/Gạo thơm chịu hạn ngạch/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'EVFTA' }).getAttribute('href')).toBe('https://example.eu/evfta');
    expect(calls[0].body).toMatchObject({ question: 'Gạo thơm có hạn ngạch không?', language: 'vi' });
    expect(screen.queryByRole('button', { name: 'Chuyển chuyên gia' })).toBeNull();
  });

  it('ngoài phạm vi: không hiện câu trả lời, có nút chuyển chuyên gia', async () => {
    serve(() => json(200, ANSWER({ confidence: 'out_of_scope', answer: 'BỊA', citations: [], can_escalate: true })));
    setup();
    ask();
    expect(await screen.findByText('Ngoài phạm vi')).toBeTruthy();
    expect(screen.queryByText('BỊA')).toBeNull();
    expect(screen.getByRole('button', { name: 'Chuyển chuyên gia' })).toBeTruthy();
  });

  it('chuyển chuyên gia gửi email; thiếu email thì báo lỗi', async () => {
    serve(() => json(200, ANSWER({ confidence: 'low', can_escalate: true })), 422);
    setup();
    ask();
    fireEvent.click(await screen.findByRole('button', { name: 'Chuyển chuyên gia' }));
    expect((await screen.findByRole('alert')).textContent).toContain('email hợp lệ');
    serve(() => json(200, ANSWER({ confidence: 'low', can_escalate: true })));
    fireEvent.change(screen.getByLabelText('Email nhận phản hồi từ chuyên gia'), { target: { value: 'a@b.vn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển chuyên gia' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('chuyên gia'));
    expect(calls.at(-1)).toEqual({ path: '/api/public/copilot/queries/q-1/escalate', body: { contact_email: 'a@b.vn' } });
  });

  it('gửi phản hồi hữu ích', async () => {
    serve(() => json(200, ANSWER()));
    setup();
    ask();
    fireEvent.click(await screen.findByRole('button', { name: 'Hữu ích' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Cảm ơn'));
    expect(calls.at(-1)).toEqual({ path: '/api/public/copilot/queries/q-1/feedback', body: { was_helpful: true } });
  });

  it('câu hỏi quá ngắn không gọi API; 429 báo hỏi quá nhiều', async () => {
    serve(() => json(429, { detail: 'x' }));
    setup();
    ask('ab');
    expect((await screen.findByRole('alert')).textContent).toContain('ít nhất 3 ký tự');
    expect(calls).toHaveLength(0);
    ask();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('quá nhiều lần'));
  });
});
