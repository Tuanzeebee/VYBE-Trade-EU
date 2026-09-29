// Hồ sơ doanh nghiệp trên server (B1). Chuyển qua lại giữa form onboarding cũ (chuỗi) và API.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type CompanyOut = components['schemas']['CompanyOut'];
export type CompanyIn = components['schemas']['CompanyIn'];
export type Industry = NonNullable<CompanyIn['industry_sector']>;
export type Completeness = components['schemas']['CompletenessOut'];

// Mô hình kinh doanh của exporter (B3): thông tin buyer EU quan tâm và liên quan tới quy tắc xuất xứ
// (trader khó chứng minh xuất xứ hơn nhà sản xuất). Mã khớp backend (completeness.BUSINESS_MODELS).
export const BUSINESS_MODELS: { code: 'manufacturer' | 'trader' | 'both'; label: string }[] = [
  { code: 'manufacturer', label: 'Nhà sản xuất' },
  { code: 'trader', label: 'Công ty thương mại' },
  { code: 'both', label: 'Vừa sản xuất vừa thương mại' },
];

const businessModel = (value: string | undefined) =>
  BUSINESS_MODELS.find((m) => m.code === value?.trim())?.code ?? null;

// Nhãn tiếng Việt lấy từ CATEGORIES cũ; mã khớp backend (schemas.Industry).
export const INDUSTRIES: { code: Industry; label: string }[] = [
  { code: 'agriculture', label: 'Nông sản' },
  { code: 'seafood', label: 'Thủy sản' },
  { code: 'food_beverage', label: 'Thực phẩm & Đồ uống' },
  { code: 'textiles', label: 'Dệt may' },
  { code: 'handicrafts', label: 'Thủ công mỹ nghệ' },
  { code: 'spices', label: 'Gia vị & Hương liệu' },
];

// Ngôn ngữ nhân viên sử dụng (ISO-639-1) — nhãn hiển thị qua tr().
export const STAFF_LANGUAGES: { code: string; label: string }[] = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'Tiếng Anh' },
  { code: 'zh', label: 'Tiếng Trung' },
  { code: 'ja', label: 'Tiếng Nhật' },
  { code: 'ko', label: 'Tiếng Hàn' },
  { code: 'fr', label: 'Tiếng Pháp' },
  { code: 'de', label: 'Tiếng Đức' },
];

const MARKET_NAMES: Record<string, string> = {
  'châu âu': 'EU',
  eu: 'EU',
  asean: 'ASEAN',
  'hoa kỳ': 'US',
  mỹ: 'US',
  'nhật bản': 'JP',
  'hàn quốc': 'KR',
  'trung quốc': 'CN',
  canada: 'CA',
  uae: 'AE',
  singapore: 'SG',
  úc: 'AU',
};

// Thị trường xuất khẩu đã phục vụ (cấp công ty). Mã lưu DB: ISO-2, EU hoặc ASEAN.
export const EXPORT_MARKETS: { code: string; label: string }[] = [
  { code: 'EU', label: 'Châu Âu (EU)' },
  { code: 'US', label: 'Hoa Kỳ' },
  { code: 'JP', label: 'Nhật Bản' },
  { code: 'KR', label: 'Hàn Quốc' },
  { code: 'CN', label: 'Trung Quốc' },
  { code: 'ASEAN', label: 'ASEAN' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Úc' },
  { code: 'GB', label: 'Anh (UK)' },
  { code: 'AE', label: 'UAE' },
];

/** Nhãn hoặc mã thị trường → mã lưu DB (ISO-2, EU, ASEAN). Không nhận ra → null. */
export function marketCode(label: string): string | null {
  if (/^(EU|ASEAN|[A-Z]{2})$/.test(label.trim())) return label.trim();
  const inParens = label.match(/\(([A-Z]{2}|EU|ASEAN)\)/);
  if (inParens) return inParens[1];
  return MARKET_NAMES[label.trim().toLowerCase()] ?? null;
}

const blank = (value: string | undefined) => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

/** Form onboarding cũ (mọi giá trị là chuỗi) → body CompanyIn. */
export function profileToCompany(profile: Record<string, string>): CompanyIn {
  const year = Number(profile.establishedYear);
  // Ô chọn thị trường cấp công ty (mã, ngăn cách bằng dấu phẩy); không đọc thị trường cũ theo từng sản phẩm.
  const markets = (profile.markets ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter((m) => /^(EU|ASEAN|[A-Z]{2})$/.test(m));
  const languages = (profile.languages ?? '').split(',').map((l) => l.trim()).filter(Boolean);
  const taxId = blank(profile.taxCode);
  return {
    legal_name: (profile.companyName ?? '').trim(),
    tax_id: taxId,
    // Ở Việt Nam mã số doanh nghiệp trên giấy ĐKKD trùng mã số thuế.
    registration_number: blank(profile.registrationNumber) ?? taxId,
    business_type: businessModel(profile.businessType),
    country: 'VN',
    founded_year: Number.isInteger(year) && profile.establishedYear?.trim() ? year : null,
    address: blank(profile.headquartersAddress),
    website: blank(profile.website),
    contact_email: blank(profile.contactEmail),
    description_vi: blank(profile.descriptionVi),
    description_en: blank(profile.descriptionEn),
    industry_sector: (blank(profile.industrySector) as Industry | null) ?? null,
    languages_spoken: [...new Set(languages)],
    export_markets: [...new Set(markets)],
  };
}

// ── Buyer (B2) ─────────────────────────────────────────────────────────────

// 27 nước EU cùng vài thị trường nhập khẩu lớn khác; mã ISO-2 lưu vào DB.
export const COUNTRIES: { code: string; name: string }[] = [
  { code: 'AT', name: 'Austria' }, { code: 'BE', name: 'Belgium' }, { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' }, { code: 'CY', name: 'Cyprus' }, { code: 'CZ', name: 'Czechia' },
  { code: 'DK', name: 'Denmark' }, { code: 'EE', name: 'Estonia' }, { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' }, { code: 'DE', name: 'Germany' }, { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' }, { code: 'IE', name: 'Ireland' }, { code: 'IT', name: 'Italy' },
  { code: 'LV', name: 'Latvia' }, { code: 'LT', name: 'Lithuania' }, { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' }, { code: 'NL', name: 'Netherlands' }, { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' }, { code: 'RO', name: 'Romania' }, { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' }, { code: 'ES', name: 'Spain' }, { code: 'SE', name: 'Sweden' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'CH', name: 'Switzerland' }, { code: 'NO', name: 'Norway' },
  { code: 'US', name: 'United States' }, { code: 'CA', name: 'Canada' }, { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' }, { code: 'KR', name: 'South Korea' }, { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
];

/** Tên nước (hoặc mã) → mã ISO-2. Không có trong danh sách → null. */
export function countryCode(nameOrCode: string): string | null {
  const value = nameOrCode.trim();
  const found = COUNTRIES.find((c) => c.code === value.toUpperCase() || c.name.toLowerCase() === value.toLowerCase());
  return found?.code ?? null;
}

export function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

// Nhãn giữ đúng chữ của form buyer cũ; mã khớp backend (schemas.CompanySize / ProcurementEstimate).
export const COMPANY_SIZES: { code: string; label: string }[] = [
  { code: '1_10', label: '1–10 nhân sự' },
  { code: '11_50', label: '11–50 nhân sự' },
  { code: '51_200', label: '51–200 nhân sự' },
  { code: '201_500', label: '201–500 nhân sự' },
  { code: 'gt_500', label: 'Trên 500 nhân sự' },
];

export const PROCUREMENT_ESTIMATES: { code: string; label: string }[] = [
  { code: 'lt_100k', label: 'Dưới 100.000 EUR/năm' },
  { code: '100k_500k', label: '100.000 – 500.000 EUR/năm' },
  { code: '500k_2m', label: '500.000 – 2 triệu EUR/năm' },
  { code: '2m_10m', label: '2 – 10 triệu EUR/năm' },
  { code: 'gt_10m', label: 'Trên 10 triệu EUR/năm' },
];

const codeOf = (table: { code: string; label: string }[], label: string | undefined) =>
  table.find((row) => row.label === label?.trim())?.code ?? null;
const labelOf = (table: { code: string; label: string }[], code: string | null | undefined) =>
  table.find((row) => row.code === code)?.label ?? '';

/** Form buyer cũ (chuỗi hiển thị) → CompanyIn. Chỉ gửi trường của buyer. */
export function buyerProfileToCompany(profile: Record<string, string>): CompanyIn {
  const country = countryCode(profile.country ?? '');
  if (!country) throw new Error('Vui lòng chọn quốc gia từ danh sách.');
  const categories = (profile.interest ?? '')
    .split(',')
    .map((label) => INDUSTRIES.find((i) => i.label === label.trim())?.code)
    .filter((code): code is Industry => code !== undefined);
  return {
    legal_name: (profile.companyName ?? '').trim(),
    country,
    company_size: codeOf(COMPANY_SIZES, profile.companySize) as CompanyIn['company_size'],
    business_type: blank(profile.businessType),
    website: blank(profile.website),
    contact_email: blank(profile.contactEmail),
    vat_number: blank(profile.vatNumber),
    eori_number: blank(profile.eoriNumber),
    procurement_estimate: codeOf(PROCUREMENT_ESTIMATES, profile.procurementEstimate) as CompanyIn['procurement_estimate'],
    sourcing_categories: [...new Set(categories)],
  };
}

function buyerToForm(company: CompanyOut): Record<string, string> {
  return {
    companyName: company.legal_name,
    country: countryName(company.country),
    companySize: labelOf(COMPANY_SIZES, company.company_size),
    businessType: company.business_type ?? '',
    website: company.website ?? '',
    contactEmail: company.contact_email ?? '',
    vatNumber: company.vat_number ?? '',
    eoriNumber: company.eori_number ?? '',
    procurementEstimate: labelOf(PROCUREMENT_ESTIMATES, company.procurement_estimate),
    interest: company.sourcing_categories.map((code) => INDUSTRIES.find((i) => i.code === code)?.label ?? code).join(', '),
  };
}

/** Dữ liệu server → giá trị ban đầu cho form cũ (trang sửa hồ sơ). */
export function companyToForm(company: CompanyOut): Record<string, string> {
  if (company.type === 'buyer') return buyerToForm(company);
  return {
    companyName: company.legal_name,
    taxCode: company.tax_id ?? '',
    registrationNumber: company.registration_number ?? '',
    // Dữ liệu cũ (TNHH…) không còn hợp lệ: hiện như chưa chọn để người dùng chọn lại.
    businessType: businessModel(company.business_type ?? undefined) ?? '',
    establishedYear: company.founded_year ? String(company.founded_year) : '',
    headquartersAddress: company.address ?? '',
    website: company.website ?? '',
    contactEmail: company.contact_email ?? '',
    descriptionVi: company.description_vi ?? '',
    descriptionEn: company.description_en ?? '',
    industrySector: company.industry_sector ?? '',
    languages: company.languages_spoken.join(','),
    markets: company.export_markets.join(','),
  };
}

const INVALID = 'Thông tin doanh nghiệp chưa hợp lệ. Vui lòng kiểm tra lại.';
const NETWORK = 'Không kết nối được máy chủ. Vui lòng thử lại.';

export async function getMyCompany(): Promise<CompanyOut | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/me/company');
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

/** Tạo hồ sơ nếu chưa có, ngược lại cập nhật. */
export async function saveMyCompany(body: CompanyIn): Promise<CompanyOut> {
  const api = createApiClient();
  let result: { data?: CompanyOut; response: Response };
  try {
    const existing = await api.GET('/api/me/company');
    result = existing.response.ok
      ? await api.PATCH('/api/me/company', { body })
      : await api.POST('/api/me/company', { body });
  } catch {
    throw new Error(NETWORK);
  }
  if (!result.response.ok || !result.data) throw new Error(INVALID);
  return result.data;
}

/** Điểm hoàn thiện hồ sơ và danh sách còn thiếu (B3). Chưa có hồ sơ hoặc lỗi → null. */
export async function getCompleteness(): Promise<Completeness | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/me/company/completeness');
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}
