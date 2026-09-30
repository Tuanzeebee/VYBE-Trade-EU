'use client';

// Dữ liệu tuân thủ do luật TM nhập: dòng thuế, quy tắc xuất xứ, loại bằng chứng, luật bằng chứng (C1, C4, C6).
// Dữ liệu CHƯA duyệt không bao giờ ra công khai. Ở đây: tìm, thêm, sửa, nhập/xuất Excel, duyệt, xóa.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { downloadXlsx, type ImportResult } from '../lib/adminApi';
import ImportDialog from './admin-compliance/ImportDialog';
import Legend from './admin-compliance/Legend';
import Pagination, { PAGE_SIZE } from './admin-compliance/Pagination';
import RecordForm from './admin-compliance/RecordForm';
import { DATASETS, TRANSLATED_CELLS, normalizeSearch, type Row } from './admin-compliance/datasets';

type StatusFilter = 'all' | 'pending' | 'reviewed';

const BUTTON = 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60';

export default function AdminComplianceData() {
  const { tr } = useLanguage();
  const [active, setActive] = useState(DATASETS[0].key);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ row: Row | null } | null>(null);
  const [importing, setImporting] = useState(false);
  const dataset = DATASETS.find((d) => d.key === active) ?? DATASETS[0];
  const xlsxPath = dataset.xlsxPath;
  const xlsxName = dataset.xlsxName ?? '';

  const load = useCallback(async () => {
    const result = await dataset.load();
    setFailed(result === null);
    setRows(result ?? []);
  }, [dataset]);

  useEffect(() => {
    setRows(null);
    setError('');
    setNotice('');
    setQuery('');
    setStatus('all');
    setPage(1);
    void load();
  }, [load]);

  useEffect(() => setPage(1), [query, status]);

  const run = async (action: () => Promise<void>) => {
    setError('');
    setNotice('');
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

  const filtered = useMemo(() => {
    const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
    return (rows ?? []).filter((row) => {
      if (status === 'pending' && row.reviewed) return false;
      if (status === 'reviewed' && !row.reviewed) return false;
      const haystack = `${row.search} ${normalizeSearch(row.cells.join(' '))}`;
      return words.every((word) => haystack.includes(word));
    });
  }, [rows, query, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const unreviewed = (rows ?? []).filter((r) => !r.reviewed).length;

  const imported = (result: ImportResult) => {
    setImporting(false);
    setNotice(`${tr('Đã nhập xong')}: ${tr('Dòng mới')} ${result.created}, ${tr('Cập nhật')} ${result.updated}, ${tr('Không đổi')} ${result.unchanged}`);
    void load();
  };

  return (
    <div className="space-y-4 text-left">
      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        {tr('Dữ liệu chưa duyệt không bao giờ hiện ra công khai và không được máy tính tuân thủ dùng. Sửa dữ liệu đã duyệt sẽ đưa nó về chưa duyệt.')}
      </p>
      <div role="tablist" aria-label={tr('Dữ liệu tuân thủ')} className="flex flex-wrap gap-2">
        {DATASETS.map((d) => (
          <button
            key={d.key}
            role="tab"
            type="button"
            aria-selected={d.key === active}
            onClick={() => setActive(d.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${d.key === active ? 'bg-[#083832] text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
          >
            {tr(d.label)}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr(error)}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {failed ? (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr('Không tải được dữ liệu. Vui lòng thử lại.')}
        </p>
      ) : (
        rows !== null && (
          <section aria-label={tr(dataset.label)} className="space-y-3">
            <Legend dataset={dataset} />
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={tr('Tìm kiếm')}
                placeholder={tr('Tìm theo mã, tên, ghi chú…')}
                className="min-w-[14rem] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              />
              <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label={tr('Trạng thái')} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
                <option value="all">{tr('Tất cả')}</option>
                <option value="pending">{tr('Chưa duyệt')}</option>
                <option value="reviewed">{tr('Đã duyệt')}</option>
              </select>
              <button type="button" disabled={busy} onClick={() => setForm({ row: null })} className="rounded-lg bg-[#083832] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                {tr('Thêm')}
              </button>
              {xlsxPath && (
                <>
                  <button type="button" disabled={busy} onClick={() => void run(() => downloadXlsx(`${xlsxPath}/template.xlsx`, `${xlsxName}-template.xlsx`))} className={BUTTON}>
                    {tr('Tải template')}
                  </button>
                  <button type="button" disabled={busy} onClick={() => void run(() => downloadXlsx(`${xlsxPath}/export.xlsx`, `${xlsxName}.xlsx`))} className={BUTTON}>
                    {tr('Xuất Excel')}
                  </button>
                  <button type="button" disabled={busy} onClick={() => setImporting(true)} className={BUTTON}>
                    {tr('Nhập Excel')}
                  </button>
                </>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-600">
              {unreviewed} {tr('dòng chưa duyệt')} / {rows.length}
            </p>
            {rows.length === 0 ? (
              <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">
                {tr(xlsxPath ? 'Chưa có dữ liệu. Dùng nút Thêm hoặc Nhập Excel để bắt đầu.' : 'Chưa có dữ liệu. Dùng nút Thêm để bắt đầu.')}
              </p>
            ) : filtered.length === 0 ? (
              <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">
                {tr('Không có dòng nào khớp.')}
              </p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        {dataset.columns.map((c) => (
                          <th key={c} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                            {tr(c)}
                          </th>
                        ))}
                        <th scope="col" className="px-3 py-2 font-semibold">
                          {tr('Trạng thái')}
                        </th>
                        <th scope="col" className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          {row.cells.map((cell, i) => (
                            <td key={i} className="px-3 py-2">
                              {TRANSLATED_CELLS.includes(cell) ? tr(cell) : cell}
                            </td>
                          ))}
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${row.reviewed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {tr(row.reviewed ? 'Đã duyệt' : 'Chưa duyệt')}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            <button type="button" disabled={busy} onClick={() => setForm({ row })} className="mr-2 rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-60">
                              {tr('Sửa')}
                            </button>
                            {!row.reviewed && (
                              <button type="button" disabled={busy} onClick={() => void run(() => dataset.review(row.id))} className="mr-2 rounded-lg bg-[#083832] px-3 py-1 text-xs font-semibold text-white disabled:opacity-60">
                                {tr('Duyệt')}
                              </button>
                            )}
                            {dataset.remove && row.canDelete && (
                              <button type="button" disabled={busy} onClick={() => void run(() => dataset.remove!(row.id))} className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60">
                                {tr('Xóa')}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination total={filtered.length} page={current} onPage={setPage} />
              </>
            )}
          </section>
        )
      )}
      {form && (
        <RecordForm
          dataset={dataset}
          row={form.row}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            void load();
          }}
        />
      )}
      {importing && xlsxPath && <ImportDialog dataset={dataset} onClose={() => setImporting(false)} onDone={imported} />}
    </div>
  );
}
