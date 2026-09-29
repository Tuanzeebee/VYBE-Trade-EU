'use client';

// Một ô của dashboard. Ô chưa có dữ liệu hiện hướng dẫn, không bao giờ để trống (AGENTS.md §8).
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { HINTS } from '../lib/dashboardApi';

export default function DashboardTile({
  title,
  hint,
  children,
  className = '',
}: {
  title: string;
  hint: string | null | undefined;
  children?: React.ReactNode;
  className?: string;
}) {
  const { tr } = useLanguage();
  return (
    <section aria-label={tr(title)} className={`rounded-2xl border border-slate-200 bg-white p-5 text-left ${className}`}>
      <h2 className="text-sm font-semibold text-slate-600">{tr(title)}</h2>
      <div className="mt-2">{children}</div>
      {hint && (
        <p role="note" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          {tr(HINTS[hint] ?? HINTS.create_company)}
        </p>
      )}
    </section>
  );
}
