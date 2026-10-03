'use client';

// Kết quả kiểm tự động hồ sơ của chính doanh nghiệp (U21): gợi ý để hoàn thiện (vd dùng email theo
// tên miền công ty, sửa website không truy cập được). Không phải quyết định xác minh.
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { listMyChecks, listMyHints, type Check, type Finding } from '../lib/checksApi';
import { CheckList, FindingList } from './VerificationChecks';

export default function OwnerChecks() {
  const { tr } = useLanguage();
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [hints, setHints] = useState<Finding[]>([]);
  useEffect(() => {
    let active = true;
    void listMyChecks().then((rows) => active && setChecks(rows));
    void listMyHints().then((rows) => active && setHints(rows ?? []));
    return () => {
      active = false;
    };
  }, []);
  if ((!checks || checks.length === 0) && hints.length === 0) return null;
  return (
    <section aria-label={tr('Kiểm tự động hồ sơ')} className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-bold text-slate-900">{tr('Kiểm tự động hồ sơ')}</h3>
      <p className="mt-1 text-xs text-slate-600">{tr('Hệ thống tự kiểm email, website, mã VAT và địa chỉ để quản trị viên tham khảo. Mục "Cần xem thêm" là gợi ý để bạn hoàn thiện hồ sơ.')}</p>
      {hints.length > 0 && (
        <div className="mt-4" data-testid="consistency-hints">
          <p className="text-sm font-semibold text-slate-900">{tr('Gợi ý hoàn thiện hồ sơ')}</p>
          <FindingList findings={hints} />
        </div>
      )}
      {checks && checks.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-teal-800">{tr('Xem kết quả kiểm chi tiết')}</summary>
          <div className="mt-3">
            <CheckList checks={checks} />
          </div>
        </details>
      )}
    </section>
  );
}
