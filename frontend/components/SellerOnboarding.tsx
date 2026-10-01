'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrandMark } from './BrandMark';
import React, { useEffect, useState } from 'react';
import type { DemoUser } from '../lib/demoAuth';
import {
  BUSINESS_MODELS,
  COMPANY_SIZES,
  COUNTRIES,
  EXPORT_MARKETS,
  FACILITY_CODE_TYPES,
  INDUSTRIES,
  OFFERING_TYPES,
  STAFF_LANGUAGES,
  authorityDisplay,
  logoFileError,
  offersProducts,
  offersServices,
  uploadCompanyLogo,
} from '../lib/companyApi';
import { UNITS, draftToBody, type ProductDraft } from '../lib/productsApi';
import { serviceDraftToBody, type ServiceDraft } from '../lib/servicesApi';
import ProductsEditor from './ProductsEditor';
import ServicesEditor from './ServicesEditor';
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
  onComplete?: (profile: Record<string, string>, products: ProductDraft[], services: ServiceDraft[]) => void | Promise<void>;
  /** Lưu nháp công ty lên server khi rời bước 1 (A2). Lỗi → ở lại bước 1. */
  onSaveCompany?: (profile: Record<string, string>) => Promise<void>;
  /** Lưu nháp sản phẩm lên server khi rời bước 2 (A2). Lỗi → ở lại bước 2. */
  onSaveProducts?: (products: ProductDraft[]) => Promise<void>;
  /** Lưu nháp dịch vụ (nhà cung cấp dịch vụ, U2) khi rời bước 2. */
  onSaveServices?: (services: ServiceDraft[]) => Promise<void>;
  /** Dịch vụ đã lưu trên server, đổi sang bản nháp. */
  initialServices?: ServiceDraft[];
  /** Giá trị ban đầu của bước 1 lấy từ server (trang sửa hồ sơ). */
  initialCompany?: Record<string, string>;
  /** Sản phẩm đã lưu trên server (B5), đổi sang bản nháp. */
  initialProducts?: ProductDraft[];
  onLogout: () => void;
  onNavigateHome: () => void;
  onNavigateWorkspace?: (tab?: 'profile' | 'verification') => void;
}

export default function SellerOnboarding({ account, initialStep = 2, initialCompany, initialProducts, initialServices, onComplete, onSaveCompany, onSaveProducts, onSaveServices, onLogout, onNavigateHome, onNavigateWorkspace }: SellerOnboardingProps) {
  const { tr, language } = useLanguage();
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [submitError, setSubmitError] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Step 2: sản phẩm (B5) — bản nháp trong form, lưu lên server khi hoàn tất.
  const [products, setProducts] = useState<ProductDraft[]>(initialProducts ?? []);
  const [services, setServices] = useState<ServiceDraft[]>(initialServices ?? []);
  const [productError, setProductError] = useState('');
  const [step2Tab, setStep2Tab] = useState<'products' | 'capacity'>('products');

  // Form State for Step 1: Thông tin doanh nghiệp
  // Hồ sơ lưu lên server (B1) — không điền sẵn dữ liệu demo.
  const [formData, setFormData] = useState({
    companyName: account?.company || '',
    taxCode: '',
    businessType: '',
    establishedYear: '',
    headquartersAddress: '',
    city: '',
    locationPublic: 'false',
    website: '',
    contactEmail: account?.email || '',
    industrySector: '',
    languages: 'vi',
    descriptionVi: '',
    descriptionEn: '',
    markets: '',
    logoKey: '',
    // U2: sản phẩm / dịch vụ, người đại diện, cơ quan cấp, năng lực — chỉ hỏi vừa đủ.
    offeringType: 'products',
    country: 'VN',
    phone: '',
    legalRepName: '',
    legalRepTitle: '',
    issuingAuthority: '',
    industryOther: '',
    factoryAddress: '',
    capacityValue: '',
    capacityUnit: 'tonne',
    capacityPeriod: 'year',
    staffSize: '',
    mainCustomers: '',
    growingAreaCodes: '',
    packingCodes: '',
    establishmentCodes: '',
    ...initialCompany
  });
  const sellsProducts = offersProducts(formData.offeringType);
  const sellsServices = offersServices(formData.offeringType);
  const authority = authorityDisplay(formData.issuingAuthority);

  // Logo (bước 1): công ty chưa có trên server khi vừa chọn file nên giữ file ở đây, tải lên sau khi lưu bước 1.
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoError, setLogoError] = useState('');
  useEffect(() => {
    if (!logoFile) { setLogoPreview(''); return; }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);
  const pickLogo = (file: File | undefined) => {
    if (!file) return;
    const problem = logoFileError(file);
    setLogoError(problem ?? '');
    if (!problem) setLogoFile(file);
  };
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

  // Cam kết pháp lý ở bước xem lại: phải tự tick, không điền sẵn.
  const [agreeCommitment, setAgreeCommitment] = useState(false);

  const goToLicenses = async () => {
    if (sellsProducts && products.length === 0) { setProductError('Vui lòng thêm ít nhất một sản phẩm.'); return; }
    if (sellsServices && services.length === 0) { setProductError('Vui lòng thêm ít nhất một dịch vụ.'); return; }
    try {
      if (sellsProducts) products.forEach((p) => draftToBody(p));
      if (sellsServices) services.forEach((s) => serviceDraftToBody(s));
    } catch (cause) {
      setProductError(cause instanceof Error ? cause.message : 'Sản phẩm chưa hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }
    setProductError('');
    try {
      // Năng lực, thị trường, mã cơ sở nằm ở bước 2 nhưng thuộc hồ sơ công ty: lưu cùng lúc.
      await onSaveCompany?.(buildProfile());
      if (sellsProducts) await onSaveProducts?.(products);
      if (sellsServices) await onSaveServices?.(services);
    } catch (cause) {
      setProductError(cause instanceof Error ? cause.message : 'Không thể lưu sản phẩm. Vui lòng thử lại.');
      return;
    }
    setCurrentStep(3);
  };

  const buildProfile = (): Record<string, string> => ({ ...formData,
    interest: [...new Set(products.map((p) => p.hs?.formatted ?? ''))].filter(Boolean).join(', '),
    products: JSON.stringify(products.map((p) => ({ name: p.name }))), agreeCommitment: String(agreeCommitment) });

  const finish = async () => {
    setSubmitError('');
    if (!onComplete) { setSubmittedSuccess(true); return; }
    try {
      let profile = buildProfile();
      if (logoFile && onSaveCompany) {
        await onSaveCompany(profile);
        const logoKey = await uploadCompanyLogo(logoFile);
        setFormData((prev) => ({ ...prev, logoKey }));
        setLogoFile(null);
        profile = { ...profile, logoKey };
      }
      await onComplete(profile, sellsProducts ? products : [], sellsServices ? services : []);
    } catch (cause) { setSubmitError(cause instanceof Error ? cause.message : 'Không thể lưu hồ sơ. Vui lòng thử lại.'); }
  };

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === 1 && onSaveCompany) {
      setSubmitError('');
      try {
        await onSaveCompany(buildProfile());
        if (logoFile) {
          const logoKey = await uploadCompanyLogo(logoFile);
          setFormData((prev) => ({ ...prev, logoKey }));
          setLogoFile(null);
          await onSaveCompany({ ...buildProfile(), logoKey });
        }
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
              <BrandMark className="w-7 h-7" />
            </div>
            <span className="text-[#0f172a] font-bold text-lg sm:text-[19px] tracking-wide uppercase">
              {tr("VYBE TRADE")}</span>
          </div>

          {/* Right: Language Globe + Bell Notification + Seller Profile */}
          <div className="flex flex-wrap items-center gap-3">
            
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
                    <span>{tr("Xem tiến trình xác minh")}</span>
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
              {tr("Sản phẩm, dịch vụ & năng lực")}</span>
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
                    {tr(currentStep === 2 && "Sản phẩm, dịch vụ & năng lực")}
                    {tr(currentStep === 3 && "Tải lên giấy phép & chứng nhận")}
                    {tr(currentStep === 4 && "Xem lại & hoàn tất hồ sơ")}
                  </h2>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/60">
                    {tr("Bước ")}{tr(currentStep)} {tr(" / 4")}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-normal">
                  {tr(currentStep === 1 && "Cung cấp thông tin cơ bản về doanh nghiệp của bạn.")}
                  {tr(currentStep === 2 && "Khai báo sản phẩm hoặc dịch vụ bạn cung cấp và năng lực đáp ứng đơn hàng.")}
                  {tr(currentStep === 3 && "Tải lên giấy phép và chứng nhận để quản trị viên xác minh doanh nghiệp.")}
                  {tr(currentStep === 4 && "Kiểm tra lại toàn bộ dữ liệu trước khi gửi hồ sơ vào hàng đợi thẩm định của VYBE Trade.")}
                </p>
              </div>

              {/* Step 1 Form Body */}
              {currentStep === 1 && (
                <form onSubmit={handleNextStep} className="space-y-4 sm:space-y-5">

                  {/* U2: hỏi trước bước 2 — bán sản phẩm hay cung cấp dịch vụ */}
                  <fieldset>
                    <legend className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">{tr("Doanh nghiệp của bạn cung cấp *")}</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {OFFERING_TYPES.map((option) => (
                        <label
                          key={option.code}
                          className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer ${formData.offeringType === option.code ? 'border-[#083832] bg-teal-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                        >
                          <input
                            type="radio"
                            name="offering-type"
                            value={option.code}
                            checked={formData.offeringType === option.code}
                            onChange={() => setFormData({ ...formData, offeringType: option.code })}
                            className="mt-0.5 accent-[#083832]"
                          />
                          <span>
                            <span className="block text-xs sm:text-sm font-bold text-slate-900">{tr(option.label)}</span>
                            <span className="block text-[11px] text-slate-500 mt-0.5">{tr(option.hint)}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {/* Logo công ty */}
                  <div>
                    <span className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">{tr("Logo công ty")}</span>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl border border-dashed border-slate-300 bg-white overflow-hidden flex items-center justify-center text-slate-400 shrink-0">
                        {logoPreview
                          ? <img src={logoPreview} alt={tr("Logo công ty")} className="w-full h-full object-contain" />
                          : formData.logoKey ? <CheckCircle2 className="w-7 h-7 text-emerald-600" /> : <ImageIcon className="w-7 h-7" />}
                      </div>
                      <div className="space-y-1.5">
                        <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                          <UploadCloud className="w-4 h-4" />
                          <span>{logoPreview || formData.logoKey ? tr("Đổi logo") : tr("Thêm logo")}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="sr-only"
                            onChange={(e) => { pickLogo(e.target.files?.[0]); e.target.value = ''; }}
                          />
                        </label>
                        {formData.logoKey && !logoPreview && <p className="text-[11px] text-emerald-700">{tr("Logo đã được tải lên.")}</p>}
                        <p className="text-[11px] text-slate-600">{tr("PNG, JPEG hoặc WebP, tối đa 2MB.")}</p>
                        {logoError && <p role="alert" className="text-[11px] text-rose-700">{tr(logoError)}</p>}
                      </div>
                    </div>
                  </div>

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
                        {tr(sellsProducts ? "Mô hình kinh doanh *" : "Mô hình kinh doanh")}</label>
                      <div className="relative">
                        <select
                          id="company-business-model"
                          required={sellsProducts}
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
                        {tr("Năm thành lập")}</label>
                      <div className="relative">
                        <input
                          type="number"
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

                  {/* U10: tỉnh/thành hiển thị trên hồ sơ công khai và bản đồ (mặc định không lộ địa chỉ chi tiết) */}
                  <div>
                    <label htmlFor="company-city" className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">{tr("Tỉnh / thành phố")}</label>
                    <input
                      id="company-city"
                      type="text"
                      maxLength={120}
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder={tr("Ví dụ: Cần Thơ")}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">{tr("Hồ sơ công khai và bản đồ chỉ hiển thị ở mức tỉnh/thành phố.")}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="company-country" className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">{tr("Quốc gia *")}</label>
                      <select
                        id="company-country"
                        required
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                      >
                        {COUNTRIES.slice().sort((a, b) => (a.code === 'VN' ? -1 : b.code === 'VN' ? 1 : a.name.localeCompare(b.name))).map((c) => (
                          <option key={c.code} value={c.code}>{tr(c.name)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="company-phone" className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">{tr("Số điện thoại")}</label>
                      <input
                        id="company-phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder={tr("Ví dụ: +84 28 3829 9842")}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="company-legal-rep" className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">{tr("Người đại diện pháp luật")}</label>
                      <input
                        id="company-legal-rep"
                        value={formData.legalRepName}
                        maxLength={255}
                        onChange={(e) => setFormData({ ...formData, legalRepName: e.target.value })}
                        placeholder={tr("Họ và tên như trên giấy ĐKKD")}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                      />
                    </div>
                    <div>
                      <label htmlFor="company-legal-rep-title" className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">{tr("Chức vụ")}</label>
                      <input
                        id="company-legal-rep-title"
                        value={formData.legalRepTitle}
                        maxLength={120}
                        onChange={(e) => setFormData({ ...formData, legalRepTitle: e.target.value })}
                        placeholder={tr("Ví dụ: Giám đốc")}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="company-issuing-authority" className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">{tr("Cơ quan cấp đăng ký kinh doanh")}</label>
                    <input
                      id="company-issuing-authority"
                      value={formData.issuingAuthority}
                      maxLength={255}
                      onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
                      placeholder={tr("Ghi đúng như trên giấy đăng ký kinh doanh")}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                    />
                    {authority.renamed && (
                      <p className="mt-1 text-[11px] text-teal-800">
                        {tr("Từ 01/03/2025, Sở Kế hoạch và Đầu tư đã hợp nhất vào Sở Tài chính. Hồ sơ công khai sẽ hiển thị:")} <strong>{authority.text}</strong>
                      </p>
                    )}
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
                      {formData.industrySector === 'other' && (
                        <input
                          aria-label={tr("Tên ngành hàng khác")}
                          value={formData.industryOther}
                          maxLength={120}
                          onChange={(e) => setFormData({ ...formData, industryOther: e.target.value })}
                          placeholder={tr("Ví dụ: Dược liệu")}
                          className="mt-2 w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                        />
                      )}
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

              {/* Bước 2: sản phẩm, dịch vụ và năng lực (U2) */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  
                  {/* Top Header Row: Title, Subtitle, and + Thêm sản phẩm Button */}
                  {sellsProducts && (
                    <>
                      <div role="tablist" aria-label={tr("Sản phẩm và năng lực")} className="flex gap-1 border-b border-slate-200">
                        {([
                          ['products', tr("Sản phẩm cung cấp")],
                          ['capacity', tr("Năng lực đáp ứng")],
                        ] as const).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            role="tab"
                            id={`step2-tab-${key}`}
                            aria-selected={step2Tab === key}
                            aria-controls={`step2-panel-${key}`}
                            onClick={() => setStep2Tab(key)}
                            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold -mb-px border-b-2 transition-colors cursor-pointer ${
                              step2Tab === key
                                ? 'border-[#083832] text-[#083832]'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div
                        role="tabpanel"
                        id="step2-panel-products"
                        aria-labelledby="step2-tab-products"
                        hidden={step2Tab !== 'products'}
                        className="space-y-5"
                      >
                        <p className="text-xs sm:text-[13px] text-slate-500 font-normal">
                          {tr("Gõ tên sản phẩm, hệ thống gợi ý mã HS. Buyer tìm thấy bạn qua tên sản phẩm, giá và MOQ.")}</p>
                        <ProductsEditor
                          products={products}
                          onChange={(next) => { setProducts(next); setProductError(''); }}
                        />
                      </div>

                      <section
                        role="tabpanel"
                        id="step2-panel-capacity"
                        aria-labelledby="step2-tab-capacity"
                        hidden={step2Tab !== 'capacity'}
                        className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 space-y-4"
                      >
                        <div>
                          <h3 id="capacity-heading" className="text-sm sm:text-base font-bold text-slate-900">{tr("Năng lực đáp ứng")}</h3>
                          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">{tr("Không bắt buộc, nhưng buyer cần biết bạn đáp ứng được đơn lớn đến đâu.")}</p>
                        </div>
                        <div>
                          <label htmlFor="factory-address" className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">{tr("Địa chỉ nhà máy / kho")}</label>
                          <input
                            id="factory-address"
                            value={formData.factoryAddress}
                            maxLength={500}
                            onChange={(e) => setFormData({ ...formData, factoryAddress: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                          />
                          <label className="mt-2 flex items-start gap-2 text-[11px] sm:text-xs text-slate-600">
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={formData.locationPublic === 'true'}
                              onChange={(e) => setFormData({ ...formData, locationPublic: String(e.target.checked) })}
                            />
                            {tr("Cho phép hiển thị địa chỉ nhà máy chính xác trên bản đồ hồ sơ công khai")}
                          </label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-2">
                            <label htmlFor="capacity-value" className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">{tr("Sản lượng có thể cung cấp")}</label>
                            <input
                              id="capacity-value"
                              inputMode="decimal"
                              value={formData.capacityValue}
                              onChange={(e) => setFormData({ ...formData, capacityValue: e.target.value })}
                              placeholder={tr("Ví dụ: 1500")}
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                            />
                          </div>
                          <div>
                            <label htmlFor="capacity-unit" className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">{tr("Đơn vị")}</label>
                            <select
                              id="capacity-unit"
                              value={formData.capacityUnit}
                              onChange={(e) => setFormData({ ...formData, capacityUnit: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                            >
                              {UNITS.map((u) => <option key={u.code} value={u.code}>{tr(u.label)}</option>)}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="capacity-period" className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">{tr("Mỗi")}</label>
                            <select
                              id="capacity-period"
                              value={formData.capacityPeriod}
                              onChange={(e) => setFormData({ ...formData, capacityPeriod: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                            >
                              <option value="year">{tr("năm")}</option>
                              <option value="month">{tr("tháng")}</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label htmlFor="staff-size" className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">{tr("Quy mô nhân sự")}</label>
                          <select
                            id="staff-size"
                            value={formData.staffSize}
                            onChange={(e) => setFormData({ ...formData, staffSize: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                          >
                            <option value="">{tr("Chọn quy mô")}</option>
                            {COMPANY_SIZES.map((size) => <option key={size.code} value={size.code}>{tr(size.label)}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {FACILITY_CODE_TYPES.map((type) => (
                            <div key={type.code}>
                              <label htmlFor={`facility-${type.code}`} className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">{tr(type.label)}</label>
                              <input
                                id={`facility-${type.code}`}
                                value={formData[type.field]}
                                onChange={(e) => setFormData({ ...formData, [type.field]: e.target.value })}
                                placeholder={tr("Nhiều mã cách nhau bằng dấu phẩy")}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                              />
                            </div>
                          ))}
                        </div>
                        <fieldset>
                          <legend className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">{tr("Thị trường đã xuất khẩu")}</legend>
                          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 max-h-40 overflow-y-auto">
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
                        <div>
                          <label htmlFor="main-customers" className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">{tr("Khách hàng chính (không bắt buộc)")}</label>
                          <textarea
                            id="main-customers"
                            rows={2}
                            maxLength={2000}
                            value={formData.mainCustomers}
                            onChange={(e) => setFormData({ ...formData, mainCustomers: e.target.value })}
                            placeholder={tr("Ví dụ: nhà nhập khẩu tại Hamburg (từ 2021). Tên khách hàng giúp buyer tin hồ sơ hơn.")}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] transition-colors"
                          />
                        </div>
                      </section>
                    </>
                  )}

                  {sellsServices && (
                    <section aria-labelledby="services-heading" className="space-y-3">
                      <div className="pb-1 border-b border-slate-100">
                        <h3 id="services-heading" className="text-lg sm:text-xl font-bold text-slate-900">{tr("Dịch vụ cung cấp")}</h3>
                        <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5">{tr("Giấy phép hành nghề (nếu có) nộp ở bước tiếp theo để được xác minh.")}</p>
                      </div>
                      <ServicesEditor services={services} onChange={(next) => { setServices(next); setProductError(''); }} />
                    </section>
                  )}
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
                          {tr(`2. Sản phẩm & dịch vụ (${products.length} sản phẩm, ${services.length} dịch vụ)`)}</span>
                        <button 
                          onClick={() => setCurrentStep(2)} 
                          className="text-[11px] text-teal-700 font-semibold hover:underline cursor-pointer"
                        >
                          {tr("Sửa")}</button>
                      </div>
                      <div className="space-y-2 text-[11px] text-slate-700">
                        {services.map((s, index) => (
                          <div key={s.id ?? `service-${index}`} className="p-2 rounded-xl bg-white border border-slate-200/60 font-bold text-slate-900">{s.title}</div>
                        ))}
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

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreeCommitment}
                      onChange={(e) => setAgreeCommitment(e.target.checked)}
                      className="mt-0.5 rounded text-teal-800 focus:ring-teal-700 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 leading-snug">
                      {tr("Tôi cam kết các chứng chỉ, giấy phép tải lên là tài liệu thật, hợp pháp và doanh nghiệp hoàn toàn chịu trách nhiệm trước pháp luật về tính chính xác của các hồ sơ này.")}</span>
                  </label>

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
                        disabled={!agreeCommitment}
                        onClick={finish}
                        className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#083832] hover:bg-[#062924] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
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
              {tr("Hồ sơ doanh nghiệp, sản phẩm, dịch vụ và bằng chứng đã nộp đã được ghi nhận. Quản trị viên sẽ xem xét bằng chứng của bạn.")}</p>

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
                <span>{tr("Xem tiến trình xác minh")}</span>
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
