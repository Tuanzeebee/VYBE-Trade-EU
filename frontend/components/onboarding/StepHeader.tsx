'use client';

// Tiêu đề của một bước onboarding: tên bước, "Bước N / M" và dòng gợi ý. Dùng chung seller và buyer.
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export function StepHeader({
  step,
  total,
  title,
  hint,
  titleId,
}: {
  step: number;
  total: number;
  title: string;
  hint: string;
  titleId?: string;
}) {
  const { tr } = useLanguage();
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h2 id={titleId} className="text-xl sm:text-2xl font-bold text-slate-900">{tr(title)}</h2>
        {/* Một text node duy nhất để giao diện và test đọc được "Bước 3 / 4". */}
        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/60">
          {tr(`Bước ${step} / ${total}`)}
        </span>
      </div>
      <p className="text-xs sm:text-sm text-slate-500 font-normal">{tr(hint)}</p>
    </div>
  );
}
