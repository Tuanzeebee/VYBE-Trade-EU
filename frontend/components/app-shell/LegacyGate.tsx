'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from '../../i18n/navigation';
import type { DemoUser } from '../../lib/demoAuth';
import { hrefFor, PROTECTED_PAGES, resolvePage, type LegacyPage } from '../../lib/legacyNav';
import { useDemoSession } from './useDemoSession';
import { PageLoader } from '../PageLoader';

/**
 * Chặn truy cập theo quy tắc cũ khi người dùng vào thẳng URL.
 * Trang cần đăng nhập: không render gì tới khi đọc xong phiên. Trang công khai: render ngay.
 */
export function LegacyGate({
  page,
  children,
}: {
  page: LegacyPage;
  children: (user: DemoUser | null) => ReactNode;
}) {
  const { user, ready } = useDemoSession();
  const router = useRouter();
  const pathname = usePathname();

  const resolved = resolvePage(page, user);
  const target = hrefFor(resolved, { user });
  const mustRedirect =
    ready && (resolved !== page || (page === 'onboarding' && target !== pathname));

  useEffect(() => {
    if (mustRedirect) router.replace(target);
  }, [mustRedirect, router, target]);

  if (mustRedirect) return <PageLoader />;
  if (!ready && PROTECTED_PAGES.includes(page)) return <PageLoader />;
  return <>{children(user)}</>;
}
