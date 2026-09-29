'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Building2, 
  Package, 
  Tag, 
  ShieldCheck, 
  MapPin, 
  ArrowRight, 
  Sparkles, 
  X, 
  Clock, 
  CheckCircle2, 
  Star,
  ExternalLink,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { SupplierData, DEFAULT_SELLER_DETAIL } from './BuyerSellerDetail.tsx';
import { DIRECTORY_SUPPLIERS } from '../lib/suppliers';
import { filterSuppliers, matchSearch, removeVietnameseTones, searchableText, type SupplierFilters } from '../lib/supplierSearch';
import { useLanguage } from "../context/LanguageContext";

// Diacritic normalizer for Vietnamese
export { removeVietnameseTones, matchSearch } from '../lib/supplierSearch';

// Extra rich database of export products
export interface SearchProductItem {
  id: string;
  name: string;
  category: string;
  supplierName: string;
  supplierId: string;
  image: string;
  moq: string;
  priceRange: string;
  capacity: string;
  origin: string;
}

export const SEARCH_PRODUCTS: SearchProductItem[] = DIRECTORY_SUPPLIERS.flatMap((supplier) =>
  supplier.products.map((product) => ({ ...product, id: `${supplier.id}/${product.id}`,
    supplierId: supplier.id, supplierName: supplier.name, origin: supplier.location })));
export const POPULAR_KEYWORDS = [
  'Cà phê Robusta Đắk Lắk',
  'Gạo ST25 xuất khẩu EU',
  'Hạt điều W320 Bình Phước',
  'Hồ tiêu đen 550g/l',
  'Tôm thẻ chân trắng IQF',
  'Chứng nhận GlobalGAP',
  'Chứng nhận BRCGS',
  'Xoài sấy dẻo',
  'Thanh long ruột đỏ',
  'Tiêu chuẩn USDA Organic'
];

interface LiveSearchDropdownProps {
  filters?: SupplierFilters;
  query: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectSupplier: (supplier: SupplierData) => void;
  onSelectProduct: (product: SearchProductItem) => void;
  onSelectKeyword: (keyword: string) => void;
  onViewAllResults: (query: string) => void;
  customClass?: string;
}

export default function LiveSearchDropdown({
  filters = {},
  query,
  isOpen,
  onClose,
  onSelectSupplier,
  onSelectProduct,
  onSelectKeyword,
  onViewAllResults,
  customClass = ''
}: LiveSearchDropdownProps) {
  const { tr } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Cà phê Robusta Grade 1',
    'Gạo thơm ST25',
    'Hạt điều xuất khẩu'
  ]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.parentElement?.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmedQuery = query.trim();
  const isQueryEmpty = trimmedQuery.length === 0;

  // Filter Suppliers
  const allowedSuppliers = filterSuppliers(DIRECTORY_SUPPLIERS, { ...filters, query: trimmedQuery });
  const matchedSuppliers = isQueryEmpty ? [] : allowedSuppliers.slice(0, 4);

  // Filter Products
  const matchedProducts = SEARCH_PRODUCTS.filter((prod) => {
    if (isQueryEmpty) return false;
    if (!allowedSuppliers.some((supplier) => supplier.id === prod.supplierId)) return false;
    return matchSearch(searchableText([prod.name, prod.category, prod.supplierName, prod.origin]), trimmedQuery);
  }).slice(0, 4);

  // Filter Keywords / Tags
  const matchedKeywords = POPULAR_KEYWORDS.filter((kw) => {
    if (isQueryEmpty) return false;
    return matchSearch(searchableText([kw]), trimmedQuery);
  }).slice(0, 5);

  const totalMatches = matchedSuppliers.length + matchedProducts.length + matchedKeywords.length;

  const highlightMatch = (text: string, q: string) => {
    text = tr(text);
    if (!q || !text) return text;
    const normText = removeVietnameseTones(text).toLowerCase();
    const normQ = removeVietnameseTones(q).toLowerCase();
    const idx = normText.indexOf(normQ);
    if (idx === -1) return text;

    const before = text.substring(0, idx);
    const match = text.substring(idx, idx + q.length);
    const after = text.substring(idx + q.length);

    return (
      <span>
        {tr(before)}
        <mark className="bg-amber-200 text-slate-900 font-semibold px-0.5 rounded-xs">
          {tr(match)}
        </mark>
        {tr(after)}
      </span>
    );
  };

  const handleKeywordClick = (kw: string) => {
    // Add to recent searches
    if (!recentSearches.includes(kw)) {
      setRecentSearches(prev => [kw, ...prev.slice(0, 4)]);
    }
    onSelectKeyword(kw);
  };

  return (
    <div 
      ref={containerRef}
      className={`absolute left-0 right-0 top-full mt-2.5 bg-white/98 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-[0_12px_48px_rgba(15,23,42,0.18)] border border-slate-200/90 z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150 text-slate-900 ${customClass}`}
      style={{ maxHeight: '82vh' }}
    >
      
      {/* =======================================================================
          TOP BAR: QUERY STATUS & TOTAL COUNT
         ======================================================================= */}
      <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-blue-600" />
          {isQueryEmpty ? (
            <span className="font-semibold text-slate-700">
              {tr("Gợi ý tìm kiếm nhanh & Nhà cung cấp nổi bật")}</span>
          ) : (
            <span className="font-semibold text-slate-700 truncate max-w-[280px] sm:max-w-md">
              {tr("Kết quả gợi ý trực tiếp cho: ")}<span className="text-blue-700 font-bold">{tr("\"")}{tr(trimmedQuery)}{tr("\"")}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isQueryEmpty && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
              {tr(totalMatches)} {tr(" kết quả")}</span>
          )}
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
            title={tr("Đóng gợi ý (Esc)")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[calc(82vh-95px)] divide-y divide-slate-100 p-2 sm:p-3">
        
        {/* =======================================================================
            CASE 1: EMPTY QUERY (RECENT SEARCHES & TRENDING TOPICS)
           ======================================================================= */}
        {isQueryEmpty && (
          <div className="space-y-4 p-2 sm:p-3">
            
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tr("Tìm kiếm gần đây")}</span>
                  </div>
                  <button 
                    onClick={() => setRecentSearches([])}
                    className="text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {tr("Xóa lịch sử")}</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((rec, i) => (
                    <button
                      key={i}
                      onClick={() => handleKeywordClick(rec)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-xs text-slate-700 font-medium transition-colors cursor-pointer"
                    >
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{tr(rec)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Keywords */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 px-1">
                <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                <span>{tr("Xu hướng tìm kiếm tuần này")}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_KEYWORDS.slice(0, 6).map((kw, i) => (
                  <button
                    key={i}
                    onClick={() => handleKeywordClick(kw)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-xs text-slate-800 font-medium transition-colors cursor-pointer hover:border-blue-300"
                  >
                    <Search className="w-3 h-3 text-slate-400" />
                    <span>{tr(kw)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Featured Verified Suppliers */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide mb-2.5 px-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{tr("Nhà cung cấp nổi bật đã xác thực")}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DIRECTORY_SUPPLIERS.slice(0, 2).map((supp) => (
                  <div
                    key={supp.id}
                    onClick={() => onSelectSupplier(supp)}
                    className="p-3 rounded-xl border border-slate-200/70 hover:border-emerald-300 bg-white hover:bg-emerald-50/30 transition-all cursor-pointer flex items-center gap-3 group"
                  >
                    <img 
                      src={supp.logo} 
                      alt={tr(supp.name)} 
                      className="w-11 h-11 rounded-lg object-cover border border-slate-100 shrink-0" 
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                          {tr(supp.name)}
                        </span>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>{tr(supp.location)}</span>
                        <span>{tr("•")}</span>
                        <span className="text-emerald-700 font-semibold">{tr(supp.badgeTitle)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* =======================================================================
            CASE 2: QUERY HAS MATCHES
           ======================================================================= */}
        {!isQueryEmpty && totalMatches > 0 && (
          <>
            {/* SECTION 1: NHÀ CUNG CẤP (SUPPLIERS) */}
            {matchedSuppliers.length > 0 && (
              <div className="py-2.5 px-1 sm:px-2">
                <div className="flex items-center justify-between mb-2 px-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>{tr("Doanh nghiệp & Nhà cung cấp (")}{tr(matchedSuppliers.length)}{tr(")")}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{tr("Đã qua thẩm định OCR L1-L3")}</span>
                </div>

                <div className="space-y-1.5">
                  {matchedSuppliers.map((supp) => (
                    <div
                      key={supp.id}
                      onClick={() => onSelectSupplier(supp)}
                      className="p-2.5 sm:p-3 rounded-xl hover:bg-blue-50/60 border border-transparent hover:border-blue-200/80 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={supp.logo} 
                          alt={tr(supp.name)} 
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" 
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                              {tr(highlightMatch(supp.name, trimmedQuery))}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 text-[10px] font-bold">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              {tr(supp.badgeTitle)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 text-[11px] text-slate-500 mt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {tr(supp.location)}
                            </span>
                            <span>{tr("•")}</span>
                            <span className="truncate max-w-xs">
                              {supp.tags.slice(0, 3).map(tr).join(', ')}
                            </span>
                            <span>{tr("•")}</span>
                            <span className="font-semibold text-slate-700">
                              {tr(supp.capacity)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                        <span className="hidden sm:inline">{tr("Xem hồ sơ")}</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 2: SẢN PHẨM XUẤT KHẨU (PRODUCTS) */}
            {matchedProducts.length > 0 && (
              <div className="py-2.5 px-1 sm:px-2">
                <div className="flex items-center justify-between mb-2 px-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    <Package className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{tr("Sản phẩm xuất khẩu (")}{tr(matchedProducts.length)}{tr(")")}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{tr("Tiêu chuẩn quốc tế")}</span>
                </div>

                <div className="space-y-1.5">
                  {matchedProducts.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => onSelectProduct(prod)}
                      className="p-2.5 sm:p-3 rounded-xl hover:bg-emerald-50/50 border border-transparent hover:border-emerald-200/80 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={prod.image} 
                          alt={tr(prod.name)} 
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" 
                        />
                        <div className="min-w-0">
                          <span className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-emerald-800 transition-colors block truncate">
                            {tr(highlightMatch(prod.name, trimmedQuery))}
                          </span>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                            <span className="text-slate-700 font-medium">
                              {tr(prod.supplierName)}
                            </span>
                            <span>{tr("•")}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                              {tr(prod.category)}
                            </span>
                            <span>{tr("•")}</span>
                            <span className="font-semibold text-emerald-700">
                              {tr(prod.priceRange)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="text-[10px] text-slate-400 block">{tr("MOQ:")}</span>
                        <span className="text-[11px] font-semibold text-slate-700">
                          {tr(prod.moq)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 3: TỪ KHÓA & NGÀNH HÀNG GỢI Ý */}
            {matchedKeywords.length > 0 && (
              <div className="py-2.5 px-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                  <Tag className="w-3.5 h-3.5 text-purple-600" />
                  <span>{tr("Từ khóa liên quan")}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {matchedKeywords.map((kw, i) => (
                    <button
                      key={i}
                      onClick={() => handleKeywordClick(kw)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50/70 hover:bg-purple-100 border border-purple-200/60 text-xs text-purple-900 font-medium transition-colors cursor-pointer"
                    >
                      <Search className="w-3 h-3 text-purple-500" />
                      <span>{tr(highlightMatch(kw, trimmedQuery))}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* =======================================================================
            CASE 3: NO RESULTS FOUND
           ======================================================================= */}
        {!isQueryEmpty && totalMatches === 0 && (
          <div className="py-8 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">
              {tr("Chưa tìm thấy kết quả khớp trực tiếp với \"")}{tr(trimmedQuery)}{tr("\"")}</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {tr("Hãy thử tìm kiếm với các từ khóa phổ biến như Cà phê, Gạo ST25, Hạt điều, Tôm hoặc tên tỉnh thành.")}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {['Cà phê', 'Gạo', 'Hạt điều', 'Thủy sản', 'Đắk Lắk'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleKeywordClick(tag)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-medium transition-colors cursor-pointer"
                >
                  {tr(tag)}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* =======================================================================
          FOOTER ACTION: VIEW ALL IN DIRECTORY
         ======================================================================= */}
      <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <span className="text-slate-500 hidden sm:inline">
          {tr("Nhấn ")}<kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-700 shadow-2xs">{tr("↵ Enter")}</kbd> {tr(" để tìm kiếm hoặc chọn gợi ý")}</span>

        <button
          onClick={() => onViewAllResults(trimmedQuery)}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <span>{tr("Xem tất cả kết quả trong Danh bạ Nhà cung cấp")}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}
