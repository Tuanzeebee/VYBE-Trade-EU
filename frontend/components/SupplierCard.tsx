// Thẻ nhà cung cấp (E3, U10): tên, MỘT huy hiệu "Đã xác minh", tỉnh/thành, nhóm hàng, mô tả ngắn, sản phẩm
// (sản phẩm khớp từ khóa được làm nổi bật) hoặc dịch vụ. Không dùng hook để render được phía server.
import React from 'react';
import { Link } from '../i18n/navigation';
import TierBadge from './TierBadge';
import { translateText, type Locale } from '../i18n/translate';
import { countryName, industryLabel, serviceCategoryLabel, type SupplierCardData } from '../lib/suppliersApi';

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
  const matched = new Set(supplier.matched_product_names ?? []);
  const services = supplier.service_titles ?? [];
  const serviceCategories = (supplier.service_categories ?? []).map((c) => t(serviceCategoryLabel(c)));
  const place = [supplier.city, countryName(supplier.country)].filter(Boolean).join(', ');

  return (
    <li className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5" aria-label={supplier.legal_name}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">
          <Link href={`/suppliers/${supplier.slug}`} className="hover:underline">
            {supplier.legal_name}
          </Link>
        </h2>
        <TierBadge tier={supplier.verification_tier ?? 1} locale={locale} />
      </div>
      <p className="mt-1 text-sm text-slate-600">
        <span data-testid="country">{place}</span>
        {categories.length > 0 && (
          <>
            {' · '}
            <span data-testid="categories">{categories.join(', ')}</span>
          </>
        )}
      </p>
      {description && <p className="mt-3 text-sm leading-relaxed text-slate-700">{description}</p>}
      {supplier.product_names.length > 0 && (
        <p className="mt-3 text-xs text-slate-600" data-testid="products">
          {t('Sản phẩm')}:{' '}
          {supplier.product_names.map((name, i) => (
            <React.Fragment key={name + i}>
              {i > 0 && ', '}
              {matched.has(name) ? <mark className="rounded bg-amber-100 px-0.5 font-semibold text-slate-900">{name}</mark> : name}
            </React.Fragment>
          ))}
          {supplier.product_count > supplier.product_names.length && ` (+${supplier.product_count - supplier.product_names.length})`}
        </p>
      )}
      {services.length > 0 && (
        <p className="mt-3 text-xs text-slate-600" data-testid="services">
          {t('Dịch vụ')}: {services.join(', ')}
          {serviceCategories.length > 0 && <span className="block text-slate-500">{serviceCategories.join(' · ')}</span>}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        {supplier.product_count > 0 && (
          <Link href={`/suppliers/${supplier.slug}#rfq`} className="rounded-xl bg-[#083832] px-4 py-2 text-sm font-semibold text-white hover:bg-[#062924]">
            {t('Yêu cầu báo giá')}
          </Link>
        )}
        <Link href={`/suppliers/${supplier.slug}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
          {t('Xem hồ sơ')}
        </Link>
      </div>
    </li>
  );
}
