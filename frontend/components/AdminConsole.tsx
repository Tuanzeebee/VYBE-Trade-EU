'use client';

// Khung quản trị: tổng quan, hàng đợi xác minh, kiểm duyệt, dữ liệu tuân thủ và nhật ký.
import React, { useState } from 'react';
import AdminAuditLog from './AdminAuditLog';
import AdminComplianceData from './AdminComplianceData';
import AdminModeration from './AdminModeration';
import AdminOverview from './AdminOverview';
import AdminVerificationQueue from './AdminVerificationQueue';
import { useLanguage } from '../context/LanguageContext';

const TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'queue', label: 'Chờ duyệt' },
  { key: 'moderation', label: 'Hồ sơ & sản phẩm' },
  { key: 'data', label: 'Dữ liệu tuân thủ' },
  { key: 'audit', label: 'Nhật ký' },
] as const;

const PANELS = {
  overview: AdminOverview,
  queue: AdminVerificationQueue,
  moderation: AdminModeration,
  data: AdminComplianceData,
  audit: AdminAuditLog,
};

export default function AdminConsole() {
  const { tr } = useLanguage();
  const [active, setActive] = useState<(typeof TABS)[number]['key']>('overview');
  const Panel = PANELS[active];
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-5 py-10 sm:px-8">
      <h1 className="text-3xl font-bold text-slate-900">{tr('Quản trị')}</h1>
      <div role="tablist" aria-label={tr('Quản trị')} className="flex gap-2 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={active === t.key}
            onClick={() => setActive(t.key)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold ${active === t.key ? 'border-[#083832] text-[#083832]' : 'border-transparent text-slate-500'}`}
          >
            {tr(t.label)}
          </button>
        ))}
      </div>
      <Panel />
    </main>
  );
}
