'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  FileText, 
  Award, 
  Database, 
  UserCheck, 
  X, 
  Clock, 
  HelpCircle,
  Building,
  Check,
  Sparkles
} from 'lucide-react';
import { useLanguage } from "../context/LanguageContext";

interface ProductVerificationProps {
  onNavigateHome: () => void;
  onNavigateNav: (label: string) => void;
  onSwitchToAiTrust?: () => void;
}

export default function ProductVerification({ 
  onNavigateHome, 
  onNavigateNav,
  onSwitchToAiTrust 
}: ProductVerificationProps) {
  const { tr } = useLanguage();
  const [activeModal, setActiveModal] = useState<'start' | 'process' | 'compare' | 'level' | null>(null);
  const [selectedLevelDetail, setSelectedLevelDetail] = useState<'l0' | 'l1' | 'l2' | 'l3' | null>(null);
  const [verifyStep, setVerifyStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [taxCode, setTaxCode] = useState('');

  return (
    <div className="w-full flex-1 flex flex-col justify-between">
      
      {/* =========================================================================
          HERO SECTION: KICKER, TITLE, CTA & 3D TIERED VERIFICATION STACK
         ========================================================================= */}
      <section className="relative w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-12 pb-12">
        
        {/* Service Switcher Tabs (Verification vs AI Trust Co-pilot) */}
        {onSwitchToAiTrust && (
          <div className="flex items-center gap-2 mb-6 sm:mb-8 pb-3 border-b border-slate-100">
            <button
              className="px-4 py-1.5 rounded-full text-xs font-semibold bg-slate-900 text-white shadow-xs cursor-default flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>{tr("Dịch vụ 1: Xác minh doanh nghiệp")}</span>
            </button>
            <span className="text-slate-300">{tr("/")}</span>
            <button
              onClick={onSwitchToAiTrust}
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>{tr("Dịch vụ 2: AI Trust Co-pilot")}</span>
            </button>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Heading, Subtitle & Action Buttons */}
          <div className="lg:col-span-6 xl:col-span-6 z-10">
            
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
              {tr("Xác minh doanh nghiệp")}</h1>

            {/* Subheadline */}
            <h2 className="text-slate-800 text-lg sm:text-[20px] font-semibold leading-snug mb-3">
              {tr("Biến hồ sơ doanh nghiệp thành lợi thế cạnh tranh toàn cầu.")}</h2>

            {/* Description Body */}
            <p className="text-slate-600 text-sm sm:text-[15px] leading-relaxed max-w-xl mb-8 font-normal">
              {tr("Quy trình xác minh đa tầng, kết hợp dữ liệu công khai, kiểm tra tài liệu và đánh giá bởi chuyên gia, giúp doanh nghiệp tăng độ tin cậy và dễ dàng kết nối với buyer quốc tế.")}</p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Primary CTA: Bắt đầu xác minh -> */}
              <button 
                onClick={() => {
                  setVerifyStep(1);
                  setActiveModal('start');
                }}
                className="bg-[#0f172a] hover:bg-slate-800 text-white font-medium text-sm sm:text-base px-6 py-3 rounded-full flex items-center gap-2 transition-all shadow-xs hover:shadow-md active:scale-95 cursor-pointer"
              >
                <span>{tr("Bắt đầu xác minh")}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.2]" />
              </button>

              {/* Secondary CTA: Tìm hiểu quy trình */}
              <button 
                onClick={() => setActiveModal('process')}
                className="bg-white hover:bg-slate-50 text-slate-800 font-medium text-sm sm:text-base px-6 py-3 rounded-full border border-slate-200 transition-all shadow-xs hover:border-slate-300 active:scale-95 cursor-pointer"
              >
                {tr("Tìm hiểu quy trình")}</button>
            </div>

          </div>

          {/* Right Column: 3D Tiered Verification Stack & Pipeline Nodes */}
          <div className="lg:col-span-6 xl:col-span-6 relative flex items-center justify-center min-h-[380px] sm:min-h-[440px] select-none">
            
            {/* Background subtle radial ambient glow */}
            <div className="absolute inset-0 bg-radial-[at_50%_50%] from-blue-50/60 via-transparent to-transparent pointer-events-none" />

            <div className="relative w-full max-w-[540px] flex items-center justify-between">
              
              {/* 3D Tiered Isometric Slabs Container */}
              <div className="relative w-[300px] sm:w-[340px] h-[360px] flex flex-col items-center justify-end pb-2">
                
                {/* Visual SVG for 3D Isometric Slabs (L0 -> L1 -> L2 -> L3) */}
                <svg 
                  viewBox="0 0 340 380" 
                  className="w-full h-full filter drop-shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    {/* L3 Gold Slab Gradients */}
                    <linearGradient id="l3Top" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#fde68a" stopOpacity="0.9" />
                    </linearGradient>
                    <linearGradient id="l3Front" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#d97706" stopOpacity="0.35" />
                    </linearGradient>

                    {/* L2 Mint Slab Gradients */}
                    <linearGradient id="l2Top" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f0fdfa" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#ccfbf1" stopOpacity="0.9" />
                    </linearGradient>
                    <linearGradient id="l2Front" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#0f766e" stopOpacity="0.28" />
                    </linearGradient>

                    {/* L1 Blue Slab Gradients */}
                    <linearGradient id="l1Top" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.85" />
                    </linearGradient>
                    <linearGradient id="l1Front" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.28" />
                    </linearGradient>

                    {/* L0 Slate Slab Gradients */}
                    <linearGradient id="l0Top" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.85" />
                    </linearGradient>
                    <linearGradient id="l0Front" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#64748b" stopOpacity="0.3" />
                    </linearGradient>

                    {/* Glass Bevel Filter */}
                    <filter id="glassReflect" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.06" />
                    </filter>
                  </defs>

                  {/* =========================================================
                      TIER L0: BOTTOM PODIUM (Unverified)
                     ========================================================= */}
                  <g transform="translate(30, 230)" filter="url(#glassReflect)">
                    {/* 3D Glass Slab: Top Face */}
                    <path 
                      d="M 140 0 L 260 30 L 120 70 L 0 40 Z" 
                      fill="url(#l0Top)" 
                      stroke="#e2e8f0" 
                      strokeWidth="1.2" 
                    />
                    {/* Front Left Face */}
                    <path 
                      d="M 0 40 L 120 70 L 120 105 L 0 75 Z" 
                      fill="url(#l0Front)" 
                      stroke="#cbd5e1" 
                      strokeWidth="1.2" 
                    />
                    {/* Front Right Face */}
                    <path 
                      d="M 120 70 L 260 30 L 260 65 L 120 105 Z" 
                      fill="#e2e8f0" 
                      stroke="#cbd5e1" 
                      strokeWidth="1.2" 
                    />

                    {/* L0 Badge on Front Left Face */}
                    <g transform="translate(15, 48)">
                      {/* Gray Shield Icon */}
                      <rect x="0" y="4" width="22" height="22" rx="6" fill="#64748b" fillOpacity="0.15" />
                      <path d="M 11 8 L 5 11 V 16 C 5 19.5 7.5 22 11 23 C 14.5 22 17 19.5 17 16 V 11 Z" fill="#64748b" />
                      <circle cx="11" cy="15" r="2" fill="#ffffff" />
                      
                      {/* Text L0 / Unverified */}
                      <text x="30" y="16" fill="#334155" fontSize="13" fontWeight="700">{tr("L0")}</text>
                      <text x="30" y="27" fill="#64748b" fontSize="9.5" fontWeight="600">{tr("Unverified")}</text>
                    </g>
                  </g>

                  {/* =========================================================
                      TIER L1: SECOND SLAB UP (Basic Verified)
                     ========================================================= */}
                  <g transform="translate(30, 160)" filter="url(#glassReflect)">
                    {/* Top Face */}
                    <path 
                      d="M 140 0 L 260 30 L 120 70 L 0 40 Z" 
                      fill="url(#l1Top)" 
                      stroke="#bfdbfe" 
                      strokeWidth="1.2" 
                    />
                    {/* Front Left Face */}
                    <path 
                      d="M 0 40 L 120 70 L 120 105 L 0 75 Z" 
                      fill="url(#l1Front)" 
                      stroke="#93c5fd" 
                      strokeWidth="1.2" 
                    />
                    {/* Front Right Face */}
                    <path 
                      d="M 120 70 L 260 30 L 260 65 L 120 105 Z" 
                      fill="#dbeafe" 
                      stroke="#93c5fd" 
                      strokeWidth="1.2" 
                    />

                    {/* L1 Badge on Front Left Face */}
                    <g transform="translate(15, 48)">
                      <rect x="0" y="4" width="22" height="22" rx="6" fill="#3b82f6" fillOpacity="0.2" />
                      <path d="M 11 8 L 5 11 V 16 C 5 19.5 7.5 22 11 23 C 14.5 22 17 19.5 17 16 V 11 Z" fill="#2563eb" />
                      <path d="M 8.5 15 L 10.5 17 L 14 13.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

                      {/* Text L1 / Basic Verified */}
                      <text x="30" y="16" fill="#1e3a8a" fontSize="13" fontWeight="700">{tr("Cấp 1")}</text>
                      <text x="30" y="27" fill="#2563eb" fontSize="9.5" fontWeight="600">{tr("Cơ bản")}</text>
                    </g>
                  </g>

                  {/* =========================================================
                      TIER L2: THIRD SLAB UP (Enhanced Verified)
                     ========================================================= */}
                  <g transform="translate(30, 90)" filter="url(#glassReflect)">
                    {/* Top Face */}
                    <path 
                      d="M 140 0 L 260 30 L 120 70 L 0 40 Z" 
                      fill="url(#l2Top)" 
                      stroke="#99f6e4" 
                      strokeWidth="1.2" 
                    />
                    {/* Front Left Face */}
                    <path 
                      d="M 0 40 L 120 70 L 120 105 L 0 75 Z" 
                      fill="url(#l2Front)" 
                      stroke="#5eead4" 
                      strokeWidth="1.2" 
                    />
                    {/* Front Right Face */}
                    <path 
                      d="M 120 70 L 260 30 L 260 65 L 120 105 Z" 
                      fill="#ccfbf1" 
                      stroke="#5eead4" 
                      strokeWidth="1.2" 
                    />

                    {/* L2 Badge on Front Left Face */}
                    <g transform="translate(15, 48)">
                      <rect x="0" y="4" width="22" height="22" rx="6" fill="#0d9488" fillOpacity="0.2" />
                      <path d="M 11 8 L 5 11 V 16 C 5 19.5 7.5 22 11 23 C 14.5 22 17 19.5 17 16 V 11 Z" fill="#0f766e" />
                      <path d="M 8.5 15 L 10.5 17 L 14 13.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

                      {/* Text L2 / Enhanced Verified */}
                      <text x="30" y="16" fill="#134e4a" fontSize="13" fontWeight="700">{tr("Cấp 2")}</text>
                      <text x="30" y="27" fill="#0f766e" fontSize="9.5" fontWeight="600">{tr("Nâng cao")}</text>
                    </g>
                  </g>

                  {/* =========================================================
                      TIER L3: TOP CROWN PODIUM (Chuyên sâu)
                     ========================================================= */}
                  <g transform="translate(30, 20)" filter="url(#glassReflect)">
                    {/* Top Face */}
                    <path 
                      d="M 140 0 L 260 30 L 120 70 L 0 40 Z" 
                      fill="url(#l3Top)" 
                      stroke="#fde68a" 
                      strokeWidth="1.4" 
                    />
                    {/* Front Left Face */}
                    <path 
                      d="M 0 40 L 120 70 L 120 105 L 0 75 Z" 
                      fill="url(#l3Front)" 
                      stroke="#fcd34d" 
                      strokeWidth="1.4" 
                    />
                    {/* Front Right Face */}
                    <path 
                      d="M 120 70 L 260 30 L 260 65 L 120 105 Z" 
                      fill="#fef3c7" 
                      stroke="#fcd34d" 
                      strokeWidth="1.4" 
                    />

                    {/* Gold Stand / Golden Badge Plaque on Top Face */}
                    <g transform="translate(75, -5)">
                      {/* Soft Golden Halo */}
                      <ellipse cx="60" cy="40" rx="45" ry="30" fill="#fbbf24" fillOpacity="0.25" filter="blur(6px)" />
                      
                      {/* Golden Laurel Wreath */}
                      <path 
                        d="M 35 48 C 30 35, 38 20, 55 18 M 85 48 C 90 35, 82 20, 65 18" 
                        stroke="#d97706" 
                        strokeWidth="2.2" 
                        strokeLinecap="round" 
                        fill="none" 
                      />
                      {/* Laurel Leaves */}
                      <ellipse cx="38" cy="30" rx="3.5" ry="2" transform="rotate(-30 38 30)" fill="#d97706" />
                      <ellipse cx="44" cy="22" rx="3.5" ry="2" transform="rotate(-15 44 22)" fill="#d97706" />
                      <ellipse cx="82" cy="30" rx="3.5" ry="2" transform="rotate(30 82 30)" fill="#d97706" />
                      <ellipse cx="76" cy="22" rx="3.5" ry="2" transform="rotate(15 76 22)" fill="#d97706" />

                      {/* Shield in Center with Checkmark */}
                      <path d="M 60 18 L 48 24 V 36 C 48 43 53 48 60 50 C 67 48 72 43 72 36 V 24 Z" fill="#0f766e" />
                      <path d="M 54 34 L 58 38 L 66 30" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </g>

                    {/* L3 Label on Top Podium Left */}
                    <g transform="translate(18, 30)">
                      <text x="0" y="16" fill="#0f172a" fontSize="18" fontWeight="800">{tr("Cấp 3")}</text>
                      <text x="0" y="32" fill="#0f172a" fontSize="12" fontWeight="700">{tr("Chuyên sâu")}</text>
                    </g>
                  </g>

                  {/* Connector lines weaving to the right */}
                  <path d="M 230 50 C 270 45, 300 45, 330 45" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
                  <path d="M 230 120 C 270 120, 290 120, 330 120" stroke="#0d9488" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
                  <path d="M 230 190 C 270 190, 290 195, 330 200" stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
                  <path d="M 230 260 C 260 265, 290 280, 330 285" stroke="#64748b" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />

                  {/* Dot anchors on the connector lines */}
                  <circle cx="230" cy="50" r="3.5" fill="#f59e0b" />
                  <circle cx="230" cy="120" r="3.5" fill="#0d9488" />
                  <circle cx="230" cy="190" r="3.5" fill="#3b82f6" />
                  <circle cx="230" cy="260" r="3.5" fill="#64748b" />
                </svg>

              </div>

              {/* Data Pipeline Floating Node Badges (Right Side) */}
              <div className="flex flex-col gap-5 sm:gap-6 z-10 pl-2">
                
                {/* Node 1: Hồ sơ doanh nghiệp */}
                <div 
                  onClick={() => {
                    setSelectedLevelDetail('l3');
                    setActiveModal('level');
                  }}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-slate-700 group-hover:scale-105 group-hover:border-amber-400 group-hover:text-amber-600 transition-all shrink-0">
                    <Building className="w-4 h-4 stroke-[2]" />
                  </div>
                  <span className="text-xs sm:text-[13px] font-semibold text-slate-800 group-hover:text-slate-950 transition-colors whitespace-nowrap">
                    {tr("Hồ sơ doanh nghiệp")}</span>
                </div>

                {/* Node 2: Giấy phép & chứng nhận */}
                <div 
                  onClick={() => {
                    setSelectedLevelDetail('l2');
                    setActiveModal('level');
                  }}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-slate-700 group-hover:scale-105 group-hover:border-emerald-400 group-hover:text-emerald-600 transition-all shrink-0">
                    <Award className="w-4 h-4 stroke-[2]" />
                  </div>
                  <span className="text-xs sm:text-[13px] font-semibold text-slate-800 group-hover:text-slate-950 transition-colors whitespace-nowrap">
                    {tr("Giấy phép & chứng nhận")}</span>
                </div>

                {/* Node 3: Đối chiếu dữ liệu công khai */}
                <div 
                  onClick={() => {
                    setSelectedLevelDetail('l1');
                    setActiveModal('level');
                  }}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-slate-700 group-hover:scale-105 group-hover:border-blue-400 group-hover:text-blue-600 transition-all shrink-0">
                    <Database className="w-4 h-4 stroke-[2]" />
                  </div>
                  <span className="text-xs sm:text-[13px] font-semibold text-slate-800 group-hover:text-slate-950 transition-colors whitespace-nowrap">
                    {tr("Đối chiếu dữ liệu công khai")}</span>
                </div>

                {/* Node 4: Đánh giá bởi chuyên gia */}
                <div 
                  onClick={() => {
                    setSelectedLevelDetail('l3');
                    setActiveModal('level');
                  }}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-slate-700 group-hover:scale-105 group-hover:border-indigo-400 group-hover:text-indigo-600 transition-all shrink-0">
                    <UserCheck className="w-4 h-4 stroke-[2]" />
                  </div>
                  <span className="text-xs sm:text-[13px] font-semibold text-slate-800 group-hover:text-slate-950 transition-colors whitespace-nowrap">
                    {tr("Đánh giá bởi chuyên gia")}</span>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================================
          BOTTOM SECTION: 4 CẤP ĐỘ XÁC MINH (L0 -> L1 -> L2 -> L3)
         ========================================================================= */}
      <section className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pb-16">
        
        {/* Section Header: Title + Link "So sánh chi tiết ->" */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <h3 className="text-xl sm:text-[22px] font-bold text-slate-900 tracking-tight">
            {tr("4 cấp độ xác minh")}</h3>

          <button 
            onClick={() => setActiveModal('compare')}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{tr("So sánh chi tiết")}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        {/* 4 Connected Cards (Horizontal Row with Arrow Dividers) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          
          {/* Card 1: L0 Unverified */}
          <div className="relative group">
            <div 
              onClick={() => {
                setSelectedLevelDetail('l0');
                setActiveModal('level');
              }}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex items-start gap-4 min-h-[110px]"
            >
              {/* Badge Icon */}
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                <Clock className="w-6 h-6 stroke-[2]" />
              </div>

              {/* Text Content */}
              <div>
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <h4 className="text-base font-bold text-slate-900">{tr("L0")}</h4>
                  <span className="text-sm font-semibold text-slate-700">{tr("Unverified")}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-snug font-normal">
                  {tr("Hồ sơ cơ bản,")}<br />
                  {tr("chưa xác minh")}</p>
              </div>
            </div>

            {/* Direction Arrow (Desktop view) */}
            <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 text-slate-400 pointer-events-none">
              <ArrowRight className="w-4 h-4 text-blue-500 stroke-[2.5]" />
            </div>
          </div>

          {/* Card 2: L1 Basic Verified */}
          <div className="relative group">
            <div 
              onClick={() => {
                setSelectedLevelDetail('l1');
                setActiveModal('level');
              }}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex items-start gap-4 min-h-[110px]"
            >
              {/* Badge Icon */}
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
              </div>

              {/* Text Content */}
              <div>
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <h4 className="text-base font-bold text-blue-600">{tr("Cấp 1")}</h4>
                  <span className="text-sm font-semibold text-blue-600">{tr("Cơ bản")}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-snug font-normal">
                  {tr("Đã đối chiếu MST")}<br />
                  {tr("và thông tin cơ bản")}</p>
              </div>
            </div>

            {/* Direction Arrow (Desktop view) */}
            <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 text-slate-400 pointer-events-none">
              <ArrowRight className="w-4 h-4 text-emerald-500 stroke-[2.5]" />
            </div>
          </div>

          {/* Card 3: L2 Enhanced Verified */}
          <div className="relative group">
            <div 
              onClick={() => {
                setSelectedLevelDetail('l2');
                setActiveModal('level');
              }}
              className="bg-[#f0fdfa]/60 rounded-2xl p-5 border border-emerald-100/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex items-start gap-4 min-h-[110px]"
            >
              {/* Badge Icon */}
              <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 border border-emerald-200/80 flex items-center justify-center shrink-0 text-emerald-700">
                <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
              </div>

              {/* Text Content */}
              <div>
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <h4 className="text-base font-bold text-slate-900">{tr("Cấp 2")}</h4>
                  <span className="text-sm font-semibold text-slate-900">{tr("Nâng cao")}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-snug font-normal">
                  {tr("Đã đối chiếu chứng nhận")}<br />
                  {tr("và bằng chứng xuất khẩu")}</p>
              </div>
            </div>

            {/* Direction Arrow (Desktop view) */}
            <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 text-slate-400 pointer-events-none">
              <ArrowRight className="w-4 h-4 text-amber-500 stroke-[2.5]" />
            </div>
          </div>

          {/* Card 4: L3 Chuyên sâu */}
          <div className="relative group">
            <div 
              onClick={() => {
                setSelectedLevelDetail('l3');
                setActiveModal('level');
              }}
              className="bg-[#fffbeb] rounded-2xl p-5 border border-amber-200/80 shadow-xs hover:shadow-md hover:border-amber-400 transition-all cursor-pointer flex items-start gap-4 min-h-[110px]"
            >
              {/* Badge Icon */}
              <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300/80 flex items-center justify-center shrink-0 text-amber-700">
                <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
              </div>

              {/* Text Content */}
              <div>
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <h4 className="text-base font-bold text-amber-950">{tr("Cấp 3")}</h4>
                  <span className="text-sm font-semibold text-amber-950">{tr("Chuyên sâu")}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-snug font-normal">
                  {tr("Đã có đánh giá nhà máy")}<br />
                  {tr("của bên thứ ba")}</p>
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* =========================================================================
          MODALS & INTERACTIVE FLOWS (Zero Dead Clicks)
         ========================================================================= */}
      
      {/* Modal 1: Bắt đầu xác minh (Wizard Flow) */}
      {activeModal === 'start' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-left">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{tr("Đăng ký xác minh doanh nghiệp")}</h3>
                <p className="text-xs text-slate-500">{tr("Bước ")}{tr(verifyStep)} {tr(" / 3: Khởi tạo hồ sơ thẩm định B2B")}</p>
              </div>
            </div>

            {verifyStep === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); setVerifyStep(2); }} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{tr("Tên pháp nhân công ty (theo ĐKKD)")}</label>
                  <input 
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={tr("VD: Công ty Cổ phần Nông sản Quốc tế An Nam")}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{tr("Mã số thuế doanh nghiệp (MST)")}</label>
                  <input 
                    type="text"
                    required
                    value={taxCode}
                    onChange={(e) => setTaxCode(e.target.value)}
                    placeholder={tr("VD: 0314892345")}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{tr("Ngành hàng chủ lực")}</label>
                  <select className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-teal-600 bg-white">
                    <option value={"Nông sản (Cà phê, Gạo, Hồ tiêu, Hạt điều)"}>{tr("Nông sản (Cà phê, Gạo, Hồ tiêu, Hạt điều)")}</option>
                    <option value={"Thủy sản (Tôm, Cá tra, Cá ngừ đông lạnh)"}>{tr("Thủy sản (Tôm, Cá tra, Cá ngừ đông lạnh)")}</option>
                    <option value={"Thực phẩm chế biến & Gia vị"}>{tr("Thực phẩm chế biến & Gia vị")}</option>
                    <option value={"Thủ công mỹ nghệ & Gỗ xuất khẩu"}>{tr("Thủ công mỹ nghệ & Gỗ xuất khẩu")}</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    type="submit"
                    className="flex-1 py-2.5 rounded-full bg-[#0f172a] hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer text-center"
                  >
                    {tr("Tiếp tục kiểm tra MST (Sang L1)")}</button>
                  <button 
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {tr("Hủy")}</button>
                </div>
              </form>
            )}

            {verifyStep === 2 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-blue-900">{tr("Mã số thuế hợp lệ qua VN Business Registry")}</h4>
                    <p className="text-[11px] text-blue-700 mt-0.5">{tr("Tình trạng: Đang hoạt động, không nợ thuế quá hạn. Đủ điều kiện cấp chứng nhận L1.")}</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600">
                  <p className="font-semibold text-slate-800 mb-1.5">{tr("Để nâng cấp lên L2 / L3, vui lòng chọn tài liệu sẵn có:")}</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded text-teal-600" />
                      <span>{tr("Chứng chỉ quản lý chất lượng (ISO, HACCP, GlobalGAP, BRCGS)")}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded text-teal-600" />
                      <span>{tr("Hồ sơ năng lực nhà máy & hình ảnh dây chuyền sản xuất")}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded text-teal-600" />
                      <span>{tr("Chứng từ xuất khẩu / Bill of Lading trong 12 tháng gần nhất")}</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    onClick={() => setVerifyStep(3)}
                    className="flex-1 py-2.5 rounded-full bg-[#0f172a] hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer text-center"
                  >
                    {tr("Gửi hồ sơ thẩm định chuyên gia")}</button>
                  <button 
                    onClick={() => setVerifyStep(1)}
                    className="px-4 py-2.5 rounded-full border border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {tr("Quay lại")}</button>
                </div>
              </div>
            )}

            {verifyStep === 3 && (
              <div className="py-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <Check className="w-7 h-7 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">{tr("Hồ sơ xác minh đã được tiếp nhận")}</h3>
                <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
                  {tr("Đội ngũ chuyên gia VYBE Trade sẽ đối soát dữ liệu và phản hồi kết quả cấp chứng nhận L1/L2 trong vòng 24 - 48 giờ làm việc.")}</p>
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-6 py-2.5 rounded-full bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {tr("Hoàn tất và quay lại")}</button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal 2: Tìm hiểu quy trình / Quy trình thẩm định */}
      {activeModal === 'process' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-2xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-left">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">{tr("Quy trình thẩm định doanh nghiệp")}</h3>
            <p className="text-xs text-slate-500 mb-5">{tr("4 bước chuẩn hóa từ khai báo ban đầu đến cấp dấu chứng nhận quốc tế")}</p>

            <div className="space-y-3">
              {[
                { step: '01', title: 'Thu thập & Khai báo dữ liệu', desc: 'Doanh nghiệp cung cấp mã số thuế, giấy phép kinh doanh, năng lực sản xuất và thông tin người đại diện pháp luật.' },
                { step: '02', title: 'Đối soát cổng thông tin quốc gia', desc: 'Hệ thống tự động liên kết VN Business Registry và EU VIES để kiểm tra tính hợp lệ và lịch sử tuân thủ thuế.' },
                { step: '03', title: 'Thẩm tra năng lực & Chứng nhận', desc: 'Chuyên viên kiểm định chứng chỉ quốc tế (ISO, HACCP, GlobalGAP, BRCGS) và tiến hành khảo sát cơ sở nếu cần.' },
                { step: '04', title: 'Cấp Trust Badge & Bảo chứng B2B', desc: 'Gắn huy hiệu xác minh L1/L2/L3 trên hồ sơ công khai, đưa vào danh sách ưu tiên kết nối với Buyer toàn cầu.' }
              ].map((item) => (
                <div key={item.step} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
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
                onClick={() => {
                  setActiveModal('start');
                  setVerifyStep(1);
                }}
                className="px-5 py-2.5 rounded-full bg-[#0f172a] hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                {tr("Bắt đầu xác minh ngay")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Bảng so sánh chi tiết L0 -> L3 */}
      {activeModal === 'compare' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-left max-h-[88vh] overflow-y-auto">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">{tr("Bảng so sánh 4 cấp độ xác minh")}</h3>
            <p className="text-xs text-slate-500 mb-5">{tr("Chi tiết quyền lợi, tiêu chí thẩm định và mức độ hiển thị trên thị trường")}</p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 font-semibold">{tr("Tiêu chí")}</th>
                    <th className="py-2.5 font-semibold text-slate-600">{tr("L0 (Chưa XM)")}</th>
                    <th className="py-2.5 font-semibold text-blue-600">{tr("L1 (Cơ bản)")}</th>
                    <th className="py-2.5 font-semibold text-emerald-700">{tr("L2 (Nâng cao)")}</th>
                    <th className="py-2.5 font-semibold text-amber-700">{tr("L3 (Toàn diện)")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 font-semibold text-slate-800">{tr("Kiểm tra MST & Pháp nhân")}</td>
                    <td className="py-2.5 text-slate-400">{tr("Không")}</td>
                    <td className="py-2.5 text-emerald-600 font-bold">{tr("✓ Đạt")}</td>
                    <td className="py-2.5 text-emerald-600 font-bold">{tr("✓ Đạt")}</td>
                    <td className="py-2.5 text-emerald-600 font-bold">{tr("✓ Đạt")}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-slate-800">{tr("Kiểm định chứng chỉ chất lượng")}</td>
                    <td className="py-2.5 text-slate-400">{tr("Không")}</td>
                    <td className="py-2.5 text-slate-400">{tr("Không")}</td>
                    <td className="py-2.5 text-emerald-600 font-bold">{tr("✓ Đạt")}</td>
                    <td className="py-2.5 text-emerald-600 font-bold">{tr("✓ Đạt")}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-slate-800">{tr("Khảo sát năng lực nhà máy")}</td>
                    <td className="py-2.5 text-slate-400">{tr("Không")}</td>
                    <td className="py-2.5 text-slate-400">{tr("Không")}</td>
                    <td className="py-2.5 text-slate-400">{tr("Tùy chọn")}</td>
                    <td className="py-2.5 text-emerald-600 font-bold">{tr("✓ Trực tiếp")}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-slate-800">{tr("Ưu tiên hiển thị khi Buyer tìm kiếm")}</td>
                    <td className="py-2.5 text-slate-400">{tr("Thấp")}</td>
                    <td className="py-2.5 text-slate-700">{tr("Trung bình")}</td>
                    <td className="py-2.5 text-blue-700 font-semibold">{tr("Ưu tiên cao")}</td>
                    <td className="py-2.5 text-amber-700 font-bold">{tr("Top đầu trang")}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-slate-800">{tr("Bảo lãnh thanh toán Escrow")}</td>
                    <td className="py-2.5 text-slate-400">{tr("Không")}</td>
                    <td className="py-2.5 text-slate-400">{tr("Không")}</td>
                    <td className="py-2.5 text-slate-400">{tr("Không")}</td>
                    <td className="py-2.5 text-emerald-600 font-bold">{tr("✓ Tích hợp")}</td>
                  </tr>
                </tbody>
              </table>
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

      {/* Modal 4: Chi tiết từng cấp độ khi click thẻ */}
      {activeModal === 'level' && selectedLevelDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 text-left">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {selectedLevelDetail === 'l0' && (
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">{tr("Cấp độ khởi tạo")}</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5 mb-2">{tr("L0 - Unverified (Chưa xác minh)")}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {tr("Tài khoản tự khai báo thông tin ban đầu. Chưa qua đối chiếu cổng dữ liệu quốc gia. Buyer sẽ nhận cảnh báo cần thẩm tra thêm trước khi giao dịch.")}</p>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 mb-4">
                  {tr("Khuyến nghị: Nâng cấp lên tối thiểu L1 để kích hoạt chức năng nhận Request từ đối tác quốc tế.")}</div>
              </div>
            )}

            {selectedLevelDetail === 'l1' && (
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase">{tr("Cấp độ cơ bản")}</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5 mb-2">{tr("Cấp 1 - Cơ bản")}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {tr("Đã đối chiếu pháp lý doanh nghiệp: đăng ký kinh doanh và người đại diện.")}</p>
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-800 mb-4">
                  {tr("Cấp Cơ bản miễn phí.")}</div>
              </div>
            )}

            {selectedLevelDetail === 'l2' && (
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase">{tr("Cấp độ nâng cao")}</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5 mb-2">{tr("Cấp 2 - Nâng cao")}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {tr("Đã đối chiếu chứng nhận với tổ chức cấp và bằng chứng xuất khẩu.")}</p>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-800 mb-4">
                  {tr("Cấp Nâng cao là cấp trả phí; hồ sơ do đội ngũ VYBE Trade kiểm.")}</div>
              </div>
            )}

            {selectedLevelDetail === 'l3' && (
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase">{tr("Cấp độ chuyên sâu")}</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5 mb-2">{tr("Cấp 3 - Chuyên sâu")}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {tr("Đánh giá nhà máy do bên thứ ba thực hiện.")}</p>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 mb-4">
                  {tr("Chỉ áp dụng khi có đánh giá thực tế của bên thứ ba.")}</div>
              </div>
            )}

            <button
              onClick={() => {
                setActiveModal('start');
                setVerifyStep(1);
              }}
              className="w-full py-2.5 rounded-full bg-[#0f172a] hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              {tr("Nâng cấp hồ sơ doanh nghiệp ngay")}</button>
          </div>
        </div>
      )}

    </div>
  );
}
