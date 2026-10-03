'use client';
// Biểu đồ định vị và năng lực (N5): radar bốn trục bằng SVG thuần. Có bảng văn bản cho trình đọc màn hình
// và hiện giá trị khi rê/focus từng trục.
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const AXES: { key: string; label: string }[] = [
  { key: 'volume', label: 'Sản lượng' },
  { key: 'certification', label: 'Chứng nhận' },
  { key: 'trust', label: 'Xác minh' },
  { key: 'experience', label: 'Kinh nghiệm xuất khẩu' },
];

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 80;

const point = (index: number, value: number) => {
  const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2;
  const r = (RADIUS * Math.max(0, Math.min(100, value))) / 100;
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)] as const;
};

export default function PositioningChart({ score, axes }: { score: string; axes: Record<string, string> }) {
  const { tr } = useLanguage();
  const [active, setActive] = useState<string | null>(null);
  const values = AXES.map((a) => Number(axes[a.key] ?? 0));
  const polygon = values.map((v, i) => point(i, v).join(',')).join(' ');
  const summary = AXES.map((a, i) => `${tr(a.label)}: ${values[i]}`).join(', ');
  return (
    <figure className="flex flex-wrap items-center gap-4" data-testid="positioning-chart">
      <svg role="img" aria-label={`${tr('Điểm năng lực')} ${score}/100. ${summary}`} viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-56 w-56 shrink-0">
        {[25, 50, 75, 100].map((ring) => (
          <polygon key={ring} points={AXES.map((_, i) => point(i, ring).join(',')).join(' ')} fill="none" stroke="#e2e8f0" strokeWidth="1" />
        ))}
        {AXES.map((a, i) => {
          const [x, y] = point(i, 100);
          const [lx, ly] = point(i, 122);
          return (
            <g key={a.key}>
              <line x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="#e2e8f0" />
              <text x={lx} y={ly} textAnchor="middle" fontSize="9" fill="#334155">
                {tr(a.label)}
              </text>
            </g>
          );
        })}
        <polygon points={polygon} fill="rgba(13,118,110,0.25)" stroke="#0d766e" strokeWidth="2" />
        {AXES.map((a, i) => {
          const [x, y] = point(i, values[i]);
          return (
            <circle
              key={a.key}
              cx={x}
              cy={y}
              r="5"
              fill="#0d766e"
              tabIndex={0}
              role="img"
              aria-label={`${tr(a.label)}: ${values[i]}`}
              onMouseEnter={() => setActive(a.key)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(a.key)}
              onBlur={() => setActive(null)}
            />
          );
        })}
      </svg>
      <figcaption className="text-sm text-slate-700">
        <p className="text-2xl font-extrabold text-[#083832]">{score}/100</p>
        <p className="text-xs text-slate-500">{tr('Điểm năng lực tổng hợp')}</p>
        <ul className="mt-2 space-y-0.5 text-xs">
          {AXES.map((a, i) => (
            <li key={a.key} className={active === a.key ? 'font-bold text-[#083832]' : ''}>
              {tr(a.label)}: {values[i]}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
