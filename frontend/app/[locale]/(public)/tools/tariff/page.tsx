import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import TariffCalculator from '@/components/TariffCalculator';
import { isRooStatus } from '@/lib/marketsApi';

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ roo?: string }>;
}) {
  setRequestLocale(use(params).locale);
  const { roo } = use(searchParams);
  return <TariffCalculator initialRoo={isRooStatus(roo) ? roo : undefined} />;
}
