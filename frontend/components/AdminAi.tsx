'use client';

// Trợ lý AI cho quản trị (D3, I5): câu hỏi gần đây (lọc theo mức tin cậy), mẫu tuần để rà soát, duyệt tài liệu corpus.
// Nhật ký chỉ đọc; duyệt tài liệu là thao tác duy nhất ở đây và do admin bấm.
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  getWeeklySample,
  listAiQueries,
  listCorpusDocuments,
  reviewCorpusDocument,
  type AiConfidence,
  type AiQuery,
  type CorpusDocument,
} from '../lib/adminApi';

const LEVELS: { value: AiConfidence; label: string }[] = [
  { value: 'low', label: 'Độ tin cậy thấp' },
  { value: 'out_of_scope', label: 'Ngoài phạm vi' },
  { value: 'medium', label: 'Độ tin cậy trung bình' },
  { value: 'high', label: 'Độ tin cậy cao' },
];

function QueryList({ title, rows, failed, empty }: { title: string; rows: AiQuery[] | null; failed: boolean; empty: string }) {
  const { tr } = useLanguage();
  return (
    <section aria-label={tr(title)} className="space-y-3">
      <h2 className="text-lg font-bold text-slate-900">{tr(title)}</h2>
      {failed ? (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{tr('Không tải được dữ liệu. Vui lòng thử lại.')}</p>
      ) : rows !== null && rows.length === 0 ? (
        <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">{tr(empty)}</p>
      ) : (
        <ul className="space-y-2">
          {(rows ?? []).map((q) => (
            <li key={q.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <p className="font-semibold text-slate-900">{q.question}</p>
              <p className="mt-1 text-xs text-slate-600">
                {tr(LEVELS.find((l) => l.value === q.confidence)?.label ?? q.confidence)}
                {q.was_helpful === true && ` · ${tr('Hữu ích')}`}
                {q.was_helpful === false && ` · ${tr('Chưa hữu ích')}`}
                {q.escalated && ` · ${tr('Đã chuyển chuyên gia')}`}
                {q.error && ` · ${tr('Có lỗi')}`}
              </p>
              {q.answer && <p className="mt-2 whitespace-pre-line text-slate-700">{q.answer}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Corpus() {
  const { tr } = useLanguage();
  const [docs, setDocs] = useState<CorpusDocument[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const result = await listCorpusDocuments();
    setFailed(result === null);
    setDocs(result ?? []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const review = async (id: string) => {
    setError('');
    try {
      await reviewCorpusDocument(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '');
    }
  };

  return (
    <section aria-label={tr('Tài liệu của trợ lý')} className="space-y-3">
      <h2 className="text-lg font-bold text-slate-900">{tr('Tài liệu của trợ lý')}</h2>
      <p className="text-xs text-slate-600">
        {tr('Trợ lý chỉ dùng tài liệu đã duyệt. Nạp lại nội dung sẽ đưa tài liệu về trạng thái chưa duyệt.')}
      </p>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{tr(error)}</p>}
      {failed ? (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{tr('Không tải được dữ liệu. Vui lòng thử lại.')}</p>
      ) : docs !== null && docs.length === 0 ? (
        <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">
          {tr('Chưa có tài liệu. Nạp corpus bằng lệnh ingest rồi quay lại để duyệt.')}
        </p>
      ) : (
        <ul className="space-y-2">
          {(docs ?? []).map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <div>
                <p className="font-semibold text-slate-900">{d.title}</p>
                <p className="text-xs text-slate-600">
                  {d.source} · {d.chunk_count} {tr('đoạn')}
                </p>
              </div>
              {d.reviewed_by ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">{tr('Đã duyệt')}</span>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{tr('Chưa duyệt')}</span>
                  <button
                    type="button"
                    aria-label={`${tr('Duyệt')} ${d.title}`}
                    onClick={() => review(d.id)}
                    className="rounded-lg bg-[#083832] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {tr('Duyệt')}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminAi() {
  const { tr } = useLanguage();
  const [level, setLevel] = useState<AiConfidence>('low');
  const [rows, setRows] = useState<AiQuery[] | null>(null);
  const [rowsFailed, setRowsFailed] = useState(false);
  const [sample, setSample] = useState<AiQuery[] | null>(null);
  const [sampleFailed, setSampleFailed] = useState(false);

  useEffect(() => {
    let active = true;
    listAiQueries({ confidence: level, limit: 50 }).then((r) => {
      if (!active) return;
      setRowsFailed(r === null);
      setRows(r ?? []);
    });
    return () => {
      active = false;
    };
  }, [level]);

  useEffect(() => {
    let active = true;
    getWeeklySample(20).then((r) => {
      if (!active) return;
      setSampleFailed(r === null);
      setSample(r ?? []);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8 text-left">
      <div>
        <label htmlFor="ai-level" className="block text-xs font-semibold text-slate-700">{tr('Mức tin cậy')}</label>
        <select
          id="ai-level"
          value={level}
          onChange={(e) => setLevel(e.target.value as AiConfidence)}
          className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>{tr(l.label)}</option>
          ))}
        </select>
      </div>
      <QueryList title="Câu hỏi gần đây" rows={rows} failed={rowsFailed} empty="Chưa có câu hỏi nào ở mức tin cậy này." />
      <QueryList title="Mẫu rà soát hằng tuần" rows={sample} failed={sampleFailed} empty="Tuần này chưa có câu hỏi nào để rà soát." />
      <Corpus />
    </div>
  );
}
