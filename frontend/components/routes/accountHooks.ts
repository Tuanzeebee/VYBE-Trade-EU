'use client';

// Hook dùng chung của các trang tài khoản (đăng nhập, onboarding, workspace, hồ sơ seller).
import { useEffect, useState } from 'react';
import { useRouter } from '../../i18n/navigation';
import { getUserPage, logout, type DemoUser } from '../../lib/demoAuth';
import { companyToForm, getMyCompany } from '../../lib/companyApi';
import { draftFromProduct, getMyProducts, type ProductDraft } from '../../lib/productsApi';
import { draftFromService, getMyServices, type ServiceDraft } from '../../lib/servicesApi';
import { hrefFor } from '../../lib/legacyNav';

export function useGoHome() {
  const router = useRouter();
  // Buyer về bảng điều khiển của khung buyer, không về danh bạ công khai.
  return (user: DemoUser) => router.push(user.role === 'buyer' ? '/buyer' : hrefFor(getUserPage(user), { user }));
}

export function useLogout() {
  const router = useRouter();
  return () => {
    try {
      void logout();
      router.push('/login');
    } catch {
      console.warn('Unable to clear session storage.');
    }
  };
}

interface ProfileData {
  company: Record<string, string> | null;
  products: ProductDraft[];
  services: ServiceDraft[];
}

/**
 * Hồ sơ doanh nghiệp (và sản phẩm nếu là exporter) đã lưu trên server, đổi sang giá trị ban đầu của form.
 * undefined = đang tải. Chưa có gì trên server → company null, products [].
 */
export function useProfileData(withProducts: boolean): ProfileData | undefined {
  const [data, setData] = useState<ProfileData | undefined>(undefined);
  useEffect(() => {
    let active = true;
    Promise.all([
      getMyCompany(),
      withProducts ? getMyProducts() : Promise.resolve(null),
      withProducts ? getMyServices() : Promise.resolve(null),
    ]).then(([company, products, services]) => {
      if (!active) return;
      setData({
        company: company ? companyToForm(company) : null,
        products: (products ?? []).map(draftFromProduct),
        services: (services ?? []).map(draftFromService),
      });
    });
    return () => {
      active = false;
    };
  }, [withProducts]);
  return data;
}
