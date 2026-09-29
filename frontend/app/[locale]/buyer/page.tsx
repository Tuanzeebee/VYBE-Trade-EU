import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';

export default function BuyerHome({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  const t = useTranslations('BuyerHome');
  return (
    <section>
      <h1 className="text-2xl font-semibold">{t('heading')}</h1>
      <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-5 text-slate-700">{t('empty')}</p>
    </section>
  );
}
