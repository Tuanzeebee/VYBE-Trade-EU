'use client';

// Cảnh báo ngành theo mã HS (U14), vd thẻ vàng IUU cho thủy sản khai thác, và banner dữ liệu minh hoạ
// (AGENTS.md §6.2 sửa đổi). Nội dung cảnh báo là dữ liệu luật TM nhập; giao diện EN dùng bản EN nếu có.
import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { components } from '../lib/api/schema';

export type SectorAlert = components['schemas']['SectorAlertOut'];

export const DEMO_BANNER = 'Dữ liệu minh hoạ — chưa được chuyên gia pháp lý duyệt';

export function DemoDataBanner() {
  const { tr } = useLanguage();
  return (
    <p role="note" data-testid="demo-banner" className="rounded-xl border border-fuchsia-300 bg-fuchsia-50 p-3 text-xs font-bold text-fuchsia-900">
      {tr(DEMO_BANNER)}
    </p>
  );
}

const TONE: Record<string, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  critical: 'border-rose-200 bg-rose-50 text-rose-900',
};

export default function SectorAlerts({ alerts }: { alerts: SectorAlert[] }) {
  const { tr, language } = useLanguage();
  if (alerts.length === 0) return null;
  return (
    <ul aria-label={tr('Cảnh báo ngành')} className="space-y-2">
      {alerts.map((a) => {
        const Icon = a.severity === 'info' ? Info : AlertTriangle;
        const body = language === 'en' ? a.body_en || a.body_vi : a.body_vi;
        return (
          <li key={a.code} className={`rounded-xl border p-3 text-xs ${TONE[a.severity] ?? TONE.warning}`}>
            <p className="flex items-start gap-2 font-bold">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {language === 'en' ? a.title_en : a.title_vi}
                {a.data_status === 'demo_unreviewed' && (
                  <span className="ml-2 rounded bg-fuchsia-100 px-1.5 py-0.5 text-[10px] font-bold text-fuchsia-900">{tr('Minh hoạ')}</span>
                )}
              </span>
            </p>
            {body && <p className="mt-1 pl-6">{body}</p>}
            {a.source_url && (
              <a href={a.source_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block pl-6 font-semibold underline">
                {tr('Nguồn')}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
