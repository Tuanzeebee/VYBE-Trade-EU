'use client';

// Sửa hồ sơ seller từ workspace (cùng form với onboarding).
import React from 'react';
import { useSearchParams } from 'next/navigation';
import SellerOnboarding from '../SellerOnboarding';
import { LegacyGate } from '../app-shell/LegacyGate';
import { useLegacyNavigate } from '../app-shell/useLegacyNavigate';
import type { DemoUser } from '../../lib/demoAuth';
import { profileToCompany, saveMyCompany } from '../../lib/companyApi';
import { syncProducts, type ProductDraft } from '../../lib/productsApi';
import { syncServices, type ServiceDraft } from '../../lib/servicesApi';
import { submitRequestIfNeeded } from '../../lib/verificationApi';
import { useLogout, useProfileData } from './accountHooks';
import { PageLoader } from '../PageLoader';

function SellerProfileContent({ user }: { user: DemoUser }) {
  const navigate = useLegacyNavigate(user);
  const handleLogout = useLogout();
  // ?step= mở đúng bước chứa phần còn thiếu (từ thẻ hoàn thiện hồ sơ); không hợp lệ → bước mặc định.
  const stepParam = Number(useSearchParams().get('step'));
  const initialStep = [1, 2, 3, 4].includes(stepParam) ? stepParam : undefined;
  const data = useProfileData(true);
  if (data === undefined) return <PageLoader />;
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
