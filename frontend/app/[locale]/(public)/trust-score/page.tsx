import { setRequestLocale } from 'next-intl/server';
import TrustScoreMethod from '@/components/TrustScoreMethod';
import type { Locale } from '@/i18n/translate';

// Tiêu chí và trọng số là dữ liệu có người duyệt — đọc lúc truy cập, không đóng băng lúc build.
export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TrustScoreMethod locale={locale as Locale} />;
}
