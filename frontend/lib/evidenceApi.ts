// Bằng chứng của exporter (C6): loại, danh sách, danh sách kiểm, tải file và nộp.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type EvidenceType = components['schemas']['EvidenceTypePublic'];
export type Evidence = components['schemas']['EvidenceOut'];
export type ChecklistItem = components['schemas']['ChecklistItem'];

export const EVIDENCE_FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;

const NETWORK = 'Không kết nối được máy chủ. Vui lòng thử lại.';
const UPLOAD_FAILED = 'Không tải được file lên. Vui lòng thử lại.';

/** Gọi API đọc; lỗi hoặc chưa có công ty → null (giao diện hiện hướng dẫn thay vì dữ liệu giả). */
async function read<T>(call: () => Promise<{ data?: T; response: Response }>): Promise<T | null> {
  try {
    const { data, response } = await call();
    return response.ok && data !== undefined ? data : null;
  } catch {
    return null;
  }
}

export const listEvidenceTypes = () => read(() => createApiClient().GET('/api/exporter/evidence-types'));
export const listEvidence = () => read(() => createApiClient().GET('/api/exporter/evidences'));
export const getChecklist = () => read(() => createApiClient().GET('/api/exporter/evidences/checklist'));

/** Tải file lên kho qua URL ký sẵn; trả khóa lưu vào bằng chứng. */
export async function uploadEvidenceFile(file: File): Promise<string> {
  if (!(EVIDENCE_FILE_TYPES as readonly string[]).includes(file.type)) {
    throw new Error('File phải là PDF, PNG hoặc JPEG.');
  }
  if (file.size > MAX_EVIDENCE_BYTES) throw new Error('File tối đa 10MB.');
  try {
    const { data, response } = await createApiClient().POST('/api/uploads/presign', {
      body: { purpose: 'evidence', content_type: file.type as (typeof EVIDENCE_FILE_TYPES)[number] },
    });
    if (!response.ok || !data) throw new Error(UPLOAD_FAILED);
    const put = await fetch(new Request(data.upload_url, { method: 'PUT', headers: { 'content-type': file.type }, body: file }));
    if (!put.ok) throw new Error(UPLOAD_FAILED);
    return data.key;
  } catch {
    throw new Error(UPLOAD_FAILED);
  }
}

export interface EvidenceInput {
  typeCode: string;
  fileKey: string;
  certificateNumber: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string;
}

const blank = (value: string) => (value.trim() === '' ? null : value.trim());

export async function createEvidence(input: EvidenceInput): Promise<Evidence> {
  let result;
  try {
    result = await createApiClient().POST('/api/exporter/evidences', {
      body: {
        type_code: input.typeCode,
        file_key: input.fileKey,
        certificate_number: blank(input.certificateNumber),
        issuer: blank(input.issuer),
        issued_at: input.issuedAt,
        expires_at: blank(input.expiresAt),
      },
    });
  } catch {
    throw new Error(NETWORK);
  }
  if (result.response.status === 422) {
    throw new Error('Bằng chứng chưa hợp lệ. Vui lòng kiểm tra loại, ngày cấp, ngày hết hạn và file.');
  }
  if (!result.response.ok || !result.data) throw new Error(NETWORK);
  return result.data;
}

export async function deleteEvidence(id: string): Promise<void> {
  let response: Response;
  try {
    ({ response } = await createApiClient().DELETE('/api/exporter/evidences/{evidence_id}', {
      params: { path: { evidence_id: id } },
    }));
  } catch {
    throw new Error(NETWORK);
  }
  if (!response.ok) throw new Error('Không xóa được bằng chứng. Vui lòng thử lại.');
}
