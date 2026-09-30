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
