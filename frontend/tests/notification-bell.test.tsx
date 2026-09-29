import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationBell from '@/components/NotificationBell';
import { LanguageProvider } from '@/context/LanguageContext';
import { describe as describeNotification } from '@/lib/notificationsApi';

const push = vi.fn();
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter',
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const item = (over: Record<string, unknown> = {}) => ({
  id: 'n-1',
  type: 'verification_status',
  payload: { outcome: 'reject', reason: 'Thiếu giấy phép' },
  link: '/exporter?tab=verification',
  is_read: false,
  created_at: '2026-09-30T01:00:00Z',
  ...over,
});

interface World {
  unread: number;
  items: unknown[];
  fail?: boolean;
}
let calls: { method: string; path: string }[] = [];

function serve(world: World) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      calls.push({ method: req.method, path });
      if (world.fail) return json(500, {});
      if (path === '/api/me/notifications/unread-count') return json(200, { count: world.unread });
      if (path === '/api/me/notifications/read-all') {
        world.unread = 0;
        return json(200, { count: 0 });
      }
      if (path.endsWith('/read')) {
        world.unread = Math.max(0, world.unread - 1);
        return json(200, item({ is_read: true }));
      }
      if (path === '/api/me/notifications') return json(200, world.items);
      return json(404, {});
    }),
  );
}

const wrap = () =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <NotificationBell />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );

beforeEach(() => push.mockClear());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Chuông thông báo (H1)', () => {
  it('hiện số chưa đọc trên chuông', async () => {
    serve({ unread: 3, items: [] });
    wrap();
    expect(await screen.findByTestId('unread-badge')).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: 'Thông báo, 3 chưa đọc' })).toBeInTheDocument();
  });

  it('không có thông báo chưa đọc thì không hiện huy hiệu; danh sách rỗng có hướng dẫn', async () => {
    serve({ unread: 0, items: [] });
    wrap();
    fireEvent.click(await screen.findByRole('button', { name: 'Thông báo' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Chưa có thông báo');
    expect(screen.queryByTestId('unread-badge')).toBeNull();
  });

  it('mở danh sách, bấm một thông báo thì đánh dấu đã đọc và đi tới đúng trang', async () => {
    serve({ unread: 1, items: [item()] });
    wrap();
    fireEvent.click(await screen.findByRole('button', { name: /Thông báo, 1 chưa đọc/ }));
    const entry = await screen.findByRole('button', { name: /Yêu cầu xác minh của bạn bị từ chối/ });
    expect(entry).toHaveTextContent('Thiếu giấy phép');
    fireEvent.click(entry);
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(String(push.mock.calls[0][0])).toContain('/exporter?tab=verification');
    expect(calls.some((c) => c.method === 'POST' && c.path === '/api/me/notifications/n-1/read')).toBe(true);
    await waitFor(() => expect(screen.queryByTestId('unread-badge')).toBeNull());
  });

  it('đánh dấu tất cả đã đọc', async () => {
    serve({ unread: 2, items: [item(), item({ id: 'n-2' })] });
    wrap();
    fireEvent.click(await screen.findByRole('button', { name: /Thông báo, 2 chưa đọc/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Đánh dấu tất cả đã đọc' }));
    await waitFor(() => expect(screen.queryByTestId('unread-badge')).toBeNull());
    expect(calls.some((c) => c.path === '/api/me/notifications/read-all')).toBe(true);
  });

  it('lỗi tải danh sách: báo lỗi, không giả làm rỗng', async () => {
    serve({ unread: 0, items: [], fail: true });
    wrap();
    fireEvent.click(await screen.findByRole('button', { name: 'Thông báo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được thông báo');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('cập nhật số chưa đọc mỗi 30 giây', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const world: World = { unread: 1, items: [] };
    serve(world);
    wrap();
    expect(await screen.findByTestId('unread-badge')).toHaveTextContent('1');
    world.unread = 4;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    await waitFor(() => expect(screen.getByTestId('unread-badge')).toHaveTextContent('4'));
  });
});

describe('describe()', () => {
  it.each([
    ['verification_status', { outcome: 'approve' }, 'đã được xác minh'],
    ['verification_status', { outcome: 'request_info' }, 'bổ sung'],
    ['verification_status', { outcome: 'expire' }, 'hết hạn'],
    ['expiry_alert', {}, 'sắp hết hạn'],
    ['rfq', {}, 'báo giá'],
    ['message', {}, 'tin nhắn'],
    ['new_match', {}, 'phù hợp'],
  ] as const)('%s %j', (type, payload, expected) => {
    expect(describeNotification({ type, payload })).toContain(expected);
  });
});
