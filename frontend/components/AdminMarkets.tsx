'use client';

// Thống kê thương mại (U15): nạp từ Eurostat Comext bằng job nền, hoặc nạp file CSV đã tuyển chọn.
// Số liệu là thống kê công bố; gợi ý thị trường và báo cáo chỉ dùng số đã nạp.
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  listPriorityProducts,
  listTradeImports,
  startTradeImport,
  uploadTradeFile,
  type PriorityProduct,
  type TradeImportBatch,
} from '../lib/adminApi';

const STATUS: Record<string, string> = {
  queued: 'Đang chờ',
  running: 'Đang nạp',
  succeeded: 'Xong',
  failed: 'Lỗi',
};

export default function AdminMarkets() {
  const { tr, language } = useLanguage();
  const [batches, setBatches] = useState<TradeImportBatch[] | null>(null);
  const [products, setProducts] = useState<PriorityProduct[]>([]);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<'eurostat_comext' | 'curated'>('eurostat_comext');

  const load = useCallback(async () => {
    setBatches((await listTradeImports()) ?? []);
  }, []);
  useEffect(() => {
    void load();
    void listPriorityProducts().then((rows) => setProducts(rows ?? []));
  }, [load]);

  const run = async (action: () => Promise<unknown>, ok: string) => {
    setMessage(null);
    setBusy(true);
    try {
      await action();
      setMessage({ kind: 'ok', text: ok });
    } catch (cause) {
      setMessage({ kind: 'error', text: cause instanceof Error ? cause.message : 'Không kết nối được máy chủ. Vui lòng thử lại.' });
    } finally {
      setBusy(false);
      await load();
    }
  };

  const date = (iso: string) => new Date(iso).toLocaleString(language === 'en' ? 'en-GB' : 'vi-VN');

  return (
    <section aria-label={tr('Thống kê thương mại')} className="space-y-5 text-left">
      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        {tr('Nguồn: Eurostat Comext (DS-045409). Job nền nạp nhập khẩu của 27 nước EU từ thế giới, ngoài EU và Việt Nam, cùng cơ cấu đối tác của EU để tính thị phần đối thủ.')}
      </p>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-900">{tr('Mã HS ưu tiên')}</h2>
        <p className="mt-1 text-xs text-slate-600">{products.map((p) => `${p.hs_code} ${language === 'en' ? p.name_en : p.name_vi}`).join(' · ')}</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => startTradeImport({}), 'Đã xếp hàng nạp dữ liệu Eurostat. Làm mới sau vài phút để xem kết quả.')}
          className="mt-3 rounded-xl bg-[#083832] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {tr('Nạp dữ liệu Eurostat cho mã ưu tiên')}
        </button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-900">{tr('Nạp file CSV đã tuyển chọn')}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <label className="text-xs text-slate-700">
            {tr('Nguồn dữ liệu')}{' '}
            <select value={source} onChange={(e) => setSource(e.target.value as 'eurostat_comext' | 'curated')} className="ml-1 rounded-lg border border-slate-200 px-2 py-1 text-xs">
              <option value="eurostat_comext">Eurostat Comext</option>
              <option value="curated">{tr('Nguồn khác (đã tuyển chọn)')}</option>
            </select>
          </label>
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label={tr('File CSV thống kê')}
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void run(() => uploadTradeFile(file, source), 'Đã nạp file thống kê.');
              e.target.value = '';
            }}
            className="text-xs"
          />
        </div>
      </div>
      {message && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${message.kind === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>
          {tr(message.text)}
        </p>
      )}
      <table className="w-full text-left text-xs">
        <thead className="text-slate-500">
          <tr>
            <th className="py-2">{tr('Thời gian')}</th>
            <th className="py-2">{tr('Nguồn')}</th>
            <th className="py-2">{tr('Trạng thái')}</th>
            <th className="py-2 text-right">{tr('Số dòng')}</th>
          </tr>
        </thead>
        <tbody>
          {(batches ?? []).map((b) => (
            <tr key={b.id} className="border-t border-slate-100" data-testid="trade-batch">
              <td className="py-2">{date(b.created_at)}</td>
              <td className="py-2">{b.source}</td>
              <td className="py-2">
                {tr(STATUS[b.status] ?? b.status)}
                {b.error && <span className="block text-rose-700">{b.error}</span>}
              </td>
              <td className="py-2 text-right">{b.rows_imported}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {batches !== null && batches.length === 0 && <p className="text-xs text-slate-600">{tr('Chưa có lần nạp nào.')}</p>}
    </section>
  );
}
