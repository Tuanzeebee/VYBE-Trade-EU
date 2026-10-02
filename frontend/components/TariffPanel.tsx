'use client';

// Thuế MFN so với EVFTA của một mã HS, hiện tại sản phẩm. Chỉ đọc số liệu đã được người duyệt luật TM duyệt.
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import SectorAlerts, { DemoDataBanner } from './SectorAlerts';
import UnreviewedNotice from './UnreviewedNotice';
import { getTariffPreview, parseRate, type TariffPreview } from '../lib/tariffPreviewApi';

interface TariffPanelProps {
  hsCode: string;
  /** summary: MFN/EVFTA gọn (form sản phẩm). full: thêm lộ trình, điều kiện, nguồn. */
  variant?: 'summary' | 'full';
}

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; data: TariffPreview };

const pct = (value: number) => `${value}%`;

export default function TariffPanel({ hsCode, variant = 'summary' }: TariffPanelProps) {
  const { tr, language } = useLanguage();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    getTariffPreview(hsCode).then((data) => {
      if (!cancelled) setState(data ? { kind: 'ready', data } : { kind: 'error' });
    });
    return () => {
      cancelled = true;
    };
  }, [hsCode, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const note = (vi: string | null, en: string | null) => (language === 'en' ? (en ?? vi) : (vi ?? en));

  const box = 'rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1.5';

  if (state.kind === 'loading') {
    return <p role="status" className={box}>{tr('Đang tra thuế…')}</p>;
  }
  const mfnRate = state.kind === 'ready' && state.data.status === 'ok' ? parseRate(state.data.mfn_rate) : null;
  const evftaRate = state.kind === 'ready' && state.data.status === 'ok' ? parseRate(state.data.evfta_rate) : null;
  const badOk = state.kind === 'ready' && state.data.status === 'ok' && (mfnRate === null || evftaRate === null);
  if (state.kind === 'error' || badOk) {
    return (
      <div role="status" className={`${box} border-rose-200 bg-rose-50 text-rose-800`}>
        <p>{tr('Không tải được thông tin thuế.')}</p>
        <button type="button" onClick={retry} className="font-semibold underline cursor-pointer">
          {tr('Thử lại')}
        </button>
      </div>
    );
  }

  const d = state.data;
  const conditionText = note(d.condition_note, d.condition_note_en);
  const quotaText = note(d.quota_note, d.quota_note_en);

  let content: React.ReactNode;
  if (d.status === 'unsupported') {
    content = (
      <p role="status" className={box}>
        {tr('Mã HS này chưa có dữ liệu thuế được duyệt. Bạn vẫn lưu được sản phẩm.')}
      </p>
    );
  } else if (d.status === 'needs_review') {
    content = (
      <div role="status" className={`${box} border-amber-200 bg-amber-50 text-amber-900`}>
        <p className="font-semibold">{tr('Mã HS này cần chuyên gia xem lại thuế (hạn ngạch hoặc thuế đặc biệt).')}</p>
        {quotaText && <p>{quotaText}</p>}
        {variant === 'full' && conditionText && <p>{conditionText}</p>}
      </div>
    );
  } else {
    content = (
    <div role="status" className={box}>
      <p className="font-semibold text-slate-900">
        <span>MFN {pct(mfnRate as number)}</span>
        {' → '}
        <span>EVFTA {pct(evftaRate as number)}</span>
        <span className="ml-2 font-normal text-teal-800">
          {tr('Giảm')} {Number(((mfnRate as number) - (evftaRate as number)).toFixed(4))} {tr('điểm phần trăm')}
        </span>
      </p>
      {variant === 'full' && (
        <dl className="space-y-1">
          {d.staging_category && (
            <div className="flex justify-between gap-3">
              <dt>{tr('Lộ trình cắt giảm')}</dt>
              <dd className="font-semibold">{d.staging_category}</dd>
            </div>
          )}
          {d.zero_from && (
            <div className="flex justify-between gap-3">
              <dt>{tr('Về 0% từ')}</dt>
              <dd className="font-semibold">{d.zero_from}</dd>
            </div>
          )}
        </dl>
      )}
      {variant === 'full' && conditionText && <p>{conditionText}</p>}
      {variant === 'full' && quotaText && <p>{quotaText}</p>}
      {variant === 'full' && d.source_url && (
        <a href={d.source_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-800 underline">
          {tr('Nguồn')}
        </a>
      )}
    </div>
  );
  }

  return (
    <div className="space-y-2">
      {content}
      <UnreviewedNotice state={d.review_state} compact />
      {d.data_status === 'demo_unreviewed' && d.review_state !== 'UNREVIEWED' && <DemoDataBanner />}
      <SectorAlerts alerts={d.alerts ?? []} />
    </div>
  );
}
