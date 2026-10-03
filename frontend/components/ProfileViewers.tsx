'use client';

// "Ai đã xem hồ sơ của bạn" (U9). Chỉ hiện tên buyer đã xác minh và không bật ẩn danh; khách, công ty
// chưa xác minh, seller khác và buyer ẩn danh chỉ được đếm (backend không trả tên của họ).
import React, { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import { countryName } from '../lib/companyApi';
import { getProfileViewers, type ProfileViewers as Viewers } from '../lib/dashboardApi';

const WINDOWS = [7, 30, 90] as const;

export default function ProfileViewers() {
  const { tr, language } = useLanguage();
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const [data, setData] = useState<Viewers | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void getProfileViewers(days).then((result) => {
      if (active) setData(result);
    });
    return () => {
      active = false;
    };
  }, [days]);

  const date = (iso: string) => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium' }).format(new Date(iso));

  return (
    <section aria-label={tr('Ai đã xem hồ sơ của bạn')} className="space-y-4 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Eye className="h-5 w-5 text-[#083832]" aria-hidden="true" />
          {tr('Ai đã xem hồ sơ của bạn')}
        </h2>
        <label className="text-xs font-semibold text-slate-700">
          {tr('Khoảng thời gian')}{' '}
          <select value={days} onChange={(e) => setDays(Number(e.target.value) as (typeof WINDOWS)[number])} className="ml-1 rounded-lg border border-slate-200 px-2 py-1 text-xs">
            {WINDOWS.map((w) => (
              <option key={w} value={w}>{tr(`${w} ngày qua`)}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        {tr('Chỉ hiện tên buyer đã xác minh và không bật chế độ ẩn danh. Các lượt xem khác chỉ được đếm, không lộ danh tính.')}
      </p>
      {data === null && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{tr('Không tải được dữ liệu lượt xem. Vui lòng thử lại.')}</p>
      )}
      {data && (
        <>
          <dl className="grid gap-3 sm:grid-cols-3">
            {[
              ['Tổng lượt xem', data.total_views],
              ['Khách chưa đăng nhập', data.guest_views],
              ['Doanh nghiệp ẩn danh', data.anonymous_company_views],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <dt className="text-xs font-semibold text-slate-600">{tr(label as string)}</dt>
                <dd className="mt-1 text-2xl font-extrabold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          {data.viewers.length === 0 ? (
            <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">
              {tr('Chưa có buyer đã xác minh nào xem hồ sơ trong khoảng này. Hồ sơ đầy đủ sản phẩm, năng lực và chứng nhận giúp buyer tìm thấy bạn.')}
            </p>
          ) : (
            <ul className="space-y-2">
              {data.viewers.map((v) => (
                <li key={`${v.legal_name}-${v.last_viewed_at}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                  <span>
                    <span className="block font-bold text-slate-900">{v.legal_name}</span>
                    <span className="block text-xs text-slate-600">
                      {tr(countryName(v.country))}
                      {v.business_type && ` · ${v.business_type}`}
                    </span>
                  </span>
                  <span className="text-right text-xs text-slate-600">
                    <span className="block">{tr(`${v.views} lượt xem`)}</span>
                    <span className="block">{tr('Gần nhất')}: {date(v.last_viewed_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {(data.hidden_viewers ?? 0) > 0 && (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" data-testid="viewers-upsell">
              {tr(`Còn ${data.hidden_viewers} buyer đã xác minh khác đã xem hồ sơ.`)}{' '}
              <Link href="/pricing" className="font-semibold underline">
                {tr('Mở danh sách đầy đủ')}
              </Link>
            </p>
          )}
        </>
      )}
    </section>
  );
}
