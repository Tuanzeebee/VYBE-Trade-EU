'use client';

// Dữ liệu tuân thủ do luật TM nhập: dòng thuế, quy tắc xuất xứ, loại bằng chứng, luật bằng chứng (C1, C4, C6).
// Dữ liệu CHƯA duyệt không bao giờ ra công khai. Nhập mới bằng script CSV hoặc API; ở đây xem và duyệt.
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  deleteEvidenceRule,
  deleteRooRule,
  deleteTariffLine,
  listEvidenceRules,
  listEvidenceTypes,
  listRooRules,
  listTariffLines,
  reviewEvidenceRule,
  reviewEvidenceType,
  reviewRooRule,
  reviewTariffLine,
} from '../lib/adminApi';

interface Row {
  id: string;
  reviewed: boolean;
  cells: string[];
  canDelete: boolean;
}

interface Dataset {
  key: string;
  label: string;
  columns: string[];
  load: () => Promise<Row[] | null>;
  review: (id: string) => Promise<void>;
  remove: ((id: string) => Promise<void>) | null;
}

const pct = (value: string | null | undefined) => (value == null ? '—' : `${Number(value)}%`);
const range = (from: string, until: string | null) => `${from} → ${until ?? '…'}`;

const DATASETS: Dataset[] = [
  {
    key: 'tariff',
    label: 'Dòng thuế',
    columns: ['Mã HS', 'Nơi đến', 'Loại thuế', 'MFN', 'EVFTA', 'Hạn ngạch', 'Hiệu lực'],
    load: async () =>
      ((await listTariffLines()) ?? null)?.map((r) => ({
        id: r.id,
        reviewed: r.reviewed_by !== null,
        canDelete: r.reviewed_by === null,
        cells: [r.hs_code, r.destination, r.duty_type, pct(r.mfn_rate), pct(r.evfta_rate_current), r.quota_required ? 'Có' : 'Không', range(r.valid_from, r.valid_until)],
      })) ?? null,
    review: reviewTariffLine,
    remove: deleteTariffLine,
  },
  {
    key: 'roo',
    label: 'Quy tắc xuất xứ',
    columns: ['Mã HS', 'Loại quy tắc', 'Ngưỡng NOM', 'Cần chuyên gia', 'Hiệu lực'],
    load: async () =>
      ((await listRooRules()) ?? null)?.map((r) => ({
        id: r.id,
        reviewed: r.reviewed_by !== null,
        canDelete: r.reviewed_by === null,
        cells: [r.hs_code, r.rule_type, pct(r.threshold_pct), r.requires_expert ? 'Có' : 'Không', range(r.valid_from, r.valid_until)],
      })) ?? null,
    review: reviewRooRule,
    remove: deleteRooRule,
  },
  {
    key: 'types',
    label: 'Loại bằng chứng',
    columns: ['Mã', 'Tên', 'Nhóm', 'Hạn (tháng)', 'Đang bật'],
    load: async () =>
      ((await listEvidenceTypes()) ?? null)?.map((r) => ({
        id: r.code,
        reviewed: r.reviewed_by !== null,
        canDelete: false,
        cells: [r.code, r.name_vi, r.group, r.validity_months === null ? '—' : String(r.validity_months), r.is_active ? 'Có' : 'Không'],
      })) ?? null,
    review: reviewEvidenceType,
    remove: null,
  },
  {
    key: 'rules',
    label: 'Luật bằng chứng theo nhóm hàng',
    columns: ['Nhóm hàng', 'Loại bằng chứng', 'Mức độ', 'Ghi chú'],
    load: async () =>
      ((await listEvidenceRules()) ?? null)?.map((r) => ({
        id: r.id,
        reviewed: r.reviewed_by !== null,
        canDelete: true,
        cells: [r.category, r.evidence_type_code, r.is_required ? 'Bắt buộc' : 'Chỉ nhắc', r.note ?? '—'],
      })) ?? null,
    review: reviewEvidenceRule,
    remove: deleteEvidenceRule,
  },
];

export default function AdminComplianceData() {
  const { tr } = useLanguage();
  const [active, setActive] = useState(DATASETS[0].key);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dataset = DATASETS.find((d) => d.key === active) ?? DATASETS[0];

  const load = useCallback(async () => {
    const result = await dataset.load();
    setFailed(result === null);
    setRows(result ?? []);
  }, [dataset]);

  useEffect(() => {
    setRows(null);
    setError('');
    void load();
  }, [load]);

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

  const unreviewed = (rows ?? []).filter((r) => !r.reviewed).length;

  return (
    <div className="space-y-4 text-left">
      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        {tr('Dữ liệu chưa duyệt không bao giờ hiện ra công khai và không được máy tính tuân thủ dùng. Sửa dữ liệu đã duyệt sẽ đưa nó về chưa duyệt.')}
      </p>
      <div role="tablist" aria-label={tr('Dữ liệu tuân thủ')} className="flex flex-wrap gap-2">
        {DATASETS.map((d) => (
          <button
            key={d.key}
            role="tab"
            type="button"
            aria-selected={d.key === active}
            onClick={() => setActive(d.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${d.key === active ? 'bg-[#083832] text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
          >
            {tr(d.label)}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr(error)}
        </p>
      )}
      {failed ? (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr('Không tải được dữ liệu. Vui lòng thử lại.')}
        </p>
      ) : rows !== null && rows.length === 0 ? (
        <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">
          {tr('Chưa có dữ liệu. Nhập bằng script CSV rồi quay lại để duyệt.')}
        </p>
      ) : (
        rows !== null && (
          <section aria-label={tr(dataset.label)}>
            <p className="mb-2 text-xs font-semibold text-slate-600">
              {unreviewed} {tr('dòng chưa duyệt')} / {rows.length}
            </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    {dataset.columns.map((c) => (
                      <th key={c} scope="col" className="px-3 py-2 font-semibold">
                        {tr(c)}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2 font-semibold">
                      {tr('Trạng thái')}
                    </th>
                    <th scope="col" className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      {row.cells.map((cell, i) => (
                        <td key={i} className="px-3 py-2">
                          {['Có', 'Không', 'Bắt buộc', 'Chỉ nhắc'].includes(cell) ? tr(cell) : cell}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${row.reviewed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {tr(row.reviewed ? 'Đã duyệt' : 'Chưa duyệt')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        {!row.reviewed && (
                          <button type="button" disabled={busy} onClick={() => void run(() => dataset.review(row.id))} className="mr-2 rounded-lg bg-[#083832] px-3 py-1 text-xs font-semibold text-white disabled:opacity-60">
                            {tr('Duyệt')}
                          </button>
                        )}
                        {dataset.remove && row.canDelete && (
                          <button type="button" disabled={busy} onClick={() => void run(() => dataset.remove!(row.id))} className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60">
                            {tr('Xóa')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      )}
    </div>
  );
}
