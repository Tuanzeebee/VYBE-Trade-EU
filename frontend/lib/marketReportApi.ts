// Báo cáo go-to-market (U18): exporter tạo báo cáo theo sản phẩm, job nền dựng lời văn + PDF.
// Bản tóm tắt miễn phí; phần còn lại và PDF cần gói "báo cáo đầy đủ". Tiền luôn là CHUỖI.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type MarketReport = components['schemas']['ReportOut'];
export type MarketReportItem = components['schemas']['ReportListItemOut'];
export type MarketReportInput = components['schemas']['ReportIn'];
export type ReportRow = components['schemas']['ReportTableRowOut'];
export type ConsultingLeadInput = components['schemas']['ConsultingLeadIn'];
export type AdminConsultingLead = components['schemas']['AdminConsultingLeadOut'];

export const REPORT_STATUS_LABELS: Record<MarketReportItem['status'], string> = {
  queued: 'Đang chờ xử lý',
  running: 'Đang dựng báo cáo',
  ready: 'Đã xong',
  failed: 'Không dựng được',
};

export const LEAD_STATUS_LABELS: Record<AdminConsultingLead['status'], string> = {
  new: 'Mới',
  contacted: 'Đã liên hệ',
  closed: 'Đã đóng',
};

export type ReportError = 'no_data' | 'limit' | 'invalid' | 'network';
export type Outcome<T, E extends string> = { ok: true; data: T } | { ok: false; error: E };

const codeOf = (error: unknown): string | undefined => (error as { error?: { code?: string } } | undefined)?.error?.code;

export const REPORT_ERROR_MESSAGES: Record<ReportError, string> = {
  no_data: 'Chưa có thống kê thương mại cho sản phẩm này. Thử sản phẩm khác (cá tra, tôm, cà phê…).',
  limit: 'Bạn đã tạo đủ số báo cáo cho hôm nay. Vui lòng thử lại vào ngày mai.',
  invalid: 'Thông tin chưa hợp lệ. Hãy chọn sản phẩm và kiểm tra các ô số tiền.',
  network: 'Không kết nối được máy chủ. Vui lòng thử lại.',
};

export async function createReport(input: MarketReportInput): Promise<Outcome<MarketReport, ReportError>> {
  try {
    const { data, error, response } = await createApiClient().POST('/api/exporter/market-reports', { body: input });
    if (response.ok && data) return { ok: true, data };
    const code = codeOf(error);
    if (code === 'no_trade_data') return { ok: false, error: 'no_data' };
    if (code === 'report_limit') return { ok: false, error: 'limit' };
    return { ok: false, error: response.status === 422 ? 'invalid' : 'network' };
  } catch {
    return { ok: false, error: 'network' };
  }
}

/** null = lỗi tải. */
export async function listReports(): Promise<MarketReportItem[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/exporter/market-reports');
    return response.ok && Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export async function getReport(id: string): Promise<MarketReport | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/exporter/market-reports/{report_id}', { params: { path: { report_id: id } } });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function requestConsulting(input: ConsultingLeadInput): Promise<Outcome<true, 'limit' | 'invalid' | 'network'>> {
  try {
    const { error, response } = await createApiClient().POST('/api/exporter/consulting-leads', { body: input });
    if (response.ok) return { ok: true, data: true };
    if (codeOf(error) === 'lead_limit') return { ok: false, error: 'limit' };
    return { ok: false, error: response.status === 422 ? 'invalid' : 'network' };
  } catch {
    return { ok: false, error: 'network' };
  }
}

export async function listConsultingLeads(status?: AdminConsultingLead['status']): Promise<AdminConsultingLead[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/admin/consulting-leads', { params: { query: status ? { status } : {} } });
    return response.ok && Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export async function updateConsultingLead(id: string, status: AdminConsultingLead['status']): Promise<boolean> {
  try {
    const { response } = await createApiClient().PATCH('/api/admin/consulting-leads/{lead_id}', { params: { path: { lead_id: id } }, body: { status } });
    return response.ok;
  } catch {
    return false;
  }
}

/** Số tiền EUR nguyên: '20.000' / '20,000' / '20 000' → '20000'; rỗng → null; không hợp lệ → undefined. */
export function moneyInput(raw: string): string | null | undefined {
  const text = raw.trim().replace(/[\s.,]/g, '');
  if (!text) return null;
  return /^\d{1,12}$/.test(text) ? text : undefined;
}
