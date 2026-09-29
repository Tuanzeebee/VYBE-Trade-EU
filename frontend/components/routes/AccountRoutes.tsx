'use client';

// Trang đăng nhập, onboarding, workspace seller, admin — tách từ app/page.tsx cũ, giữ nguyên component.
// Phiên đăng nhập thật (A1); hồ sơ doanh nghiệp exporter (B1) và buyer (B2) lưu trên server.
import React, { useEffect, useState } from 'react';
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
import { buyerProfileToCompany, companyToForm, getMyCompany, profileToCompany, saveMyCompany } from '../../lib/companyApi';
import { hrefFor, roleFromType } from '../../lib/legacyNav';

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
      void logout();
      router.push('/login');
    } catch {
      console.warn('Unable to clear session storage.');
    }
  };
}

function AuthContent({ mode, user }: { mode: 'login' | 'register'; user: DemoUser | null }) {
  const navigate = useLegacyNavigate(user);
  const goHome = useGoHome();
  const initialRole = roleFromType(useSearchParams().get('type'));
  return (
    <AuthPage
      key={mode}
      mode={mode}
      initialRole={initialRole}
      onModeChange={(next) => navigate(next)}
      onAuthenticated={goHome}
      onNavigateHome={() => navigate('home')}
    />
  );
}

export function AuthRoute({ mode }: { mode: 'login' | 'register' }) {
  return <LegacyGate page={mode}>{(user) => <AuthContent mode={mode} user={user} />}</LegacyGate>;
}

/** Hồ sơ doanh nghiệp đã lưu trên server, đổi sang giá trị ban đầu của form cũ. undefined = đang tải. */
function useCompanyForm(enabled: boolean) {
  const [initial, setInitial] = useState<Record<string, string> | null | undefined>(enabled ? undefined : null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    getMyCompany().then((company) => {
      if (active) setInitial(company ? companyToForm(company) : null);
    });
    return () => {
      active = false;
    };
  }, [enabled]);
  return initial;
}

function OnboardingContent({ user }: { user: DemoUser }) {
  const navigate = useLegacyNavigate(user);
  const goHome = useGoHome();
  const handleLogout = useLogout();
  const initialCompany = useCompanyForm(true);
  if (initialCompany === undefined) return null;
  if (user.role === 'buyer') {
    // Hồ sơ buyer lên server trước; nhu cầu từng đơn hàng vẫn lưu trình duyệt tới F1 (RFQ).
    const onBuyerComplete = async (profile: Record<string, string>) => {
      await saveMyCompany(buyerProfileToCompany(profile));
      goHome(completeOnboarding(user.id, profile));
    };
    return (
      <BuyerOnboarding
        key={user.id}
        user={user}
        initialCompany={initialCompany ?? undefined}
        onComplete={onBuyerComplete}
        onLogout={handleLogout}
      />
    );
  }
  // Lưu hồ sơ lên server trước; sản phẩm/chứng nhận vẫn lưu trình duyệt tới B5/C6.
  const onComplete = async (profile: Record<string, string>) => {
    await saveMyCompany(profileToCompany(profile));
    goHome(completeOnboarding(user.id, profile));
  };
  return (
    <SellerOnboarding
      key={user.id}
      account={user}
      initialStep={1}
      initialCompany={initialCompany ?? undefined}
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
  const initialCompany = useCompanyForm(true);
  if (initialCompany === undefined) return null;
  const onComplete = async (profile: Record<string, string>) => {
    await saveMyCompany(profileToCompany(profile));
    navigate('workspace', { tab: 'profile' });
  };
  return (
    <SellerOnboarding
      key={user.id}
      account={user}
      initialCompany={initialCompany ?? undefined}
      onComplete={onComplete}
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
