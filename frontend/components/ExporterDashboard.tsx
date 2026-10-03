'use client';

// Dashboard nhà xuất khẩu (G1): sáu ô lấy số thật; ô chưa có dữ liệu hiện hướng dẫn.
import React, { useEffect, useState } from 'react';
import DashboardTile from './DashboardTile';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import { fetchExporterDashboard, type ExporterDashboardData } from '../lib/dashboardApi';
import { STATUS_LABELS, type RfqStatus } from '../lib/rfqApi';
import { PageLoader } from './PageLoader';

const VERIFICATION_LABELS: Record<string, string> = {
  unverified: 'Chưa xác minh',
  pending: 'Đang chờ duyệt',
  verified: 'Đã xác minh',
  rejected: 'Bị từ chối',
};

export default function ExporterDashboard() {
  const { tr, language } = useLanguage();
  const [data, setData] = useState<ExporterDashboardData | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetchExporterDashboard().then((d) => active && setData(d));
    return () => {
      active = false;
    };
  }, []);

  if (data === undefined) return <PageLoader />;
  if (data === null) {
    return (
      <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
        {tr('Không tải được bảng điều khiển. Vui lòng thử lại.')}
      </p>
    );
  }
  const money = (value: string) => new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'vi-VN', { style: 'currency', currency: 'EUR' }).format(Number(value));
  const date = (iso: string) => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium' }).format(new Date(iso));
  const big = 'text-3xl font-extrabold text-[#083832]';

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <DashboardTile title="Hoàn thiện hồ sơ" hint={data.completeness.empty_hint_key}>
        {data.completeness.data && (
          <>
            <p className={big}>{Number(data.completeness.data.score)}%</p>
            {data.completeness.data.missing.length > 0 && (
              <>
                <p className="mt-2 text-xs font-semibold text-slate-600">{tr('Còn thiếu')}:</p>
                <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
                  {data.completeness.data.missing.slice(0, 4).map((m) => (
                    <li key={m.field}>{m.field}</li>
                  ))}
                </ul>
                <Link href="/exporter/profile" className="mt-2 inline-block text-sm font-semibold text-teal-800 underline">
                  {tr('Hoàn thiện hồ sơ')}
                </Link>
              </>
            )}
          </>
        )}
      </DashboardTile>

      <DashboardTile title="Lượt xem hồ sơ tuần này" hint={data.profile_views.empty_hint_key}>
        {data.profile_views.data && (
          <>
            <p className={big}>{data.profile_views.data.this_week}</p>
            <p className="text-xs text-slate-600">
              {tr('Tuần trước')}: {data.profile_views.data.previous_week}
            </p>
            <Link href="/exporter/profile-views" className="mt-2 inline-block text-xs font-semibold text-teal-800 underline">
              {tr('Xem ai đã xem hồ sơ')}
            </Link>
          </>
        )}
      </DashboardTile>

      <DashboardTile title="Yêu cầu báo giá" hint={data.rfqs.empty_hint_key}>
        {data.rfqs.data && data.rfqs.data.total > 0 && (
          <>
            <p className={big}>{data.rfqs.data.counts.new ?? 0}</p>
            <p className="text-xs text-slate-600">
              {tr('mới')} · {tr('tổng')} {data.rfqs.data.total} · {data.rfqs.data.new_this_week} {tr('trong 7 ngày')}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {data.rfqs.data.recent.map((r) => (
                <li key={r.id}>
                  {r.counterpart_name} — {r.product_name} ({tr(STATUS_LABELS[r.status as RfqStatus] ?? r.status)})
                </li>
              ))}
            </ul>
          </>
        )}
      </DashboardTile>

      <DashboardTile title="Xác minh doanh nghiệp" hint={data.verification.empty_hint_key}>
        {data.verification.data && (
          <>
            <p className="text-xl font-bold text-slate-900">{tr(VERIFICATION_LABELS[data.verification.data.status] ?? data.verification.data.status)}</p>
            {data.verification.data.days_left !== null && data.verification.data.expires_at && (
              <p className="mt-1 text-sm text-slate-700">
                {tr('Còn')} <strong>{data.verification.data.days_left}</strong> {tr('ngày')} ({tr('hết hạn')} {date(data.verification.data.expires_at)})
              </p>
            )}
          </>
        )}
      </DashboardTile>

      <DashboardTile title="Tiết kiệm thuế ước tính" hint={data.tariff_savings.empty_hint_key}>
        {data.tariff_savings.data && data.tariff_savings.data.runs > 0 && (
          <>
            <p className={big}>{money(data.tariff_savings.data.total_eur)}</p>
            <p className="text-xs text-slate-600">
              {tr('từ')} {data.tariff_savings.data.runs} {tr('lần tính')}
            </p>
          </>
        )}
        <Link href="/tools/tariff" className="mt-2 inline-block text-sm font-semibold text-teal-800 underline">
          {tr('Mở công cụ tính thuế')}
        </Link>
      </DashboardTile>

      <DashboardTile title="Câu hỏi gần đây cho trợ lý" hint={data.copilot.empty_hint_key}>
        {data.copilot.data.length > 0 && (
          <ul className="space-y-1 text-sm text-slate-700">
            {data.copilot.data.map((q) => (
              <li key={q.id}>{q.question}</li>
            ))}
          </ul>
        )}
        <Link href="/copilot" className="mt-2 inline-block text-sm font-semibold text-teal-800 underline">
          {tr('Hỏi trợ lý')}
        </Link>
      </DashboardTile>
    </div>
  );
}
