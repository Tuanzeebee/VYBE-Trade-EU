import { render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LegacyGate } from '@/components/app-shell/LegacyGate';
import { DEMO_USERS } from '@/lib/demoAuth';
import type { LegacyPage } from '@/lib/legacyNav';

const replace = vi.fn();

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => window.location.pathname,
  useRouter: () => ({ push: vi.fn(), replace, prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

function loginAs(id: string, onboarded: boolean) {
  const base = DEMO_USERS.find((u) => u.id === id)!;
  const user = { ...base, onboardingCompleted: onboarded, onboardingVersion: onboarded ? 2 : undefined };
  localStorage.setItem('vybe_demo_users_v1', JSON.stringify([user]));
  localStorage.setItem('vybe_demo_session_v1', id);
}

function renderGate(page: LegacyPage, path: string) {
  window.history.replaceState(null, '', `/vi${path}`);
  return render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LegacyGate page={page}>{(user) => <p>nội dung {user?.id ?? 'khách'}</p>}</LegacyGate>
    </NextIntlClientProvider>,
  );
}

describe('LegacyGate', () => {
  beforeEach(() => replace.mockClear());

  it('khách vào workspace → chuyển tới /login, không hiện nội dung', async () => {
    renderGate('workspace', '/exporter');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/login'));
    expect(screen.queryByText(/nội dung/)).not.toBeInTheDocument();
  });

  it('seller chưa onboarding vào trang chủ → chuyển tới onboarding của exporter', async () => {
    loginAs('demo-seller', false);
    renderGate('home', '/');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/exporter/onboarding'));
  });

  it('seller chưa onboarding mở nhầm onboarding của buyer → chuyển đúng trang', async () => {
    loginAs('demo-seller', false);
    renderGate('onboarding', '/buyer/onboarding');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/exporter/onboarding'));
  });

  it('seller đã onboarding vào workspace → hiện nội dung với đúng user', async () => {
    loginAs('demo-seller', true);
    renderGate('workspace', '/exporter');
    expect(await screen.findByText('nội dung demo-seller')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('khách xem trang công khai → hiện ngay, không chuyển hướng', async () => {
    renderGate('buyer-directory', '/suppliers');
    expect(await screen.findByText('nội dung khách')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
