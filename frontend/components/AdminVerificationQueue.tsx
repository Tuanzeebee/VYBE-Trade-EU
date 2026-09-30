'use client';

// Hàng đợi xác minh (I1) và quyết định (I2). Trạng thái xác minh do quản trị viên quyết định —
// không phải hệ thống hay AI. Từ chối và yêu cầu bổ sung bắt buộc có lý do.
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { decideRequest, getQueue, reviewEvidence, type Decision, type QueueItem } from '../lib/adminApi';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Bị từ chối',
};

const NEED_REASON = 'Vui lòng nhập lý do.';

export default function AdminVerificationQueue() {
  const { tr, language } = useLanguage();
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const queue = await getQueue();
    setLoadFailed(queue === null);
    setItems(queue ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setReason = (key: string, value: string) => setReasons((r) => ({ ...r, [key]: value }));

  const run = async (action: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không kết nối được máy chủ. Vui lòng thử lại.');
    } finally {
      setBusy(false);
      await load();
    }
  };

  const decide = (item: QueueItem, decision: Decision) => {
    const reason = (reasons[item.request_id] ?? '').trim();
    if (decision !== 'approve' && !reason) return setError(NEED_REASON);
    void run(() => decideRequest(item.request_id, decision, reason));
  };

  const review = (evidenceId: string, decision: 'approve' | 'reject') => {
    const reason = (reasons[evidenceId] ?? '').trim();
    if (decision === 'reject' && !reason) return setError(NEED_REASON);
    void run(() => reviewEvidence(evidenceId, decision, reason));
  };

  const button = 'rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60';

  return (
    <div className="space-y-5 text-left">
      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        {tr('Trạng thái xác minh do quản trị viên quyết định. Từ chối và yêu cầu bổ sung phải có lý do; doanh nghiệp sẽ thấy lý do này.')}
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr(error)}
        </p>
      )}
      {loadFailed && items?.length === 0 ? (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr('Không tải được hàng đợi. Vui lòng thử lại.')}
        </p>
      ) : items !== null && items.length === 0 ? (
        <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">
          {tr('Không có hồ sơ nào đang chờ duyệt.')}
        </p>
      ) : (
        <ul className="space-y-4">
          {(items ?? []).map((item) => (
            <li key={item.request_id} aria-label={item.legal_name} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900">{item.legal_name}</h3>
                <span className="text-xs text-slate-500">
                  {tr('Gửi lúc')} {new Date(item.submitted_at).toLocaleString(language === 'en' ? 'en-GB' : 'vi-VN')}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {tr('MST')}: {item.tax_id ?? '—'} · {tr('Quốc gia')}: {item.country}
              </p>

              <details open role="group" aria-label={tr('Thông tin doanh nghiệp')} className="mt-4 rounded-xl border border-slate-200 p-3 text-sm">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-slate-700">{tr('Thông tin doanh nghiệp')}</summary>
                <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                  {[
                    ['Số đăng ký', item.company.registration_number],
                    ['Loại hình', item.company.business_type],
                    ['Năm thành lập', item.company.founded_year],
                    ['Địa chỉ', item.company.address],
                    ['Email liên hệ', item.company.contact_email],
                    ['Ngành', item.company.industry_sector],
                    ['Thị trường xuất khẩu', item.company.export_markets.join(', ')],
                    ['Ngôn ngữ', item.company.languages_spoken.join(', ')],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <dt className="font-semibold text-slate-700">{tr(label as string)}</dt>
                      <dd className="break-words text-slate-600">{value || '—'}</dd>
                    </div>
                  ))}
                  <div>
                    <dt className="font-semibold text-slate-700">Website</dt>
                    <dd className="break-words text-slate-600">
                      {item.company.website ? (
                        <a href={item.company.website} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">
                          {item.company.website}
                        </a>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-slate-700">{tr('Mô tả')}</dt>
                    <dd className="whitespace-pre-line break-words text-slate-600">
                      {(language === 'en' ? item.company.description_en : item.company.description_vi) || '—'}
                    </dd>
                  </div>
                </dl>
              </details>

              <details open role="group" aria-label={tr('Sản phẩm đã khai')} className="mt-3 rounded-xl border border-slate-200 p-3 text-sm">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-slate-700">
                  {tr('Sản phẩm đã khai')} ({item.products.length})
                </summary>
                {item.products.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">{tr('Chưa khai sản phẩm nào.')}</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {item.products.map((p) => (
                      <li key={p.id} className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                        <strong className="text-slate-900">{p.name}</strong>
                        <div>
                          {tr('Mã HS')}: {p.hs_formatted} — {(language === 'en' ? p.hs_name_en : p.hs_name_vi) ?? '—'}
                        </div>
                        <div>
                          {tr('Giá')}: {p.price_min ?? '—'} – {p.price_max ?? '—'} {p.currency}
                          {p.unit && `/${p.unit}`} · MOQ: {p.moq ?? '—'} {p.moq_unit ?? ''}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </details>

              <div className="mt-4 space-y-3">
                {item.evidences.length === 0 && <p className="text-xs text-slate-500">{tr('Chưa nộp bằng chứng.')}</p>}
                {item.evidences.map((e) => (
                  <div key={e.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{language === 'en' ? e.type_name_en : e.type_name_vi}</strong>
                      <span className="text-[11px] font-semibold text-slate-600">{tr(STATUS_LABEL[e.approval_status])}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {e.certificate_number && `${e.certificate_number} · `}
                      {e.issuer && `${e.issuer} · `}
                      {e.issued_at}
                      {e.expires_at && ` → ${e.expires_at}`}
                    </p>
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <a href={e.file_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-teal-700 hover:underline">
                        {tr('Xem file')}
                      </a>
                      {e.approval_status === 'pending' && (
                        <>
                          <button type="button" disabled={busy} onClick={() => review(e.id, 'approve')} className={`${button} bg-emerald-700 text-white`}>
                            {tr('Duyệt bằng chứng')}
                          </button>
                          <label className="text-xs text-slate-600">
                            <span className="sr-only">{tr('Lý do từ chối bằng chứng')}</span>
                            <input
                              aria-label={tr('Lý do từ chối bằng chứng')}
                              value={reasons[e.id] ?? ''}
                              onChange={(ev) => setReason(e.id, ev.target.value)}
                              placeholder={tr('Lý do từ chối bằng chứng')}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            />
                          </label>
                          <button type="button" disabled={busy} onClick={() => review(e.id, 'reject')} className={`${button} bg-rose-700 text-white`}>
                            {tr('Từ chối bằng chứng')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <label htmlFor={`reason-${item.request_id}`} className="block text-xs font-semibold text-slate-700">
                  {tr('Lý do quyết định (bắt buộc khi từ chối hoặc yêu cầu bổ sung)')}
                </label>
                <textarea
                  id={`reason-${item.request_id}`}
                  value={reasons[item.request_id] ?? ''}
                  onChange={(e) => setReason(item.request_id, e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => decide(item, 'approve')} className={`${button} bg-[#083832] text-white`}>
                    {tr('Duyệt xác minh')}
                  </button>
                  <button type="button" disabled={busy} onClick={() => decide(item, 'request_info')} className={`${button} border border-slate-300 text-slate-800`}>
                    {tr('Yêu cầu bổ sung')}
                  </button>
                  <button type="button" disabled={busy} onClick={() => decide(item, 'reject')} className={`${button} bg-rose-700 text-white`}>
                    {tr('Từ chối')}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
