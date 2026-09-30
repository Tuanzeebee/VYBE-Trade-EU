import { setRequestLocale } from 'next-intl/server';
import SupplierDirectory from '@/components/SupplierDirectory';
import type { Locale } from '@/i18n/translate';
import { readQuery } from '@/lib/suppliersApi';

// Render phía server theo từng yêu cầu: kết quả phụ thuộc bộ lọc trên URL.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SupplierDirectory query={readQuery(await searchParams)} locale={locale as Locale} />;
}
