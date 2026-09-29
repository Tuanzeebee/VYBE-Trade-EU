'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import Header from '../Header';
import Footer from '../Footer';
import { useLanguage } from '../../context/LanguageContext';
import { usePathname, useRouter } from '../../i18n/navigation';
import { logout } from '../../lib/demoAuth';
import { pageForPath, type DirectoryNav, type LegacyPage } from '../../lib/legacyNav';
import { useDemoSession } from './useDemoSession';
import { useLegacyNavigate } from './useLegacyNavigate';

const NavModalContext = createContext<(label: string) => void>(() => {});

/** Trang con (vd. /products) mở modal "tính năng đang kích hoạt" của khung chung. */
export function useOpenNavModal() {
  return useContext(NavModalContext);
}

/** Khung Header + Footer + modal điều hướng — tách từ renderLayout của app/page.tsx cũ. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const { tr } = useLanguage();
  const { user, setUser } = useDemoSession();
  const router = useRouter();
  const pathname = usePathname();
  const navigate = useLegacyNavigate(user);
  const [directoryNav, setDirectoryNav] = useState<DirectoryNav>('suppliers');
  const pendingDirectoryNav = useRef<DirectoryNav | null>(null);
  const [activeNavModal, setActiveNavModal] = useState<string | null>(null);

  useEffect(() => {
    setDirectoryNav(new URLSearchParams(window.location.search).get('nav') === 'buyer' ? 'buyer' : 'suppliers');
  }, [pathname]);

  function handleNavigate(page: LegacyPage) {
    if (page === 'buyer-directory') {
      navigate(page, { directory: { nav: pendingDirectoryNav.current ?? 'suppliers' } });
    } else {
      navigate(page);
    }
    pendingDirectoryNav.current = null;
  }

  function handleSetDirectoryNav(nav: DirectoryNav) {
    pendingDirectoryNav.current = nav;
    setDirectoryNav(nav);
  }

  function handleLogout() {
    try {
      void logout();
      setUser(null);
      router.push('/login');
    } catch {
      console.warn('Unable to clear session storage.');
    }
  }

  return (
    <NavModalContext.Provider value={setActiveNavModal}>
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-blue-600 selection:text-white flex flex-col justify-between">
        <div>
          <Header
            currentPage={pageForPath(pathname)}
            directoryNav={directoryNav}
            user={user}
            onNavigate={handleNavigate}
            onSetDirectoryNav={handleSetDirectoryNav}
            onLogout={handleLogout}
            onOpenNavModal={setActiveNavModal}
          />
          {children}
        </div>

        <Footer onNavigate={handleNavigate} />

        {activeNavModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 text-left">
              <button
                onClick={() => setActiveNavModal(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-base font-bold text-slate-900 mb-2">{tr(activeNavModal)}</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-5">
                {tr("Tính năng đang được kích hoạt trên hệ thống VYBE TRADE. Nền tảng kết nối trực tiếp doanh nghiệp xuất nhập khẩu Việt Nam với các đối tác toàn cầu.")}
              </p>
              <button
                onClick={() => setActiveNavModal(null)}
                className="w-full py-2.5 rounded-full bg-[#0f172a] text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {tr("Đồng ý")}
              </button>
            </div>
          </div>
        )}
      </div>
    </NavModalContext.Provider>
  );
}
