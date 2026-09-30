// Bản nháp EUR.1 (C5): yêu cầu sinh và theo dõi trạng thái. Không có tính năng cấp C/O.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type DocumentOut = components['schemas']['DocumentOut'];

export interface Eur1Input {
  checkId: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneeCountry: string;
  invoiceNumber: string;
  invoiceDate: string;
  goodsDescription: string;
  packages: string;
  grossMassKg: string;
  transportDetails: string;
  remarks: string;
}

const NETWORK = 'Không kết nối được máy chủ. Vui lòng thử lại.';
const blank = (v: string) => (v.trim() === '' ? null : v.trim());

export async function requestEur1(input: Eur1Input): Promise<DocumentOut> {
  let result;
  try {
    result = await createApiClient().POST('/api/exporter/documents/eur1', {
      body: {
        compliance_check_id: input.checkId,
        consignee_name: input.consigneeName.trim(),
        consignee_address: input.consigneeAddress.trim(),
        consignee_country: input.consigneeCountry,
        invoice_number: input.invoiceNumber.trim(),
        invoice_date: input.invoiceDate,
        goods_description: input.goodsDescription.trim(),
        packages: input.packages.trim(),
        gross_mass_kg: input.grossMassKg.trim(),
        transport_details: blank(input.transportDetails),
        remarks: blank(input.remarks),
      },
    });
  } catch {
    throw new Error(NETWORK);
  }
  const { response, data } = result;
  if (response.status === 409) throw new Error('Chỉ tạo được bản nháp khi kết quả xuất xứ là Đạt.');
  if (response.status === 404) throw new Error('Không tìm thấy kết quả xuất xứ hoặc bạn chưa có hồ sơ doanh nghiệp.');
  if (response.status === 422) throw new Error('Dữ liệu hóa đơn chưa hợp lệ. Vui lòng kiểm tra lại các ô.');
  if (response.status === 429) throw new Error('Bạn thao tác quá nhiều lần. Vui lòng thử lại sau một phút.');
  if (!response.ok || !data) throw new Error(NETWORK);
  return data;
}

export async function getDocument(id: string): Promise<DocumentOut | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/exporter/documents/{document_id}', {
      params: { path: { document_id: id } },
    });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}
