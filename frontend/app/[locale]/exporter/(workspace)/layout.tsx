import { setRequestLocale } from 'next-intl/server';
import { Suspense, use, type ReactNode } from 'react';
import { PageLoader } from '@/components/PageLoader';
import { WorkspaceRoute } from '@/components/routes/WorkspaceRoute';

// Một khung workspace cho mọi mục /exporter/*: chuyển mục không dựng lại khung, không tải lại dữ liệu chung.
export default function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale(use(params).locale);
  return (
    <Suspense fallback={<PageLoader />}>
      <WorkspaceRoute />
      {children}
    </Suspense>
  );
}
