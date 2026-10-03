import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { AboutRoute } from '@/components/routes/AboutRoute';

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  return <AboutRoute />;
}
