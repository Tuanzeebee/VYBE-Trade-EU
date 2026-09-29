import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AccountSettings from '@/components/AccountSettings';
import { LanguageProvider } from '@/context/LanguageContext';

const push = vi.fn();
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/account',
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let calls: { method: string; path: string; body: unknown }[] = [];
function serve(opts: { role?: 'exporter' | null; del?: () => Response } = {}) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      const text = await req.text();
      calls.push({ method: req.method, path, body: text ? JSON.parse(text) : null });
      if (path === '/api/me') {
        return opts.role === null ? json(401, {}) : json(200, { id: 'u-1', email: 'chu@x.vn', role: 'exporter', preferred_language: 'vi' });
      }
      if (path === '/api/me/delete') return opts.del ? opts.del() : new Response(null, { status: 204 });
      if (path === '/api/auth/logout') return new Response(null, { status: 204 });
      return json(404, {});
    }),
  );
}

const wrap = () =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <AccountSettings />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockClear();
});

describe('Tài khoản của tôi (J2)', () => {
  it('khách: hướng dẫn đăng nhập', async () => {
    serve({ role: null });
    wrap();
    expect(await screen.findByRole('status')).toHaveTextContent('Đăng nhập để quản lý tài khoản');
  });

  it('phải bấm xác nhận và nhập mật khẩu mới xóa; chưa xác nhận thì không gọi API', async () => {
    serve();
    wrap();
    expect(await screen.findByText('chu@x.vn')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nhập mật khẩu để xác nhận')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Xóa tài khoản của tôi' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xóa vĩnh viễn' }));
    expect((await screen.findByRole('alert')).textContent).toContain('nhập mật khẩu');
    expect(calls.some((c) => c.path === '/api/me/delete')).toBe(false);
  });

  it('xóa thành công: gửi mật khẩu, dọn phiên rồi về trang chủ', async () => {
    serve();
    wrap();
    fireEvent.click(await screen.findByRole('button', { name: 'Xóa tài khoản của tôi' }));
    fireEvent.change(screen.getByLabelText('Nhập mật khẩu để xác nhận'), { target: { value: 'mat-khau-du-dai' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xóa vĩnh viễn' }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(String(push.mock.calls[0][0])).toMatch(/^\/(vi)?$/);
    expect(calls.find((c) => c.path === '/api/me/delete')?.body).toEqual({ password: 'mat-khau-du-dai' });
    expect(calls.some((c) => c.path === '/api/auth/logout')).toBe(true);
  });

  it('sai mật khẩu: báo lỗi, không chuyển trang', async () => {
    serve({ del: () => json(403, { error: { code: 'wrong_password', message: 'x' } }) });
    wrap();
    fireEvent.click(await screen.findByRole('button', { name: 'Xóa tài khoản của tôi' }));
    fireEvent.change(screen.getByLabelText('Nhập mật khẩu để xác nhận'), { target: { value: 'sai' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xóa vĩnh viễn' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Mật khẩu không đúng');
    expect(push).not.toHaveBeenCalled();
  });

  it('lỗi mạng và hủy', async () => {
    serve({ del: () => json(500, {}) });
    wrap();
    fireEvent.click(await screen.findByRole('button', { name: 'Xóa tài khoản của tôi' }));
    fireEvent.change(screen.getByLabelText('Nhập mật khẩu để xác nhận'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xóa vĩnh viễn' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Không kết nối được');
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByLabelText('Nhập mật khẩu để xác nhận')).toBeNull();
    expect(screen.getByRole('button', { name: 'Xóa tài khoản của tôi' })).toBeInTheDocument();
  });
});
