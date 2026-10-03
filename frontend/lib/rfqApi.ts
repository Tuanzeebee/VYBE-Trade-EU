// RFQ có cấu trúc (F1): buyer gửi, exporter đổi trạng thái. Số lượng và giá luôn là CHUỖI, không qua float.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type Rfq = components['schemas']['RfqOut'];
export type RfqQuota = components['schemas']['RfqQuotaOut'];
export type RfqInput = components['schemas']['RfqIn'];
export type RfqStatus = Rfq['status'];
export type Incoterm = NonNullable<Rfq['incoterms']>;
export type RfqKind = NonNullable<Rfq['kind']>;

// N4: loại Request. Chỉ 'quote' đi vào luồng báo giá.
export const KIND_LABELS: Record<RfqKind, string> = {
  quote: 'Báo giá',
  meeting: 'Hẹn meeting',
  packaging: 'Hỏi đóng gói',
  quality: 'Hỏi chất lượng',
  other: 'Khác',
};
export const KINDS = Object.keys(KIND_LABELS) as RfqKind[];

// Incoterms 2020; danh sách áp dụng do PO chốt (backend là nơi ràng buộc).
export const INCOTERMS: Incoterm[] = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];
export const CURRENCIES = ['EUR', 'USD', 'VND'] as const;
export const STATUS_LABELS: Record<RfqStatus, string> = {
  new: 'Mới',
  viewed: 'Đã xem',
  quoted: 'Đã báo giá',
  closed: 'Đóng',
};
// Chuyển trạng thái exporter được phép (trùng backend TRANSITIONS).
export const NEXT_STATUSES: Record<RfqStatus, RfqStatus[]> = {
  new: ['viewed', 'quoted', 'closed'],
  viewed: ['quoted', 'closed'],
  quoted: ['closed'],
  closed: [],
};

export type RfqError = 'rate_limited' | 'not_verified' | 'company_required' | 'product_not_found' | 'invalid' | 'unauthorized' | 'network';
export type CreateOutcome = { ok: true; data: Rfq } | { ok: false; error: RfqError };

const codeOf = (error: unknown): string | undefined => (error as { error?: { code?: string } } | undefined)?.error?.code;

export async function createRfq(input: RfqInput): Promise<CreateOutcome> {
  try {
    const { data, error, response } = await createApiClient().POST('/api/buyer/rfqs', { body: input });
    if (response.ok && data) return { ok: true, data };
    if (response.status === 403 && codeOf(error) === 'buyer_not_verified') return { ok: false, error: 'not_verified' };
    if (response.status === 401 || response.status === 403) return { ok: false, error: 'unauthorized' };
    if (response.status === 429) return { ok: false, error: 'rate_limited' };
    if (response.status === 404) return { ok: false, error: 'product_not_found' };
    if (response.status === 409 && codeOf(error) === 'company_required') return { ok: false, error: 'company_required' };
    if (response.status === 422) return { ok: false, error: 'invalid' };
    return { ok: false, error: 'network' };
  } catch {
    return { ok: false, error: 'network' };
  }
}

/** null = lỗi tải (giao diện báo lỗi thay vì hiện danh sách rỗng). */
export async function listRfqs(status?: RfqStatus): Promise<Rfq[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/me/rfqs', { params: { query: status ? { status } : {} } });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function openRfq(id: string): Promise<Rfq | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/me/rfqs/{rfq_id}', { params: { path: { rfq_id: id } } });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function changeRfqStatus(id: string, status: RfqStatus): Promise<Rfq | null> {
  try {
    const { data, response } = await createApiClient().PATCH('/api/exporter/rfqs/{rfq_id}/status', {
      params: { path: { rfq_id: id } },
      body: { status },
    });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

/** Hạn mức RFQ 24 giờ của buyer (U6). null = không tải được (form vẫn gửi bình thường). */
export async function getRfqQuota(): Promise<RfqQuota | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/buyer/rfq-quota');
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

// U6: khuyến nghị chung cho seller khi buyer chưa xác minh (không phải tư vấn pháp lý).
export const SAFE_TERMS_ADVICE = [
  'Đặt cọc 30–50% bằng chuyển khoản (T/T) trước khi sản xuất, phần còn lại trước khi giao bộ chứng từ.',
  'Hoặc dùng thư tín dụng trả ngay (L/C at sight) do ngân hàng uy tín phát hành.',
  'Không gửi vận đơn gốc (B/L) trước khi nhận đủ tiền.',
];
