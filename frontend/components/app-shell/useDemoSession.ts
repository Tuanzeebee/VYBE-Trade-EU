'use client';

import { useEffect, useState } from 'react';
import { getSession, type DemoUser } from '../../lib/demoAuth';

/** Phiên demo cũ (localStorage) — chỉ đọc sau khi mount để HTML server và client khớp nhau. A1 thay bằng phiên thật. */
export function useDemoSession() {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      setUser(getSession());
    } catch {
      setUser(null);
    }
    setReady(true);
  }, []);
  return { user, ready, setUser };
}
