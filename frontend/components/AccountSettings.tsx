'use client';

// Tài khoản của tôi (J2). Xóa tài khoản = ẩn danh hóa: email, điện thoại và liên hệ công ty bị xóa,
// công ty rời danh bạ; nhật ký kiểm toán được giữ lại (không kèm email).
import React, { useState } from 'react';
import { useDemoSession } from './app-shell/useDemoSession';
import { useLanguage } from '../context/LanguageContext';
import { Link, useRouter } from '../i18n/navigation';
import { deleteAccount } from '../lib/accountApi';
import { logout } from '../lib/demoAuth';
import { PageLoader } from './PageLoader';

const ERRORS = {
  wrong_password: 'Mật khẩu không đúng.',
  forbidden: 'Tài khoản quản trị không xóa được tại đây.',
  network: 'Không kết nối được máy chủ. Vui lòng thử lại.',
} as const;

export default function AccountSettings() {
  const { tr } = useLanguage();
  const router = useRouter();
  const { user, ready } = useDemoSession();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!ready) return <PageLoader />;
  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <h1 className="text-2xl font-extrabold text-slate-900">{tr('Tài khoản của tôi')}</h1>
        <p role="status" className="mt-6 rounded-xl bg-white p-6 text-sm text-slate-700">
          {tr('Đăng nhập để quản lý tài khoản.')}{' '}
          <Link href="/login" className="font-semibold underline">
            {tr('Đăng nhập')}
          </Link>
        </p>
      </main>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!password) return setError('Vui lòng nhập mật khẩu để xác nhận.');
    setBusy(true);
    const outcome = await deleteAccount(password);
    setBusy(false);
    if (!outcome.ok) return setError(ERRORS[outcome.error]);
    await logout(); // xóa bản lưu phiên và hồ sơ trên trình duyệt
    router.push('/');
  };

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{tr('Tài khoản của tôi')}</h1>
      <p className="mt-2 text-sm text-slate-600">{user.email}</p>

      <section aria-label={tr('Xóa tài khoản')} className="mt-8 rounded-2xl border border-rose-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-rose-800">{tr('Xóa tài khoản')}</h2>
        <p className="mt-2 text-sm text-slate-700">
          {tr('Email, số điện thoại và thông tin liên hệ của công ty sẽ bị xóa; công ty của bạn không còn xuất hiện trong danh bạ. Nhật ký thao tác được giữ lại để phục vụ kiểm toán nhưng không còn gắn với email của bạn. Việc này không thể hoàn tác.')}
        </p>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-4 rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
          >
            {tr('Xóa tài khoản của tôi')}
          </button>
        ) : (
          <form onSubmit={submit} noValidate className="mt-4 space-y-3">
            <div>
              <label htmlFor="delete-password" className="block text-xs font-semibold text-slate-700">
                {tr('Nhập mật khẩu để xác nhận')}
              </label>
              <input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </div>
            {error && (
              <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                {tr(error)}
              </p>
            )}
            <div className="flex gap-3">
              <button type="submit" disabled={busy} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60">
                {tr(busy ? 'Đang xóa...' : 'Xóa vĩnh viễn')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setPassword('');
                  setError('');
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800"
              >
                {tr('Hủy')}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
