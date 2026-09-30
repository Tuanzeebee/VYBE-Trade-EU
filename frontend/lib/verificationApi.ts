// Yêu cầu xác minh (I1): xem trạng thái, gửi yêu cầu, xem lý do bị từ chối / yêu cầu bổ sung.
// Exporter bắt buộc để hiện trong danh bạ; buyer chỉ TÙY CHỌN (U6, ADR-0004).
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type VerificationRequest = components['schemas']['VerificationRequestOut'];

const NETWORK = 'Không kết nối được máy chủ. Vui lòng thử lại.';

type Role = 'exporter' | 'buyer';

export async function listMyRequests(role: Role = 'exporter'): Promise<VerificationRequest[] | null> {
  try {
    const client = createApiClient();
    const { data, response } =
      role === 'buyer' ? await client.GET('/api/buyer/verification-requests') : await client.GET('/api/exporter/verification-requests');
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export class AlreadySubmittedError extends Error {}

export async function submitRequest(role: Role = 'exporter'): Promise<VerificationRequest> {
  let result;
  try {
    const client = createApiClient();
    result =
      role === 'buyer' ? await client.POST('/api/buyer/verification-requests') : await client.POST('/api/exporter/verification-requests');
  } catch {
    throw new Error(NETWORK);
  }
  if (result.response.status === 422) {
    throw new Error('Cần lưu mã số VAT hoặc số đăng ký doanh nghiệp để quản trị viên đối chiếu.');
  }
  if (result.response.status === 409) {
    throw new AlreadySubmittedError('Hồ sơ đang chờ duyệt hoặc đã được xác minh, không gửi thêm được.');
  }
  if (result.response.status === 404) {
    throw new Error('Hãy tạo hồ sơ doanh nghiệp trước khi gửi yêu cầu xác minh.');
  }
  if (!result.response.ok || !result.data) throw new Error(NETWORK);
  return result.data;
}

/** Gửi hồ sơ xong thì đưa vào hàng đợi admin; đã chờ duyệt / đã xác minh thì bỏ qua, lỗi khác vẫn ném. */
export async function submitRequestIfNeeded(): Promise<void> {
  try {
    await submitRequest();
  } catch (error) {
    if (!(error instanceof AlreadySubmittedError)) throw error;
  }
}

// ── Cấp xác minh (U20, ADR-0004) ──────────────────────────────────────────────
export type TierOverview = components['schemas']['TierOverviewOut'];
export type TierRequirement = components['schemas']['TierRequirementOut'];

export async function getTierOverview(): Promise<TierOverview | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/me/verification-tier');
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export const TIER_REQUEST_ERRORS: Record<string, string> = {
  entitlement_required: 'Duyệt cấp Nâng cao là dịch vụ trả phí. Hãy đặt mua gói "Duyệt xác minh Nâng cao" trước.',
  request_pending: 'Bạn đã có yêu cầu lên cấp đang chờ duyệt.',
  not_verified: 'Cần được xác minh cấp Cơ bản trước.',
  invalid_target: 'Cấp này chưa áp dụng cho doanh nghiệp của bạn.',
};

export async function requestTier(target: number): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { error, response } = await createApiClient().POST('/api/exporter/verification-tier-requests', { body: { target_tier: target } });
    if (response.ok) return { ok: true };
    const code = (error as { error?: { code?: string } } | undefined)?.error?.code ?? '';
    return { ok: false, error: TIER_REQUEST_ERRORS[code] ?? NETWORK };
  } catch {
    return { ok: false, error: NETWORK };
  }
}

export async function adminTierDown(companyId: string, reason: string): Promise<boolean> {
  try {
    const { response } = await createApiClient().POST('/api/admin/companies/{company_id}/tier-down', {
      params: { path: { company_id: companyId } },
      body: { reason },
    });
    return response.ok;
  } catch {
    return false;
  }
}
