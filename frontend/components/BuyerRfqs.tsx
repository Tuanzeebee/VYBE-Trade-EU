'use client';

// Trang "Yêu cầu báo giá đã gửi" của buyer (F1). Cần phiên buyer; khách được hướng dẫn đăng nhập.
import React from 'react';
import RfqInbox from './RfqInbox';
import { useDemoSession } from './app-shell/useDemoSession';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import { PageLoader } from './PageLoader';

export default function BuyerRfqs() {
  const { tr } = useLanguage();
  const { user, ready } = useDemoSession();
  if (!ready) return <PageLoader />;
  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{tr('Yêu cầu báo giá đã gửi')}</h1>
      <div className="mt-6">
        {user?.role === 'buyer' ? (
          <RfqInbox role="buyer" />
        ) : (
          <p role="status" className="rounded-xl bg-white p-6 text-sm text-slate-700">
            {tr('Đăng nhập bằng tài khoản buyer để xem các yêu cầu báo giá.')}{' '}
            <Link href="/login" className="font-semibold underline">
              {tr('Đăng nhập')}
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
