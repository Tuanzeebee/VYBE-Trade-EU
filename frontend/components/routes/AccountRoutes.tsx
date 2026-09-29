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
import { draftFromProduct, getMyProducts, syncProducts, type ProductDraft } from '../../lib/productsApi';
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

interface ProfileData {
  company: Record<string, string> | null;
  products: ProductDraft[];
}

/**
 * Hồ sơ doanh nghiệp (và sản phẩm nếu là exporter) đã lưu trên server, đổi sang giá trị ban đầu của form.
 * undefined = đang tải. Chưa có gì trên server → company null, products [].
 */
function useProfileData(withProducts: boolean): ProfileData | undefined {
  const [data, setData] = useState<ProfileData | undefined>(undefined);
  useEffect(() => {
    let active = true;
    Promise.all([getMyCompany(), withProducts ? getMyProducts() : Promise.resolve(null)]).then(([company, products]) => {
      if (!active) return;
      setData({
        company: company ? companyToForm(company) : null,
        products: (products ?? []).map(draftFromProduct),
      });
    });
    return () => {
      active = false;
    };
  }, [withProducts]);
  return data;
}

function OnboardingContent({ user }: { user: DemoUser }) {
  const navigate = useLegacyNavigate(user);
  const goHome = useGoHome();
  const handleLogout = useLogout();
  const data = useProfileData(user.role === 'seller');
  if (data === undefined) return null;
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
        initialCompany={data.company ?? undefined}
        onComplete={onBuyerComplete}
        onLogout={handleLogout}
      />
    );
  }
  // Lưu công ty trước (sản phẩm cần có công ty), rồi đồng bộ sản phẩm. Chứng nhận vẫn lưu trình duyệt tới C6.
  const onComplete = async (profile: Record<string, string>, products: ProductDraft[]) => {
    await saveMyCompany(profileToCompany(profile));
    await syncProducts(products);
    goHome(completeOnboarding(user.id, profile));
  };
  return (
    <SellerOnboarding
      key={user.id}
      account={user}
      initialStep={1}
      initialCompany={data.company ?? undefined}
      initialProducts={data.products}
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
      onNavigateOnboarding={(step) => navigate('seller-profile', { step: typeof step === 'number' ? step : undefined })}
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
  // ?step= mở đúng bước chứa phần còn thiếu (từ thẻ hoàn thiện hồ sơ); không hợp lệ → bước mặc định.
  const stepParam = Number(useSearchParams().get('step'));
  const initialStep = [1, 2, 3, 4].includes(stepParam) ? stepParam : undefined;
  const data = useProfileData(true);
  if (data === undefined) return null;
  const onComplete = async (profile: Record<string, string>, products: ProductDraft[]) => {
    await saveMyCompany(profileToCompany(profile));
    await syncProducts(products);
    navigate('workspace', { tab: 'profile' });
  };
  return (
    <SellerOnboarding
      key={user.id}
      account={user}
      initialStep={initialStep}
      initialCompany={data.company ?? undefined}
      initialProducts={data.products}
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
