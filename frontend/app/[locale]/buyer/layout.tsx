import { setRequestLocale } from 'next-intl/server';
import { use, type ReactNode } from 'react';
import { AreaShell } from '@/components/layout/area-shell';

export default function BuyerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale(use(params).locale);
  return <AreaShell area="buyer">{children}</AreaShell>;
}
