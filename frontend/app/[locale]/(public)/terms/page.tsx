import { setRequestLocale } from 'next-intl/server';
import LegalPageView from '@/components/LegalPageView';
import type { Locale } from '@/i18n/translate';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPageView page="terms" locale={locale as Locale} />;
}
