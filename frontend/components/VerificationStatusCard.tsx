'use client';

// Thẻ trạng thái xác minh ở đầu tổng quan exporter: chỉ nói việc tiếp theo cần làm theo trạng thái thật
// của công ty (unverified / pending / verified / rejected), không nhắc lại các bước onboarding đã xong.
import React from 'react';
import { CheckCircle2, Clock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import type { CompanyOut } from '../lib/companyApi';
import type { WorkspaceTabId } from './SellerWorkspace';

type Status = CompanyOut['verification_status'];

export const STATUS_BADGE: Record<Status, { label: string; short: string; tone: string }> = {
  unverified: { label: 'Chưa xác minh', short: 'Chưa', tone: 'bg-slate-100 text-slate-700' },
  pending: { label: 'Đang chờ duyệt', short: 'Chờ', tone: 'bg-amber-100 text-amber-800' },
  verified: { label: 'Đã xác minh', short: 'Đã xác minh', tone: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Bị từ chối', short: 'Từ chối', tone: 'bg-rose-100 text-rose-800' },
};

const COPY: Record<Status, { title: string; body: string; cta: string; icon: typeof Clock; box: string }> = {
  unverified: {
    title: 'Hồ sơ chưa được xác minh',
    body: 'Chỉ doanh nghiệp đã xác minh mới hiện trong danh bạ công khai. Bổ sung bằng chứng rồi gửi yêu cầu xác minh.',
    cta: 'Tiếp tục xác minh',
    icon: ShieldAlert,
    box: 'border-slate-200 bg-white',
  },
  pending: {
    title: 'Hồ sơ đang chờ duyệt',
    body: 'Quản trị viên đang xem xét hồ sơ của bạn. Bạn sẽ nhận thông báo và email khi có kết quả.',
    cta: 'Xem tiến trình xác minh',
    icon: Clock,
    box: 'border-amber-200 bg-amber-50',
  },
  verified: {
    title: 'Doanh nghiệp đã được xác minh',
    body: 'Hồ sơ của bạn đang hiển thị trong danh bạ nhà cung cấp và buyer EU có thể gửi yêu cầu báo giá.',
    cta: 'Xem hồ sơ công khai',
    icon: ShieldCheck,
    box: 'border-emerald-200 bg-emerald-50',
  },
  rejected: {
    title: 'Yêu cầu xác minh chưa được chấp nhận',
    body: 'Xem lý do của quản trị viên, bổ sung hồ sơ hoặc bằng chứng còn thiếu rồi gửi lại.',
    cta: 'Xem lý do và gửi lại',
    icon: ShieldAlert,
    box: 'border-rose-200 bg-rose-50',
  },
};

interface Props {
  company: CompanyOut | null;
  onNavigateTab: (tab: WorkspaceTabId) => void;
  onEditProfile: (step?: number) => void;
}

export default function VerificationStatusCard({ company, onNavigateTab, onEditProfile }: Props) {
  const { tr } = useLanguage();
  if (!company) return null;
  const status: Status = company.verification_status in COPY ? company.verification_status : 'unverified';
  const copy = COPY[status];
  const Icon = copy.icon;
  const score = Math.round(Number(company.profile_completeness_score));
  const action =
    status === 'verified' ? (
      <Link
        href={`/suppliers/${company.slug}`}
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#083832] px-4 py-2 text-xs font-semibold text-white hover:bg-[#062924]"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {tr(copy.cta)}
      </Link>
    ) : (
      <button
        type="button"
        onClick={() => onNavigateTab('verification')}
        className="inline-flex items-center rounded-xl bg-[#083832] px-4 py-2 text-xs font-semibold text-white hover:bg-[#062924]"
      >
        {tr(copy.cta)}
      </button>
    );

  return (
    <section aria-label={tr(copy.title)} className={`rounded-2xl border p-5 sm:p-6 ${copy.box}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-6 w-6 shrink-0 text-slate-700" aria-hidden="true" />
          <div>
            <h2 className="text-base font-bold text-slate-900">{tr(copy.title)}</h2>
            <p className="mt-1 text-sm text-slate-700">{tr(copy.body)}</p>
            {Number.isFinite(score) && (
              <div className="mt-3 h-2 w-full max-w-xs rounded-full bg-white/70 ring-1 ring-slate-200" role="progressbar" aria-label={tr('Hoàn thiện hồ sơ')} aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-2 rounded-full bg-teal-700" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
              </div>
            )}
            {Number.isFinite(score) && (
              <p className="mt-2 text-xs font-semibold text-slate-600">
                {tr('Hoàn thiện hồ sơ')}: {score}%
                {score < 100 && (
                  <button
                    type="button"
                    onClick={() => onEditProfile()}
                    className="ml-2 font-semibold text-teal-800 underline"
                  >
                    {tr('Bổ sung hồ sơ')}
                  </button>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
    </section>
  );
}
