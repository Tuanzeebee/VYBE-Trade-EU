'use client';

// Chống mạo danh (I11): cụm tài khoản dùng chung định danh và danh sách chặn. Cụm chỉ là tín hiệu để
// quản trị viên xem xét — không tự đổi trạng thái xác minh. Mọi thêm/gỡ chặn được ghi nhật ký.
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  addBlocklist,
  downloadXlsx,
  listBlocklist,
  listIdentityClusters,
  removeBlocklist,
  type BlocklistEntry,
  type BlocklistInput,
  type IdentityCluster,
} from '../lib/adminApi';

const TYPE_LABEL: Record<string, string> = {
  tax_id: 'Mã số thuế',
  domain: 'Tên miền',
  phone: 'Số điện thoại',
  file_sha256: 'Mã băm file',
  representative: 'Người đại diện',
};

const BLOCK_TYPES: BlocklistInput['identifier_type'][] = ['tax_id', 'domain', 'phone', 'file_sha256'];

export default function AdminIdentity() {
  const { tr, language } = useLanguage();
  const [clusters, setClusters] = useState<IdentityCluster[] | null>(null);
  const [entries, setEntries] = useState<BlocklistEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<BlocklistInput['identifier_type']>('tax_id');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    const [c, b] = await Promise.all([listIdentityClusters(), listBlocklist()]);
    setFailed(c === null || b === null);
    setClusters(c ?? []);
    setEntries(b ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await action();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không kết nối được máy chủ. Vui lòng thử lại.');
      return false;
    } finally {
      setBusy(false);
      await load();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || !reason.trim()) return setError('Vui lòng nhập giá trị và lý do chặn.');
    if (await run(() => addBlocklist({ identifier_type: kind, value: value.trim(), reason: reason.trim() }))) {
      setValue('');
      setReason('');
    }
  };

  const field = 'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm';
  const date = (iso: string) => new Date(iso).toLocaleString(language === 'en' ? 'en-GB' : 'vi-VN');

  return (
    <div className="space-y-6 text-left">
      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        {tr('Cụm tài khoản và cờ danh tính chỉ để xếp ưu tiên xem xét, không tự đổi trạng thái xác minh. Mọi thao tác chặn và gỡ chặn được ghi nhật ký.')}
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr(error)}
        </p>
      )}
      {failed && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr('Không tải được dữ liệu danh tính. Vui lòng thử lại.')}
        </p>
      )}

      <section aria-labelledby="clusters-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="clusters-title" className="text-lg font-bold text-slate-900">{tr('Cụm tài khoản dùng chung định danh')}</h2>
          <button
            type="button"
            disabled={busy || !clusters?.length}
            onClick={() => void run(() => downloadXlsx('/api/admin/identity-clusters/export.xlsx', 'identity-clusters.xlsx'))}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 disabled:opacity-60"
          >
            {tr('Xuất Excel')}
          </button>
        </div>
        {clusters !== null && clusters.length === 0 ? (
          <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">{tr('Chưa phát hiện doanh nghiệp nào dùng chung định danh.')}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['Định danh', 'Giá trị', 'Doanh nghiệp'].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-semibold">{tr(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Mỗi doanh nghiệp một dòng; ô định danh và giá trị gộp dọc theo cả cụm. */}
                {(clusters ?? []).flatMap((c) =>
                  c.companies.map((x, i) => (
                    <tr key={`${c.identifier_type}:${c.value}:${x.id}`} className={i === 0 ? 'border-t border-slate-200' : ''}>
                      {i === 0 && (
                        <>
                          <td rowSpan={c.companies.length} className="border-r border-slate-100 px-3 py-2 align-middle font-semibold">
                            {tr(TYPE_LABEL[c.identifier_type] ?? c.identifier_type)}
                          </td>
                          <td rowSpan={c.companies.length} className="break-all border-r border-slate-100 px-3 py-2 align-middle font-mono">
                            {c.identifier_type === 'representative' ? tr('(đã băm, không lưu tên)') : c.value}
                          </td>
                        </>
                      )}
                      <td className="border-t border-slate-100 px-3 py-2">{x.legal_name}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="blocklist-title" className="space-y-3">
        <h2 id="blocklist-title" className="text-lg font-bold text-slate-900">{tr('Danh sách chặn')}</h2>
        <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div>
            <label htmlFor="block-type" className="block text-xs font-semibold text-slate-700">{tr('Loại định danh')}</label>
            <select id="block-type" value={kind} onChange={(e) => setKind(e.target.value as BlocklistInput['identifier_type'])} className={field}>
              {BLOCK_TYPES.map((t) => (
                <option key={t} value={t}>{tr(TYPE_LABEL[t])}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="block-value" className="block text-xs font-semibold text-slate-700">{tr('Giá trị')}</label>
            <input id="block-value" value={value} onChange={(e) => setValue(e.target.value)} className={field} />
          </div>
          <div className="min-w-[16rem] flex-1">
            <label htmlFor="block-reason" className="block text-xs font-semibold text-slate-700">{tr('Lý do chặn')}</label>
            <input id="block-reason" value={reason} onChange={(e) => setReason(e.target.value)} className={`${field} w-full`} />
          </div>
          <button type="submit" disabled={busy} className="rounded-lg bg-rose-700 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
            {tr('Chặn')}
          </button>
        </form>
        {entries !== null && entries.length === 0 ? (
          <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">{tr('Danh sách chặn đang trống.')}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['Loại định danh', 'Giá trị', 'Lý do chặn', 'Thời gian'].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-semibold">{tr(h)}</th>
                  ))}
                  <th scope="col" className="px-3 py-2"><span className="sr-only">{tr('Thao tác')}</span></th>
                </tr>
              </thead>
              <tbody>
                {(entries ?? []).map((b) => (
                  <tr key={b.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2 font-semibold">{tr(TYPE_LABEL[b.identifier_type] ?? b.identifier_type)}</td>
                    <td className="break-all px-3 py-2 font-mono">{b.value}</td>
                    <td className="px-3 py-2">{b.reason}</td>
                    <td className="whitespace-nowrap px-3 py-2">{date(b.created_at)}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" disabled={busy} onClick={() => void run(() => removeBlocklist(b.id))} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-800 disabled:opacity-60">
                        {tr('Gỡ chặn')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
