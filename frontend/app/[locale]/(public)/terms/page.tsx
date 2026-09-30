import { setRequestLocale } from 'next-intl/server';
import TermsIndex from '@/components/TermsIndex';
import type { Locale } from '@/i18n/translate';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TermsIndex locale={locale as Locale} />;
}
