'use client';

// Tỷ lệ quay lại có thông tin mới theo tuần (G3). Mục tiêu của spec §5.8: 90% lượt quay lại.
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { fetchReturnVisits, type ReturnVisitStats } from '../lib/dashboardApi';

const percent = (ratio: string | null) => (ratio === null ? '—' : `${(Number(ratio) * 100).toFixed(1)}%`);

export default function AdminReturnVisits() {
  const { tr } = useLanguage();
  const [stats, setStats] = useState<ReturnVisitStats | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetchReturnVisits(8).then((s) => active && setStats(s));
    return () => {
      active = false;
    };
  }, []);

  if (stats === undefined) return null;
  if (stats === null) {
    return (
      <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
        {tr('Không tải được tỷ lệ quay lại. Vui lòng thử lại.')}
      </p>
    );
  }
  return (
    <section aria-label={tr('Tỷ lệ quay lại có thông tin mới')} className="rounded-2xl border border-slate-200 bg-white p-6 text-left">
      <h2 className="text-sm font-semibold text-slate-600">{tr('Tỷ lệ quay lại có thông tin mới')}</h2>
      <p className="mt-2 text-4xl font-extrabold text-[#083832]">{percent(stats.overall_ratio)}</p>
      <p className="text-xs text-slate-500">
        {tr('Mục tiêu')}: {percent(stats.target_ratio)}
      </p>
      {stats.weeks.length === 0 ? (
        <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          {tr('Chưa có lượt quay lại nào. Số liệu xuất hiện khi người dùng mở lại bảng điều khiển.')}
        </p>
      ) : (
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th scope="col" className="py-1 font-semibold">{tr('Tuần bắt đầu')}</th>
              <th scope="col" className="py-1 font-semibold">{tr('Lượt quay lại')}</th>
              <th scope="col" className="py-1 font-semibold">{tr('Có thông tin mới')}</th>
              <th scope="col" className="py-1 font-semibold">{tr('Tỷ lệ')}</th>
            </tr>
          </thead>
          <tbody>
            {stats.weeks.map((w) => (
              <tr key={w.week_start} className="border-t border-slate-100">
                <td className="py-1">{w.week_start}</td>
                <td className="py-1">{w.return_visits}</td>
                <td className="py-1">{w.with_new_info}</td>
                <td className="py-1 font-semibold">{percent(w.ratio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
