'use client';

// Nhà cung cấp nổi bật trên trang chủ (U1): lấy từ danh bạ thật (chỉ doanh nghiệp đã xác minh, §6.10),
// không còn danh sách công ty mẫu với huy hiệu L1/L2/L3 giả.
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import type { Locale } from '../i18n/translate';
import { fetchSuppliers, type SupplierCardData } from '../lib/suppliersApi';
import SupplierCard from './SupplierCard';

const LIMIT = 4;

export default function FeaturedSuppliers() {
  const { tr, language } = useLanguage();
  const [suppliers, setSuppliers] = useState<SupplierCardData[] | null>(null);
  useEffect(() => {
    let active = true;
    fetchSuppliers({}).then((page) => active && setSuppliers(page?.items.slice(0, LIMIT) ?? []));
    return () => {
      active = false;
    };
  }, []);

  if (suppliers === null) return null;
  if (suppliers.length === 0) {
    return (
      <p role="status" className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-700">
        {tr('Các nhà cung cấp đã được xác minh sẽ hiện ở đây.')}{' '}
        <Link href="/register" className="font-semibold text-teal-700 hover:underline">
          {tr('Đăng ký hồ sơ nhà cung cấp')}
        </Link>
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {suppliers.map((supplier) => (
        <SupplierCard key={supplier.slug} supplier={supplier} locale={language as Locale} />
      ))}
    </ul>
  );
}
