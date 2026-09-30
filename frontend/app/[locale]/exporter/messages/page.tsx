import { setRequestLocale } from 'next-intl/server';
import { Suspense, use } from 'react';
import { WorkspaceRoute } from '@/components/routes/AccountRoutes';

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  return (
    <Suspense>
      <WorkspaceRoute tab="messages" />
    </Suspense>
  );
}
