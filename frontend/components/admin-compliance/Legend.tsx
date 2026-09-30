'use client';

// Chú thích các cột và giá trị của nhóm dữ liệu đang xem (chỉ giải thích ý nghĩa, không chứa số liệu luật).
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { COMMON_LEGEND, type Dataset } from './datasets';

export default function Legend({ dataset }: { dataset: Dataset }) {
  const { tr } = useLanguage();
  const items = [...dataset.legend, ...COMMON_LEGEND];
  return (
    <details open className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
      <summary className="cursor-pointer font-semibold text-slate-800">{tr('Chú thích các cột và giá trị')}</summary>
      <dl className="mt-2 grid gap-x-4 gap-y-1.5 sm:grid-cols-[max-content_1fr]">
        {items.map((item) => (
          <React.Fragment key={item.term}>
            <dt className="font-mono font-semibold text-[#083832]">{tr(item.term)}</dt>
            <dd>{tr(item.text)}</dd>
          </React.Fragment>
        ))}
      </dl>
    </details>
  );
}
