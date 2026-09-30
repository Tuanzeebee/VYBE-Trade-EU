import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import MarketRecommendation from '@/components/MarketRecommendation';

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  setRequestLocale(use(params).locale);
  const { q } = use(searchParams);
  return <MarketRecommendation initialQuery={(q ?? '').slice(0, 100)} />;
}
