// Xem thuế MFN so với EVFTA của một mã HS ngay tại sản phẩm (chỉ đọc, không tính vào máy tính).
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type TariffPreview = components['schemas']['TariffPreviewOut'];

const STATUSES = ['ok', 'needs_review', 'unsupported'];

/** Thuế suất hợp lệ: chuỗi số hữu hạn (null, rỗng, chữ đều không hợp lệ). */
export function parseRate(value: string | null | undefined): number | null {
  if (value == null || value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Trả null khi lỗi mạng, lỗi server hoặc phản hồi sai dạng (không hiện số nào trong các ca này). */
export async function getTariffPreview(hsCode: string): Promise<TariffPreview | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/exporter/tariff-preview', {
      params: { query: { hs_code: hsCode } },
    });
    if (!response.ok || !data || !STATUSES.includes(data.status)) return null;
    if (data.status === 'ok' && (parseRate(data.mfn_rate) === null || parseRate(data.evfta_rate) === null)) return null;
    return data;
  } catch {
    return null;
  }
}
