'use client';

// Admin nhập số dư hạn ngạch (khối lượng đã dùng tại một ngày) từ nguồn chính thức (C2-C). Ngày và nguồn
// bắt buộc; cùng ngày thì cập nhật. Chưa có số liệu thì máy tính hiển thị "chưa biết số dư".
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { listQuotaBalances, saveQuotaBalance, type QuotaBalance } from '../lib/complianceApi';
import type { Row } from './admin-compliance/datasets';

const today = () => new Date().toISOString().slice(0, 10);
const INPUT = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900';

const ERRORS = {
  invalid: 'Dữ liệu chưa hợp lệ: ngày không ở tương lai, khối lượng là số không âm, nguồn tối thiểu 3 ký tự.',
  not_found: 'Không tìm thấy hạn ngạch này.',
  network: 'Không kết nối được máy chủ. Vui lòng thử lại.',
} as const;

/** `rows` là các dòng hạn ngạch đã tải ở bảng bên trên (cells: hiệp định, nơi đến, tiền tố HS, khối lượng...). */
export default function AdminQuotaBalances({ rows }: { rows: Row[] }) {
  const { tr } = useLanguage();
  const [quotaId, setQuotaId] = useState('');
  const [balances, setBalances] = useState<QuotaBalance[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [asOf, setAsOf] = useState(today());
  const [used, setUsed] = useState('');
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (id: string) => {
    if (!id) return setBalances(null);
    const result = await listQuotaBalances(id);
    setFailed(result === null);
    setBalances(result ?? []);
  }, []);

  useEffect(() => {
    setNotice('');
    setError('');
    void load(quotaId);
  }, [quotaId, load]);

  const label = (row: Row) => row.cells.slice(0, 4).map(String).join(' · ');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!quotaId) return setError('Vui lòng chọn hạn ngạch.');
    if (!/^[0-9]{1,11}(\.[0-9]{1,3})?$/.test(used.trim())) return setError('Khối lượng đã dùng phải là số không âm, tối đa 3 chữ số thập phân.');
    if (source.trim().length < 3) return setError('Vui lòng ghi nguồn số liệu (tối thiểu 3 ký tự).');
    setBusy(true);
    const outcome = await saveQuotaBalance(quotaId, { asOf, usedVolume: used.trim(), source: source.trim() });
    setBusy(false);
    if (!outcome.ok) return setError(ERRORS[outcome.error]);
    setNotice('Đã lưu số dư.');
    setUsed('');
    await load(quotaId);
  };

  return (
    <section aria-label={tr('Số dư hạn ngạch')} className="mt-8 rounded-2xl border border-slate-200 bg-white p-5" data-testid="quota-balances">
      <h2 className="text-lg font-bold text-slate-900">{tr('Số dư hạn ngạch')}</h2>
      <p className="mt-1 text-sm text-slate-600">
        {tr('Nhập khối lượng đã dùng tại một ngày từ nguồn chính thức. Số liệu cũ hơn 14 ngày được gắn nhãn "số liệu cũ"; chưa có số liệu thì máy tính hiện "chưa biết số dư".')}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {tr('Các dòng cùng số hiệu và chu kỳ dùng chung một số dư: nhập ở dòng nào thì mọi dòng cùng nhóm đều thấy.')}
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600" data-testid="quota-balances-empty">
          {tr('Chưa có hạn ngạch nào. Thêm hạn ngạch ở bảng bên trên trước khi nhập số dư.')}
        </p>
      ) : (
        <>
          <label htmlFor="balance-quota" className="mt-4 block text-sm font-semibold text-slate-700">
            {tr('Hạn ngạch')}
          </label>
          <select id="balance-quota" value={quotaId} onChange={(e) => setQuotaId(e.target.value)} className={INPUT}>
            <option value="">{tr('Chọn hạn ngạch')}</option>
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {label(row)}
              </option>
            ))}
          </select>
          {quotaId && (
            <>
              <form onSubmit={submit} noValidate className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="balance-date" className="block text-sm font-semibold text-slate-700">
                    {tr('Số liệu tại ngày')}
                  </label>
                  <input id="balance-date" type="date" max={today()} value={asOf} onChange={(e) => setAsOf(e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label htmlFor="balance-used" className="block text-sm font-semibold text-slate-700">
                    {tr('Khối lượng đã dùng')}
                  </label>
                  <input id="balance-used" inputMode="decimal" value={used} onChange={(e) => setUsed(e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label htmlFor="balance-source" className="block text-sm font-semibold text-slate-700">
                    {tr('Nguồn số liệu')}
                  </label>
                  <input id="balance-source" value={source} onChange={(e) => setSource(e.target.value)} className={INPUT} />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-lg bg-[#083832] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {tr(busy ? 'Đang lưu...' : 'Lưu số dư')}
                  </button>
                </div>
              </form>
              {error && (
                <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                  {tr(error)}
                </p>
              )}
              {notice && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{tr(notice)}</p>}
              {failed && <p className="mt-3 text-sm text-rose-700">{tr('Không tải được số dư. Vui lòng thử lại.')}</p>}
              {balances && balances.length === 0 && !failed && (
                <p className="mt-3 text-sm text-slate-600" data-testid="balances-none">
                  {tr('Hạn ngạch này chưa có số liệu số dư: máy tính sẽ hiện "chưa biết số dư".')}
                </p>
              )}
              {balances && balances.length > 0 && (
                <table className="mt-4 w-full text-left text-sm" data-testid="balances-table">
                  <thead>
                    <tr className="text-xs text-slate-500">
                      <th className="py-2 font-semibold">{tr('Ngày')}</th>
                      <th className="py-2 font-semibold">{tr('Đã dùng')}</th>
                      <th className="py-2 font-semibold">{tr('Nguồn')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map((b) => (
                      <tr key={b.id} className="border-t border-slate-100">
                        <td className="py-2">{b.as_of}</td>
                        <td className="py-2">{Number(b.used_volume).toLocaleString('vi-VN')}</td>
                        <td className="py-2 text-slate-700">{b.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
