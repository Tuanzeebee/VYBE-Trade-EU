'use client';

// Chuông thông báo trên header (H1): số chưa đọc cập nhật mỗi 30 giây; bấm để xem, đọc và đi tới trang liên quan.
import React, { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useRouter } from '../i18n/navigation';
import {
  POLL_INTERVAL_MS,
  describe,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../lib/notificationsApi';

export default function NotificationBell() {
  const { tr, language } = useLanguage();
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [failed, setFailed] = useState(false);

  const refreshCount = useCallback(async () => {
    const value = await fetchUnreadCount();
    if (value !== null) setCount(value);
  }, []);

  useEffect(() => {
    void refreshCount();
    const timer = setInterval(() => void refreshCount(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refreshCount]);

  const load = useCallback(async () => {
    const list = await fetchNotifications();
    setFailed(list === null);
    setItems(list ?? []);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void load();
  };

  const openItem = async (item: AppNotification) => {
    if (!item.is_read && (await markNotificationRead(item.id))) {
      setCount((c) => Math.max(0, c - 1));
      setItems((list) => list?.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)) ?? null);
    }
    setOpen(false);
    router.push(item.link);
  };

  const readAll = async () => {
    if (await markAllNotificationsRead()) {
      setCount(0);
      setItems((list) => list?.map((n) => ({ ...n, is_read: true })) ?? null);
    }
  };

  const formatter = new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`${tr('Thông báo')}${count > 0 ? `, ${count} ${tr('chưa đọc')}` : ''}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {count > 0 && (
          <span data-testid="unread-badge" className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-600 px-1 text-center text-xs font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label={tr('Thông báo')} className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between px-1 pb-2">
            <h2 className="text-sm font-bold text-slate-900">{tr('Thông báo')}</h2>
            {count > 0 && (
              <button type="button" onClick={readAll} className="text-xs font-semibold text-teal-800 underline">
                {tr('Đánh dấu tất cả đã đọc')}
              </button>
            )}
          </div>
          {failed ? (
            <p role="alert" className="p-2 text-sm text-rose-700">
              {tr('Không tải được thông báo. Vui lòng thử lại.')}
            </p>
          ) : items !== null && items.length === 0 ? (
            <p role="status" className="p-2 text-sm text-slate-600">
              {tr('Chưa có thông báo. Khi có yêu cầu báo giá, tin nhắn hoặc thay đổi xác minh, bạn sẽ thấy ở đây.')}
            </p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {(items ?? []).map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void openItem(n)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50 ${n.is_read ? 'text-slate-600' : 'bg-teal-50 font-semibold text-slate-900'}`}
                  >
                    <span className="block">{tr(describe(n))}</span>
                    {typeof n.payload.reason === 'string' && n.payload.reason && (
                      <span className="mt-0.5 block text-xs font-normal text-slate-600">{n.payload.reason}</span>
                    )}
                    <span className="mt-0.5 block text-xs font-normal text-slate-500">{formatter.format(new Date(n.created_at))}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
