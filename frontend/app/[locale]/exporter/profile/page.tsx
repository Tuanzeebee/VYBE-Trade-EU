import { setRequestLocale } from 'next-intl/server';
import { Suspense, use } from 'react';
import { SellerProfileRoute } from '@/components/routes/SellerProfileRoute';

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  return (
    <Suspense>
      <SellerProfileRoute />
    </Suspense>
  );
}
