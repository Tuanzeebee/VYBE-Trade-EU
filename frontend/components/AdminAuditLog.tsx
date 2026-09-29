'use client';

// Nhật ký thao tác (I6): ai làm gì trên đối tượng nào, trước và sau. Chỉ đọc — bảng append-only.
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { listAuditLogs, type AuditLog } from '../lib/adminApi';

const ENTITY_TYPES = ['company', 'product', 'tariff_line', 'roo_rule', 'evidence', 'evidence_type', 'evidence_rule', 'document', 'user'];

export default function AdminAuditLog() {
  const { tr, language } = useLanguage();
  const [rows, setRows] = useState<AuditLog[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [applied, setApplied] = useState({ entityType: '', entityId: '' });

  const load = useCallback(async () => {
    const result = await listAuditLogs({
      limit: 100,
      ...(applied.entityType ? { entity_type: applied.entityType } : {}),
      ...(applied.entityId ? { entity_id: applied.entityId } : {}),
    });
    setFailed(result === null);
    setRows(result ?? []);
  }, [applied]);

  useEffect(() => {
    void load();
  }, [load]);

  const field = 'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm';

  return (
    <div className="space-y-4 text-left">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ entityType, entityId: entityId.trim() });
        }}
      >
        <div>
          <label htmlFor="audit-type" className="block text-xs font-semibold text-slate-700">{tr('Loại đối tượng')}</label>
          <select id="audit-type" value={entityType} onChange={(e) => setEntityType(e.target.value)} className={field}>
            <option value="">{tr('Tất cả')}</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="audit-id" className="block text-xs font-semibold text-slate-700">{tr('Mã đối tượng')}</label>
          <input id="audit-id" value={entityId} onChange={(e) => setEntityId(e.target.value)} className={field} />
        </div>
        <button type="submit" className="rounded-lg bg-[#083832] px-4 py-1.5 text-sm font-semibold text-white">{tr('Lọc')}</button>
      </form>
      {failed ? (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{tr('Không tải được nhật ký. Vui lòng thử lại.')}</p>
      ) : rows !== null && rows.length === 0 ? (
        <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">{tr('Chưa có nhật ký phù hợp.')}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {['Thời gian', 'Hành động', 'Đối tượng', 'Người thực hiện', 'Trước', 'Sau'].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-semibold">{tr(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r) => (
                <tr key={r.id} className="border-t border-slate-100 align-top">
                  <td className="whitespace-nowrap px-3 py-2">{new Date(r.created_at).toLocaleString(language === 'en' ? 'en-GB' : 'vi-VN')}</td>
                  <td className="px-3 py-2 font-semibold">{r.action_type}</td>
                  <td className="px-3 py-2">{r.entity_type} {r.entity_id}</td>
                  <td className="px-3 py-2">{r.actor_id ?? tr('Hệ thống')}</td>
                  <td className="px-3 py-2 font-mono">{r.before_state ? JSON.stringify(r.before_state) : '—'}</td>
                  <td className="px-3 py-2 font-mono">{r.after_state ? JSON.stringify(r.after_state) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
