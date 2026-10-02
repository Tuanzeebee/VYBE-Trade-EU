'use client';

// Các trang công khai — mỗi hàm là một nhánh `if (currentPage === ...)` của app/page.tsx cũ,
// giữ nguyên component và props, chỉ đổi setCurrentPage thành chuyển route.
import React, { useState } from 'react';
import HomePage from '../HomePage';
import PricingPlans from '../PricingPlans';
import SolutionsPage from '../SolutionsPage';
import AboutUsPage from '../AboutUsPage';
import ProductAiTrust from '../ProductAiTrust';
import ProductVerification from '../ProductVerification';
import { LegacyGate } from '../app-shell/LegacyGate';
import { useOpenNavModal } from '../app-shell/PublicShell';
import { useLegacyNavigate } from '../app-shell/useLegacyNavigate';
import type { DemoUser } from '../../lib/demoAuth';
import {
  DEFAULT_LEVEL,
  DEFAULT_MARKET,
  type LegacyPage,
} from '../../lib/legacyNav';

function HomeContent({ user }: { user: DemoUser | null }) {
  const navigate = useLegacyNavigate(user);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState(DEFAULT_MARKET);

  function handleNavigate(page: LegacyPage) {
    if (page === 'buyer-directory') {
      navigate(page, {
        directory: {
          q: searchTerm,
          category: selectedCategory,
          market: selectedMarket,
          level: DEFAULT_LEVEL,
        },
      });
    } else {
      navigate(page);
    }
  }

  return (
    <HomePage
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      selectedMarket={selectedMarket}
      setSelectedMarket={setSelectedMarket}
      onNavigate={handleNavigate}
    />
  );
}

export function HomeRoute() {
  return <LegacyGate page="home">{(user) => <HomeContent user={user} />}</LegacyGate>;
}

function PricingContent({ user }: { user: DemoUser | null }) {
  return <PricingPlans account={user} />;
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
