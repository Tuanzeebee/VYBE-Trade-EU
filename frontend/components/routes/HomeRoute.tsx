'use client';

// Các trang công khai — mỗi route một file, giữ nguyên component và props của app/page.tsx cũ.
import React, { useState } from 'react';
import HomePage from '../HomePage';
import { LegacyGate } from '../app-shell/LegacyGate';
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
