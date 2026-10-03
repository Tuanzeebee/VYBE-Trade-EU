'use client';

import React from 'react';
import ProductAiTrust from '../ProductAiTrust';
import ProductVerification from '../ProductVerification';
import { LegacyGate } from '../app-shell/LegacyGate';
import { useOpenNavModal } from '../app-shell/PublicShell';
import { useLegacyNavigate } from '../app-shell/useLegacyNavigate';
import type { DemoUser } from '../../lib/demoAuth';

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
