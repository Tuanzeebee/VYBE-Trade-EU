'use client';

// Phân trang cho bảng dữ liệu tuân thủ: "x–y / tổng" và nút Trước / Sau.
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const PAGE_SIZE = 20;

interface Props {
  total: number;
  page: number;
  onPage: (page: number) => void;
}

export default function Pagination({ total, page, onPage }: Props) {
  const { tr } = useLanguage();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total <= PAGE_SIZE) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);
  const button = 'rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50';
  return (
    <nav aria-label={tr('Phân trang')} className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-600">
      <span aria-live="polite">
        {from}–{to} / {total}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" className={button} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          {tr('Trước')}
        </button>
        <span>
          {page} / {pages}
        </span>
        <button type="button" className={button} disabled={page >= pages} onClick={() => onPage(page + 1)}>
          {tr('Sau')}
        </button>
      </div>
    </nav>
  );
}
