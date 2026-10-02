'use client';

// Một khối trong bước "xem lại & hoàn tất": tiêu đề, nút Sửa quay về bước đó, các dòng nhãn: giá trị.
// Dùng chung seller và buyer; khối giàu nội dung (danh sách sản phẩm) truyền qua children.
import React from 'react';
import { Pencil } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export function ReviewSection({
  title,
  onEdit,
  rows,
  children,
}: {
  title: string;
  onEdit: () => void;
  rows?: [label: string, value: string][];
  children?: React.ReactNode;
}) {
  const { tr } = useLanguage();
  return (
    <section className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">{tr(title)}</h3>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`${tr('Sửa')}: ${tr(title)}`}
          className="flex items-center gap-1 text-xs font-semibold text-teal-800 hover:underline"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          {tr('Sửa')}
        </button>
      </div>
      {rows && (
        <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="min-w-0 break-words">
              <dt className="inline text-slate-500">{label}: </dt>
              <dd className="inline font-medium text-slate-800">{value || '—'}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </section>
  );
}
