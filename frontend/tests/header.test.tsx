import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Header from '@/components/Header';
import { LanguageProvider } from '@/context/LanguageContext';
import type { DemoUser } from '@/lib/demoAuth';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const seller = (onboardingCompleted: boolean): DemoUser => ({
  id: 'u-1',
  name: 'Seller',
  email: 'seller@x.vn',
  company: 'Công ty A',
  role: 'seller',
  onboardingCompleted,
  onboardingVersion: onboardingCompleted ? 2 : undefined,
});

function wrap(user: DemoUser | null, onSetDirectoryNav = vi.fn()) {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <Header currentPage="home" directoryNav="suppliers" user={user} onSetDirectoryNav={onSetDirectoryNav} onLogout={vi.fn()} />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
  return onSetDirectoryNav;
}

const href = (name: string) => screen.getByRole('link', { name }).getAttribute('href');

describe('Header — điều hướng bằng link thật để Next.js prefetch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('khách: menu, logo, đăng nhập/đăng ký là link tới đúng route', () => {
    const setNav = wrap(null);
    expect(href('Giải pháp')).toBe('/vi/solutions');
    expect(href('Doanh nghiệp')).toBe('/vi/suppliers');
    expect(href('Buyer')).toBe('/vi/suppliers?nav=buyer');
    expect(href('Sản phẩm')).toBe('/vi/products');
    expect(href('Giá')).toBe('/vi/pricing');
    expect(href('Về chúng tôi')).toBe('/vi/about');
    expect(href('VYBE TRADE')).toBe('/vi');
    expect(href('Đăng nhập')).toBe('/vi/login');
    expect(href('Đăng ký')).toBe('/vi/register');
    fireEvent.click(screen.getByRole('link', { name: 'Buyer' }));
    expect(setNav).toHaveBeenCalledWith('buyer');
  });

  it.each([
    [true, '/vi/exporter'],
    [false, '/vi/exporter/onboarding'],
  ])('seller (đã onboarding: %s): menu tài khoản giữ quy tắc quyền cũ', (onboarded, workspace) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    wrap(seller(onboarded));
    fireEvent.click(screen.getByRole('button', { name: /Seller/ }));
    expect(href('Workspace Seller')).toBe(workspace);
  });
});
