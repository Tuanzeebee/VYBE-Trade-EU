// Thẻ nhà cung cấp (E3, U10): kiểu thẻ marketplace — khung ảnh sản phẩm tiêu biểu, MỘT huy hiệu "Đã xác minh",
// tỉnh/thành, nhóm hàng, giá tham khảo và MOQ, mô tả ngắn, sản phẩm (khớp từ khóa được làm nổi bật) hoặc dịch vụ.
// Công ty dữ liệu giả lập có nhãn "Dữ liệu minh hoạ". Không dùng hook để render được phía server.
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

const numberLocale = (locale: Locale) => (locale === 'en' ? 'en-GB' : 'vi-VN');
const amount = (value: string | null | undefined, locale: Locale) =>
  value == null ? null : new Intl.NumberFormat(numberLocale(locale), { maximumFractionDigits: 2 }).format(Number(value));

/** "Từ 4 USD/kg" hoặc khoảng giá; null khi sản phẩm tiêu biểu chưa có giá. */
export function priceLabel(product: SupplierCardData['featured_product'], locale: Locale): string | null {
  const low = amount(product?.price_min, locale);
  if (!product || low === null) return null;
  const high = amount(product.price_max, locale);
  const range = high && high !== low ? `${low}–${high}` : low;
  return `${range} ${product.currency ?? ''}${product.unit ? `/${product.unit}` : ''}`.trim();
}

export function moqLabel(product: SupplierCardData['featured_product'], locale: Locale): string | null {
  const moq = amount(product?.moq, locale);
  return moq === null ? null : `${moq}${product?.moq_unit ? ` ${product.moq_unit}` : ''}`;
}

export default function SupplierCard({ supplier, locale }: { supplier: SupplierCardData; locale: Locale }) {
  const t = (vi: string) => translateText(vi, locale);
  const description = shortDescription(supplier, locale);
  const categories = supplier.categories.map((c) => t(industryLabel(c) ?? c));
  const matched = new Set(supplier.matched_product_names ?? []);
  const services = supplier.service_titles ?? [];
  const serviceCategories = (supplier.service_categories ?? []).map((c) => t(serviceCategoryLabel(c)));
  const place = [supplier.city, countryName(supplier.country)].filter(Boolean).join(', ');
  const featured = supplier.featured_product;
  const price = priceLabel(featured, locale);
  const moq = moqLabel(featured, locale);

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label={supplier.legal_name}>
      <Link href={`/suppliers/${supplier.slug}`} className="relative block aspect-[4/3] bg-gradient-to-br from-emerald-50 to-teal-100" tabIndex={-1} aria-hidden="true">
        {featured?.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={featured.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span data-testid="card-placeholder" className="flex h-full items-center justify-center px-4 text-center text-sm font-semibold text-teal-900/70">
            {categories[0] ?? featured?.name ?? supplier.legal_name}
          </span>
        )}
        {supplier.is_demo && (
          <span data-testid="demo-badge" className="absolute left-3 top-3 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
            {t('Dữ liệu minh hoạ')}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
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
      {price && (
        <p className="mt-3 text-sm text-slate-900" data-testid="price">
          <span className="text-slate-600">{t('Từ')} </span>
          <strong>{price}</strong>
          {moq && (
            <span className="text-slate-600" data-testid="moq">
              {' · '}
              {t('Đặt tối thiểu')} {moq}
            </span>
          )}
        </p>
      )}
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
      </div>
    </li>
  );
}
