import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import CopilotChat from '@/components/CopilotChat';

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  return <CopilotChat />;
}
