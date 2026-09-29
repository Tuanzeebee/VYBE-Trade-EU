'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { getPlanPrice } from '../lib/pricing';
import { LOCALES } from '../i18n/translate';
import { 
  Package, 
  Crown, 
  Gem, 
  Check, 
  Search, 
  Layers, 
  BarChart3, 
  Headphones, 
  ShieldCheck, 
  CheckCircle2, 
  ChevronDown, 
  X,
} from 'lucide-react';
import { useLanguage } from "../context/LanguageContext";

interface PricingPlansProps {
  onNavigateHome: () => void;
  onNavigateOnboarding: () => void;
  onNavigateWorkspace?: () => void;
}

export default function PricingPlans({
  onNavigateWorkspace
}: PricingPlansProps) {
  const { tr, language } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlanModal, setSelectedPlanModal] = useState<'Free' | 'Member' | 'Premium' | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const price = (plan: 'Free' | 'Member' | 'Premium') => getPlanPrice(plan, billingCycle).toLocaleString(LOCALES[language]);
  const period = billingCycle === 'annual' ? 'VNĐ/năm' : 'VNĐ/tháng';

  // Registration Form State
  const [regForm, setRegForm] = useState({
    companyName: 'Công ty TNHH Nông Sản Việt',
    taxCode: '0314892345',
    contactPerson: 'Nguyễn Văn Trí',
    phone: '(+84) 91 888 2345',
    email: 'contact@vietagri-export.vn',
    paymentMethod: 'bank_transfer',
    notes: 'Yêu cầu xuất hóa đơn VAT điện tử và hướng dẫn xác minh L2 Enhanced.'
  });

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationSuccess(true);
  };

  const FAQS = [
    {
      q: 'Doanh nghiệp có thể nâng cấp hoặc hạ cấp gói bất cứ lúc nào không?',
      a: 'Có. Bạn có thể nâng cấp từ gói Free lên Member hoặc Premium bất kỳ lúc nào để nhận ngay các quyền lợi ưu tiên và kích hoạt tiến trình thẩm định L2/L3. Khoản thanh toán sẽ được tự động tính theo tỷ lệ thời gian sử dụng thực tế.'
    },
    {
      q: 'Gói thành viên có được xuất hóa đơn GTGT (VAT) hợp lệ không?',
      a: '100% các gói thanh toán trên VYBE TRADE đều được xuất hóa đơn GTGT điện tử chính thức gửi qua email doanh nghiệp trong vòng 24 giờ sau khi thanh toán thành công.'
    },
    {
      q: 'Sự khác biệt giữa Xác minh cơ bản và VYBE Certified (L3) là gì?',
      a: 'Xác minh tiêu chuẩn (Member) đối soát thông tin pháp lý doanh nghiệp qua Cổng thông tin Quốc gia và chứng chỉ ATTP qua OCR. VYBE Certified (Premium) bao gồm thẩm định thực địa tại nhà máy bởi chuyên gia VYBE, cấp hạn mức bảo lãnh hợp đồng Escrow và ưu tiên hiển thị đầu trang kết quả tìm kiếm của Buyer quốc tế.'
    },
    {
      q: 'Hình thức thanh toán nào được hỗ trợ?',
      a: 'Chúng tôi hỗ trợ chuyển khoản ngân hàng doanh nghiệp, thẻ tín dụng quốc tế (Visa/Mastercard) và thanh toán bảo lãnh qua cổng thanh toán bảo mật liên ngân hàng.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* =========================================================================
          1. HERO HEADER WITH GRAPHIC ILLUSTRATION (MATCHES SCREENSHOT)
         ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Kicker, Headline & Subtitle */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Kicker tag: | BẢNG GIÁ & GÓI THÀNH VIÊN */}
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 sm:h-5 bg-blue-600 rounded-full inline-block" />
              <span className="text-blue-600 font-bold text-xs sm:text-[13px] uppercase tracking-wider">
                {tr("BẢNG GIÁ & GÓI THÀNH VIÊN")}</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-slate-950 tracking-tight leading-[1.18]">
              {tr("Chọn gói phù hợp,")}<br />
              {tr("mở rộng cơ hội toàn cầu")}</h1>

            {/* Subtitle */}
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
              {tr("Các gói thành viên được thiết kế dành riêng cho doanh nghiệp xuất khẩu Việt Nam, giúp tăng độ tin cậy, tiếp cận người mua chất lượng và phát triển doanh nghiệp bền vững.")}</p>

            {/* Billing Toggle (Optional convenient control) */}
            <div className="pt-2 flex items-center gap-3">
              <div className="inline-flex flex-wrap gap-1 items-center p-1 rounded-2xl bg-slate-200/70 border border-slate-300/60 text-xs">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  aria-pressed={billingCycle === 'monthly'}
                  className={`px-4 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tr("Thanh toán hàng tháng")}</button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  aria-pressed={billingCycle === 'annual'}
                  className={`px-4 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    billingCycle === 'annual'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tr("Thanh toán theo năm")}</span>
                  <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {tr("-17%")}</span>
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Graphic Illustration & 3 Key Value Pills */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-end justify-center">
            <div className="relative w-full max-w-md p-6 rounded-3xl bg-gradient-to-br from-blue-50/80 via-teal-50/50 to-white border border-blue-100 shadow-sm overflow-hidden">
              
              {/* Background soft glow and vector art */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-200/40 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-200/40 rounded-full blur-xl pointer-events-none" />

              {/* Decorative Cityline & Sprout Graphic Mockup */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-blue-100 shadow-2xs flex items-center justify-center text-teal-800">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{tr("CHỈ SỐ TĂNG TRƯỞNG B2B")}</span>
                    <span className="text-xs font-bold text-slate-900">{tr("+320% Tiếp cận Buyer")}</span>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  {tr("🌱")}</div>
              </div>

              {/* 3 Pills from Image: Tăng độ tin cậy, Tiếp cận người mua chất lượng, Mở rộng thị trường quốc tế */}
              <div className="space-y-2.5 relative z-10">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white/90 backdrop-blur-xs border border-blue-100/80 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="text-xs sm:text-[13px] font-semibold text-slate-800">
                    {tr("Tăng độ tin cậy")}</span>
                </div>

                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white/90 backdrop-blur-xs border border-blue-100/80 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="text-xs sm:text-[13px] font-semibold text-slate-800">
                    {tr("Tiếp cận người mua chất lượng")}</span>
                </div>

                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white/90 backdrop-blur-xs border border-blue-100/80 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="text-xs sm:text-[13px] font-semibold text-slate-800">
                    {tr("Mở rộng thị trường quốc tế")}</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          2. THE 3 PRICING CARDS (FREE, MEMBER, PREMIUM) - EXACT MATCH TO IMAGE
         ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          
          {/* -------------------------------------------------------------------
              CARD 1: FREE
             ------------------------------------------------------------------- */}
          <div className="rounded-[28px] bg-white border border-slate-200/90 p-7 sm:p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between text-left">
            <div>
              {/* Icon: 3D Box in mint circular background */}
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mb-5 shadow-2xs">
                <Package className="w-6 h-6 stroke-[1.8]" />
              </div>

              {/* Title & Subtitle */}
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {tr("Free")}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-snug min-h-[32px]">
                {tr("Bắt đầu hiện diện")}<br />{tr("trên VYBE TRADE")}</p>

              {/* Price */}
              <div className="mt-5 pb-5 border-b border-slate-100 flex flex-wrap items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {tr("0")}</span>
                <span className="text-xs sm:text-[13px] text-slate-600 font-semibold">
                  {tr(period)}</span>
              </div>

              {/* Action Button: Đăng ký miễn phí */}
              <button
                type="button"
                onClick={() => setSelectedPlanModal('Free')}
                className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm border border-slate-200 transition-colors cursor-pointer shadow-2xs text-center mt-5 mb-6"
              >
                {tr("Đăng ký miễn phí")}</button>

              {/* Features List */}
              <ul className="space-y-3 text-xs sm:text-[13px]">
                <li className="flex items-center gap-2.5 text-slate-700">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{tr("Tạo hồ sơ doanh nghiệp cơ bản")}</span>
                </li>

                <li className="flex items-center gap-2.5 text-slate-700">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{tr("Hiển thị danh mục sản phẩm")}</span>
                </li>

                <li className="flex items-center gap-2.5 text-slate-700">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{tr("Tiếp cận cơ hội mua hàng cơ bản")}</span>
                </li>

                <li className="flex items-center gap-2.5 text-slate-700">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{tr("Tham gia sự kiện và tin tức")}</span>
                </li>

                {/* Grayed out / not included items */}
                <li className="flex items-center gap-2.5 text-slate-400">
                  <div className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[2]" />
                  </div>
                  <span className="line-through decoration-slate-300">{tr("Xác minh doanh nghiệp")}</span>
                </li>

                <li className="flex items-center gap-2.5 text-slate-400">
                  <div className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[2]" />
                  </div>
                  <span className="line-through decoration-slate-300">{tr("Ưu tiên hiển thị")}</span>
                </li>

                <li className="flex items-center gap-2.5 text-slate-400">
                  <div className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[2]" />
                  </div>
                  <span className="line-through decoration-slate-300">{tr("Trợ lý AI & phân tích thị trường")}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              CARD 2: MEMBER (PHỔ BIẾN NHẤT - HIGHLIGHTED IN BLUE BORDER)
             ------------------------------------------------------------------- */}
          <div className="rounded-[28px] bg-white border-2 border-blue-500 p-7 sm:p-8 shadow-xl relative flex flex-col justify-between text-left">
            
            {/* Pill: Phổ biến nhất (Floating on top border) */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-600 text-white font-bold text-[11px] sm:text-xs shadow-md tracking-wide whitespace-nowrap">
              {tr("Phổ biến nhất")}</div>

            <div>
              {/* Icon: Gold Crown in amber circular background */}
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center mb-5 shadow-2xs">
                <Crown className="w-6 h-6 stroke-[2]" />
              </div>

              {/* Title & Subtitle */}
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {tr("Member")}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-snug min-h-[32px]">
                {tr("Tăng độ tin cậy,")}<br />{tr("kết nối nhiều hơn")}</p>

              {/* Price & Annual Note */}
              <div className="mt-5 pb-5 border-b border-slate-100">
                <div className="flex flex-wrap items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    {tr(price('Member'))}
                  </span>
                  <span className="text-xs sm:text-[13px] text-slate-600 font-semibold">
                    {tr(period)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  {billingCycle === 'monthly' && tr("hoặc 9.900.000 VNĐ/năm ")}<span className="text-teal-700 font-bold">{tr("(tiết kiệm 17%)")}</span>
                </p>
              </div>

              {/* Action Button: Đăng ký gói Member */}
              <button
                type="button"
                onClick={() => setSelectedPlanModal('Member')}
                className="w-full py-3 px-4 rounded-2xl bg-[#0b1e33] hover:bg-[#132d4b] text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-md text-center mt-4 mb-6 active:scale-[0.98]"
              >
                {tr("Đăng ký gói Member")}</button>

              {/* Features List */}
              <ul className="space-y-3 text-xs sm:text-[13px]">
                <li className="flex items-center gap-2.5 text-slate-800 font-medium">
                  <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{tr("Tất cả quyền lợi gói Free")}</span>
                </li>

                <li className="flex items-center gap-2.5 text-slate-800 font-medium">
                  <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{tr("Xác minh doanh nghiệp (cấp tiêu chuẩn)")}</span>
                </li>

                <li className="flex items-center gap-2.5 text-slate-800 font-medium">
                  <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{tr("Hiển thị nổi bật trong kết quả tìm kiếm")}</span>
                </li>

                <li className="flex items-center gap-2.5 text-slate-800 font-medium">
                  <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{tr("Tiếp cận nhiều cơ hội RFQ hơn")}</span>
                </li>

                <li className="flex items-center gap-2.5 text-slate-800 font-medium">
                  <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{tr("Nhận gợi ý người mua phù hợp (AI)")}</span>
                </li>

                <li className="flex items-center gap-2.5 text-slate-800 font-medium">
                  <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{tr("Tham gia sự kiện kết nối B2B")}</span>
                </li>

                {/* Grayed out / not included items */}
                <li className="flex items-center gap-2.5 text-slate-400">
                  <div className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[2]" />
                  </div>
                  <span className="line-through decoration-slate-300">{tr("Xác minh nâng cao & VYBE Certified")}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              CARD 3: PREMIUM
             ------------------------------------------------------------------- */}
          <div className="rounded-[28px] bg-white border border-slate-200/90 p-7 sm:p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between text-left">
            <div>
              {/* Icon: Diamond in blue circular background */}
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-5 shadow-2xs">
                <Gem className="w-6 h-6 stroke-[1.8]" />
              </div>

              {/* Title & Subtitle */}
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {tr("Premium")}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-snug min-h-[32px]">
                {tr("Tối ưu cơ hội,")}<br />{tr("dẫn đầu thị trường")}</p>

              {/* Price & Annual Note */}
              <div className="mt-5 pb-5 border-b border-slate-100">
                <div className="flex flex-wrap items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    {tr(price('Premium'))}
                  </span>
                  <span className="text-xs sm:text-[13px] text-slate-600 font-semibold">
                    {tr(period)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  {billingCycle === 'monthly' && tr("hoặc 29.900.000 VNĐ/năm ")}<span className="text-teal-700 font-bold">{tr("(tiết kiệm 17%)")}</span>
                </p>
              </div>

              {/* Action Button: Đăng ký gói Premium */}
              <button
                type="button"
                onClick={() => setSelectedPlanModal('Premium')}
                className="w-full py-3 px-4 rounded-2xl bg-[#0b1e33] hover:bg-[#132d4b] text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-md text-center mt-4 mb-6 active:scale-[0.98]"
              >
                {tr("Đăng ký gói Premium")}</button>

              {/* Features List (All Checked) */}
              <ul className="space-y-3 text-xs sm:text-[13px]">
                <li className="flex items-center gap-2.5 text-slate-800 font-medium">
                  <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{tr("Tất cả quyền lợi gói Member")}</span>
                </li>

                <li className="flex items-center gap-2.5 text-slate-800 font-medium">
                  <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{tr("Xác minh nâng cao (VYBE Certified)")}</span>
                </li>

                <li className="flex items-center gap-2.5 text-slate-800 font-medium">
                  <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{tr("Hiển thị ưu tiên cao nhất")}</span>
                </li>

                <li className="flex items-center gap-2.5 text-slate-800 font-medium">
                  <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{tr("Kết nối trực tiếp với người mua chiến lược")}</span>
                </li>

                <li className="flex items-center gap-2.5 text-slate-800 font-medium">
                  <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{tr("Trợ lý AI chuyên sâu & phân tích thị trường")}</span>
                </li>

                <li className="flex items-center gap-2.5 text-slate-800 font-medium">
                  <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{tr("Hỗ trợ truyền thông thương hiệu")}</span>
                </li>

                <li className="flex items-center gap-2.5 text-slate-800 font-medium">
                  <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{tr("Tư vấn 1:1 với chuyên gia VYBE TRADE")}</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          3. BOTTOM SECTION: VÌ SAO NÊN NÂNG CẤP? (MATCHES SCREENSHOT)
         ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="p-6 sm:p-8 rounded-[32px] bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-100/80 shadow-xs">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Left text */}
            <div className="lg:col-span-4 space-y-2 text-left">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
                {tr("Vì sao nên nâng cấp?")}</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {tr("Tăng lợi thế cạnh tranh và mở rộng cơ hội xuất khẩu với các đặc quyền dành riêng cho thành viên.")}</p>
            </div>

            {/* Right: 5 Value Cards */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-3.5">
              
              {/* Card 1: Tăng độ tin cậy với người mua quốc tế */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all text-left flex flex-col justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug">
                    {tr("Tăng độ tin cậy")}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {tr("với người mua quốc tế")}</p>
                </div>
              </div>

              {/* Card 2: Hiển thị nổi bật trong tìm kiếm */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all text-left flex flex-col justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug">
                    {tr("Hiển thị nổi bật")}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {tr("trong tìm kiếm")}</p>
                </div>
              </div>

              {/* Card 3: Tiếp cận nhiều cơ hội RFQ chất lượng */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all text-left flex flex-col justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug">
                    {tr("Tiếp cận nhiều")}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {tr("cơ hội RFQ chất lượng")}</p>
                </div>
              </div>

              {/* Card 4: Phân tích thị trường bằng AI */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all text-left flex flex-col justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug">
                    {tr("Phân tích thị trường")}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {tr("bằng AI")}</p>
                </div>
              </div>

              {/* Card 5: Đồng hành bởi đội ngũ chuyên gia */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all text-left flex flex-col justify-between col-span-2 sm:col-span-1">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug">
                    {tr("Đồng hành bởi")}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {tr("đội ngũ chuyên gia")}</p>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* =========================================================================
          4. FREQUENTLY ASKED QUESTIONS (FAQS)
         ========================================================================= */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-left">
        <div className="text-center mb-8 space-y-2">
          <h3 className="text-2xl font-extrabold text-slate-900">
            {tr("Câu hỏi thường gặp về gói thành viên")}</h3>
          <p className="text-xs sm:text-sm text-slate-500">
            {tr("Giải đáp thắc mắc về phương thức thanh toán, xuất hóa đơn và quy trình xác minh cấp độ")}</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => (
            <div 
              key={idx}
              className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-800 hover:text-blue-600 cursor-pointer"
              >
                <span>{tr(faq.q)}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${activeFaq === idx ? 'rotate-180 text-blue-600' : ''}`} />
              </button>
              {activeFaq === idx && (
                <div className="px-5 pb-5 pt-0 text-xs sm:text-[13px] text-slate-600 leading-relaxed border-t border-slate-50">
                  {tr(faq.a)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          5. MODAL: ĐĂNG KÝ GÓI THÀNH VIÊN
         ========================================================================= */}
      {selectedPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-left max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            
            <button
              onClick={() => {
                setSelectedPlanModal(null);
                setRegistrationSuccess(false);
              }}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {!registrationSuccess ? (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    selectedPlanModal === 'Premium'
                      ? 'bg-blue-50 text-blue-600'
                      : selectedPlanModal === 'Member'
                      ? 'bg-amber-50 text-amber-500'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {selectedPlanModal === 'Premium' && <Gem className="w-6 h-6" />}
                    {selectedPlanModal === 'Member' && <Crown className="w-6 h-6" />}
                    {selectedPlanModal === 'Free' && <Package className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {tr("Đăng ký gói ")}{tr(selectedPlanModal)}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {tr(selectedPlanModal === 'Premium' && `${price('Premium')} ${period} • Dẫn đầu thị trường & Thẩm định L3`)}
                      {tr(selectedPlanModal === 'Member' && `${price('Member')} ${period} • Tăng độ tin cậy & Nhận RFQ quốc tế`)}
                      {tr(selectedPlanModal === 'Free' && 'Miễn phí trải nghiệm khởi tạo hồ sơ doanh nghiệp')}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {tr("Tên doanh nghiệp xuất khẩu ")}<span className="text-rose-500">{tr("*")}</span>
                    </label>
                    <input 
                      type="text"
                      required
                      value={regForm.companyName}
                      onChange={(e) => setRegForm({ ...regForm, companyName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {tr("Mã số thuế / MST ")}<span className="text-rose-500">{tr("*")}</span>
                      </label>
                      <input 
                        type="text"
                        required
                        value={regForm.taxCode}
                        onChange={(e) => setRegForm({ ...regForm, taxCode: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {tr("Người đại diện liên hệ ")}<span className="text-rose-500">{tr("*")}</span>
                      </label>
                      <input 
                        type="text"
                        required
                        value={regForm.contactPerson}
                        onChange={(e) => setRegForm({ ...regForm, contactPerson: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {tr("Số điện thoại Hotline ")}<span className="text-rose-500">{tr("*")}</span>
                      </label>
                      <input 
                        type="text"
                        required
                        value={regForm.phone}
                        onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {tr("Email nhận thông báo & VAT ")}<span className="text-rose-500">{tr("*")}</span>
                      </label>
                      <input 
                        type="email"
                        required
                        value={regForm.email}
                        onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {selectedPlanModal !== 'Free' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {tr("Hình thức thanh toán")}</label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer ${
                          regForm.paymentMethod === 'bank_transfer' ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold' : 'border-slate-200 text-slate-700'
                        }`}>
                          <input 
                            type="radio" 
                            name="pay" 
                            checked={regForm.paymentMethod === 'bank_transfer'} 
                            onChange={() => setRegForm({ ...regForm, paymentMethod: 'bank_transfer' })} 
                          />
                          <span>{tr("Chuyển khoản cty (VAT)")}</span>
                        </label>

                        <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer ${
                          regForm.paymentMethod === 'card' ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold' : 'border-slate-200 text-slate-700'
                        }`}>
                          <input 
                            type="radio" 
                            name="pay" 
                            checked={regForm.paymentMethod === 'card'} 
                            onChange={() => setRegForm({ ...regForm, paymentMethod: 'card' })} 
                          />
                          <span>{tr("Thẻ Visa / Master")}</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {tr("Ghi chú / Yêu cầu xuất hóa đơn")}</label>
                    <textarea 
                      rows={2}
                      value={regForm.notes}
                      onChange={(e) => setRegForm({ ...regForm, notes: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600 resize-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button 
                    type="button"
                    onClick={() => setSelectedPlanModal(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    {tr("Hủy bỏ")}</button>
                  <button 
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                  >
                    {tr("Xác nhận kích hoạt gói ")}{tr(selectedPlanModal)}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {tr("Đăng ký thành công gói ")}{tr(selectedPlanModal)}{tr("!")}</h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                  {tr("Hệ thống VYBE TRADE đã ghi nhận yêu cầu của ")}<strong>{regForm.companyName}</strong>{tr(". Chuyên viên quản lý tài khoản xuất khẩu sẽ liên hệ trong 15 phút để kích hoạt đặc quyền và gửi hợp đồng.")}</p>

                <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={() => {
                      setSelectedPlanModal(null);
                      setRegistrationSuccess(false);
                      if (onNavigateWorkspace) {
                        onNavigateWorkspace();
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#083832] text-white text-xs font-bold hover:bg-[#062924] transition-colors cursor-pointer"
                  >
                    {tr("Vào Workspace Seller")}</button>
                  <button
                    onClick={() => {
                      setSelectedPlanModal(null);
                      setRegistrationSuccess(false);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {tr("Đóng")}</button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
