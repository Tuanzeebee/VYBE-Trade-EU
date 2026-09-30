'use client';

// Trang đăng nhập, onboarding, workspace seller, admin — tách từ app/page.tsx cũ, giữ nguyên component.
// Phiên đăng nhập thật (A1); hồ sơ doanh nghiệp exporter (B1) và buyer (B2) lưu trên server.
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthPage from '../AuthPage';
import BuyerOnboarding from '../BuyerOnboarding';
import SellerOnboarding from '../SellerOnboarding';
import SellerWorkspace, { type WorkspaceTabId } from '../SellerWorkspace';
import AdminConsole from '../AdminConsole';
import { LegacyGate } from '../app-shell/LegacyGate';
import { PublicShell } from '../app-shell/PublicShell';
import { useLegacyNavigate } from '../app-shell/useLegacyNavigate';
import { useRouter } from '../../i18n/navigation';
import { completeOnboarding, getUserPage, logout, type DemoUser } from '../../lib/demoAuth';
import { buyerProfileToCompany, companyToForm, getMyCompany, profileToCompany, saveMyCompany } from '../../lib/companyApi';
import { draftFromProduct, getMyProducts, syncProducts, type ProductDraft } from '../../lib/productsApi';
import { draftFromService, getMyServices, syncServices, type ServiceDraft } from '../../lib/servicesApi';
import { submitRequestIfNeeded } from '../../lib/verificationApi';
import { saveSourcingNeeds, type NeedsDraft } from '../../lib/buyerNeedsApi';
import { hrefFor, roleFromType } from '../../lib/legacyNav';

const WORKSPACE_TABS: WorkspaceTabId[] = ['verification', 'profile', 'overview', 'products', 'rfq', 'messages', 'notifications', 'licenses', 'report', 'billing'];

function useGoHome() {
  const router = useRouter();
  // Buyer về bảng điều khiển của khung buyer, không về danh bạ công khai.
  return (user: DemoUser) => router.push(user.role === 'buyer' ? '/buyer' : hrefFor(getUserPage(user), { user }));
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
  services: ServiceDraft[];
}

/**
 * Hồ sơ doanh nghiệp (và sản phẩm nếu là exporter) đã lưu trên server, đổi sang giá trị ban đầu của form.
 * undefined = đang tải. Chưa có gì trên server → company null, products [].
 */
function useProfileData(withProducts: boolean): ProfileData | undefined {
  const [data, setData] = useState<ProfileData | undefined>(undefined);
  useEffect(() => {
    let active = true;
    Promise.all([
      getMyCompany(),
      withProducts ? getMyProducts() : Promise.resolve(null),
      withProducts ? getMyServices() : Promise.resolve(null),
    ]).then(([company, products, services]) => {
      if (!active) return;
      setData({
        company: company ? companyToForm(company) : null,
        products: (products ?? []).map(draftFromProduct),
        services: (services ?? []).map(draftFromService),
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
    // U5: hồ sơ buyer và nhu cầu mua hàng đều lưu server (bỏ qua bước nhu cầu thì chỉ lưu công ty).
    const onBuyerComplete = async (profile: Record<string, string>, needs: NeedsDraft | null) => {
      await saveMyCompany(buyerProfileToCompany(profile));
      if (needs) await saveSourcingNeeds(needs);
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
  const onComplete = async (profile: Record<string, string>, products: ProductDraft[], services: ServiceDraft[]) => {
    await saveMyCompany(profileToCompany(profile));
    await syncProducts(products);
    await syncServices(services);
    await submitRequestIfNeeded();
    goHome(completeOnboarding(user.id, profile));
  };
  return (
    <SellerOnboarding
      key={user.id}
      account={user}
      initialStep={1}
      initialCompany={data.company ?? undefined}
      initialProducts={data.products}
      initialServices={data.services}
      onSaveCompany={async (profile) => void (await saveMyCompany(profileToCompany(profile)))}
      onSaveProducts={async (products) => void (await syncProducts(products))}
      onSaveServices={async (services) => void (await syncServices(services))}
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

/**
 * Tài khoản exporter chưa có công ty trên server luôn được đưa tới form hồ sơ (A2).
 * undefined = đang kiểm tra; trang hồ sơ không dùng hook này nên không tạo vòng chuyển hướng.
 */
function useHasCompany(): boolean | undefined {
  const [has, setHas] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    let active = true;
    getMyCompany().then((company) => {
      if (active) setHas(company !== null);
    });
    return () => {
      active = false;
    };
  }, []);
  return has;
}

function WorkspaceContent({ user, tab: routeTab }: { user: DemoUser; tab?: WorkspaceTabId }) {
  const navigate = useLegacyNavigate(user);
  const handleLogout = useLogout();
  const router = useRouter();
  const hasCompany = useHasCompany();
  useEffect(() => {
    if (hasCompany === false && user.role === 'seller') router.replace(hrefFor('seller-profile', { user, step: 1 }));
  }, [hasCompany, user, router]);
  // Mỗi mục là một route riêng; /exporter?tab=… cũ vẫn mở đúng mục.
  const queryTab = useSearchParams().get('tab') as WorkspaceTabId | null;
  const initialTab: WorkspaceTabId = routeTab ?? (queryTab && WORKSPACE_TABS.includes(queryTab) ? queryTab : 'overview');
  if (hasCompany !== true && user.role === 'seller') return null;
  return (
    <SellerWorkspace
      key={`${user.id}-${initialTab}`}
      account={user}
      onLogout={handleLogout}
      onNavigateHome={() => navigate('home')}
      onNavigateOnboarding={(step) => navigate('seller-profile', { step: typeof step === 'number' ? step : undefined })}
      initialTab={initialTab}
      onNavigateTab={(next) => navigate('workspace', { tab: next })}
    />
  );
}

export function WorkspaceRoute({ tab }: { tab?: WorkspaceTabId }) {
  return <LegacyGate page="workspace">{(user) => user && <WorkspaceContent user={user} tab={tab} />}</LegacyGate>;
}

function SellerProfileContent({ user }: { user: DemoUser }) {
  const navigate = useLegacyNavigate(user);
  const handleLogout = useLogout();
  // ?step= mở đúng bước chứa phần còn thiếu (từ thẻ hoàn thiện hồ sơ); không hợp lệ → bước mặc định.
  const stepParam = Number(useSearchParams().get('step'));
  const initialStep = [1, 2, 3, 4].includes(stepParam) ? stepParam : undefined;
  const data = useProfileData(true);
  if (data === undefined) return null;
  const onComplete = async (profile: Record<string, string>, products: ProductDraft[], services: ServiceDraft[]) => {
    await saveMyCompany(profileToCompany(profile));
    await syncProducts(products);
    await syncServices(services);
    await submitRequestIfNeeded();
    navigate('workspace', { tab: 'profile' });
  };
  return (
    <SellerOnboarding
      key={user.id}
      account={user}
      initialStep={initialStep}
      initialCompany={data.company ?? undefined}
      initialProducts={data.products}
      initialServices={data.services}
      onSaveCompany={async (profile) => void (await saveMyCompany(profileToCompany(profile)))}
      onSaveProducts={async (products) => void (await syncProducts(products))}
      onSaveServices={async (services) => void (await syncServices(services))}
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
          <AdminConsole />
        </PublicShell>
      )}
    </LegacyGate>
  );
}
