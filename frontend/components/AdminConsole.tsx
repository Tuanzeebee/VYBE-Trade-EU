'use client';

// Khung quản trị: hàng đợi xác minh và dữ liệu tuân thủ. (Kiểm duyệt hồ sơ I4 và thống kê I5 thêm ở các tab sau.)
import React, { useState } from 'react';
import AdminComplianceData from './AdminComplianceData';
import AdminVerificationQueue from './AdminVerificationQueue';
import { useLanguage } from '../context/LanguageContext';

const TABS = [
  { key: 'queue', label: 'Chờ duyệt' },
  { key: 'data', label: 'Dữ liệu tuân thủ' },
] as const;

export default function AdminConsole() {
  const { tr } = useLanguage();
  const [active, setActive] = useState<(typeof TABS)[number]['key']>('queue');
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-5 py-10 sm:px-8">
      <h1 className="text-3xl font-bold text-slate-900">{tr('Quản trị')}</h1>
      <div role="tablist" aria-label={tr('Quản trị')} className="flex gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={active === t.key}
            onClick={() => setActive(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${active === t.key ? 'border-[#083832] text-[#083832]' : 'border-transparent text-slate-500'}`}
          >
            {tr(t.label)}
          </button>
        ))}
      </div>
      {active === 'queue' ? <AdminVerificationQueue /> : <AdminComplianceData />}
    </main>
  );
}
