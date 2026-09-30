import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import TariffCalculator from '@/components/TariffCalculator';

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  return <TariffCalculator />;
}
