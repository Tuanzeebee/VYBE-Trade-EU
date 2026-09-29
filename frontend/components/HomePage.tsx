'use client';
import type { Page } from '../lib/navigation';
import React, { useState } from 'react';
import { 
  Search, 
  ChevronDown, 
  ArrowRight, 
  ShieldCheck, 
  Package, 
  Send, 
  Sparkles, 
  MapPin, 
  Sprout, 
  Fish, 
  UtensilsCrossed, 
  X, 
  CheckCircle2 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import LiveSearchDropdown from './LiveSearchDropdown.tsx';
import { DIRECTORY_SUPPLIERS } from './BuyerDirectory.tsx';
import { DEFAULT_SELLER_DETAIL, type SupplierData } from './BuyerSellerDetail.tsx';
import { POPULAR_TAGS, FEATURED_SUPPLIERS, type FeaturedSupplier } from '../lib/constants.ts';

export interface HomePageProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (cat: string | null) => void;
  selectedMarket: string;
  setSelectedMarket: (m: string) => void;
  selectedTrust: string;
  setSelectedTrust: (t: string) => void;
  onNavigate: (page: Page) => void;
  onSelectSupplier: (supp: SupplierData) => void;
  onOpenRfqModal: (supp: SupplierData) => void;
}

export default function HomePage({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedMarket,
  setSelectedMarket,
  selectedTrust,
  setSelectedTrust,
  onNavigate,
  onSelectSupplier,
  onOpenRfqModal
}: HomePageProps) {
  const { tr, t } = useLanguage();
  const [isLiveSearchOpen, setIsLiveSearchOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'category' | 'market' | 'trust' | null>(null);
  const [activeSupplierModal, setActiveSupplierModal] = useState<FeaturedSupplier | null>(null);

  return (
    <>
      {/* =========================================================================
          HERO SECTION WITH ILLUSTRATION
         ========================================================================= */}
      <section className="relative w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-12 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Heading, Subtitle & Search */}
          <div className="lg:col-span-7 xl:col-span-7 z-10">
            
            {/* Kicker Badge */}
            <div className="inline-flex items-center gap-2 mb-4 select-none">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0d9488]/20 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0d9488]" />
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-[#0d9488] tracking-wider uppercase">
                {tr(t.hero.kicker)}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-bold text-slate-900 tracking-tight leading-[1.2] mb-4">
              {tr(t.hero.titlePre)}
              <span className="text-[#2563eb]">{tr(t.hero.titleHighlight)}</span>
              <br className="hidden sm:inline" />
              {tr(t.hero.titlePost)}
            </h1>

            {/* Subtitle */}
            <p className="text-slate-600 text-base sm:text-[17px] leading-relaxed max-w-2xl mb-8 font-normal">
              {tr(t.hero.subtitle)}
            </p>

            {/* Big Search Bar Pill Container */}
            <div className="relative bg-white rounded-full sm:rounded-2xl lg:rounded-full p-2 border border-slate-200/90 shadow-[0_6px_28px_rgba(0,0,0,0.06)] flex flex-col sm:flex-row items-center gap-2 sm:gap-0">
              
              {/* Search text input */}
              <div className="flex items-center gap-2.5 px-3 flex-1 w-full relative">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input 
                  type="text"
                  value={searchTerm}
                  onFocus={() => setIsLiveSearchOpen(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsLiveSearchOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsLiveSearchOpen(false);
                      onNavigate('buyer-directory');
                    } else if (e.key === 'Escape') {
                      setIsLiveSearchOpen(false);
                    }
                  }}
                  placeholder={tr(t.hero.searchPlaceholder)}
                  className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent py-1.5 font-normal"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                    }}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                    title={tr("Xóa từ khóa")}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown 1: Ngành hàng */}
              <div className="relative border-t sm:border-t-0 sm:border-l border-slate-200 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(activeDropdown === 'category' ? null : 'category');
                    setIsLiveSearchOpen(false);
                  }}
                  className="w-full sm:w-auto px-4 py-1.5 text-xs sm:text-[13px] font-medium text-slate-700 hover:text-slate-900 flex items-center justify-between sm:justify-start gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>{tr(selectedCategory || t.hero.category)}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {activeDropdown === 'category' && (
                  <div className="absolute left-0 sm:left-auto top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-30">
                    {['Tất cả ngành', 'Nông sản', 'Thủy sản', 'Thực phẩm chế biến', 'Gia vị & Hương liệu'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat === 'Tất cả ngành' ? null : cat);
                          setActiveDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        {tr(cat)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dropdown 2: Thị trường */}
              <div className="relative border-t sm:border-t-0 sm:border-l border-slate-200 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(activeDropdown === 'market' ? null : 'market');
                    setIsLiveSearchOpen(false);
                  }}
                  className="w-full sm:w-auto px-4 py-1.5 text-xs sm:text-[13px] font-medium text-slate-700 hover:text-slate-900 flex items-center justify-between sm:justify-start gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>{tr(selectedMarket === 'Tất cả thị trường' ? t.hero.market : selectedMarket)}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {activeDropdown === 'market' && (
                  <div className="absolute left-0 sm:left-auto top-full mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-30">
                    {['Tất cả thị trường', 'Châu Âu (EU)', 'Mỹ & Canada', 'Nhật Bản & Hàn Quốc', 'Trung Đông'].map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setSelectedMarket(m);
                          setActiveDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        {tr(m)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dropdown 3: Trust Level */}
              <div className="relative border-t sm:border-t-0 sm:border-l border-slate-200 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(activeDropdown === 'trust' ? null : 'trust');
                    setIsLiveSearchOpen(false);
                  }}
                  className="w-full sm:w-auto px-4 py-1.5 text-xs sm:text-[13px] font-medium text-slate-700 hover:text-slate-900 flex items-center justify-between sm:justify-start gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>{tr(selectedTrust === 'Tất cả cấp độ' ? t.hero.trustLevel : selectedTrust)}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {activeDropdown === 'trust' && (
                  <div className="absolute left-0 sm:left-auto top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-30">
                    {['Tất cả cấp độ', 'L1 - Basic Verified', 'L2 - Enhanced Verified', 'L3 - VYBE Certified'].map((lv) => (
                      <button
                        key={lv}
                        onClick={() => {
                          setSelectedTrust(lv);
                          setActiveDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        {tr(lv)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Search Button */}
              <button
                type="button"
                onClick={() => {
                  setIsLiveSearchOpen(false);
                  onNavigate('buyer-directory');
                }}
                className="w-full sm:w-11 h-11 bg-[#0f172a] hover:bg-slate-800 text-white rounded-full sm:rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-xs cursor-pointer"
                title={tr(t.hero.searchBtn)}
              >
                <Search className="w-4 h-4 stroke-[2.2]" />
              </button>

              {/* LIVE SEARCH RESULTS DROPDOWN */}
              <LiveSearchDropdown
                filters={{ category: selectedCategory, market: selectedMarket, level: selectedTrust.startsWith('L') ? selectedTrust.slice(0, 2) : 'all' }}
                query={searchTerm}
                isOpen={isLiveSearchOpen}
                onClose={() => setIsLiveSearchOpen(false)}
                onSelectSupplier={(supp) => {
                  onSelectSupplier(supp);
                  onNavigate('buyer-seller-detail');
                  setIsLiveSearchOpen(false);
                }}
                onSelectProduct={(prod) => {
                  const matchedSupp = DIRECTORY_SUPPLIERS.find(s => s.id === prod.supplierId) || DEFAULT_SELLER_DETAIL;
                  onSelectSupplier(matchedSupp);
                  onNavigate('buyer-seller-detail');
                  setIsLiveSearchOpen(false);
                }}
                onSelectKeyword={(kw) => {
                  setSearchTerm(kw);
                  setIsLiveSearchOpen(false);
                  onNavigate('buyer-directory');
                }}
                onViewAllResults={(q) => {
                  setSearchTerm(q);
                  setIsLiveSearchOpen(false);
                  onNavigate('buyer-directory');
                }}
              />

            </div>

            {/* Popular Search Tags Row */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 mr-1 select-none">
                {tr(t.hero.popularSearches)}
              </span>
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSearchTerm(tag);
                    setIsLiveSearchOpen(true);
                  }}
                  className={`text-xs px-3 py-1 rounded-full cursor-pointer transition-colors font-medium ${
                    searchTerm === tag 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {tr(tag)}
                </button>
              ))}
            </div>

          </div>

          {/* Right Column: Global Logistics & Supply Chain Map Illustration */}
          <div className="lg:col-span-5 xl:col-span-5 relative flex items-center justify-center min-h-[340px] sm:min-h-[380px] pointer-events-none select-none">
            <svg 
              viewBox="0 0 540 420" 
              className="w-full h-full max-w-[520px]" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Soft Dotted / Contoured World Map Graphic */}
              <g opacity="0.35">
                <path d="M 60 70 Q 110 40 160 65 Q 180 90 140 110 Q 90 95 60 70 Z" fill="#cbd5e1" />
                <path d="M 170 80 Q 230 70 260 110 Q 220 140 180 120 Z" fill="#cbd5e1" />
                <path d="M 270 90 Q 360 80 420 130 Q 380 190 300 170 Q 260 130 270 90 Z" fill="#cbd5e1" />
                <path d="M 400 190 Q 430 230 410 280 Q 380 290 390 230 Z" fill="#94a3b8" />
              </g>

              {/* Curved Flight Path Arc: EU to Vietnam */}
              <path 
                d="M 120 90 C 220 60, 360 120, 420 220" 
                stroke="#3b82f6" 
                strokeWidth="2" 
                strokeDasharray="4 4" 
                fill="none"
              />

              {/* Animated Light Pulse traveling from VN to EU */}
              <circle cx="260" cy="98" r="3.5" fill="#2563eb" filter="drop-shadow(0 0 4px #60a5fa)" />

              {/* Europe Hub Marker */}
              <g transform="translate(105, 75)">
                <circle cx="15" cy="15" r="14" fill="#3b82f6" fillOpacity="0.2" />
                <circle cx="15" cy="15" r="7" fill="#2563eb" />
                <circle cx="15" cy="15" r="2.5" fill="#ffffff" />
                <g transform="translate(30, 2)">
                  <rect width="36" height="22" rx="6" fill="#dbeafe" stroke="#bfdbfe" />
                  <text x="18" y="15" textAnchor="middle" fill="#1e40af" fontSize="11" fontWeight="700" letterSpacing="0.5">
                    {tr("EU")}
                  </text>
                </g>
              </g>

              {/* Floating Pill: Trusted Supply Chain */}
              <g transform="translate(200, 60)" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.06))">
                <rect width="160" height="34" rx="17" fill="#ffffff" stroke="#e2e8f0" />
                <text x="80" y="21" textAnchor="middle" fill="#334155" fontSize="12" fontWeight="600">
                  {tr("Trusted Supply Chain")}
                </text>
              </g>

              {/* Isometric Ocean Grid */}
              <g transform="translate(310, 160)" opacity="0.4">
                <line x1="0" y1="90" x2="160" y2="0" stroke="#93c5fd" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="120" x2="190" y2="30" stroke="#93c5fd" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="40" x2="140" y2="120" stroke="#93c5fd" strokeWidth="1" strokeDasharray="3 3" />
              </g>

              {/* Isometric Shipping Container Stack & Cargo Vessel */}
              <g transform="translate(330, 150)">
                <path d="M 10 70 L 60 40 L 160 90 L 120 125 L 30 110 Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
                <path d="M 60 40 L 105 15 L 140 32 L 95 60 Z" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1" />
                <path d="M 60 40 L 95 60 L 95 85 L 60 65 Z" fill="#1d4ed8" />
                <path d="M 95 60 L 140 32 L 140 55 L 95 85 Z" fill="#3b82f6" />
                <path d="M 30 75 L 75 50 L 110 68 L 65 95 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
                <path d="M 30 75 L 65 95 L 65 115 L 30 95 Z" fill="#0369a1" />
                <path d="M 65 95 L 110 68 L 110 88 L 65 115 Z" fill="#38bdf8" />
                <path d="M 80 120 C 120 135 150 145 180 135" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                <path d="M 90 130 C 130 145 160 155 190 145" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
              </g>

              {/* Vietnam Hub Marker */}
              <g transform="translate(410, 195)">
                <circle cx="15" cy="15" r="14" fill="#10b981" fillOpacity="0.25" />
                <circle cx="15" cy="15" r="7" fill="#047857" />
                <circle cx="15" cy="15" r="2.5" fill="#ffffff" />
                <g transform="translate(25, -2)">
                  <rect width="28" height="20" rx="4" fill="#047857" />
                  <text x="14" y="14" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800" letterSpacing="0.5">
                    {tr("VN")}
                  </text>
                </g>
              </g>

              {/* Stylized Leaves */}
              <g transform="translate(450, 40)" opacity="0.9">
                <path d="M 40 180 C 30 120 15 50 10 0" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 12 40 C -15 25 -25 60 10 70 C 25 55 20 45 12 40 Z" fill="#0d9488" fillOpacity="0.8" />
                <path d="M 22 80 C 55 60 70 100 30 120 C 20 105 22 90 22 80 Z" fill="#10b981" fillOpacity="0.85" />
                <path d="M 28 135 C -5 125 -10 165 25 175 C 35 160 32 145 28 135 Z" fill="#047857" fillOpacity="0.8" />
                <path d="M 35 155 C 75 140 90 190 40 215 C 30 195 32 175 35 155 Z" fill="#0f766e" fillOpacity="0.85" />
              </g>
            </svg>
          </div>

        </div>

        {/* =========================================================================
            FOUR VALUE PROPOSITION FEATURE CARDS
           ========================================================================= */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Doanh nghiệp đã xác minh */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-xs flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                {tr(t.features.verified)}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-normal">
                {tr(t.features.verifiedDesc)}
              </p>
            </div>
          </div>

          {/* Card 2: Sản phẩm đa dạng */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-xs flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Package className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                {tr(t.features.products)}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-normal">
                {tr(t.features.productsDesc)}
              </p>
            </div>
          </div>

          {/* Card 3: Kết nối nhanh chóng */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-xs flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Send className="w-5 h-5 stroke-[2.2] translate-x-0.5 -translate-y-0.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                {tr(t.features.fast)}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-normal">
                {tr(t.features.fastDesc)}
              </p>
            </div>
          </div>

          {/* Card 4: Hỗ trợ bởi AI */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-xs flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Sparkles className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                {tr(t.features.ai)}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-normal">
                {tr(t.features.aiDesc)}
              </p>
            </div>
          </div>

        </div>

      </section>

      {/* =========================================================================
          SECTION: DOANH NGHIỆP NỔI BẬT (FEATURED SUPPLIERS)
         ========================================================================= */}
      <section className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pb-16">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
          <div>
            <h2 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
              {tr(t.featured.title)}
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-normal">
              {tr(t.featured.subtitle)}
            </p>
          </div>

          <button 
            onClick={() => onNavigate('buyer-directory')}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>{tr(t.featured.viewAll)}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURED_SUPPLIERS.map((supplier) => (
            <div
              key={supplier.id}
              onClick={() => setActiveSupplierModal(supplier)}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${supplier.iconColor} transition-transform group-hover:scale-105`}>
                    {supplier.categoryType === 'agriculture' && <Sprout className="w-5 h-5" />}
                    {supplier.categoryType === 'seafood' && <Fish className="w-5 h-5" />}
                    {supplier.categoryType === 'food' && <UtensilsCrossed className="w-5 h-5" />}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {tr(supplier.name)}
                    </h4>
                  </div>
                </div>

                {/* Verified Badge */}
                <div className="mb-3">
                  {supplier.verifiedType === 'l2' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
                      <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{tr(supplier.verifiedLevel)}</span>
                    </span>
                  )}
                  {supplier.verifiedType === 'l1' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-semibold text-blue-700">
                      <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{tr(supplier.verifiedLevel)}</span>
                    </span>
                  )}
                  {supplier.verifiedType === 'l3' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-semibold text-teal-800">
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{tr(supplier.verifiedLevel)}</span>
                    </span>
                  )}
                </div>

                {/* Metadata Row: Category + Country */}
                <div className="flex items-center gap-4 text-xs text-slate-500 font-medium mb-4">
                  <div className="flex items-center gap-1.5">
                    {supplier.categoryType === 'agriculture' && <Sprout className="w-3.5 h-3.5 text-slate-400" />}
                    {supplier.categoryType === 'seafood' && <Fish className="w-3.5 h-3.5 text-slate-400" />}
                    {supplier.categoryType === 'food' && <UtensilsCrossed className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{tr(supplier.category)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tr(supplier.location)}</span>
                  </div>
                </div>
              </div>

              {/* Product Tags Row */}
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                {supplier.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-md"
                  >
                    {tr(tag)}
                  </span>
                ))}
              </div>

            </div>
          ))}
        </div>

      </section>

      {/* =========================================================================
          SUPPLIER DETAIL MODAL
         ========================================================================= */}
      {activeSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-left">
            <button
              onClick={() => setActiveSupplierModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
                <Sprout className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{tr(activeSupplierModal.name)}</h3>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {tr(activeSupplierModal.verifiedLevel)}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              {tr(activeSupplierModal.description)}
            </p>

            <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs mb-5">
              <div className="flex justify-between">
                <span className="text-slate-500">{tr(t.modal.industry)}</span>
                <span className="font-semibold text-slate-800">{tr(activeSupplierModal.category)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{tr(t.modal.capacity)}</span>
                <span className="font-semibold text-slate-800">{tr(activeSupplierModal.capacity)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{tr(t.modal.standards)}</span>
                <span className="font-semibold text-slate-800">{tr(activeSupplierModal.standards)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const supplier = DIRECTORY_SUPPLIERS.find((item) => item.id === activeSupplierModal.id);
                  if (!supplier) return;
                  onSelectSupplier(supplier);
                  onOpenRfqModal(supplier);
                  setActiveSupplierModal(null);
                }}
                className="flex-1 py-2.5 rounded-full bg-[#0f172a] hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer text-center"
              >
                {tr(t.modal.sendRfqBtn)}
              </button>
              <button
                onClick={() => setActiveSupplierModal(null)}
                className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {tr(t.common.close)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
