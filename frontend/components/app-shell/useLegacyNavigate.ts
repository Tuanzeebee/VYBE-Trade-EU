'use client';

import { useRouter } from '../../i18n/navigation';
import type { DemoUser } from '../../lib/demoAuth';
import { hrefFor, resolvePage, type LegacyPage } from '../../lib/legacyNav';

type NavigateOptions = Omit<Parameters<typeof hrefFor>[1] & object, 'user'>;

/** Đường dẫn của một trang sau khi áp quy tắc quyền — dùng cho <Link> (được prefetch) lẫn router.push. */
export function legacyHref(page: LegacyPage, user: DemoUser | null, options: NavigateOptions = {}): string {
  const target = resolvePage(page, user);
  return hrefFor(target, target === page ? { ...options, user } : { user });
}

/** Thay cho setCurrentPage của app/page.tsx cũ: áp quy tắc quyền rồi chuyển sang route thật. */
export function useLegacyNavigate(user: DemoUser | null) {
  const router = useRouter();
  return (page: LegacyPage, options: NavigateOptions = {}) => router.push(legacyHref(page, user, options));
}
