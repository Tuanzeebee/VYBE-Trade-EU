// Thẻ nhà cung cấp (E3): tên, huy hiệu xác minh, nhóm hàng, quốc gia, mô tả ngắn theo ngôn ngữ và nút yêu cầu báo giá.
// Không dùng hook để render được phía server. Chuỗi hiển thị qua translateText (catalog vi/en).
import React from 'react';
import { Link } from '../i18n/navigation';
import { translateText, type Locale } from '../i18n/translate';
import { countryName, industryLabel, type SupplierCardData } from '../lib/suppliersApi';

const DESCRIPTION_LIMIT = 160;

export function shortDescription(supplier: SupplierCardData, locale: Locale): string | null {
  const text = (locale === 'en' ? supplier.description_en ?? supplier.description_vi : supplier.description_vi ?? supplier.description_en)?.trim();
  if (!text) return null;
  return text.length > DESCRIPTION_LIMIT ? `${text.slice(0, DESCRIPTION_LIMIT).trimEnd()}…` : text;
}

export default function SupplierCard({ supplier, locale }: { supplier: SupplierCardData; locale: Locale }) {
  const t = (vi: string) => translateText(vi, locale);
  const description = shortDescription(supplier, locale);
  const categories = supplier.categories.map((c) => t(industryLabel(c) ?? c));
  const verifiedLabel = supplier.verification_level === 'evfta_verified' ? 'EVFTA-verified' : t('Đã xác minh');

  return (
    <li className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5" aria-label={supplier.legal_name}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">
          <Link href={`/suppliers/${supplier.slug}`} className="hover:underline">
            {supplier.legal_name}
          </Link>
        </h2>
        <span
          data-testid="verified-badge"
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${supplier.verification_level === 'evfta_verified' ? 'bg-emerald-100 text-emerald-900' : 'bg-teal-50 text-teal-900'}`}
        >
          {verifiedLabel}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        <span data-testid="country">{countryName(supplier.country)}</span>
        {categories.length > 0 && (
          <>
            {' · '}
            <span data-testid="categories">{categories.join(', ')}</span>
          </>
        )}
      </p>
      {description && <p className="mt-3 text-sm leading-relaxed text-slate-700">{description}</p>}
      {supplier.product_names.length > 0 && (
        <p className="mt-3 text-xs text-slate-600">
          {t('Sản phẩm')}: {supplier.product_names.join(', ')}
          {supplier.product_count > supplier.product_names.length && ` (+${supplier.product_count - supplier.product_names.length})`}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={`/suppliers/${supplier.slug}?rfq=1`}
          className="rounded-xl bg-[#083832] px-4 py-2 text-sm font-semibold text-white hover:bg-[#062924]"
        >
          {t('Yêu cầu báo giá')}
        </Link>
        <Link href={`/suppliers/${supplier.slug}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
          {t('Xem hồ sơ')}
        </Link>
      </div>
    </li>
  );
}
