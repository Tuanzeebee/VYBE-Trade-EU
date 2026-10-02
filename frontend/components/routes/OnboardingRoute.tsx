'use client';

// Onboarding buyer / seller. Phiên đăng nhập thật (A1); hồ sơ exporter (B1) và buyer (B2) lưu trên server.
import React from 'react';
import BuyerOnboarding from '../BuyerOnboarding';
import SellerOnboarding from '../SellerOnboarding';
import { LegacyGate } from '../app-shell/LegacyGate';
import { useLegacyNavigate } from '../app-shell/useLegacyNavigate';
import { completeOnboarding, type DemoUser } from '../../lib/demoAuth';
import { buyerHasIdentifier, buyerProfileToCompany, profileToCompany, saveMyCompany } from '../../lib/companyApi';
import { syncProducts, type ProductDraft } from '../../lib/productsApi';
import { syncServices, type ServiceDraft } from '../../lib/servicesApi';
import { AlreadySubmittedError, submitRequest, submitRequestIfNeeded } from '../../lib/verificationApi';
import { saveSourcingNeeds, type NeedsDraft } from '../../lib/buyerNeedsApi';
import { useGoHome, useLogout, useProfileData } from './accountHooks';
import { PageLoader } from '../PageLoader';

function OnboardingContent({ user }: { user: DemoUser }) {
  const navigate = useLegacyNavigate(user);
  const goHome = useGoHome();
  const handleLogout = useLogout();
  const data = useProfileData(user.role === 'seller');
  if (data === undefined) return <PageLoader />;
  if (user.role === 'buyer') {
    // U5: hồ sơ buyer và nhu cầu mua hàng đều lưu server (bỏ qua bước nhu cầu thì chỉ lưu công ty).
    const onBuyerComplete = async (profile: Record<string, string>, needs: NeedsDraft | null) => {
      await saveMyCompany(buyerProfileToCompany(profile));
      if (needs) await saveSourcingNeeds(needs);
      // Bước 2 (giấy phép & chứng nhận): có mã định danh thì tự gửi yêu cầu xác minh, như seller. Thử lại
      // an toàn: hồ sơ và nhu cầu ghi đè, yêu cầu đã gửi rồi thì bỏ qua.
      if (buyerHasIdentifier(profile)) {
        try {
          await submitRequest('buyer');
        } catch (cause) {
          if (!(cause instanceof AlreadySubmittedError)) throw cause;
        }
      }
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
