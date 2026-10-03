import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { PricingRoute } from '@/components/routes/PricingRoute';

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  return <PricingRoute />;
}
