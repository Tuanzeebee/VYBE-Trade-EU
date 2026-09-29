'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import type { DemoUser } from '../lib/demoAuth';
import { formatMoq, formatPrice, getMyProducts, type ProductOut } from '../lib/productsApi';
import CompletenessCard from './CompletenessCard';
import LanguageSelect from './LanguageSelect';
import { 
  Home, 
  Building2, 
  ShieldCheck, 
  Package, 
  Handshake, 
  Bell, 
  Globe, 
  ChevronDown, 
  ChevronRight, 
  ArrowRight, 
  CheckCircle2, 
  FileCheck, 
  Clock, 
  Award, 
  MapPin, 
  Mail, 
  Phone, 
  ExternalLink, 
  Layers, 
  TrendingUp, 
  Edit3, 
  X, 
  Upload, 
  Lock,
  Sparkles,
  Search,
  Eye,
  Check,
  FileText,
  Calendar,
  User,
  Share2,
  Printer,
  Factory,
  Scale,
  Box,
  Download,
  AlertCircle,
  Plus,
  Trash2,
  UploadCloud,
  Filter
} from 'lucide-react';
import EvidenceManager from './EvidenceManager';
import VerificationPanel from './VerificationPanel';
import { useLanguage } from "../context/LanguageContext";
import RfqInbox from './RfqInbox';
import NotificationsPanel from './NotificationsPanel';
import ExporterDashboard from './ExporterDashboard';

export interface WorkspaceCertificateItem {
  id: string;
  title: string;
  type: string;
  category: 'legal' | 'food_safety' | 'agriculture' | 'other';
  issuer: string;
  certNumber: string;
  date: string;
  issueDate?: string;
  expiryDate?: string;
  status: string;
  validity: string;
  fileName: string;
  fileSize: string;
  isMandatory?: boolean;
}

interface SellerWorkspaceProps {
  account?: DemoUser;
  onLogout: () => void;
  onNavigateHome: () => void;
  /** Mở form hồ sơ; step = bước cần bổ sung (1 công ty, 2 sản phẩm, 3 giấy phép). */
  onNavigateOnboarding: (step?: number) => void;
  onNavigateBuyerDetail?: () => void;
  initialTab?: 'verification' | 'profile' | 'overview' | 'products' | 'rfq' | 'notifications' | 'licenses';
}

export default function SellerWorkspace({ 
  account,
  onLogout, 
  onNavigateHome, 
  onNavigateOnboarding,
  onNavigateBuyerDetail,
  initialTab = 'profile'
}: SellerWorkspaceProps) {
  const { tr, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'verification' | 'products' | 'rfq' | 'notifications' | 'licenses'>(initialTab);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<
    'upgrade-l1' | 'upgrade-l2' | 'upgrade-l3' | 'evidence-record' | 'edit-profile' | 'view-doc' | 'public-preview' | 'add-cert' | 'edit-cert' | 'delete-cert' | null
  >(null);
  const [selectedDoc, setSelectedDoc] = useState<{ title: string; type: string; issuer: string; date: string; certNumber: string } | null>(null);

  // Selected certificate for editing or deleting
  const [editingCert, setEditingCert] = useState<WorkspaceCertificateItem | null>(null);
  const [deletingCert, setDeletingCert] = useState<WorkspaceCertificateItem | null>(null);
  const [certSearchTerm, setCertSearchTerm] = useState('');
  const [certCategoryFilter, setCertCategoryFilter] = useState<'all' | 'legal' | 'food_safety' | 'agriculture' | 'other'>('all');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // New Certificate Form State
  const [newCertForm, setNewCertForm] = useState({
    title: '',
    type: 'Tiêu chuẩn an toàn thực phẩm xuất khẩu',
    category: 'food_safety' as 'legal' | 'food_safety' | 'agriculture' | 'other',
    issuer: '',
    certNumber: '',
    issueDate: '2024-01-15',
    expiryDate: '2027-01-14',
    fileName: 'ChungChi_VietAgri_2024.pdf',
    fileSize: '2.5 MB'
  });

  // Verification Step simulation state
  const [currentLevel, setCurrentLevel] = useState<'L0' | 'L1' | 'L2' | 'L3'>('L2');

  // Company Profile Data
  const [companyProfile, setCompanyProfile] = useState({
    name: account?.company || 'Công ty TNHH Nông sản Việt Trí',
    tradeName: 'VIET AGRI EXPORT CO., LTD',
    taxCode: account?.profile?.taxCode || '0314892345',
    businessType: 'Công ty TNHH Hai Thành Viên Trở Lên',
    establishedYear: account?.profile?.establishedYear || '2018',
    representative: account?.name || 'Nguyễn Văn Trí',
    representativeRole: 'Tổng Giám đốc / Đại diện pháp luật',
    address: account?.profile?.headquartersAddress || 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh',
    factoryAddress: 'Lô B2-4, KCN Phước Đông, Huyện Gò Dầu, Tỉnh Tây Ninh (Diện tích 25,000 m²)',
    website: account?.profile?.website || 'https://vietagri-export.vn',
    email: account?.profile?.contactEmail || account?.email || 'contact@vietagri-export.vn',
    phone: account?.profile?.phone || '(+84) 28 3829 9842',
    hotline: '(+84) 91 888 2345',
    capacity: '15,000 tấn/năm (~1,250 tấn/tháng)',
    employees: '250+ nhân sự vận hành & kỹ sư nông học',
    standards: 'HACCP Codex Alimentarius, ISO 22000:2018, GlobalG.A.P. IFA',
    puc: 'VN-DL-0489 (Mã vùng trồng sầu riêng & thanh long cấp bởi Cục BVTV)',
    phc: 'PHC-VN-102 (Mã cơ sở đóng gói đạt chuẩn EU & US)',
    mainMarkets: account?.profile?.market ? [account.profile.market] : ['EU (Đức, Hà Lan, Ý)', 'Hoa Kỳ', 'Nhật Bản', 'Hàn Quốc', 'Trung Quốc'],
    description: account?.profile?.description || 'Chuyên gia công, sơ chế và xuất khẩu nông sản nhiệt đới đạt chuẩn quốc tế hàng đầu Việt Nam. Sở hữu chuỗi cung ứng khép kín từ vùng trồng liên kết đến nhà máy sơ chế và kho bảo quản lạnh sâu tiêu chuẩn Châu Âu.'
  });

  // Certificate Items
  const [certificatesList, setCertificatesList] = useState<WorkspaceCertificateItem[]>([
    {
      id: 'cert-1',
      title: 'Giấy chứng nhận Đăng ký Doanh nghiệp (ERC)',
      type: 'Pháp lý doanh nghiệp bắt buộc',
      category: 'legal',
      issuer: 'Sở Kế hoạch & Đầu tư TP. Hồ Chí Minh',
      certNumber: '0314892345',
      date: '15/03/2018 (Đăng ký thay đổi lần 4: 2023)',
      issueDate: '2018-03-15',
      expiryDate: 'Không thời hạn',
      status: 'Đã xác thực OCR',
      validity: 'Hiệu lực vĩnh viễn',
      fileName: 'DKKD_VietAgri_2023_BanSao.pdf',
      fileSize: '3.2 MB',
      isMandatory: true
    },
    {
      id: 'cert-2',
      title: 'HACCP Codex Alimentarius (CXC 1-1969)',
      type: 'Tiêu chuẩn phân tích mối nguy & điểm kiểm soát tới hạn',
      category: 'food_safety',
      issuer: 'SGS Vietnam Co., Ltd.',
      certNumber: 'VN22/00481-HACCP',
      date: '15/12/2023 - 14/12/2026',
      issueDate: '2023-12-15',
      expiryDate: '2026-12-14',
      status: 'Đã thẩm định L2',
      validity: 'Còn 2 năm hiệu lực',
      fileName: 'HACCP_Codex_SGS_VietAgri.pdf',
      fileSize: '2.8 MB',
      isMandatory: false
    },
    {
      id: 'cert-3',
      title: 'ISO 22000:2018 Hệ thống Quản lý An toàn Thực phẩm',
      type: 'Tiêu chuẩn quốc tế chuỗi cung ứng thực phẩm',
      category: 'food_safety',
      issuer: 'TÜV Rheinland Vietnam',
      certNumber: '01 153 2100842',
      date: '10/08/2023 - 09/08/2026',
      issueDate: '2023-08-10',
      expiryDate: '2026-08-09',
      status: 'Đã thẩm định L2',
      validity: 'Còn 2 năm hiệu lực',
      fileName: 'ISO22000_2018_TUV_Rheinland.pdf',
      fileSize: '1.9 MB',
      isMandatory: false
    },
    {
      id: 'cert-4',
      title: 'GlobalG.A.P. IFA Version 5.4 - Trồng trọt bền vững',
      type: 'Tiêu chuẩn nông nghiệp toàn cầu',
      category: 'agriculture',
      issuer: 'Control Union Certifications B.V.',
      certNumber: 'GGN-40598839210',
      date: '20/11/2023 - 19/11/2025',
      issueDate: '2023-11-20',
      expiryDate: '2025-11-19',
      status: 'Đã thẩm định L2',
      validity: 'Còn 1 năm hiệu lực',
      fileName: 'GlobalGAP_ControlUnion_2023.pdf',
      fileSize: '4.1 MB',
      isMandatory: false
    }
  ]);

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
  const productsList: ProductOut[] = Array.isArray(productsState) ? productsState : [];
  const productsFailed = productsState === 'error';
  const hsLabel = (p: ProductOut) => `${p.hs_formatted} — ${language === 'en' ? p.hs_name_en : p.hs_name_vi}`;
  const descriptionOf = (p: ProductOut) => (language === 'en' ? p.description_en || p.description_vi : p.description_vi || p.description_en) ?? '';

  // Quick preset suggested certificates
  const SUGGESTED_PRESETS = [
    { title: 'GlobalG.A.P. IFA', category: 'agriculture' as const, issuer: 'Control Union / SGS', type: 'Tiêu chuẩn nông nghiệp toàn cầu' },
    { title: 'USDA Organic NOP', category: 'agriculture' as const, issuer: 'Control Union Certifications', type: 'Chứng nhận hữu cơ Hoa Kỳ' },
    { title: 'EU Organic Bio', category: 'agriculture' as const, issuer: 'Ecocert / Control Union', type: 'Chứng nhận hữu cơ Châu Âu' },
    { title: 'FDA Food Facility Registration', category: 'food_safety' as const, issuer: 'US Food and Drug Administration', type: 'Mã số cơ sở thực phẩm FDA Hoa Kỳ' },
    { title: 'Halal JAKIM / HIA', category: 'food_safety' as const, issuer: 'Halal Certification Agency', type: 'Chứng nhận tiêu chuẩn Hồi giáo' },
    { title: 'BRCGS Food Safety', category: 'food_safety' as const, issuer: 'Lloyds Register / SGS', type: 'Tiêu chuẩn ATTP BRCGS Anh Quốc' },
    { title: 'VietGAP Trồng trọt', category: 'agriculture' as const, issuer: 'Trung tâm Quacert', type: 'Thực hành nông nghiệp tốt Việt Nam' },
    { title: 'Fairtrade Mark', category: 'other' as const, issuer: 'FLOCERT International', type: 'Thương mại công bằng' },
    { title: 'ISO 9001:2015', category: 'legal' as const, issuer: 'BVC / DNV / TÜV', type: 'Hệ thống Quản lý Chất lượng' }
  ];

  const handleAddCertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCertForm.title.trim()) return;
    const newCertItem: WorkspaceCertificateItem = {
      id: `cert-${Date.now()}`,
      title: newCertForm.title.trim(),
      type: newCertForm.type || 'Tiêu chuẩn xuất khẩu bổ sung',
      category: newCertForm.category,
      issuer: newCertForm.issuer.trim() || 'Tổ chức chứng nhận quốc tế',
      certNumber: newCertForm.certNumber.trim() || `VN-${Math.floor(10000 + Math.random() * 90000)}`,
      date: `${newCertForm.issueDate || '2024-01-15'} - ${newCertForm.expiryDate || '2027-01-14'}`,
      issueDate: newCertForm.issueDate,
      expiryDate: newCertForm.expiryDate,
      status: 'Đã xác thực OCR',
      validity: 'Hợp lệ',
      fileName: newCertForm.fileName || 'ChungChi_DoiSoat.pdf',
      fileSize: newCertForm.fileSize || '2.4 MB',
      isMandatory: false
    };
    setCertificatesList([newCertItem, ...certificatesList]);
    setActiveModal(null);
    setToastMessage({
      type: 'success',
      text: `Đã tải lên và đối soát thành công: ${newCertItem.title}`
    });
    setNewCertForm({
      title: '',
      type: 'Tiêu chuẩn an toàn thực phẩm xuất khẩu',
      category: 'food_safety',
      issuer: '',
      certNumber: '',
      issueDate: '2024-01-15',
      expiryDate: '2027-01-14',
      fileName: 'ChungChi_VietAgri_2024.pdf',
      fileSize: '2.5 MB'
    });
  };

  const handleEditCertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCert) return;
    setCertificatesList(certificatesList.map(c => c.id === editingCert.id ? editingCert : c));
    setActiveModal(null);
    setToastMessage({
      type: 'success',
      text: `Đã cập nhật thông tin chứng chỉ: ${editingCert.title}`
    });
    setEditingCert(null);
  };

  const handleDeleteCertConfirm = () => {
    if (!deletingCert) return;
    setCertificatesList(certificatesList.filter(c => c.id !== deletingCert.id));
    setActiveModal(null);
    setToastMessage({
      type: 'info',
      text: `Đã xóa chứng chỉ: ${deletingCert.title}`
    });
    setDeletingCert(null);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-blue-600 selection:text-white flex">
      
      {/* =========================================================================
          1. LEFT SIDEBAR NAVIGATION
         ========================================================================= */}
      <aside className="w-64 xl:w-72 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 select-none hidden md:flex">
        
        {/* Top: Brand Logo + Menu Items */}
        <div className="p-5 sm:p-6">
          
          {/* Brand Logo: Double Sprout Wing in Dark Teal + VYBE TRADE */}
          <div 
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 cursor-pointer group mb-8"
            title={tr("Về trang chủ Sàn giao thương")}
          >
            <div className="w-8 h-8 flex items-center justify-center text-[#0b5e52]">
              <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 16 26 C 14 18 8 13 4 10 C 3 9 4 7 5 7 C 11 8 15 13 16 26 Z" fill="#0b5e52" />
                <path d="M 16 26 C 18 18 24 13 28 10 C 29 9 28 7 27 7 C 21 8 17 13 16 26 Z" fill="#0b5e52" />
              </svg>
            </div>
            <div>
              <span className="text-[#0f172a] font-bold text-lg sm:text-[19px] tracking-wide uppercase block leading-none">
                {tr("VYBE TRADE")}</span>
              <span className="text-[10px] text-teal-800 font-semibold tracking-wider uppercase block mt-1">
                {tr("SELLER WORKSPACE")}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {[
              { id: 'profile', label: 'Hồ sơ doanh nghiệp', icon: Building2, badge: 'Đã hoàn tất' },
              { id: 'licenses', label: 'Tải lên & Quản lý Giấy phép & Chứng nhận', icon: Award, badge: `${certificatesList.length} tài liệu` },
              { id: 'verification', label: 'Tiến trình xác minh (L0-L3)', icon: ShieldCheck, badge: 'L2' },
              { id: 'overview', label: 'Tổng quan & Chỉ số', icon: Home },
              { id: 'products', label: 'Sản phẩm xuất khẩu', icon: Package, badge: `${productsList.length}` },
              { id: 'rfq', label: 'Cơ hội kết nối B2B', icon: Handshake, badge: '3 mới' },
              { id: 'notifications', label: 'Thông báo', icon: Bell }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#e6f4f2] text-[#0d766e]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 stroke-[2] ${isActive ? 'text-[#0d766e]' : 'text-slate-500'}`} />
                    <span>{tr(item.label)}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isActive 
                        ? 'bg-[#0d766e] text-white' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tr(item.badge)}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

        </div>

        {/* Bottom User Profile Card */}
        <div className="p-4 m-4 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/40 border border-slate-200/80">
          <div 
            onClick={() => setActiveTab('profile')}
            className="flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#083832] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs border border-teal-700/50">
                {tr("VN")}</div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {companyProfile.name}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded-sm">
                    {tr("L2 Verified")}</span>
                  <span className="text-[10px] text-slate-400">
                    {tr("MST: ")}{companyProfile.taxCode}
                  </span>
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
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 16 26 C 14 18 8 13 4 10 C 3 9 4 7 5 7 C 11 8 15 13 16 26 Z" fill="#0b5e52" />
                  <path d="M 16 26 C 18 18 24 13 28 10 C 29 9 28 7 27 7 C 21 8 17 13 16 26 Z" fill="#0b5e52" />
                </svg>
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
                {tr(activeTab === 'overview' && 'Tổng quan & Chỉ số tăng trưởng')}
                {tr(activeTab === 'products' && 'Quản lý Sản phẩm xuất khẩu')}
                {tr(activeTab === 'rfq' && 'Cơ hội kết nối & Báo giá B2B')}
                {tr(activeTab === 'notifications' && 'Thông báo hệ thống')}
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

              {/* View Public Showcase */}
              <button
                onClick={() => {
                  if (onNavigateBuyerDetail) {
                    onNavigateBuyerDetail();
                  } else {
                    setActiveModal('public-preview');
                  }
                }}
                className="hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#083832] text-xs font-semibold border border-teal-200 transition-colors cursor-pointer shadow-2xs"
                title={tr("Xem giao diện hồ sơ hiển thị với Buyer quốc tế")}
              >
                <Eye className="w-3.5 h-3.5 text-teal-700" />
                <span>{tr("Xem trang Buyer (Showcase)")}</span>
              </button>

              {/* Notification Bell */}
              <button 
                onClick={() => setActiveTab('notifications')}
                className="p-1.5 text-slate-600 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100 cursor-pointer relative"
                title={tr("Thông báo")}
              >
                <Bell className="w-5 h-5 stroke-[1.6]" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
              </button>

              {/* Seller Profile Pill with Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#083832] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {tr("VN")}</div>
                  <span className="hidden sm:inline text-xs sm:text-[13px] font-semibold text-slate-800 max-w-[170px] truncate">
                    {companyProfile.name}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-xs text-left animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="font-bold text-slate-900 truncate">{companyProfile.name}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">{tr("MST: ")}{companyProfile.taxCode}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {tr("🛡️ L2 Enhanced Verified")}</span>
                    </div>
                    <button 
                      onClick={() => {
                        setActiveTab('profile');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700 cursor-pointer flex items-center gap-2"
                    >
                      <Building2 className="w-3.5 h-3.5 text-teal-700" />
                      <span>{tr("Xem hồ sơ công ty")}</span>
                    </button>
                    <button 
                      onClick={() => {
                        setActiveTab('licenses');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-teal-50 text-teal-900 font-semibold cursor-pointer flex items-center gap-2"
                    >
                      <Award className="w-3.5 h-3.5 text-teal-700" />
                      <span>{tr("Quản lý Giấy phép & Chứng nhận")}</span>
                    </button>
                    <button 
                      onClick={() => {
                        setActiveTab('verification');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700 cursor-pointer flex items-center gap-2"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                      <span>{tr("Tiến trình xác minh (L0 → L3)")}</span>
                    </button>
                    <button 
                      onClick={() => {
                        setActiveModal('public-preview');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700 cursor-pointer flex items-center gap-2"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>{tr("Xem trang công khai B2B")}</span>
                    </button>
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
        <main className="flex-1 w-full max-w-7xl mx-auto p-5 sm:p-8 lg:p-10 select-none">
          
          {/* -----------------------------------------------------------------------
              TAB: HỒ SƠ DOANH NGHIỆP (COMPANY PROFILE) - PRIMARY USER FOCUS
             ----------------------------------------------------------------------- */}
          {activeTab === 'profile' && (
            <div className="space-y-8 text-left animate-in fade-in duration-200">

              {/* Mức độ hoàn thiện hồ sơ (B3) — khu riêng, không phải kết quả xác minh */}
              <CompletenessCard onNavigate={(step) => onNavigateOnboarding(step)} />
              
              {/* Header Hero Banner */}
              <div className="relative rounded-3xl bg-gradient-to-r from-[#083832] via-[#0b4d45] to-[#0a2f2a] p-6 sm:p-8 lg:p-10 text-white shadow-xl overflow-hidden">
                {/* Background Ambient Glow */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  
                  {/* Left: Avatar + Company Details */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white text-[#083832] font-black text-2xl sm:text-3xl flex items-center justify-center shrink-0 shadow-lg border-2 border-teal-300/40">
                      {tr("VN")}</div>

                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                          {companyProfile.name}
                        </h1>
                        <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{tr("L2 Enhanced Verified")}</span>
                        </span>
                      </div>

                      <p className="text-teal-200 text-xs sm:text-sm font-medium mt-1">
                        {companyProfile.tradeName}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-teal-100/80 mt-3 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-teal-300" />
                          <span>{tr("MST: ")}<strong>{companyProfile.taxCode}</strong></span>
                        </span>
                        <span>{tr("•")}</span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-teal-300" />
                          <span>{tr("Thành lập: ")}<strong>{tr(companyProfile.establishedYear)}</strong></span>
                        </span>
                        <span>{tr("•")}</span>
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-teal-300" />
                          <span>{tr("Đại diện: ")}<strong>{companyProfile.representative}</strong></span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex flex-wrap sm:flex-nowrap gap-2.5 w-full lg:w-auto">
                    <button 
                      onClick={() => setActiveModal('edit-profile')}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-white/15 cursor-pointer backdrop-blur-xs"
                    >
                      <Edit3 className="w-4 h-4 text-teal-200" />
                      <span>{tr("Chỉnh sửa hồ sơ")}</span>
                    </button>
                    
                    <button 
                      onClick={() => setActiveModal('public-preview')}
                      className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-95"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{tr("Xem trang Buyer")}</span>
                    </button>
                  </div>

                </div>

                {/* Sub-bar: Verification Highlights */}
                <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-teal-200">{tr("Trạng thái hồ sơ:")}</span>
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {tr("Đang hoạt động trên Sàn B2B Quốc tế")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-teal-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{tr("Chứng từ được bảo vệ bởi Temporal Tables & OCR Engine")}</span>
                  </div>
                </div>

              </div>

              {/* Quick Health & Metrics Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>{tr("Mức độ hoàn thiện")}</span>
                    <span className="font-bold text-emerald-700">{tr("95%")}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-2">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '95%' }} />
                  </div>
                  <p className="text-[11px] text-slate-500">{tr("Đầy đủ ĐKKD, chứng nhận & 3 sản phẩm")}</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium">{tr("Điểm tín nhiệm (Trust Score)")}</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-teal-800">{tr("96/100")}</span>
                    <span className="text-xs font-bold text-teal-600">{tr("Hạng A+")}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{tr("Đủ điều kiện bảo lãnh hợp đồng B2B")}</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium">{tr("Cấp độ xác minh")}</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-900">{tr("Level 2")}</span>
                    <span className="text-xs font-semibold text-emerald-700">{tr("Enhanced")}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{tr("Đối chiếu Sở KH&ĐT + SGS + TÜV")}</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium">{tr("Năng lực cung ứng")}</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-900">{tr("15,000")}</span>
                    <span className="text-xs font-semibold text-slate-600">{tr("tấn/năm")}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{tr("Đáp ứng đơn hàng container lớn")}</p>
                </div>
              </div>

              {/* Main Content Grid: 2 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left 7 Cols: Legal, Contact & Facility */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Block 1: Thông tin Pháp lý & Liên hệ Trụ sở */}
                  <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{tr("1. Thông tin pháp lý & Liên hệ")}</h3>
                          <p className="text-[11px] text-slate-500">{tr("Đối chiếu với Cổng thông tin Quốc gia về ĐKDN")}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {tr("Khớp dữ liệu")}</span>
                    </div>

                    <div className="space-y-3 text-xs leading-relaxed">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1.5 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">{tr("Tên đăng ký kinh doanh:")}</span>
                        <span className="sm:col-span-2 font-bold text-slate-900">{companyProfile.name}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1.5 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">{tr("Tên giao dịch quốc tế:")}</span>
                        <span className="sm:col-span-2 font-semibold text-slate-800">{companyProfile.tradeName}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1.5 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">{tr("Mã số thuế / MST:")}</span>
                        <span className="sm:col-span-2 font-bold text-teal-800 font-mono text-sm">{companyProfile.taxCode}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1.5 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">{tr("Loại hình doanh nghiệp:")}</span>
                        <span className="sm:col-span-2 text-slate-800">{tr(companyProfile.businessType)}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1.5 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">{tr("Người đại diện pháp luật:")}</span>
                        <span className="sm:col-span-2 font-semibold text-slate-900">{companyProfile.representative} {tr(" (")}{tr(companyProfile.representativeRole)}{tr(")")}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1.5 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">{tr("Địa chỉ trụ sở đăng ký:")}</span>
                        <span className="sm:col-span-2 text-slate-800">{tr(companyProfile.address)}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1.5 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">{tr("Email chính thức:")}</span>
                        <span className="sm:col-span-2 font-semibold text-slate-800">{companyProfile.email}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1.5 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">{tr("Số điện thoại / Hotline:")}</span>
                        <span className="sm:col-span-2 text-slate-800">{companyProfile.phone} {tr(" • ")}{companyProfile.hotline}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1.5">
                        <span className="text-slate-500 font-medium">{tr("Website:")}</span>
                        <a href={companyProfile.website} target="_blank" rel="noreferrer" className="sm:col-span-2 text-blue-600 hover:underline font-semibold flex items-center gap-1">
                          <span>{companyProfile.website}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Block 2: Năng lực sản xuất, Nhà máy & Chuỗi cung ứng */}
                  <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                          <Factory className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{tr("2. Nhà máy & Năng lực sản xuất")}</h3>
                          <p className="text-[11px] text-slate-500">{tr("Cơ sở vật chất, mã vùng trồng và mã đóng gói")}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                        {tr("Đạt chuẩn xuất khẩu")}</span>
                    </div>

                    <div className="space-y-3 text-xs leading-relaxed">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1.5 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">{tr("Địa chỉ nhà máy chế biến:")}</span>
                        <span className="sm:col-span-2 font-semibold text-slate-800">{tr(companyProfile.factoryAddress)}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1.5 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">{tr("Năng lực cung ứng ước tính:")}</span>
                        <span className="sm:col-span-2 font-bold text-teal-800">{tr(companyProfile.capacity)}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1.5 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">{tr("Quy mô nhân sự:")}</span>
                        <span className="sm:col-span-2 text-slate-800">{tr(companyProfile.employees)}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1.5 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">{tr("Mã vùng trồng (PUC):")}</span>
                        <span className="sm:col-span-2 font-bold text-emerald-800 font-mono bg-emerald-50 px-2 py-0.5 rounded inline-block">
                          {tr(companyProfile.puc)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1.5 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">{tr("Mã cơ sở đóng gói (PHC):")}</span>
                        <span className="sm:col-span-2 font-bold text-emerald-800 font-mono bg-emerald-50 px-2 py-0.5 rounded inline-block">
                          {tr(companyProfile.phc)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1.5">
                        <span className="text-slate-500 font-medium">{tr("Thị trường xuất khẩu chính:")}</span>
                        <div className="sm:col-span-2 flex flex-wrap gap-1.5">
                          {companyProfile.mainMarkets.map((m, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                              {tr(m)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Block 3: Giới thiệu chung của Doanh nghiệp */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
                    <h4 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
                      {tr("Giới thiệu doanh nghiệp & Cam kết chất lượng")}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {tr(companyProfile.description)}
                    </p>
                  </div>

                </div>

                {/* Right 5 Cols: Certifications & Products */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Block 4: Chứng nhận & Tiêu chuẩn chất lượng (Evidence Record) */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-teal-700" />
                        <h3 className="text-sm font-bold text-slate-900">{tr("3. Chứng nhận chất lượng")}</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('licenses')}
                        className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{tr("Quản lý (")}{tr(certificatesList.length)}{tr(")")}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {certificatesList.map((cert) => (
                        <div 
                          key={cert.id}
                          className="p-3.5 rounded-2xl bg-slate-50 hover:bg-teal-50/40 border border-slate-200/80 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-teal-900">
                                {tr(cert.title)}
                              </h4>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {tr("Cấp bởi: ")}<strong className="text-slate-700">{tr(cert.issuer)}</strong>
                              </p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/70 px-1.5 py-0.5 rounded">
                                  {tr(cert.status)}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {tr(cert.validity)}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedDoc(cert);
                                setActiveModal('view-doc');
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#083832] text-slate-700 hover:text-white border border-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs"
                              title={tr("Xem bản scan chứng thư điện tử")}
                            >
                              <Eye className="w-3 h-3" />
                              <span>{tr("Xem")}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setActiveTab('licenses')}
                      className="w-full py-2.5 rounded-xl border border-teal-200 bg-teal-50/50 hover:bg-teal-100 text-teal-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-teal-700" />
                      <span>{tr("Tải lên chứng nhận bổ sung / Sửa / Xóa")}</span>
                    </button>

                    <div className="p-3 rounded-2xl bg-teal-50/60 border border-teal-200/60 text-xs text-teal-900 flex items-start gap-2.5">
                      <FileCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed">
                        {tr("Tất cả chứng nhận đã được lưu trữ trên ")}<strong>{tr("Evidence Record")}</strong> {tr(" bất biến, cho phép Buyer quốc tế xác thực tính toàn vẹn 24/7.")}</p>
                    </div>
                  </div>

                  {/* Block 5: Danh mục Sản phẩm Xuất khẩu Chủ lực */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-teal-700" />
                        <h3 className="text-sm font-bold text-slate-900">{tr("4. Sản phẩm xuất khẩu")}</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('products')}
                        className="text-xs font-semibold text-teal-700 hover:text-teal-900"
                      >
                        {tr("Quản lý (")}{tr(productsList.length)}{tr(") →")}</button>
                    </div>

                    <div className="space-y-3">
                      {productsFailed && <p role="alert" className="text-xs text-rose-700">{tr("Không tải được danh sách sản phẩm. Vui lòng thử lại.")}</p>}
                      {productsState !== null && !productsFailed && productsList.length === 0 && (
                        <p role="status" className="text-xs text-slate-600">{tr("Chưa có sản phẩm. Thêm sản phẩm kèm mã HS để buyer tìm thấy bạn.")}</p>
                      )}
                      {productsList.map((product) => (
                        <div key={product.id} className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs flex gap-3 items-center">
                          {product.images[0] ? (
                            <img src={product.images[0].url} alt={product.name} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-100 shrink-0 border border-slate-200" aria-hidden="true" />
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{product.name}</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">{hsLabel(product)}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {formatPrice(product, tr) || '—'}{formatMoq(product, tr) ? ` • MOQ: ${formatMoq(product, tr)}` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Block 6: Banner chuyển sang tab Xác minh */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300">{tr("Tiến trình Xác minh")}</h4>
                        <p className="text-sm font-bold text-white">{tr("Bạn đang ở cấp độ L2 Enhanced")}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {tr("Muốn hiển thị ưu tiên hàng đầu và nhận bảo lãnh Escrow từ VYBE? Nâng cấp lên chương trình thẩm định ")}<strong>{tr("L3 VYBE Certified")}</strong>{tr(".")}</p>
                    <button
                      onClick={() => setActiveTab('verification')}
                      className="w-full py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>{tr("Xem lộ trình L0 → L3")}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                </div>

              </div>

            </div>
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
          {activeTab === 'overview' && <ExporterDashboard />}

          {/* -----------------------------------------------------------------------
              TAB: SẢN PHẨM (PRODUCTS)
             ----------------------------------------------------------------------- */}
          {activeTab === 'products' && (
            <div className="space-y-4 text-left animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{tr("Danh mục sản phẩm xuất khẩu")}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{tr("Các mặt hàng chính đã được đối soát thông số kỹ thuật và bao bì xuất khẩu")}</p>
                </div>
                <button 
                  onClick={() => onNavigateOnboarding()}
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
                      </div>
                    </div>

                    <div className="pt-4 mt-2">
                      <button 
                        onClick={() => setActiveModal('public-preview')}
                        className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {tr("Xem hiển thị B2B")}</button>
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

          {/* -----------------------------------------------------------------------
              TAB: THÔNG BÁO (NOTIFICATIONS)
             ----------------------------------------------------------------------- */}
          {activeTab === 'notifications' && <NotificationsPanel />}

        </main>

      </div>

      {/* =========================================================================
          4. ACTION MODALS (EDIT PROFILE, VIEW DOC, PUBLIC PREVIEW, UPGRADE LEVELS)
         ========================================================================= */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-left max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal: View Official Document Scan */}
            {activeModal === 'view-doc' && selectedDoc && (
              <div>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{tr(selectedDoc.title)}</h3>
                    <p className="text-xs text-slate-500">{tr(selectedDoc.type)} {tr(" • Mã tra cứu: ")}{tr(selectedDoc.certNumber)}</p>
                  </div>
                </div>

                {/* Scanned Paper Mockup */}
                <div className="p-6 rounded-2xl bg-slate-100/70 border border-slate-200/80 mb-5 font-serif text-slate-800">
                  <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xs border border-slate-200/60 text-center font-sans space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      {tr("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM")}</p>
                    <p className="text-[9px] font-semibold text-slate-500">
                      {tr("Độc lập - Tự do - Hạnh phúc")}</p>
                    <div className="w-20 h-0.5 bg-slate-300 mx-auto" />
                    
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 uppercase mt-4">
                      {tr(selectedDoc.title)}
                    </h4>
                    <p className="text-xs text-slate-500">{tr("Số hiệu: ")}{tr(selectedDoc.certNumber)}</p>

                    <div className="pt-4 text-left text-xs space-y-2 text-slate-700 border-t border-slate-100">
                      <p><strong>{tr("Doanh nghiệp thụ hưởng:")}</strong> {companyProfile.name}</p>
                      <p><strong>{tr("Mã số doanh nghiệp:")}</strong> {companyProfile.taxCode}</p>
                      <p><strong>{tr("Cơ quan chứng nhận:")}</strong> {tr(selectedDoc.issuer)}</p>
                      <p><strong>{tr("Thời hạn hiệu lực:")}</strong> {tr(selectedDoc.date)}</p>
                      <p><strong>{tr("Phạm vi chứng nhận:")}</strong> {tr(" Sản xuất, chế biến và đóng gói nông sản xuất khẩu")}</p>
                    </div>

                    <div className="pt-6 flex justify-between items-center text-[10px] text-slate-400">
                      <div>
                        <span>{tr("Chứng thư điện tử đối soát bởi:")}</span>
                        <div className="font-bold text-teal-800">{tr("VYBE VERIFICATION ENGINE")}</div>
                      </div>
                      <div className="w-16 h-16 rounded-full border-2 border-rose-600 text-rose-600 flex flex-col items-center justify-center -rotate-12 select-none">
                        <span className="text-[6px] font-bold">{tr("ACCREDITED")}</span>
                        <span className="text-[10px]">{tr("★")}</span>
                        <span className="text-[6px] font-bold">{tr("ĐÃ ĐỐI SOÁT")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="px-5 py-2.5 rounded-xl bg-[#083832] text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    {tr("Đóng bản xem")}</button>
                </div>
              </div>
            )}

            {/* Modal: Public B2B Buyer Preview */}
            {activeModal === 'public-preview' && (
              <div>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{tr("Xem trước giao diện Public B2B")}</h3>
                    <p className="text-xs text-slate-500">{tr("Đây là cách hồ sơ công ty hiển thị trước mắt Buyer quốc tế (EU, US, Nhật Bản)")}</p>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#083832] text-white text-xl font-bold flex items-center justify-center shadow-xs">
                      {tr("VN")}</div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{companyProfile.name}</h4>
                      <p className="text-xs text-slate-500">{companyProfile.tradeName} {tr(" • Vietnam")}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {tr("🛡️ L2 Enhanced Verified")}</span>
                        <span className="text-[10px] text-slate-500">{tr("MST: ")}{companyProfile.taxCode}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-200">
                    {tr(companyProfile.description)}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-2">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400">{tr("Năng lực")}</span>
                      <p className="text-xs font-bold text-slate-800">{tr("15,000 tấn/năm")}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400">{tr("Chứng nhận")}</span>
                      <p className="text-xs font-bold text-slate-800">{tr("HACCP, ISO 22000")}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400">{tr("PUC Vùng trồng")}</span>
                      <p className="text-xs font-bold text-teal-800">{tr("Đã cấp phép")}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400">{tr("Escrow bảo lãnh")}</span>
                      <p className="text-xs font-bold text-emerald-700">{tr("Khả dụng")}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {tr("Đóng")}</button>
                  {onNavigateBuyerDetail && (
                    <button
                      onClick={() => {
                        setActiveModal(null);
                        onNavigateBuyerDetail();
                      }}
                      className="px-5 py-2 rounded-xl bg-[#083832] text-white font-bold text-xs hover:bg-[#062924] transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
                    >
                      <Eye className="w-3.5 h-3.5 text-teal-300" />
                      <span>{tr("Mở trang Buyer Showcase đầy đủ")}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Modal: Edit Profile */}
            {activeModal === 'edit-profile' && (
              <form onSubmit={(e) => { e.preventDefault(); setActiveModal(null); }} className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Edit3 className="w-5 h-5 text-teal-700" />
                  <h3 className="text-base font-bold text-slate-900">{tr("Chỉnh sửa hồ sơ công ty")}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">{tr("Tên doanh nghiệp đăng ký")}</label>
                    <input 
                      type="text"
                      value={companyProfile.name}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">{tr("Tên giao dịch quốc tế")}</label>
                    <input 
                      type="text"
                      value={companyProfile.tradeName}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, tradeName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">{tr("Mã số thuế")}</label>
                    <input 
                      type="text"
                      value={companyProfile.taxCode}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, taxCode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">{tr("Người đại diện")}</label>
                    <input 
                      type="text"
                      value={companyProfile.representative}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, representative: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">{tr("Năng lực cung ứng")}</label>
                    <input 
                      type="text"
                      value={companyProfile.capacity}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, capacity: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">{tr("Địa chỉ trụ sở")}</label>
                  <input 
                    type="text"
                    value={companyProfile.address}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">{tr("Địa chỉ nhà máy & kho")}</label>
                  <input 
                    type="text"
                    value={companyProfile.factoryAddress}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, factoryAddress: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">{tr("Mã vùng trồng (PUC)")}</label>
                    <input 
                      type="text"
                      value={companyProfile.puc}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, puc: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">{tr("Mã cơ sở đóng gói (PHC)")}</label>
                    <input 
                      type="text"
                      value={companyProfile.phc}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, phc: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">{tr("Mô tả tóm tắt doanh nghiệp")}</label>
                  <textarea 
                    rows={2}
                    value={companyProfile.description}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700 resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                  <button 
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    {tr("Hủy")}</button>
                  <button 
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-[#083832] text-white text-xs font-semibold hover:bg-[#062924] cursor-pointer"
                  >
                    {tr("Lưu cập nhật")}</button>
                </div>
              </form>
            )}

            {/* Modal: Upgrade L1 */}
            {activeModal === 'upgrade-l1' && (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3">
                  <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{tr("Xác minh Cấp độ L1 (Basic Verified)")}</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  {tr("Hệ thống tự động liên kết Cổng Thông tin Quốc gia đối soát mã số thuế ")}{companyProfile.taxCode}{tr(".")}</p>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs text-slate-700 mb-5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{tr("Pháp nhân hợp lệ và đang hoạt động")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{tr("Khớp mã ngành nghề xuất khẩu chính")}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCurrentLevel('L1');
                    setActiveModal(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  {tr("Xác nhận kích hoạt cấp độ L1")}</button>
              </div>
            )}

            {/* Modal: Upgrade L2 */}
            {activeModal === 'upgrade-l2' && (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-3">
                  <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{tr("Xác minh Cấp độ L2 (Enhanced Verified)")}</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  {tr("Cung cấp chứng nhận tiêu chuẩn HACCP, ISO 22000 hoặc GlobalG.A.P. còn hiệu lực.")}</p>
                <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-2 text-xs text-slate-700 mb-5">
                  <p className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{tr("Đã tải: Giấy phép ĐKKD bản scan có dấu mộc")}</span>
                  </p>
                  <p className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{tr("Đã tải: Chứng chỉ ISO 22000 & HACCP Codex")}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCurrentLevel('L2');
                    setActiveModal(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  {tr("Duyệt và hoàn tất cấp độ L2")}</button>
              </div>
            )}

            {/* Modal: Upgrade L3 */}
            {activeModal === 'upgrade-l3' && (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 mb-3">
                  <Award className="w-6 h-6 stroke-[2.2]" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{tr("Chương trình VYBE Certified (L3)")}</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  {tr("Cấp độ đối tác chiến lược: Chuyên viên VYBE tiến hành khảo sát thực địa nhà máy, thẩm định báo cáo tài chính và cấp hạn mức bảo lãnh hợp đồng Escrow.")}</p>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2.5 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  {tr("Đăng ký tư vấn thẩm định L3")}</button>
              </div>
            )}

            {/* Modal: Evidence Record */}
            {activeModal === 'evidence-record' && (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3">
                  <FileCheck className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{tr("Evidence Record Bất biến")}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1 mb-4">
                  {tr("Evidence Record sử dụng kiến trúc lưu trữ nối tiếp (Append-only Ledger) ghi nhận chính xác mốc thời gian thẩm định, chữ ký số của kiểm toán viên và mã hash của chứng từ. Buyer có thể kiểm tra tính toàn vẹn của hồ sơ doanh nghiệp theo thời gian thực.")}</p>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                >
                  {tr("Đã hiểu")}</button>
              </div>
            )}

            {/* Modal: Tải lên giấy phép & chứng nhận bổ sung (Add Certificate) */}
            {activeModal === 'add-cert' && (
              <form onSubmit={handleAddCertSubmit} className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
                    <UploadCloud className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{tr("Tải lên giấy phép & chứng nhận bổ sung")}</h3>
                    <p className="text-xs text-slate-500">{tr("Bổ sung tài liệu chứng nhận chất lượng (GlobalG.A.P., Organic, FDA, Halal, BRCGS...) để nâng cao điểm tín nhiệm hồ sơ")}</p>
                  </div>
                </div>

                {/* Quick Presets Suggested */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>{tr("Gợi ý nhanh chứng chỉ xuất khẩu phổ biến (bấm để tự động điền):")}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setNewCertForm({
                            ...newCertForm,
                            title: preset.title,
                            category: preset.category,
                            issuer: preset.issuer,
                            type: preset.type
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 hover:text-teal-900 hover:border-teal-300 border border-slate-200 text-[11px] font-semibold text-slate-700 transition-all cursor-pointer shadow-2xs"
                      >
                        {tr("+ ")}{tr(preset.title)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Fields Grid */}
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {tr("Tên chứng chỉ / Giấy phép ")}<span className="text-rose-500">{tr("*")}</span>
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder={tr("Ví dụ: GlobalG.A.P. IFA Version 5.4, USDA Organic NOP...")}
                      value={newCertForm.title}
                      onChange={(e) => setNewCertForm({ ...newCertForm, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {tr("Nhóm phân loại ")}<span className="text-rose-500">{tr("*")}</span>
                      </label>
                      <select 
                        value={newCertForm.category}
                        onChange={(e) => setNewCertForm({ ...newCertForm, category: e.target.value as any })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700 bg-white"
                      >
                        <option value="food_safety">{tr("An toàn thực phẩm (HACCP, ISO 22000, BRCGS, FDA)")}</option>
                        <option value="agriculture">{tr("Nông nghiệp & Vùng trồng (GlobalGAP, Organic, VietGAP)")}</option>
                        <option value="legal">{tr("Pháp lý doanh nghiệp & Giấy phép ngành (ERC)")}</option>
                        <option value="other">{tr("Tiêu chuẩn khác (Halal, Fairtrade, ISO 9001)")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {tr("Tổ chức / Cơ quan cấp chứng nhận ")}<span className="text-rose-500">{tr("*")}</span>
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder={tr("Ví dụ: SGS Vietnam, Control Union, TÜV Rheinland...")}
                        value={newCertForm.issuer}
                        onChange={(e) => setNewCertForm({ ...newCertForm, issuer: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {tr("Số hiệu chứng chỉ / Mã tra cứu OCR")}</label>
                      <input 
                        type="text"
                        placeholder={tr("Ví dụ: VN23/00481-HACCP hoặc GGN-40598839210")}
                        value={newCertForm.certNumber}
                        onChange={(e) => setNewCertForm({ ...newCertForm, certNumber: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {tr("Tiêu chuẩn áp dụng / Mô tả ngắn")}</label>
                      <input 
                        type="text"
                        placeholder={tr("Ví dụ: Tiêu chuẩn an toàn thực phẩm xuất khẩu EU")}
                        value={newCertForm.type}
                        onChange={(e) => setNewCertForm({ ...newCertForm, type: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {tr("Ngày cấp chứng nhận")}</label>
                      <input 
                        type="date"
                        value={newCertForm.issueDate}
                        onChange={(e) => setNewCertForm({ ...newCertForm, issueDate: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {tr("Ngày hết hạn hiệu lực")}</label>
                      <input 
                        type="date"
                        value={newCertForm.expiryDate}
                        onChange={(e) => setNewCertForm({ ...newCertForm, expiryDate: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                      />
                    </div>
                  </div>

                  {/* File Upload Box */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {tr("Tệp đính kèm bản scan (PDF, JPG, PNG) ")}<span className="text-rose-500">{tr("*")}</span>
                    </label>
                    <div className="p-4 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/30 flex flex-col items-center justify-center text-center hover:bg-teal-50/60 transition-colors">
                      <FileCheck className="w-8 h-8 text-teal-700 mb-1.5" />
                      <p className="text-xs font-bold text-slate-800">
                        {tr(newCertForm.fileName || 'ChungChi_DoiSoat_VietAgri.pdf')}
                      </p>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        {tr("Dung lượng: ")}{tr(newCertForm.fileSize || '2.5 MB')} {tr(" • Chuẩn hóa OCR tự động")}</span>
                      <div className="mt-2.5 flex items-center gap-2">
                        <label className="px-3 py-1.5 rounded-lg bg-white border border-teal-200 text-teal-800 text-[11px] font-semibold hover:bg-teal-50 cursor-pointer shadow-2xs">
                          {tr("Chọn tệp khác từ máy")}<input 
                            type="file" 
                            accept=".pdf,.png,.jpg,.jpeg" 
                            className="hidden" 
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const f = e.target.files[0];
                                setNewCertForm({
                                  ...newCertForm,
                                  fileName: f.name,
                                  fileSize: `${(f.size / (1024 * 1024)).toFixed(1)} MB`
                                });
                              }
                            }}
                          />
                        </label>
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
                          {tr("Hỗ trợ định dạng PDF, JPG, PNG tối đa 25MB")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button 
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    {tr("Hủy bỏ")}</button>
                  <button 
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#083832] hover:bg-[#062924] text-white text-xs font-bold transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-teal-300" />
                    <span>{tr("Xác nhận & Tải lên đối soát OCR")}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Modal: Chỉnh sửa chứng chỉ / giấy phép (Edit Certificate) */}
            {activeModal === 'edit-cert' && editingCert && (
              <form onSubmit={handleEditCertSubmit} className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                    <Edit3 className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{tr("Chỉnh sửa chứng chỉ / Giấy phép")}</h3>
                    <p className="text-xs text-slate-500">{tr("Cập nhật thông tin chi tiết, số hiệu hoặc thay thế bản scan chứng từ")}</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {tr("Tên chứng chỉ / Giấy phép ")}<span className="text-rose-500">{tr("*")}</span>
                    </label>
                    <input 
                      type="text"
                      required
                      value={editingCert.title}
                      onChange={(e) => setEditingCert({ ...editingCert, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {tr("Nhóm phân loại")}</label>
                      <select 
                        value={editingCert.category}
                        onChange={(e) => setEditingCert({ ...editingCert, category: e.target.value as any })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700 bg-white"
                      >
                        <option value="legal">{tr("Pháp lý doanh nghiệp (ERC)")}</option>
                        <option value="food_safety">{tr("An toàn thực phẩm (HACCP, ISO 22000, FDA)")}</option>
                        <option value="agriculture">{tr("Nông nghiệp & Vùng trồng (GlobalGAP, Organic)")}</option>
                        <option value="other">{tr("Tiêu chuẩn quốc tế khác")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {tr("Tổ chức cấp chứng nhận ")}<span className="text-rose-500">{tr("*")}</span>
                      </label>
                      <input 
                        type="text"
                        required
                        value={editingCert.issuer}
                        onChange={(e) => setEditingCert({ ...editingCert, issuer: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {tr("Số hiệu chứng chỉ / Mã tra cứu")}</label>
                      <input 
                        type="text"
                        value={editingCert.certNumber}
                        onChange={(e) => setEditingCert({ ...editingCert, certNumber: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {tr("Tiêu chuẩn áp dụng")}</label>
                      <input 
                        type="text"
                        value={editingCert.type}
                        onChange={(e) => setEditingCert({ ...editingCert, type: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {tr("Thời hạn hiệu lực hiển thị")}</label>
                      <input 
                        type="text"
                        value={editingCert.date}
                        onChange={(e) => setEditingCert({ ...editingCert, date: e.target.value })}
                        placeholder={tr("Ví dụ: 15/12/2023 - 14/12/2026 hoặc Không thời hạn")}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {tr("Trạng thái hiệu lực")}</label>
                      <input 
                        type="text"
                        value={editingCert.validity}
                        onChange={(e) => setEditingCert({ ...editingCert, validity: e.target.value })}
                        placeholder={tr("Ví dụ: Còn 2 năm hiệu lực, Hiệu lực vĩnh viễn")}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                      />
                    </div>
                  </div>

                  {/* File info in edit */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-teal-700" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">{tr(editingCert.fileName)}</p>
                        <p className="text-[11px] text-slate-400">{tr("Dung lượng: ")}{tr(editingCert.fileSize)} {tr(" • Đã đối soát OCR")}</p>
                      </div>
                    </div>
                    <label className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer">
                      {tr("Thay file scan")}<input 
                        type="file" 
                        accept=".pdf,.png,.jpg,.jpeg" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const f = e.target.files[0];
                            setEditingCert({
                              ...editingCert,
                              fileName: f.name,
                              fileSize: `${(f.size / (1024 * 1024)).toFixed(1)} MB`
                            });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button 
                    type="button"
                    onClick={() => {
                      setActiveModal(null);
                      setEditingCert(null);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    {tr("Hủy bỏ")}</button>
                  <button 
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#083832] hover:bg-[#062924] text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
                  >
                    {tr("Lưu thay đổi")}</button>
                </div>
              </form>
            )}

            {/* Modal: Xác nhận xóa chứng chỉ / giấy phép (Delete Certificate) */}
            {activeModal === 'delete-cert' && deletingCert && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                    <Trash2 className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{tr("Xác nhận xóa giấy phép / chứng nhận")}</h3>
                    <p className="text-xs text-slate-500">{tr("Hành động này sẽ gỡ tài liệu khỏi hồ sơ doanh nghiệp hiển thị với Buyer quốc tế")}</p>
                  </div>
                </div>

                {deletingCert.isMandatory ? (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{tr("CẢNH BÁO QUAN TRỌNG: TÀI LIỆU PHÁP LÝ BẮT BUỘC!")}</span>
                    </div>
                    <p className="text-xs text-rose-700 leading-relaxed">
                      <strong>{tr(deletingCert.title)}</strong> {tr(" là giấy phép đăng ký kinh doanh bắt buộc của doanh nghiệp. Việc xóa tài liệu này sẽ khiến tài khoản mất trạng thái xác minh L1/L2 và có thể bị tạm dừng nhận RFQ từ đối tác xuất khẩu.")}</p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    {tr("Bạn có chắc chắn muốn xóa chứng chỉ chất lượng này khỏi hồ sơ công ty không?")}</div>
                )}

                {/* Details of item to delete */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{tr("Tên chứng chỉ:")}</span>
                    <strong className="text-slate-900 font-bold">{tr(deletingCert.title)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{tr("Số hiệu:")}</span>
                    <span className="font-mono text-slate-800">{tr(deletingCert.certNumber)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{tr("Cơ quan cấp:")}</span>
                    <span className="text-slate-800">{tr(deletingCert.issuer)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{tr("Thời hạn:")}</span>
                    <span className="text-slate-800">{tr(deletingCert.date)}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button 
                    type="button"
                    onClick={() => {
                      setActiveModal(null);
                      setDeletingCert(null);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    {tr("Hủy bỏ, giữ lại")}</button>
                  <button 
                    type="button"
                    onClick={handleDeleteCertConfirm}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{tr("Xác nhận xóa tài liệu")}</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* =========================================================================
          5. TOAST NOTIFICATION
         ========================================================================= */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 text-xs animate-in slide-in-from-bottom-5 duration-200">
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'info' && <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span className="font-medium">{tr(toastMessage.text)}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
