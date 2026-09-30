'use client';

// Gợi ý từ AI đọc chứng nhận (U24, X8). Chỉ là gợi ý: seller chọn trường muốn áp (bằng chứng về lại
// chờ duyệt như mọi lần sửa); admin xem so sánh khai báo với chữ đọc được. AI không duyệt bằng chứng.
import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { adminGetExtraction, applyExtraction, getExtraction, type ApplicableField, type Extraction } from '../lib/extractionApi';

const FIELD_LABELS: Record<string, string> = {
  type_code: 'Loại giấy tờ',
  certificate_number: 'Số chứng chỉ',
  issuer: 'Tổ chức cấp',
  issued_at: 'Ngày cấp',
  expires_at: 'Ngày hết hạn',
  holder_name: 'Đơn vị được cấp',
  holder_address: 'Địa chỉ đơn vị được cấp',
};
const APPLICABLE: ApplicableField[] = ['certificate_number', 'issuer', 'issued_at', 'expires_at'];
const STATUS_TEXT: Record<Extraction['status'], string> = {
  queued: 'AI đang chờ đọc giấy tờ…',
  running: 'AI đang đọc giấy tờ…',
  ready: '',
  failed: 'AI chưa đọc được giấy tờ này.',
  skipped: 'Bản scan (ảnh) chưa đọc tự động được; vui lòng nhập tay nếu cần.',
};

export function EvidenceSuggestion({ evidenceId, onApplied }: { evidenceId: string; onApplied: () => void }) {
  const { tr } = useLanguage();
  const [data, setData] = useState<Extraction | null | undefined>(undefined);
  const [picked, setPicked] = useState<ApplicableField[]>([]);
  const [message, setMessage] = useState('');

  const open = async () => {
    const row = await getExtraction(evidenceId);
    setData(row);
    if (row?.status === 'ready') setPicked(APPLICABLE.filter((f) => row.fields[f]));
  };
  const apply = async () => {
    setMessage('');
    const ok = await applyExtraction(evidenceId, picked);
    setMessage(ok ? 'Đã áp gợi ý. Bằng chứng sẽ được duyệt lại.' : 'Không áp được gợi ý. Vui lòng thử lại.');
    if (ok) onApplied();
  };

  if (data === undefined) {
    return (
      <button type="button" onClick={() => void open()} className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        {tr('Xem gợi ý từ AI')}
      </button>
    );
  }
  if (data === null) return <p className="text-xs text-slate-500">{tr('Chưa có gợi ý từ AI cho giấy tờ này.')}</p>;
  return (
    <div role="group" aria-label={tr('Gợi ý từ AI')} className="mt-2 rounded-lg border border-violet-200 bg-violet-50/50 p-2 text-xs">
      <p className="font-semibold text-violet-900">{tr('Gợi ý từ AI (kiểm tra lại trước khi áp)')}</p>
      {data.status !== 'ready' ? (
        <p className="mt-1 text-slate-600">{tr(STATUS_TEXT[data.status])}</p>
      ) : (
        <>
          <ul className="mt-1 space-y-1">
            {Object.entries(FIELD_LABELS).map(([key, label]) =>
              data.fields[key] ? (
                <li key={key} className="flex items-center gap-2">
                  {APPLICABLE.includes(key as ApplicableField) ? (
                    <input
                      type="checkbox"
                      aria-label={tr(label)}
                      checked={picked.includes(key as ApplicableField)}
                      onChange={(e) =>
                        setPicked((current) => (e.target.checked ? [...current, key as ApplicableField] : current.filter((f) => f !== key)))
                      }
                    />
                  ) : (
                    <span className="w-3.5" />
                  )}
                  <span className="text-slate-500">{tr(label)}:</span>
                  <span className="font-semibold text-slate-900">{data.fields[key]}</span>
                </li>
              ) : null,
            )}
          </ul>
          <button type="button" disabled={picked.length === 0} onClick={() => void apply()} className="mt-2 rounded-lg bg-violet-700 px-3 py-1 font-semibold text-white disabled:opacity-50">
            {tr('Áp gợi ý đã chọn')}
          </button>
        </>
      )}
      {message && <p role="status" className="mt-1 text-slate-700">{tr(message)}</p>}
    </div>
  );
}

export function AdminExtractionCompare({ evidenceId }: { evidenceId: string }) {
  const { tr } = useLanguage();
  const [data, setData] = useState<Extraction | null | undefined>(undefined);
  if (data === undefined) {
    return (
      <button type="button" onClick={() => void adminGetExtraction(evidenceId).then(setData)} className="text-xs font-semibold text-violet-700 hover:underline">
        {tr('So sánh với AI đọc giấy tờ')}
      </button>
    );
  }
  if (data === null || data.status !== 'ready') {
    return <p className="text-xs text-slate-500">{tr(data ? STATUS_TEXT[data.status] || 'Chưa có gợi ý từ AI cho giấy tờ này.' : 'Chưa có gợi ý từ AI cho giấy tờ này.')}</p>;
  }
  return (
    <table className="mt-2 w-full text-left text-xs" aria-label={tr('So sánh với AI đọc giấy tờ')}>
      <thead className="text-slate-500">
        <tr>
          <th className="py-1">{tr('Trường')}</th>
          <th className="py-1">{tr('Seller khai')}</th>
          <th className="py-1">{tr('AI đọc được')}</th>
          <th className="py-1" />
        </tr>
      </thead>
      <tbody>
        {(data.comparison ?? []).map((row) => (
          <tr key={row.field} className="border-t border-slate-100">
            <td className="py-1">{tr(FIELD_LABELS[row.field] ?? row.field)}</td>
            <td className="py-1">{row.declared ?? '—'}</td>
            <td className="py-1">{row.extracted ?? '—'}</td>
            <td className={`py-1 font-semibold ${row.match === false ? 'text-rose-700' : 'text-emerald-700'}`}>
              {row.match === null ? '' : tr(row.match ? 'Khớp' : 'Lệch')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
