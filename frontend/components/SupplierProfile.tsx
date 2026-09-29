// Hồ sơ công khai của nhà xuất khẩu đã xác minh (B5, E3), render phía server.
// Không có email, mã số thuế hay địa chỉ chi tiết (backend không trả). Form RFQ (F1) ở cuối trang.
import React from 'react';
import { notFound } from 'next/navigation';
import RfqForm from './RfqForm';
import { Link } from '../i18n/navigation';
import { translateText, type Locale } from '../i18n/translate';
import { countryName, fetchProfile, industryLabel } from '../lib/suppliersApi';

export default async function SupplierProfile({ slug, locale }: { slug: string; locale: Locale }) {
  const t = (vi: string) => translateText(vi, locale);
  const profile = await fetchProfile(slug);
  if (!profile) notFound();
  const description = locale === 'en' ? (profile.description_en ?? profile.description_vi) : (profile.description_vi ?? profile.description_en);
  const badge = profile.verification_level === 'evfta_verified' ? 'EVFTA-verified' : t('Đã xác minh');

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <Link href="/suppliers" className="text-sm font-semibold text-slate-700 underline">
        {t('Quay lại danh bạ')}
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{profile.legal_name}</h1>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">{badge}</span>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {countryName(profile.country)}
        {profile.industry_sector && ` · ${t(industryLabel(profile.industry_sector) ?? profile.industry_sector)}`}
        {profile.founded_year && ` · ${t('Thành lập')} ${profile.founded_year}`}
      </p>
      {description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-800">{description}</p>}

      <section aria-label={t('Sản phẩm')} className="mt-8">
        <h2 className="text-lg font-bold text-slate-900">{t('Sản phẩm')}</h2>
        {profile.products.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">{t('Doanh nghiệp chưa đăng sản phẩm nào.')}</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {profile.products.map((p) => (
              <li key={p.name + p.hs_code} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <p className="font-semibold text-slate-900">{p.name}</p>
                <p className="mt-1 text-xs text-slate-600">
                  HS {p.hs_formatted} — {locale === 'en' ? p.hs_name_en : p.hs_name_vi}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <RfqForm products={profile.products.map((p) => ({ id: p.id, name: p.name, unit: p.unit }))} supplierName={profile.legal_name} />
    </div>
  );
}
