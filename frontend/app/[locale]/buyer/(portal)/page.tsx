import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import BuyerDashboard from '@/components/BuyerDashboard';

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  return <BuyerDashboard />;
}
