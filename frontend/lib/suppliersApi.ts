// Danh bạ nhà cung cấp công khai (E2, E3). Gọi từ server component: chỉ đọc, không cần phiên.
import { createApiClient } from './api/client';
import type { components } from './api/schema';
import { COUNTRIES, INDUSTRIES } from './companyApi';

export type SupplierCardData = components['schemas']['SupplierCardOut'];
export type SupplierPage = components['schemas']['SupplierPage'];
export type FilterOptions = components['schemas']['FilterOptions'];
export type PublicProfile = components['schemas']['PublicCompanyOut'];
export type SupplierCredentials = components['schemas']['SupplierCredentialsOut'];
export type SupplierKind = 'products' | 'services';

export interface SupplierQuery {
  q?: string;
  hs?: string;
  country?: string;
  category?: string;
  cert?: string;
  page?: number;
  // U10: danh bạ sản phẩm (mặc định) hoặc nhà cung cấp dịch vụ
  kind?: SupplierKind;
  service_category?: string;
}

// Nhóm dịch vụ (trùng dữ liệu bảng service_categories, 0030) — nhãn tiếng Việt, dịch qua catalog.
export const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  logistics_freight: 'Vận tải & giao nhận',
  customs_brokerage: 'Đại lý hải quan',
  warehousing: 'Kho bãi & kho lạnh',
  accounting_tax: 'Kế toán & thuế',
  legal: 'Pháp lý & luật',
  certification_testing: 'Chứng nhận & kiểm nghiệm',
  insurance: 'Bảo hiểm hàng hóa',
  other: 'Khác',
};
export const serviceCategoryLabel = (code: string) => SERVICE_CATEGORY_LABELS[code] ?? code;

type RawParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() || undefined;

/** searchParams của Next → bộ lọc đã làm sạch (giá trị sai định dạng bị bỏ, để backend không phải trả 422 cho khách). */
export function readQuery(params: RawParams): SupplierQuery {
  const hs = first(params.hs);
  const country = first(params.country);
  const page = Number(first(params.page));
  const kind = first(params.kind);
  return {
    kind: kind === 'services' ? 'services' : undefined,
    service_category: first(params.service_category)?.slice(0, 32),
    q: first(params.q)?.slice(0, 100),
    hs: hs && /^[0-9. ]{2,12}$/.test(hs) ? hs : undefined,
    country: country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : undefined,
    category: first(params.category)?.slice(0, 32),
    cert: first(params.cert)?.slice(0, 64),
    page: Number.isInteger(page) && page >= 1 && page <= 1000 ? page : undefined,
  };
}

/** Chuỗi truy vấn cho liên kết phân trang / giữ bộ lọc. */
export function toSearch(query: SupplierQuery, overrides: Partial<SupplierQuery> = {}): string {
  const merged = { ...query, ...overrides };
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== '' && !(key === 'page' && value === 1)) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export async function fetchSuppliers(query: SupplierQuery): Promise<SupplierPage | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/public/suppliers', { params: { query } });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function fetchFilterOptions(): Promise<FilterOptions | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/public/suppliers/filters');
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

/** U10: "Dữ liệu đã kiểm" — chứng nhận còn hạn, ngày xác minh. null khi lỗi hoặc công ty không công khai. */
export async function fetchCredentials(slug: string): Promise<SupplierCredentials | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/public/suppliers/{slug}/credentials', { params: { path: { slug } } });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function fetchProfile(slug: string): Promise<PublicProfile | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/public/companies/{slug}', { params: { path: { slug } } });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export const industryLabel = (code: string | null | undefined) =>
  code ? (INDUSTRIES.find((i) => i.code === code)?.label ?? code) : null;
// Nhà xuất khẩu chủ yếu ở Việt Nam, nhưng danh sách quốc gia dùng chung chưa có nước này.
export const SUPPLIER_COUNTRIES = [{ code: 'VN', name: 'Vietnam' }, ...COUNTRIES];
export const countryName = (code: string) => SUPPLIER_COUNTRIES.find((c) => c.code === code)?.name ?? code;
