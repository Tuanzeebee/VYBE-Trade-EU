'use client';

// Danh sách RFQ (F1): buyer thấy các yêu cầu đã gửi, exporter thấy các yêu cầu đã nhận và đổi trạng thái.
// Exporter mở một RFQ mới thì backend tự chuyển sang "Đã xem".
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { changeRfqStatus, listRfqs, NEXT_STATUSES, openRfq, STATUS_LABELS, type Rfq, type RfqStatus } from '../lib/rfqApi';

const BADGE: Record<RfqStatus, string> = {
  new: 'bg-teal-100 text-teal-900',
  viewed: 'bg-slate-200 text-slate-900',
  quoted: 'bg-emerald-100 text-emerald-900',
  closed: 'bg-slate-100 text-slate-700',
};

export default function RfqInbox({ role }: { role: 'buyer' | 'exporter' }) {
  const { tr, language } = useLanguage();
  const [rows, setRows] = useState<Rfq[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await listRfqs();
    setFailed(list === null);
    setRows(list ?? []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const replace = (updated: Rfq) => setRows((list) => list?.map((r) => (r.id === updated.id ? updated : r)) ?? null);

  const toggle = async (rfq: Rfq) => {
    if (openId === rfq.id) return setOpenId(null);
    setOpenId(rfq.id);
    if (role === 'exporter' && rfq.status === 'new') {
      const opened = await openRfq(rfq.id);
      if (opened) replace(opened);
    }
  };

  const setStatus = async (rfq: Rfq, status: RfqStatus) => {
    setError('');
    const updated = await changeRfqStatus(rfq.id, status);
    if (updated) replace(updated);
    else setError('Không đổi được trạng thái. Vui lòng thử lại.');
  };

  const date = (iso: string) => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium' }).format(new Date(iso));

  if (failed) {
    return (
      <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
        {tr('Không tải được danh sách yêu cầu báo giá. Vui lòng thử lại.')}
      </p>
    );
  }
  if (rows === null) return null;
  if (rows.length === 0) {
    return (
      <p role="status" className="rounded-xl bg-white p-6 text-sm text-slate-700">
        {tr(
          role === 'buyer'
            ? 'Bạn chưa gửi yêu cầu báo giá nào. Tìm nhà cung cấp trong danh bạ và bấm "Yêu cầu báo giá".'
            : 'Chưa có yêu cầu báo giá nào. Hoàn thiện hồ sơ và xác minh doanh nghiệp để buyer tìm thấy bạn.',
        )}
      </p>
    );
  }

  return (
    <div className="space-y-3 text-left">
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr(error)}
        </p>
      )}
      <ul className="space-y-3">
        {rows.map((r) => {
          const expanded = openId === r.id;
          const counterpart = role === 'buyer' ? r.exporter_name : r.buyer_name;
          return (
            <li key={r.id} aria-label={`${counterpart} — ${r.product_name}`} className="rounded-2xl border border-slate-200 bg-white p-5">
              <button type="button" onClick={() => void toggle(r)} aria-expanded={expanded} className="flex w-full items-start justify-between gap-3 text-left">
                <span>
                  <span className="block text-sm font-bold text-slate-900">{counterpart}</span>
                  <span className="mt-0.5 block text-sm text-slate-700">{r.product_name}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {r.quantity} {r.unit} · {date(r.created_at)}
                  </span>
                </span>
                <span data-testid="rfq-status" className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${BADGE[r.status]}`}>
                  {tr(STATUS_LABELS[r.status])}
                </span>
              </button>
              {expanded && (
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm text-slate-800">
                  <dl className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold text-slate-500">{tr('Giá mục tiêu')}</dt>
                      <dd>{r.target_price ? `${r.target_price} ${r.currency}` : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-500">Incoterms</dt>
                      <dd>{r.incoterms}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-500">{tr('Điểm đến')}</dt>
                      <dd>{[r.destination_port, r.destination_country].filter(Boolean).join(', ')}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-500">{tr('Ngày cần hàng')}</dt>
                      <dd>{date(r.required_date)}</dd>
                    </div>
                  </dl>
                  {r.message && <p className="whitespace-pre-line rounded-xl bg-slate-50 p-3">{r.message}</p>}
                  {role === 'exporter' && NEXT_STATUSES[r.status].length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {NEXT_STATUSES[r.status].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => void setStatus(r, s)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                        >
                          {tr('Đánh dấu')}: {tr(STATUS_LABELS[s])}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
