import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  const t = useTranslations('LoginPage');
  return (
    <section>
      <h1 className="text-2xl font-semibold">{t('heading')}</h1>

    </section>
  );
}
