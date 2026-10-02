'use client';

// Bộ phụ trợ chung cho các biểu đồ thị trường (Recharts): màu đạt tương phản ≥ 4.5:1 trên nền trắng,
// khung có mô tả cho trình đọc màn hình, tooltip và đổi chuỗi Decimal của API sang số CHỈ để vẽ
// (nhãn hiển thị vẫn dùng eurCompact / percentOf).
import React from 'react';

export const COLORS = {
  main: '#0f766e', // thị trường chính
  potential: '#0369a1', // thị trường tiềm năng
  vn: '#b45309', // Việt Nam
  other: '#475569', // nước khác
  text: '#334155',
  grid: '#e2e8f0',
} as const;

export const AXIS_TICK = { fill: COLORS.text, fontSize: 12 } as const;

/** Chuỗi Decimal / số → số hữu hạn; thiếu hoặc không hợp lệ → null (điểm đó bị bỏ, không vẽ thành 0). */
export function num(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Khung biểu đồ: tiêu đề, mô tả cho trình đọc màn hình (role="img"), chiều cao cố định, chú thích. */
export function ChartFrame({
  title,
  summary,
  height,
  legend,
  note,
  children,
}: {
  title: string;
  summary: string;
  height: number;
  legend?: { color: string; label: string }[];
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-4">
      <figcaption className="text-sm font-bold text-slate-900">{title}</figcaption>
      {legend && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700" aria-hidden="true">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              {item.label}
            </li>
          ))}
        </ul>
      )}
      <div role="img" aria-label={summary} className="mt-2 w-full" style={{ height }}>
        {children}
      </div>
      {note && <p className="mt-2 text-xs text-slate-600">{note}</p>}
    </figure>
  );
}

interface TipPayload<Row> {
  payload?: Row;
}

/** Tooltip chung: tiêu đề + các dòng "nhãn: giá trị" do `lines` dựng từ dòng dữ liệu đang trỏ tới. */
export function RowTooltip<Row>({
  active,
  payload,
  title,
  lines,
}: {
  active?: boolean;
  payload?: ReadonlyArray<TipPayload<Row>>;
  title: (row: Row) => string;
  lines: (row: Row) => [label: string, value: string][];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 shadow-md">
      <p className="font-bold text-slate-900">{title(row)}</p>
      <dl className="mt-1 space-y-0.5">
        {lines(row).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-slate-600">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
