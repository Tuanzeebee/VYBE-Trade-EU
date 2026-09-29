'use client';

import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import HomePage from '../components/HomePage';
import BuyerDirectory from '../components/BuyerDirectory';
import BuyerSellerDetail, { type SupplierData, DEFAULT_SELLER_DETAIL } from '../components/BuyerSellerDetail';
import PricingPlans from '../components/PricingPlans';
import SolutionsPage from '../components/SolutionsPage';
import AboutUsPage from '../components/AboutUsPage';
import AuthPage from '../components/AuthPage';
import BuyerOnboarding from '../components/BuyerOnboarding';
import SellerOnboarding from '../components/SellerOnboarding';
import SellerWorkspace from '../components/SellerWorkspace';
import AdminDashboard from '../components/AdminDashboard';
import ProductAiTrust from '../components/ProductAiTrust';
import ProductVerification from '../components/ProductVerification';
import { getSession, getUserPage, logout, completeOnboarding, type DemoUser } from '../lib/demoAuth';
import { useLanguage } from '../context/LanguageContext';
import { X } from 'lucide-react';

type Page = 
  | 'home' 
  | 'product' 
  | 'onboarding' 
  | 'seller-profile' 
  | 'workspace' 
  | 'buyer-directory' 
  | 'buyer-seller-detail' 
  | 'pricing' 
  | 'solutions' 
  | 'about' 
  | 'login' 
  | 'register' 
  | 'admin';

export default function Page() {
  const { tr } = useLanguage();
  const [user, setUser] = useState<DemoUser | null>(() => {
    try { return getSession(); } catch { return null; }
  });
  const [currentPage, setPage] = useState<Page>(() => user ? getUserPage(user) : 'home');
  const [directoryNav, setDirectoryNav] = useState<'suppliers' | 'buyer'>('suppliers');
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierData>(DEFAULT_SELLER_DETAIL);
  const [openSupplierRfq, setOpenSupplierRfq] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<'verification' | 'profile' | 'overview' | 'products' | 'rfq' | 'notifications' | 'licenses'>('profile');
  const [productService, setProductService] = useState<'ai-trust' | 'verification'>('ai-trust');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState('Tất cả thị trường');
  const [selectedTrust, setSelectedTrust] = useState('Tất cả cấp độ');
  const [activeNavModal, setActiveNavModal] = useState<string | null>(null);

  function setCurrentPage(page: Page) {
    const protectedPage = ['workspace', 'onboarding', 'seller-profile', 'admin'].includes(page);
    if (protectedPage && !user) { 
      setPage('login'); 
      return; 
    }
    if (user && getUserPage(user) === 'onboarding') { 
      setPage('onboarding'); 
      return; 
    }
    if (user && (page === 'onboarding' ||
      (['workspace', 'seller-profile'].includes(page) && user.role !== 'seller') ||
      (page === 'admin' && user.role !== 'admin'))) {
      setPage(getUserPage(user)); 
      return;
    }
    if (page === 'buyer-seller-detail') setOpenSupplierRfq(false);
    setPage(page);
  }

  function authenticated(nextUser: DemoUser) {
    setUser(nextUser);
    setWorkspaceTab('profile');
    setSearchTerm('');
    setDirectoryNav(nextUser.role === 'buyer' ? 'buyer' : 'suppliers');
    setPage(getUserPage(nextUser));
  }

  function handleLogout() {
    try {
      logout();
      setUser(null);
      setSelectedSupplier(DEFAULT_SELLER_DETAIL);
      setSearchTerm('');
      setPage('login');
    } catch {
      console.warn('Unable to clear session storage.');
    }
  }

  if (currentPage === 'login' || currentPage === 'register') {
    return (
      <AuthPage 
        key={currentPage} 
        mode={currentPage} 
        onModeChange={setCurrentPage} 
        onAuthenticated={authenticated} 
        onNavigateHome={() => setCurrentPage('home')} 
      />
    );
  }

  if (currentPage === 'onboarding' && user) {
    const onComplete = (profile: Record<string, string>) => authenticated(completeOnboarding(user.id, profile));
    if (user.role === 'buyer') {
      return <BuyerOnboarding key={user.id} user={user} onComplete={onComplete} onLogout={handleLogout} />;
    }
    if (user.role === 'seller') {
      return (
        <SellerOnboarding 
          key={user.id} 
          account={user} 
          initialStep={1} 
          onComplete={onComplete}
          onLogout={handleLogout} 
          onNavigateHome={() => setCurrentPage('home')}
          onNavigateWorkspace={() => setCurrentPage('workspace')} 
        />
      );
    }
  }

  if (currentPage === 'workspace') {
    return (
      <SellerWorkspace 
        key={user?.id}
        account={user || undefined}
        onLogout={handleLogout}
        onNavigateHome={() => setCurrentPage('home')}
        onNavigateOnboarding={() => setCurrentPage('seller-profile')}
        onNavigateBuyerDetail={() => setCurrentPage('buyer-seller-detail')}
        initialTab={workspaceTab}
      />
    );
  }

  if (currentPage === 'seller-profile') {
    return (
      <SellerOnboarding 
        key={user?.id}
        account={user || undefined}
        onLogout={handleLogout}
        onNavigateHome={() => setCurrentPage('home')}
        onNavigateWorkspace={(tab) => {
          setWorkspaceTab(tab || 'profile');
          setCurrentPage('workspace');
        }}
      />
    );
  }

  if (currentPage === 'admin' && user?.role === 'admin') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between">
        <div>
          <Header 
            currentPage={currentPage}
            directoryNav={directoryNav}
            user={user}
            onNavigate={setCurrentPage}
            onSetDirectoryNav={setDirectoryNav}
            onLogout={handleLogout}
            onOpenNavModal={setActiveNavModal}
          />
          <AdminDashboard />
        </div>
        <Footer onNavigate={setCurrentPage} />
      </div>
    );
  }

  const renderLayout = (content: React.ReactNode) => (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      <div>
        <Header 
          currentPage={currentPage}
          directoryNav={directoryNav}
          user={user}
          onNavigate={setCurrentPage}
          onSetDirectoryNav={setDirectoryNav}
          onLogout={handleLogout}
          onOpenNavModal={setActiveNavModal}
        />
        {content}
      </div>

      <Footer onNavigate={setCurrentPage} />

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
  );

  if (currentPage === 'buyer-directory') {
    return renderLayout(
      <BuyerDirectory 
        initialSearchTerm={searchTerm}
        initialCategory={selectedCategory}
        initialMarket={selectedMarket}
        initialLevel={selectedTrust.startsWith('L') ? selectedTrust.slice(0, 2) : 'all'}
        onSelectSupplier={(supp) => {
          setSelectedSupplier(supp);
          setCurrentPage('buyer-seller-detail');
        }}
        onNavigateHome={() => setCurrentPage('home')}
        onOpenRfqModal={(supplier) => {
          setSelectedSupplier(supplier);
          setOpenSupplierRfq(true);
          setPage('buyer-seller-detail');
        }}
      />
    );
  }

  if (currentPage === 'buyer-seller-detail') {
    return renderLayout(
      <BuyerSellerDetail 
        key={`${selectedSupplier.id}-${openSupplierRfq}`}
        openRfq={openSupplierRfq}
        supplier={selectedSupplier}
        onBackToDirectory={() => setCurrentPage('buyer-directory')}
        onNavigateHome={() => setCurrentPage('home')}
        onNavigateWorkspace={() => {
          setWorkspaceTab('profile');
          setCurrentPage('workspace');
        }}
      />
    );
  }

  if (currentPage === 'pricing') {
    return renderLayout(
      <PricingPlans 
        onNavigateHome={() => setCurrentPage('home')}
        onNavigateOnboarding={() => setCurrentPage('onboarding')}
        onNavigateWorkspace={() => {
          setWorkspaceTab('profile');
          setCurrentPage('workspace');
        }}
      />
    );
  }

  if (currentPage === 'solutions') {
    return renderLayout(
      <SolutionsPage 
        onNavigateHome={() => setCurrentPage('home')}
        onNavigateDirectory={() => setCurrentPage('buyer-directory')}
        onNavigatePricing={() => setCurrentPage('pricing')}
        onNavigateOnboarding={() => setCurrentPage('onboarding')}
        onNavigateWorkspace={() => {
          setWorkspaceTab('profile');
          setCurrentPage('workspace');
        }}
      />
    );
  }

  if (currentPage === 'about') {
    return renderLayout(
      <AboutUsPage 
        onNavigateHome={() => setCurrentPage('home')}
        onNavigateDirectory={() => setCurrentPage('buyer-directory')}
        onNavigateSolutions={() => setCurrentPage('solutions')}
        onNavigatePricing={() => setCurrentPage('pricing')}
        onNavigateOnboarding={() => setCurrentPage('onboarding')}
      />
    );
  }

  if (currentPage === 'product') {
    return renderLayout(
      productService === 'ai-trust' ? (
        <ProductAiTrust 
          onNavigateHome={() => setCurrentPage('home')}
          onNavigateNav={(nav) => setActiveNavModal(nav)}
          onSwitchToVerification={() => setProductService('verification')}
        />
      ) : (
        <ProductVerification 
          onNavigateHome={() => setCurrentPage('home')}
          onNavigateNav={(nav) => setActiveNavModal(nav)}
          onSwitchToAiTrust={() => setProductService('ai-trust')}
        />
      )
    );
  }

  return renderLayout(
    <HomePage 
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      selectedMarket={selectedMarket}
      setSelectedMarket={setSelectedMarket}
      selectedTrust={selectedTrust}
      setSelectedTrust={setSelectedTrust}
      onNavigate={setCurrentPage}
      onSelectSupplier={(supp) => {
        setSelectedSupplier(supp);
      }}
      onOpenRfqModal={(supp) => {
        setSelectedSupplier(supp);
        setOpenSupplierRfq(true);
        setPage('buyer-seller-detail');
      }}
    />
  );
}
