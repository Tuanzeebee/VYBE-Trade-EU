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

/** Server trả phiên cho /api/me; null = chưa đăng nhập (401). */
function serverSession(role: 'exporter' | 'buyer' | 'admin' | null, onboarded = false) {
  const id = `u-${role}`;
  if (role && onboarded) {
    localStorage.setItem(
      'vybe_profiles_v2',
      JSON.stringify({ [id]: { onboardingCompleted: true, onboardingVersion: 2 } }),
    );
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      role
        ? new Response(JSON.stringify({ id, email: `${role}@x.vn`, role, preferred_language: 'vi' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        : new Response(JSON.stringify({ error: { code: 'unauthenticated', message: 'x' } }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          }),
    ),
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

  it('khách xem trang công khai → hiện ngay, không chuyển hướng', async () => {
    serverSession(null);
    renderGate('buyer-directory', '/suppliers');
    expect(await screen.findByText('nội dung khách')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
