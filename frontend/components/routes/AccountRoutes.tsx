'use client';

// Trang đăng nhập, onboarding, workspace seller, admin — tách từ app/page.tsx cũ, giữ nguyên component.
// Phiên vẫn là demoAuth (localStorage) cho tới A1.
import React from 'react';
import { useSearchParams } from 'next/navigation';
import AuthPage from '../AuthPage';
import BuyerOnboarding from '../BuyerOnboarding';
import SellerOnboarding from '../SellerOnboarding';
import SellerWorkspace from '../SellerWorkspace';
import AdminDashboard from '../AdminDashboard';
import { LegacyGate } from '../app-shell/LegacyGate';
import { PublicShell } from '../app-shell/PublicShell';
import { useLegacyNavigate } from '../app-shell/useLegacyNavigate';
import { useRouter } from '../../i18n/navigation';
import { completeOnboarding, getUserPage, logout, type DemoUser } from '../../lib/demoAuth';
import { hrefFor } from '../../lib/legacyNav';

const WORKSPACE_TABS = ['verification', 'profile', 'overview', 'products', 'rfq', 'notifications', 'licenses'] as const;
type WorkspaceTab = (typeof WORKSPACE_TABS)[number];

function useGoHome() {
  const router = useRouter();
  return (user: DemoUser) => router.push(hrefFor(getUserPage(user), { user }));
}

function useLogout() {
  const router = useRouter();
  return () => {
    try {
      logout();
      router.push('/login');
    } catch {
      console.warn('Unable to clear session storage.');
    }
  };
}

function AuthContent({ mode, user }: { mode: 'login' | 'register'; user: DemoUser | null }) {
  const navigate = useLegacyNavigate(user);
  const goHome = useGoHome();
  return (
    <AuthPage
      key={mode}
      mode={mode}
      onModeChange={(next) => navigate(next)}
      onAuthenticated={goHome}
      onNavigateHome={() => navigate('home')}
    />
  );
}

export function AuthRoute({ mode }: { mode: 'login' | 'register' }) {
  return <LegacyGate page={mode}>{(user) => <AuthContent mode={mode} user={user} />}</LegacyGate>;
}

function OnboardingContent({ user }: { user: DemoUser }) {
  const navigate = useLegacyNavigate(user);
  const goHome = useGoHome();
  const handleLogout = useLogout();
  const onComplete = (profile: Record<string, string>) => goHome(completeOnboarding(user.id, profile));
  if (user.role === 'buyer') {
    return <BuyerOnboarding key={user.id} user={user} onComplete={onComplete} onLogout={handleLogout} />;
  }
  return (
    <SellerOnboarding
      key={user.id}
      account={user}
      initialStep={1}
      onComplete={onComplete}
      onLogout={handleLogout}
      onNavigateHome={() => navigate('home')}
      onNavigateWorkspace={() => navigate('workspace')}
    />
  );
}

export function OnboardingRoute() {
  return <LegacyGate page="onboarding">{(user) => user && <OnboardingContent user={user} />}</LegacyGate>;
}

function WorkspaceContent({ user }: { user: DemoUser }) {
  const navigate = useLegacyNavigate(user);
  const handleLogout = useLogout();
  const tab = useSearchParams().get('tab');
  const initialTab: WorkspaceTab = WORKSPACE_TABS.includes(tab as WorkspaceTab) ? (tab as WorkspaceTab) : 'profile';
  return (
    <SellerWorkspace
      key={`${user.id}-${initialTab}`}
      account={user}
      onLogout={handleLogout}
      onNavigateHome={() => navigate('home')}
      onNavigateOnboarding={() => navigate('seller-profile')}
      onNavigateBuyerDetail={() => navigate('buyer-seller-detail')}
      initialTab={initialTab}
    />
  );
}

export function WorkspaceRoute() {
  return <LegacyGate page="workspace">{(user) => user && <WorkspaceContent user={user} />}</LegacyGate>;
}

function SellerProfileContent({ user }: { user: DemoUser }) {
  const navigate = useLegacyNavigate(user);
  const handleLogout = useLogout();
  return (
    <SellerOnboarding
      key={user.id}
      account={user}
      onLogout={handleLogout}
      onNavigateHome={() => navigate('home')}
      onNavigateWorkspace={(tab) => navigate('workspace', { tab: tab || 'profile' })}
    />
  );
}

export function SellerProfileRoute() {
  return <LegacyGate page="seller-profile">{(user) => user && <SellerProfileContent user={user} />}</LegacyGate>;
}

export function AdminRoute() {
  return (
    <LegacyGate page="admin">
      {() => (
        <PublicShell>
          <AdminDashboard />
        </PublicShell>
      )}
    </LegacyGate>
  );
}
