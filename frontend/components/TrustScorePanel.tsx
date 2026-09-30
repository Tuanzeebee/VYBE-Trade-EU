'use client';

// Điểm tín nhiệm của seller (U23): điểm tổng, điểm thành phần, từng tiêu chí và dữ kiện dùng để tính,
// ngày tính, câu "không phải chứng nhận". Dữ kiện tự khai được liệt kê với trọng số 0.
import React, { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import { getMyTrustScore, SELF_DECLARED_LABELS, type TrustScore } from '../lib/trustApi';
import { TRUST_INFO } from './TrustScoreBadge';

export default function TrustScorePanel() {
  const { tr, language } = useLanguage();
  const [trust, setTrust] = useState<TrustScore | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    void getMyTrustScore().then((row) => active && setTrust(row));
    return () => {
      active = false;
    };
  }, []);
  if (!trust) return null;
  const date = new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(trust.computed_at));
  const pct = (value: string | null | undefined) => (value === null || value === undefined ? '—' : `${Math.round(Number(value) * 100)}%`);

  return (
    <section aria-label={tr('Điểm tín nhiệm')} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Gauge className="h-4 w-4 text-[#083832]" aria-hidden="true" />
          {tr('Điểm tín nhiệm')}
        </h3>
        <span data-testid="trust-total" className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-extrabold text-emerald-900">
          {trust.score === null || trust.score === undefined ? tr('Chưa tính được') : `${Number(trust.score).toFixed(0)}/100`}
        </span>
        {trust.new_on_platform && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">{tr('Mới trên nền tảng')}</span>}
      </div>
      <p className="mt-2 text-xs text-slate-600">
        {tr(TRUST_INFO)}{' '}
        <Link href="/trust-score" className="font-semibold underline">
          {tr('Xem phương pháp')}
        </Link>
        {' · '}
        {tr('Tính lúc')} {date}
      </p>
      {trust.uses_draft_criteria && <p className="mt-1 text-[11px] font-semibold text-amber-700">{tr('Tiêu chí đang là bản nháp minh hoạ, chờ duyệt.')}</p>}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {trust.components.map((component) => (
          <div key={component.component} className="rounded-xl border border-slate-100 p-3" aria-label={language === 'en' ? component.label_en : component.label_vi}>
            <p className="flex items-baseline justify-between text-sm font-semibold text-slate-900">
              <span>{language === 'en' ? component.label_en : component.label_vi}</span>
              <span className="text-[#083832]">{component.score === null || component.score === undefined ? '—' : Number(component.score).toFixed(0)}</span>
            </p>
            <ul className="mt-2 space-y-1">
              {component.criteria.map((c) => (
                <li key={c.fact_key} className="flex justify-between gap-2 text-xs text-slate-700">
                  <span>{language === 'en' ? c.label_en : c.label_vi}</span>
                  <span className="shrink-0 text-slate-500">{c.value === null || c.value === undefined ? tr('chưa tính') : pct(c.value)}</span>
                </li>
              ))}
            </ul>
            {component.component === 'behaviour' && trust.new_on_platform && (
              <p className="mt-2 text-[11px] text-slate-500">{tr('Cần ít nhất 3 hội thoại hoặc yêu cầu báo giá trong 90 ngày để chấm phần này.')}</p>
            )}
          </div>
        ))}
      </div>
      {trust.self_declared.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          {tr('Tự khai (không tính điểm)')}: {trust.self_declared.map((key) => tr(SELF_DECLARED_LABELS[key] ?? key)).join(', ')}
        </p>
      )}
    </section>
  );
}
