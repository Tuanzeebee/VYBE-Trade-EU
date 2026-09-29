import { setRequestLocale } from 'next-intl/server';
import { Suspense, use } from 'react';
import { DirectoryRoute } from '@/components/routes/PublicRoutes';

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  return (
    <Suspense>
      <DirectoryRoute />
    </Suspense>
  );
}
