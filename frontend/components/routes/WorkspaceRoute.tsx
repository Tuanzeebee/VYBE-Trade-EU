'use client';

// Workspace seller — layout chung của mọi mục /exporter/*, nên chuyển mục không dựng lại khung và
// không tải lại công ty/sản phẩm; mục đang mở suy ra từ URL.
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SellerWorkspace, { type WorkspaceTabId } from '../SellerWorkspace';
import { PageLoader } from '../PageLoader';
import { LegacyGate } from '../app-shell/LegacyGate';
import { useLegacyNavigate } from '../app-shell/useLegacyNavigate';
import { usePathname, useRouter } from '../../i18n/navigation';
import type { DemoUser } from '../../lib/demoAuth';
import { getMyCompany } from '../../lib/companyApi';
import { hrefFor, workspaceTabForPath } from '../../lib/legacyNav';
import { useLogout } from './accountHooks';

const WORKSPACE_TABS: WorkspaceTabId[] = ['verification', 'profile', 'overview', 'products', 'rfq', 'messages', 'notifications', 'licenses', 'report', 'billing'];

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

function WorkspaceContent({ user, tab }: { user: DemoUser; tab?: WorkspaceTabId }) {
  const navigate = useLegacyNavigate(user);
  const handleLogout = useLogout();
  const router = useRouter();
  const hasCompany = useHasCompany();
  useEffect(() => {
    if (hasCompany === false && user.role === 'seller') router.replace(hrefFor('seller-profile', { user, step: 1 }));
  }, [hasCompany, user, router]);
  // Tải trước các mục để bấm menu là chuyển ngay (chỉ có tác dụng ở bản build production).
  useEffect(() => {
    for (const next of WORKSPACE_TABS) router.prefetch(hrefFor('workspace', { user, tab: next }));
  }, [user, router]);
  // Mỗi mục là một route riêng; /exporter?tab=… cũ vẫn mở đúng mục.
  const pathTab = workspaceTabForPath(usePathname()) as WorkspaceTabId | undefined;
  const routeTab = tab ?? pathTab;
  const queryTab = useSearchParams().get('tab') as WorkspaceTabId | null;
  const initialTab: WorkspaceTabId = routeTab ?? (queryTab && WORKSPACE_TABS.includes(queryTab) ? queryTab : 'overview');
  if (hasCompany !== true && user.role === 'seller') return <PageLoader />;
  return (
    <SellerWorkspace
      key={user.id}
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
