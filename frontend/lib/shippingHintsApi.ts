// Giá cước và phí bảo hiểm tham khảo (N6a). null = không tải được: form vẫn dùng bình thường.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type ShippingHints = components['schemas']['ShippingHintsOut'];

export async function fetchShippingHints(destCountry: string, cargoClass: 'dry' | 'reefer' | 'hazard' = 'dry'): Promise<ShippingHints | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/public/shipping-hints', {
      params: { query: { dest_country: destCountry, cargo_class: cargoClass } },
    });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

/** Phí bảo hiểm gợi ý = rate% × giá trị lô hàng. Tính bằng số nguyên để tránh sai số float. */
export function insuranceFromRate(rate: string, goodsValue: number): string {
  const cents = Math.round(goodsValue * 100);
  const basisPoints = Math.round(Number(rate) * 10000); // % → phần mười nghìn
  return (Math.round((cents * basisPoints) / 1_000_000) / 100).toFixed(2);
}
