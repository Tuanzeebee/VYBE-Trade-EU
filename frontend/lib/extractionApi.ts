// AI đọc chứng nhận (U24, X8): chỉ gợi ý. Seller chọn trường áp vào bằng chứng; admin xem so sánh.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type Extraction = components['schemas']['ExtractionOut'];
export type ApplicableField = components['schemas']['ExtractionApplyIn']['fields'][number];

/** null = chưa có bản trích xuất (hoặc lỗi tải). */
export async function getExtraction(evidenceId: string): Promise<Extraction | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/exporter/evidences/{evidence_id}/extraction', {
      params: { path: { evidence_id: evidenceId } },
    });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function applyExtraction(evidenceId: string, fields: ApplicableField[]): Promise<boolean> {
  try {
    const { response } = await createApiClient().POST('/api/exporter/evidences/{evidence_id}/extraction/apply', {
      params: { path: { evidence_id: evidenceId } },
      body: { fields },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function adminGetExtraction(evidenceId: string): Promise<Extraction | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/admin/evidences/{evidence_id}/extraction', {
      params: { path: { evidence_id: evidenceId } },
    });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}
