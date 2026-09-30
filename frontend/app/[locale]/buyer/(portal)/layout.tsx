import { setRequestLocale } from 'next-intl/server';
import { use, type ReactNode } from 'react';
import { BuyerShell } from '@/components/app-shell/BuyerShell';

export default function BuyerPortalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale(use(params).locale);
  return <BuyerShell>{children}</BuyerShell>;
}
