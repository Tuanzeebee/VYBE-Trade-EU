import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';

export const AREAS = ['public', 'auth', 'exporter', 'buyer', 'admin'] as const;
export type Area = (typeof AREAS)[number];

// Chỉ trỏ tới route đã tồn tại; thêm mục khi hạng mục tương ứng có trang.
const NAV: Record<Area, readonly { key: string; href: string }[]> = {
  public: [
    { key: 'home', href: '/' },
    { key: 'login', href: '/login' },
  ],
  auth: [{ key: 'home', href: '/' }],
  exporter: [{ key: 'dashboard', href: '/exporter' }],
  buyer: [{ key: 'dashboard', href: '/buyer' }],
  admin: [{ key: 'dashboard', href: '/admin' }],
};

export function AreaShell({ area, children }: { area: Area; children: ReactNode }) {
  const t = useTranslations('Layout');
  const common = useTranslations('Common');
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        {common('skipToContent')}
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <span className="text-base font-semibold">{t(`${area}.title`)}</span>
          <nav className="flex flex-wrap items-center gap-1">
            {NAV[area].map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                {t(`${area}.nav.${item.key}`)}
              </Link>
            ))}
            <LocaleSwitcher />
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
