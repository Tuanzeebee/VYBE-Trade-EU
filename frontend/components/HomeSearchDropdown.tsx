'use client';
// Gợi ý tìm kiếm trên trang chủ: dữ liệu thật từ danh bạ công khai (/api/public/suppliers, chỉ công ty đã xác minh).
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Building2, MapPin, Package, Search, ShieldCheck, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import { createApiClient } from '../lib/api/client';
import { countryName, industryLabel, type SupplierCardData } from '../lib/suppliersApi';
import { matchSearch, searchableText } from '../lib/supplierSearch';

const DEBOUNCE_MS = 250;
const PAGE_SIZE = 5;

type State = { status: 'loading' | 'error' } | { status: 'ok'; items: SupplierCardData[]; total: number };

interface Props {
  query: string;
  isOpen: boolean;
  onClose: () => void;
  onViewAll: (query: string) => void;
}

export default function HomeSearchDropdown({ query, isOpen, onClose, onViewAll }: Props) {
  const { tr } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>({ status: 'loading' });
  const trimmed = query.trim();

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.parentElement?.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setState({ status: 'loading' });
    const timer = setTimeout(async () => {
      try {
        const { data, response } = await createApiClient().GET('/api/public/suppliers', {
          params: { query: { q: trimmed.slice(0, 100), page_size: PAGE_SIZE } },
        });
        if (cancelled) return;
        setState(response.ok && data ? { status: 'ok', items: data.items, total: data.total } : { status: 'error' });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    }, trimmed ? DEBOUNCE_MS : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, trimmed]);

  if (!isOpen) return null;

  const items = state.status === 'ok' ? state.items : [];
  // Sản phẩm khớp từ khóa, lấy từ chính các nhà cung cấp trả về.
  const products = trimmed
    ? items
        .flatMap((s) => s.product_names.map((name) => ({ name, supplier: s })))
        .filter((p) => matchSearch(searchableText([p.name]), trimmed))
        .slice(0, 4)
    : [];

  return (
    <div
      ref={containerRef}
      className="absolute left-0 right-0 top-full mt-2.5 bg-white rounded-2xl shadow-[0_12px_48px_rgba(15,23,42,0.18)] border border-slate-200/90 z-50 overflow-hidden text-left text-slate-900"
      style={{ maxHeight: '82vh' }}
    >
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <Search className="w-3.5 h-3.5 text-blue-600" />
          {trimmed ? (
            <span className="truncate max-w-[280px] sm:max-w-md">
              {tr('Kết quả cho:')}{' '}
              <span className="text-blue-700 font-bold">&quot;{trimmed}&quot;</span>
            </span>
          ) : (
            <span>{tr('Nhà cung cấp đã xác minh')}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {state.status === 'ok' && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
              {state.total} {tr('kết quả')}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={tr('Đóng gợi ý (Esc)')}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[calc(82vh-95px)] p-2 sm:p-3 space-y-3">
        {state.status === 'loading' && <p className="px-3 py-6 text-center text-xs text-slate-500">{tr('Đang tìm...')}</p>}
        {state.status === 'error' && (
          <p className="px-3 py-6 text-center text-xs text-rose-700">{tr('Không tải được kết quả. Vui lòng thử lại.')}</p>
        )}
        {state.status === 'ok' && items.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-slate-600">
            {trimmed ? tr('Chưa có nhà cung cấp phù hợp với từ khóa này.') : tr('Chưa có nhà cung cấp đã xác minh.')}
          </p>
        )}

        {items.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              {tr('Doanh nghiệp & Nhà cung cấp')}
            </div>
            <ul className="space-y-1">
              {items.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/suppliers/${s.slug}`}
                    onClick={onClose}
                    className="p-2.5 rounded-xl hover:bg-blue-50 flex items-center gap-3 group"
                  >
                    {s.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <span className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-slate-400" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-bold truncate group-hover:text-blue-700">{s.legal_name}</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-label={tr('Đã xác minh')} />
                      </span>
                      <span className="flex items-center gap-2 text-[11px] text-slate-600 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {countryName(s.country)}
                        </span>
                        {s.industry_sector && <span>· {industryLabel(s.industry_sector)}</span>}
                        <span>· {s.product_count} {tr('sản phẩm')}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {products.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              <Package className="w-3.5 h-3.5 text-emerald-600" />
              {tr('Sản phẩm')}
            </div>
            <ul className="space-y-1">
              {products.map((p) => (
                <li key={`${p.supplier.slug}/${p.name}`}>
                  <Link
                    href={`/suppliers/${p.supplier.slug}`}
                    onClick={onClose}
                    className="px-2.5 py-2 rounded-xl hover:bg-emerald-50 flex items-center justify-between gap-3 text-[13px]"
                  >
                    <span className="font-semibold truncate">{p.name}</span>
                    <span className="text-[11px] text-slate-600 truncate">{p.supplier.legal_name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-200/80">
        <button
          type="button"
          onClick={() => onViewAll(trimmed)}
          className="w-full sm:w-auto sm:ml-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          {tr('Xem tất cả kết quả trong Danh bạ Nhà cung cấp')}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
