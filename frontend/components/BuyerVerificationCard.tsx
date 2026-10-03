'use client';

// Xác minh buyer TÙY CHỌN (U6, ADR-0004 — B1 "KYB nhẹ"). Buyer chưa xác minh vẫn xem hồ sơ, nhắn tin và
// gửi yêu cầu báo giá trong hạn mức; xác minh chỉ thêm nhãn tin cậy và hạn mức cao hơn. Trạng thái do
// quản trị viên quyết định sau khi đối chiếu mã VAT / số đăng ký, không phải hệ thống.
import React, { useEffect, useState } from 'react';
import { Clock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { CompanyOut } from '../lib/companyApi';
import { listMyRequests, submitRequest, type VerificationRequest } from '../lib/verificationApi';

type Status = CompanyOut['verification_status'];

const COPY: Record<Status, { title: string; body: string; icon: typeof Clock; box: string }> = {
  unverified: {
    title: 'Xác minh doanh nghiệp (không bắt buộc)',
    body: 'Bạn vẫn xem hồ sơ, nhắn tin và gửi yêu cầu báo giá khi chưa xác minh. Xác minh giúp nhà cung cấp tin tưởng hơn: nhãn "Doanh nghiệp đã xác minh" và hạn mức yêu cầu báo giá cao hơn.',
    icon: ShieldAlert,
    box: 'border-slate-200 bg-white',
  },
  pending: {
    title: 'Yêu cầu xác minh đang chờ duyệt',
    body: 'Quản trị viên đang đối chiếu mã VAT hoặc số đăng ký của bạn. Trong lúc chờ, bạn vẫn dùng mọi tính năng như bình thường.',
    icon: Clock,
    box: 'border-amber-200 bg-amber-50',
  },
  verified: {
    title: 'Doanh nghiệp đã xác minh',
    body: 'Nhà cung cấp thấy nhãn "Doanh nghiệp đã xác minh" trên yêu cầu báo giá của bạn.',
    icon: ShieldCheck,
    box: 'border-emerald-200 bg-emerald-50',
  },
  rejected: {
    title: 'Yêu cầu xác minh chưa được chấp nhận',
    body: 'Xem lý do của quản trị viên, cập nhật thông tin rồi gửi lại.',
    icon: ShieldAlert,
    box: 'border-rose-200 bg-rose-50',
  },
};

export default function BuyerVerificationCard({ company, onChanged }: { company: CompanyOut; onChanged: () => void }) {
  const { tr, language } = useLanguage();
  const [requests, setRequests] = useState<VerificationRequest[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const status: Status = company.verification_status in COPY ? company.verification_status : 'unverified';

  useEffect(() => {
    let active = true;
    void listMyRequests('buyer').then((rows) => {
      if (active) setRequests(rows);
    });
    return () => {
      active = false;
    };
  }, [status]);

  const latest = requests?.[0];
  const reason = latest && ['rejected', 'info_requested'].includes(latest.status) ? latest.decision_reason : null;
  const canSubmit = status === 'unverified' || status === 'rejected';
  const hasIdentifier = Boolean(company.vat_number || company.registration_number);
  const copy = COPY[status];
  const Icon = copy.icon;

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await submitRequest('buyer');
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không kết nối được máy chủ. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label={tr('Xác minh doanh nghiệp')} className={`rounded-3xl border p-5 sm:p-6 ${copy.box}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#083832]" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-base font-bold text-slate-900">{tr(copy.title)}</h2>
          <p className="text-sm text-slate-700">{tr(copy.body)}</p>
          {status === 'verified' && company.expires_at && (
            <p className="text-xs text-slate-600">
              {tr('Hiệu lực đến')}: {new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium' }).format(new Date(company.expires_at))}
            </p>
          )}
          {reason && (
            <p className="rounded-xl bg-white/70 p-3 text-sm text-slate-800">
              <span className="font-semibold">{tr('Lý do')}:</span> {reason}
            </p>
          )}
          {canSubmit && (
            <div className="space-y-2 pt-1">
              {!hasIdentifier && (
                <p className="text-xs text-slate-600">{tr('Cần lưu mã số VAT hoặc số đăng ký doanh nghiệp để quản trị viên đối chiếu.')}</p>
              )}
              <button
                type="button"
                disabled={busy || !hasIdentifier}
                onClick={() => void submit()}
                className="rounded-xl bg-[#083832] px-4 py-2 text-xs font-semibold text-white hover:bg-[#062924] disabled:opacity-50"
              >
                {tr(busy ? 'Đang gửi...' : 'Gửi yêu cầu xác minh')}
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
              {tr(error)}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
