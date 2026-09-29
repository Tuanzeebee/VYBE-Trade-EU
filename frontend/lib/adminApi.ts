// API quản trị: hàng đợi xác minh, duyệt bằng chứng và dữ liệu tuân thủ (I1, I2, C1, C4, C6).
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type QueueItem = components['schemas']['QueueItem'];
export type TariffLine = components['schemas']['TariffLineOut'];
export type RooRule = components['schemas']['RooRuleOut'];
export type EvidenceTypeRow = components['schemas']['EvidenceTypeOut'];
export type EvidenceRuleRow = components['schemas']['RuleOut'];
export type Decision = 'approve' | 'reject' | 'request_info';

const NETWORK = 'Không kết nối được máy chủ. Vui lòng thử lại.';

/** Danh sách đọc: lỗi → null để giao diện báo lỗi thay vì hiện danh sách rỗng như thể không có dữ liệu. */
async function read<T>(call: () => Promise<{ data?: T; response: Response }>): Promise<T | null> {
  try {
    const { data, response } = await call();
    return response.ok && data !== undefined ? data : null;
  } catch {
    return null;
  }
}

async function act(call: () => Promise<{ response: Response }>, messages: Record<number, string>): Promise<void> {
  let response: Response;
  try {
    ({ response } = await call());
  } catch {
    throw new Error(NETWORK);
  }
  if (response.ok) return;
  throw new Error(messages[response.status] ?? NETWORK);
}

// ── Hàng đợi xác minh ───────────────────────────────────────────────────────
export const getQueue = () => read(() => createApiClient().GET('/api/admin/verification-queue'));

export function decideRequest(requestId: string, decision: Decision, reason: string): Promise<void> {
  return act(
    () =>
      createApiClient().POST('/api/admin/verification-requests/{request_id}/decision', {
        params: { path: { request_id: requestId } },
        body: { decision, reason: reason.trim() || null },
      }),
    {
      409: 'Yêu cầu này đã được xử lý hoặc công ty không còn ở trạng thái chờ duyệt.',
      422: 'Cần nhập lý do khi từ chối hoặc yêu cầu bổ sung.',
      404: 'Không tìm thấy yêu cầu.',
    },
  );
}

export function reviewEvidence(evidenceId: string, decision: 'approve' | 'reject', reason: string): Promise<void> {
  return act(
    () =>
      createApiClient().POST('/api/admin/evidences/{evidence_id}/review', {
        params: { path: { evidence_id: evidenceId } },
        body: { decision, reason: reason.trim() || null },
      }),
    { 422: 'Cần nhập lý do khi từ chối bằng chứng.', 404: 'Không tìm thấy bằng chứng.' },
  );
}

// ── Dữ liệu tuân thủ ────────────────────────────────────────────────────────
export const listTariffLines = () => read(() => createApiClient().GET('/api/admin/tariff-lines'));
export const listRooRules = () => read(() => createApiClient().GET('/api/admin/roo-rules'));
export const listEvidenceTypes = () => read(() => createApiClient().GET('/api/admin/evidence-types'));
export const listEvidenceRules = () => read(() => createApiClient().GET('/api/admin/evidence-rules'));

const REVIEW_ERRORS = { 404: 'Không tìm thấy dòng dữ liệu.' };
const DELETE_ERRORS = { 404: 'Không tìm thấy dòng dữ liệu.', 409: 'Dòng đã duyệt không xóa được.' };

export const reviewTariffLine = (id: string) =>
  act(() => createApiClient().POST('/api/admin/tariff-lines/{line_id}/review', { params: { path: { line_id: id } } }), REVIEW_ERRORS);
export const deleteTariffLine = (id: string) =>
  act(() => createApiClient().DELETE('/api/admin/tariff-lines/{line_id}', { params: { path: { line_id: id } } }), DELETE_ERRORS);
export const reviewRooRule = (id: string) =>
  act(() => createApiClient().POST('/api/admin/roo-rules/{rule_id}/review', { params: { path: { rule_id: id } } }), REVIEW_ERRORS);
export const deleteRooRule = (id: string) =>
  act(() => createApiClient().DELETE('/api/admin/roo-rules/{rule_id}', { params: { path: { rule_id: id } } }), DELETE_ERRORS);
export const reviewEvidenceType = (code: string) =>
  act(() => createApiClient().POST('/api/admin/evidence-types/{code}/review', { params: { path: { code } } }), REVIEW_ERRORS);
export const reviewEvidenceRule = (id: string) =>
  act(() => createApiClient().POST('/api/admin/evidence-rules/{rule_id}/review', { params: { path: { rule_id: id } } }), REVIEW_ERRORS);
export const deleteEvidenceRule = (id: string) =>
  act(() => createApiClient().DELETE('/api/admin/evidence-rules/{rule_id}', { params: { path: { rule_id: id } } }), { 404: 'Không tìm thấy dòng dữ liệu.' });
