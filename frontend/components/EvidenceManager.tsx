'use client';

// Bằng chứng của exporter (C6): danh sách kiểm theo nhóm hàng, danh sách đã nộp và form nộp mới.
// Không phải kết quả xác minh: bằng chứng do quản trị viên duyệt; xác minh doanh nghiệp là quyết định riêng.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EvidenceSuggestion } from './EvidenceSuggestion';
import { getMyProducts } from '../lib/productsApi';
import { useLanguage } from '../context/LanguageContext';
import {
  createEvidence,
  deleteEvidence,
  getChecklist,
  listEvidence,
  listEvidenceTypes,
  previewExtraction,
  uploadEvidenceFile,
  type ChecklistItem,
  type Evidence,
  OTHER_EVIDENCE_TYPE,
  type EvidenceType,
} from '../lib/evidenceApi';

const STATE_LABEL: Record<string, string> = {
  missing: 'Chưa nộp',
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  expired: 'Hết hạn',
  rejected: 'Bị từ chối',
};
const STATE_TONE: Record<string, string> = {
  missing: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  expired: 'bg-orange-100 text-orange-800',
  rejected: 'bg-rose-100 text-rose-800',
};

const today = () => new Date().toISOString().slice(0, 10);

/** Trạng thái hiển thị của một bằng chứng đã nộp: đã duyệt nhưng hết hạn thì là "expired". */
function displayState(e: Evidence): string {
  if (e.approval_status === 'approved' && e.expires_at && e.expires_at <= today()) return 'expired';
  return e.approval_status;
}

function Chip({ state }: { state: string }) {
  const { tr } = useLanguage();
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATE_TONE[state]}`}>{tr(STATE_LABEL[state])}</span>;
}

interface Props {
  /** Báo số bằng chứng đã nộp cho nơi gọi (vd bước xem lại của wizard). */
  onCountChange?: (count: number) => void;
}

export default function EvidenceManager({ onCountChange }: Props) {
  const { tr, language } = useLanguage();
  const [types, setTypes] = useState<EvidenceType[]>([]);
  const [items, setItems] = useState<Evidence[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Đã có sản phẩm kèm mã HS? Danh sách kiểm có thể trống vì chưa có luật bằng chứng đã duyệt cho nhóm hàng đó.
  const [hasHsProducts, setHasHsProducts] = useState(false);

  const [typeCode, setTypeCode] = useState('');
  const [customName, setCustomName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0); // đổi key để xóa ô chọn file
  // Đọc file ngay khi chọn: tải lên rồi đọc thử để điền sẵn số, tổ chức cấp, ngày (seller kiểm tra và sửa).
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [reading, setReading] = useState<'idle' | 'reading' | 'done'>('idle');
  const [readStatus, setReadStatus] = useState<'ready' | 'failed' | 'skipped' | null>(null);
  const [number, setNumber] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [suggested, setSuggested] = useState<Record<string, string>>({});
  const readToken = useRef(0); // bỏ kết quả của file đã bị thay bằng file khác
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const name = (t: { name_vi: string; name_en: string }) => (language === 'en' ? t.name_en : t.name_vi);

  const refresh = useCallback(async () => {
    const [t, list, cl, products] = await Promise.all([listEvidenceTypes(), listEvidence(), getChecklist(), getMyProducts()]);
    setHasHsProducts((products ?? []).some((p) => Boolean(p.hs_code)));
    setTypes(t ?? []);
    setItems(list ?? []);
    setChecklist(cl ?? []);
    setLoaded(true);
    onCountChange?.((list ?? []).length);
  }, [onCountChange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const autoExpiry = types.find((t) => t.code === typeCode)?.validity_months ?? null;
  const hasRead = Object.keys(suggested).length > 0 || Boolean(number || issuer || issuedAt || expiresAt);

  const resetRead = () => {
    readToken.current += 1;
    setUploadedKey(null);
    setReading('idle');
    setReadStatus(null);
    setNumber('');
    setIssuer('');
    setIssuedAt('');
    setExpiresAt('');
    setSuggested({});
  };

  const chooseFile = async (chosen: File | null) => {
    setFile(chosen);
    setError('');
    resetRead();
    if (!chosen) return;
    const token = readToken.current;
    setReading('reading');
    try {
      const key = await uploadEvidenceFile(chosen); // cũng kiểm loại và dung lượng
      if (token !== readToken.current) return;
      setUploadedKey(key);
      const preview = await previewExtraction(key);
      if (token !== readToken.current) return;
      setReadStatus(preview?.status ?? 'failed');
      const f = preview?.fields ?? {};
      const found: Record<string, string> = {};
      if (f.type_code && types.some((t) => t.code === f.type_code)) found.type_code = f.type_code;
      for (const k of ['certificate_number', 'issuer', 'issued_at', 'expires_at'] as const) {
        if (f[k]) found[k] = f[k] as string;
      }
      setSuggested(found);
      // Chỉ điền vào ô còn trống: không ghi đè lựa chọn người dùng đã làm.
      if (found.type_code) setTypeCode((current) => current || (found.type_code as string));
      if (found.certificate_number) setNumber(found.certificate_number);
      if (found.issuer) setIssuer(found.issuer);
      if (found.issued_at) setIssuedAt(found.issued_at);
      if (found.expires_at) setExpiresAt(found.expires_at);
    } catch (cause) {
      if (token !== readToken.current) return;
      setReadStatus(null);
      setError(cause instanceof Error ? cause.message : 'Không tải được file lên. Vui lòng thử lại.');
    } finally {
      if (token === readToken.current) setReading('done');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!typeCode) return setError('Vui lòng chọn loại bằng chứng.');
    if (typeCode === OTHER_EVIDENCE_TYPE && !customName.trim()) return setError('Vui lòng ghi tên giấy tờ.');
    if (!file) return setError('Vui lòng chọn file bằng chứng.');
    // Ô số, tổ chức, ngày không bắt buộc — chỉ kiểm khi có giá trị (đọc từ file hoặc người dùng sửa).
    if (issuedAt && issuedAt > today()) return setError('Ngày cấp không được ở tương lai.');
    if (autoExpiry === null && issuedAt && expiresAt && expiresAt <= issuedAt) return setError('Ngày hết hạn phải sau ngày cấp.');
    setBusy(true);
    try {
      const key = uploadedKey ?? (await uploadEvidenceFile(file)); // đã tải khi chọn file thì dùng lại
      await createEvidence({
        typeCode,
        fileKey: key,
        certificateNumber: number,
        issuer,
        issuedAt,
        expiresAt: autoExpiry === null ? expiresAt : '',
        customTypeName: typeCode === OTHER_EVIDENCE_TYPE ? customName : '',
      });
      setTypeCode('');
      setCustomName('');
      setFile(null);
      resetRead();
      setFileKey((k) => k + 1);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không nộp được bằng chứng. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setError('');
    try {
      await deleteEvidence(id);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không xóa được bằng chứng. Vui lòng thử lại.');
    }
  };

  const field = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]';
  const label = 'block text-xs font-semibold text-slate-700';

  return (
    <div className="space-y-6 text-left">
      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        {tr('Bằng chứng do quản trị viên xem xét và duyệt. Nộp đủ bằng chứng không phải kết quả xác minh doanh nghiệp.')}
      </p>

      <section aria-label={tr('Danh sách kiểm theo nhóm hàng')} className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-bold text-slate-900">{tr('Danh sách kiểm theo nhóm hàng')}</h3>
        {loaded && checklist.length === 0 ? (
          <p className="mt-2 text-xs text-slate-600">
            {tr(hasHsProducts
              ? 'Chưa có danh sách bằng chứng bắt buộc cho nhóm hàng của bạn. Bạn vẫn có thể nộp bằng chứng ở bên dưới; quản trị viên sẽ xem khi duyệt.'
              : 'Thêm sản phẩm có mã HS để xem những bằng chứng cần nộp cho nhóm hàng của bạn.')}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {checklist.map((c) => (
              <li key={c.type_code} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <strong className="text-slate-900">{name({ name_vi: c.name_vi, name_en: c.name_en })}</strong>{' '}
                  <span className="text-[11px] font-semibold text-slate-500">{tr(c.required ? 'Bắt buộc' : 'Chỉ nhắc')}</span>
                  {c.note && <span className="block text-xs text-slate-600">{c.note}</span>}
                </span>
                <Chip state={c.state} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-bold text-slate-900">{tr('Bằng chứng đã nộp')}</h3>
        {loaded && items.length === 0 ? (
          <p role="status" className="mt-2 text-xs text-slate-600">
            {tr('Chưa có bằng chứng nào. Chọn loại bằng chứng bên dưới và tải file lên.')}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {items.map((e) => {
              const title = e.custom_type_name || (language === 'en' ? e.type_name_en : e.type_name_vi);
              return (
                <li key={e.id} aria-label={title} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-slate-900">{title}</strong>
                    <Chip state={displayState(e)} />
                  </div>
                  <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
                    {e.certificate_number && <div>{tr('Số chứng chỉ')}: {e.certificate_number}</div>}
                    {e.issuer && <div>{tr('Tổ chức cấp')}: {e.issuer}</div>}
                    {e.issued_at && <div>{tr('Ngày cấp')}: {e.issued_at}</div>}
                    {e.expires_at && <div>{tr('Ngày hết hạn')}: {e.expires_at}</div>}
                  </dl>
                  {e.reject_reason && <p className="mt-2 text-xs text-rose-700">{tr('Lý do từ chối')}: {e.reject_reason}</p>}
                  {e.approval_status === 'pending' && <EvidenceSuggestion evidenceId={e.id} onApplied={() => void refresh()} />}
                  <div className="mt-2 flex gap-4 text-xs font-semibold">
                    <a href={e.file_url} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">
                      {tr('Xem file')}
                    </a>
                    <button type="button" onClick={() => void remove(e.id)} className="text-rose-700 hover:underline">
                      {tr('Xóa')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form onSubmit={submit} noValidate className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-bold text-slate-900">{tr('Nộp bằng chứng mới')}</h3>
        <div>
          <label htmlFor="ev-type" className={label}>{tr('Loại bằng chứng')}</label>
          <select id="ev-type" value={typeCode} onChange={(e) => setTypeCode(e.target.value)} className={field}>
            <option value="">{tr('Chọn loại')}</option>
            {types.map((t) => (
              <option key={t.code} value={t.code}>{name(t)}</option>
            ))}
          </select>
        </div>
        {typeCode === OTHER_EVIDENCE_TYPE && (
          <div>
            <label htmlFor="ev-custom" className={label}>{tr('Tên giấy tờ')} *</label>
            <input id="ev-custom" value={customName} maxLength={255} onChange={(e) => setCustomName(e.target.value)} className={field} placeholder={tr('Ví dụ: Giấy chứng nhận Halal')} />
          </div>
        )}
        <div>
          <label htmlFor="ev-file" className={label}>{tr('File bằng chứng')}</label>
          <input
            key={fileKey}
            id="ev-file"
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            onChange={(e) => void chooseFile(e.target.files?.[0] ?? null)}
            className={field}
          />
          <p className="mt-1 text-[11px] text-slate-500">{tr('PDF, PNG hoặc JPEG, tối đa 10MB. Chọn file thì hệ thống đọc loại giấy tờ, số và ngày để điền sẵn; bạn kiểm tra và sửa trước khi nộp.')}</p>
        </div>
        {reading === 'reading' && (
          <p role="status" className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">{tr('Đang đọc giấy tờ…')}</p>
        )}
        {reading === 'done' && !hasRead && readStatus && (
          <p role="status" data-testid="read-none" className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
            {tr(readStatus === 'skipped'
              ? 'File là ảnh hoặc bản scan nên chưa đọc tự động được. Hãy chọn loại giấy tờ; quản trị viên sẽ đọc thông tin khi duyệt.'
              : 'Chưa đọc được thông tin từ file. Hãy chọn loại giấy tờ; quản trị viên sẽ đọc thông tin khi duyệt.')}
          </p>
        )}
        {reading === 'done' && hasRead && (
          <fieldset data-testid="read-fields" className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/40 p-3">
            <legend className="px-1 text-xs font-bold text-teal-900">{tr('Thông tin đọc từ giấy tờ')}</legend>
            <p className="text-[11px] text-slate-700">{tr('Gợi ý từ giấy tờ, hãy kiểm tra trước khi nộp. Bạn có thể sửa hoặc xóa trống.')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ev-number" className={label}>{tr('Số chứng chỉ')}</label>
                <input id="ev-number" value={number} maxLength={128} onChange={(e) => setNumber(e.target.value)} className={field} />
              </div>
              <div>
                <label htmlFor="ev-issuer" className={label}>{tr('Tổ chức cấp')}</label>
                <input id="ev-issuer" value={issuer} maxLength={255} onChange={(e) => setIssuer(e.target.value)} className={field} />
              </div>
              <div>
                <label htmlFor="ev-issued" className={label}>{tr('Ngày cấp')}</label>
                <input id="ev-issued" type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} className={field} />
              </div>
              {autoExpiry === null ? (
                <div>
                  <label htmlFor="ev-expires" className={label}>{tr('Ngày hết hạn')}</label>
                  <input id="ev-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={field} />
                </div>
              ) : (
                <p className="self-end text-xs text-slate-600">
                  {tr('Hạn dùng do hệ thống tự tính')} {autoExpiry} {tr('tháng kể từ ngày cấp.')}
                </p>
              )}
            </div>
          </fieldset>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {tr(error)}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || reading === 'reading'}
          className="rounded-xl bg-[#083832] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#062924] disabled:opacity-60"
        >
          {tr('Nộp bằng chứng')}
        </button>
      </form>
    </div>
  );
}
