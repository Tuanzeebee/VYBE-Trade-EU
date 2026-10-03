// Nhu cầu mua hàng của buyer (U5): lưu trên server thay vì trình duyệt; bản nháp trong form ↔ API.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type SourcingNeeds = components['schemas']['SourcingNeedsOut'];
export type SourcingNeedsIn = components['schemas']['SourcingNeedsIn'];

export interface NeedsDraft {
  productsText: string;
  quantity: string;
  quantityUnit: string;
  frequency: string;
  certifications: string[];
  minSupplierTier: string;
  destinationCountry: string;
  destinationPort: string;
  incoterm: string;
  budgetAmount: string;
  budgetCurrency: 'EUR' | 'USD';
  notes: string;
}

// Loại hình buyer (khách: importer, wholesaler, distributor, siêu thị, Horeca…) — lưu mã vào business_type.
export const BUYER_BUSINESS_TYPES: { code: string; label: string }[] = [
  { code: 'importer', label: 'Nhà nhập khẩu' },
  { code: 'wholesaler', label: 'Nhà bán buôn' },
  { code: 'distributor', label: 'Nhà phân phối' },
  { code: 'retailer', label: 'Siêu thị, chuỗi bán lẻ' },
  { code: 'horeca', label: 'Nhà hàng, khách sạn (Horeca)' },
  { code: 'processor', label: 'Nhà máy chế biến' },
  { code: 'other', label: 'Khác' },
];

export const FREQUENCIES: { code: string; label: string }[] = [
  { code: 'one_off', label: 'Mua một lần' },
  { code: 'monthly', label: 'Hằng tháng' },
  { code: 'quarterly', label: 'Hằng quý' },
  { code: 'yearly', label: 'Hằng năm' },
];

export const WANTED_CERTIFICATES = ['HACCP', 'ISO 22000', 'BRCGS', 'IFS', 'GlobalG.A.P.', 'EU Organic', 'ASC', 'BAP', 'Halal', 'Fairtrade'];

// Cấp xác minh nhà cung cấp tối thiểu (ADR-0004): tên cấp dùng chung toàn hệ thống.
export const SUPPLIER_TIERS: { code: string; label: string }[] = [
  { code: '1', label: 'Cơ bản (pháp lý đã xác minh)' },
  { code: '2', label: 'Nâng cao (năng lực đã xác minh)' },
  { code: '3', label: 'Chuyên sâu (bên thứ ba đánh giá)' },
];

export const INCOTERMS = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS'];

export function emptyNeeds(): NeedsDraft {
  return {
    productsText: '',
    quantity: '',
    quantityUnit: 'tonne',
    frequency: '',
    certifications: [],
    minSupplierTier: '',
    destinationCountry: '',
    destinationPort: '',
    incoterm: '',
    budgetAmount: '',
    budgetCurrency: 'EUR',
    notes: '',
  };
}

export function needsFromServer(n: SourcingNeeds): NeedsDraft {
  return {
    productsText: n.products_text ?? '',
    quantity: n.quantity ?? '',
    quantityUnit: n.quantity_unit ?? 'tonne',
    frequency: n.frequency ?? '',
    certifications: n.certifications_wanted ?? [],
    minSupplierTier: n.min_supplier_tier === null || n.min_supplier_tier === undefined ? '' : String(n.min_supplier_tier),
    destinationCountry: n.destination_country ?? '',
    destinationPort: n.destination_port ?? '',
    incoterm: n.incoterm ?? '',
    budgetAmount: n.budget_amount ?? '',
    budgetCurrency: (n.budget_currency ?? 'EUR') as 'EUR' | 'USD',
    notes: n.notes ?? '',
  };
}

const blank = (value: string) => (value.trim() === '' ? null : value.trim());
function amount(label: string, text: string): string | null {
  const value = text.trim().replace(',', '.');
  if (!value) return null;
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(value) || Number(value) <= 0) throw new Error(`${label} không hợp lệ (số dương, tối đa 2 chữ số thập phân).`);
  return value;
}

export function needsToBody(d: NeedsDraft): SourcingNeedsIn {
  const quantity = amount('Khối lượng', d.quantity);
  return {
    products_text: blank(d.productsText),
    quantity,
    quantity_unit: quantity ? ((d.quantityUnit || 'tonne') as SourcingNeedsIn['quantity_unit']) : null,
    frequency: (blank(d.frequency) as SourcingNeedsIn['frequency']) ?? null,
    certifications_wanted: [...new Set(d.certifications)],
    min_supplier_tier: d.minSupplierTier ? Number(d.minSupplierTier) : null,
    destination_country: blank(d.destinationCountry),
    destination_port: blank(d.destinationPort),
    incoterm: (blank(d.incoterm) as SourcingNeedsIn['incoterm']) ?? null,
    budget_amount: amount('Ngân sách tham khảo', d.budgetAmount),
    budget_currency: d.budgetCurrency,
    notes: blank(d.notes),
  };
}

const NETWORK = 'Không kết nối được máy chủ. Vui lòng thử lại.';

export async function getSourcingNeeds(): Promise<SourcingNeeds | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/buyer/sourcing-needs');
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function saveSourcingNeeds(draft: NeedsDraft): Promise<SourcingNeeds> {
  const body = needsToBody(draft);
  let result: { data?: SourcingNeeds; response: Response };
  try {
    result = await createApiClient().PUT('/api/buyer/sourcing-needs', { body });
  } catch {
    throw new Error(NETWORK);
  }
  if (result.response.status === 422) throw new Error('Nhu cầu mua hàng chưa hợp lệ. Vui lòng kiểm tra lại.');
  if (!result.response.ok || !result.data) throw new Error(NETWORK);
  return result.data;
}
