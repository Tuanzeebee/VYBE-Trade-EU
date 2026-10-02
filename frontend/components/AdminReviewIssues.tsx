'use client';

// Hàng đợi admin: dòng dữ liệu tuân thủ mà luật sư trả "SUA" (cần sửa) khi nhập file duyệt
// (SPEC_compliance_data_20_codes §6.3). Dòng đó chưa được duyệt; admin sửa dữ liệu rồi bấm "Đã xử lý".
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { fetchReviewIssues, resolveReviewIssue, type ReviewIssue } from '../lib/complianceApi';

export default function AdminReviewIssues() {
  const { tr, language } = useLanguage();
  const [issues, setIssues] = useState<ReviewIssue[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await fetchReviewIssues(true);
    setFailed(result === null);
    setIssues(result ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = async (id: string) => {
    setBusy(id);
    if (await resolveReviewIssue(id)) await load();
    setBusy(null);
  };

  return (
    <section aria-label={tr('Dòng luật sư yêu cầu sửa')} className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-900">{tr('Dòng luật sư yêu cầu sửa')}</h2>
      <p className="mt-1 text-sm text-slate-600">
        {tr('Các dòng này chưa được duyệt. Sửa dữ liệu theo ghi chú rồi bấm "Đã xử lý".')}
      </p>
      {failed && (
        <p data-testid="issues-error" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr('Không tải được hàng đợi. Vui lòng thử lại.')}
        </p>
      )}
      {issues && issues.length === 0 && !failed && (
        <p className="mt-3 text-sm text-slate-600" data-testid="issues-empty">
          {tr('Không có dòng nào đang chờ sửa. Khi luật sư trả "SUA" trong file duyệt, dòng đó sẽ hiện ở đây.')}
        </p>
      )}
      {issues && issues.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {issues.map((issue) => (
            <li key={issue.id} className="flex flex-wrap items-start justify-between gap-3 p-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900">{issue.label}</p>
                <p className="mt-1 text-slate-700">{issue.note}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(issue.created_at).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-GB')}</p>
              </div>
              <button
                type="button"
                disabled={busy === issue.id}
                onClick={() => resolve(issue.id)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
              >
                {tr('Đã xử lý')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
