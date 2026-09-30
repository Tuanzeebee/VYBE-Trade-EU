// Kiểm tự động và kiểm tay (U21, ADR-0003): chỉ là tín hiệu cho admin, không đổi trạng thái xác minh.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type Check = components['schemas']['CheckOut'];
export type ManualCheck = components['schemas']['ManualCheckIn'];
export type ManualCheckCode = ManualCheck['check_code'];

export async function listMyChecks(): Promise<Check[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/me/verification-checks');
    return response.ok && Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export async function runChecks(companyId: string): Promise<boolean> {
  try {
    const { response } = await createApiClient().POST('/api/admin/companies/{company_id}/checks/run', { params: { path: { company_id: companyId } } });
    return response.ok;
  } catch {
    return false;
  }
}

export async function recordManualCheck(companyId: string, body: ManualCheck): Promise<boolean> {
  try {
    const { response } = await createApiClient().POST('/api/admin/companies/{company_id}/checks', { params: { path: { company_id: companyId } }, body });
    return response.ok;
  } catch {
    return false;
  }
}

// ── Luật kiểm chéo (U22): gợi ý cho chủ hồ sơ, cờ cho admin ──────────────────
export type Finding = components['schemas']['FindingOut'];

export async function listMyHints(): Promise<Finding[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/exporter/consistency-hints');
    return response.ok && Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}
