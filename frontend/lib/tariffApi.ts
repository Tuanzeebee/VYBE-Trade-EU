// Công cụ tính thuế (C2): gọi POST /api/public/tariff. Số tiền luôn là CHUỖI, không qua float.
import { createApiClient } from './api/client';
import type { components } from './api/schema';
import { COUNTRIES } from './companyApi';

export type TariffResult = components['schemas']['TariffOut'];
export type TariffOptions = components['schemas']['TariffOptionsOut'];
export type Agreement = components['schemas']['AgreementOut'];
export type Subtype = components['schemas']['SubtypeOut'];
export type QuotaAllocated = 'yes' | 'no' | 'unknown';

// U13: lý do "cần xem xét" của hàng có hạn ngạch → câu hướng dẫn (không có con số nào).
export const QUOTA_REVIEW_MESSAGES: Record<string, string> = {
  no_quota_data: 'Chưa có dữ liệu hạn ngạch đã được chuyên gia duyệt cho mặt hàng này, nên chúng tôi không đưa ra con số.',
  subtype_required: 'Mặt hàng này có hạn ngạch thuế quan. Chọn phân nhóm hàng để xem kịch bản trong / ngoài hạn ngạch.',
  subtype_not_eligible:
    'Phân nhóm này không thuộc danh sách đủ điều kiện hạn ngạch đã duyệt (ví dụ giống gạo chưa có trong danh sách). Trường hợp này cần chuyên gia xem xét.',
  quantity_required: 'Thuế ngoài hạn ngạch là thuế tuyệt đối theo khối lượng. Nhập khối lượng lô hàng để tính.',
  mixed_duty: 'Mặt hàng áp thuế hỗn hợp, cần chuyên gia xem xét.',
  data_anomaly: 'Dữ liệu hạn ngạch bất thường, cần chuyên gia kiểm tra lại.',
};

// Điều kiện luôn đi kèm kịch bản hạn ngạch — không bao giờ là "0% vô điều kiện".
export const QUOTA_CONDITIONS: Record<string, string> = {
  origin: 'Hàng đạt quy tắc xuất xứ của hiệp định và có chứng từ chứng nhận xuất xứ hợp lệ.',
  allocation: 'Thuế trong hạn ngạch chỉ áp dụng khi lô hàng được phân bổ hạn ngạch (còn hạn ngạch tại thời điểm nhập khẩu); nếu không, áp thuế ngoài hạn ngạch.',
  subtype: 'Hàng đúng phân nhóm đủ điều kiện đã chọn.',
  licence: 'Có giấy phép / chứng nhận theo yêu cầu của hạn ngạch (xem ghi chú bên dưới).',
};

// 27 nước thành viên EU (danh sách trùng backend calculators.EU_MEMBERS).
const EU_CODES = 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' ');
export const EU_COUNTRIES = COUNTRIES.filter((c) => EU_CODES.includes(c.code));
export const isEuMember = (code: string) => EU_CODES.includes(code);
// U12: thị trường ngoài EU — hiệp định nào áp dụng do dữ liệu đã duyệt quyết định (backend).
export const OTHER_MARKETS = COUNTRIES.filter((c) => c.code !== 'VN' && !EU_CODES.includes(c.code));

/** Hiệp định có dữ liệu đã duyệt cho (mã HS, thị trường). null = lỗi tải. */
export async function fetchTariffOptions(hsCode: string, destination: string): Promise<TariffOptions | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/public/tariff/options', {
      params: { query: { hs_code: hsCode, destination } },
    });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

const AMOUNT = /^[0-9]{1,12}(\.[0-9]{1,2})?$/;

/** Chuỗi số tiền hợp lệ (dương, tối đa 2 chữ số thập phân, dưới 10^12) → chuỗi đã cắt khoảng trắng; ngược lại null. */
export function parseAmount(raw: string): string | null {
  const value = raw.trim();
  return AMOUNT.test(value) && Number(value) > 0 ? value : null;
}

export type TariffError = 'rate_limited' | 'invalid' | 'agreement_required' | 'network';
export type TariffOutcome = { ok: true; data: TariffResult } | { ok: false; error: TariffError };

export async function calculateTariff(input: {
  hsCode: string;
  destination: string;
  productValue: string;
  shipmentsPerYear?: number;
  agreement?: string;
  subtypeCode?: string;
  quantity?: string;
  quotaAllocated?: QuotaAllocated;
}): Promise<TariffOutcome> {
  try {
    const { data, error, response } = await createApiClient().POST('/api/public/tariff', {
      body: {
        hs_code: input.hsCode,
        destination: input.destination,
        product_value: input.productValue,
        ...(input.shipmentsPerYear ? { shipments_per_year: input.shipmentsPerYear } : {}),
        ...(input.agreement ? { agreement: input.agreement } : {}),
        ...(input.subtypeCode ? { subtype_code: input.subtypeCode } : {}),
        ...(input.quantity ? { quantity: input.quantity } : {}),
        ...(input.quotaAllocated ? { quota_allocated: input.quotaAllocated } : {}),
      },
    });
    if (response.status === 429) return { ok: false, error: 'rate_limited' };
    if (response.status === 422 && (error as { error?: { code?: string } } | undefined)?.error?.code === 'agreement_required') {
      return { ok: false, error: 'agreement_required' };
    }
    if (response.status === 422) return { ok: false, error: 'invalid' };
    if (!response.ok || !data) return { ok: false, error: 'network' };
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'network' };
  }
}
