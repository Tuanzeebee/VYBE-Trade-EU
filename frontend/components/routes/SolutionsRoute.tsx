'use client';

import React from 'react';
import SolutionsPage from '../SolutionsPage';
import { LegacyGate } from '../app-shell/LegacyGate';
import { useLegacyNavigate } from '../app-shell/useLegacyNavigate';
import type { DemoUser } from '../../lib/demoAuth';

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
