import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Conversations from '@/components/Conversations';
import { LanguageProvider } from '@/context/LanguageContext';

let search = '';
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/conversations',
  useSearchParams: () => new URLSearchParams(search),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const conversation = (over: Record<string, unknown> = {}) => ({
  id: 'c-1',
  rfq_id: 'r-1',
  product_name: 'Gạo thơm Jasmine',
  counterpart_name: 'Global Foods GmbH',
  last_message: null,
  last_message_at: '2026-09-30T01:00:00Z',
  unread_count: 0,
  ...over,
});

const message = (over: Record<string, unknown> = {}) => ({
  id: 'm-1',
  conversation_id: 'c-1',
  sender_company_id: 'buyer',
  mine: false,
  body: 'Xin chào, giá bao nhiêu?',
  body_original: 'Hello, what is the price?',
  translated: true,
  original_language: 'en',
  translated_language: 'vi',
  sent_at: '2026-09-30T01:00:00Z',
  read_at: null,
  ...over,
});

interface World {
  role?: 'buyer' | 'exporter' | null;
  conversations?: unknown[] | null;
  messages?: Record<string, unknown[]>;
  send?: () => Response;
}
let calls: { method: string; path: string; search: string; body: unknown }[] = [];

function serve(world: World) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      const text = await req.text();
      calls.push({ method: req.method, path: url.pathname, search: url.search, body: text ? JSON.parse(text) : null });
      if (url.pathname === '/api/me') {
        return world.role === null ? json(401, {}) : json(200, { id: 'u-1', email: 'u@x.vn', role: world.role ?? 'exporter', preferred_language: 'vi' });
      }
      if (url.pathname === '/api/me/conversations') return world.conversations === null ? json(500, {}) : json(200, world.conversations ?? []);
      const match = url.pathname.match(/^\/api\/me\/conversations\/([^/]+)\/messages$/);
      if (match && req.method === 'GET') return json(200, world.messages?.[match[1]] ?? []);
      if (match && req.method === 'POST') return world.send ? world.send() : json(201, message({ id: 'm-new', mine: true, translated: false, body: (JSON.parse(text) as { body: string }).body, body_original: (JSON.parse(text) as { body: string }).body }));
      return json(404, {});
    }),
  );
}

const wrap = () =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <Conversations />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  search = '';
});

describe('Hội thoại (F2, F3)', () => {
  it('khách: hướng dẫn đăng nhập', async () => {
    serve({ role: null });
    wrap();
    expect(await screen.findByRole('status')).toHaveTextContent('Đăng nhập để xem hội thoại');
  });

  it('chưa có hội thoại: hướng dẫn thay vì để trống', async () => {
    serve({ conversations: [] });
    wrap();
    expect(await screen.findByRole('status')).toHaveTextContent('Chưa có hội thoại nào');
  });

  it('lỗi tải danh sách: báo lỗi', async () => {
    serve({ conversations: null });
    wrap();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được danh sách hội thoại');
  });

  it('mở hội thoại đầu tiên, hiện bản dịch và cho xem bản gốc', async () => {
    serve({ conversations: [conversation({ unread_count: 1 })], messages: { 'c-1': [message()] } });
    wrap();
    expect(await screen.findByText('Xin chào, giá bao nhiêu?')).toBeInTheDocument();
    expect(screen.getByTestId('unread')).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('button', { name: 'Xem bản gốc' }));
    expect(screen.getByText('Hello, what is the price?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xem bản dịch' }));
    expect(screen.getByText('Xin chào, giá bao nhiêu?')).toBeInTheDocument();
  });

  it('tin chưa được dịch thì không có nút xem bản gốc', async () => {
    serve({
      conversations: [conversation()],
      messages: { 'c-1': [message({ translated: false, body: 'Hello', body_original: 'Hello', translated_language: null })] },
    });
    wrap();
    expect(await screen.findByText('Hello')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Xem bản/ })).toBeNull();
  });

  it('?rfq= chọn đúng hội thoại của RFQ đó', async () => {
    search = 'rfq=r-2';
    serve({
      conversations: [conversation(), conversation({ id: 'c-2', rfq_id: 'r-2', counterpart_name: 'Hai GmbH' })],
      messages: { 'c-2': [message({ id: 'm-2', conversation_id: 'c-2', body: 'Chào từ Hai' })] },
    });
    wrap();
    expect(await screen.findByText('Chào từ Hai')).toBeInTheDocument();
    expect(calls.some((c) => c.path === '/api/me/conversations/c-1/messages')).toBe(false);
  });

  it('gửi tin: hiện ngay trong luồng và xóa ô nhập', async () => {
    serve({ conversations: [conversation()], messages: { 'c-1': [] } });
    wrap();
    await screen.findByRole('status'); // luồng rỗng
    fireEvent.change(screen.getByLabelText('Tin nhắn'), { target: { value: 'Giá 2,3 EUR/kg' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect(await screen.findByText('Giá 2,3 EUR/kg')).toBeInTheDocument();
    expect(screen.getByLabelText('Tin nhắn')).toHaveValue('');
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ body: 'Giá 2,3 EUR/kg' });
  });

  it('không gửi tin trống; gửi lỗi thì giữ nội dung và báo lỗi', async () => {
    serve({ conversations: [conversation()], messages: { 'c-1': [] }, send: () => json(500, {}) });
    wrap();
    await screen.findByRole('status');
    expect(screen.getByRole('button', { name: 'Gửi' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Tin nhắn'), { target: { value: 'Xin chào' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Không gửi được tin nhắn');
    expect(screen.getByLabelText('Tin nhắn')).toHaveValue('Xin chào');
  });

  it('polling lấy tin mới bằng cursor `after` và không lặp tin cũ', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const world: World = { conversations: [conversation()], messages: { 'c-1': [message()] } };
    serve(world);
    wrap();
    await screen.findByText('Xin chào, giá bao nhiêu?');
    world.messages = { 'c-1': [message({ id: 'm-2', body: 'Tin thứ hai', translated: false })] };
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7_000);
    });
    expect(await screen.findByText('Tin thứ hai')).toBeInTheDocument();
    const polls = calls.filter((c) => c.path === '/api/me/conversations/c-1/messages' && c.search.includes('after'));
    expect(polls[0].search).toContain('after=m-1');
    expect(screen.getAllByText('Xin chào, giá bao nhiêu?')).toHaveLength(1);
    const list = screen.getByRole('list', { name: 'Danh sách hội thoại' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  });

  it('lỗi tải tin nhắn: báo lỗi', async () => {
    serve({ conversations: [conversation()] });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (req: Request) => {
        const path = new URL(req.url).pathname;
        if (path === '/api/me') return json(200, { id: 'u-1', email: 'u@x.vn', role: 'buyer', preferred_language: 'vi' });
        if (path === '/api/me/conversations') return json(200, [conversation()]);
        return json(500, {});
      }),
    );
    wrap();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Không tải được tin nhắn'));
  });
});
