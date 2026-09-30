import { setRequestLocale } from 'next-intl/server';
import { use, type ReactNode } from 'react';
import { PublicShell } from '@/components/app-shell/PublicShell';

export default function PublicLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale(use(params).locale);
  return <PublicShell>{children}</PublicShell>;
}
