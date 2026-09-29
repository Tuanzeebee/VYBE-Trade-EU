'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Handshake, 
  Gem, 
  Eye, 
  Target, 
  Check, 
  ArrowRight, 
  ChevronRight, 
  Globe, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Award, 
  Sparkles, 
  X, 
  CheckCircle2, 
  Calendar,
  Send,
  ExternalLink,
  Sprout
} from 'lucide-react';
import { useLanguage } from "../context/LanguageContext";

interface AboutUsPageProps {
  onNavigateHome: () => void;
  onNavigateDirectory: () => void;
  onNavigateSolutions: () => void;
  onNavigatePricing: () => void;
  onNavigateOnboarding: () => void;
}

export default function AboutUsPage({
  onNavigateHome,
  onNavigateDirectory,
  onNavigateSolutions,
  onNavigatePricing,
  onNavigateOnboarding
}: AboutUsPageProps) {
  const { tr } = useLanguage();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [activeAudienceDetail, setActiveAudienceDetail] = useState<string | null>(null);

  const [contactForm, setContactForm] = useState({
    fullName: 'Nguyễn Văn Trí',
    organization: 'Công ty TNHH Nông Sản Việt',
    email: 'contact@vietagri-export.vn',
    phone: '(+84) 91 888 2345',
    topic: 'partnership',
    message: 'Chúng tôi muốn tìm hiểu thêm về việc hợp tác xúc tiến thương mại nông sản và ứng dụng bộ giải pháp xác thực của VYBE Trade.'
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
  };

  return (
    <div className="w-full bg-[#f8fafc] text-slate-900 pb-20 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* =========================================================================
          1. HERO BANNER: KIẾN TẠO NIỀM TIN CHO THƯƠNG MẠI NÔNG SẢN VIỆT NAM
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-10 mb-8 sm:mb-10">
        <div className="relative w-full rounded-3xl bg-gradient-to-r from-[#eff6ff] via-[#f0fdf4] to-[#ecfdf5] border border-slate-200/80 p-7 sm:p-10 lg:p-12 overflow-hidden shadow-xs">
          
          {/* Background Decorative Panorama Elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-90">
            {/* World Map Outline SVG */}
            <svg 
              className="absolute right-0 top-0 w-full lg:w-2/3 h-full opacity-15 text-slate-400" 
              viewBox="0 0 1000 400" 
              fill="currentColor"
            >
              <circle cx="200" cy="120" r="2" />
              <circle cx="220" cy="140" r="1.5" />
              <circle cx="350" cy="100" r="2" />
              <circle cx="480" cy="90" r="2.5" />
              <circle cx="520" cy="110" r="2" />
              <circle cx="650" cy="150" r="2" />
              <circle cx="780" cy="180" r="2.5" />
              <circle cx="820" cy="190" r="3" />
              <circle cx="850" cy="220" r="2" />
              <path d="M 680,180 Q 750,150 820,190" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" fill="none" />
              <path d="M 500,100 Q 660,120 820,190" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" fill="none" />
            </svg>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            
            {/* Left Column: Heading, Subtitle & Branding */}
            <div className="lg:col-span-6 xl:col-span-6">
              
              {/* Kicker tag with blue vertical bar */}
              <div className="inline-flex items-center gap-2 mb-4 select-none">
                <span className="w-1 h-4 rounded-full bg-blue-600 inline-block"></span>
                <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">
                  {tr("VỀ VYBE TRADE")}</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-slate-900 tracking-tight leading-[1.2] mb-4">
                {tr("Kiến tạo niềm tin cho")}<br className="hidden sm:inline" /> {tr(" thương mại nông sản Việt Nam")}</h1>

              {/* Subheadline Text */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal mb-6">
                {tr("VYBE TRADE là nền tảng tin cậy kết nối doanh nghiệp xuất khẩu Việt Nam với người mua quốc tế, đặc biệt trong lĩnh vực thực phẩm và nông sản, hướng tới một nền thương mại minh bạch, bền vững và thịnh vượng hơn.")}</p>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsContactModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{tr("Liên hệ hợp tác")}</span>
                </button>

                <button
                  onClick={onNavigateSolutions}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <span>{tr("Khám phá bộ giải pháp")}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>

            </div>

            {/* Right Column: Panoramic Illustration (Agricultural Terraces + Seaport Container Ship) */}
            <div className="lg:col-span-6 xl:col-span-6 flex justify-center items-center">
              <div className="relative w-full max-w-lg aspect-[16/9] rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-100/60 via-sky-100/60 to-blue-100/60 border border-emerald-200/50 p-4 shadow-sm flex flex-col justify-between">
                
                {/* Sky & Clouds with Slogan */}
                <div className="flex items-start justify-between relative z-10">
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-xs text-[10px] font-bold text-emerald-800 border border-emerald-200/60">
                    <Sprout className="w-3 h-3 text-emerald-600" />
                    <span>{tr("Nông sản Xanh & Sạch")}</span>
                  </div>

                  {/* Artistic Handwritten Slogan matching image */}
                  <div className="text-right">
                    <span className="font-serif italic font-semibold text-emerald-900 text-base sm:text-lg block tracking-wide drop-shadow-2xs">
                      {tr("\"Nông sản Việt")}</span>
                    <span className="font-serif italic font-bold text-emerald-700 text-xs sm:text-sm block">
                      {tr("Vươn xa thế giới\"")}</span>
                  </div>
                </div>

                {/* SVG Landscape Illustration: Terraces, Port Cranes, Container Ship */}
                <div className="w-full h-32 relative mt-auto">
                  <svg viewBox="0 0 500 160" className="w-full h-full" preserveAspectRatio="none">
                    
                    {/* Sky Gradient */}
                    <defs>
                      <linearGradient id="terraceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#86efac" />
                        <stop offset="100%" stopColor="#15803d" />
                      </linearGradient>
                      <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#0284c7" />
                      </linearGradient>
                      <linearGradient id="shipGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0f172a" />
                        <stop offset="100%" stopColor="#1e293b" />
                      </linearGradient>
                    </defs>

                    {/* Mountain Ridges in Distance */}
                    <path d="M 0,110 Q 70,80 140,110 Q 210,85 280,120 L 280,160 L 0,160 Z" fill="#bbf7d0" opacity="0.6" />

                    {/* Terraced Agricultural Hills (Left side) */}
                    <path d="M 0,90 Q 60,70 120,95 Q 160,110 200,140 L 200,160 L 0,160 Z" fill="url(#terraceGrad)" />
                    <path d="M 0,105 Q 40,90 90,110 Q 140,125 180,150 L 180,160 L 0,160 Z" fill="#166534" opacity="0.8" />
                    <path d="M 0,120 Q 30,110 70,125 Q 110,140 150,160 L 0,160 Z" fill="#14532d" />

                    {/* Modern Cityscape Skyline (Middle Distance) */}
                    <rect x="220" y="80" width="10" height="40" fill="#94a3b8" />
                    <rect x="235" y="65" width="14" height="55" fill="#64748b" />
                    <polygon points="242,50 235,65 249,65" fill="#475569" />
                    <rect x="254" y="75" width="12" height="45" fill="#94a3b8" />
                    <rect x="270" y="85" width="15" height="35" fill="#cbd5e1" />

                    {/* Seaport Cranes */}
                    <line x1="295" y1="120" x2="295" y2="80" stroke="#0369a1" strokeWidth="2.5" />
                    <line x1="285" y1="80" x2="315" y2="70" stroke="#0369a1" strokeWidth="2" />
                    <line x1="305" y1="73" x2="305" y2="90" stroke="#f59e0b" strokeWidth="1.5" />

                    <line x1="325" y1="120" x2="325" y2="85" stroke="#0369a1" strokeWidth="2" />
                    <line x1="315" y1="85" x2="340" y2="76" stroke="#0369a1" strokeWidth="1.8" />

                    {/* Blue Sea / Harbor (Right side) */}
                    <rect x="180" y="120" width="320" height="40" fill="url(#seaGrad)" />
                    <path d="M 180,122 Q 250,120 350,122 Q 450,121 500,123" stroke="#e0f2fe" strokeWidth="1.5" fill="none" opacity="0.6" />

                    {/* Modern Container Cargo Ship */}
                    {/* Ship Hull */}
                    <path d="M 330,132 L 350,146 L 440,146 L 455,132 Z" fill="url(#shipGrad)" />
                    {/* Containers Stacked */}
                    <rect x="355" y="122" width="14" height="10" fill="#dc2626" rx="1" />
                    <rect x="371" y="122" width="14" height="10" fill="#2563eb" rx="1" />
                    <rect x="387" y="122" width="14" height="10" fill="#f59e0b" rx="1" />
                    <rect x="403" y="122" width="14" height="10" fill="#16a34a" rx="1" />
                    <rect x="363" y="112" width="14" height="10" fill="#0891b2" rx="1" />
                    <rect x="379" y="112" width="14" height="10" fill="#dc2626" rx="1" />
                    <rect x="395" y="112" width="14" height="10" fill="#eab308" rx="1" />
                    {/* Ship Bridge / Cabin */}
                    <rect x="422" y="114" width="16" height="18" fill="#f8fafc" rx="1" />
                    <rect x="424" y="117" width="12" height="4" fill="#38bdf8" />
                    <rect x="430" y="106" width="4" height="8" fill="#ef4444" />

                    {/* Water Wake / Waves */}
                    <path d="M 320,140 Q 335,142 350,144" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.8" />
                    <path d="M 445,143 Q 465,145 490,145" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.7" />

                    {/* Floating Green Leaves */}
                    <path d="M 450,45 C 455,40 465,42 468,48 C 465,54 455,52 450,45 Z" fill="#22c55e" />
                    <path d="M 470,35 C 475,32 482,34 485,38 C 482,42 475,40 470,35 Z" fill="#16a34a" />
                  </svg>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          2. SỨ MỆNH - TẦM NHÌN - GIÁ TRỊ CỐT LÕI (3 CARDS MATCHING SCREENSHOT)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 mb-10 sm:mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Sứ mệnh */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
            <div>
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Target className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {tr("Sứ mệnh")}</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {tr("Nâng cao uy tín và năng lực cạnh tranh của doanh nghiệp xuất khẩu Việt Nam thông qua xác minh minh bạch, kết nối hiệu quả và dữ liệu thị trường đáng tin cậy.")}</p>
            </div>
          </div>

          {/* Card 2: Tầm nhìn */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
            <div>
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Eye className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {tr("Tầm nhìn")}</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {tr("Trở thành nền tảng hàng đầu Đông Nam Á về xác minh và kết nối thương mại nông sản, đưa sản phẩm Việt Nam vươn xa trên thị trường toàn cầu.")}</p>
            </div>
          </div>

          {/* Card 3: Giá trị cốt lõi */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
            <div>
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Gem className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {tr("Giá trị cốt lõi")}</h3>
              </div>

              {/* 6 Pills arranged in 2 rows of 3 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {[
                  'Minh bạch',
                  'Tin cậy',
                  'Hiệu quả',
                  'Hợp tác',
                  'Đổi mới',
                  'Phát triển bền vững'
                ].map((val, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/70 text-emerald-800 text-[11px] font-semibold"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                    <span className="truncate">{tr(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          3. CHÚNG TÔI PHỤC VỤ AI? (WHO WE SERVE - 3 AUDIENCE CARDS)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 mb-10 sm:mb-12">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-5">
          {tr("Chúng tôi phục vụ ai?")}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Audience 1: Doanh nghiệp xuất khẩu Việt Nam */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Building2 className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {tr("Doanh nghiệp xuất khẩu Việt Nam")}</h3>
              <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
                {tr("Nhà sản xuất, hợp tác xã, doanh nghiệp nông sản và thực phẩm muốn mở rộng thị trường quốc tế.")}</p>
            </div>
          </div>

          {/* Audience 2: Người mua quốc tế */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:border-teal-300 transition-all flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
              <Users className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {tr("Người mua quốc tế")}</h3>
              <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
                {tr("Nhà nhập khẩu, nhà phân phối, chuỗi bán lẻ, nhà sản xuất thực phẩm tìm nguồn cung uy tín từ Việt Nam.")}</p>
            </div>
          </div>

          {/* Audience 3: Đối tác & tổ chức */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <Handshake className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {tr("Đối tác & tổ chức")}</h3>
              <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
                {tr("Hiệp hội ngành hàng, tổ chức chứng nhận, đối tác logistics, tài chính... cùng thúc đẩy thương mại bền vững.")}</p>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          4. HÀNH TRÌNH PHÁT TRIỂN (OUR JOURNEY / TIMELINE)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 mb-12 sm:mb-16">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
          {tr("Hành trình phát triển")}</h2>

        <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-slate-200/80 shadow-xs overflow-x-auto">
          <div className="min-w-[760px] flex items-center justify-between gap-3 relative py-4">
            
            {[
              {
                year: '2021',
                desc: 'Khởi ý tưởng & nghiên cứu giải pháp xác minh thương mại nông sản'
              },
              {
                year: '2022',
                desc: 'Phát triển MVP & thử nghiệm hệ thống thẩm định tín nhiệm'
              },
              {
                year: '2023',
                desc: 'Kết nối 1,000+ doanh nghiệp xuất khẩu Việt Nam'
              },
              {
                year: '2024',
                desc: 'Mở rộng sang thị trường EU và Đông Bắc Á'
              },
              {
                year: '2025+',
                desc: 'Tiếp tục mở rộng toàn cầu, kiến tạo hệ sinh thái thương mại tin cậy'
              }
            ].map((milestone, idx, arr) => (
              <React.Fragment key={idx}>
                {/* Milestone Node */}
                <div className="flex-1 min-w-[140px] max-w-[180px] flex flex-col items-start">
                  
                  {/* Circle with Year */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {tr(idx + 1)}
                    </div>
                    <span className="font-extrabold text-sm sm:text-base text-slate-900">
                      {tr(milestone.year)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed font-normal">
                    {tr(milestone.desc)}
                  </p>

                </div>

                {/* Connecting Arrow between nodes */}
                {idx < arr.length - 1 && (
                  <div className="shrink-0 px-1 text-emerald-400">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                )}
              </React.Fragment>
            ))}

          </div>
        </div>
      </section>

      {/* =========================================================================
          5. IMPACT NUMBERS & CREDIBILITY STATS
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 mb-12 sm:mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[
            { value: '1,500+', label: 'Doanh nghiệp Việt Nam đã xác thực', sub: 'Thuộc top doanh nghiệp uy tín' },
            { value: '5,000+', label: 'Người mua quốc tế tích cực', sub: 'Từ 45+ quốc gia và vùng lãnh thổ' },
            { value: '99.8%', label: 'Độ chính xác dữ liệu OCR', sub: 'Đối soát chéo nguồn chính thống' },
            { value: '$250M+', label: 'Tổng giá trị giao dịch kết nối', sub: 'Thúc đẩy xuất khẩu nông sản' }
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs text-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 block mb-1">
                {tr(stat.value)}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 block mb-1">
                {tr(stat.label)}
              </span>
              <span className="text-[11px] text-slate-500">
                {tr(stat.sub)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          6. CONTACT & PARTNERSHIP BANNER
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-8 sm:p-10 lg:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-lg">
          <div className="max-w-xl">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-2">
              {tr("ĐỒNG HÀNH CÙNG VYBE TRADE")}</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
              {tr("Cùng kiến tạo tương lai xuất khẩu nông sản bền vững")}</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {tr("Dù bạn là doanh nghiệp xuất khẩu, nhà nhập khẩu quốc tế hay tổ chức xúc tiến thương mại, VYBE Trade luôn sẵn sàng lắng nghe và đồng hành.")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsContactModalOpen(true)}
              className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer active:scale-98"
            >
              {tr("Gửi yêu cầu hợp tác")}</button>
            <button
              onClick={onNavigateDirectory}
              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold text-xs sm:text-sm transition-all cursor-pointer active:scale-98"
            >
              {tr("Xem danh mục nhà cung cấp")}</button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. CONTACT / PARTNERSHIP MODAL
         ========================================================================= */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200">
            
            <button
              onClick={() => {
                setIsContactModalOpen(false);
                setContactSubmitted(false);
              }}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {contactSubmitted ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {tr("Gửi thông tin thành công!")}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6 max-w-sm mx-auto">
                  {tr("Cảm ơn bạn đã quan tâm đến VYBE Trade. Đội ngũ phụ trách phát triển đối tác sẽ phản hồi thư của bạn trong vòng 24 giờ làm việc.")}</p>
                <button
                  onClick={() => {
                    setIsContactModalOpen(false);
                    setContactSubmitted(false);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  {tr("Đóng cửa sổ")}</button>
              </div>
            ) : (
              <div>
                <div className="mb-5">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                    {tr("KẾT NỐI VỚI CHÚNG TÔI")}</span>
                  <h3 className="text-xl font-bold text-slate-900">
                    {tr("Liên hệ & Hợp tác doanh nghiệp")}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {tr("Hãy cho chúng tôi biết nhu cầu hợp tác của bạn")}</p>
                </div>

                <form onSubmit={handleContactSubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{tr("Họ tên đại diện")}</label>
                    <input
                      type="text"
                      required
                      value={contactForm.fullName}
                      onChange={(e) => setContactForm({ ...contactForm, fullName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{tr("Tên tổ chức / Doanh nghiệp")}</label>
                    <input
                      type="text"
                      required
                      value={contactForm.organization}
                      onChange={(e) => setContactForm({ ...contactForm, organization: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">{tr("Số điện thoại")}</label>
                      <input
                        type="text"
                        required
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">{tr("Email liên hệ")}</label>
                      <input
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{tr("Hình thức hợp tác")}</label>
                    <select
                      value={contactForm.topic}
                      onChange={(e) => setContactForm({ ...contactForm, topic: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-900 bg-white"
                    >
                      <option value="partnership">{tr("Hợp tác xúc tiến thương mại nông sản")}</option>
                      <option value="seller">{tr("Doanh nghiệp xuất khẩu đăng ký xác minh")}</option>
                      <option value="buyer">{tr("Buyer quốc tế tìm kiếm nhà cung cấp")}</option>
                      <option value="media">{tr("Báo chí, truyền thông & sự kiện")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{tr("Nội dung trao đổi")}</label>
                    <textarea
                      rows={3}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-900"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer mt-2"
                  >
                    {tr("Gửi thông điệp hợp tác")}</button>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
