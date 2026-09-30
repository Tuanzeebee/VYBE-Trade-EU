import React from 'react';
import { Link } from '../i18n/navigation';
import { translateText, type Locale } from '../i18n/translate';

// Điều khoản có hai bản: dành cho Người mua và dành cho Doanh nghiệp (nhà xuất khẩu).
export default function TermsIndex({ locale }: { locale: Locale }) {
  const t = (vi: string) => translateText(vi, locale);
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t('Điều khoản dịch vụ')}</h1>
      <p className="mt-2 text-sm text-slate-600">{t('Chọn bản điều khoản áp dụng cho vai trò của bạn.')}</p>
      <ul className="mt-6 space-y-3">
        <li>
          <Link href="/terms/enterprise" className="block rounded-xl border border-slate-200 bg-white p-4 font-semibold text-teal-900 hover:bg-slate-50">
            {t('Dành cho Doanh nghiệp (nhà xuất khẩu)')}
          </Link>
        </li>
        <li>
          <Link href="/terms/buyer" className="block rounded-xl border border-slate-200 bg-white p-4 font-semibold text-teal-900 hover:bg-slate-50">
            {t('Dành cho Người mua')}
          </Link>
        </li>
      </ul>
    </main>
  );
}
