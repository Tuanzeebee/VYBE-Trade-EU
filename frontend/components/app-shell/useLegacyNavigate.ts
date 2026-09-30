'use client';

import { useRouter } from '../../i18n/navigation';
import type { DemoUser } from '../../lib/demoAuth';
import { hrefFor, resolvePage, type LegacyPage } from '../../lib/legacyNav';

type NavigateOptions = Omit<Parameters<typeof hrefFor>[1] & object, 'user'>;

/** Thay cho setCurrentPage của app/page.tsx cũ: áp quy tắc quyền rồi chuyển sang route thật. */
export function useLegacyNavigate(user: DemoUser | null) {
  const router = useRouter();
  return (page: LegacyPage, options: NavigateOptions = {}) => {
    const target = resolvePage(page, user);
    router.push(hrefFor(target, target === page ? { ...options, user } : { user }));
  };
}
