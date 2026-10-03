// Máy tính xuất xứ cho các mã đã có dữ liệu Chương 3/7/8, danh sách bằng chứng, checklist công ty và
// hàng đợi luật sư (SPEC_compliance_data_20_codes §5–§7). Tỷ lệ % và số tiền luôn là CHUỖI.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type OriginQuestions = components['schemas']['OriginQuestionsOut'];
export type OriginInput = components['schemas']['OriginInputOut'];
export type OriginResult = components['schemas']['OriginOut'];
export type OriginBody = components['schemas']['OriginIn'];
export type EvidenceItem = components['schemas']['EvidenceItemOut'];
export type CompanyChecklist = components['schemas']['CompanyChecklistOut'];
export type ReviewIssue = components['schemas']['ReviewIssueOut'];
export type ExporterRequirements = components['schemas']['ExporterRequirementsOut'];

/** Giá trị người dùng nhập cho từng câu trả lời: 'yes' / 'no' (boolean), chuỗi số (%), mã enum, '' = chưa trả lời. */
export type Answers = Record<string, string>;

export type OriginError = 'rate_limited' | 'invalid' | 'network';
export type OriginOutcome = { ok: true; data: OriginResult } | { ok: false; error: OriginError };

const PERCENT = /^(100(\.0{1,2})?|[0-9]{1,2}(\.[0-9]{1,2})?)$/;

/** Chuỗi % hợp lệ (0–100, tối đa 2 chữ số thập phân) → chuỗi đã cắt khoảng trắng; ngược lại null. */
export function parsePercent(raw: string): string | null {
  const value = raw.trim().replace(',', '.');
  return PERCENT.test(value) ? value : null;
}

/** Điều kiện hiển thị của một câu trả lời: "transit_third_country=true" / "sourcing=CAUGHT_BY_VESSEL". */
export function isInputVisible(input: OriginInput, answers: Answers): boolean {
  const rule = input.required_if;
  if (!rule || rule === 'optional') return true;
  const [name, expected] = rule.split('=');
  const value = answers[name] ?? '';
  if (expected === 'true') return value === 'yes';
  return value === expected;
}

/** Đổi câu trả lời của form thành thân yêu cầu API; trả null + tên trường lỗi nếu % sai định dạng. */
export function buildOriginBody(
  hsCode: string,
  inputs: OriginInput[],
  answers: Answers,
  extra: { consignmentValue: string | null; rawMaterialSource: string; isFresh: string },
): { ok: true; body: OriginBody } | { ok: false; field: string } {
  const body: Record<string, unknown> = { hs_code: hsCode };
  if (extra.consignmentValue) body.consignment_value_eur = extra.consignmentValue;
  if (extra.rawMaterialSource) body.raw_material_source = extra.rawMaterialSource;
  if (extra.isFresh) body.is_fresh = extra.isFresh === 'yes';
  for (const input of inputs) {
    const value = (answers[input.name] ?? '').trim();
    if (!isInputVisible(input, answers) || value === '') continue;
    if (input.kind === 'boolean') body[input.name] = value === 'yes';
    else if (input.kind === 'percent') {
      const pct = parsePercent(value);
      if (pct === null) return { ok: false, field: input.name };
      body[input.name] = pct;
    } else body[input.name] = value;
  }
  return { ok: true, body: body as OriginBody };
}

export async function fetchOriginQuestions(hsCode: string): Promise<OriginQuestions | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/public/hs-codes/{cn}/origin-questions', {
      params: { path: { cn: hsCode } },
    });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function calculateOrigin(body: OriginBody): Promise<OriginOutcome> {
  try {
    const { data, response } = await createApiClient().POST('/api/public/origin', { body });
    if (response.status === 429) return { ok: false, error: 'rate_limited' };
    if (response.status === 422) return { ok: false, error: 'invalid' };
    if (!response.ok || !data) return { ok: false, error: 'network' };
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'network' };
  }
}

/** Checklist bằng chứng cấp công ty + huy hiệu cho một mã HS (chủ công ty hoặc admin). */
export async function fetchCompanyChecklist(companyId: string, hs: string): Promise<CompanyChecklist | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/companies/{company_id}/evidence-checklist', {
      params: { path: { company_id: companyId }, query: { hs } },
    });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function fetchReviewIssues(onlyOpen = true): Promise<ReviewIssue[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/admin/compliance-review-issues', {
      params: { query: { only_open: onlyOpen } },
    });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function resolveReviewIssue(id: string): Promise<boolean> {
  try {
    const { response } = await createApiClient().POST('/api/admin/compliance-review-issues/{issue_id}/resolve', {
      params: { path: { issue_id: id } },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Bằng chứng cần có theo mã HS của sản phẩm công ty đã khai (bước Giấy phép và chứng nhận). */
export async function fetchExporterRequirements(): Promise<ExporterRequirements | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/exporter/evidence-requirements');
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}
