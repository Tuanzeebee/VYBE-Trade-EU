'use client';

// Ghi một lượt xem khi hồ sơ công khai được mở (G1). Chạy phía trình duyệt để biết buyer nào đang xem
// (cookie phiên); khách vẫn được đếm. Không hiện gì và lỗi không ảnh hưởng người xem.
import { useEffect } from 'react';
import { recordProfileView } from '../lib/dashboardApi';

export default function ProfileViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    void recordProfileView(slug);
  }, [slug]);
  return null;
}
