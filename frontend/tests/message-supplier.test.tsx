import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MessageSupplier from '@/components/MessageSupplier';
import { LanguageProvider } from '@/context/LanguageContext';

const push = vi.fn();
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/suppliers/nong-san',
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let calls: { method: string; path: string; body: unknown }[] = [];

function serve(role: 'buyer' | 'exporter' | 'admin' | null, start: () => Response = () => json(201, { id: 'c-9' })) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      const text = await req.text();
      calls.push({ method: req.method, path, body: text ? JSON.parse(text) : null });
      if (path === '/api/me') return role ? json(200, { id: 'u-1', email: 'u@x.vn', role, preferred_language: 'vi' }) : json(401, {});
      if (path === '/api/me/conversations' && req.method === 'POST') return start();
      return json(404, {});
    }),
  );
}

const wrap = () =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <MessageSupplier slug="nong-san" supplierName="Nông Sản Lúa Vàng" />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );

async function typeAndSend(text = 'Xin báo giá cá tra CIF Hamburg') {
  fireEvent.click(await screen.findByRole('button', { name: 'Nhắn tin' }));
  fireEvent.change(screen.getByLabelText(/Tin nhắn tới/), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockClear();
});

describe('Nhắn tin trực tiếp cho nhà cung cấp (U7)', () => {
  it('khách: mời đăng nhập, không có form', async () => {
    serve(null);
    wrap();
    expect(await screen.findByRole('link', { name: 'Đăng nhập để nhắn tin' })).toHaveAttribute('href', expect.stringContaining('/login'));
  });

  it('buyer gửi tin theo slug rồi sang trang tin nhắn với hội thoại chọn sẵn', async () => {
    serve('buyer');
    wrap();
    await typeAndSend();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/vi/buyer/messages?c=c-9'));
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ supplier_slug: 'nong-san', body: 'Xin báo giá cá tra CIF Hamburg' });
  });

  it('seller (nhà cung cấp khác, vd cần dịch vụ logistics) cũng nhắn được', async () => {
    serve('exporter');
    wrap();
    await typeAndSend();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/vi/exporter/messages?c=c-9'));
  });

  it('không gửi tin trống', async () => {
    serve('buyer');
    wrap();
    await typeAndSend('   ');
    expect((await screen.findByRole('alert')).textContent).toContain('Vui lòng nhập nội dung tin nhắn');
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it.each([
    [429, {}, 'quá nhiều hội thoại mới'],
    [404, {}, 'không nhận tin nhắn'],
    [409, { error: { code: 'company_required' } }, 'hoàn thiện hồ sơ doanh nghiệp'],
    [422, { error: { code: 'cannot_message_self' } }, 'chính công ty mình'],
  ])('lỗi %s hiện thông báo phù hợp', async (status, body, text) => {
    serve('buyer', () => json(status as number, body));
    wrap();
    await typeAndSend();
    expect((await screen.findByRole('alert')).textContent).toContain(text);
    expect(push).not.toHaveBeenCalled();
  });

  it('admin: không hiện nút nhắn tin', async () => {
    serve('admin');
    const { container } = wrap();
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 20));
    expect(container.querySelector('button')).toBeNull();
  });
});
