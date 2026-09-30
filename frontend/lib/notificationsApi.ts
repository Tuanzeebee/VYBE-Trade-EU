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
    case 'rfq': {
      // U8: cùng loại "rfq" cho yêu cầu mới, đổi trạng thái và báo giá (phân biệt bằng payload.event).
      const event = notification.payload.event;
      if (event === 'quote_sent') return 'Bạn nhận được báo giá mới cho yêu cầu báo giá.';
      if (event === 'quote_accepted') return 'Buyer đã chấp nhận báo giá của bạn.';
      if (event === 'quote_declined') return 'Buyer đã từ chối báo giá của bạn.';
      if (event === 'status') return 'Nhà cung cấp đã cập nhật yêu cầu báo giá của bạn.';
      return 'Bạn có yêu cầu báo giá mới.';
    }
    case 'message':
      return 'Bạn có tin nhắn mới.';
    case 'profile_viewed': {
      const viewer = notification.payload.viewer_name;
      return typeof viewer === 'string' && viewer ? `${viewer} vừa xem hồ sơ của bạn.` : 'Một buyer đã xác minh vừa xem hồ sơ của bạn.';
    }
    case 'sector_alert':
      return 'Có cảnh báo mới cho ngành hàng của bạn.';
    case 'order': {
      // U19: admin xác nhận đã nhận chuyển khoản → quyền dùng đã mở.
      const reference = notification.payload.reference;
      return notification.payload.event === 'paid' && typeof reference === 'string'
        ? `Đã xác nhận thanh toán đơn ${reference}. Dịch vụ đã được mở.`
        : 'Đơn hàng của bạn đã được cập nhật.';
    }
    case 'new_match': {
      const name = notification.payload.company_name;
      return typeof name === 'string' && name
        ? `Nhà cung cấp mới phù hợp với nhóm hàng bạn quan tâm: ${name}`
        : 'Có nhà cung cấp mới phù hợp với tìm kiếm của bạn.';
    }
  }
}
