'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export function LocaleSwitcher() {
  const t = useTranslations('Common');
  const locale = useLocale();
  const pathname = usePathname();
  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;
  return (
    <Link
      href={pathname}
      locale={other}
      className="rounded-md px-3 py-2 text-sm font-medium text-blue-800 underline-offset-4 hover:underline"
    >
      {t('switchLanguage')}
    </Link>
  );
}
