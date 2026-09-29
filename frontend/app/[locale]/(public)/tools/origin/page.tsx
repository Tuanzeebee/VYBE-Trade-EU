import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import OriginCalculator from '@/components/OriginCalculator';

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  return <OriginCalculator />;
}
