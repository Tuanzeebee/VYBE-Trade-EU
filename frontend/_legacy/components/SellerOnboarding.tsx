'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { DemoUser } from '../lib/demoAuth';
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

interface SellerOnboardingProps {
  account?: DemoUser;
  initialStep?: number;
  onComplete?: (profile: Record<string, string>) => void;
  onLogout: () => void;
  onNavigateHome: () => void;
  onNavigateWorkspace?: (tab?: 'profile' | 'verification') => void;
}

interface CertificateItem {
  id: string;
  name: string;
  issuer: string;
  certNumber: string;
  expiryDate: string;
  fileName: string;
  fileSize: string;
  verified: boolean;
}

export interface ExportProductItem {
  id: string;
  name: string;
  isMain: boolean;
  image: string;
  category: string;
  exportMarkets: string[];
  packaging: string;
  moq: string;
  supplyCapacity: string;
  description: string;
}

export default function SellerOnboarding({ account, initialStep = 2, onComplete, onLogout, onNavigateHome, onNavigateWorkspace }: SellerOnboardingProps) {
  const { tr } = useLanguage();
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [submitError, setSubmitError] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; type: string; date: string; issuer: string } | null>(null);

  // Step 2 State: Export Products list
  const [products, setProducts] = useState<ExportProductItem[]>([
    {
      id: 'prod-1',
      name: 'Cà phê nhân xanh Robusta',
      isMain: true,
      image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&auto=format&fit=crop&q=80',
      category: 'Cà phê & sản phẩm từ cà phê',
      exportMarkets: ['EU', 'Hoa Kỳ', 'Nhật Bản'],
      packaging: '60kg/bao hoặc theo yêu cầu',
      moq: '1',
      supplyCapacity: '500',
      description: 'Cà phê Robusta chất lượng cao, độ ẩm < 12.5%, sàng 16+, phù hợp xuất khẩu sang EU, Hoa Kỳ.'
    },
    {
      id: 'prod-2',
      name: 'Hạt điều nhân',
      isMain: false,
      image: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=500&auto=format&fit=crop&q=80',
      category: 'Hạt điều & sản phẩm từ điều',
      exportMarkets: ['EU', 'Trung Quốc', 'Hàn Quốc'],
      packaging: 'Thùng thiếc 10kg/20kg hút chân không',
      moq: '2',
      supplyCapacity: '200',
      description: 'Hạt điều nhân trắng W240, W320 tiêu chuẩn AFI, độ ẩm < 5%, kiểm soát aflatoxin nghiêm ngặt.'
    }
  ]);

  // Market picker active product ID
  const [marketPickerFor, setMarketPickerFor] = useState<string | null>(null);

  // Add Product Modal State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    isMain: false,
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
    category: 'Gạo & ngũ cốc xuất khẩu',
    exportMarkets: ['EU', 'Bắc Mỹ'],
    packaging: 'Bao PP 25kg/50kg',
    moq: '2',
    supplyCapacity: '300',
    description: ''
  });

  const handleUpdateProduct = (id: string, field: keyof ExportProductItem, value: any) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleToggleMainProduct = (id: string) => {
    setProducts(prev => prev.map(p => ({
      ...p,
      isMain: p.id === id ? !p.isMain : p.isMain
    })));
  };

  const handleRemoveProduct = (id: string) => {
    if (products.length <= 1) {
      alert(tr('Doanh nghiệp cần ít nhất 1 sản phẩm xuất khẩu.'));
      return;
    }
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleRemoveMarketTag = (productId: string, marketToRemove: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          exportMarkets: p.exportMarkets.filter(m => m !== marketToRemove)
        };
      }
      return p;
    }));
  };

  const handleAddMarketTag = (productId: string, newMarket: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId && !p.exportMarkets.includes(newMarket)) {
        return {
          ...p,
          exportMarkets: [...p.exportMarkets, newMarket]
        };
      }
      return p;
    }));
  };

  const handleProductImageUpload = (productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      handleUpdateProduct(productId, 'image', imageUrl);
    }
  };

  const handleSaveNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name) return;
    const newId = `prod-${Date.now()}`;
    setProducts(prev => [
      ...prev,
      {
        id: newId,
        name: newProductForm.name,
        isMain: newProductForm.isMain,
        image: newProductForm.image,
        category: newProductForm.category,
        exportMarkets: newProductForm.exportMarkets,
        packaging: newProductForm.packaging || 'Theo yêu cầu của khách hàng',
        moq: newProductForm.moq || '1',
        supplyCapacity: newProductForm.supplyCapacity || '100',
        description: newProductForm.description || 'Sản phẩm đạt chuẩn xuất khẩu quốc tế.'
      }
    ]);
    setShowAddProductModal(false);
    // Reset form
    setNewProductForm({
      name: '',
      isMain: false,
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
      category: 'Gạo & ngũ cốc xuất khẩu',
      exportMarkets: ['EU', 'Bắc Mỹ'],
      packaging: 'Bao PP 25kg/50kg',
      moq: '2',
      supplyCapacity: '300',
      description: ''
    });
  };

  const PRESET_PRODUCTS = [
    {
      name: 'Gạo ST25 Hữu Cơ',
      category: 'Gạo & ngũ cốc xuất khẩu',
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
      packaging: 'Bao 5kg, 25kg, 50kg hút chân không',
      moq: '5',
      supplyCapacity: '1000',
      description: 'Gạo ST25 chuẩn ngon nhất thế giới, hạt thon dài, thơm lá dứa tự nhiên, không tồn dư thuốc BVTV.'
    },
    {
      name: 'Hồ tiêu đen Chư Sê',
      category: 'Hồ tiêu & gia vị xuất khẩu',
      image: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=500&auto=format&fit=crop&q=80',
      packaging: 'Bao đay 50kg / 60kg theo tiêu chuẩn quốc tế',
      moq: '2',
      supplyCapacity: '150',
      description: 'Tiêu đen sấy khô tự nhiên, dung trọng 550g/l - 580g/l, độ ẩm < 12.5%, tạp chất < 0.2%.'
    },
    {
      name: 'Thanh long ruột đỏ GlobalG.A.P.',
      category: 'Trái cây tươi & chế biến (Thanh long, Sầu riêng)',
      image: 'https://images.unsplash.com/photo-1527325678964-54921661f888?w=500&auto=format&fit=crop&q=80',
      packaging: 'Thùng carton 9kg / 18kg có túi hút khí ethylene',
      moq: '3',
      supplyCapacity: '400',
      description: 'Thanh long ruột đỏ Bình Thuận đạt chuẩn GlobalG.A.P., mã vùng trồng PUC VN-BT-012, tai xanh dày.'
    }
  ];

  // Form State for Step 1: Thông tin doanh nghiệp
  const [formData, setFormData] = useState({
    companyName: account?.company || 'Công ty TNHH Nông sản Việt Trí',
    taxCode: '0314892345',
    businessType: 'TNHH',
    establishedYear: '2018',
    headquartersAddress: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh',
    website: 'https://vietagri-export.vn',
    contactEmail: account?.email || 'contact@vietagri-export.vn'
  });

  // Step 3 State: Giấy phép & Chứng nhận
  const [hasUploadedDkkd, setHasUploadedDkkd] = useState(true);
  const [dkkdData, setDkkdData] = useState({
    docNumber: '0314892345',
    issueDate: '15/03/2018',
    issuePlace: 'Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh',
    legalRep: account?.name || 'Nguyễn Văn Trí',
    fileName: 'Giay_Phep_DKKD_VietAgri_2024.pdf',
    fileSize: '3.2 MB'
  });

  // List of uploaded certificates
  const [certificates, setCertificates] = useState<CertificateItem[]>([
    {
      id: 'cert-1',
      name: 'HACCP Codex Alimentarius',
      issuer: 'SGS Vietnam Ltd.',
      certNumber: 'VN21/00842-HACCP',
      expiryDate: '14/10/2026',
      fileName: 'HACCP_Codex_SGS_VietAgri.pdf',
      fileSize: '2.1 MB',
      verified: true
    },
    {
      id: 'cert-2',
      name: 'ISO 22000:2018 Hệ thống Quản lý ATTP',
      issuer: 'Bureau Veritas Certification',
      certNumber: 'BV-VN-98421-FSMS',
      expiryDate: '31/05/2027',
      fileName: 'ISO22000_2018_BureauVeritas.pdf',
      fileSize: '1.9 MB',
      verified: true
    }
  ]);

  // Add new certificate form toggle & state
  const [showAddCertForm, setShowAddCertForm] = useState(false);
  const [newCert, setNewCert] = useState({
    name: 'GlobalG.A.P. IFA V5.4',
    issuer: 'Control Union Vietnam',
    certNumber: 'GG-VN-2024-0012',
    expiryDate: '2027-12-31',
    fileName: 'GlobalGAP_VietAgri_2024.pdf'
  });

  // Export license / PUC / PHC code
  const [hasExportLicense, setHasExportLicense] = useState(true);
  const [pucCode, setPucCode] = useState('VN-DL-0489 (Mã vùng trồng sầu riêng & thanh long)');
  const [phcCode, setPhcCode] = useState('PHC-VN-102 (Mã cơ sở sơ chế, đóng gói đạt chuẩn EU)');

  // Legal commitment checkbox
  const [agreeCommitment, setAgreeCommitment] = useState(true);

  // Quick picker suggested certificates
  const SUGGESTED_CERTS = [
    'GlobalG.A.P.',
    'VietGAP Trồng trọt',
    'USDA Organic',
    'EU Organic',
    'FDA Food Facility',
    'Halal JAKIM/HIA',
    'BRCGS Food Safety',
    'Fairtrade Mark'
  ];

  const handleAddQuickCert = (certName: string) => {
    const newId = `cert-${Date.now()}`;
    setCertificates([
      ...certificates,
      {
        id: newId,
        name: certName,
        issuer: 'Tổ chức chứng nhận Quốc tế',
        certNumber: `CERT-${Math.floor(10000 + Math.random() * 90000)}`,
        expiryDate: '31/12/2026',
        fileName: `${certName.replace(/[^a-zA-Z0-9]/g, '_')}_Certificate.pdf`,
        fileSize: '2.4 MB',
        verified: true
      }
    ]);
  };

  const handleRemoveCert = (id: string) => {
    setCertificates(certificates.filter(c => c.id !== id));
  };

  const handleAddNewCertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCert.name) return;
    setCertificates([
      ...certificates,
      {
        id: `cert-${Date.now()}`,
        name: newCert.name,
        issuer: newCert.issuer || 'Tổ chức thẩm định',
        certNumber: newCert.certNumber || 'VN-CERT-2024',
        expiryDate: newCert.expiryDate || '2026-12-31',
        fileName: newCert.fileName || 'Chung_chi_dinh_kem.pdf',
        fileSize: '2.5 MB',
        verified: true
      }
    ]);
    setShowAddCertForm(false);
  };

  const finish = () => {
    setSubmitError('');
    if (!onComplete) { setSubmittedSuccess(true); return; }
    try {
      onComplete({ ...formData, country: 'Việt Nam', interest: products.map((p) => p.category).join(', '),
        market: [...new Set(products.flatMap((p) => p.exportMarkets))].join(', '),
        products: JSON.stringify(products.map((p) => ({ ...p, image: p.image.startsWith('blob:') ? '' : p.image }))),
        certificates: JSON.stringify(certificates), pucCode, phcCode, agreeCommitment: String(agreeCommitment) });
    } catch (cause) { setSubmitError(cause instanceof Error ? cause.message : 'Không thể lưu hồ sơ. Vui lòng thử lại.'); }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      finish();
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
                    
                    {/* Loại hình doanh nghiệp * */}
                    <div>
                      <label className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                        {tr("Loại hình doanh nghiệp *")}</label>
                      <div className="relative">
                        <select 
                          required
                          value={formData.businessType}
                          onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] appearance-none cursor-pointer pr-10"
                        >
                          <option value="">{tr("Chọn loại hình")}</option>
                          <option value="TNHH">{tr("Công ty TNHH")}</option>
                          <option value="CP">{tr("Công ty Cổ phần")}</option>
                          <option value="DNTN">{tr("Doanh nghiệp tư nhân")}</option>
                          <option value="HTX">{tr("Hợp tác xã")}</option>
                          <option value="FDI">{tr("Doanh nghiệp có vốn đầu tư nước ngoài (FDI)")}</option>
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
                        {tr("Thêm sản phẩm chính mà doanh nghiệp cung cấp. Bạn có thể thêm nhiều sản phẩm.")}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddProductModal(true)}
                      className="px-4 py-2 rounded-xl bg-[#0b1e2e] hover:bg-[#081622] text-white text-xs sm:text-[13px] font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>{tr("Thêm sản phẩm")}</span>
                    </button>
                  </div>

                  {/* List of Product Cards */}
                  <div className="space-y-4">
                    {products.map((product) => (
                      <div 
                        key={product.id}
                        className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3.5 transition-all text-left"
                      >
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          
                          {/* Left: Product Image Thumbnail with Hover to Change */}
                          <div className="relative group shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs">
                            <img 
                              src={product.image} 
                              alt={tr(product.name)}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                            />
                            {/* Hover overlay with upload button */}
                            <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-semibold gap-1 p-2 text-center backdrop-blur-2xs">
                              <Camera className="w-5 h-5 text-teal-300" />
                              <span>{tr("Đổi hình ảnh")}</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleProductImageUpload(product.id, e)} 
                              />
                            </label>
                          </div>

                          {/* Right: Product Details Form Fields */}
                          <div className="flex-1 min-w-0 w-full space-y-3">
                            
                            {/* Title & Actions Bar */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                                <input
                                  type="text"
                                  value={product.name}
                                  onChange={(e) => handleUpdateProduct(product.id, 'name', e.target.value)}
                                  className="text-base sm:text-lg font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#083832] focus:outline-none px-0 py-0.5"
                                  placeholder={tr("Tên sản phẩm")}
                                />
                                {product.isMain && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#e6f4f2] text-[#0d766e] border border-[#99f6e4]/60 whitespace-nowrap">
                                    {tr("Sản phẩm chính")}</span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {/* More Menu / Toggle Main */}
                                <button 
                                  type="button"
                                  onClick={() => handleToggleMainProduct(product.id)}
                                  title={tr(product.isMain ? "Bỏ đánh dấu sản phẩm chính" : "Đặt làm sản phẩm chính")}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {/* Remove Product */}
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveProduct(product.id)}
                                  title={tr("Xóa sản phẩm")}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Row 1: Danh mục & Thị trường xuất khẩu */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              
                              {/* Danh mục */}
                              <div>
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                  {tr("Danh mục")}</label>
                                <div className="relative">
                                  <select
                                    value={product.category}
                                    onChange={(e) => handleUpdateProduct(product.id, 'category', e.target.value)}
                                    className="w-full appearance-none px-3.5 py-2 pr-8 rounded-xl border border-slate-200 bg-white text-xs sm:text-[13px] text-slate-800 font-normal focus:outline-none focus:border-[#083832] transition-colors"
                                  >
                                    <option value="Cà phê & sản phẩm từ cà phê">{tr("Cà phê & sản phẩm từ cà phê")}</option>
                                    <option value="Hạt điều & sản phẩm từ điều">{tr("Hạt điều & sản phẩm từ điều")}</option>
                                    <option value="Gạo & ngũ cốc xuất khẩu">{tr("Gạo & ngũ cốc xuất khẩu")}</option>
                                    <option value="Hồ tiêu & gia vị xuất khẩu">{tr("Hồ tiêu & gia vị xuất khẩu")}</option>
                                    <option value="Thủy hải sản (Tôm, Cá tra, Mực)">{tr("Thủy hải sản (Tôm, Cá tra, Mực)")}</option>
                                    <option value="Trái cây tươi & chế biến (Thanh long, Sầu riêng)">{tr("Trái cây tươi & chế biến (Thanh long, Sầu riêng)")}</option>
                                    <option value="Trà & thảo mộc xuất khẩu">{tr("Trà & thảo mộc xuất khẩu")}</option>
                                    <option value="Thực phẩm chế biến đóng gói">{tr("Thực phẩm chế biến đóng gói")}</option>
                                  </select>
                                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                              </div>

                              {/* Thị trường xuất khẩu */}
                              <div>
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                  {tr("Thị trường xuất khẩu")}</label>
                                <div className="flex items-center flex-wrap gap-1.5 p-1 rounded-xl border border-slate-200 bg-white min-h-[38px]">
                                  {product.exportMarkets.map((market) => (
                                    <span 
                                      key={market}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f1f5f9] text-slate-700 text-xs font-normal border border-slate-200/60"
                                    >
                                      <span>{tr(market)}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMarketTag(product.id, market)}
                                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                      >
                                        <X className="w-3 h-3 stroke-[2.5]" />
                                      </button>
                                    </span>
                                  ))}
                                  
                                  {/* Add Market tag button */}
                                  <div className="relative inline-block">
                                    <button
                                      type="button"
                                      onClick={() => setMarketPickerFor(marketPickerFor === product.id ? null : product.id)}
                                      className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer text-xs"
                                      title={tr("Thêm thị trường")}
                                    >
                                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                    </button>
                                    
                                    {/* Market Picker Dropdown */}
                                    {marketPickerFor === product.id && (
                                      <div className="absolute left-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg p-2 w-52 text-left space-y-1">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">
                                          {tr("Chọn thị trường")}</div>
                                        {['EU', 'Hoa Kỳ', 'Nhật Bản', 'Trung Quốc', 'Hàn Quốc', 'Úc', 'Trung Đông', 'Canada', 'Anh (UK)'].filter(m => !product.exportMarkets.includes(m)).map(m => (
                                          <button
                                            key={m}
                                            type="button"
                                            onClick={() => {
                                              handleAddMarketTag(product.id, m);
                                              setMarketPickerFor(null);
                                            }}
                                            className="w-full text-left px-2.5 py-1 rounded-lg text-xs hover:bg-slate-100 text-slate-700 cursor-pointer flex items-center justify-between"
                                          >
                                            <span>{tr(m)}</span>
                                            <Plus className="w-3 h-3 text-slate-400" />
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                            </div>

                            {/* Row 2: 3 Columns (Quy cách đóng gói | MOQ (tấn) | Năng lực cung ứng (tấn/tháng)) */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              
                              <div>
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                  {tr("Quy cách đóng gói")}</label>
                                <input
                                  type="text"
                                  value={product.packaging}
                                  onChange={(e) => handleUpdateProduct(product.id, 'packaging', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-[#083832]"
                                  placeholder={tr("60kg/bao hoặc theo yêu cầu")}
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                  {tr("MOQ (tấn)")}</label>
                                <input
                                  type="text"
                                  value={product.moq}
                                  onChange={(e) => handleUpdateProduct(product.id, 'moq', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-[#083832]"
                                  placeholder={tr("1")}
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                  {tr("Năng lực cung ứng (tấn/tháng)")}</label>
                                <input
                                  type="text"
                                  value={product.supplyCapacity}
                                  onChange={(e) => handleUpdateProduct(product.id, 'supplyCapacity', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-[#083832]"
                                  placeholder={tr("500")}
                                />
                              </div>

                            </div>

                            {/* Row 3: Mô tả sản phẩm with Character Counter (106/500) */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-medium text-slate-500">
                                  {tr("Mô tả sản phẩm")}</label>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {tr(product.description.length)}{tr("/500")}</span>
                              </div>
                              <textarea
                                rows={2}
                                maxLength={500}
                                value={product.description}
                                onChange={(e) => handleUpdateProduct(product.id, 'description', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-[#083832] resize-none leading-relaxed"
                                placeholder={tr("Mô tả chất lượng, tiêu chuẩn kiểm nghiệm, độ ẩm...")}
                              />
                            </div>

                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

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
                      onClick={() => setCurrentStep(3)}
                      className="px-7 py-2.5 rounded-xl bg-[#083832] hover:bg-[#062924] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <span>{tr("Tiếp tục (Tải lên giấy phép)")}</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>

                </div>
              )}

              {/* Step 3 Form Body (Tải lên giấy phép & chứng nhận) */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  
                  {/* Status Banner: Estimated Verification Level */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#083832]/10 via-[#0d9488]/10 to-slate-50 border border-[#0d9488]/20 flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#083832] text-teal-300 flex items-center justify-center shrink-0 shadow-xs">
                      <ShieldCheck className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs sm:text-[13px] font-bold text-slate-900">
                          {tr("Cấp độ thẩm định dự kiến:")}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {tr("🛡️ L2 Enhanced Verified")}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal">
                        {tr("Hồ sơ của bạn đã có ")}<strong>{tr("Giấy ĐKKD")}</strong> {tr(" (+ L1) và ")}<strong>{tr(certificates.length)} {tr(" chứng nhận quốc tế")}</strong> {tr(" hợp lệ (+ L2). Đạt cấp độ L2 giúp hồ sơ hiển thị ưu tiên với hơn 10,000+ Buyer quốc tế tại EU & Bắc Mỹ.")}</p>
                    </div>
                  </div>

                  {/* -------------------------------------------------------------
                      SECTION 1: GIẤY PHÉP ĐĂNG KÝ KINH DOANH (ĐKKD) - BẮT BUỘC
                     ------------------------------------------------------------- */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#083832] text-white text-[11px] font-bold flex items-center justify-center">
                          {tr("1")}</span>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                          {tr("Giấy chứng nhận Đăng ký Doanh nghiệp (ĐKKD / ERC) *")}</h3>
                      </div>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                        {tr("Bắt buộc cho L1")}</span>
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-500 font-normal">
                      {tr("Tải lên bản chụp hoặc quét bản gốc có dấu mộc đỏ của Sở Kế hoạch và Đầu tư (Hỗ trợ PDF, PNG, JPG tối đa 15MB).")}</p>

                    {/* Uploaded File Card Display */}
                    {hasUploadedDkkd ? (
                      <div className="rounded-2xl border border-teal-200/80 bg-teal-50/30 p-4 transition-all">
                        <div className="flex items-start justify-between gap-3">
                          
                          {/* File Icon & Info */}
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-white border border-rose-200 shadow-xs flex flex-col items-center justify-center text-rose-600 shrink-0">
                              <FileText className="w-5 h-5" />
                              <span className="text-[8px] font-bold -mt-0.5 uppercase tracking-tighter">{tr("PDF")}</span>
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs sm:text-[13px] font-bold text-slate-900 truncate">
                                {tr(dkkdData.fileName)}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {tr(dkkdData.fileSize)} {tr(" • Đã quét AI OCR hợp lệ • Tải lên: 15/03/2024")}</p>
                              <div className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200/60">
                                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
                                <span>{tr("Dữ liệu khớp 100% Cổng thông tin Quốc gia (MST: ")}{tr(formData.taxCode)}{tr(")")}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({
                                title: 'Giấy chứng nhận Đăng ký Doanh nghiệp',
                                type: 'ĐKKD / ERC (Bản gốc Scan)',
                                date: dkkdData.issueDate,
                                issuer: dkkdData.issuePlace
                              })}
                              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#083832] hover:border-[#083832] transition-colors cursor-pointer"
                              title={tr("Xem trước tài liệu")}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setHasUploadedDkkd(false)}
                              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                              title={tr("Xóa tài liệu")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                        </div>

                        {/* OCR Extracted Details Grid */}
                        <div className="mt-3 pt-3 border-t border-teal-200/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-left">
                          <div className="bg-white/80 p-2 rounded-xl border border-teal-100">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">{tr("Mã số thuế / MST")}</span>
                            <span className="text-xs font-bold text-slate-800">{tr(dkkdData.docNumber)}</span>
                          </div>
                          <div className="bg-white/80 p-2 rounded-xl border border-teal-100">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">{tr("Ngày cấp lần đầu")}</span>
                            <span className="text-xs font-bold text-slate-800">{tr(dkkdData.issueDate)}</span>
                          </div>
                          <div className="bg-white/80 p-2 rounded-xl border border-teal-100 sm:col-span-2">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">{tr("Cơ quan cấp")}</span>
                            <span className="text-xs font-bold text-slate-800 truncate block">{tr(dkkdData.issuePlace)}</span>
                          </div>
                        </div>

                      </div>
                    ) : (
                      /* Drag & Drop Upload Zone if removed */
                      <div 
                        onClick={() => setHasUploadedDkkd(true)}
                        className="border-2 border-dashed border-slate-300 hover:border-[#083832] bg-slate-50 hover:bg-slate-100/70 rounded-2xl p-6 text-center cursor-pointer transition-colors"
                      >
                        <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs sm:text-sm font-semibold text-slate-800">
                          {tr("Nhấp để tải lên hoặc kéo thả Giấy phép ĐKKD vào đây")}</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {tr("Hỗ trợ định dạng PDF, JPG, PNG tối đa 15MB")}</p>
                      </div>
                    )}
                  </div>

                  {/* -------------------------------------------------------------
                      SECTION 2: CHỨNG NHẬN QUỐC TẾ & TIÊU CHUẨN (NÂNG L2/L3)
                     ------------------------------------------------------------- */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#083832] text-white text-[11px] font-bold flex items-center justify-center">
                          {tr("2")}</span>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                          {tr("Chứng nhận tiêu chuẩn xuất khẩu & An toàn thực phẩm")}</h3>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {tr("Nâng hạng L2 / L3")}</span>
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-500 font-normal">
                      {tr("Cung cấp các chứng nhận còn hiệu lực để tăng tỷ lệ chốt đơn RFQ với Buyer toàn cầu.")}</p>

                    {/* Quick suggested certificates pills */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                        {tr("Thêm nhanh các chứng nhận phổ biến:")}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTED_CERTS.map(cert => (
                          <button
                            key={cert}
                            type="button"
                            onClick={() => handleAddQuickCert(cert)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white hover:bg-[#083832] text-slate-700 hover:text-white border border-slate-200 hover:border-[#083832] transition-colors cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs"
                          >
                            <Plus className="w-3 h-3 stroke-[2.5]" />
                            <span>{tr(cert)}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Uploaded Certificate Items List */}
                    <div className="space-y-2.5 pt-1">
                      {certificates.map(cert => (
                        <div 
                          key={cert.id}
                          className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 hover:border-slate-300 transition-colors shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                                <Award className="w-5 h-5" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-900">
                                    {tr(cert.name)}
                                  </h4>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                    {tr("✓ Hợp lệ")}</span>
                                </div>

                                <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                  <span>{tr("Tổ chức cấp: ")}<strong className="text-slate-700">{tr(cert.issuer)}</strong></span>
                                  <span>{tr("Số hiệu: ")}<strong className="text-slate-700">{tr(cert.certNumber)}</strong></span>
                                  <span>{tr("Hạn đến: ")}<strong className="text-slate-700">{tr(cert.expiryDate)}</strong></span>
                                </div>

                                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{tr(cert.fileName)} {tr(" (")}{tr(cert.fileSize)}{tr(")")}</span>
                                </div>
                              </div>
                            </div>

                            {/* View & Delete Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setPreviewDoc({
                                  title: `Chứng nhận tiêu chuẩn: ${cert.name}`,
                                  type: `Chứng chỉ Quốc tế (${cert.certNumber})`,
                                  date: `Hiệu lực đến: ${cert.expiryDate}`,
                                  issuer: cert.issuer
                                })}
                                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-[#083832] transition-colors cursor-pointer"
                                title={tr("Xem trước tài liệu")}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveCert(cert.id)}
                                className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                                title={tr("Xóa chứng chỉ")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Toggle Button / Inline Add Custom Certificate Form */}
                    {!showAddCertForm ? (
                      <button
                        type="button"
                        onClick={() => setShowAddCertForm(true)}
                        className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-[#083832] text-xs font-semibold text-slate-700 hover:text-[#083832] bg-slate-50/70 hover:bg-slate-100 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{tr("+ Thêm chứng nhận quốc tế khác")}</span>
                      </button>
                    ) : (
                      <form onSubmit={handleAddNewCertSubmit} className="p-4 rounded-2xl border border-teal-200 bg-teal-50/20 space-y-3 text-left">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900">{tr("Thêm chứng nhận mới")}</h4>
                          <button 
                            type="button" 
                            onClick={() => setShowAddCertForm(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">{tr("Tên chứng nhận *")}</label>
                            <input 
                              type="text" 
                              required
                              value={newCert.name}
                              onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
                              placeholder={tr("VD: GlobalG.A.P., VietGAP...")}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-[#083832]"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">{tr("Tổ chức chứng nhận *")}</label>
                            <input 
                              type="text" 
                              required
                              value={newCert.issuer}
                              onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })}
                              placeholder={tr("VD: SGS, Bureau Veritas, TUV...")}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-[#083832]"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">{tr("Số chứng chỉ / Serial")}</label>
                            <input 
                              type="text" 
                              value={newCert.certNumber}
                              onChange={(e) => setNewCert({ ...newCert, certNumber: e.target.value })}
                              placeholder={tr("VD: VN-2024-CERT")}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-[#083832]"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">{tr("Ngày hết hạn *")}</label>
                            <input 
                              type="date" 
                              required
                              value={newCert.expiryDate}
                              onChange={(e) => setNewCert({ ...newCert, expiryDate: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-[#083832]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">{tr("Đính kèm tập tin (PDF/JPG) *")}</label>
                          <input 
                            type="file" 
                            className="w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#083832] file:text-white hover:file:bg-[#062924] cursor-pointer"
                          />
                        </div>

                        <div className="pt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAddCertForm(false)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            {tr("Hủy")}</button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 rounded-lg bg-[#083832] text-white text-xs font-semibold hover:bg-[#062924]"
                          >
                            {tr("Lưu chứng nhận")}</button>
                        </div>
                      </form>
                    )}

                  </div>

                  {/* -------------------------------------------------------------
                      SECTION 3: MÃ SỐ VÙNG TRỒNG (PUC) & CƠ SỞ ĐÓNG GÓI (PHC)
                     ------------------------------------------------------------- */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#083832] text-white text-[11px] font-bold flex items-center justify-center">
                          {tr("3")}</span>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                          {tr("Mã số vùng trồng (PUC) & Mã cơ sở đóng gói (PHC)")}</h3>
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {tr("Tùy chọn xuất khẩu")}</span>
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-500 font-normal">
                      {tr("Cực kỳ quan trọng với các lô hàng Nông sản & Trái cây xuất khẩu sang thị trường Châu Âu (EU), Mỹ và Trung Quốc (GACC).")}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          {tr("Mã số vùng trồng (PUC)")}</label>
                        <input 
                          type="text"
                          value={pucCode}
                          onChange={(e) => setPucCode(e.target.value)}
                          placeholder={tr("VD: VN-DL-0489")}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#083832]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          {tr("Mã cơ sở đóng gói (PHC)")}</label>
                        <input 
                          type="text"
                          value={phcCode}
                          onChange={(e) => setPhcCode(e.target.value)}
                          placeholder={tr("VD: PHC-VN-102")}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#083832]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* -------------------------------------------------------------
                      SECTION 4: BẢO MẬT & CAM KẾT PHÁP LÝ
                     ------------------------------------------------------------- */}
                  <div className="pt-2 space-y-3">
                    
                    {/* Security Notice Box */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-slate-600">
                      <Lock className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed">
                        <strong>{tr("Bảo mật thông tin 256-bit:")}</strong> {tr(" Toàn bộ giấy phép và chứng nhận chỉ phục vụ quy trình thẩm định nội bộ của VYBE Trade và sẽ được che mờ các thông tin nhạy cảm trước khi hiển thị tóm tắt chứng nhận với Buyer quốc tế.")}</p>
                    </div>

                    {/* Legal Checkbox */}
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

                  </div>

                  {/* -------------------------------------------------------------
                      BOTTOM ACTIONS: BACK & PROCEED BUTTONS
                     ------------------------------------------------------------- */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button 
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {tr("Quay lại")}</button>
                    <button 
                      type="button"
                      disabled={!agreeCommitment || !hasUploadedDkkd}
                      onClick={() => setCurrentStep(4)}
                      className="px-7 py-2.5 rounded-xl bg-[#083832] hover:bg-[#062924] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
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
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200/80 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {tr("Hồ sơ đủ điều kiện cấp chứng thư L2 Enhanced Verified")}</h4>
                      <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                        {tr("Dữ liệu pháp lý và ")}{tr(certificates.length)} {tr(" chứng nhận quốc tế đã qua bước kiểm tra OCR tự động.")}</p>
                    </div>
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
                        <div><span className="text-slate-500">{tr("Loại hình:")}</span> <strong className="text-slate-900">{tr(formData.businessType)}</strong></div>
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
                          <div key={p.id} className="flex items-center justify-between flex-wrap gap-1 p-2 rounded-xl bg-white border border-slate-200/60">
                            <div className="flex items-center gap-2">
                              <img src={p.image} alt={tr(p.name)} className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{tr(p.name)}</span>
                                  {p.isMain && (
                                    <span className="text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded-full font-semibold border border-teal-200">
                                      {tr("Chính")}</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {tr(p.category)} {tr(" • Thị trường: ")}{p.exportMarkets.map(tr).join(', ')}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold text-slate-800">{tr(p.supplyCapacity)} {tr(" tấn/tháng")}</span>
                              <span className="text-[10px] text-slate-400 block">{tr("MOQ: ")}{tr(p.moq)} {tr(" tấn")}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 3 Summary */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-[13px]">{tr("3. Giấy phép & Chứng nhận đã tải")}</span>
                        <button onClick={() => setCurrentStep(3)} className="text-[11px] text-teal-700 font-semibold hover:underline">{tr("Sửa")}</button>
                      </div>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{tr("Giấy phép ĐKKD: ")}<strong>{tr(dkkdData.fileName)}</strong> {tr(" (Số: ")}{tr(dkkdData.docNumber)}{tr(")")}</span>
                        </div>
                        {certificates.map(c => (
                          <div key={c.id} className="flex items-center gap-1.5 text-slate-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{tr(c.name)} {tr(" (Cấp bởi: ")}{tr(c.issuer)} {tr(" - Hạn đến: ")}{tr(c.expiryDate)}{tr(")")}</span>
                          </div>
                        ))}
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

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0b1e2e] text-teal-300 flex items-center justify-center">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {tr("Thêm sản phẩm xuất khẩu mới")}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {tr("Khai báo thông số kỹ thuật, hình ảnh và năng lực cung ứng")}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200/70 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveNewProduct} className="p-6 overflow-y-auto flex-1 space-y-4 text-left">
              
              {/* Quick Presets Bar */}
              <div className="p-3 rounded-2xl bg-teal-50/50 border border-teal-200/60">
                <span className="text-[11px] font-bold text-teal-900 block mb-1.5">
                  {tr("Gợi ý thêm nhanh nông sản xuất khẩu chủ lực:")}</span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_PRODUCTS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setNewProductForm({
                        ...newProductForm,
                        name: preset.name,
                        category: preset.category,
                        image: preset.image,
                        packaging: preset.packaging,
                        moq: preset.moq,
                        supplyCapacity: preset.supplyCapacity,
                        description: preset.description
                      })}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-[#083832] text-slate-700 hover:text-white border border-slate-200 hover:border-[#083832] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{tr(preset.name)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Image & Main Checkbox */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="relative group w-20 h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                  <img src={newProductForm.image} alt={tr("Preview")} className="w-full h-full object-cover" />
                  <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center text-[9px] font-semibold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-4 h-4" />
                    <span>{tr("Đổi ảnh")}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setNewProductForm({ ...newProductForm, image: URL.createObjectURL(file) });
                        }
                      }} 
                    />
                  </label>
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-800">{tr("Hình ảnh sản phẩm")}</div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {tr("Tải lên hình ảnh sản phẩm thực tế hoặc chọn mẫu nông sản đạt chuẩn ở trên.")}</p>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={newProductForm.isMain}
                      onChange={(e) => setNewProductForm({ ...newProductForm, isMain: e.target.checked })}
                      className="rounded text-teal-800 focus:ring-teal-700 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      {tr("Đặt làm ")}<strong>{tr("Sản phẩm chính")}</strong> {tr(" của doanh nghiệp")}</span>
                  </label>
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Tên sản phẩm *")}</label>
                <input 
                  type="text"
                  required
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                  placeholder={tr("VD: Cà phê Robusta Đắk Lắk, Gạo ST25...")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#083832]"
                />
              </div>

              {/* Category & Markets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr("Danh mục ngành hàng *")}</label>
                  <select
                    value={newProductForm.category}
                    onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#083832]"
                  >
                    <option value="Cà phê & sản phẩm từ cà phê">{tr("Cà phê & sản phẩm từ cà phê")}</option>
                    <option value="Hạt điều & sản phẩm từ điều">{tr("Hạt điều & sản phẩm từ điều")}</option>
                    <option value="Gạo & ngũ cốc xuất khẩu">{tr("Gạo & ngũ cốc xuất khẩu")}</option>
                    <option value="Hồ tiêu & gia vị xuất khẩu">{tr("Hồ tiêu & gia vị xuất khẩu")}</option>
                    <option value="Thủy hải sản (Tôm, Cá tra, Mực)">{tr("Thủy hải sản (Tôm, Cá tra, Mực)")}</option>
                    <option value="Trái cây tươi & chế biến (Thanh long, Sầu riêng)">{tr("Trái cây tươi & chế biến (Thanh long, Sầu riêng)")}</option>
                    <option value="Trà & thảo mộc xuất khẩu">{tr("Trà & thảo mộc xuất khẩu")}</option>
                    <option value="Thực phẩm chế biến đóng gói">{tr("Thực phẩm chế biến đóng gói")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr("Thị trường xuất khẩu mục tiêu")}</label>
                  <div className="flex flex-wrap gap-1.5 p-1 rounded-xl border border-slate-200 bg-white min-h-[42px] items-center">
                    {newProductForm.exportMarkets.map((market) => (
                      <span 
                        key={market}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs"
                      >
                        <span>{tr(market)}</span>
                        <button
                          type="button"
                          onClick={() => setNewProductForm({
                            ...newProductForm,
                            exportMarkets: newProductForm.exportMarkets.filter(m => m !== market)
                          })}
                          className="hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {['EU', 'Hoa Kỳ', 'Nhật Bản', 'Trung Quốc', 'Hàn Quốc', 'Úc'].filter(m => !newProductForm.exportMarkets.includes(m)).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setNewProductForm({
                          ...newProductForm,
                          exportMarkets: [...newProductForm.exportMarkets, m]
                        })}
                        className="text-[11px] text-teal-800 hover:bg-teal-50 px-2 py-0.5 rounded-md border border-dashed border-teal-200"
                      >
                        {tr("+ ")}{tr(m)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Packaging, MOQ, Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr("Quy cách đóng gói")}</label>
                  <input 
                    type="text"
                    value={newProductForm.packaging}
                    onChange={(e) => setNewProductForm({ ...newProductForm, packaging: e.target.value })}
                    placeholder={tr("VD: Bao 25kg, thùng 10kg...")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#083832]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr("MOQ (tấn)")}</label>
                  <input 
                    type="text"
                    value={newProductForm.moq}
                    onChange={(e) => setNewProductForm({ ...newProductForm, moq: e.target.value })}
                    placeholder={tr("VD: 1")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#083832]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr("Năng lực cung ứng (tấn/tháng)")}</label>
                  <input 
                    type="text"
                    value={newProductForm.supplyCapacity}
                    onChange={(e) => setNewProductForm({ ...newProductForm, supplyCapacity: e.target.value })}
                    placeholder={tr("VD: 500")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#083832]"
                  />
                </div>
              </div>

              {/* Description with Character Counter */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {tr("Mô tả sản phẩm")}</label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {tr(newProductForm.description.length)}{tr("/500")}</span>
                </div>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={newProductForm.description}
                  onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
                  placeholder={tr("Mô tả chất lượng, tiêu chuẩn kiểm nghiệm, độ ẩm...")}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#083832] resize-none"
                />
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {tr("Hủy")}</button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[#083832] hover:bg-[#062924] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  {tr("Lưu sản phẩm")}</button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#083832] text-teal-300 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {tr(previewDoc.title)}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span>{tr(previewDoc.type)}</span>
                    <span>{tr("•")}</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.2]" />
                      {tr("Đã xác thực OCR")}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200/70 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Viewer Canvas Mockup */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100/70 flex justify-center">
              <div className="w-full max-w-xl bg-white border border-slate-200/90 shadow-md rounded-xl p-6 sm:p-8 text-left font-serif text-slate-800 relative select-none">
                
                {/* Official Vietnam Crest / Header Mockup */}
                <div className="text-center pb-5 border-b border-slate-200/80 mb-5">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
                    {tr("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM")}</p>
                  <p className="text-[9px] sm:text-[11px] font-semibold text-slate-600 font-sans mt-0.5">
                    {tr("Độc lập - Tự do - Hạnh phúc")}</p>
                  <div className="w-24 h-0.5 bg-slate-400 mx-auto mt-2" />
                  
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide mt-5 font-sans">
                    {tr(previewDoc.title)}
                  </h2>
                  <p className="text-[10px] text-slate-500 font-sans mt-1">
                    {tr(previewDoc.type)} {tr(" • Mã tra cứu: VN-2024-VYBE-OCR-98421")}</p>
                </div>

                {/* Content Body */}
                <div className="space-y-3 text-xs font-sans leading-relaxed text-slate-700">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">{tr("Tên doanh nghiệp:")}</span>
                    <span className="col-span-2 font-bold text-slate-900">{formData.companyName}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">{tr("Mã số thuế / MST:")}</span>
                    <span className="col-span-2 font-bold text-slate-900">{tr(formData.taxCode)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">{tr("Người đại diện:")}</span>
                    <span className="col-span-2 font-semibold text-slate-800">{tr(dkkdData.legalRep)} {tr(" (Giám đốc)")}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">{tr("Cơ quan / Tổ chức cấp:")}</span>
                    <span className="col-span-2 font-semibold text-slate-800">{tr(previewDoc.issuer)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">{tr("Thời hạn / Ngày cấp:")}</span>
                    <span className="col-span-2 font-semibold text-slate-800">{tr(previewDoc.date)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">{tr("Trụ sở đăng ký:")}</span>
                    <span className="col-span-2 text-slate-700">{tr(formData.headquartersAddress)}</span>
                  </div>
                </div>

                {/* Seal Stamp Mockup (Red Circle) */}
                <div className="mt-8 pt-4 border-t border-dashed border-slate-200 flex items-center justify-between font-sans">
                  <div className="text-[10px] text-slate-400">
                    <div>{tr("Chứng thư điện tử được đối soát số bởi:")}</div>
                    <div className="font-semibold text-teal-800">{tr("VYBE TRADE TRUST VERIFICATION ENGINE")}</div>
                  </div>
                  
                  {/* Red circular stamp simulation */}
                  <div className="w-20 h-20 rounded-full border-2 border-rose-600 text-rose-600 flex flex-col items-center justify-center p-1 text-center -rotate-12 select-none shadow-xs">
                    <span className="text-[7px] font-bold uppercase tracking-tighter">{tr("SỞ KH & ĐT / ACCREDITATION")}</span>
                    <span className="text-xs">{tr("★")}</span>
                    <span className="text-[7px] font-bold uppercase tracking-tighter">{tr("ĐÃ XÁC THỰC")}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-white">
              <span className="text-[11px] text-slate-400">
                {tr("Tài liệu bảo mật nội bộ theo tiêu chuẩn ISO/IEC 27001")}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 rounded-xl bg-[#083832] text-white text-xs font-semibold hover:bg-[#062924] transition-colors cursor-pointer"
                >
                  {tr("Đóng bản xem")}</button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Success Modal */}
      {submittedSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-xs">
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>
            
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 mb-2">
              {tr("🛡️ Cấp độ dự kiến: L2 Enhanced Verified")}</span>

            <h3 className="text-xl font-bold text-slate-900 mb-2">{tr("Hồ sơ thẩm định đã gửi thành công!")}</h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed max-w-md mx-auto">
              {tr("Hồ sơ doanh nghiệp, sản phẩm xuất khẩu và các chứng chỉ (ĐKKD, ISO 22000, HACCP) đã được đối soát OCR và ghi nhận vào không gian làm việc của Seller.")}</p>

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
