'use client';
// Trang "Hành trình" (N1, N3): MỘT việc tiếp theo, hai thanh tiến độ, vài chỉ số nhỏ.
import React from 'react';
import DashboardTile from './DashboardTile';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import type { ExporterDashboardData } from '../lib/dashboardApi';
import { STEP_META, type StepKey } from '../lib/journey';
import type { WorkspaceTabId } from './SellerWorkspace';

function Bar({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold text-slate-700">
        <span>{label}</span>
        <span>
          {done}/{total}
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-100" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-2 rounded-full bg-teal-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function JourneyHome({ data, onGoTab }: { data: ExporterDashboardData | null | undefined; onGoTab: (tab: WorkspaceTabId) => void }) {
  const { tr, language } = useLanguage();
  if (data === undefined) return <p role="status" className="text-sm text-slate-600">{tr('Đang tải…')}</p>;
  if (data === null) {
    return (
      <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
        {tr('Không tải được bảng điều khiển. Vui lòng thử lại.')}
      </p>
    );
  }
  const money = (v: string) => new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'vi-VN', { style: 'currency', currency: 'EUR' }).format(Number(v));
  const j = data.journey;
  const next = j.next_step ? STEP_META[j.next_step as StepKey] : null;
  const big = 'text-3xl font-extrabold text-[#083832]';
  const btn = 'mt-4 inline-block rounded-xl bg-[#083832] px-5 py-2.5 text-sm font-semibold text-white';
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-teal-200 bg-teal-50/60 p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-teal-800">{tr('Việc tiếp theo')}</p>
        {next ? (
          <>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">{tr(next.label)}</h2>
            <p className="mt-1 text-sm text-slate-700">{tr(next.hint)}</p>
            {next.tab ? (
              <button type="button" onClick={() => onGoTab(next.tab as WorkspaceTabId)} className={btn}>
                {tr('Bắt đầu')}
              </button>
            ) : (
              <Link href={next.href as string} className={btn}>
                {tr('Bắt đầu')}
              </Link>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-700">{tr('Bạn đã hoàn thành các bước chính. Theo dõi Request mới ở mục Bán hàng.')}</p>
        )}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Bar label={tr('Hoàn thiện sản phẩm')} done={j.product_done} total={j.product_total} />
          <Bar label={tr('Bán hàng')} done={j.sales_done} total={j.sales_total} />
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <DashboardTile title="Lượt xem hồ sơ tuần này" hint={data.profile_views.empty_hint_key}>
          {data.profile_views.data && <p className={big}>{data.profile_views.data.this_week}</p>}
        </DashboardTile>
        <DashboardTile title="Request mới" hint={data.rfqs.empty_hint_key}>
          {data.rfqs.data && data.rfqs.data.total > 0 && <p className={big}>{data.rfqs.data.counts.new ?? 0}</p>}
        </DashboardTile>
        <DashboardTile title="Tiết kiệm thuế ước tính" hint={data.tariff_savings.empty_hint_key}>
          {data.tariff_savings.data && data.tariff_savings.data.runs > 0 && <p className={big}>{money(data.tariff_savings.data.total_eur)}</p>}
        </DashboardTile>
      </div>
    </div>
  );
}
