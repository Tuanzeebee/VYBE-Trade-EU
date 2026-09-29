// Trang Điều khoản / Bảo mật (E4), render phía server từ content/legal.
import React from 'react';
import { translateText, type Locale } from '../i18n/translate';
import { parseLegal, readLegalSource, type LegalPage } from '../lib/legalContent';

const TITLES: Record<LegalPage, string> = {
  'terms-buyer': 'Điều khoản sử dụng dành cho Người mua',
  'terms-enterprise': 'Điều khoản sử dụng dành cho Doanh nghiệp',
  privacy: 'Chính sách bảo mật',
};

export default function LegalPageView({ page, locale, dir }: { page: LegalPage; locale: Locale; dir?: string }) {
  const t = (vi: string) => translateText(vi, locale);
  const source = readLegalSource(page, locale, dir);
  const blocks = source ? parseLegal(source) : [];
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t(TITLES[page])}</h1>
      {blocks.length === 0 ? (
        <p role="status" className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          {t('Nội dung này đang được đội pháp lý hoàn thiện và sẽ được đăng sớm.')}
        </p>
      ) : (
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-800">
          {blocks.map((b, i) =>
            b.kind === 'p' ? (
              <p key={i}>{b.text}</p>
            ) : b.kind === 'h1' ? (
              <h2 key={i} className="pt-2 text-xl font-bold text-slate-900">{b.text}</h2>
            ) : (
              <h3 key={i} className="pt-1 text-lg font-bold text-slate-900">{b.text}</h3>
            ),
          )}
        </div>
      )}
    </main>
  );
}
