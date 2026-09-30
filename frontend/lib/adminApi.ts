// API quản trị: hàng đợi xác minh, duyệt bằng chứng và dữ liệu tuân thủ (I1, I2, C1, C4, C6).
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type QueueItem = components['schemas']['QueueItem'];
export type TariffLine = components['schemas']['TariffLineOut'];
export type RooRule = components['schemas']['RooRuleOut'];
export type EvidenceTypeRow = components['schemas']['EvidenceTypeOut'];
export type EvidenceRuleRow = components['schemas']['RuleOut'];
export type TariffLineInput = components['schemas']['TariffLineIn'];
export type TariffLinePatch = components['schemas']['TariffLinePatch'];
export type RooRuleInput = components['schemas']['RooRuleIn'];
export type RooRulePatch = components['schemas']['RooRulePatch'];
export type EvidenceTypeInput = components['schemas']['EvidenceTypeIn'];
export type EvidenceTypePatch = components['schemas']['EvidenceTypePatch'];
export type EvidenceRuleInput = components['schemas']['RuleIn'];
export type EvidenceRulePatch = components['schemas']['RulePatch'];
export type CountryTermInput = components['schemas']['CountryTermIn'];
export type CountryTermPatch = components['schemas']['CountryTermPatch'];
export type ImportResult = components['schemas']['ImportResult'];
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

/** U4: admin nhập ngày đọc trên giấy tờ khi duyệt (seller không bắt buộc nhập). */
export function reviewEvidence(
  evidenceId: string,
  decision: 'approve' | 'reject',
  reason: string,
  dates: { issuedAt?: string; expiresAt?: string } = {},
): Promise<void> {
  return act(
    () =>
      createApiClient().POST('/api/admin/evidences/{evidence_id}/review', {
        params: { path: { evidence_id: evidenceId } },
        body: {
          decision,
          reason: reason.trim() || null,
          issued_at: dates.issuedAt || null,
          expires_at: dates.expiresAt || null,
        },
      }),
    {
      422: 'Từ chối cần lý do; duyệt loại giấy tờ có hạn dùng cần ngày cấp (không ở tương lai, trước ngày hết hạn).',
      404: 'Không tìm thấy bằng chứng.',
    },
  );
}

// ── Dữ liệu tuân thủ ────────────────────────────────────────────────────────
export const listTariffLines = () => read(() => createApiClient().GET('/api/admin/tariff-lines'));
export const listCountryTerms = () => read(() => createApiClient().GET('/api/admin/country-terms'));
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

// Thêm / sửa: lỗi nghiệp vụ của backend (mã lỗi) được dịch ra câu tiếng Việt để admin biết sửa ở đâu.
const SAVE_ERRORS: Record<string, string> = {
  unknown_hs_code: 'Mã HS không có trong danh mục.',
  invalid_validity: 'Ngày hết hiệu lực phải sau ngày bắt đầu.',
  invalid_threshold: 'Ngưỡng % bắt buộc với MaxNOM/CTH_OR_MaxNOM và phải để trống với WO/CTH.',
  unknown_category: 'Nhóm hàng không có trong danh mục HS.',
  unknown_evidence_type: 'Loại bằng chứng không tồn tại.',
  evidence_type_exists: 'Mã loại bằng chứng đã tồn tại.',
  rule_exists: 'Luật này đã tồn tại.',
  duplicate_term: 'Mã HS, nước và ngày bắt đầu này đã có.',
  invalid_patch: 'Trường bắt buộc không được để trống.',
  not_found: 'Không tìm thấy dòng dữ liệu.',
  rule_not_found: 'Không tìm thấy dòng dữ liệu.',
  evidence_type_not_found: 'Không tìm thấy dòng dữ liệu.',
};

type ErrorBody = { error?: { code?: string; message?: string }; detail?: { loc: (string | number)[]; msg: string }[] };

function saveMessage(status: number, error: unknown): string {
  const body = (error ?? undefined) as ErrorBody | undefined;
  const code = body?.error?.code;
  if (code && SAVE_ERRORS[code]) return SAVE_ERRORS[code];
  if (Array.isArray(body?.detail)) return body.detail.map((d) => `${String(d.loc.at(-1))}: ${d.msg}`).join('; ');
  if (status === 404) return SAVE_ERRORS.not_found;
  return body?.error?.message ?? NETWORK;
}

async function save(call: () => Promise<{ response: Response; error?: unknown }>): Promise<void> {
  let result: { response: Response; error?: unknown };
  try {
    result = await call();
  } catch {
    throw new Error(NETWORK);
  }
  if (!result.response.ok) throw new Error(saveMessage(result.response.status, result.error));
}

export const createTariffLine = (body: TariffLineInput) => save(() => createApiClient().POST('/api/admin/tariff-lines', { body }));
export const updateTariffLine = (id: string, body: TariffLinePatch) =>
  save(() => createApiClient().PATCH('/api/admin/tariff-lines/{line_id}', { params: { path: { line_id: id } }, body }));
export const reviewCountryTerm = (id: string) =>
  act(() => createApiClient().POST('/api/admin/country-terms/{term_id}/review', { params: { path: { term_id: id } } }), REVIEW_ERRORS);
export const deleteCountryTerm = (id: string) =>
  act(() => createApiClient().DELETE('/api/admin/country-terms/{term_id}', { params: { path: { term_id: id } } }), DELETE_ERRORS);
export const createCountryTerm = (body: CountryTermInput) => save(() => createApiClient().POST('/api/admin/country-terms', { body }));
export const updateCountryTerm = (id: string, body: CountryTermPatch) =>
  save(() => createApiClient().PATCH('/api/admin/country-terms/{term_id}', { params: { path: { term_id: id } }, body }));
export const createRooRule = (body: RooRuleInput) => save(() => createApiClient().POST('/api/admin/roo-rules', { body }));
export const updateRooRule = (id: string, body: RooRulePatch) =>
  save(() => createApiClient().PATCH('/api/admin/roo-rules/{rule_id}', { params: { path: { rule_id: id } }, body }));
export const createEvidenceType = (body: EvidenceTypeInput) => save(() => createApiClient().POST('/api/admin/evidence-types', { body }));
export const updateEvidenceType = (code: string, body: EvidenceTypePatch) =>
  save(() => createApiClient().PATCH('/api/admin/evidence-types/{code}', { params: { path: { code } }, body }));
export const createEvidenceRule = (body: EvidenceRuleInput) => save(() => createApiClient().POST('/api/admin/evidence-rules', { body }));
export const updateEvidenceRule = (id: string, body: EvidenceRulePatch) =>
  save(() => createApiClient().PATCH('/api/admin/evidence-rules/{rule_id}', { params: { path: { rule_id: id } }, body }));

// ── Excel: tải template / xuất / nhập (file đi thẳng qua fetch, không qua client sinh tự động) ──
const apiUrl = (path: string) => `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}${path}`;

/** Tải file .xlsx từ backend rồi cho trình duyệt lưu xuống máy. */
export async function downloadXlsx(path: string, filename: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(new Request(apiUrl(path), { credentials: 'include' }));
  } catch {
    throw new Error(NETWORK);
  }
  if (!response.ok) throw new Error('Không tải được file. Vui lòng thử lại.');
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const IMPORT_ERRORS: Record<number, string> = {
  413: 'File quá lớn (tối đa 2 MB, 5000 dòng).',
  422: 'File không hợp lệ: cần file .xlsx có sheet "data" và đủ cột bắt buộc.',
};

/** dryRun = true chỉ kiểm tra và đếm, không ghi. Lỗi theo dòng nằm trong kết quả (errors), không ném. */
export async function importXlsx(path: string, file: File, dryRun: boolean): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  let response: Response;
  try {
    response = await fetch(new Request(apiUrl(`${path}?dry_run=${dryRun}`), { method: 'POST', body: form, credentials: 'include' }));
  } catch {
    throw new Error(NETWORK);
  }
  if (!response.ok) throw new Error(IMPORT_ERRORS[response.status] ?? NETWORK);
  return (await response.json()) as ImportResult;
}

// ── Kiểm duyệt hồ sơ, sản phẩm, nhật ký, thống kê (I4, I5) ─────────────────────
export type AdminCompany = components['schemas']['AdminCompanyOut'];
export type AdminProduct = components['schemas']['AdminProductOut'];
export type AuditLog = components['schemas']['AuditLogOut'];
export type Stats = components['schemas']['StatsOut'];

export const getStats = () => read(() => createApiClient().GET('/api/admin/stats'));

export const listCompanies = (query: { q?: string; status?: AdminCompany['verification_status']; hidden?: boolean; limit?: number; offset?: number } = {}) =>
  read(() => createApiClient().GET('/api/admin/companies', { params: { query } }));

export const listProducts = (query: { company_id?: string; q?: string; limit?: number; offset?: number; recent_days?: number } = {}) =>
  read(() => createApiClient().GET('/api/admin/products', { params: { query } }));

export const listAuditLogs = (query: { entity_type?: string; entity_id?: string; action_type?: string; limit?: number; offset?: number } = {}) =>
  read(() => createApiClient().GET('/api/admin/audit-logs', { params: { query } }));

const HIDE_ERRORS = { 404: 'Không tìm thấy dữ liệu.', 422: 'Dữ liệu không hợp lệ.' };

export const setCompanyHidden = (id: string, hidden: boolean) =>
  act(
    () =>
      createApiClient().PATCH('/api/admin/companies/{company_id}', {
        params: { path: { company_id: id } },
        body: { is_hidden: hidden },
      }),
    HIDE_ERRORS,
  );

export const setProductHidden = (id: string, hidden: boolean) =>
  act(
    () =>
      createApiClient().PATCH('/api/admin/products/{product_id}', {
        params: { path: { product_id: id } },
        body: { approval_status: hidden ? 'hidden' : 'approved' },
      }),
    HIDE_ERRORS,
  );

// ── Trợ lý AI: câu hỏi, mẫu tuần, tài liệu corpus (D3, I5) ────────────────────
export type AiQuery = components['schemas']['AiQueryOut'];
export type CorpusDocument = components['schemas']['CorpusDocumentOut'];
export type AiConfidence = AiQuery['confidence'];

export const listAiQueries = (query: { confidence?: AiConfidence; helpful?: boolean; limit?: number; offset?: number } = {}) =>
  read(() => createApiClient().GET('/api/admin/ai-queries', { params: { query } }));
export const getWeeklySample = (size = 20) =>
  read(() => createApiClient().GET('/api/admin/ai-queries/weekly-sample', { params: { query: { size } } }));
export const listCorpusDocuments = () => read(() => createApiClient().GET('/api/admin/corpus-documents'));
export const reviewCorpusDocument = (id: string) =>
  act(
    () => createApiClient().POST('/api/admin/corpus-documents/{document_id}/review', { params: { path: { document_id: id } } }),
    { 404: 'Không tìm thấy tài liệu.' },
  );
