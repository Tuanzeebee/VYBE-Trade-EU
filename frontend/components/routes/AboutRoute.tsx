'use client';

import React from 'react';
import AboutUsPage from '../AboutUsPage';
import { LegacyGate } from '../app-shell/LegacyGate';
import { useLegacyNavigate } from '../app-shell/useLegacyNavigate';
import type { DemoUser } from '../../lib/demoAuth';

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
