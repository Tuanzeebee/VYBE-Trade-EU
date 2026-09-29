import { use } from 'react';
import { redirect } from '@/i18n/navigation';

// Trang chính của buyer trong bản cũ là danh bạ nhà cung cấp.
export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  redirect({ href: '/suppliers', locale: use(params).locale });
}
