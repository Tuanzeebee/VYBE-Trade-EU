// Xem thuế MFN so với EVFTA của một mã HS ngay tại sản phẩm (chỉ đọc, không tính vào máy tính).
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type TariffPreview = components['schemas']['TariffPreviewOut'];

const STATUSES = ['ok', 'needs_review', 'unsupported'];

/** Trả null khi lỗi mạng, lỗi server hoặc phản hồi sai dạng (không hiện số nào trong các ca này). */
export async function getTariffPreview(hsCode: string): Promise<TariffPreview | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/exporter/tariff-preview', {
      params: { query: { hs_code: hsCode } },
    });
    if (!response.ok || !data || !STATUSES.includes(data.status)) return null;
    return data;
  } catch {
    return null;
  }
}
