'use client';

// Tình trạng hạn ngạch (C2-C): chu kỳ, số dư, tỷ trọng lô, cách phân bổ, giấy phép và giá trị kinh tế
// kèm điểm hòa vốn. Không có số dư thì nói "chưa biết", không hiểu thành "còn hạn ngạch".
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { TariffResult } from '../lib/tariffApi';

type Quota = NonNullable<TariffResult['quota']>;

const STATUS = {
  open: { text: 'Còn hạn ngạch', tone: 'bg-emerald-100 text-emerald-800', bar: 'bg-emerald-500' },
  low: { text: 'Sắp hết', tone: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500' },
  exhausted: { text: 'Đã hết', tone: 'bg-rose-100 text-rose-800', bar: 'bg-rose-500' },
  unknown: { text: 'Chưa biết số dư', tone: 'bg-slate-100 text-slate-700', bar: 'bg-slate-400' },
} as const;

const METHOD: Record<string, string> = {
  IMPORTER_FIRST_COME: 'Nước nhập khẩu cấp theo thứ tự nộp hồ sơ',
  IMPORT_LICENCE: 'Nhà nhập khẩu cần có giấy phép nhập khẩu do cơ quan nước nhập cấp',
  EXPORT_LICENCE: 'Cơ quan nước xuất khẩu cấp giấy phép',
  ALLOCATION: 'Phân bổ theo hạn mức cho từng doanh nghiệp',
  OTHER: 'Cách phân bổ khác (xem ghi chú)',
};

export default function QuotaInsights({ quota, money, unit }: { quota: Quota; money: (v: string) => string; unit: string }) {
  const { tr, language } = useLanguage();
  const locale = language === 'en' ? 'en-GB' : 'vi-VN';
  const date = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale);
  const number = (v: string) => Number(v).toLocaleString(locale);
  const volumeUnit = quota.volume_unit === 'tonne' ? tr('tấn') : quota.volume_unit;
  const balance = quota.balance;
  const status = STATUS[balance?.status ?? 'unknown'];
  const economics = quota.economics;

  return (
    <div data-testid="quota-insights" className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">{tr('Tình trạng hạn ngạch')}</h3>

      <div data-testid="quota-period" className="text-slate-700">
        {quota.period_start && quota.period_end ? (
          <>
            {tr('Chu kỳ')}: {date(quota.period_start)} – {date(quota.period_end)}
            {quota.in_period === true && quota.days_left !== null && (
              <span className="ml-2 font-semibold text-slate-900">
                {tr('còn')} {quota.days_left} {tr('ngày')}
              </span>
            )}
            {quota.in_period === false && (
              <p className="mt-1 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{tr('Ngày nhập khẩu nằm ngoài chu kỳ của hạn ngạch này.')}</p>
            )}
          </>
        ) : (
          <span className="text-slate-500">{tr('Chưa có thông tin chu kỳ của hạn ngạch.')}</span>
        )}
      </div>

      <div data-testid="quota-balance">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-700">{tr('Số dư')}:</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.tone}`}>{tr(status.text)}</span>
        </div>
        {balance && balance.status !== 'unknown' && balance.remaining != null && balance.remaining_pct != null ? (
          <>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>
              <div className={`h-full ${status.bar}`} style={{ width: `${Math.min(100, Math.max(0, Number(balance.remaining_pct)))}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {tr('Còn')} {number(balance.remaining)} / {number(quota.volume)} {volumeUnit} ({Number(balance.remaining_pct)}%)
              {balance.as_of ? ` · ${tr('tại ngày')} ${date(balance.as_of)}` : ''}
              {balance.source ? ` · ${tr('nguồn')}: ${balance.source}` : ''}
            </p>
            {balance.stale && (
              <p className="mt-1 rounded-lg bg-amber-50 p-2 text-xs text-amber-900" data-testid="quota-balance-stale">
                {tr('Số liệu đã cũ, số dư thực tế có thể đã thay đổi.')}
              </p>
            )}
          </>
        ) : (
          <p className="mt-1 text-xs text-slate-600">
            {tr('Chưa có số liệu số dư nên không thể khẳng định hạn ngạch còn hay đã hết. Hãy xác nhận với nhà nhập khẩu trước khi chốt giá.')}
          </p>
        )}
      </div>

      {quota.share_pct !== null && quota.share_pct !== undefined && (
        <p className="text-slate-700" data-testid="quota-share">
          {tr('Lô hàng này chiếm')} <strong>{Number(quota.share_pct)}%</strong> {tr('tổng hạn ngạch')}
        </p>
      )}

      {(quota.allocation_method || quota.licence_required) && (
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700" data-testid="quota-access">
          {quota.allocation_method && <li>{tr(METHOD[quota.allocation_method] ?? quota.allocation_method)}</li>}
          {quota.licence_required && (
            <li>
              {tr('Cần giấy phép / chứng nhận')}
              {quota.licence_issuer_vi ? `: ${quota.licence_issuer_vi}` : ''}
            </li>
          )}
        </ul>
      )}

      {economics && (
        <div data-testid="quota-economics" className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{tr('Giá trị của hạn ngạch')}</p>
          <p className="mt-1 text-slate-800">
            <strong>{money(economics.savings)}</strong> {tr('cho lô này')} ({Number(economics.savings_pct_of_value)}% {tr('trị giá tính thuế')})
            {economics.savings_per_unit !== null ? ` · ${money(economics.savings_per_unit)}/${unit || volumeUnit}` : ''}
          </p>
          {economics.net_benefit !== null && economics.worthwhile !== null && (
            <p className="mt-2 text-slate-800" data-testid="quota-break-even">
              {tr('Sau chi phí để có hạn ngạch')} ({money(economics.access_cost ?? '0')}): {tr('lợi ích ròng')} <strong>{money(economics.net_benefit)}</strong>{' '}
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  economics.worthwhile ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {tr(economics.worthwhile ? 'Đáng để xin hạn ngạch' : 'Chưa đáng để xin hạn ngạch')}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
