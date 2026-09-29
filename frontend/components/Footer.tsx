'use client';
import React from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { ShieldCheck, Mail, Phone, MapPin, Globe } from 'lucide-react';

export interface FooterProps {
  onNavigate?: (page: any) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const { tr, t } = useLanguage();

  return (
    <footer className="w-full bg-[#0b1324] text-slate-400 text-xs border-t border-slate-800 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-slate-800/80">
          
          {/* Col 1: Brand Info */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 flex items-center justify-center text-teal-400">
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 16 26 C 14 18 8 13 4 10 C 3 9 4 7 5 7 C 11 8 15 13 16 26 Z" fill="#2dd4bf" />
                  <path d="M 16 26 C 18 18 24 13 28 10 C 29 9 28 7 27 7 C 21 8 17 13 16 26 Z" fill="#2dd4bf" />
                </svg>
              </div>
              <span className="text-white font-bold text-base tracking-wide uppercase">
                VYBE TRADE
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              {tr("Nền tảng kết nối giao thương B2B trực tiếp với hệ sinh thái xác minh đa tầng L1 - L2 - L3, giúp Buyer toàn cầu kết nối an toàn với nhà cung ứng uy tín tại Việt Nam.")}
            </p>
            <div className="flex items-center gap-2 pt-1 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span className="font-semibold text-slate-200">
                {tr("Xác thực thực địa & Pháp lý doanh nghiệp chuẩn hóa")}
              </span>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-2.5">
            <h4 className="text-slate-200 font-bold text-xs uppercase tracking-wider">
              {tr("Khám phá")}
            </h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigate?.('buyer-directory')} className="hover:text-white transition-colors cursor-pointer">
                  {tr(t.nav.buyer)}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('product')} className="hover:text-white transition-colors cursor-pointer">
                  {tr(t.nav.products)}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('pricing')} className="hover:text-white transition-colors cursor-pointer">
                  {tr(t.nav.pricing)}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('solutions')} className="hover:text-white transition-colors cursor-pointer">
                  {tr(t.nav.solutions)}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Trust */}
          <div className="space-y-2.5">
            <h4 className="text-slate-200 font-bold text-xs uppercase tracking-wider">
              {tr("Tiêu chuẩn tin cậy")}
            </h4>
            <ul className="space-y-2">
              <li className="text-slate-400">{tr("Xác minh L1 - Pháp lý cơ bản")}</li>
              <li className="text-slate-400">{tr("Xác minh L2 - Năng lực nhà xưởng")}</li>
              <li className="text-slate-400">{tr("Xác minh L3 - Kiểm toán VYBE độc lập")}</li>
              <li className="text-slate-400">{tr("Chứng chỉ ISO, HACCP, GlobalGAP")}</li>
            </ul>
          </div>

          {/* Col 4: Contact */}
          <div className="space-y-2.5">
            <h4 className="text-slate-200 font-bold text-xs uppercase tracking-wider">
              {tr("Liên hệ")}
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{tr("Hà Nội & TP. Hồ Chí Minh, Việt Nam")}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>support@vybetrade.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>www.vybetrade.com</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
          <p>© {new Date().getFullYear()} VYBE TRADE Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 cursor-pointer">{tr("Điều khoản dịch vụ")}</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">{tr("Chính sách bảo mật")}</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">{tr("Bảo vệ dữ liệu Buyer & Supplier")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
