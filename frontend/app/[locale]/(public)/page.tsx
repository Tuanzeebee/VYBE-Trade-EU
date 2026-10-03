import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { HomeRoute } from '@/components/routes/HomeRoute';

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  return <HomeRoute />;
}
