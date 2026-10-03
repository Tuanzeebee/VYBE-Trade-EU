// Điểm tín nhiệm seller (U23, ADR-0004): điểm do hệ thống tính theo phương pháp công bố tại
// /trust-score; không phải chứng nhận hay xếp hạng tín dụng. Công khai chỉ khi TRUST_SCORE_PUBLIC bật.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type TrustScore = components['schemas']['TrustScoreOut'];
export type TrustCriterion = components['schemas']['TrustCriterionOut'];

export const SELF_DECLARED_LABELS: Record<string, string> = {
  capacity: 'Năng lực sản xuất',
  main_customers: 'Khách hàng chính',
  export_markets: 'Thị trường đã xuất khẩu',
  products: 'Danh sách sản phẩm',
};

export async function getMyTrustScore(): Promise<TrustScore | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/exporter/trust-score');
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

/** null = không công khai (cờ tắt) hoặc lỗi — hồ sơ công khai không hiện điểm. */
export async function fetchPublicTrustScore(slug: string): Promise<TrustScore | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/public/companies/{slug}/trust-score', { params: { path: { slug } } });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function fetchTrustCriteria(): Promise<TrustCriterion[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/public/trust-criteria');
    return response.ok && Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}
