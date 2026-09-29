'use client';

// Tổng quan nội bộ (I5): số doanh nghiệp đã xác minh và hồ sơ chờ duyệt. Kèm chỉ số AI (D3).
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getStats, type Stats } from '../lib/adminApi';

export default function AdminOverview() {
  const { tr } = useLanguage();
  const [stats, setStats] = useState<Stats | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    getStats().then((s) => active && setStats(s));
    return () => {
      active = false;
    };
  }, []);

  if (stats === undefined) return null;
  if (stats === null) {
    return (
      <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
        {tr('Không tải được số liệu. Vui lòng thử lại.')}
      </p>
    );
  }

  const tiles = [
    { label: 'Doanh nghiệp đã xác minh', value: stats.verified_count, hint: 'Chưa có doanh nghiệp nào được xác minh. Duyệt hồ sơ ở tab Chờ duyệt.' },
    { label: 'Hồ sơ chờ duyệt', value: stats.pending_count, hint: 'Chưa có hồ sơ nào đang chờ duyệt.' },
    { label: 'Câu hỏi AI trong 7 ngày', value: stats.ai_queries_this_week, hint: 'Chưa có câu hỏi nào gửi tới trợ lý AI trong 7 ngày qua.' },
  ];
  const average = stats.avg_confidence;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} role="group" aria-label={tr(t.label)} className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-600">{tr(t.label)}</p>
          <p className="mt-2 text-4xl font-extrabold text-[#083832]">{t.value}</p>
          {t.value === 0 && <p className="mt-2 text-xs text-slate-500">{tr(t.hint)}</p>}
        </div>
      ))}
      <div role="group" aria-label={tr('Độ tin cậy AI trung bình')} className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm font-semibold text-slate-600">{tr('Độ tin cậy AI trung bình')}</p>
        <p className="mt-2 text-4xl font-extrabold text-[#083832]">{average === null ? '—' : average.toFixed(1)}</p>
        <p className="mt-2 text-xs text-slate-500">{tr('Thang 1 (thấp) đến 3 (cao). Chưa tính câu ngoài phạm vi.')}</p>
      </div>
    </div>
  );
}
