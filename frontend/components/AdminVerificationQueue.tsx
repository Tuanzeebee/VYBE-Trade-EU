'use client';

// Hàng đợi xác minh (I1) và quyết định (I2). Trạng thái xác minh do quản trị viên quyết định —
// không phải hệ thống hay AI. Từ chối và yêu cầu bổ sung bắt buộc có lý do.
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  decideRequest,
  getQueue,
  listCertificationBodies,
  recordIdentityCheck,
  reviewEvidence,
  uploadCheckSnapshot,
  type CertificationBody,
  type Decision,
  type IdentityCheckInput,
  type QueueItem,
} from '../lib/adminApi';
import { fetchFilterOptions } from '../lib/suppliersApi';
import EvidenceCrossCheck, { RESULTS } from './admin-queue/EvidenceCrossCheck';

// ponytail: nguồn tra MST cố định; chuyển sang bảng `sources` (dữ liệu có người duyệt) ở I10.
const TAX_LOOKUP = 'https://tracuunnt.gdt.gov.vn/tcnnt/mstdn.jsp';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Bị từ chối',
};

const NEED_REASON = 'Vui lòng nhập lý do.';

// I11: cờ danh tính chỉ để xếp ưu tiên; quản trị viên quyết định.
const SIGNAL_LABEL: Record<string, string> = {
  blocklisted: 'Định danh nằm trong danh sách chặn',
  shared_tax_id: 'Dùng chung mã số thuế với doanh nghiệp khác',
  shared_file: 'Dùng chung file bằng chứng với doanh nghiệp khác',
  shared_phone: 'Dùng chung số điện thoại với doanh nghiệp khác',
  shared_domain: 'Dùng chung tên miền với doanh nghiệp khác',
  shared_representative: 'Dùng chung người đại diện với doanh nghiệp khác',
  tax_inactive: 'Trạng thái thuế không hoạt động',
  founded_mismatch: 'Năm thành lập tự khai sớm hơn sổ đăng ký',
  name_changed_recently: 'Vừa đổi tên',
  representative_changed_recently: 'Vừa đổi người đại diện',
  free_email: 'Email liên hệ là email miễn phí',
  email_domain_mismatch: 'Email liên hệ khác tên miền website',
  evidence_mismatch: 'Bằng chứng có kết quả kiểm lệch',
};
const SEVERITY_STYLE: Record<string, string> = {
  high: 'bg-rose-100 text-rose-800',
  medium: 'bg-amber-100 text-amber-900',
  low: 'bg-slate-100 text-slate-700',
};
const CHECK_TYPES: [IdentityCheckInput['check_type'], string][] = [
  ['phone_callback', 'Gọi lại số trên hồ sơ đăng ký chính thức'],
  ['email_domain', 'Email thuộc tên miền chính thức'],
  ['registry_lookup', 'Tra sổ đăng ký / MST'],
];
const TAX_STATUS: ['active' | 'inactive' | 'unknown', string][] = [
  ['unknown', 'Không rõ'],
  ['active', 'Đang hoạt động'],
  ['inactive', 'Không hoạt động'],
];

type CheckForm = {
  check_type: IdentityCheckInput['check_type'];
  result: IdentityCheckInput['result'];
  note: string;
  representative: string;
  registered_name: string;
  registered_address: string;
  source: string;
  snapshot: File | null;
  founded_year: string;
  tax_status: 'active' | 'inactive' | 'unknown';
  name_changed: boolean;
  representative_changed: boolean;
};
const EMPTY_CHECK: CheckForm = {
  check_type: 'phone_callback',
  result: 'match',
  note: '',
  representative: '',
  registered_name: '',
  registered_address: '',
  source: TAX_LOOKUP,
  snapshot: null,
  founded_year: '',
  tax_status: 'unknown',
  name_changed: false,
  representative_changed: false,
};

function toCheckInput(form: CheckForm, snapshotKey: string | null): IdentityCheckInput {
  const body: IdentityCheckInput = { check_type: form.check_type, result: form.result, note: form.note.trim() || null };
  if (form.check_type === 'registry_lookup') {
    // I8: tra sổ đăng ký / MST phải lưu nguồn và ảnh chụp kết quả.
    body.source = form.source.trim() || null;
    body.snapshot_key = snapshotKey;
    body.registry = {
      legal_representative: form.representative.trim() || null,
      registered_name: form.registered_name.trim() || null,
      registered_address: form.registered_address.trim() || null,
      founded_year: form.founded_year ? Number(form.founded_year) : null,
      tax_status: form.tax_status,
      name_changed_recently: form.name_changed,
      representative_changed_recently: form.representative_changed,
    };
  }
  return body;
}

export default function AdminVerificationQueue() {
  const { tr, language } = useLanguage();
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, CheckForm>>({});
  const [bodies, setBodies] = useState<CertificationBody[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const load = useCallback(async () => {
    const queue = await getQueue();
    setLoadFailed(queue === null);
    setItems(queue ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    // I8: chỉ tổ chức cấp đã duyệt mới dùng được để kiểm chéo / soạn email xác nhận.
    void listCertificationBodies().then((rows) => setBodies((rows ?? []).filter((b) => b.reviewed_by !== null)));
    void fetchFilterOptions().then((options) => setCategories(options?.categories ?? []));
  }, []);

  const setReason = (key: string, value: string) => setReasons((r) => ({ ...r, [key]: value }));

  const run = async (action: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không kết nối được máy chủ. Vui lòng thử lại.');
    } finally {
      setBusy(false);
      await load();
    }
  };

  const decide = (item: QueueItem, decision: Decision) => {
    const reason = (reasons[item.request_id] ?? '').trim();
    if (decision !== 'approve' && !reason) return setError(NEED_REASON);
    void run(() => decideRequest(item.request_id, decision, reason));
  };

  const review = (evidenceId: string, decision: 'approve' | 'reject') => {
    const reason = (reasons[evidenceId] ?? '').trim();
    if (decision === 'reject' && !reason) return setError(NEED_REASON);
    void run(() => reviewEvidence(evidenceId, decision, reason));
  };

  const checkOf = (companyId: string) => checks[companyId] ?? EMPTY_CHECK;
  const setCheck = (companyId: string, patch: Partial<CheckForm>) =>
    setChecks((c) => ({ ...c, [companyId]: { ...(c[companyId] ?? EMPTY_CHECK), ...patch } }));
  const saveCheck = (companyId: string) =>
    void run(async () => {
      const form = checkOf(companyId);
      let snapshotKey: string | null = null;
      if (form.check_type === 'registry_lookup') {
        if (!form.snapshot) throw new Error('Vui lòng chọn ảnh chụp kết quả tra cứu.');
        snapshotKey = await uploadCheckSnapshot(companyId, form.snapshot);
      }
      await recordIdentityCheck(companyId, toCheckInput(form, snapshotKey));
      setChecks((c) => ({ ...c, [companyId]: EMPTY_CHECK }));
    });

  const button = 'rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60';
  const small = 'rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs';

  return (
    <div className="space-y-5 text-left">
      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        {tr('Trạng thái xác minh do quản trị viên quyết định. Từ chối và yêu cầu bổ sung phải có lý do; doanh nghiệp sẽ thấy lý do này.')}
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr(error)}
        </p>
      )}
      {loadFailed && items?.length === 0 ? (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr('Không tải được hàng đợi. Vui lòng thử lại.')}
        </p>
      ) : items !== null && items.length === 0 ? (
        <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">
          {tr('Không có hồ sơ nào đang chờ duyệt.')}
        </p>
      ) : (
        <ul className="space-y-4">
          {(items ?? []).map((item) => (
            <li key={item.request_id} aria-label={item.legal_name} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900">{item.legal_name}</h3>
                <span className="text-xs text-slate-500">
                  {tr('Gửi lúc')} {new Date(item.submitted_at).toLocaleString(language === 'en' ? 'en-GB' : 'vi-VN')}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {tr('MST')}: {item.tax_id ?? '—'} · {tr('Quốc gia')}: {item.country}
              </p>

              <div className="mt-4 space-y-3">
                {item.evidences.length === 0 && <p className="text-xs text-slate-500">{tr('Chưa nộp bằng chứng.')}</p>}
                {item.evidences.map((e) => (
                  <div key={e.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{language === 'en' ? e.type_name_en : e.type_name_vi}</strong>
                      <span className="text-[11px] font-semibold text-slate-600">{tr(STATUS_LABEL[e.approval_status])}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {e.certificate_number && `${e.certificate_number} · `}
                      {e.issuer && `${e.issuer} · `}
                      {e.issued_at}
                      {e.expires_at && ` → ${e.expires_at}`}
                    </p>
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <a href={e.file_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-teal-700 hover:underline">
                        {tr('Xem file')}
                      </a>
                      {e.approval_status === 'pending' && (
                        <>
                          <button type="button" disabled={busy} onClick={() => review(e.id, 'approve')} className={`${button} bg-emerald-700 text-white`}>
                            {tr('Duyệt bằng chứng')}
                          </button>
                          <label className="text-xs text-slate-600">
                            <span className="sr-only">{tr('Lý do từ chối bằng chứng')}</span>
                            <input
                              aria-label={tr('Lý do từ chối bằng chứng')}
                              value={reasons[e.id] ?? ''}
                              onChange={(ev) => setReason(e.id, ev.target.value)}
                              placeholder={tr('Lý do từ chối bằng chứng')}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            />
                          </label>
                          <button type="button" disabled={busy} onClick={() => review(e.id, 'reject')} className={`${button} bg-rose-700 text-white`}>
                            {tr('Từ chối bằng chứng')}
                          </button>
                        </>
                      )}
                    </div>
                    <EvidenceCrossCheck
                      companyId={item.company_id}
                      evidence={e}
                      checks={(item.checks ?? []).filter((c) => c.evidence_id === e.id)}
                      bodies={bodies}
                      categories={categories}
                      busy={busy}
                      run={run}
                    />
                  </div>
                ))}
              </div>

              <div role="group" aria-label={tr('Kiểm danh tính')} className="mt-4 rounded-xl border border-slate-200 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{tr('Kiểm danh tính')}</strong>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.ownership_proven ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                    {item.ownership_proven ? tr('Đã chứng minh quyền sở hữu') : tr('Chưa chứng minh quyền sở hữu')}
                  </span>
                </div>
                {(item.signals ?? []).length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2" aria-label={tr('Cờ danh tính')}>
                    {(item.signals ?? []).map((s) => (
                      <li key={s.code} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_STYLE[s.severity]}`}>
                        {tr(SIGNAL_LABEL[s.code] ?? s.code)}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="text-xs text-slate-700">
                    {tr('Loại kiểm')}
                    <select value={checkOf(item.company_id).check_type} onChange={(e) => setCheck(item.company_id, { check_type: e.target.value as CheckForm['check_type'] })} className={`${small} ml-1`}>
                      {CHECK_TYPES.map(([v, label]) => (
                        <option key={v} value={v}>{tr(label)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-slate-700">
                    {tr('Kết quả')}
                    <select value={checkOf(item.company_id).result} onChange={(e) => setCheck(item.company_id, { result: e.target.value as CheckForm['result'] })} className={`${small} ml-1`}>
                      {RESULTS.map(([v, label]) => (
                        <option key={v} value={v}>{tr(label)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-slate-700">
                    {tr('Ghi chú kiểm')}
                    <input value={checkOf(item.company_id).note} onChange={(e) => setCheck(item.company_id, { note: e.target.value })} className={`${small} ml-1`} />
                  </label>
                </div>
                {checkOf(item.company_id).check_type === 'registry_lookup' && (
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <label className="text-xs text-slate-700">
                      {tr('Nguồn tra cứu')}
                      <input value={checkOf(item.company_id).source} onChange={(e) => setCheck(item.company_id, { source: e.target.value })} className={`${small} ml-1 w-64`} />
                    </label>
                    <a href={TAX_LOOKUP} target="_blank" rel="noreferrer" className="text-xs font-semibold text-teal-700 hover:underline">
                      {tr('Mở trang tra cứu MST')}
                    </a>
                    <label className="text-xs text-slate-700">
                      {tr('Ảnh chụp kết quả')}
                      <input type="file" accept="image/png,image/jpeg,application/pdf" onChange={(e) => setCheck(item.company_id, { snapshot: e.target.files?.[0] ?? null })} className="ml-1 text-xs" />
                    </label>
                    <label className="text-xs text-slate-700">
                      {tr('Tên pháp nhân theo sổ đăng ký')}
                      <input value={checkOf(item.company_id).registered_name} onChange={(e) => setCheck(item.company_id, { registered_name: e.target.value })} className={`${small} ml-1`} />
                    </label>
                    <label className="text-xs text-slate-700">
                      {tr('Địa chỉ theo sổ đăng ký')}
                      <input value={checkOf(item.company_id).registered_address} onChange={(e) => setCheck(item.company_id, { registered_address: e.target.value })} className={`${small} ml-1`} />
                    </label>
                    <label className="text-xs text-slate-700">
                      {tr('Người đại diện theo sổ đăng ký')}
                      <input value={checkOf(item.company_id).representative} onChange={(e) => setCheck(item.company_id, { representative: e.target.value })} className={`${small} ml-1`} />
                    </label>
                    <label className="text-xs text-slate-700">
                      {tr('Năm thành lập theo sổ đăng ký')}
                      <input type="number" min={1900} max={2100} value={checkOf(item.company_id).founded_year} onChange={(e) => setCheck(item.company_id, { founded_year: e.target.value })} className={`${small} ml-1 w-20`} />
                    </label>
                    <label className="text-xs text-slate-700">
                      {tr('Trạng thái thuế')}
                      <select value={checkOf(item.company_id).tax_status} onChange={(e) => setCheck(item.company_id, { tax_status: e.target.value as CheckForm['tax_status'] })} className={`${small} ml-1`}>
                        {TAX_STATUS.map(([v, label]) => (
                          <option key={v} value={v}>{tr(label)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-1 text-xs text-slate-700">
                      <input type="checkbox" checked={checkOf(item.company_id).name_changed} onChange={(e) => setCheck(item.company_id, { name_changed: e.target.checked })} />
                      {tr('Vừa đổi tên')}
                    </label>
                    <label className="flex items-center gap-1 text-xs text-slate-700">
                      <input type="checkbox" checked={checkOf(item.company_id).representative_changed} onChange={(e) => setCheck(item.company_id, { representative_changed: e.target.checked })} />
                      {tr('Vừa đổi người đại diện')}
                    </label>
                  </div>
                )}
                <p className="mt-2 text-[11px] text-slate-500">
                  {tr('Gọi lại số ghi trên hồ sơ đăng ký chính thức, không gọi số doanh nghiệp tự khai. Tên người đại diện chỉ được băm để so trùng, không lưu.')}
                </p>
                <button type="button" disabled={busy} onClick={() => saveCheck(item.company_id)} className={`${button} mt-2 border border-slate-300 text-slate-800`}>
                  {tr('Ghi kết quả kiểm')}
                </button>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <label htmlFor={`reason-${item.request_id}`} className="block text-xs font-semibold text-slate-700">
                  {tr('Lý do quyết định (bắt buộc khi từ chối hoặc yêu cầu bổ sung)')}
                </label>
                <textarea
                  id={`reason-${item.request_id}`}
                  value={reasons[item.request_id] ?? ''}
                  onChange={(e) => setReason(item.request_id, e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => decide(item, 'approve')} className={`${button} bg-[#083832] text-white`}>
                    {tr('Duyệt xác minh')}
                  </button>
                  <button type="button" disabled={busy} onClick={() => decide(item, 'request_info')} className={`${button} border border-slate-300 text-slate-800`}>
                    {tr('Yêu cầu bổ sung')}
                  </button>
                  <button type="button" disabled={busy} onClick={() => decide(item, 'reject')} className={`${button} bg-rose-700 text-white`}>
                    {tr('Từ chối')}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
