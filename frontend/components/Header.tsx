'use client';
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import LanguageSelect from './LanguageSelect.tsx';
import { ROLE_LABELS, type DemoUser, getUserPage } from '../lib/demoAuth.ts';
import NotificationBell from './NotificationBell';
import { Link, useRouter } from '../i18n/navigation';

export interface HeaderProps {
  currentPage: string;
  directoryNav: 'suppliers' | 'buyer';
  user: DemoUser | null;
  onNavigate: (page: any) => void;
  onSetDirectoryNav: (nav: 'suppliers' | 'buyer') => void;
  onLogout: () => void;
  onOpenNavModal?: (label: string) => void;
}

export default function Header({
  currentPage,
  directoryNav,
  user,
  onNavigate,
  onSetDirectoryNav,
  onLogout,
  onOpenNavModal
}: HeaderProps) {
  const { tr, t } = useLanguage();
  const router = useRouter();
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const navLinks = [
    { label: t.nav.solutions, id: 'solutions' },
    { label: t.nav.suppliers, id: 'suppliers' },
    { label: t.nav.buyer, id: 'buyer' },
    { label: t.nav.products, id: 'products' },
    { label: t.nav.pricing, id: 'pricing' },
    { label: t.nav.about, id: 'about' }
  ];

  return (
    <>
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 min-h-16 py-3 flex flex-wrap gap-3 items-center justify-between">
          
          {/* Brand Logo: Double Sprout Wing in Dark Teal + VYBE TRADE */}
          <div 
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-8 h-8 flex items-center justify-center text-[#0b5e52]">
              <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 16 26 C 14 18 8 13 4 10 C 3 9 4 7 5 7 C 11 8 15 13 16 26 Z" fill="#0b5e52" />
                <path d="M 16 26 C 18 18 24 13 28 10 C 29 9 28 7 27 7 C 21 8 17 13 16 26 Z" fill="#0b5e52" />
              </svg>
            </div>
            <span className="text-[#0f172a] font-bold text-lg sm:text-[19px] tracking-wide uppercase">
              {tr("VYBE TRADE")}
            </span>
          </div>

          {/* Center: Navigation Links */}
          <nav className="hidden lg:flex flex-wrap items-center gap-4 xl:gap-6">
            {navLinks.map((link) => {
              const isBuyerActive = link.id === directoryNav && (currentPage === 'buyer-directory' || currentPage === 'buyer-seller-detail');
              const isProductActive = link.id === 'products' && currentPage === 'product';
              const isPricingActive = link.id === 'pricing' && currentPage === 'pricing';
              const isSolutionsActive = link.id === 'solutions' && currentPage === 'solutions';
              const isAboutActive = link.id === 'about' && currentPage === 'about';
              const isActive = isBuyerActive || isProductActive || isPricingActive || isSolutionsActive || isAboutActive;

              return (
                <button
                  key={link.id}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    if (link.id === 'solutions') {
                      onNavigate('solutions');
                    } else if (link.id === 'about') {
                      onNavigate('about');
                    } else if (link.id === 'products') {
                      onNavigate('product');
                    } else if (link.id === 'pricing') {
                      onNavigate('pricing');
                    } else if (link.id === 'buyer' || link.id === 'suppliers') {
                      onSetDirectoryNav(link.id as 'buyer' | 'suppliers');
                      onNavigate('buyer-directory');
                    } else {
                      onNavigate('home');
                      if (onOpenNavModal) onOpenNavModal(link.label);
                    }
                  }}
                  className={`text-sm transition-colors cursor-pointer ${
                    isActive
                      ? 'relative text-slate-950 font-bold pb-1 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#0f172a]'
                      : 'text-slate-700 hover:text-slate-950 font-medium'
                  }`}
                >
                  {tr(link.label)}
                </button>
              );
            })}
          </nav>

          {/* Right: Language Selector Flag Pill + User Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            
            <LanguageSelect />

            {user && <NotificationBell />}
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setHeaderProfileOpen(!headerProfileOpen)} 
                  aria-expanded={headerProfileOpen} 
                  className="flex items-center gap-2 rounded-full border border-slate-200 pl-1 pr-3 py-1 hover:bg-slate-50 cursor-pointer"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-900">
                    {tr(user.name.slice(0, 2).toUpperCase())}
                  </span>
                  <span className="hidden max-w-32 truncate text-xs font-semibold xl:inline">{user.name}</span>
                  <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 sm:inline">
                    {tr(ROLE_LABELS[user.role])}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </button>
                {headerProfileOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white py-2 text-left text-sm shadow-xl">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="truncate font-bold">{user.company}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
                      <p className="mt-1 text-xs font-semibold text-teal-700">{tr(ROLE_LABELS[user.role])}</p>
                    </div>
                    <button 
                      onClick={() => { 
                        if (user.role === 'buyer') router.push('/buyer');
                        else onNavigate(getUserPage(user));
                        setHeaderProfileOpen(false); 
                      }} 
                      className="w-full px-4 py-3 text-left font-semibold text-teal-900 hover:bg-teal-50 cursor-pointer"
                    >
                      {tr(user.role === 'seller' ? 'Workspace Seller' : user.role === 'admin' ? 'Quản trị hệ thống' : 'Bảng điều khiển')}
                    </button>
                    {user.role === 'seller' && (
                      <button 
                        onClick={() => { 
                          onNavigate('seller-profile'); 
                          setHeaderProfileOpen(false); 
                        }} 
                        className="w-full px-4 py-3 text-left text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        {tr("Cập nhật hồ sơ xuất khẩu")}
                      </button>
                    )}
                    {user.role === 'buyer' && (
                      <Link
                        href="/suppliers"
                        onClick={() => setHeaderProfileOpen(false)}
                        className="block w-full px-4 py-3 text-left text-slate-600 hover:bg-slate-50"
                      >
                        {tr("Tìm nhà cung cấp")}
                      </Link>
                    )}
                    <Link
                      href="/account"
                      onClick={() => setHeaderProfileOpen(false)}
                      className="block w-full px-4 py-3 text-left text-slate-600 hover:bg-slate-50"
                    >
                      {tr("Tài khoản của tôi")}
                    </Link>
                    <button 
                      onClick={() => {
                        setHeaderProfileOpen(false);
                        onLogout();
                      }} 
                      className="w-full border-t border-slate-100 px-4 py-3 text-left font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      {tr("Đăng xuất")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onNavigate('login')} 
                  className="rounded-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:text-sm cursor-pointer"
                >
                  {tr("Đăng nhập")}
                </button>
                <button 
                  onClick={() => onNavigate('register')} 
                  className="hidden rounded-full bg-[#083832] px-3 py-2 text-xs font-semibold text-white hover:bg-[#062924] sm:inline-flex sm:px-4 sm:text-sm cursor-pointer"
                >
                  {tr("Đăng ký")}
                </button>
              </div>
            )}
          </div>

        </div>
      </header>
    </>
  );
}
