'use client';

// Nhập Excel: chọn file → kiểm tra thử (dry run) → xem kết quả hoặc lỗi theo dòng → xác nhận mới ghi.
import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { importXlsx, type ImportResult } from '../../lib/adminApi';
import type { Dataset } from './datasets';

interface Props {
  dataset: Dataset;
  onClose: () => void;
  onDone: (result: ImportResult) => void;
}

const LINE = 'flex justify-between gap-6 border-b border-slate-100 py-1';

export default function ImportDialog({ dataset, onClose, onDone }: Props) {
  const { tr } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const path = `${dataset.xlsxPath}/import`;

  const run = async (dryRun: boolean, chosen: File) => {
    setError('');
    setBusy(true);
    try {
      const result = await importXlsx(path, chosen, dryRun);
      if (!dryRun && result.applied) onDone(result);
      else setPreview(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không kết nối được máy chủ. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const choose = (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null;
    setFile(chosen);
    setPreview(null);
    if (chosen) void run(true, chosen);
  };

  const failed = preview !== null && preview.errors.length > 0;
  const nothingToDo = preview !== null && preview.created + preview.updated === 0;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={`${tr('Nhập Excel')}: ${tr(dataset.label)}`} className="my-6 w-full max-w-xl space-y-4 rounded-2xl bg-white p-5 text-left shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">
          {tr('Nhập Excel')}: {tr(dataset.label)}
        </h2>
        <p className="text-xs text-slate-600">
          {tr('Dòng nhập vào luôn ở trạng thái Chưa duyệt. Dòng trùng khóa với dòng đã có sẽ được cập nhật và về Chưa duyệt. Cột trạng thái duyệt trong file bị bỏ qua.')}
        </p>
        <div>
          <label htmlFor="import-file" className="mb-1 block text-xs font-semibold text-slate-700">
            {tr('Chọn file .xlsx')}
          </label>
          <input id="import-file" type="file" accept=".xlsx" onChange={choose} className="block w-full text-sm" />
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {tr(error)}
          </p>
        )}
        {preview !== null && failed && (
          <div role="alert" className="space-y-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
            <p className="font-semibold">{tr('File có lỗi, chưa ghi gì. Sửa file rồi chọn lại.')}</p>
            <ul className="max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-xs">
              {preview.errors.map((e) => (
                <li key={`${e.row}-${e.message}`}>
                  {tr('Dòng')} {e.row}: {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        {preview !== null && !failed && (
          <div role="status" className="rounded-xl bg-slate-50 p-3 text-sm text-slate-800">
            <p className={LINE}>
              <span>{tr('Dòng mới')}</span>
              <strong>{preview.created}</strong>
            </p>
            <p className={LINE}>
              <span>{tr('Cập nhật (sẽ về chưa duyệt)')}</span>
              <strong>{preview.updated}</strong>
            </p>
            <p className={LINE}>
              <span>{tr('Không đổi')}</span>
              <strong>{preview.unchanged}</strong>
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            {tr('Đóng')}
          </button>
          <button
            type="button"
            disabled={busy || !file || preview === null || failed || nothingToDo}
            onClick={() => file && void run(false, file)}
            className="rounded-lg bg-[#083832] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {tr('Nhập vào hệ thống')}
          </button>
        </div>
      </div>
    </div>
  );
}
