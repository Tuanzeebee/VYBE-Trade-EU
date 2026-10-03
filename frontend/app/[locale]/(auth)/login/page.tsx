import { setRequestLocale } from 'next-intl/server';
import { Suspense, use } from 'react';
import { AuthRoute } from '@/components/routes/AuthRoute';

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  return (
    <Suspense>
      <AuthRoute mode="login" />
    </Suspense>
  );
}
