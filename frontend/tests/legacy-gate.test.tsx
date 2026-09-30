import { render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LegacyGate } from '@/components/app-shell/LegacyGate';
import type { LegacyPage } from '@/lib/legacyNav';

const replace = vi.fn();

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => window.location.pathname,
  useRouter: () => ({ push: vi.fn(), replace, prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

interface Server {
  /** Hồ sơ công ty trên server (null = chưa có, trả 404). */
  company?: Record<string, unknown> | null;
  /** Sản phẩm của exporter trên server. */
  products?: unknown[];
}

/** Server trả phiên cho /api/me; null = chưa đăng nhập (401). Công ty/sản phẩm mặc định chưa có. */
function serverSession(role: 'exporter' | 'buyer' | 'admin' | null, onboarded = false, server: Server = {}) {
  const id = `u-${role}`;
  if (role && onboarded) {
    localStorage.setItem(
      'vybe_profiles_v2',
      JSON.stringify({ [id]: { onboardingCompleted: true, onboardingVersion: 2 } }),
    );
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === '/api/me') {
        return role
          ? json(200, { id, email: `${role}@x.vn`, role, preferred_language: 'vi' })
          : json(401, { error: { code: 'unauthenticated', message: 'x' } });
      }
      if (path === '/api/me/company') return server.company ? json(200, server.company) : json(404, {});
      if (path === '/api/exporter/products') return json(200, server.products ?? []);
      return json(404, {});
    }),
  );
}

function renderGate(page: LegacyPage, path: string) {
  window.history.replaceState(null, '', `/vi${path}`);
  return render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LegacyGate page={page}>{(user) => <p>nội dung {user?.id ?? 'khách'}</p>}</LegacyGate>
    </NextIntlClientProvider>,
  );
}

describe('LegacyGate (phiên xác nhận với server)', () => {
  beforeEach(() => replace.mockClear());
  afterEach(() => vi.unstubAllGlobals());

  it('khách vào workspace → chuyển tới /login, không hiện nội dung', async () => {
    serverSession(null);
    renderGate('workspace', '/exporter');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/login'));
    expect(screen.queryByText(/nội dung/)).not.toBeInTheDocument();
  });

  it('phiên cũ còn trong trình duyệt nhưng server báo hết hạn → vẫn chuyển tới /login', async () => {
    localStorage.setItem(
      'vybe_session_cache_v2',
      JSON.stringify({ id: 'u-old', email: 'old@x.vn', role: 'exporter', preferred_language: 'vi' }),
    );
    serverSession(null);
    renderGate('workspace', '/exporter');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/login'));
    expect(screen.queryByText(/nội dung/)).not.toBeInTheDocument();
  });

  it('exporter chưa onboarding vào trang chủ → chuyển tới onboarding của exporter', async () => {
    serverSession('exporter');
    renderGate('home', '/');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/exporter/onboarding'));
  });

  it('exporter chưa onboarding mở nhầm onboarding của buyer → chuyển đúng trang', async () => {
    serverSession('exporter');
    renderGate('onboarding', '/buyer/onboarding');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/exporter/onboarding'));
  });

  it('exporter đã onboarding vào workspace → hiện nội dung với đúng user', async () => {
    serverSession('exporter', true);
    renderGate('workspace', '/exporter');
    expect(await screen.findByText('nội dung u-exporter')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('buyer vào admin → chuyển về danh bạ', async () => {
    serverSession('buyer', true);
    renderGate('admin', '/admin');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/suppliers'));
  });

  it('exporter đổi máy (không còn cờ trình duyệt) nhưng server đã có công ty và sản phẩm → vào workspace, không vào wizard', async () => {
    serverSession('exporter', false, { company: { id: 'c-1', legal_name: 'Công ty A' }, products: [{ id: 'p-1' }] });
    renderGate('workspace', '/exporter');
    expect(await screen.findByText('nội dung u-exporter')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('exporter mới lưu nháp công ty (chưa có sản phẩm) → vẫn về wizard onboarding', async () => {
    serverSession('exporter', false, { company: { id: 'c-1', legal_name: 'Công ty A' }, products: [] });
    renderGate('workspace', '/exporter');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/exporter/onboarding'));
  });

  it('buyer đã có công ty trên server → vào thẳng khu vực buyer, không bị đưa tới onboarding', async () => {
    serverSession('buyer', false, { company: { id: 'c-2', legal_name: 'Global Foods' } });
    renderGate('buyer-directory', '/suppliers');
    expect(await screen.findByText('nội dung u-buyer')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('khách xem trang công khai → hiện ngay, không chuyển hướng', async () => {
    serverSession(null);
    renderGate('buyer-directory', '/suppliers');
    expect(await screen.findByText('nội dung khách')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
