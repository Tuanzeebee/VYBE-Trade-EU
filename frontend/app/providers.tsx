'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../context/LanguageContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  // Mỗi phiên trình duyệt một QueryClient; không dùng chung giữa request phía server.
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  );
}
