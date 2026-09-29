'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowRight, 
  Upload, 
  FileText, 
  Database, 
  FileCheck, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  X, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from "../context/LanguageContext";

interface ProductAiTrustProps {
  onNavigateHome: () => void;
  onNavigateNav: (label: string) => void;
  onSwitchToVerification: () => void;
}

export default function ProductAiTrust({ 
  onNavigateHome, 
  onNavigateNav,
  onSwitchToVerification 
}: ProductAiTrustProps) {
  const { tr } = useLanguage();
  const [activeModal, setActiveModal] = useState<'demo' | 'learn-more' | 'process-detail' | 'step-detail' | null>(null);
  const [activeStepModal, setActiveStepModal] = useState<number | null>(null);
  const [demoAnalyzing, setDemoAnalyzing] = useState(false);
  const [demoStep, setDemoStep] = useState(4); // 4 = completed analysis

  const triggerLiveDemo = () => {
    setActiveModal('demo');
    setDemoAnalyzing(true);
    setDemoStep(1);
    setTimeout(() => setDemoStep(2), 700);
    setTimeout(() => setDemoStep(3), 1400);
    setTimeout(() => {
      setDemoStep(4);
      setDemoAnalyzing(false);
    }, 2100);
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between">
      
      {/* =========================================================================
          HERO SECTION: AI TRUST CO-PILOT
         ========================================================================= */}
      <section className="relative w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-12 pb-12">
        
        {/* Service Switcher Tabs (Verification vs AI Trust Co-pilot) */}
        <div className="flex items-center gap-2 mb-6 sm:mb-8 pb-3 border-b border-slate-100">
          <button
            onClick={onSwitchToVerification}
            className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>{tr("Dịch vụ 1: Xác minh doanh nghiệp")}</span>
          </button>
          <span className="text-slate-300">{tr("/")}</span>
          <button
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-slate-900 text-white shadow-xs cursor-default flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>{tr("Dịch vụ 2: AI Trust Co-pilot")}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* Left Column: Heading, Subtitle & Action Buttons */}
          <div className="lg:col-span-5 xl:col-span-5 z-10">
            
            {/* Kicker Badge: SẢN PHẨM / DỊCH VỤ */}
            <div className="inline-flex items-center gap-2 mb-4 select-none">
              <span className="w-4 h-4 rounded-full bg-[#0d9488]/15 flex items-center justify-center">
                <span className="w-2 h-0.5 rounded-full bg-[#0d9488]" />
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-[#0d9488] tracking-widest uppercase">
                {tr("SẢN PHẨM / DỊCH VỤ")}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-bold text-slate-900 tracking-tight leading-[1.18] mb-4">
              {tr("AI Trust Co-pilot")}</h1>

            {/* Subheadline */}
            <h2 className="text-slate-800 text-lg sm:text-[20px] font-semibold leading-snug mb-3">
              {tr("Phân tích tài liệu, phát hiện rủi ro, hỗ trợ quyết định.")}</h2>

            {/* Description Body */}
            <p className="text-slate-600 text-sm sm:text-[15px] leading-relaxed max-w-xl mb-8 font-normal">
              {tr("Sử dụng OCR và LLM để đọc, đối chiếu và phân tích hồ sơ doanh nghiệp, so sánh với các nguồn dữ liệu uy tín, đưa ra ")}<strong className="font-semibold text-slate-900">{tr("Risk Score")}</strong> {tr(" và cảnh báo bất thường cho đội ngũ thẩm định.")}</p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Primary CTA: Xem demo -> */}
              <button 
                onClick={triggerLiveDemo}
                className="bg-[#0f172a] hover:bg-slate-800 text-white font-medium text-sm sm:text-base px-6 py-3 rounded-full flex items-center gap-2 transition-all shadow-xs hover:shadow-md active:scale-95 cursor-pointer"
              >
                <span>{tr("Xem demo")}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.2]" />
              </button>

              {/* Secondary CTA: Tìm hiểu thêm */}
              <button 
                onClick={() => setActiveModal('learn-more')}
                className="bg-white hover:bg-slate-50 text-slate-800 font-medium text-sm sm:text-base px-6 py-3 rounded-full border border-slate-200 transition-all shadow-xs hover:border-slate-300 active:scale-95 cursor-pointer"
              >
                {tr("Tìm hiểu thêm")}</button>
            </div>

          </div>

          {/* Right Column: 3D Layered Glass UI Panels & AI Analysis Cards */}
          <div className="lg:col-span-7 xl:col-span-7 relative flex items-center justify-center min-h-[400px] select-none">
            
            {/* Ambient soft glow */}
            <div className="absolute inset-0 bg-radial-[at_60%_40%] from-blue-50/70 via-transparent to-transparent pointer-events-none" />

            <div className="relative w-full max-w-[620px] flex items-center justify-center">
              
              {/* Layer 1: Background 3D Browser/Tablet Frame (Soft Blue / White Glass) */}
              <div className="absolute -left-2 top-2 w-[340px] sm:w-[420px] h-[340px] rounded-3xl bg-gradient-to-br from-blue-50/80 to-slate-100/60 border border-blue-100/70 shadow-[0_12px_40px_rgba(37,99,235,0.06)] transform -rotate-1 pointer-events-none">
                {/* Browser dots */}
                <div className="flex items-center gap-1.5 p-4 border-b border-blue-100/60">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-200" />
                </div>
              </div>

              {/* Layer 2: Frosted Glass Document Panel (GIẤY CHỨNG NHẬN) */}
              <div className="relative w-[210px] sm:w-[240px] h-[310px] sm:h-[330px] rounded-2xl bg-white/95 border border-slate-200/90 shadow-lg p-5 flex flex-col items-center justify-between transform -rotate-2 z-10 shrink-0">
                {/* Red Star Emblem */}
                <div className="flex flex-col items-center mt-1">
                  <div className="w-7 h-7 text-red-600 flex items-center justify-center mb-1">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                      <polygon points="12,2 14,8 20,8 15,12 17,18 12,14 7,18 9,12 4,8 10,8" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-red-700 tracking-wider uppercase">
                    {tr("GIẤY CHỨNG NHẬN")}</span>
                </div>

                {/* Simulated Text Lines */}
                <div className="w-full space-y-2 my-auto px-2">
                  <div className="w-full h-1.5 bg-slate-100 rounded-full" />
                  <div className="w-4/5 h-1.5 bg-slate-100 rounded-full mx-auto" />
                  <div className="w-5/6 h-1.5 bg-slate-100 rounded-full" />
                  <div className="w-3/4 h-1.5 bg-slate-100 rounded-full" />
                  <div className="w-4/5 h-1.5 bg-slate-100 rounded-full mx-auto" />
                  <div className="w-2/3 h-1.5 bg-slate-100 rounded-full" />
                </div>

                {/* Circular Stamp at Bottom Right */}
                <div className="self-end mr-2 mb-1">
                  <div className="w-9 h-9 rounded-full border-2 border-red-500/80 border-dashed flex items-center justify-center text-red-500">
                    <div className="w-6 h-6 rounded-full border border-red-500 flex items-center justify-center">
                      <span className="text-[7px] font-bold">{tr("VN")}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layer 3: Floating Card "Đang phân tích..." */}
              <div className="relative -ml-8 sm:-ml-10 z-20 w-[190px] sm:w-[210px] rounded-2xl bg-white border border-slate-100 shadow-[0_12px_36px_rgba(0,0,0,0.08)] p-4 sm:p-5 flex flex-col justify-between shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xs sm:text-[13px] font-bold text-slate-900">
                    {tr("Đang phân tích...")}</h3>
                </div>

                {/* 4 Checklist Items */}
                <div className="space-y-2.5">
                  {[
                    'Trích xuất thông tin (OCR)',
                    'Đối chiếu dữ liệu công khai',
                    'Kiểm tra tính nhất quán',
                    'Phát hiện bất thường'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <span className="text-[11px] font-medium text-slate-700 leading-tight">
                        {tr(item)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Layer 4: Floating Card "Risk Score (dự kiến)" with Semicircular Gauge */}
              <div className="relative -ml-4 sm:-ml-6 z-30 w-[190px] sm:w-[210px] rounded-2xl bg-white border border-slate-100 shadow-[0_16px_44px_rgba(0,0,0,0.1)] p-4 sm:p-5 flex flex-col justify-between shrink-0">
                
                {/* Title */}
                <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 mb-2">
                  {tr("Risk Score (dự kiến)")}</h3>

                {/* Semicircular Gauge SVG */}
                <div className="flex flex-col items-center justify-center my-1">
                  <div className="relative w-28 h-16 flex items-end justify-center">
                    <svg viewBox="0 0 100 55" className="w-full h-full">
                      {/* Background Arc */}
                      <path 
                        d="M 10 50 A 40 40 0 0 1 90 50" 
                        fill="none" 
                        stroke="#e2e8f0" 
                        strokeWidth="10" 
                        strokeLinecap="round" 
                      />
                      {/* Progress Green Arc (12% of 100) */}
                      <path 
                        d="M 10 50 A 40 40 0 0 1 35 15" 
                        fill="none" 
                        stroke="#0d9488" 
                        strokeWidth="10" 
                        strokeLinecap="round" 
                      />
                    </svg>

                    {/* Score Number in Center */}
                    <div className="absolute bottom-0 inset-x-0 flex flex-col items-center">
                      <span className="text-xl sm:text-2xl font-bold text-slate-900 leading-none">
                        {tr("12/100")}</span>
                    </div>
                  </div>

                  {/* Rating Label: Rủi ro thấp */}
                  <span className="text-xs sm:text-sm font-bold text-emerald-600 mt-2">
                    {tr("Rủi ro thấp")}</span>
                </div>

                {/* Verified Checklist below score */}
                <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium text-slate-600">
                      {tr("Thông tin hợp lệ")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium text-slate-600">
                      {tr("Khớp với VN Business Registry")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium text-slate-600">
                      {tr("Không phát hiện bất thường")}</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================================
          BOTTOM SECTION: QUY TRÌNH HOẠT ĐỘNG (01 -> 02 -> 03 -> 04)
         ========================================================================= */}
      <section className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pb-16">
        
        {/* Section Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <h3 className="text-xl sm:text-[22px] font-bold text-slate-900 tracking-tight">
            {tr("Quy trình hoạt động")}</h3>

          <button 
            onClick={() => setActiveModal('process-detail')}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{tr("Tìm hiểu chi tiết")}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        {/* 4 Connected Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          
          {/* Card 01: Upload tài liệu */}
          <div className="relative group">
            <div 
              onClick={() => {
                setActiveStepModal(1);
                setActiveModal('step-detail');
              }}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex items-start gap-4 min-h-[110px]"
            >
              {/* Icon Container (Soft Blue) */}
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                <Upload className="w-6 h-6 stroke-[2]" />
              </div>

              {/* Text */}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-slate-900">{tr("01")}</span>
                  <h4 className="text-sm font-bold text-slate-900">{tr("Upload tài liệu")}</h4>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-snug font-normal">
                  {tr("Giấy phép, chứng nhận,")}<br />
                  {tr("hồ sơ doanh nghiệp")}</p>
              </div>
            </div>

            {/* Direction Arrow */}
            <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 text-slate-400 pointer-events-none">
              <ArrowRight className="w-4 h-4 text-slate-400 stroke-[2.5]" />
            </div>
          </div>

          {/* Card 02: Trích xuất & phân tích */}
          <div className="relative group">
            <div 
              onClick={() => {
                setActiveStepModal(2);
                setActiveModal('step-detail');
              }}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex items-start gap-4 min-h-[110px]"
            >
              {/* Icon Container (Soft Blue Document Scan) */}
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                <FileText className="w-6 h-6 stroke-[2]" />
              </div>

              {/* Text */}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-slate-900">{tr("02")}</span>
                  <h4 className="text-sm font-bold text-slate-900">{tr("Trích xuất & phân tích")}</h4>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-snug font-normal">
                  {tr("OCR/LLM đọc và hiểu nội dung")}</p>
              </div>
            </div>

            {/* Direction Arrow */}
            <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 text-slate-400 pointer-events-none">
              <ArrowRight className="w-4 h-4 text-slate-400 stroke-[2.5]" />
            </div>
          </div>

          {/* Card 03: Đối chiếu đa nguồn */}
          <div className="relative group">
            <div 
              onClick={() => {
                setActiveStepModal(3);
                setActiveModal('step-detail');
              }}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex items-start gap-4 min-h-[110px]"
            >
              {/* Icon Container (Soft Emerald Database) */}
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
                <Database className="w-6 h-6 stroke-[2]" />
              </div>

              {/* Text */}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-slate-900">{tr("03")}</span>
                  <h4 className="text-sm font-bold text-slate-900">{tr("Đối chiếu đa nguồn")}</h4>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-snug font-normal">
                  {tr("VN Business Registry,")}<br />
                  {tr("EU VIES, tiêu chuẩn quốc tế...")}</p>
              </div>
            </div>

            {/* Direction Arrow */}
            <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 text-slate-400 pointer-events-none">
              <ArrowRight className="w-4 h-4 text-slate-400 stroke-[2.5]" />
            </div>
          </div>

          {/* Card 04: Risk Score & báo cáo */}
          <div className="relative group">
            <div 
              onClick={() => {
                setActiveStepModal(4);
                setActiveModal('step-detail');
              }}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex items-start gap-4 min-h-[110px]"
            >
              {/* Icon Container (Soft Amber Report) */}
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                <FileCheck className="w-6 h-6 stroke-[2]" />
              </div>

              {/* Text */}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-slate-900">{tr("04")}</span>
                  <h4 className="text-sm font-bold text-slate-900">{tr("Risk Score & báo cáo")}</h4>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-snug font-normal">
                  {tr("Đánh giá rủi ro,")}<br />
                  {tr("đề xuất cho Admin")}</p>
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* =========================================================================
          INTERACTIVE MODALS & DEMO SIMULATION
         ========================================================================= */}
      
      {/* Modal 1: Live Interactive Demo */}
      {activeModal === 'demo' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-2xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-left">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Sparkles className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{tr("Mô phỏng Phân tích AI Trust Co-pilot")}</h3>
                <p className="text-xs text-slate-500">{tr("Tài liệu mẫu: Giấy chứng nhận ĐKKD & ISO 22000 (VietFarm Co., Ltd.)")}</p>
              </div>
            </div>

            {/* Interactive Progress Bar */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 mb-5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                <span>{tr("Tiến trình xử lý mô hình AI")}</span>
                <span className="text-blue-600">{tr(demoStep * 25)}{tr("%")}</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-500" 
                  style={{ width: `${demoStep * 25}%` }} 
                />
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className={`flex items-center gap-2 ${demoStep >= 1 ? 'text-slate-800' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-4 h-4 ${demoStep >= 1 ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>{tr("Bước 1: OCR đa ngôn ngữ trích xuất 42 trường thông tin pháp lý")}</span>
                </div>
                <div className={`flex items-center gap-2 ${demoStep >= 2 ? 'text-slate-800' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-4 h-4 ${demoStep >= 2 ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>{tr("Bước 2: LLM đối soát chéo MST 0314892345 qua VN Business Registry")}</span>
                </div>
                <div className={`flex items-center gap-2 ${demoStep >= 3 ? 'text-slate-800' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-4 h-4 ${demoStep >= 3 ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>{tr("Bước 3: Xác thực hiệu lực chứng chỉ ISO và dữ liệu xuất nhập khẩu")}</span>
                </div>
                <div className={`flex items-center gap-2 ${demoStep >= 4 ? 'text-slate-800' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-4 h-4 ${demoStep >= 4 ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>{tr("Bước 4: Tính toán Risk Score tổng hợp (12/100 - Mức rủi ro thấp)")}</span>
                </div>
              </div>
            </div>

            {/* Result Box */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between mb-5">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">{tr("Kết quả đánh giá AI")}</span>
                <p className="text-xs text-emerald-900 font-semibold mt-0.5">{tr("Khuyến nghị: Phê duyệt cấp chứng nhận L2 Enhanced Verified")}</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-emerald-700">{tr("12/100")}</span>
                <p className="text-[10px] text-emerald-600">{tr("Rủi ro thấp")}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={triggerLiveDemo}
                className="flex-1 py-2.5 rounded-full bg-[#0f172a] hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{tr("Chạy lại mô phỏng")}</span>
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {tr("Đóng")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Tìm hiểu thêm */}
      {activeModal === 'learn-more' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 text-left">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-1">{tr("Giới thiệu AI Trust Co-pilot")}</h3>
            <p className="text-xs text-slate-500 mb-4">{tr("Trợ lý trí tuệ nhân tạo chuyên biệt cho thẩm định chuỗi cung ứng B2B")}</p>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed mb-5">
              <p>
                <strong>{tr("AI Trust Co-pilot")}</strong> {tr(" được huấn luyện trên hàng triệu bộ hồ sơ doanh nghiệp xuất nhập khẩu quốc tế, giúp tự động hóa khâu tiền kiểm tra và giảm 85% thời gian thẩm định thủ công.")}</p>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{tr("Phát hiện chỉnh sửa hình ảnh, con dấu giả mạo")}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{tr("Kiểm tra ngày hết hạn chứng nhận ISO, HACCP, GlobalGAP")}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{tr("Cảnh báo trùng lặp thông tin người đại diện trên mạng lưới")}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-full bg-[#0f172a] hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              {tr("Đã hiểu, quay lại")}</button>
          </div>
        </div>
      )}

      {/* Modal 3: Chi tiết quy trình hoạt động */}
      {(activeModal === 'process-detail' || activeModal === 'step-detail') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-2xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-left">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              {tr(activeStepModal ? `Chi tiết Bước ${activeStepModal}` : 'Chi tiết 4 bước của AI Trust Co-pilot')}
            </h3>
            <p className="text-xs text-slate-500 mb-5">{tr("Hệ thống xử lý phân tán và bảo mật cấp doanh nghiệp")}</p>

            <div className="space-y-3">
              {[
                { step: '01', title: 'Upload tài liệu', desc: 'Hỗ trợ định dạng PDF, JPG, PNG độ phân giải cao. Tự động khử nhiễu và căn chỉnh góc xoay văn bản.' },
                { step: '02', title: 'Trích xuất & phân tích', desc: 'Mô hình OCR nhận dạng tiếng Việt có dấu chuẩn xác 99.4%, trích xuất cấu trúc bảng biểu và chữ ký số.' },
                { step: '03', title: 'Đối chiếu đa nguồn', desc: 'Kết nối API trực tiếp Cổng Đăng ký Doanh nghiệp, Tổng cục Thuế, EU VIES và cơ sở dữ liệu hải quan.' },
                { step: '04', title: 'Risk Score & báo cáo', desc: 'Tổng hợp điểm rủi ro từ 0 - 100, xuất báo cáo PDF cho chuyên gia thẩm định và lưu vết trên hệ thống.' }
              ].map((item, idx) => (
                <div 
                  key={item.step} 
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    activeStepModal === idx + 1 
                      ? 'bg-blue-50/70 border-blue-200 ring-1 ring-blue-300' 
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <span className="w-7 h-7 rounded-lg bg-[#0f172a] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {tr(item.step)}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{tr(item.title)}</h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{tr(item.desc)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs transition-colors cursor-pointer"
              >
                {tr("Đóng")}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
