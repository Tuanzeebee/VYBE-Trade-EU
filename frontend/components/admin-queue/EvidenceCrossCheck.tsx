'use client';

// Kiểm chéo một bằng chứng với nguồn cấp (I8): lịch sử kiểm, ghi kiểm nguồn ngoài (nguồn + ảnh chụp
// bắt buộc), soạn email xác nhận tới địa chỉ đã duyệt của tổ chức cấp, và so khớp nội bộ bằng quy
// tắc. Chỉ ghi kết quả — quyết định duyệt vẫn do quản trị viên bấm.
import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  getIssuerEmail,
  mailtoLink,
  recordConsistency,
  recordEvidenceCheck,
  uploadCheckSnapshot,
  type CertificationBody,
  type EvidenceCheck,
  type EvidenceCheckInput,
} from '../../lib/adminApi';

// ponytail: link tra cứu mặc định cố định; chuyển sang bảng `sources` (dữ liệu có người duyệt) ở I10.
export const IAF_CERTSEARCH = 'https://www.iafcertsearch.org/';

export const RESULTS: [EvidenceCheckInput['result'], string][] = [
  ['match', 'Khớp'],
  ['mismatch', 'Không khớp'],
  ['not_found', 'Không tìm thấy'],
  ['unchecked', 'Chưa kiểm được'],
];
const RESULT_LABEL = Object.fromEntries(RESULTS) as Record<string, string>;
const RESULT_STYLE: Record<string, string> = {
  match: 'bg-emerald-100 text-emerald-800',
  mismatch: 'bg-rose-100 text-rose-800',
  not_found: 'bg-amber-100 text-amber-900',
  unchecked: 'bg-slate-100 text-slate-700',
};
const CHECK_LABEL: Record<string, string> = {
  registry_lookup: 'Tra cứu tổ chức cấp / IAF',
  issuer_email: 'Email xác nhận của tổ chức cấp',
  internal_consistency: 'So khớp nội bộ',
};
const RULE_LABEL: Record<string, string> = {
  name: 'Tên đơn vị',
  address: 'Địa chỉ',
  scope: 'Phạm vi nhóm hàng',
  domain: 'Tên miền email',
  duplicate_tax_id: 'Trùng MST',
  duplicate_certificate: 'Trùng số chứng nhận',
};

type Evidence = { id: string };
type Props = {
  companyId: string;
  evidence: Evidence;
  checks: EvidenceCheck[];
  bodies: CertificationBody[];
  categories: string[];
  busy: boolean;
  run: (action: () => Promise<void>) => Promise<void>;
};

export default function EvidenceCrossCheck({ companyId, evidence, checks, bodies, categories, busy, run }: Props) {
  const { tr, language } = useLanguage();
  const [checkType, setCheckType] = useState<EvidenceCheckInput['check_type']>('registry_lookup');
  const [bodyId, setBodyId] = useState('');
  const [source, setSource] = useState(IAF_CERTSEARCH);
  const [result, setResult] = useState<EvidenceCheckInput['result']>('match');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [holderName, setHolderName] = useState('');
  const [holderAddress, setHolderAddress] = useState('');
  const [scope, setScope] = useState<string[]>([]);

  const small = 'rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs';
  const button = 'rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 disabled:opacity-60';
  const id = (name: string) => `${name}-${evidence.id}`;

  const chooseBody = (value: string) => {
    setBodyId(value);
    setSource(bodies.find((b) => b.id === value)?.lookup_url || IAF_CERTSEARCH);
  };

  const saveExternal = () =>
    run(async () => {
      if (!file) throw new Error('Vui lòng chọn ảnh chụp kết quả tra cứu.');
      if (checkType === 'issuer_email' && !bodyId) throw new Error('Vui lòng chọn tổ chức cấp.');
      const snapshot = await uploadCheckSnapshot(companyId, file);
      await recordEvidenceCheck(evidence.id, {
        check_type: checkType,
        result,
        source: source.trim(),
        snapshot_key: snapshot,
        certification_body_id: bodyId || null,
        note: note.trim() || null,
      });
      setFile(null);
      setNote('');
    });

  const composeEmail = () =>
    run(async () => {
      if (!bodyId) throw new Error('Vui lòng chọn tổ chức cấp.');
      window.location.href = mailtoLink(await getIssuerEmail(evidence.id, bodyId));
    });

  const saveConsistency = () =>
    run(() =>
      recordConsistency(evidence.id, {
        holder_name: holderName.trim() || null,
        holder_address: holderAddress.trim() || null,
        scope_categories: scope.length ? scope : null,
      }),
    );

  const date = (iso: string) => new Date(iso).toLocaleString(language === 'en' ? 'en-GB' : 'vi-VN');

  return (
    <details className="mt-3 rounded-lg bg-slate-50 p-3">
      <summary className="cursor-pointer text-xs font-semibold text-slate-800">
        {tr('Kiểm chéo')} ({checks.length})
      </summary>

      {checks.length > 0 && (
        <ul aria-label={tr('Kết quả kiểm')} className="mt-2 space-y-2">
          {checks.map((c) => (
            <li key={c.id} className="rounded-lg bg-white p-2 text-xs text-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{tr(CHECK_LABEL[c.check_type] ?? c.check_type)}</strong>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${RESULT_STYLE[c.result] ?? ''}`}>{tr(RESULT_LABEL[c.result] ?? c.result)}</span>
                <span className="text-slate-500">{date(c.checked_at)}</span>
                {c.snapshot_url && (
                  <a href={c.snapshot_url} target="_blank" rel="noreferrer" className="font-semibold text-teal-700 hover:underline">
                    {tr('Xem ảnh chụp')}
                  </a>
                )}
              </div>
              {c.source && c.check_type !== 'internal_consistency' && <p className="mt-1 break-all">{tr('Nguồn')}: {c.source}</p>}
              {c.note && <p className="mt-1">{c.note}</p>}
              {Array.isArray(c.facts?.findings) && (
                <ul className="mt-1 flex flex-wrap gap-1">
                  {(c.facts.findings as { rule: string; result: string }[]).map((f) => (
                    <li key={f.rule} className={`rounded-full px-2 py-0.5 ${RESULT_STYLE[f.result] ?? ''}`}>
                      {tr(RULE_LABEL[f.rule] ?? f.rule)}: {tr(RESULT_LABEL[f.result] ?? f.result)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <fieldset className="mt-3 space-y-2">
        <legend className="text-xs font-semibold text-slate-800">{tr('Kiểm với nguồn ngoài')}</legend>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-700" htmlFor={id('type')}>
            {tr('Cách kiểm')}
            <select id={id('type')} value={checkType} onChange={(e) => setCheckType(e.target.value as EvidenceCheckInput['check_type'])} className={`${small} ml-1`}>
              <option value="registry_lookup">{tr('Tra cứu tổ chức cấp / IAF')}</option>
              <option value="issuer_email">{tr('Email xác nhận của tổ chức cấp')}</option>
            </select>
          </label>
          <label className="text-xs text-slate-700" htmlFor={id('body')}>
            {tr('Tổ chức cấp')}
            <select id={id('body')} value={bodyId} onChange={(e) => chooseBody(e.target.value)} className={`${small} ml-1`}>
              <option value="">{tr('Chưa chọn')}</option>
              {bodies.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <button type="button" disabled={busy || !bodyId} onClick={() => void composeEmail()} className={button}>
            {tr('Soạn email xác nhận')}
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-700" htmlFor={id('source')}>
            {tr('Nguồn')}
            <input id={id('source')} value={source} onChange={(e) => setSource(e.target.value)} className={`${small} ml-1 w-64`} />
          </label>
          {source.startsWith('http') && (
            <a href={source} target="_blank" rel="noreferrer" className="text-xs font-semibold text-teal-700 hover:underline">
              {tr('Mở trang tra cứu')}
            </a>
          )}
          <label className="text-xs text-slate-700" htmlFor={id('result')}>
            {tr('Kết quả')}
            <select id={id('result')} value={result} onChange={(e) => setResult(e.target.value as EvidenceCheckInput['result'])} className={`${small} ml-1`}>
              {RESULTS.map(([v, label]) => (
                <option key={v} value={v}>{tr(label)}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-700" htmlFor={id('snapshot')}>
            {tr('Ảnh chụp kết quả')}
            <input id={id('snapshot')} type="file" accept="image/png,image/jpeg,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="ml-1 text-xs" />
          </label>
          <label className="text-xs text-slate-700" htmlFor={id('note')}>
            {tr('Ghi chú kiểm')}
            <input id={id('note')} value={note} onChange={(e) => setNote(e.target.value)} className={`${small} ml-1`} />
          </label>
          <button type="button" disabled={busy} onClick={() => void saveExternal()} className={button}>
            {tr('Ghi kiểm chéo')}
          </button>
        </div>
      </fieldset>

      <fieldset className="mt-3 space-y-2">
        <legend className="text-xs font-semibold text-slate-800">{tr('So khớp nội bộ (trường trên chứng nhận)')}</legend>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-700" htmlFor={id('holder')}>
            {tr('Tên đơn vị trên chứng nhận')}
            <input id={id('holder')} value={holderName} onChange={(e) => setHolderName(e.target.value)} className={`${small} ml-1`} />
          </label>
          <label className="text-xs text-slate-700" htmlFor={id('address')}>
            {tr('Địa chỉ trên chứng nhận')}
            <input id={id('address')} value={holderAddress} onChange={(e) => setHolderAddress(e.target.value)} className={`${small} ml-1`} />
          </label>
        </div>
        {categories.length > 0 && (
          <div role="group" aria-label={tr('Phạm vi nhóm hàng')} className="flex flex-wrap gap-2 text-xs text-slate-700">
            <span className="font-semibold">{tr('Phạm vi nhóm hàng')}:</span>
            {categories.map((c) => (
              <label key={c} className="flex items-center gap-1">
                <input type="checkbox" checked={scope.includes(c)} onChange={(e) => setScope((s) => (e.target.checked ? [...s, c] : s.filter((x) => x !== c)))} />
                {c}
              </label>
            ))}
          </div>
        )}
        <button type="button" disabled={busy} onClick={() => void saveConsistency()} className={button}>
          {tr('So khớp')}
        </button>
      </fieldset>
    </details>
  );
}
