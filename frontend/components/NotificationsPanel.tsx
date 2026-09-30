'use client';

// Danh sách thông báo đầy đủ (H1) — dùng trong tab "Thông báo" của workspace. Chuông trên header là lối tắt.
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import { describe, fetchNotifications, markNotificationRead, type AppNotification } from '../lib/notificationsApi';

export default function NotificationsPanel() {
  const { tr, language } = useLanguage();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchNotifications(50).then((list) => {
      if (!active) return;
      setFailed(list === null);
      setItems(list ?? []);
    });
    return () => {
      active = false;
    };
  }, []);

  const read = (item: AppNotification) => {
    if (item.is_read) return;
    void markNotificationRead(item.id);
    setItems((list) => list?.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)) ?? null);
  };

  const format = new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium', timeStyle: 'short' });

  if (failed) {
    return (
      <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
        {tr('Không tải được thông báo. Vui lòng thử lại.')}
      </p>
    );
  }
  if (items === null) return null;
  if (items.length === 0) {
    return (
      <p role="status" className="rounded-xl bg-white p-6 text-sm text-slate-700">
        {tr('Chưa có thông báo. Khi có yêu cầu báo giá, tin nhắn hoặc thay đổi xác minh, bạn sẽ thấy ở đây.')}
      </p>
    );
  }
  return (
    <ul className="space-y-3 text-left">
      {items.map((n) => (
        <li key={n.id}>
          <Link
            href={n.link}
            onClick={() => read(n)}
            className={`block rounded-2xl border p-4 text-sm hover:bg-slate-50 ${n.is_read ? 'border-slate-200 bg-white text-slate-700' : 'border-teal-200 bg-teal-50 font-semibold text-slate-900'}`}
          >
            <span className="block">{tr(describe(n))}</span>
            {typeof n.payload.reason === 'string' && n.payload.reason && (
              <span className="mt-1 block text-xs font-normal text-slate-600">{n.payload.reason}</span>
            )}
            <span className="mt-1 block text-xs font-normal text-slate-500">{format.format(new Date(n.created_at))}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
