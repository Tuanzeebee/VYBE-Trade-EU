import { setRequestLocale } from 'next-intl/server';
import TrustScoreMethod from '@/components/TrustScoreMethod';
import type { Locale } from '@/i18n/translate';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TrustScoreMethod locale={locale as Locale} />;
}
