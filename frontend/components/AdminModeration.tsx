'use client';

// Kiểm duyệt hồ sơ và sản phẩm (I4): xem, tìm, lọc, ẩn/hiện. Ẩn không đổi trạng thái xác minh.
// Sửa nội dung từng trường làm qua API admin; mọi thao tác đều ghi nhật ký.
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  listCompanies,
  listProducts,
  setCompanyHidden,
  setProductHidden,
  type AdminCompany,
  type AdminProduct,
} from '../lib/adminApi';

const STATUS_LABEL: Record<string, string> = {
  unverified: 'Chưa xác minh',
  pending: 'Đang chờ duyệt',
  verified: 'Đã xác minh',
  rejected: 'Bị từ chối',
};

export default function AdminModeration() {
  const { tr } = useLanguage();
  const [companies, setCompanies] = useState<AdminCompany[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [status, setStatus] = useState('');
  const [products, setProducts] = useState<Record<string, AdminProduct[]>>({});

  const load = useCallback(async () => {
    const rows = await listCompanies({
      ...(appliedQ ? { q: appliedQ } : {}),
      ...(status ? { status: status as AdminCompany['verification_status'] } : {}),
    });
    setFailed(rows === null);
    setCompanies(rows ?? []);
  }, [appliedQ, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadProducts = async (companyId: string) => {
    const rows = await listProducts({ company_id: companyId });
    setProducts((p) => ({ ...p, [companyId]: rows ?? [] }));
  };

  const run = async (action: () => Promise<void>, reload: () => Promise<void>) => {
    setError('');
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không kết nối được máy chủ. Vui lòng thử lại.');
    } finally {
      await reload();
    }
  };

  const field = 'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm';

  return (
    <div className="space-y-4 text-left">
      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        {tr('Ẩn hồ sơ hoặc sản phẩm không đổi trạng thái xác minh; mọi thao tác đều được ghi vào nhật ký.')}
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setAppliedQ(q.trim());
        }}
      >
        <div>
          <label htmlFor="mod-q" className="block text-xs font-semibold text-slate-700">{tr('Tìm theo tên')}</label>
          <input id="mod-q" value={q} onChange={(e) => setQ(e.target.value)} className={field} />
        </div>
        <button type="submit" className="rounded-lg bg-[#083832] px-4 py-1.5 text-sm font-semibold text-white">{tr('Tìm')}</button>
        <div>
          <label htmlFor="mod-status" className="block text-xs font-semibold text-slate-700">{tr('Trạng thái xác minh')}</label>
          <select id="mod-status" value={status} onChange={(e) => setStatus(e.target.value)} className={field}>
            <option value="">{tr('Tất cả')}</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{tr(label)}</option>
            ))}
          </select>
        </div>
      </form>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{tr(error)}</p>}
      {failed ? (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{tr('Không tải được danh sách. Vui lòng thử lại.')}</p>
      ) : (
        <ul className="space-y-3">
          {(companies ?? []).map((c) => (
            <li key={c.id} aria-label={c.legal_name} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900">{c.legal_name}</h3>
                  <p className="text-xs text-slate-600">
                    {c.owner_email ?? '—'} · {c.country} · {tr(STATUS_LABEL[c.verification_status])}
                    {c.is_hidden && <span className="ml-2 font-bold text-rose-700">{tr('Đã ẩn')}</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void loadProducts(c.id)} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-800">
                    {tr('Xem sản phẩm')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void run(() => setCompanyHidden(c.id, !c.is_hidden), load)}
                    className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-white"
                  >
                    {tr(c.is_hidden ? 'Hiện hồ sơ' : 'Ẩn hồ sơ')}
                  </button>
                </div>
              </div>
              {products[c.id] && (
                <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {products[c.id].length === 0 && <li className="text-xs text-slate-500">{tr('Chưa có sản phẩm.')}</li>}
                  {products[c.id].map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>
                        <strong>{p.name}</strong> <span className="text-xs text-slate-500">HS {p.hs_code}</span>
                        {p.approval_status === 'hidden' && <span className="ml-2 text-xs font-bold text-rose-700">{tr('Đã ẩn')}</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => void run(() => setProductHidden(p.id, p.approval_status !== 'hidden'), () => loadProducts(c.id))}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-800"
                      >
                        {tr(p.approval_status === 'hidden' ? 'Hiện sản phẩm' : 'Ẩn sản phẩm')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
