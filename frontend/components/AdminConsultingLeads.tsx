'use client';

// Yêu cầu "Tư vấn triển khai qua mạng lưới VBA" từ báo cáo go-to-market (U18). Admin chuyển trạng
// thái mới → đã liên hệ → đã đóng; mỗi lần đổi được ghi nhật ký.
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  LEAD_STATUS_LABELS,
  listConsultingLeads,
  updateConsultingLead,
  type AdminConsultingLead,
} from '../lib/marketReportApi';

const FILTERS = ['', 'new', 'contacted', 'closed'] as const;

export default function AdminConsultingLeads() {
  const { tr, language } = useLanguage();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('new');
  const [leads, setLeads] = useState<AdminConsultingLead[] | null | undefined>(undefined);
  const [error, setError] = useState('');

  const load = useCallback(async () => setLeads(await listConsultingLeads(filter || undefined)), [filter]);
  useEffect(() => {
    void load();
  }, [load]);

  const change = async (lead: AdminConsultingLead, status: AdminConsultingLead['status']) => {
    setError('');
    if (!(await updateConsultingLead(lead.id, status))) setError('Không cập nhật được trạng thái. Vui lòng thử lại.');
    await load();
  };
  const date = (iso: string) => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

  return (
    <section aria-label={tr('Yêu cầu tư vấn')} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">{tr('Yêu cầu tư vấn')}</h2>
        <label className="text-xs font-semibold text-slate-700">
          {tr('Trạng thái')}{' '}
          <select value={filter} onChange={(e) => setFilter(e.target.value as (typeof FILTERS)[number])} className="ml-1 rounded-lg border border-slate-200 px-2 py-1 text-xs">
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {tr(f ? LEAD_STATUS_LABELS[f] : 'Tất cả')}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr(error)}
        </p>
      )}
      {leads === null && <p className="text-sm text-rose-700">{tr('Không tải được danh sách yêu cầu.')}</p>}
      {leads && leads.length === 0 && <p className="text-sm text-slate-500">{tr('Không có yêu cầu nào.')}</p>}
      {leads && leads.length > 0 && (
        <ul className="space-y-3">
          {leads.map((lead) => (
            <li key={lead.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm" aria-label={lead.company_name}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold text-slate-900">{lead.company_name}</p>
                <span className="text-xs text-slate-500">{date(lead.created_at)}</span>
              </div>
              <p className="mt-1 text-slate-700">
                {lead.contact_name} · <a href={`mailto:${lead.contact_email}`} className="underline">{lead.contact_email}</a>
                {lead.phone ? ` · ${lead.phone}` : ''}
              </p>
              {lead.report_query && (
                <p className="mt-1 text-xs text-slate-600">
                  {tr('Từ báo cáo')}: {lead.report_query}
                </p>
              )}
              {lead.message && <p className="mt-2 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-slate-700">{lead.message}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">{tr(LEAD_STATUS_LABELS[lead.status])}</span>
                {(['contacted', 'closed'] as const)
                  .filter((s) => s !== lead.status)
                  .map((s) => (
                    <button key={s} type="button" onClick={() => void change(lead, s)} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700">
                      {tr(s === 'contacted' ? 'Đánh dấu đã liên hệ' : 'Đóng yêu cầu')}
                    </button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
