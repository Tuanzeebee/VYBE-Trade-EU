'use client';

// Chỉ số tập trung nguồn cung (HHI, 0–10.000): thanh đo thuần CSS. Chỉ hiện con số và thang đo, KHÔNG gắn
// nhãn ngưỡng "thấp / cao" để không tự đặt ngưỡng đánh giá; hệ thống chỉ trình bày số từ thống kê.
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { COLORS, num } from './chartKit';

const MAX = 10_000;

export function HhiMeter({ hhi }: { hhi: string | null | undefined }) {
  const { tr } = useLanguage();
  const value = num(hhi);
  if (value === null) return null;
  const clamped = Math.min(Math.max(value, 0), MAX);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4" data-testid="hhi-meter">
      <p className="text-sm font-bold text-slate-900">
        {tr('Mức tập trung nguồn cung (HHI)')}: {value.toFixed(0)}
      </p>
      <div
        role="meter"
        aria-label={tr('Mức tập trung nguồn cung (HHI)')}
        aria-valuemin={0}
        aria-valuemax={MAX}
        aria-valuenow={clamped}
        aria-valuetext={`${value.toFixed(0)} / ${MAX}`}
        className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div className="h-full rounded-full" style={{ width: `${(clamped / MAX) * 100}%`, backgroundColor: COLORS.main }} />
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-600" aria-hidden="true">
        <span>0</span>
        <span>5.000</span>
        <span>10.000</span>
      </div>
      <p className="mt-2 text-xs text-slate-600">
        {tr('HHI càng cao thì thị trường càng tập trung vào ít nước cung cấp. Thang từ 0 đến 10.000.')}
      </p>
    </div>
  );
}
