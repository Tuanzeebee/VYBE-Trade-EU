'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { translateText, type Locale } from '../i18n/translate';

/** Khung chờ khi chuyển trang, xác nhận phiên hoặc tải dữ liệu ban đầu — thay cho màn hình trắng. */
export function PageLoader() {
  const label = translateText('Đang tải…', useLocale() as Locale);
  return (
    // Không dùng role="status": vai trò đó dành cho thông báo của trang (hướng dẫn khi trống, lỗi…).
    <div aria-busy="true" aria-live="polite" className="flex min-h-[60vh] w-full items-center justify-center">
      <span aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
