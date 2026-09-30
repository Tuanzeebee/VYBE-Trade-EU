import { setRequestLocale } from 'next-intl/server';
import { Suspense, use } from 'react';
import Conversations from '@/components/Conversations';

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  return (
    <Suspense>
      <Conversations />
    </Suspense>
  );
}
