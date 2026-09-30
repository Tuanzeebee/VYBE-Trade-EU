import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import NotificationsPanel from '@/components/NotificationsPanel';

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <NotificationsPanel />
    </main>
  );
}
