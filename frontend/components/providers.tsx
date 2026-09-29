'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // Mỗi phiên trình duyệt một QueryClient; không dùng chung giữa request phía server.
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
