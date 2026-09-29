import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { SellerProfileRoute } from '@/components/routes/AccountRoutes';

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  return <SellerProfileRoute />;
}
