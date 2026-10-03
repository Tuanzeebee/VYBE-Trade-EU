'use client';

import { useEffect, useState } from 'react';
import { getSession, refreshSession, type DemoUser } from '../../lib/demoAuth';

// Lần mount đầu (hydrate) phải khớp HTML của server nên chờ server trả lời. Sau đó, chuyển trang phía client
// dùng ngay phiên đã xác nhận gần nhất để trang hiện tức thì, rồi vẫn hỏi lại server ở nền.
let hydrated = false;

/**
 * Phiên đăng nhập hiện tại, xác nhận với server (GET /api/me) sau khi mount.
 * `ready` bật khi server đã trả lời, hoặc ngay lập tức khi đã có phiên xác nhận từ trang trước.
 */
export function useDemoSession() {
  const [cached] = useState(() => (hydrated ? getSession() : null));
  const [user, setUser] = useState<DemoUser | null>(cached);
  const [ready, setReady] = useState(cached !== null);
  useEffect(() => {
    hydrated = true;
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
