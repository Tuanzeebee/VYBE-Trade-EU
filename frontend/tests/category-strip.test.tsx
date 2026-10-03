import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import CategoryStrip from '@/components/CategoryStrip';
import { INDUSTRIES } from '@/lib/companyApi';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const wrap = (ui: React.ReactElement) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      {ui}
    </NextIntlClientProvider>,
  );

describe('Dải nhóm hàng (N7)', () => {
  it('mỗi nhóm hàng là một link tới danh bạ đã lọc; không có link rỗng (#)', () => {
    wrap(<CategoryStrip t={(vi) => vi} />);
    const nav = screen.getByRole('navigation', { name: 'Nhóm hàng' });
    const links = Array.from(nav.querySelectorAll('a'));
    expect(links.length).toBe(INDUSTRIES.length);
    for (const link of links) expect(link.getAttribute('href')).toMatch(/\/suppliers\?category=[a-z_]+$/);
    expect(screen.getByRole('link', { name: 'Thủy sản' }).getAttribute('href')).toContain('category=seafood');
  });

  it('nhóm đang chọn được đánh dấu', () => {
    wrap(<CategoryStrip t={(vi) => vi} active="coffee_tea" />);
    expect(screen.getByRole('link', { name: 'Cà phê & chè' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Thủy sản' })).not.toHaveAttribute('aria-current');
  });
});
