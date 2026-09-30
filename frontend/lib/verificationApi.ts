// Yêu cầu xác minh phía exporter (I1): xem trạng thái, gửi yêu cầu, xem lý do bị từ chối / yêu cầu bổ sung.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type VerificationRequest = components['schemas']['VerificationRequestOut'];

const NETWORK = 'Không kết nối được máy chủ. Vui lòng thử lại.';

export async function listMyRequests(): Promise<VerificationRequest[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/exporter/verification-requests');
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function submitRequest(): Promise<VerificationRequest> {
  let result;
  try {
    result = await createApiClient().POST('/api/exporter/verification-requests');
  } catch {
    throw new Error(NETWORK);
  }
  if (result.response.status === 409) {
    throw new Error('Hồ sơ đang chờ duyệt hoặc đã được xác minh, không gửi thêm được.');
  }
  if (result.response.status === 404) {
    throw new Error('Hãy tạo hồ sơ doanh nghiệp trước khi gửi yêu cầu xác minh.');
  }
  if (!result.response.ok || !result.data) throw new Error(NETWORK);
  return result.data;
}
