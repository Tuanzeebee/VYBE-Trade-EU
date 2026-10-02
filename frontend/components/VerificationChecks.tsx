'use client';

// Kết quả kiểm tự động và kiểm tay (U21, ADR-0003). Chỉ là tín hiệu để admin xem xét — không tự
// đổi trạng thái xác minh. Admin chạy lại kiểm tra và ghi kết quả kiểm tay (vd Cổng ĐKDN quốc gia).
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { recordManualCheck, runChecks, type Check, type Finding, type ManualCheckCode } from '../lib/checksApi';

export const CHECK_LABELS: Record<string, string> = {
  email_free_mail: 'Email theo tên miền công ty (không phải mail miễn phí)',
  email_mx: 'Tên miền email nhận được thư (MX)',
  domain_age: 'Tên miền đã đăng ký trên 1 năm',
  website_live: 'Website truy cập được',
  website_name_match: 'Website có tên công ty',
  website_email_domain: 'Website cùng tên miền với email',
  vies_vat: 'Mã VAT hợp lệ trên VIES',
  vies_name_match: 'Tên trên VIES khớp tên công ty',
  vies_address_match: 'Địa chỉ trên VIES khớp địa chỉ khai báo',
  gleif_lei: 'Mã LEI trên GLEIF',
  gleif_registration_match: 'Số đăng ký trên GLEIF khớp số đã khai',
  gleif_address_match: 'Địa chỉ trên GLEIF khớp địa chỉ khai báo',
  geocode: 'Địa chỉ định vị được trên bản đồ',
  traces_facility: 'Mã cơ sở có trong danh sách EU TRACES-NT',
  national_registry: 'Đối chiếu Cổng thông tin quốc gia về đăng ký doanh nghiệp',
  company_registry: 'Đối chiếu sổ đăng ký doanh nghiệp nước sở tại',
  certificate_issuer: 'Đối chiếu chứng nhận với tổ chức cấp',
  factory_video: 'Xem tour video nhà máy',
  other: 'Kiểm tra khác',
};
export const CHECK_STATUS: Record<Check['status'], { label: string; tone: string }> = {
  pass: { label: 'Đạt', tone: 'bg-emerald-100 text-emerald-800' },
  warning: { label: 'Cần xem thêm', tone: 'bg-amber-100 text-amber-800' },
  fail: { label: 'Không đạt', tone: 'bg-rose-100 text-rose-800' },
  unknown: { label: 'Chưa xác định', tone: 'bg-slate-100 text-slate-700' },
};
const MANUAL: ManualCheckCode[] = ['national_registry', 'company_registry', 'certificate_issuer', 'factory_video', 'other'];
const REGISTRY_URL = 'https://dangkykinhdoanh.gov.vn';

export function CheckList({ checks }: { checks: Check[] }) {
  const { tr, language } = useLanguage();
  if (checks.length === 0) return <p className="text-xs text-slate-500">{tr('Chưa có kết quả kiểm tra.')}</p>;
  const date = (iso: string) => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium' }).format(new Date(iso));
  return (
    <ul className="space-y-1">
      {checks.map((c) => (
        <li key={c.check_code} className="flex flex-wrap items-center gap-2 text-xs text-slate-700" aria-label={tr(CHECK_LABELS[c.check_code] ?? c.check_code)}>
          <span className={`rounded-full px-2 py-0.5 font-semibold ${CHECK_STATUS[c.status].tone}`}>{tr(CHECK_STATUS[c.status].label)}</span>
          <span>{tr(CHECK_LABELS[c.check_code] ?? c.check_code)}</span>
          <span className="text-slate-400">
            {tr(c.manual ? 'kiểm tay' : 'tự động')} · {date(c.checked_at)}
          </span>
          {typeof c.detail.note === 'string' && c.detail.note && <span className="text-slate-500">— {c.detail.note}</span>}
        </li>
      ))}
    </ul>
  );
}

export function FindingList({ findings }: { findings: Finding[] }) {
  const { language } = useLanguage();
  return (
    <ul className="mt-1 space-y-1">
      {findings.map((f) => (
        <li key={f.code} className={`rounded-lg px-2 py-1 text-xs ${f.severity === 'warning' ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-700'}`}>
          {language === 'en' ? f.message_en : f.message_vi}
        </li>
      ))}
    </ul>
  );
}

export function AdminChecks({ companyId, country, checks, onChanged }: { companyId: string; country: string; checks: Check[]; onChanged: () => void }) {
  const { tr } = useLanguage();
  const [code, setCode] = useState<ManualCheckCode>(country === 'VN' ? 'national_registry' : 'company_registry');
  const [status, setStatus] = useState<'pass' | 'fail' | 'warning'>('pass');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');

  const save = async () => {
    setMessage('');
    if (!note.trim()) return setMessage('Vui lòng ghi chú kết quả đối chiếu.');
    const ok = await recordManualCheck(companyId, { check_code: code, status, note: note.trim(), url: code === 'national_registry' ? REGISTRY_URL : null });
    setMessage(ok ? 'Đã ghi kết quả kiểm tay.' : 'Không ghi được. Vui lòng thử lại.');
    if (ok) {
      setNote('');
      onChanged();
    }
  };
  const rerun = async () => setMessage((await runChecks(companyId)) ? 'Đã xếp lịch kiểm lại; kết quả cập nhật sau ít phút.' : 'Không ghi được. Vui lòng thử lại.');

  return (
    <div role="group" aria-label={tr('Kiểm tự động và kiểm tay')} className="mt-4 rounded-xl border border-slate-200 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700">{tr('Kiểm tự động và kiểm tay')}</p>
        <button type="button" onClick={() => void rerun()} className="text-xs font-semibold text-teal-800 underline">
          {tr('Chạy lại kiểm tra')}
        </button>
      </div>
      <div className="mt-2">
        <CheckList checks={checks} />
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{tr('Kết quả kiểm chỉ là tín hiệu tham khảo; quyết định xác minh do bạn đưa ra.')}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="text-xs text-slate-600">
          {tr('Ghi kết quả kiểm tay')}
          <select value={code} onChange={(e) => setCode(e.target.value as ManualCheckCode)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm">
            {MANUAL.map((m) => (
              <option key={m} value={m}>
                {tr(CHECK_LABELS[m])}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-600">
          {tr('Kết quả')}
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm">
            <option value="pass">{tr('Đạt')}</option>
            <option value="warning">{tr('Cần xem thêm')}</option>
            <option value="fail">{tr('Không đạt')}</option>
          </select>
        </label>
        <label className="text-xs text-slate-600 sm:col-span-2">
          {tr('Ghi chú đối chiếu')}
          <input value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm" />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void save()} className="rounded-lg bg-[#083832] px-3 py-1.5 text-xs font-semibold text-white">
          {tr('Lưu kết quả kiểm tay')}
        </button>
        {code === 'national_registry' && (
          <a href={REGISTRY_URL} target="_blank" rel="noreferrer" className="text-xs font-semibold text-teal-800 underline">
            {tr('Mở Cổng đăng ký doanh nghiệp')}
          </a>
        )}
        {message && <span role="status" className="text-xs text-slate-700">{tr(message)}</span>}
      </div>
    </div>
  );
}
