import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  const t = useTranslations('HomePage');
  return (
    <section className="py-8">
      <h1 className="text-3xl font-bold tracking-tight">{t('heading')}</h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-700">{t('intro')}</p>
    </section>
  );
}
