import { setRequestLocale } from 'next-intl/server';
import { Suspense, use } from 'react';
import { SupplierDetailRoute } from '@/components/routes/PublicRoutes';

export default function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = use(params);
  setRequestLocale(locale);
  return (
    <Suspense>
      <SupplierDetailRoute id={id} />
    </Suspense>
  );
}
