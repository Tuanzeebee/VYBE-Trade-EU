// Hồ sơ công khai của nhà cung cấp đã xác minh (B5, E3; bố cục U10), render phía server. Thứ tự:
// tiêu đề (huy hiệu) → giới thiệu → bản đồ → dữ liệu đã kiểm → năng lực → sản phẩm → dịch vụ → RFQ.
// Không có email, mã số thuế hay địa chỉ chi tiết (backend không trả); địa chỉ nhà máy chỉ hiện khi
// doanh nghiệp đồng ý công khai, mặc định bản đồ ở mức tỉnh/thành.
import React from 'react';
import { notFound } from 'next/navigation';
import { BadgeCheck, CalendarCheck, FileCheck2, MapPin } from 'lucide-react';
import RfqForm from './RfqForm';
import { Link } from '../i18n/navigation';
import { translateText, type Locale } from '../i18n/translate';
import { COMPANY_SIZES, FACILITY_CODE_TYPES } from '../lib/companyApi';
import { UNITS, formatPackaging, formatTiers } from '../lib/productsApi';
import {
  countryName,
  fetchCredentials,
  fetchProfile,
  industryLabel,
  serviceCategoryLabel,
  type PublicProfile,
} from '../lib/suppliersApi';
import ProfileViewBeacon from './ProfileViewBeacon';
import MessageSupplier from './MessageSupplier';

/** Địa điểm cho bản đồ nhúng (Google Maps, không cần khóa API): chính xác khi doanh nghiệp đồng ý,
 * ngược lại chỉ tỉnh/thành + quốc gia. */
export function mapQuery(profile: Pick<PublicProfile, 'location_public' | 'latitude' | 'longitude' | 'factory_address' | 'city' | 'country'>): {
  query: string;
  precise: boolean;
} {
  if (profile.location_public && profile.latitude != null && profile.longitude != null) {
    return { query: `${profile.latitude},${profile.longitude}`, precise: true };
  }
  if (profile.location_public && profile.factory_address) return { query: profile.factory_address, precise: true };
  return { query: [profile.city, countryName(profile.country)].filter(Boolean).join(', '), precise: false };
}

const section = 'mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6';
const heading = 'text-lg font-bold text-slate-900';

export default async function SupplierProfile({ slug, locale }: { slug: string; locale: Locale }) {
  const t = (vi: string) => translateText(vi, locale);
  const [profile, credentials] = await Promise.all([fetchProfile(slug), fetchCredentials(slug)]);
  if (!profile) notFound();
  const description = locale === 'en' ? (profile.description_en ?? profile.description_vi) : (profile.description_vi ?? profile.description_en);
  const date = (iso: string) => new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium' }).format(new Date(iso));
  const map = mapQuery(profile);
  const unit = (code: string | null | undefined) => (code ? t(UNITS.find((u) => u.code === code)?.label ?? code) : '');
  const size = COMPANY_SIZES.find((s) => s.code === profile.company_size)?.label;
  const hasProducts = profile.products.length > 0;
  const verifiedAt = credentials?.verified_at ?? profile.verified_at;
  const facilityCodes = profile.facility_codes ?? [];
  const services = profile.services ?? [];

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <Link href="/suppliers" className="text-sm font-semibold text-slate-700 underline">
        {t('Quay lại danh bạ')}
      </Link>

      {/* Tiêu đề */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{profile.legal_name}</h1>
        <span
          data-testid="verified-badge"
          title={verifiedAt ? `${t('Xác minh bởi VYBE Trade')} · ${date(verifiedAt)}` : t('Xác minh bởi VYBE Trade')}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900"
        >
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t('Đã xác minh')}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {[profile.city, countryName(profile.country)].filter(Boolean).join(', ')}
        {profile.industry_sector && ` · ${t(industryLabel(profile.industry_sector) ?? profile.industry_sector)}`}
        {profile.founded_year && ` · ${t('Thành lập')} ${profile.founded_year}`}
      </p>
      <div className="mt-5 flex flex-wrap items-start gap-3">
        <MessageSupplier slug={slug} supplierName={profile.legal_name} />
        {hasProducts && (
          <a href="#rfq" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            {t('Yêu cầu báo giá')}
          </a>
        )}
      </div>

      {/* Giới thiệu */}
      {description && (
        <section aria-label={t('Giới thiệu')} className={section}>
          <h2 className={heading}>{t('Giới thiệu')}</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-800">{description}</p>
          {profile.website && (
            <p className="mt-3 text-sm">
              <a href={profile.website} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-teal-800 underline">
                {profile.website}
              </a>
            </p>
          )}
        </section>
      )}

      {/* Bản đồ */}
      <section aria-label={t('Vị trí')} className={section}>
        <h2 className={`${heading} flex items-center gap-2`}>
          <MapPin className="h-5 w-5 text-[#083832]" aria-hidden="true" />
          {t('Vị trí')}
        </h2>
        <p className="mt-1 text-xs text-slate-600" data-testid="map-precision">
          {map.precise ? t('Địa chỉ nhà máy (doanh nghiệp đồng ý công khai)') : t('Hiển thị ở mức tỉnh/thành phố')}
          {map.precise && profile.factory_address ? `: ${profile.factory_address}` : ''}
        </p>
        <iframe
          title={t('Bản đồ vị trí nhà cung cấp')}
          src={`https://maps.google.com/maps?q=${encodeURIComponent(map.query)}&z=${map.precise ? 14 : 8}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="mt-3 h-64 w-full rounded-xl border border-slate-200"
        />
      </section>

      {/* Dữ liệu đã kiểm */}
      <section aria-label={t('Dữ liệu đã kiểm')} className={section}>
        <h2 className={heading}>{t('Dữ liệu đã kiểm')}</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-800">
          <li className="flex items-start gap-2">
            <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
            <span>
              {t('Pháp lý doanh nghiệp được VYBE Trade đối chiếu')}
              {verifiedAt && ` · ${date(verifiedAt)}`}
              {credentials?.expires_at && ` · ${t('Hiệu lực đến')} ${date(credentials.expires_at)}`}
            </span>
          </li>
          {credentials?.origin_evidence_complete && (
            <li className="flex items-start gap-2">
              <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
              <span>{t('Đủ bằng chứng xuất xứ bắt buộc')}</span>
            </li>
          )}
        </ul>
        <h3 className="mt-5 text-sm font-bold text-slate-900">{t('Chứng nhận còn hạn')}</h3>
        {credentials && credentials.certificates.length > 0 ? (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {credentials.certificates.map((c, i) => (
              <li key={c.type_code + i} className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                <strong className="block text-sm text-slate-900">{locale === 'en' ? c.name_en : c.name_vi}</strong>
                {c.issuer && <span className="block">{t('Tổ chức cấp')}: {c.issuer}</span>}
                <span className="block">{c.expires_at ? `${t('Còn hạn đến')} ${date(c.expires_at)}` : t('Không ghi thời hạn')}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-slate-600">{t('Chưa có chứng nhận được duyệt để công khai.')}</p>
        )}
      </section>

      {/* Năng lực */}
      <section aria-label={t('Năng lực đáp ứng')} className={section}>
        <h2 className={heading}>{t('Năng lực đáp ứng')}</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          {profile.capacity_value && (
            <div>
              <dt className="text-xs font-semibold text-slate-500">{t('Sản lượng có thể cung cấp')}</dt>
              <dd className="text-slate-900">
                {String(Number(profile.capacity_value))} {unit(profile.capacity_unit)} / {t(profile.capacity_period === 'month' ? 'tháng' : 'năm')}
              </dd>
            </div>
          )}
          {size && (
            <div>
              <dt className="text-xs font-semibold text-slate-500">{t('Quy mô nhân sự')}</dt>
              <dd className="text-slate-900">{t(size)}</dd>
            </div>
          )}
          {profile.export_markets.length > 0 && (
            <div>
              <dt className="text-xs font-semibold text-slate-500">{t('Thị trường đã xuất khẩu')}</dt>
              <dd className="text-slate-900">{profile.export_markets.map((m) => (m.length === 2 ? countryName(m) : m)).join(', ')}</dd>
            </div>
          )}
          {profile.languages_spoken.length > 0 && (
            <div>
              <dt className="text-xs font-semibold text-slate-500">{t('Ngôn ngữ giao dịch')}</dt>
              <dd className="text-slate-900">{profile.languages_spoken.join(', ').toUpperCase()}</dd>
            </div>
          )}
          {facilityCodes.map((f) => (
            <div key={f.code_type + f.code}>
              <dt className="text-xs font-semibold text-slate-500">{t(FACILITY_CODE_TYPES.find((x) => x.code === f.code_type)?.label ?? 'Mã cơ sở')}</dt>
              <dd className="text-slate-900">{f.code}</dd>
            </div>
          ))}
        </dl>
        {!profile.capacity_value && !size && profile.export_markets.length === 0 && facilityCodes.length === 0 && (
          <p className="mt-2 text-xs text-slate-600">{t('Doanh nghiệp chưa công bố thông tin năng lực.')}</p>
        )}
      </section>

      {/* Sản phẩm */}
      {profile.offering_type !== 'services' && (
        <section aria-label={t('Sản phẩm')} className={section}>
          <h2 className={heading}>{t('Sản phẩm')}</h2>
          {!hasProducts ? (
            <p className="mt-2 text-sm text-slate-600">{t('Doanh nghiệp chưa đăng sản phẩm nào.')}</p>
          ) : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {profile.products.map((p) => {
                const tiers = formatTiers(p, t);
                return (
                  <li key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
                    {p.images[0] && <img src={p.images[0]} alt={p.name} className="h-40 w-full object-cover" loading="lazy" />}
                    <div className="p-4">
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        HS {p.hs_formatted} — {locale === 'en' ? p.hs_name_en : p.hs_name_vi}
                      </p>
                      {tiers.length > 0 ? (
                        <ul className="mt-2 space-y-0.5 text-xs text-slate-800" aria-label={t('Bậc giá')}>
                          {tiers.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      ) : (
                        p.price_min && (
                          <p className="mt-2 text-xs text-slate-800">
                            {p.price_min}
                            {p.price_max && p.price_max !== p.price_min ? ` – ${p.price_max}` : ''} {p.currency}
                            {p.unit ? ` / ${unit(p.unit)}` : ''}
                          </p>
                        )
                      )}
                      {p.moq && (
                        <p className="mt-1 text-xs text-slate-600">
                          MOQ: {String(Number(p.moq))} {unit(p.moq_unit)}
                        </p>
                      )}
                      {(p.packagings ?? []).length > 0 && (
                        <p className="mt-1 text-xs text-slate-600">
                          {t('Quy cách')}: {(p.packagings ?? []).map((x) => formatPackaging(x, t)).join('; ')}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Dịch vụ */}
      {services.length > 0 && (
        <section aria-label={t('Dịch vụ')} className={section}>
          <h2 className={heading}>{t('Dịch vụ')}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <li key={s.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                <p className="font-semibold text-slate-900">{s.title}</p>
                <p className="mt-1 text-xs text-slate-600">{t(serviceCategoryLabel(s.category_code))}</p>
                {(locale === 'en' ? s.description_en ?? s.description_vi : s.description_vi ?? s.description_en) && (
                  <p className="mt-2 text-xs text-slate-700">{locale === 'en' ? s.description_en ?? s.description_vi : s.description_vi ?? s.description_en}</p>
                )}
                {s.coverage_countries.length > 0 && (
                  <p className="mt-1 text-xs text-slate-600">
                    {t('Phạm vi')}: {s.coverage_countries.map((c) => (c.length === 2 ? countryName(c) : c)).join(', ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProfileViewBeacon slug={slug} />
      {hasProducts && <RfqForm products={profile.products.map((p) => ({ id: p.id, name: p.name, unit: p.unit }))} supplierName={profile.legal_name} />}
    </div>
  );
}
