// Trung tâm thông báo (H1): GET/POST /api/me/notifications*. Lỗi mạng → null/false để giao diện không đoán số.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type AppNotification = components['schemas']['NotificationOut'];
export type NotificationType = AppNotification['type'];

export const POLL_INTERVAL_MS = 30_000;

export async function fetchUnreadCount(): Promise<number | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/me/notifications/unread-count');
    return response.ok && data ? data.count : null;
  } catch {
    return null;
  }
}

export async function fetchNotifications(limit = 20): Promise<AppNotification[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/me/notifications', { params: { query: { limit } } });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function markNotificationRead(id: string): Promise<boolean> {
  try {
    const { response } = await createApiClient().POST('/api/me/notifications/{notification_id}/read', {
      params: { path: { notification_id: id } },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function markAllNotificationsRead(): Promise<boolean> {
  try {
    const { response } = await createApiClient().POST('/api/me/notifications/read-all');
    return response.ok;
  } catch {
    return false;
  }
}

/** Nội dung tiếng Việt (giao diện dịch qua tr()) dựng từ loại và payload. */
export function describe(notification: Pick<AppNotification, 'type' | 'payload'>): string {
  const outcome = notification.payload.outcome;
  switch (notification.type) {
    case 'verification_status':
      if (outcome === 'approve') return 'Hồ sơ của bạn đã được xác minh.';
      if (outcome === 'reject') return 'Yêu cầu xác minh của bạn bị từ chối.';
      if (outcome === 'request_info') return 'Quản trị viên cần bạn bổ sung thông tin để xác minh.';
      if (outcome === 'expire') return 'Xác minh của bạn đã hết hạn.';
      return 'Trạng thái xác minh của bạn đã thay đổi.';
    case 'expiry_alert':
      return 'Xác minh của bạn sắp hết hạn.';
    case 'rfq':
      return 'Bạn có yêu cầu báo giá mới.';
    case 'message':
      return 'Bạn có tin nhắn mới.';
    case 'new_match':
      return 'Có nhà cung cấp mới phù hợp với tìm kiếm của bạn.';
  }
}
