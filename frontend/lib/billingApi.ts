// Thanh toán tối giản (U19, ADR-0005): bảng giá từ API, đặt mua → chuyển khoản theo mã tham chiếu →
// admin xác nhận đã nhận tiền → quyền dùng mở. Không cổng thanh toán. Tiền luôn là CHUỖI.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type BillingItem = components['schemas']['BillingItemOut'];
export type AdminBillingItem = components['schemas']['AdminBillingItemOut'];
export type Order = components['schemas']['OrderOut'];
export type AdminOrder = components['schemas']['AdminOrderOut'];
export type Entitlement = components['schemas']['EntitlementOut'];
export type OrderStatus = Order['status'];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Chờ chuyển khoản',
  paid: 'Đã thanh toán',
  cancelled: 'Đã huỷ',
};

const codeOf = (error: unknown): string | undefined => (error as { error?: { code?: string } } | undefined)?.error?.code;

/** '1500000.00' + 'VND' → '1.500.000 ₫' (vi) / '₫1,500,000' (en). */
export function formatMoney(amount: string, currency: string, locale: string): string {
  const digits = currency === 'VND' ? 0 : 2;
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'vi-VN', { style: 'currency', currency, maximumFractionDigits: digits, minimumFractionDigits: digits }).format(Number(amount));
}

export async function listBillingItems(): Promise<BillingItem[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/public/billing-items');
    return response.ok && Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export type OrderError = 'login' | 'role' | 'company' | 'network';

export async function createOrder(itemCode: string): Promise<{ ok: true; data: Order } | { ok: false; error: OrderError }> {
  try {
    const { data, error, response } = await createApiClient().POST('/api/me/orders', { body: { item_code: itemCode } });
    if (response.ok && data) return { ok: true, data };
    if (response.status === 401) return { ok: false, error: 'login' };
    const code = codeOf(error);
    if (code === 'company_not_found') return { ok: false, error: 'company' };
    if (response.status === 403) return { ok: false, error: 'role' };
    return { ok: false, error: 'network' };
  } catch {
    return { ok: false, error: 'network' };
  }
}

export async function listMyOrders(): Promise<Order[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/me/orders');
    return response.ok && Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export async function cancelMyOrder(id: string): Promise<boolean> {
  try {
    const { response } = await createApiClient().POST('/api/me/orders/{order_id}/cancel', { params: { path: { order_id: id } } });
    return response.ok;
  } catch {
    return false;
  }
}

export async function listMyEntitlements(): Promise<Entitlement[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/me/entitlements');
    return response.ok && Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export async function adminListOrders(status?: OrderStatus): Promise<AdminOrder[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/admin/orders', { params: { query: status ? { status } : {} } });
    return response.ok && Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export async function adminDecideOrder(id: string, action: 'confirm-payment' | 'cancel', note: string): Promise<boolean> {
  try {
    const client = createApiClient();
    const init = { params: { path: { order_id: id } }, body: { note: note.trim() || null } };
    const { response } =
      action === 'confirm-payment'
        ? await client.POST('/api/admin/orders/{order_id}/confirm-payment', init)
        : await client.POST('/api/admin/orders/{order_id}/cancel', init);
    return response.ok;
  } catch {
    return false;
  }
}

export async function adminListItems(): Promise<AdminBillingItem[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/admin/billing-items');
    return response.ok && Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export async function adminUpdateItem(code: string, body: components['schemas']['BillingItemPatch']): Promise<boolean> {
  try {
    const { response } = await createApiClient().PATCH('/api/admin/billing-items/{code}', { params: { path: { code } }, body });
    return response.ok;
  } catch {
    return false;
  }
}
