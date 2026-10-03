'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrandMark } from './BrandMark';
import React, { useEffect, useState } from 'react';
import { getMyCompany, type CompanyOut } from '../lib/companyApi';
import NotificationBell from './NotificationBell';
import VerificationStatusCard, { STATUS_BADGE } from './VerificationStatusCard';
import type { DemoUser } from '../lib/demoAuth';
import { draftFromProduct, emptyDraft, formatMoq, formatPackaging, formatPrice, formatTiers, getMyProducts, type ProductDraft, type ProductOut } from '../lib/productsApi';
import ProductDialog from './ProductDialog';
import TariffPanel from './TariffPanel';
import CompanyProfileView from './CompanyProfileView';
import LanguageSelect from './LanguageSelect';
import {
  Building2,
  ShieldCheck,
  Bell,
  ChevronDown,
  ChevronRight,
  Award,
  ExternalLink,
  Edit3,
  Eye,
  MessageSquare,
  CreditCard,
  LifeBuoy,
} from 'lucide-react';
import EvidenceManager from './EvidenceManager';
import CompanyEvidenceChecklist from './CompanyEvidenceChecklist';
import VerificationPanel from './VerificationPanel';
import { useLanguage } from "../context/LanguageContext";
import RfqInbox from './RfqInbox';
import NotificationsPanel from './NotificationsPanel';
import Conversations from './Conversations';
import ProfileViewers from './ProfileViewers';
import MarketReportPanel from './MarketReportPanel';
import SellerBilling from './SellerBilling';
import { Link } from '../i18n/navigation';
import JourneyHome from './JourneyHome';
import JourneyRail from './JourneyRail';
import JourneyNextButton from './JourneyNextButton';
import { fetchExporterDashboard, type ExporterDashboardData } from '../lib/dashboardApi';
import { stepForTab } from '../lib/journey';

export type WorkspaceTabId = 'overview' | 'profile' | 'verification' | 'products' | 'rfq' | 'messages' | 'notifications' | 'licenses' | 'viewers' | 'report' | 'billing';

interface SellerWorkspaceProps {
  account?: DemoUser;
  onLogout: () => void;
  onNavigateHome: () => void;
  /** Mở form hồ sơ; step = bước cần bổ sung (1 công ty, 2 sản phẩm, 3 giấy phép). */
  onNavigateOnboarding: (step?: number) => void;
  initialTab?: WorkspaceTabId;
  /** Có → mỗi mục trong menu là một trang riêng (route); không có → đổi tab tại chỗ. */
  onNavigateTab?: (tab: WorkspaceTabId) => void;
}

export default function SellerWorkspace({ 
  account,
  onLogout, 
  onNavigateHome, 
  onNavigateOnboarding,
  initialTab = 'profile',
  onNavigateTab
}: SellerWorkspaceProps) {
  const { tr, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>(initialTab);
  // Đổi mục ngay khi bấm, URL theo sau; Back/Forward đổi initialTab thì đồng bộ lại.
  useEffect(() => setActiveTab(initialTab), [initialTab]);
  const goTab = (tab: WorkspaceTabId) => {
    setActiveTab(tab);
    onNavigateTab?.(tab);
  };
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  // Trạng thái thật của công ty trên server (thay cho nhãn L2 cố định trước đây).
  const [company, setCompany] = useState<CompanyOut | null>(null);
  useEffect(() => {
    let active = true;
    getMyCompany().then((c) => active && setCompany(c));
    return () => {
      active = false;
    };
  }, []);
  // Hành trình (N1): trạng thái từng bước lấy từ dashboard trên server.
  const [journeyData, setJourneyData] = useState<ExporterDashboardData | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    fetchExporterDashboard().then((d) => active && setJourneyData(d));
    return () => {
      active = false;
    };
  }, []);
  const journeySteps = journeyData?.journey.steps ?? [];
  // Products List
  // Sản phẩm thật từ server (B5). null = đang tải; 'error' = không tải được.
  const [productsState, setProductsState] = useState<ProductOut[] | null | 'error'>(null);
  useEffect(() => {
    let active = true;
    getMyProducts().then((list) => {
      if (active) setProductsState(list ?? 'error');
    });
    return () => {
      active = false;
    };
  }, []);
  const [taxOpenId, setTaxOpenId] = useState<string | null>(null);
  // U3: thêm/sửa một sản phẩm ngay trong workspace.
  const [dialogDraft, setDialogDraft] = useState<ProductDraft | null>(null);
  const upsertProduct = (saved: ProductOut) =>
    setProductsState((current) => {
      const list = Array.isArray(current) ? current : [];
      return list.some((p) => p.id === saved.id) ? list.map((p) => (p.id === saved.id ? saved : p)) : [...list, saved];
    });
  const productsList: ProductOut[] = Array.isArray(productsState) ? productsState : [];
  const productsFailed = productsState === 'error';
  const hsLabel = (p: ProductOut) => `${p.hs_formatted} — ${language === 'en' ? p.hs_name_en : p.hs_name_vi}`;
  const descriptionOf = (p: ProductOut) => (language === 'en' ? p.description_en || p.description_vi : p.description_vi || p.description_en) ?? '';

  const companyName = company?.legal_name ?? account?.company ?? '';
  const statusBadge = STATUS_BADGE[company?.verification_status ?? 'unverified'];
  // Hồ sơ công khai chỉ tồn tại khi công ty đã xác minh (§6.10); chưa xác minh thì không hiện lối xem.
  const publicHref = company && company.verification_status === 'verified' ? `/suppliers/${encodeURIComponent(company.slug)}` : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-blue-600 selection:text-white flex">
      
      {/* =========================================================================
          1. LEFT SIDEBAR NAVIGATION
         ========================================================================= */}
      <aside className="w-64 xl:w-72 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 select-none hidden md:flex">
        
        {/* Top: Brand Logo + Menu Items */}
        <div className="p-5 sm:p-6">
          
          {/* Brand Logo: chữ V hai màu + VYBE TRADE */}
          <div 
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 cursor-pointer group mb-8"
            title={tr("Về trang chủ Sàn giao thương")}
          >
            <div className="w-8 h-8 flex items-center justify-center text-[#0b5e52]">
              <BrandMark className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[#0f172a] font-bold text-lg sm:text-[19px] tracking-wide uppercase block leading-none">
                {tr("VYBE TRADE")}</span>
              <span className="text-[10px] text-teal-800 font-semibold tracking-wider uppercase block mt-1">
                {tr("SELLER WORKSPACE")}</span>
            </div>
          </div>

          {/* Hành trình hai chặng (N1) */}
          <JourneyRail steps={journeySteps} activeTab={activeTab} onSelectTab={goTab} />

        </div>

        {/* Bottom User Profile Card */}
        <div className="p-4 m-4 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/40 border border-slate-200/80">
          <div 
            onClick={() => goTab('profile')}
            className="flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#083832] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs border border-teal-700/50">
                {tr("VN")}</div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {companyName}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${statusBadge.tone}`}>
                    {tr(statusBadge.label)}</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0" />
          </div>
        </div>

      </aside>

      {/* =========================================================================
          2. MAIN CONTENT AREA
         ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header Bar */}
        <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 min-h-16 py-3 flex flex-wrap gap-3 items-center justify-between">
            
            {/* Mobile Menu Logo */}
            <div 
              onClick={onNavigateHome}
              className="flex md:hidden items-center gap-2 cursor-pointer"
            >
              <div className="w-7 h-7 flex items-center justify-center text-[#0b5e52]">
                <BrandMark className="w-6 h-6" />
              </div>
              <span className="font-bold text-base uppercase text-slate-900">{tr("VYBE WORKSPACE")}</span>
            </div>

            {/* Breadcrumb / Section indicator */}
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-400">{tr("Workspace")}</span>
              <span>{tr("/")}</span>
              <span className="font-bold text-slate-800">
                {tr(activeTab === 'profile' && 'Hồ sơ doanh nghiệp (Company Profile)')}
                {tr(activeTab === 'licenses' && 'Tải lên & Quản lý Giấy phép & Chứng nhận')}
                {tr(activeTab === 'verification' && 'Xác minh doanh nghiệp')}
                {tr(activeTab === 'overview' && 'Hành trình')}
                {tr(activeTab === 'products' && 'Quản lý sản phẩm cung cấp')}
                {tr(activeTab === 'rfq' && 'Cơ hội kết nối & Báo giá B2B')}
                {tr(activeTab === 'messages' && 'Tin nhắn với buyer')}
                {tr(activeTab === 'notifications' && 'Thông báo hệ thống')}
                {tr(activeTab === 'viewers' && 'Ai đã xem hồ sơ của bạn')}
                {tr(activeTab === 'report' && 'Báo cáo go-to-market')}
                {tr(activeTab === 'billing' && 'Gói dịch vụ & thanh toán')}
              </span>
            </div>

            {/* Right Side Icons & Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 ml-auto">
              <LanguageSelect />
              
              {/* Back to Onboarding */}
              <button
                onClick={() => onNavigateOnboarding()}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                title={tr("Cập nhật hồ sơ xuất khẩu")}
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>{tr("Cập nhật hồ sơ")}</span>
              </button>

              {/* Hồ sơ công khai thật (chỉ khi đã xác minh) */}
              {publicHref && (
                <Link
                  href={publicHref}
                  className="hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#083832] text-xs font-semibold border border-teal-200 transition-colors shadow-2xs"
                  title={tr("Xem giao diện hồ sơ hiển thị với Buyer quốc tế")}
                >
                  <Eye className="w-3.5 h-3.5 text-teal-700" />
                  <span>{tr("Xem hồ sơ công khai")}</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => goTab('messages')}
                aria-label={tr('Tin nhắn')}
                title={tr('Tin nhắn')}
                className="p-2 rounded-xl hover:bg-slate-50 text-slate-600 cursor-pointer"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <NotificationBell />

              {/* Seller Profile Pill with Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#083832] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {tr("VN")}</div>
                  <span className="hidden sm:inline text-xs sm:text-[13px] font-semibold text-slate-800 max-w-[170px] truncate">
                    {companyName}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-xs text-left animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="font-bold text-slate-900 truncate">{companyName}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${statusBadge.tone}`}>
                        {tr(statusBadge.label)}</span>
                    </div>
                    <button 
                      onClick={() => {
                        goTab('profile');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700 cursor-pointer flex items-center gap-2"
                    >
                      <Building2 className="w-3.5 h-3.5 text-teal-700" />
                      <span>{tr("Xem hồ sơ công ty")}</span>
                    </button>
                    <button 
                      onClick={() => {
                        goTab('licenses');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-teal-50 text-teal-900 font-semibold cursor-pointer flex items-center gap-2"
                    >
                      <Award className="w-3.5 h-3.5 text-teal-700" />
                      <span>{tr("Quản lý Giấy phép & Chứng nhận")}</span>
                    </button>
                    <button 
                      onClick={() => {
                        goTab('verification');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700 cursor-pointer flex items-center gap-2"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                      <span>{tr("Xem tiến trình xác minh")}</span>
                    </button>
                    {publicHref && (
                      <Link
                        href={publicHref}
                        onClick={() => setProfileDropdownOpen(false)}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>{tr("Xem hồ sơ công khai")}</span>
                      </Link>
                    )}
                    <button 
                      onClick={() => {
                        onNavigateOnboarding();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700 cursor-pointer flex items-center gap-2"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                      <span>{tr("Cập nhật hồ sơ xuất khẩu")}</span>
                    </button>
                    <button 
                      onClick={() => {
                        onNavigateHome();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700 cursor-pointer flex items-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      <span>{tr("Xem Sàn giao thương B2B")}</span>
                    </button>
                    <button
                      onClick={() => {
                        goTab('billing');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700 cursor-pointer flex items-center gap-2"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-teal-700" />
                      <span>{tr("Gói dịch vụ & thanh toán")}</span>
                    </button>
                    <button
                      onClick={() => {
                        goTab('notifications');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700 cursor-pointer flex items-center gap-2"
                    >
                      <Bell className="w-3.5 h-3.5 text-teal-700" />
                      <span>{tr("Thông báo")}</span>
                    </button>
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
            3. TAB CONTENT DISPATCHER
           ========================================================================= */}
        {/* Hành trình cho màn hình hẹp (thanh bên chỉ hiện từ md trở lên) */}
        <div className="md:hidden px-4 py-2 bg-white border-b border-slate-100">
          <JourneyRail horizontal steps={journeySteps} activeTab={activeTab} onSelectTab={goTab} />
        </div>

        <main className="flex-1 w-full max-w-7xl mx-auto p-5 sm:p-8 lg:p-10 select-none">
          
          {/* Tab hồ sơ doanh nghiệp (U1): chỉ dữ liệu thật trên server */}
          {activeTab === 'profile' && (
            <CompanyProfileView company={company} products={productsState} onEdit={onNavigateOnboarding} onNavigateTab={goTab} />
          )}

          {/* Tab bằng chứng (C6): dữ liệu thật trên server, không còn chứng chỉ mẫu */}
          {activeTab === 'licenses' && (
            <div className="space-y-6 text-left animate-in fade-in duration-200">
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {tr("Bằng chứng & chứng nhận")}</h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  {tr("Nộp chứng nhận chất lượng, bằng chứng xuất xứ và các giấy tờ theo danh sách kiểm của nhóm hàng. Quản trị viên sẽ xem xét từng bằng chứng.")}</p>
              </div>
              <EvidenceManager />
              <CompanyEvidenceChecklist />
            </div>
          )}

          {/* Tab xác minh (I1, I2): trạng thái thật, gửi yêu cầu, lý do của quản trị viên. Không còn cấp độ L0–L3 mẫu. */}
          {activeTab === 'verification' && (
            <div className="space-y-6 text-left animate-in fade-in duration-200">
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {tr("Xác minh doanh nghiệp")}</h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  {tr("Gửi yêu cầu để quản trị viên xem xét hồ sơ và bằng chứng của bạn. Chỉ doanh nghiệp đã xác minh mới hiện trong danh bạ nhà cung cấp.")}</p>
              </div>
              <VerificationPanel />
            </div>
          )}

          {/* -----------------------------------------------------------------------
              TAB: TỔNG QUAN (OVERVIEW / METRICS)
             ----------------------------------------------------------------------- */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <VerificationStatusCard company={company} onNavigateTab={goTab} onEditProfile={onNavigateOnboarding} />
              <JourneyHome data={journeyData} onGoTab={goTab} />
            </div>
          )}

          {/* -----------------------------------------------------------------------
              TAB: SẢN PHẨM (PRODUCTS)
             ----------------------------------------------------------------------- */}
          {activeTab === 'products' && (
            <div className="space-y-4 text-left animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{tr("Danh mục sản phẩm cung cấp")}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{tr("Các mặt hàng chính đã được đối soát thông số kỹ thuật và bao bì xuất khẩu")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDialogDraft(emptyDraft())}
                  className="px-4 py-2 rounded-xl bg-[#083832] text-white text-xs font-semibold hover:bg-[#062924] transition-colors cursor-pointer"
                >
                  {tr("+ Thêm sản phẩm mới")}</button>
              </div>

              {productsFailed && <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{tr("Không tải được danh sách sản phẩm. Vui lòng thử lại.")}</p>}
              {productsState !== null && !productsFailed && productsList.length === 0 && (
                <p role="status" className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-700">
                  {tr("Chưa có sản phẩm. Thêm sản phẩm kèm mã HS để buyer tìm thấy bạn.")}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {productsList.map((product) => (
                  <div key={product.id} className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                      {product.images[0] && (
                        <div className="w-full h-44 rounded-2xl overflow-hidden bg-slate-100 mb-4 border border-slate-200">
                          <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] text-slate-500 font-medium">{hsLabel(product)}</span>
                        {!product.is_active && (
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">{tr("Đang ẩn")}</span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{product.name}</h4>
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2">{descriptionOf(product)}</p>

                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">{tr("Giá:")}</span>
                          <span className="font-semibold text-slate-800 text-right">{formatPrice(product, tr) || '—'}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">{tr("MOQ:")}</span>
                          <span className="font-semibold text-slate-800 text-right">{formatMoq(product, tr) || '—'}</span>
                        </div>
                        {(product.price_tiers ?? []).length > 0 && (
                          <ul aria-label={tr('Bậc giá')} className="pt-1 space-y-0.5 text-[11px] text-slate-600">
                            {formatTiers(product, tr).map((line) => <li key={line}>{line}</li>)}
                          </ul>
                        )}
                        {(product.packagings ?? []).length > 0 && (
                          <p className="text-[11px] text-slate-600">
                            {tr('Quy cách:')} {(product.packagings ?? []).map((x) => formatPackaging(x, tr)).join(' • ')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 mt-2 space-y-2">
                      <button
                        type="button"
                        onClick={() => setDialogDraft(draftFromProduct(product))}
                        className="w-full py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {tr("Sửa sản phẩm")}</button>
                      <button
                        type="button"
                        aria-expanded={taxOpenId === product.id}
                        onClick={() => setTaxOpenId(taxOpenId === product.id ? null : product.id)}
                        className="w-full py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {taxOpenId === product.id ? tr("Ẩn thuế") : tr("Xem thuế MFN / EVFTA")}</button>
                      {taxOpenId === product.id && <TariffPanel hsCode={product.hs_code} variant="full" />}
                      {publicHref && (
                        <Link
                          href={publicHref}
                          className="block w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold text-center transition-colors"
                        >
                          {tr("Xem hồ sơ công khai")}</Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------------------
              TAB: CƠ HỘI KẾT NỐI (RFQ / OPPORTUNITIES)
             ----------------------------------------------------------------------- */}
          {activeTab === 'rfq' && <RfqInbox role="exporter" />}

          {dialogDraft && (
            <ProductDialog
              initial={dialogDraft}
              onClose={() => setDialogDraft(null)}
              onSaved={(saved) => {
                upsertProduct(saved);
                setDialogDraft(null);
              }}
              onDeleted={(id) => {
                setProductsState((current) => (Array.isArray(current) ? current.filter((p) => p.id !== id) : current));
                setDialogDraft(null);
              }}
            />
          )}

          {/* -----------------------------------------------------------------------
              TAB: THÔNG BÁO (NOTIFICATIONS)
             ----------------------------------------------------------------------- */}
          {activeTab === 'messages' && <Conversations />}

          {activeTab === 'notifications' && <NotificationsPanel />}

          {activeTab === 'viewers' && <ProfileViewers />}

          {activeTab === 'report' && <MarketReportPanel products={productsList} />}

          {activeTab === 'billing' && <SellerBilling />}

          {/* Trợ lý: nút nổi ở mọi tab (khách: người dùng ít rành công nghệ, cần hỏi bất cứ lúc nào) */}
          <Link
            href="/copilot"
            className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#083832] px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#062924]"
          >
            <LifeBuoy className="h-5 w-5" aria-hidden="true" />
            <span>{tr('Trợ lý')}</span>
          </Link>

          {(() => {
            const step = stepForTab(activeTab);
            return step ? <JourneyNextButton current={step} onGoTab={goTab} /> : null;
          })()}

        </main>

      </div>


    </div>
  );
}
