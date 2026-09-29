'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Image from 'next/image';
import React, { useState } from 'react';
import { 
  Search, 
  ChevronDown, 
  MapPin, 
  ShieldCheck, 
  Package, 
  Mail, 
  LayoutGrid, 
  List, 
  SlidersHorizontal, 
  X, 
  Globe, 
} from 'lucide-react';
import { SupplierData, DEFAULT_SELLER_DETAIL } from './BuyerSellerDetail.tsx';
import LiveSearchDropdown from './LiveSearchDropdown.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { DIRECTORY_SUPPLIERS } from '../lib/suppliers';
import { filterSuppliers } from '../lib/supplierSearch';

interface BuyerDirectoryProps {
  initialSearchTerm?: string;
  initialCategory?: string | null;
  initialMarket?: string;
  initialLevel?: string;
  onSelectSupplier: (supplier: SupplierData) => void;
  onNavigateHome: () => void;
  onOpenRfqModal: (supplier: SupplierData) => void;
}

export { DIRECTORY_SUPPLIERS } from '../lib/suppliers';

export default function BuyerDirectory({
  initialSearchTerm = '',
  initialCategory = null,
  initialMarket = '',
  initialLevel = 'all',
  onSelectSupplier,
  onNavigateHome,
  onOpenRfqModal
}: BuyerDirectoryProps) {
  const { tr, t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [isLiveSearchOpen, setIsLiveSearchOpen] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'trust' | 'capacity' | 'rating'>('trust');


  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>(initialLevel);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [marketFilter, setMarketFilter] = useState(initialMarket);
  const [searchCategorySidebar, setSearchCategorySidebar] = useState('');
  const filteredSuppliers = filterSuppliers(DIRECTORY_SUPPLIERS, { query: searchTerm, category: categoryFilter, market: marketFilter, level: selectedLevelFilter })
    .sort((a, b) => sortBy === 'rating' ? b.rating - a.rating : sortBy === 'capacity'
      ? Number(b.capacity.replace(/[^\d]/g, '')) - Number(a.capacity.replace(/[^\d]/g, ''))
      : Number(b.badgeLevel.slice(1)) - Number(a.badgeLevel.slice(1)));

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Breadcrumb header */}
      <div className="bg-white border-b border-slate-100 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <button onClick={onNavigateHome} className="hover:text-slate-900 font-medium">
              {tr(language === 'vi' ? 'Trang chủ' : language === 'fr' ? 'Accueil' : language === 'ja' ? 'ホーム' : 'Home')}
            </button>
            <span>{tr("/")}</span>
            <span className="font-bold text-slate-800">{tr(t.directory.title)}</span>
          </div>
          <span className="text-[11px] text-teal-800 font-semibold bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/60">
            {tr("🛡️ ")}{tr(t.directory.verifiedDataNotice)}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* =========================================================================
              LEFT COLUMN: FILTERS & CATEGORIES (Exactly matching the screenshot)
             ========================================================================= */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-6">
            
            {/* Title & Subtitle in Left Sidebar */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 tracking-tight leading-[1.2]">
                {tr(t.directory.title)}
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed font-normal">
                {tr(t.directory.subtitle)}
              </p>
            </div>

            {/* Filter Box */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-5">
              
              {/* Header Filter */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900">
                  <SlidersHorizontal className="w-4 h-4 text-slate-700" />
                  <span>{tr(t.directory.filters)}</span>
                </div>
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedLevelFilter('all');
                    setCategoryFilter(null);
                    setMarketFilter('');
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  {tr(t.directory.clearFilter)}
                </button>
              </div>

              {/* Search Category Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder={tr("Tìm danh mục...")}
                  value={searchCategorySidebar}
                  onChange={(e) => setSearchCategorySidebar(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                />
              </div>

              {/* Danh mục sản phẩm */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {tr("Danh mục sản phẩm")}</h4>

                <div className="space-y-2 text-xs">
                  {/* Category 1: Nông sản & Thực phẩm (checked) */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-900">
                      <input 
                        type="checkbox" 
                        defaultChecked 
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-0 cursor-pointer" 
                      />
                      <span>{tr("Nông sản & Thực phẩm (328)")}</span>
                    </label>

                    {/* Subcategories */}
                    <div className="pl-6 pt-1.5 space-y-1.5 text-slate-600">
                      <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 cursor-pointer" />
                        <span>{tr("Cà phê & sản phẩm từ cà phê (64)")}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 cursor-pointer" />
                        <span>{tr("Hạt điều & sản phẩm từ điều (48)")}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 cursor-pointer" />
                        <span>{tr("Hạt tiêu & gia vị (36)")}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 cursor-pointer" />
                        <span>{tr("Rau củ quả (52)")}</span>
                      </label>
                    </div>
                  </div>

                  {/* Category 2: Thủy sản */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer" />
                      <span>{tr("Thủy sản (72)")}</span>
                    </label>
                  </div>

                  {/* Category 3: Thực phẩm chế biến */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer" />
                      <span>{tr("Thực phẩm chế biến (56)")}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Thị trường xuất khẩu */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {tr("Thị trường xuất khẩu")}</h4>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 cursor-pointer" />
                    <span>{tr("EU (212)")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 cursor-pointer" />
                    <span>{tr("Hoa Kỳ (184)")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 cursor-pointer" />
                    <span>{tr("Nhật Bản & Hàn Quốc (156)")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 cursor-pointer" />
                    <span>{tr("Trung Quốc (142)")}</span>
                  </label>
                </div>
              </div>

              {/* Cấp độ xác minh */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {tr("Cấp độ xác minh")}</h4>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                    <input 
                      type="radio" 
                      name="level" 
                      checked={selectedLevelFilter === 'all'} 
                      onChange={() => setSelectedLevelFilter('all')} 
                      className="cursor-pointer"
                    />
                    <span>{tr("Tất cả cấp độ")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                    <input 
                      type="radio" 
                      name="level" 
                      checked={selectedLevelFilter === 'L3'} 
                      onChange={() => setSelectedLevelFilter('L3')} 
                      className="cursor-pointer"
                    />
                    <span className="text-amber-700 font-semibold">{tr("L3 - VYBE Certified (45)")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                    <input type="radio" name="level" checked={selectedLevelFilter === 'L1'} onChange={() => setSelectedLevelFilter('L1')} className="cursor-pointer" />
                    <span>{tr('L1 - Basic Verified')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                    <input 
                      type="radio" 
                      name="level" 
                      checked={selectedLevelFilter === 'L2'} 
                      onChange={() => setSelectedLevelFilter('L2')} 
                      className="cursor-pointer"
                    />
                    <span className="text-emerald-700 font-semibold">{tr("L2 - Enhanced Verified (180)")}</span>
                  </label>
                </div>
              </div>

            </div>

          </aside>

          {/* =========================================================================
              MAIN COLUMN: SEARCH BAR, FILTER CHIPS, LISTINGS (Matches screenshot)
             ========================================================================= */}
          <main className="lg:col-span-8 xl:col-span-9 space-y-4">
            
            {/* Top Search Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              
              {/* Search input with search icon button */}
              <div className="relative flex-1">
                <div className="flex items-center bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden focus-within:border-teal-700 transition-colors">
                  <div className="pl-3.5 pr-2 text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input 
                    type="text"
                    placeholder={tr("Tìm nhà cung cấp, sản phẩm, chứng nhận...")}
                    value={searchTerm}
                    onFocus={() => setIsLiveSearchOpen(true)}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsLiveSearchOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setIsLiveSearchOpen(false);
                      } else if (e.key === 'Escape') {
                        setIsLiveSearchOpen(false);
                      }
                    }}
                    className="w-full py-2.5 sm:py-3 text-xs sm:text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="p-1 mr-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                      title={tr("Xóa từ khóa")}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button 
                    onClick={() => setIsLiveSearchOpen(false)}
                    className="h-10 sm:h-11 px-4 bg-[#083832] hover:bg-[#062924] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                {/* LIVE SEARCH DROPDOWN */}
                <LiveSearchDropdown 
                  query={searchTerm}
                  filters={{ category: categoryFilter, market: marketFilter, level: selectedLevelFilter }}
                  isOpen={isLiveSearchOpen}
                  onClose={() => setIsLiveSearchOpen(false)}
                  onSelectSupplier={(supp) => {
                    onSelectSupplier(supp);
                    setIsLiveSearchOpen(false);
                  }}
                  onSelectProduct={(prod) => {
                    const matchedSupp = DIRECTORY_SUPPLIERS.find(s => s.id === prod.supplierId) || DEFAULT_SELLER_DETAIL;
                    onSelectSupplier(matchedSupp);
                    setIsLiveSearchOpen(false);
                  }}
                  onSelectKeyword={(kw) => {
                    setSearchTerm(kw);
                    setIsLiveSearchOpen(false);
                  }}
                  onViewAllResults={(q) => {
                    setSearchTerm(q);
                    setIsLiveSearchOpen(false);
                  }}
                />
              </div>

              {/* Sắp xếp theo */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500 whitespace-nowrap hidden xl:inline">{tr(t.directory.sortBy)}</span>
                <div className="relative">
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="appearance-none bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 pr-8 text-xs font-semibold text-slate-800 cursor-pointer shadow-2xs focus:outline-none"
                  >
                    <option value="trust">{tr(t.directory.sortTrust)}</option>
                    <option value="capacity">{tr(t.directory.sortCapacity)}</option>
                    <option value="rating">{tr(t.directory.sortRating)}</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* View toggle (Grid / List) */}
                <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-2xs">
                  <button 
                    onClick={() => setActiveView('grid')}
                    className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                      activeView === 'grid' ? 'bg-[#083832] text-white' : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title={tr("Dạng lưới")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setActiveView('list')}
                    className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                      activeView === 'list' ? 'bg-[#083832] text-white' : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title={tr("Dạng danh sách")}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>

            {/* Filter tag pills row (Matches screenshot exactly) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 text-xs select-none">
              
              {/* Active Pill: Nông sản & Thực phẩm */}
              <button 
                className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200 flex items-center gap-1.5 shrink-0 shadow-2xs"
              >
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>{tr("Nông sản & Thực phẩm")}</span>
                <X className="w-3 h-3 hover:text-blue-900 cursor-pointer ml-0.5" />
              </button>

              {/* Other Pills: Cà phê, Hạt điều, Hạt tiêu, Gạo, Trái cây tươi, Thủy sản */}
              {['Cà phê', 'Hạt điều', 'Hạt tiêu', 'Gạo', 'Trái cây tươi', 'Thủy sản'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchTerm(searchTerm === tag ? '' : tag)}
                  className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer shrink-0 border ${
                    searchTerm === tag 
                      ? 'bg-[#083832] text-white border-[#083832]'
                      : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  {tr(tag)}
                </button>
              ))}

              {/* Thêm bộ lọc */}
              <button onClick={() => { setSearchTerm(''); setCategoryFilter(null); setMarketFilter(''); setSelectedLevelFilter('all'); }} className="px-3 py-1.5 rounded-full bg-blue-50/70 hover:bg-blue-100 text-blue-700 font-semibold flex items-center gap-1 shrink-0 border border-blue-200/60 cursor-pointer">
                <SlidersHorizontal className="w-3 h-3" />
                <span>{tr("Xóa bộ lọc")}</span>
              </button>

            </div>

            {/* Results counter & Clear filter */}
            {(categoryFilter || marketFilter && marketFilter !== 'Tất cả thị trường') && <p className="text-xs text-teal-800">{tr(categoryFilter)} {tr(marketFilter !== 'Tất cả thị trường' ? marketFilter : '')}</p>}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <div>
                {tr("Tìm thấy ")}<strong className="text-slate-900 font-bold">
                  {tr(filteredSuppliers.length)}
                </strong> {tr(" nhà cung cấp")}{searchTerm && (
                  <span> {tr(" phù hợp với từ khóa ")}<span className="text-teal-700 font-semibold">{tr("\"")}{tr(searchTerm)}{tr("\"")}</span></span>
                )}
              </div>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  {tr("Xóa bộ lọc")}</button>
              )}
            </div>

            {/* =========================================================================
                SUPPLIER LIST CARDS (Matches the screenshot layout & styles)
               ========================================================================= */}
            <div className={activeView === 'list' ? 'space-y-4' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
              {filteredSuppliers.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center sm:col-span-2"><Search className="mx-auto mb-3 h-7 w-7 text-slate-400" /><p className="font-semibold text-slate-700">{tr("Không tìm thấy nhà cung cấp phù hợp")}</p><p className="mt-2 text-sm text-slate-500">{tr("Thử từ khóa khác hoặc xóa bộ lọc để xem tất cả nhà cung cấp.")}</p></div>}
              {filteredSuppliers.map((supplier) => (
                  <div 
                    key={supplier.id}
                    className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 group text-left cursor-pointer"
                    onClick={() => onSelectSupplier(supplier)}
                  >
                    
                    {/* Left: Thumbnail Image + Info */}
                    <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
                      
                      {/* Product Thumbnail (e.g. coffee berries, cashews) */}
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 bg-slate-100 shadow-2xs">
                        <Image width={1200} height={800} unoptimized
                          src={supplier.products[0]?.image || supplier.coverImage} 
                          alt={tr(supplier.name)} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* Info & Tags */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        
                        {/* Company Logo Icon + Name + Green Checkmark */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Logo mark */}
                          <div className="w-6 h-6 rounded-md bg-teal-50 text-[#0b5e52] flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 32 32" className="w-4 h-4" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M 16 26 C 14 18 8 13 4 10 C 3 9 4 7 5 7 C 11 8 15 13 16 26 Z" fill="#0b5e52" />
                              <path d="M 16 26 C 18 18 24 13 28 10 C 29 9 28 7 27 7 C 21 8 17 13 16 26 Z" fill="#0b5e52" />
                            </svg>
                          </div>

                          <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-teal-900 transition-colors">
                            {tr(supplier.name)}
                          </h3>

                          {/* Green verified circle check */}
                          <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]" title={tr("Đã xác thực")}>
                            {tr("✓")}</span>
                        </div>

                        {/* Location */}
                        <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{tr(supplier.location)}</span>
                        </p>

                        {/* Description */}
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {tr(supplier.description)}
                        </p>

                        {/* Tag Pills (Cà phê, Hạt điều, HACCP, ISO 22000...) */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {supplier.tags.slice(0, 3).map((tag, idx) => (
                            <span 
                              key={idx} 
                              className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium"
                            >
                              {tr(tag)}
                            </span>
                          ))}
                          {supplier.tags.filter(t => t === 'HACCP' || t === 'ISO 22000' || t === 'BRC' || t === 'GlobalG.A.P.').map((cert, idx) => (
                            <span 
                              key={idx} 
                              className="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/70 text-[11px] font-bold"
                            >
                              {tr(cert)}
                            </span>
                          ))}
                        </div>

                      </div>

                    </div>

                    {/* Right: Badge (L3 VYBE Certified), Capacity, Markets & Actions */}
                    <div className="flex flex-col sm:flex-row xl:flex-col items-start sm:items-center xl:items-end justify-between gap-4 w-full xl:w-auto shrink-0 border-t xl:border-t-0 pt-3 xl:pt-0 border-slate-100">
                      
                      {/* Badge & Metrics */}
                      <div className="flex items-center sm:items-start xl:items-end gap-3 text-right">
                        
                        {/* Shield Badge (L3 Gold or L2 Emerald) */}
                        <div className={`px-3 py-1.5 rounded-2xl flex items-center gap-2 border ${
                          supplier.badgeLevel === 'L3'
                            ? 'bg-gradient-to-r from-amber-50 to-amber-100/60 border-amber-300 text-amber-950'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        }`}>
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                            supplier.badgeLevel === 'L3' ? 'bg-amber-400 text-amber-950 shadow-2xs' : 'bg-emerald-600 text-white'
                          }`}>
                            <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                          </div>
                          <div className="text-left">
                            <span className="text-xs font-black block leading-none">{tr(supplier.badgeLevel)}</span>
                            <span className="text-[10px] font-semibold text-slate-600 block mt-0.5">
                              {tr(supplier.badgeLevel === 'L3' ? 'VYBE Certified' : supplier.badgeLevel === 'L2' ? 'Enhanced Verified' : 'Basic Verified')}
                            </span>
                          </div>
                        </div>

                        {/* Quick meta (Capacity + Export Market) */}
                        <div className="text-left xl:text-right text-[11px] text-slate-500 space-y-0.5">
                          <p className="flex items-center gap-1 xl:justify-end">
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            <strong>{tr(supplier.monthlyCapacity)}</strong>
                          </p>
                          <p className="flex items-center gap-1 xl:justify-end truncate max-w-[150px]">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            <span>{supplier.mainMarkets.slice(0, 2).map(tr).join(', ')}</span>
                          </p>
                        </div>

                      </div>

                      {/* Action Buttons: [ Xem hồ sơ ] and [ ✉ Gửi RFQ ] */}
                      <div className="flex items-center gap-2 w-full sm:w-auto xl:w-auto justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSupplier(supplier);
                          }}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-200 transition-colors cursor-pointer shadow-2xs text-center"
                        >
                          {tr(t.directory.viewProfile)}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenRfqModal(supplier);
                          }}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#083832] hover:bg-[#062924] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5 text-teal-300" />
                          <span>{tr(t.directory.sendRfq)}</span>
                        </button>
                      </div>

                    </div>

                  </div>
                ))}
            </div>

          </main>

        </div>
      </div>

    </div>
  );
}
