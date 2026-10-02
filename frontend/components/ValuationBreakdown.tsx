'use client';

// Bảng phân rã "cách tính" của máy tính thuế (C2-A): từ giá hóa đơn đến trị giá tính thuế, rồi thuế MFN,
// thuế ưu đãi và khoản tiết kiệm; kèm ngày/bậc thuế áp dụng và cảnh báo (mã cảnh báo do backend trả).
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { TariffResult } from '../lib/tariffApi';
import { VALUATION_WARNINGS } from '../lib/tariffApi';

const STEP_LABEL = {
  invoice: 'Giá hóa đơn',
  freight: 'Cước vận chuyển quốc tế',
  insurance: 'Bảo hiểm hàng hóa',
  post_border: 'Chi phí sau cửa khẩu nhập (trừ ra)',
} as const;

const BASIS_LABEL = {
  CIF: 'Trị giá tính thuế (CIF tại cửa khẩu nhập)',
  FOB: 'Trị giá tính thuế (FOB)',
} as const;

const percent = (rate: string | null) => (rate === null ? '' : `${Number(rate)}%`);

export default function ValuationBreakdown({ data }: { data: TariffResult }) {
  const { tr, language } = useLanguage();
  const valuation = data.valuation;
  if (!valuation) return null;
  const locale = language === 'en' ? 'en-GB' : 'vi-VN';
  const money = (value: string) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: valuation.currency ?? 'EUR' }).format(Number(value));
  const signed = (value: string) => `${Number(value) < 0 ? '−' : '+'} ${money(String(Math.abs(Number(value))))}`;
  const total = valuation.customs_value;
  const staging = data.staging;
  const ok = data.status === 'ok' && data.mfn_duty !== null;

  return (
    <section aria-label={tr('Cách tính')} data-testid="valuation-breakdown" className="mt-5 rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-bold text-slate-900">{tr('Cách tính')}</h3>
      <dl className="mt-2 space-y-1.5 text-sm">
        {valuation.steps.map((step) => (
          <div key={step.code} className="flex justify-between gap-3">
            <dt className="text-slate-600">{tr(STEP_LABEL[step.code])}</dt>
            <dd className="font-medium text-slate-900">{step.code === 'invoice' ? money(step.amount) : signed(step.amount)}</dd>
          </div>
        ))}
        {total !== null && (
          <div className="flex justify-between gap-3 border-t border-slate-200 pt-1.5">
            <dt className="font-semibold text-slate-800">{tr(valuation.basis ? BASIS_LABEL[valuation.basis] : 'Trị giá tính thuế')}</dt>
            <dd className="font-bold text-slate-900" data-testid="customs-value">
              {money(total)}
            </dd>
          </div>
        )}
        {ok && data.mfn_duty !== null && data.evfta_duty !== null && data.savings !== null && (
          <>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">
                {tr('Thuế MFN')} ({percent(data.mfn_rate)})
              </dt>
              <dd className="font-medium text-slate-900">{money(data.mfn_duty)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">
                {tr('Thuế ưu đãi')} ({percent(data.evfta_rate)})
              </dt>
              <dd className="font-medium text-slate-900">{money(data.evfta_duty)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-slate-200 pt-1.5">
              <dt className="font-semibold text-slate-800">{tr('Tiết kiệm mỗi lô')}</dt>
              <dd className="font-bold text-[#083832]">{money(data.savings)}</dd>
            </div>
          </>
        )}
      </dl>
      {data.rate_date && (
        <p className="mt-3 text-xs text-slate-600" data-testid="rate-date">
          {tr('Thuế ưu đãi tính tại ngày')} {new Date(`${data.rate_date}T00:00:00`).toLocaleDateString(locale)}
          {staging ? ` · ${tr('bậc')} ${staging.stage}/${staging.stages} ${tr('của lộ trình')} ${staging.category}` : ''}
        </p>
      )}
      {valuation.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-amber-800" data-testid="valuation-warnings">
          {valuation.warnings.map((code) => (
            <li key={code}>{tr(VALUATION_WARNINGS[code] ?? code)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
