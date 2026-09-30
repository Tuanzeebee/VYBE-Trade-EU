'use client';

// Kết quả kiểm tự động hồ sơ của chính doanh nghiệp (U21): gợi ý để hoàn thiện (vd dùng email theo
// tên miền công ty, sửa website không truy cập được). Không phải quyết định xác minh.
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { listMyChecks, type Check } from '../lib/checksApi';
import { CheckList } from './VerificationChecks';

export default function OwnerChecks() {
  const { tr } = useLanguage();
  const [checks, setChecks] = useState<Check[] | null>(null);
  useEffect(() => {
    let active = true;
    void listMyChecks().then((rows) => active && setChecks(rows));
    return () => {
      active = false;
    };
  }, []);
  if (!checks || checks.length === 0) return null;
  return (
    <section aria-label={tr('Kiểm tự động hồ sơ')} className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-bold text-slate-900">{tr('Kiểm tự động hồ sơ')}</h3>
      <p className="mt-1 text-xs text-slate-600">{tr('Hệ thống tự kiểm email, website, mã VAT và địa chỉ để quản trị viên tham khảo. Mục "Cần xem thêm" là gợi ý để bạn hoàn thiện hồ sơ.')}</p>
      <div className="mt-3">
        <CheckList checks={checks} />
      </div>
    </section>
  );
}
