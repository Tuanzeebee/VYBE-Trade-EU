// Danh bạ nhà cung cấp công khai (E2), render phía server. Bộ lọc là form GET nên dùng được cả khi chưa tải JS.
// Backend chỉ trả công ty đã xác minh (AGENTS.md §6.10); ở đây không có đường lọc nào khác.
import React from 'react';
import SupplierCard from './SupplierCard';
import { Link } from '../i18n/navigation';
import { translateText, type Locale } from '../i18n/translate';
import { INDUSTRIES } from '../lib/companyApi';
import { fetchFilterOptions, fetchSuppliers, SUPPLIER_COUNTRIES, toSearch, type SupplierQuery } from '../lib/suppliersApi';

const field =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]';
const label = 'block text-xs font-semibold text-slate-700';

export default async function SupplierDirectory({ query, locale }: { query: SupplierQuery; locale: Locale }) {
  const t = (vi: string) => translateText(vi, locale);
  const [result, options] = await Promise.all([fetchSuppliers(query), fetchFilterOptions()]);
  const page = result?.page ?? query.page ?? 1;
  const pages = result ? Math.max(1, Math.ceil(result.total / result.page_size)) : 1;
  const categories = options?.categories ?? INDUSTRIES.map((i) => i.code);
  const certificates = options?.certificates ?? [];

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t('Nhà cung cấp Việt Nam đã xác minh')}</h1>
      <p className="mt-2 text-sm text-slate-600">{t('Chỉ những doanh nghiệp đã được xác minh mới xuất hiện trong danh bạ.')}</p>

      <form method="get" className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label htmlFor="sup-q" className={label}>
            {t('Tìm theo tên công ty, sản phẩm, mã HS hoặc chứng nhận')}
          </label>
          <input id="sup-q" name="q" defaultValue={query.q ?? ''} maxLength={100} className={field} />
        </div>
        <div>
          <label htmlFor="sup-hs" className={label}>
            {t('Mã HS')}
          </label>
          <input id="sup-hs" name="hs" defaultValue={query.hs ?? ''} placeholder="1006.30" className={field} />
        </div>
        <div>
          <label htmlFor="sup-country" className={label}>
            {t('Quốc gia')}
          </label>
          <select id="sup-country" name="country" defaultValue={query.country ?? ''} className={field}>
            <option value="">{t('Tất cả')}</option>
            {SUPPLIER_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sup-category" className={label}>
            {t('Nhóm hàng')}
          </label>
          <select id="sup-category" name="category" defaultValue={query.category ?? ''} className={field}>
            <option value="">{t('Tất cả')}</option>
            {categories.map((code) => (
              <option key={code} value={code}>
                {t(INDUSTRIES.find((i) => i.code === code)?.label ?? code)}
              </option>
            ))}
          </select>
        </div>
        {certificates.length > 0 && (
          <div>
            <label htmlFor="sup-cert" className={label}>
              {t('Chứng nhận')}
            </label>
            <select id="sup-cert" name="cert" defaultValue={query.cert ?? ''} className={field}>
              <option value="">{t('Tất cả')}</option>
              {certificates.map((c) => (
                <option key={c.code} value={c.code}>
                  {locale === 'en' ? c.name_en : c.name_vi}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-end">
          <button type="submit" className="w-full rounded-xl bg-[#083832] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#062924] sm:w-auto">
            {t('Tìm kiếm')}
          </button>
        </div>
      </form>

      {result === null ? (
        <p role="alert" className="mt-8 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          {t('Không tải được danh bạ. Vui lòng thử lại.')}
        </p>
      ) : result.items.length === 0 ? (
        <p role="status" className="mt-8 rounded-xl bg-white p-6 text-sm text-slate-700">
          {t('Chưa có nhà cung cấp phù hợp. Hãy thử bỏ bớt bộ lọc hoặc đổi từ khóa.')}
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-600" role="status">
            {result.total} {t('nhà cung cấp')}
          </p>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {result.items.map((supplier) => (
              <SupplierCard key={supplier.slug} supplier={supplier} locale={locale} />
            ))}
          </ul>
          {pages > 1 && (
            <nav aria-label={t('Phân trang')} className="mt-8 flex items-center justify-between">
              {page > 1 ? (
                <Link href={`/suppliers${toSearch(query, { page: page - 1 })}`} rel="prev" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">
                  {t('Trang trước')}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-slate-600">
                {page} / {pages}
              </span>
              {page < pages ? (
                <Link href={`/suppliers${toSearch(query, { page: page + 1 })}`} rel="next" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">
                  {t('Trang sau')}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
