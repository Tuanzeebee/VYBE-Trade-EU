'use client';

// Các trang công khai — mỗi hàm là một nhánh `if (currentPage === ...)` của app/page.tsx cũ,
// giữ nguyên component và props, chỉ đổi setCurrentPage thành chuyển route.
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import HomePage from '../HomePage';
import BuyerDirectory from '../BuyerDirectory';
import BuyerSellerDetail, { DEFAULT_SELLER_DETAIL, type SupplierData } from '../BuyerSellerDetail';
import PricingPlans from '../PricingPlans';
import SolutionsPage from '../SolutionsPage';
import AboutUsPage from '../AboutUsPage';
import ProductAiTrust from '../ProductAiTrust';
import ProductVerification from '../ProductVerification';
import { LegacyGate } from '../app-shell/LegacyGate';
import { useOpenNavModal } from '../app-shell/PublicShell';
import { useLegacyNavigate } from '../app-shell/useLegacyNavigate';
import type { DemoUser } from '../../lib/demoAuth';
import { DIRECTORY_SUPPLIERS } from '../../lib/suppliers';
import {
  DEFAULT_LEVEL,
  DEFAULT_MARKET,
  findSupplier,
  parseDirectoryQuery,
  rememberSupplier,
  type LegacyPage,
} from '../../lib/legacyNav';

function HomeContent({ user }: { user: DemoUser | null }) {
  const navigate = useLegacyNavigate(user);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState(DEFAULT_MARKET);
  const [selectedTrust, setSelectedTrust] = useState('Tất cả cấp độ');
  const selectedSupplier = useRef<SupplierData>(DEFAULT_SELLER_DETAIL);

  function handleNavigate(page: LegacyPage) {
    if (page === 'buyer-directory') {
      navigate(page, {
        directory: {
          q: searchTerm,
          category: selectedCategory,
          market: selectedMarket,
          level: selectedTrust.startsWith('L') ? selectedTrust.slice(0, 2) : DEFAULT_LEVEL,
        },
      });
    } else if (page === 'buyer-seller-detail') {
      navigate(page, { supplierId: selectedSupplier.current.id });
    } else {
      navigate(page);
    }
  }

  function selectSupplier(supplier: SupplierData) {
    selectedSupplier.current = supplier;
    rememberSupplier(supplier);
  }

  return (
    <HomePage
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      selectedMarket={selectedMarket}
      setSelectedMarket={setSelectedMarket}
      selectedTrust={selectedTrust}
      setSelectedTrust={setSelectedTrust}
      onNavigate={handleNavigate}
      onSelectSupplier={selectSupplier}
      onOpenRfqModal={(supplier) => {
        selectSupplier(supplier);
        navigate('buyer-seller-detail', { supplierId: supplier.id, rfq: true });
      }}
    />
  );
}

export function HomeRoute() {
  return <LegacyGate page="home">{(user) => <HomeContent user={user} />}</LegacyGate>;
}

function DirectoryContent({ user }: { user: DemoUser | null }) {
  const navigate = useLegacyNavigate(user);
  const params = useSearchParams();
  const query = parseDirectoryQuery(new URLSearchParams(params.toString()));
  return (
    <BuyerDirectory
      key={params.toString()}
      initialSearchTerm={query.initialSearchTerm}
      initialCategory={query.initialCategory}
      initialMarket={query.initialMarket}
      initialLevel={query.initialLevel}
      onSelectSupplier={(supplier) => {
        rememberSupplier(supplier);
        navigate('buyer-seller-detail', { supplierId: supplier.id });
      }}
      onNavigateHome={() => navigate('home')}
      onOpenRfqModal={(supplier) => {
        rememberSupplier(supplier);
        navigate('buyer-seller-detail', { supplierId: supplier.id, rfq: true });
      }}
    />
  );
}

export function DirectoryRoute() {
  return <LegacyGate page="buyer-directory">{(user) => <DirectoryContent user={user} />}</LegacyGate>;
}

function SupplierDetailContent({ id, user }: { id: string; user: DemoUser | null }) {
  const navigate = useLegacyNavigate(user);
  const openRfq = useSearchParams().get('rfq') === '1';
  // Danh bạ tĩnh render được ngay; nhà cung cấp nhớ trong sessionStorage chỉ đọc sau khi mount.
  const [supplier, setSupplier] = useState<SupplierData>(
    () => DIRECTORY_SUPPLIERS.find((s) => s.id === id) ?? DEFAULT_SELLER_DETAIL,
  );
  useEffect(() => setSupplier(findSupplier(id)), [id]);
  return (
    <BuyerSellerDetail
      key={`${supplier.id}-${openRfq}`}
      openRfq={openRfq}
      supplier={supplier}
      onBackToDirectory={() => navigate('buyer-directory')}
      onNavigateHome={() => navigate('home')}
      onNavigateWorkspace={() => navigate('workspace', { tab: 'profile' })}
    />
  );
}

export function SupplierDetailRoute({ id }: { id: string }) {
  return (
    <LegacyGate page="buyer-seller-detail">{(user) => <SupplierDetailContent id={id} user={user} />}</LegacyGate>
  );
}

function PricingContent({ user }: { user: DemoUser | null }) {
  const navigate = useLegacyNavigate(user);
  return (
    <PricingPlans
      onNavigateHome={() => navigate('home')}
      onNavigateOnboarding={() => navigate('onboarding')}
      onNavigateWorkspace={() => navigate('workspace', { tab: 'profile' })}
    />
  );
}

export function PricingRoute() {
  return <LegacyGate page="pricing">{(user) => <PricingContent user={user} />}</LegacyGate>;
}

function SolutionsContent({ user }: { user: DemoUser | null }) {
  const navigate = useLegacyNavigate(user);
  return (
    <SolutionsPage
      onNavigateHome={() => navigate('home')}
      onNavigateDirectory={() => navigate('buyer-directory')}
      onNavigatePricing={() => navigate('pricing')}
      onNavigateOnboarding={() => navigate('onboarding')}
      onNavigateWorkspace={() => navigate('workspace', { tab: 'profile' })}
    />
  );
}

export function SolutionsRoute() {
  return <LegacyGate page="solutions">{(user) => <SolutionsContent user={user} />}</LegacyGate>;
}

function AboutContent({ user }: { user: DemoUser | null }) {
  const navigate = useLegacyNavigate(user);
  return (
    <AboutUsPage
      onNavigateHome={() => navigate('home')}
      onNavigateDirectory={() => navigate('buyer-directory')}
      onNavigateSolutions={() => navigate('solutions')}
      onNavigatePricing={() => navigate('pricing')}
      onNavigateOnboarding={() => navigate('onboarding')}
    />
  );
}

export function AboutRoute() {
  return <LegacyGate page="about">{(user) => <AboutContent user={user} />}</LegacyGate>;
}

function ProductContent({ service, user }: { service: 'ai-trust' | 'verification'; user: DemoUser | null }) {
  const navigate = useLegacyNavigate(user);
  const openNavModal = useOpenNavModal();
  return service === 'ai-trust' ? (
    <ProductAiTrust
      onNavigateHome={() => navigate('home')}
      onNavigateNav={openNavModal}
      onSwitchToVerification={() => navigate('product', { productService: 'verification' })}
    />
  ) : (
    <ProductVerification
      onNavigateHome={() => navigate('home')}
      onNavigateNav={openNavModal}
      onSwitchToAiTrust={() => navigate('product', { productService: 'ai-trust' })}
    />
  );
}

export function ProductRoute({ service }: { service: 'ai-trust' | 'verification' }) {
  return <LegacyGate page="product">{(user) => <ProductContent service={service} user={user} />}</LegacyGate>;
}
