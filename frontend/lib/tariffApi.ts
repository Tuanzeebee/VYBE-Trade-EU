// Công cụ tính thuế (C2): gọi POST /api/public/tariff. Số tiền luôn là CHUỖI, không qua float.
import { createApiClient } from './api/client';
import type { components } from './api/schema';
import { COUNTRIES } from './companyApi';

export type TariffResult = components['schemas']['TariffOut'];
export type Valuation = components['schemas']['ValuationOut'];
export type TariffOptions = components['schemas']['TariffOptionsOut'];
export type Agreement = components['schemas']['AgreementOut'];
export type Subtype = components['schemas']['SubtypeOut'];
export type QuotaAllocated = 'yes' | 'no' | 'unknown';
export type QuantityUnit = 'kg' | 'tonne';

// U13: lý do "cần xem xét" của hàng có hạn ngạch → câu hướng dẫn (không có con số nào).
export const QUOTA_REVIEW_MESSAGES: Record<string, string> = {
  no_quota_data: 'Chưa có dữ liệu hạn ngạch đã được chuyên gia duyệt cho mặt hàng này, nên chúng tôi không đưa ra con số.',
  subtype_required: 'Mặt hàng này có hạn ngạch thuế quan. Chọn phân nhóm hàng để xem kịch bản trong / ngoài hạn ngạch.',
  subtype_not_eligible:
    'Phân nhóm này không thuộc danh sách đủ điều kiện hạn ngạch đã duyệt (ví dụ giống gạo chưa có trong danh sách). Trường hợp này cần chuyên gia xem xét.',
  quantity_required: 'Thuế ngoài hạn ngạch là thuế tuyệt đối theo khối lượng. Nhập khối lượng lô hàng để tính.',
  mixed_duty: 'Mặt hàng áp thuế hỗn hợp, cần chuyên gia xem xét.',
  data_anomaly: 'Dữ liệu hạn ngạch bất thường, cần chuyên gia kiểm tra lại.',
  unit_mismatch: 'Đơn vị khối lượng đã chọn không quy đổi được sang đơn vị của hạn ngạch. Vui lòng chọn lại đơn vị.',
};

// Điều kiện luôn đi kèm kịch bản hạn ngạch — không bao giờ là "0% vô điều kiện".
export const QUOTA_CONDITIONS: Record<string, string> = {
  origin: 'Hàng đạt quy tắc xuất xứ của hiệp định và có chứng từ chứng nhận xuất xứ hợp lệ.',
  allocation: 'Thuế trong hạn ngạch chỉ áp dụng khi lô hàng được phân bổ hạn ngạch (còn hạn ngạch tại thời điểm nhập khẩu); nếu không, áp thuế ngoài hạn ngạch.',
  subtype: 'Hàng đúng phân nhóm đủ điều kiện đã chọn.',
  licence: 'Có giấy phép / chứng nhận theo yêu cầu của hạn ngạch (xem ghi chú bên dưới).',
};

// C2-A: điều kiện giao hàng (Incoterm) và các khoản chi phí cần khai để ra trị giá tính thuế.
// Khớp backend calculators.customs_value; backend là nguồn quyết định, giao diện chỉ bật/tắt ô nhập.
export type Incoterm = 'EXW' | 'FCA' | 'FAS' | 'FOB' | 'CFR' | 'CPT' | 'CIF' | 'CIP' | 'DAP' | 'DPU' | 'DDP';
export type CostField = 'freight' | 'insurance' | 'postBorder';

export const INCOTERMS: { code: Incoterm; label: string; costs: CostField[] }[] = [
  { code: 'EXW', label: 'EXW — Giao tại xưởng', costs: ['freight', 'insurance'] },
  { code: 'FCA', label: 'FCA — Giao cho người chuyên chở', costs: ['freight', 'insurance'] },
  { code: 'FAS', label: 'FAS — Giao dọc mạn tàu', costs: ['freight', 'insurance'] },
  { code: 'FOB', label: 'FOB — Giao lên tàu', costs: ['freight', 'insurance'] },
  { code: 'CFR', label: 'CFR — Tiền hàng và cước phí', costs: ['insurance'] },
  { code: 'CPT', label: 'CPT — Cước phí trả tới', costs: ['insurance'] },
  { code: 'CIF', label: 'CIF — Tiền hàng, bảo hiểm và cước phí', costs: [] },
  { code: 'CIP', label: 'CIP — Cước phí và bảo hiểm trả tới', costs: [] },
  { code: 'DAP', label: 'DAP — Giao tại nơi đến', costs: ['postBorder'] },
  { code: 'DPU', label: 'DPU — Giao tại nơi đến đã dỡ hàng', costs: ['postBorder'] },
  { code: 'DDP', label: 'DDP — Giao đã nộp thuế', costs: [] },
];

/** Cảnh báo về trị giá tính thuế (mã do backend trả) → câu hướng dẫn. */
export const VALUATION_WARNINGS: Record<string, string> = {
  NO_VALUATION_RULE: 'Chưa có quy tắc trị giá hải quan của nước này nên dùng nguyên giá hóa đơn làm trị giá tính thuế.',
  INCOTERM_NOT_GIVEN: 'Chưa chọn điều kiện giao hàng (Incoterm) nên dùng nguyên giá hóa đơn làm trị giá tính thuế.',
  MISSING_FREIGHT: 'Chưa khai cước vận chuyển quốc tế: thuế có thể thấp hơn thực tế.',
  MISSING_INSURANCE: 'Chưa khai phí bảo hiểm: thuế có thể thấp hơn thực tế.',
  MISSING_POST_BORDER: 'Chưa khai chi phí sau cửa khẩu nhập: thuế có thể cao hơn thực tế.',
};

/** Lý do "cần xem xét" liên quan đến trị giá tính thuế (không có con số nào). */
export const VALUATION_REVIEW_MESSAGES: Record<string, string> = {
  ddp_not_supported:
    'Điều kiện DDP (giá đã gồm thuế nhập khẩu) cần tính ngược thuế khỏi giá nên chưa được tính tự động. Vui lòng chọn điều kiện khác hoặc liên hệ chuyên gia.',
  incoterm_not_supported_for_basis:
    'Điều kiện giao hàng này chưa được hỗ trợ cho cách tính trị giá của nước đến. Vui lòng liên hệ chuyên gia.',
  invalid_value: 'Trị giá tính thuế sau điều chỉnh không hợp lệ (bằng hoặc nhỏ hơn 0). Vui lòng kiểm tra lại các khoản chi phí.',
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

/** Chi phí (cước, bảo hiểm...): số >= 0, tối đa 2 chữ số thập phân; "0" hợp lệ (đã khai là không có). */
export function parseCost(raw: string): string | null {
  const value = raw.trim();
  return AMOUNT.test(value) ? value : null;
}

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
  quantityUnit?: QuantityUnit;
  quotaAccessCost?: string;
  incoterm?: Incoterm;
  currency?: string;
  freight?: string;
  insurance?: string;
  postBorderCosts?: string;
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
        ...(input.quantityUnit ? { quantity_unit: input.quantityUnit } : {}),
        ...(input.quotaAccessCost !== undefined ? { quota_access_cost: input.quotaAccessCost } : {}),
        ...(input.incoterm ? { incoterm: input.incoterm } : {}),
        ...(input.currency ? { currency: input.currency } : {}),
        ...(input.freight !== undefined ? { freight: input.freight } : {}),
        ...(input.insurance !== undefined ? { insurance: input.insurance } : {}),
        ...(input.postBorderCosts !== undefined ? { post_border_costs: input.postBorderCosts } : {}),
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
