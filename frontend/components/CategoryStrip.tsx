// Dải nhóm hàng (N7, kiểu Ankorstore/Faire): duyệt danh bạ theo nhóm hàng. Không dùng hook nên render
// được phía server; nhận hàm dịch `t` từ nơi gọi. Nhóm hàng lấy từ danh sách ngành của hồ sơ (INDUSTRIES).
import React from 'react';
import { Link } from '../i18n/navigation';
import { INDUSTRIES } from '../lib/companyApi';

export default function CategoryStrip({ t, active }: { t: (vi: string) => string; active?: string }) {
  return (
    <nav aria-label={t('Nhóm hàng')} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
      {INDUSTRIES.map((industry) => {
        const isActive = active === industry.code;
        return (
          <Link
            key={industry.code}
            href={`/suppliers?category=${industry.code}`}
            aria-current={isActive ? 'page' : undefined}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
              isActive ? 'border-[#083832] bg-[#083832] text-white' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'
            }`}
          >
            {t(industry.label)}
          </Link>
        );
      })}
    </nav>
  );
}
