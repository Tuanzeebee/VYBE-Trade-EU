'use client';

import { useEffect, useState } from 'react';
import { refreshSession, type DemoUser } from '../../lib/demoAuth';

/**
 * Phiên đăng nhập hiện tại, xác nhận với server (GET /api/me) sau khi mount.
 * `ready` chỉ bật khi server đã trả lời — trang cần đăng nhập chờ tới lúc đó mới render.
 */
export function useDemoSession() {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    refreshSession().then((current) => {
      if (!active) return;
      setUser(current);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  return { user, ready, setUser };
}
