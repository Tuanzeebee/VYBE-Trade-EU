import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { AREAS, AreaShell, type Area } from '@/components/layout/area-shell';
import en from '@/messages/en.json';
import viMessages from '@/messages/vi.json';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useParams: () => ({}),
}));

const LOCALES = { vi: viMessages, en } as const;

function renderShell(area: Area, locale: keyof typeof LOCALES) {
  return render(
    <NextIntlClientProvider locale={locale} messages={LOCALES[locale]}>
      <AreaShell area={area}>
        <p>nội dung trang</p>
      </AreaShell>
    </NextIntlClientProvider>,
  );
}

const cases = AREAS.flatMap((area) => (['vi', 'en'] as const).map((locale) => [area, locale] as const));

describe('AreaShell', () => {
  it('có đủ bốn khu vực vai trò cùng khu xác thực', () => {
    expect([...AREAS].sort()).toEqual(['admin', 'auth', 'buyer', 'exporter', 'public']);
  });

  it.each(cases)('%s/%s: tiêu đề khu vực lấy từ messages và nội dung nằm trong <main>', (area, locale) => {
    renderShell(area, locale);
    const banner = screen.getByRole('banner');
    expect(within(banner).getByText(LOCALES[locale].Layout[area].title)).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByText('nội dung trang')).toBeInTheDocument();
  });

  it.each(cases)('%s/%s: không có link trỏ "#" hoặc rỗng', (area, locale) => {
    renderShell(area, locale);
    for (const link of screen.getAllByRole('link')) {
      // Anchor trong trang (#main) hợp lệ; cấm link giữ chỗ "#" và href rỗng.
      expect(['', '#']).not.toContain(link.getAttribute('href') ?? '');
    }
  });

  it.each(cases)('%s/%s: có link chuyển sang ngôn ngữ còn lại', (area, locale) => {
    renderShell(area, locale);
    const other = locale === 'vi' ? 'en' : 'vi';
    const switcher = screen.getByRole('link', { name: LOCALES[locale].Common.switchLanguage });
    expect(switcher.getAttribute('href')).toBe(`/${other}`);
  });
});
