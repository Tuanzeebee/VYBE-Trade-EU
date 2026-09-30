import { setRequestLocale } from 'next-intl/server';
import SupplierProfile from '@/components/SupplierProfile';
import type { Locale } from '@/i18n/translate';

// [id] là slug công khai của công ty.
export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <SupplierProfile slug={id} locale={locale as Locale} />;
}
