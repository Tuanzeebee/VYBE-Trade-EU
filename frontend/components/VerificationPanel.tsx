'use client';

// Trạng thái xác minh của exporter (I1, I2): xem trạng thái, gửi yêu cầu, thấy lý do bị từ chối / yêu cầu bổ sung.
// Xác minh là quyết định của quản trị viên; hoàn thiện hồ sơ hay nộp bằng chứng không tự làm nên xác minh.
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getMyCompany, type CompanyOut } from '../lib/companyApi';
import { listMyRequests, submitRequest, type VerificationRequest } from '../lib/verificationApi';
import VerificationTier from './VerificationTier';
import OwnerChecks from './OwnerChecks';
import TrustScorePanel from './TrustScorePanel';
import { PageLoader } from './PageLoader';

const STATUS: Record<string, { label: string; tone: string }> = {
  unverified: { label: 'Chưa xác minh', tone: 'bg-slate-100 text-slate-700' },
  pending: { label: 'Đang chờ duyệt', tone: 'bg-amber-100 text-amber-800' },
  verified: { label: 'Đã xác minh', tone: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Bị từ chối', tone: 'bg-rose-100 text-rose-800' },
};

const date = (value: string, locale: string) => new Date(value).toLocaleDateString(locale);

export default function VerificationPanel() {
  const { tr, language } = useLanguage();
  const [company, setCompany] = useState<CompanyOut | null | undefined>(undefined);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const locale = language === 'en' ? 'en-GB' : 'vi-VN';

  const load = useCallback(async () => {
    const [c, r] = await Promise.all([getMyCompany(), listMyRequests()]);
    setCompany(c);
    setRequests(r ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await submitRequest();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không kết nối được máy chủ. Vui lòng thử lại.');
    } finally {
      setBusy(false);
      await load();
    }
  };

  if (company === undefined) return <PageLoader />;
  if (company === null) {
    return (
      <p role="status" className="rounded-2xl bg-white p-5 text-sm text-slate-700">
        {tr('Hãy tạo hồ sơ doanh nghiệp trước, sau đó bạn có thể gửi yêu cầu xác minh.')}
      </p>
    );
  }

  const status = company.verification_status;
  const latest = [...requests].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0];
  const canSubmit = status === 'unverified' || status === 'rejected';
  const askedForInfo = latest?.status === 'info_requested';

  return (
    <div className="space-y-4 text-left">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-base font-bold text-slate-900">{tr('Trạng thái xác minh')}</h3>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS[status].tone}`}>{tr(STATUS[status].label)}</span>
          {askedForInfo && (
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">{tr('Cần bổ sung')}</span>
          )}
        </div>

        {status === 'verified' && (
          <p className="mt-3 text-sm text-slate-700">
            {company.verification_level === 'evfta_verified'
              ? tr('Đủ bằng chứng xuất xứ bắt buộc còn hạn cho nhóm hàng của bạn.')
              : tr('Chưa đủ bằng chứng xuất xứ bắt buộc còn hạn cho nhóm hàng của bạn.')}
            {company.expires_at && (
              <>
                {' '}
                {tr('Có hiệu lực đến')} {date(company.expires_at, locale)}.
              </>
            )}
          </p>
        )}
        {status === 'pending' && (
          <p className="mt-3 text-sm text-slate-700">{tr('Quản trị viên đang xem xét hồ sơ của bạn.')}</p>
        )}
        {latest?.decision_reason && (status === 'rejected' || askedForInfo) && (
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-800">
            <strong>{tr('Lý do của quản trị viên')}:</strong> {latest.decision_reason}
          </p>
        )}

        <p className="mt-3 text-xs text-slate-500">
          {tr('Hoàn thiện hồ sơ và nộp bằng chứng không đồng nghĩa đã xác minh: việc xác minh do quản trị viên quyết định.')}
        </p>

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {tr(error)}
          </p>
        )}
        {canSubmit && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="mt-4 rounded-xl bg-[#083832] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#062924] disabled:opacity-60"
          >
            {tr('Gửi yêu cầu xác minh')}
          </button>
        )}
      </section>
      <VerificationTier />
      <OwnerChecks />
      <TrustScorePanel />
    </div>
  );
}
