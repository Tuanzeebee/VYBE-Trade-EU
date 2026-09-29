'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { DemoUser } from '../lib/demoAuth';
import { BUSINESS_MODELS, EXPORT_MARKETS, INDUSTRIES, STAFF_LANGUAGES } from '../lib/companyApi';
import { draftToBody, type ProductDraft } from '../lib/productsApi';
import ProductsEditor from './ProductsEditor';
import LanguageSelect from './LanguageSelect';
import { 
  ArrowRight, 
  ChevronDown, 
  Calendar, 
  User, 
  ShieldCheck, 
  Layers, 
  TrendingUp, 
  Check, 
  X, 
  Building2,
  CheckCircle2,
  Briefcase,
  UploadCloud,
  FileText,
  Award,
  Trash2,
  Eye,
  Plus,
  Lock,
  AlertCircle,
  Sparkles,
  ExternalLink,
  MoreVertical,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { useLanguage } from "../context/LanguageContext";
import EvidenceManager from "./EvidenceManager";

interface SellerOnboardingProps {
  account?: DemoUser;
  initialStep?: number;
  onComplete?: (profile: Record<string, string>, products: ProductDraft[]) => void | Promise<void>;
  /** Lưu nháp công ty lên server khi rời bước 1 (A2). Lỗi → ở lại bước 1. */
  onSaveCompany?: (profile: Record<string, string>) => Promise<void>;
  /** Lưu nháp sản phẩm lên server khi rời bước 2 (A2). Lỗi → ở lại bước 2. */
  onSaveProducts?: (products: ProductDraft[]) => Promise<void>;
  /** Giá trị ban đầu của bước 1 lấy từ server (trang sửa hồ sơ). */
  initialCompany?: Record<string, string>;
  /** Sản phẩm đã lưu trên server (B5), đổi sang bản nháp. */
  initialProducts?: ProductDraft[];
  onLogout: () => void;
  onNavigateHome: () => void;
  onNavigateWorkspace?: (tab?: 'profile' | 'verification') => void;
}

export default function SellerOnboarding({ account, initialStep = 2, initialCompany, initialProducts, onComplete, onSaveCompany, onSaveProducts, onLogout, onNavigateHome, onNavigateWorkspace }: SellerOnboardingProps) {
  const { tr, language } = useLanguage();
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [submitError, setSubmitError] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Step 2: sản phẩm (B5) — bản nháp trong form, lưu lên server khi hoàn tất.
  const [products, setProducts] = useState<ProductDraft[]>(initialProducts ?? []);
  const [productError, setProductError] = useState('');

  // Form State for Step 1: Thông tin doanh nghiệp
  // Hồ sơ lưu lên server (B1) — không điền sẵn dữ liệu demo.
  const [formData, setFormData] = useState({
    companyName: account?.company || '',
    taxCode: '',
    businessType: '',
    establishedYear: '',
    headquartersAddress: '',
    website: '',
    contactEmail: account?.email || '',
    industrySector: '',
    languages: 'vi',
    descriptionVi: '',
    descriptionEn: '',
    markets: '',
    ...initialCompany
  });
  const staffLanguages = formData.languages.split(',').filter(Boolean);
  const exportMarkets = formData.markets.split(',').filter(Boolean);
  const toggleMarket = (code: string) => setFormData({
    ...formData,
    markets: (exportMarkets.includes(code) ? exportMarkets.filter((m) => m !== code) : [...exportMarkets, code]).join(',')
  });
  const toggleStaffLanguage = (code: string) => setFormData({
    ...formData,
    languages: (staffLanguages.includes(code) ? staffLanguages.filter((l) => l !== code) : [...staffLanguages, code]).join(',')
  });

  // Bước 3: bằng chứng lưu trên server (C6); wizard chỉ giữ số lượng để hiện ở bước xem lại.
  const [evidenceCount, setEvidenceCount] = useState(0);

  const goToLicenses = async () => {
    if (products.length === 0) { setProductError('Vui lòng thêm ít nhất một sản phẩm.'); return; }
    try {
      products.forEach((p) => draftToBody(p));
    } catch (cause) {
      setProductError(cause instanceof Error ? cause.message : 'Sản phẩm chưa hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }
    setProductError('');
    try {
      await onSaveProducts?.(products);
    } catch (cause) {
      setProductError(cause instanceof Error ? cause.message : 'Không thể lưu sản phẩm. Vui lòng thử lại.');
      return;
    }
    setCurrentStep(3);
  };

  const buildProfile = (): Record<string, string> => ({ ...formData, country: 'Việt Nam',
    interest: [...new Set(products.map((p) => p.hs?.formatted ?? ''))].filter(Boolean).join(', '),
    products: JSON.stringify(products.map((p) => ({ name: p.name }))) });

  const finish = async () => {
    setSubmitError('');
    if (!onComplete) { setSubmittedSuccess(true); return; }
    try {
      await onComplete(buildProfile(), products);
    } catch (cause) { setSubmitError(cause instanceof Error ? cause.message : 'Không thể lưu hồ sơ. Vui lòng thử lại.'); }
  };

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === 1 && onSaveCompany) {
      setSubmitError('');
      try {
        await onSaveCompany(buildProfile());
      } catch (cause) {
        setSubmitError(cause instanceof Error ? cause.message : 'Không thể lưu hồ sơ. Vui lòng thử lại.');
        return;
      }
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      void finish();
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f7f8] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      
      {/* =========================================================================
          1. HEADER (SELLER LOGGED IN STATE)
         ========================================================================= */}
      <header className="w-full bg-white border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 min-h-16 py-3 flex flex-wrap gap-3 items-center justify-between">
          
          {/* Left: Brand Logo */}
          <div 
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            title={tr("Quay lại trang chủ")}
          >
            <div className="w-8 h-8 flex items-center justify-center text-[#0b5e52]">
              <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 16 26 C 14 18 8 13 4 10 C 3 9 4 7 5 7 C 11 8 15 13 16 26 Z" fill="#0b5e52" />
                <path d="M 16 26 C 18 18 24 13 28 10 C 29 9 28 7 27 7 C 21 8 17 13 16 26 Z" fill="#0b5e52" />
              </svg>
            </div>
            <span className="text-[#0f172a] font-bold text-lg sm:text-[19px] tracking-wide uppercase">
              {tr("VYBE TRADE")}</span>
          </div>

          {/* Right: Language Globe + Bell Notification + Seller Profile */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Direct Workspace link button */}
            <button 
              onClick={() => onNavigateWorkspace ? onNavigateWorkspace('profile') : onNavigateHome()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 hover:bg-teal-100 text-[#083832] text-xs font-semibold border border-teal-200/80 transition-all cursor-pointer shadow-2xs"
              title={tr("Vào Workspace xem Profile Company")}
            >
              <Building2 className="w-3.5 h-3.5 text-teal-700" />
              <span>{tr("Vào Workspace Seller")}</span>
            </button>

            <LanguageSelect />
            {/* Seller Account Pill with Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {/* Dark Teal Circle Avatar with "VN" */}
                <div className="w-8 h-8 rounded-full bg-[#083832] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {tr("VN")}</div>
                
                {/* Truncated Company Name */}
                <span className="hidden sm:inline text-xs sm:text-[13px] font-semibold text-slate-800 max-w-[170px] truncate">
                  {formData.companyName}
                </span>

                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs text-left">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="font-bold text-slate-900">{formData.companyName}</p>
                    <p className="text-slate-500 text-[11px]">{tr("Tài khoản Nhà cung cấp (Seller)")}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      if (onNavigateWorkspace) onNavigateWorkspace('profile');
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-teal-50 text-[#083832] font-semibold cursor-pointer flex items-center gap-2"
                  >
                    <Building2 className="w-3.5 h-3.5 text-teal-700" />
                    <span>{tr("Xem Profile Company trong Workspace")}</span>
                  </button>
                  <button 
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      if (onNavigateWorkspace) onNavigateWorkspace('verification');
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700 cursor-pointer flex items-center gap-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span>{tr("Xem Xác minh L0 → L3")}</span>
                  </button>
                  <button 
                    onClick={onNavigateHome}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700 cursor-pointer"
                  >
                    {tr("Xem sàn thương mại B2B")}</button>
                  <button 
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-rose-50 text-rose-600 font-medium border-t border-slate-100 cursor-pointer"
                  >
                    {tr("Đăng xuất tài khoản")}</button>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* =========================================================================
          2. STEPPER PROGRESS BAR (4 STEPS)
         ========================================================================= */}
      <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pt-6 sm:pt-8 pb-4">
        <div className="flex items-center justify-center flex-wrap gap-3 sm:gap-6 lg:gap-8 select-none">
          
          {/* Step 1: Thông tin doanh nghiệp (Active in Screenshot) */}
          <div 
            onClick={() => setCurrentStep(1)}
            className="flex items-center gap-2.5 cursor-pointer pb-1 relative"
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              currentStep === 1 
                ? 'bg-[#083832] text-white' 
                : currentStep > 1 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-200 text-slate-600'
            }`}>
              {currentStep > 1 ? <Check className="w-4 h-4 stroke-[2.5]" /> : '1'}
            </div>
            <span className={`text-xs sm:text-[13px] font-bold ${
              currentStep === 1 ? 'text-slate-900 border-b-2 border-[#083832] pb-0.5' : 'text-slate-600'
            }`}>
              {tr("Thông tin doanh nghiệp")}</span>
          </div>

          {/* Arrow Divider */}
          <div className="hidden sm:flex text-slate-300">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>

          {/* Step 2: Sản phẩm & năng lực */}
          <div 
            onClick={() => setCurrentStep(2)}
            className="flex items-center gap-2.5 cursor-pointer pb-1"
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              currentStep === 2 
                ? 'bg-[#083832] text-white' 
                : currentStep > 2 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-100 border border-slate-200 text-slate-500'
            }`}>
              {currentStep > 2 ? <Check className="w-4 h-4 stroke-[2.5]" /> : '2'}
            </div>
            <span className={`text-xs sm:text-[13px] font-medium ${
              currentStep === 2 ? 'text-slate-900 font-bold border-b-2 border-[#083832] pb-0.5' : 'text-slate-500'
            }`}>
              {tr("Sản phẩm & năng lực")}</span>
          </div>

          {/* Arrow Divider */}
          <div className="hidden sm:flex text-slate-300">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>

          {/* Step 3: Giấy phép & chứng nhận */}
          <div 
            onClick={() => setCurrentStep(3)}
            className="flex items-center gap-2.5 cursor-pointer pb-1"
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              currentStep === 3 
                ? 'bg-[#083832] text-white' 
                : currentStep > 3 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-100 border border-slate-200 text-slate-500'
            }`}>
              {currentStep > 3 ? <Check className="w-4 h-4 stroke-[2.5]" /> : '3'}
            </div>
            <span className={`text-xs sm:text-[13px] font-medium ${
              currentStep === 3 ? 'text-slate-900 font-bold border-b-2 border-[#083832] pb-0.5' : 'text-slate-500'
            }`}>
              {tr("Giấy phép & chứng nhận")}</span>
          </div>

          {/* Arrow Divider */}
          <div className="hidden sm:flex text-slate-300">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>

          {/* Step 4: Xem lại & hoàn tất */}
          <div 
            onClick={() => setCurrentStep(4)}
            className="flex items-center gap-2.5 cursor-pointer pb-1"
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              currentStep === 4 
                ? 'bg-[#083832] text-white' 
                : 'bg-slate-100 border border-slate-200 text-slate-500'
            }`}>
              {tr("4")}</div>
            <span className={`text-xs sm:text-[13px] font-medium ${
              currentStep === 4 ? 'text-slate-900 font-bold border-b-2 border-[#083832] pb-0.5' : 'text-slate-500'
            }`}>
              {tr("Xem lại & hoàn tất")}</span>
          </div>

        </div>
      </div>

      {/* =========================================================================
          3. MAIN CONTENT (2 COLUMNS: BENEFITS & FORM CARD)
         ========================================================================= */}
      <main className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-6 sm:py-8 flex-1">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Heading & 4 Value Propositions */}
          <div className="lg:col-span-5 xl:col-span-5 relative">
            
            {/* Soft Continental Map graphic in background */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-64 h-64 opacity-15 pointer-events-none select-none">
              <svg viewBox="0 0 200 200" className="w-full h-full text-teal-800" fill="currentColor">
                <path d="M 40 40 Q 90 20 130 50 Q 150 80 120 110 Q 70 120 40 40 Z" opacity="0.4" />
                <path d="M 80 120 Q 120 100 160 140 Q 130 180 90 170 Q 70 140 80 120 Z" opacity="0.3" />
              </svg>
            </div>

            {/* Kicker Badge: COMPANY ONBOARDING */}
            <div className="inline-flex items-center gap-2 mb-4 select-none">
              <span className="w-4 h-4 rounded-full bg-[#0d9488]/15 flex items-center justify-center">
                <span className="w-2 h-0.5 rounded-full bg-[#0d9488]" />
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-[#0d9488] tracking-widest uppercase">
                {tr("COMPANY ONBOARDING")}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-slate-900 tracking-tight leading-[1.2] mb-3">
              {tr(onComplete ? 'Company Onboarding' : 'Cập nhật hồ sơ doanh nghiệp')}<br />
              {tr("và giới thiệu sản phẩm")}</h1>

            {/* Subheadline / Description */}
            <p className="text-slate-600 text-sm sm:text-[15px] leading-relaxed max-w-md mb-8 sm:mb-10 font-normal">
              {tr("Hoàn thiện hồ sơ của bạn để được xác minh")}<br className="hidden sm:inline" />
              {tr(' ')}{tr("và kết nối với các buyer quốc tế phù hợp.")}</p>

            {/* 4 Value Proposition Benefit Rows */}
            <div className="space-y-5 select-none">
              
              {/* Benefit 1: Hiển thị với buyer toàn cầu */}
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center shrink-0 text-slate-800">
                  <User className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {tr("Hiển thị với buyer toàn cầu")}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-normal">
                    {tr("Tiếp cận đúng đối tác, đúng nhu cầu")}</p>
                </div>
              </div>

              {/* Benefit 2: Tăng mức độ tin cậy */}
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center shrink-0 text-slate-800">
                  <ShieldCheck className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {tr("Tăng mức độ tin cậy")}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-normal">
                    {tr("Được xác minh theo tiêu chuẩn quốc tế")}</p>
                </div>
              </div>

              {/* Benefit 3: Quản lý sản phẩm chuyên nghiệp */}
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center shrink-0 text-slate-800">
                  <Layers className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {tr("Quản lý sản phẩm chuyên nghiệp")}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-normal">
                    {tr("Giới thiệu năng lực và chứng nhận rõ ràng")}</p>
                </div>
              </div>

              {/* Benefit 4: Mở rộng cơ hội xuất khẩu */}
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center shrink-0 text-slate-800">
                  <TrendingUp className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {tr("Mở rộng cơ hội xuất khẩu")}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-normal">
                    {tr("Tham gia vào các cơ hội RFQ chất lượng")}</p>
                </div>
              </div>

            </div>

          </div>

          {/* Right Column: Form Card ("Thông tin doanh nghiệp") */}
          <div className="lg:col-span-7 xl:col-span-7">
            <div className="bg-white rounded-3xl p-6 sm:p-9 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              
              {/* Form Title & Subtitle */}
              <div className="mb-6">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {tr(currentStep === 1 && "Thông tin doanh nghiệp")}
                    {tr(currentStep === 2 && "Sản phẩm & năng lực sản xuất")}
                    {tr(currentStep === 3 && "Tải lên giấy phép & chứng nhận")}
                    {tr(currentStep === 4 && "Xem lại & hoàn tất hồ sơ")}
                  </h2>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/60">
                    {tr("Bước ")}{tr(currentStep)} {tr(" / 4")}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-normal">
                  {tr(currentStep === 1 && "Cung cấp thông tin cơ bản về doanh nghiệp của bạn.")}
                  {tr(currentStep === 2 && "Khai báo danh mục sản phẩm, năng lực cung ứng và quy mô xuất khẩu.")}
                  {tr(currentStep === 3 && "Tải lên tài liệu pháp lý và chứng nhận tiêu chuẩn để nâng cấp xác minh lên L1, L2 hoặc L3.")}
                  {tr(currentStep === 4 && "Kiểm tra lại toàn bộ dữ liệu trước khi gửi hồ sơ vào hàng đợi thẩm định của VYBE Trade.")}
                </p>
              </div>

              {/* Step 1 Form Body */}
              {currentStep === 1 && (
                <form onSubmit={handleNextStep} className="space-y-4 sm:space-y-5">
                  
                  {/* Field 1: Tên công ty * */}
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                      {tr("Tên công ty *")}</label>
                    <input 
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder={tr("Ví dụ: Công ty TNHH Nông sản Việt Trí")}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                    />
                  </div>

                  {/* Field 2: Mã số thuế (MST) * */}
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                      {tr("Mã số thuế (MST) *")}</label>
                    <input 
                      type="text"
                      required
                      value={formData.taxCode}
                      onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                      placeholder={tr("Nhập mã số thuế")}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                    />
                  </div>

                  {/* Field 3 & 4: Loại hình doanh nghiệp * & Năm thành lập * (2 Cols) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Mô hình kinh doanh * */}
                    <div>
                      <label htmlFor="company-business-model" className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                        {tr("Mô hình kinh doanh *")}</label>
                      <div className="relative">
                        <select 
                          id="company-business-model"
                          required
                          value={formData.businessType}
                          onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] appearance-none cursor-pointer pr-10"
                        >
                          <option value="">{tr("Chọn mô hình")}</option>
                          {BUSINESS_MODELS.map((model) => <option key={model.code} value={model.code}>{tr(model.label)}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Năm thành lập * */}
                    <div>
                      <label className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                        {tr("Năm thành lập *")}</label>
                      <div className="relative">
                        <input 
                          type="number"
                          required
                          min="1950"
                          max="2026"
                          value={formData.establishedYear}
                          onChange={(e) => setFormData({ ...formData, establishedYear: e.target.value })}
                          placeholder={tr("Chọn năm")}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] pr-10"
                        />
                        <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                  </div>

                  {/* Field 5: Địa chỉ trụ sở chính * */}
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                      {tr("Địa chỉ trụ sở chính *")}</label>
                    <input 
                      type="text"
                      required
                      value={formData.headquartersAddress}
                      onChange={(e) => setFormData({ ...formData, headquartersAddress: e.target.value })}
                      placeholder={tr("Nhập địa chỉ đầy đủ")}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                    />
                  </div>

                  {/* Field 6 & 7: Website & Email liên hệ * (2 Cols) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Website */}
                    <div>
                      <label className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                        {tr("Website")}</label>
                      <input 
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder={tr("https://example.com")}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                      />
                    </div>

                    {/* Email liên hệ * */}
                    <div>
                      <label className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                        {tr("Email liên hệ *")}</label>
                      <input 
                        type="email"
                        required
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                        placeholder={tr("contact@example.com")}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                      />
                    </div>

                  </div>

                  {/* B1: ngành hàng, ngôn ngữ nhân viên, mô tả song ngữ — trường có cấu trúc để lọc/ghép */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="company-industry" className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                        {tr("Ngành hàng")}</label>
                      <select
                        id="company-industry"
                        value={formData.industrySector}
                        onChange={(e) => setFormData({ ...formData, industrySector: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                      >
                        <option value="">{tr("Chọn ngành hàng")}</option>
                        {INDUSTRIES.map((industry) => <option key={industry.code} value={industry.code}>{tr(industry.label)}</option>)}
                      </select>
                    </div>
                    <fieldset>
                      <legend className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                        {tr("Ngôn ngữ nhân viên sử dụng")}</legend>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                        {STAFF_LANGUAGES.map((lang) => (
                          <label key={lang.code} className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={staffLanguages.includes(lang.code)}
                              onChange={() => toggleStaffLanguage(lang.code)}
                              className="accent-[#083832]"
                            />
                            {tr(lang.label)}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="company-description-vi" className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                        {tr("Mô tả doanh nghiệp (tiếng Việt)")}</label>
                      <textarea
                        id="company-description-vi"
                        rows={4}
                        maxLength={5000}
                        value={formData.descriptionVi}
                        onChange={(e) => setFormData({ ...formData, descriptionVi: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                      />
                    </div>
                    <div>
                      <label htmlFor="company-description-en" className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                        {tr("Mô tả doanh nghiệp (tiếng Anh)")}</label>
                      <textarea
                        id="company-description-en"
                        rows={4}
                        maxLength={5000}
                        value={formData.descriptionEn}
                        onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                      />
                    </div>
                  </div>

                  <fieldset>
                    <legend className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                      {tr("Thị trường xuất khẩu đã phục vụ")}</legend>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                      {EXPORT_MARKETS.map((market) => (
                        <label key={market.code} className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={exportMarkets.includes(market.code)}
                            onChange={() => toggleMarket(market.code)}
                            className="accent-[#083832]"
                          />
                          {tr(market.label)}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {submitError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{tr(submitError)}</p>}
                  {/* Submit Button Row (Aligned to Bottom Right) */}
                  <div className="pt-3 flex justify-end">
                    <button 
                      type="submit"
                      className="px-7 py-2.5 rounded-xl bg-[#083832] hover:bg-[#062924] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <span>{tr("Tiếp tục")}</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>

                </form>
              )}

              {/* Step 2 Form Body (Sản phẩm xuất khẩu - Matching UI Screenshot) */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  
                  {/* Top Header Row: Title, Subtitle, and + Thêm sản phẩm Button */}
                  <div className="flex items-start justify-between flex-wrap gap-3 pb-1 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                        {tr("Sản phẩm xuất khẩu")}</h3>
                      <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5 font-normal">
                        {tr("Mỗi sản phẩm cần có mã HS. Buyer tìm thấy bạn qua mã HS, giá và MOQ.")}</p>
                    </div>

                  </div>

                  <ProductsEditor
                    products={products}
                    onChange={(next) => { setProducts(next); setProductError(''); }}
                  />
                  {productError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{tr(productError)}</p>}

                  {/* Navigation Buttons: Quay lại & Tiếp tục */}
                  <div className="pt-4 flex justify-between border-t border-slate-100">
                    <button 
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {tr("Quay lại")}</button>
                    <button 
                      type="button"
                      onClick={goToLicenses}
                      className="px-7 py-2.5 rounded-xl bg-[#083832] hover:bg-[#062924] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <span>{tr("Tiếp tục (Tải lên giấy phép)")}</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>

                </div>
              )}

              {/* Step 3: bằng chứng (C6) — lưu lên server, không còn dữ liệu mẫu */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <EvidenceManager onCountChange={setEvidenceCount} />
                  <div className="pt-4 flex justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {tr("Quay lại")}</button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="px-7 py-2.5 rounded-xl bg-[#083832] hover:bg-[#062924] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <span>{tr("Tiếp tục (Xem lại hồ sơ)")}</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4 Form Body (Xem lại & hoàn tất) */}
              {currentStep === 4 && (
                <div className="space-y-5 text-left">
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      {tr("Kiểm tra lại hồ sơ trước khi hoàn tất")}</h4>
                    <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                      {tr("Hoàn thiện hồ sơ không đồng nghĩa đã xác minh: việc xác minh do quản trị viên thực hiện.")}</p>
                  </div>

                  {/* Summary Review Cards */}
                  <div className="space-y-3 text-xs">
                    
                    {/* Section 1 Summary */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-[13px]">{tr("1. Doanh nghiệp")}</span>
                        <button onClick={() => setCurrentStep(1)} className="text-[11px] text-teal-700 font-semibold hover:underline">{tr("Sửa")}</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div><span className="text-slate-500">{tr("Tên:")}</span> <strong className="text-slate-900">{formData.companyName}</strong></div>
                        <div><span className="text-slate-500">{tr("MST:")}</span> <strong className="text-slate-900">{tr(formData.taxCode)}</strong></div>
                        <div><span className="text-slate-500">{tr("Năm thành lập:")}</span> <strong className="text-slate-900">{tr(formData.establishedYear)}</strong></div>
                        <div><span className="text-slate-500">{tr("Mô hình:")}</span> <strong className="text-slate-900">{tr(BUSINESS_MODELS.find((m) => m.code === formData.businessType)?.label ?? '')}</strong></div>
                      </div>
                    </div>

                    {/* Section 2 Summary */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-[13px]">
                          {tr("2. Sản phẩm & Năng lực (")}{tr(products.length)} {tr(" sản phẩm)")}</span>
                        <button 
                          onClick={() => setCurrentStep(2)} 
                          className="text-[11px] text-teal-700 font-semibold hover:underline cursor-pointer"
                        >
                          {tr("Sửa")}</button>
                      </div>
                      <div className="space-y-2 text-[11px] text-slate-700">
                        {products.map(p => (
                          <div key={p.key} className="flex items-center justify-between flex-wrap gap-1 p-2 rounded-xl bg-white border border-slate-200/60">
                            <div className="flex items-center gap-2">
                              {p.images[0] && <img src={p.images[0].url} alt={p.name} className="w-8 h-8 rounded-lg object-cover border border-slate-200" />}
                              <div>
                                <div className="font-bold text-slate-900">{p.name}</div>
                                <div className="text-[10px] text-slate-500">{p.hs ? `${p.hs.formatted} — ${language === 'en' ? p.hs.name_en : p.hs.name_vi}` : ''}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              {(p.priceMin || p.priceMax) && <span className="font-semibold text-slate-800">{[p.priceMin, p.priceMax].filter(Boolean).join(' – ')} {p.currency}</span>}
                              {p.moq && <span className="text-[10px] text-slate-500 block">{tr("MOQ: ")}{p.moq}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 3 Summary */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-[13px]">{tr("3. Bằng chứng đã nộp")}</span>
                        <button onClick={() => setCurrentStep(3)} className="text-[11px] text-teal-700 font-semibold hover:underline">{tr("Sửa")}</button>
                      </div>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="text-slate-800">
                          {evidenceCount > 0
                            ? `${evidenceCount} ${tr("bằng chứng đã nộp")}`
                            : tr("Chưa có bằng chứng — bạn có thể bổ sung sau.")}
                        </div>
                      </div>
                    </div>

                  </div>

                  {submitError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{tr(submitError)}</p>}
                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                    <button 
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      {tr("Quay lại Bước 3")}</button>
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <button 
                        type="button"
                        onClick={() => onNavigateWorkspace ? onNavigateWorkspace('profile') : setSubmittedSuccess(true)}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-teal-600 text-teal-800 bg-teal-50 hover:bg-teal-100 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Building2 className="w-3.5 h-3.5 text-teal-700" />
                        <span>{tr("Xem trước Workspace")}</span>
                      </button>
                      <button 
                        type="button"
                        onClick={finish}
                        className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#083832] hover:bg-[#062924] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                      >
                        <span>{tr("Hoàn tất & Gửi hồ sơ")}</span>
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </main>

      {/* Document Preview Modal */}

      {/* Success Modal */}
      {submittedSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-xs">
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">{tr("Hồ sơ đã được lưu.")}</h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed max-w-md mx-auto">
              {tr("Hồ sơ doanh nghiệp, sản phẩm xuất khẩu và bằng chứng đã nộp đã được ghi nhận. Quản trị viên sẽ xem xét bằng chứng của bạn.")}</p>

            <div className="space-y-2.5">
              <button 
                onClick={() => {
                  setSubmittedSuccess(false);
                  if (onNavigateWorkspace) {
                    onNavigateWorkspace('profile');
                  } else {
                    onNavigateHome();
                  }
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#083832] hover:bg-[#062924] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-95"
              >
                <Building2 className="w-4 h-4 text-teal-300" />
                <span>{tr("Vào Workspace & Xem Profile Company")}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.2]" />
              </button>

              <button 
                onClick={() => {
                  setSubmittedSuccess(false);
                  if (onNavigateWorkspace) {
                    onNavigateWorkspace('verification');
                  } else {
                    onNavigateHome();
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-teal-600 text-teal-800 bg-teal-50/60 hover:bg-teal-100/70 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>{tr("Xem Tiến trình Xác minh Cấp độ (L0 → L3)")}</span>
              </button>

              <div className="pt-2 flex justify-center gap-3">
                <button 
                  onClick={() => {
                    setSubmittedSuccess(false);
                    onNavigateHome();
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium"
                >
                  {tr("Về Sàn thương mại B2B")}</button>
                <span className="text-slate-300">{tr("•")}</span>
                <button 
                  onClick={() => setSubmittedSuccess(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium"
                >
                  {tr("Ở lại trang hồ sơ")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
