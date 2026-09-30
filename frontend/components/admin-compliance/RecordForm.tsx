'use client';

// Form thêm / sửa một dòng dữ liệu tuân thủ, sinh từ khai báo trường của nhóm dữ liệu.
// Lưu xong dòng luôn ở trạng thái Chưa duyệt (backend đảm bảo); ở đây chỉ cảnh báo trước khi sửa dòng đã duyệt.
import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { buildBody, firstMissing, initialState, type Dataset, type Field, type FieldValue, type Row } from './datasets';

interface Props {
  dataset: Dataset;
  row: Row | null;
  onClose: () => void;
  onSaved: () => void;
}

const INPUT = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100';

export default function RecordForm({ dataset, row, onClose, onSaved }: Props) {
  const { tr } = useLanguage();
  const [state, setState] = useState(() => initialState(dataset.fields, row?.values ?? null));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    grid.current?.querySelector<HTMLElement>('input:not([disabled]), select, textarea')?.focus();
  }, []);

  const set = (key: string, value: FieldValue) => setState((s) => ({ ...s, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const missing = firstMissing(dataset.fields, state, row !== null);
    if (missing) {
      setError(`${tr('Vui lòng nhập')}: ${tr(missing.label)}`);
      return;
    }
    const body = buildBody(dataset.fields, state, row?.values ?? null);
    if (row && Object.keys(body).length === 0) {
      onClose();
      return;
    }
    setError('');
    setBusy(true);
    try {
      await (row ? dataset.update(row.id, body) : dataset.create(body));
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không kết nối được máy chủ. Vui lòng thử lại.');
      setBusy(false);
    }
  };

  const control = (field: Field) => {
    const id = `field-${field.key}`;
    const value = state[field.key];
    if (field.kind === 'bool')
      return <input id={id} type="checkbox" checked={value === true} onChange={(e) => set(field.key, e.target.checked)} className="h-4 w-4" />;
    if (field.kind === 'select')
      return (
        <select id={id} value={String(value)} onChange={(e) => set(field.key, e.target.value)} className={INPUT}>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    if (field.kind === 'textarea')
      return <textarea id={id} rows={2} value={String(value)} onChange={(e) => set(field.key, e.target.value)} className={INPUT} />;
    return (
      <input
        id={id}
        type={field.kind === 'date' ? 'date' : 'text'}
        inputMode={field.kind === 'decimal' ? 'decimal' : field.kind === 'int' ? 'numeric' : undefined}
        value={String(value)}
        disabled={row !== null && field.locked}
        onChange={(e) => set(field.key, e.target.value)}
        className={INPUT}
      />
    );
  };

  const title = `${tr(row ? 'Sửa dòng' : 'Thêm dòng')}: ${tr(dataset.label)}`;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <form role="dialog" aria-modal="true" aria-label={title} onSubmit={submit} className="my-6 w-full max-w-2xl space-y-4 rounded-2xl bg-white p-5 text-left shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {row?.reviewed && (
          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{tr('Dòng này đã duyệt. Sau khi lưu, dòng sẽ về Chưa duyệt và phải được duyệt lại.')}</p>
        )}
        <div ref={grid} className="grid gap-3 sm:grid-cols-2">
          {dataset.fields.map((field) => (
            <div key={field.key} className={field.kind === 'textarea' ? 'sm:col-span-2' : ''}>
              <label htmlFor={`field-${field.key}`} className="mb-1 block text-xs font-semibold text-slate-700">
                {tr(field.label)}
                {field.required && <span aria-hidden="true"> *</span>}
              </label>
              {control(field)}
              {field.help && <p className="mt-1 text-[11px] text-slate-500">{tr(field.help)}</p>}
            </div>
          ))}
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {tr(error)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            {tr('Hủy')}
          </button>
          <button type="submit" disabled={busy} className="rounded-lg bg-[#083832] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {tr('Lưu')}
          </button>
        </div>
      </form>
    </div>
  );
}
