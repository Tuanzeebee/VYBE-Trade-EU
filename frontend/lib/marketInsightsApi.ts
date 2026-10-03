// Gợi ý thị trường EU (U16): GET /api/public/markets/recommendation. Mọi con số đến từ thống kê
// Eurostat đã nạp (backend); giao diện chỉ định dạng.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type MarketRecommendation = components['schemas']['MarketRecommendationOut'];
export type MarketItem = components['schemas']['MarketOut'];
export type Reason = components['schemas']['ReasonOut'];

export const QUICK_PRODUCTS = ['cá tra', 'tôm', 'hạt điều', 'gạo', 'hạt tiêu', 'cà phê', 'sầu riêng', 'mật ong'];

export async function fetchRecommendation(input: { q?: string; hs?: string }): Promise<MarketRecommendation | null> {
  try {
    const query = input.hs ? { hs: input.hs } : { q: input.q ?? '' };
    const { data, response } = await createApiClient().GET('/api/public/markets/recommendation', { params: { query } });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export function regionName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale === 'en' ? 'en' : 'vi'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export const eurCompact = (value: string | number, locale: string) =>
  new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'vi-VN', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(Number(value));

/** '0.1234' → '12,3%' (tỷ lệ 0–1). */
export const percentOf = (ratio: string | number, locale: string) =>
  new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'vi-VN', { style: 'percent', maximumFractionDigits: 1 }).format(Number(ratio));

/** Lý do bằng số → câu tiếng Việt (giao diện dịch bằng mẫu {0}). */
export function reasonText(reason: Reason, locale: string): string {
  const value = reason.value ?? '0';
  switch (reason.code) {
    case 'import_size':
      return `Nhập khẩu năm ${reason.year}: ${eurCompact(value, locale)}`;
    case 'vn_share':
      return `Hàng Việt Nam chiếm ${percentOf(value, locale)} nhập khẩu`;
    case 'growth':
      return `Nhập khẩu tăng bình quân ${percentOf(value, locale)}/năm`;
    case 'vn_growth':
      return `Hàng Việt Nam tăng bình quân ${percentOf(value, locale)}/năm`;
    case 'price_premium':
      return `Đơn giá hàng Việt Nam cao hơn mặt bằng ${Number(value).toFixed(2)} lần`;
    case 'low_vn_share':
      return `Hàng Việt Nam mới chiếm ${percentOf(value, locale)} — còn dư địa`;
    default:
      return reason.code;
  }
}
