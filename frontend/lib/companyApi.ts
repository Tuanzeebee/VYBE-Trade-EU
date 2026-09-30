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
// Khớp bảng industries ở backend (migration 0030); luôn có "Khác" cho thứ nằm ngoài danh mục.
export const INDUSTRIES: { code: Industry; label: string }[] = [
  { code: 'agriculture', label: 'Nông sản' },
  { code: 'fruits_vegetables', label: 'Rau quả' },
  { code: 'coffee_tea', label: 'Cà phê & chè' },
  { code: 'seafood', label: 'Thủy sản' },
  { code: 'food_beverage', label: 'Thực phẩm & Đồ uống' },
  { code: 'spices', label: 'Gia vị & Hương liệu' },
  { code: 'textiles', label: 'Dệt may' },
  { code: 'handicrafts', label: 'Thủ công mỹ nghệ' },
  { code: 'other', label: 'Khác' },
];

// Seller cung cấp gì (U2) — hỏi ngay bước 1 để bước 2 hỏi đúng thứ cần hỏi.
export type OfferingType = 'products' | 'services' | 'both';
export const OFFERING_TYPES: { code: OfferingType; label: string; hint: string }[] = [
  { code: 'products', label: 'Sản phẩm', hint: 'Nông sản, thủy sản, thực phẩm, hàng hóa…' },
  { code: 'services', label: 'Dịch vụ', hint: 'Logistics, hải quan, kế toán-thuế, kiểm nghiệm…' },
  { code: 'both', label: 'Cả hai', hint: 'Vừa bán sản phẩm vừa cung cấp dịch vụ' },
];
export const offersProducts = (value: string | undefined) => value !== 'services';
export const offersServices = (value: string | undefined) => value === 'services' || value === 'both';

// Cơ quan cấp ĐKKD: từ 01/03/2025 Sở Kế hoạch và Đầu tư hợp nhất vào Sở Tài chính. Dữ liệu lưu đúng
// như in trên giấy tờ; chỉ phần hiển thị dùng tên hiện hành để khách không thấy tên cơ quan không còn.
const OLD_AUTHORITY = /S[ởo]\s*(K[ếe]\s*ho[ạa]ch\s*(v[àa]|&)\s*[ĐD][ầa]u\s*t[ưu]|KH\s*&\s*[ĐD]T|KH[ĐD]T)/i;
export function authorityDisplay(value: string | null | undefined): { text: string; renamed: boolean } {
  const raw = (value ?? '').trim();
  if (!raw) return { text: '', renamed: false };
  return OLD_AUTHORITY.test(raw) ? { text: raw.replace(OLD_AUTHORITY, 'Sở Tài chính'), renamed: true } : { text: raw, renamed: false };
}

export const FACILITY_CODE_TYPES = [
  { code: 'growing_area', label: 'Mã số vùng trồng', field: 'growingAreaCodes' },
  { code: 'packing_facility', label: 'Mã số cơ sở đóng gói', field: 'packingCodes' },
  { code: 'establishment', label: 'Mã cơ sở được EU cấp phép (thủy sản, thực phẩm)', field: 'establishmentCodes' },
] as const;

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

const splitCodes = (value: string | undefined) =>
  [...new Set((value ?? '').split(/[,;\n]/).map((c) => c.trim()).filter(Boolean))];

function facilityCodes(profile: Record<string, string>): NonNullable<CompanyIn['facility_codes']> {
  return FACILITY_CODE_TYPES.flatMap((type) => splitCodes(profile[type.field]).map((code) => ({ code_type: type.code, code })));
}

const decimalOrNull = (value: string | undefined) => {
  const text = (value ?? '').trim().replace(',', '.');
  return /^\d+(\.\d{1,2})?$/.test(text) && Number(text) > 0 ? text : null;
};

/** Form onboarding cũ (mọi giá trị là chuỗi) → body CompanyIn. */
export function profileToCompany(profile: Record<string, string>): CompanyIn {
  const year = Number(profile.establishedYear);
  // Ô chọn thị trường cấp công ty (mã, ngăn cách bằng dấu phẩy); không đọc thị trường cũ theo từng sản phẩm.
  const markets = (profile.markets ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter((m) => EXPORT_MARKETS.some((x) => x.code === m));
  const languages = (profile.languages ?? '').split(',').map((l) => l.trim()).filter(Boolean);
  const taxId = blank(profile.taxCode);
  return {
    legal_name: (profile.companyName ?? '').trim(),
    tax_id: taxId,
    // Ở Việt Nam mã số doanh nghiệp trên giấy ĐKKD trùng mã số thuế.
    registration_number: blank(profile.registrationNumber) ?? taxId,
    business_type: businessModel(profile.businessType),
    country: countryCode(profile.country ?? '') ?? 'VN',
    founded_year: Number.isInteger(year) && profile.establishedYear?.trim() ? year : null,
    address: blank(profile.headquartersAddress),
    website: blank(profile.website),
    contact_email: blank(profile.contactEmail),
    phone: blank(profile.phone),
    legal_rep_name: blank(profile.legalRepName),
    legal_rep_title: blank(profile.legalRepTitle),
    issuing_authority: blank(profile.issuingAuthority),
    description_vi: blank(profile.descriptionVi),
    description_en: blank(profile.descriptionEn),
    industry_sector: (blank(profile.industrySector) as Industry | null) ?? null,
    industry_other: profile.industrySector === 'other' ? blank(profile.industryOther) : null,
    offering_type: (['products', 'services', 'both'].includes(profile.offeringType ?? '') ? profile.offeringType : 'products') as OfferingType,
    factory_address: blank(profile.factoryAddress),
    capacity_value: decimalOrNull(profile.capacityValue),
    capacity_unit: decimalOrNull(profile.capacityValue) ? ((blank(profile.capacityUnit) ?? 'tonne') as NonNullable<CompanyIn['capacity_unit']>) : null,
    capacity_period: decimalOrNull(profile.capacityValue) ? ((profile.capacityPeriod === 'month' ? 'month' : 'year') as 'month' | 'year') : null,
    company_size: (blank(profile.staffSize) as CompanyIn['company_size']) ?? null,
    main_customers: blank(profile.mainCustomers),
    facility_codes: facilityCodes(profile),
    languages_spoken: [...new Set(languages)],
    export_markets: [...new Set(markets)],
    // Chỉ gửi khi đã có khóa để PATCH không xóa logo cũ.
    ...(blank(profile.logoKey) ? { logo_key: blank(profile.logoKey) } : {}),
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
  { code: 'AE', name: 'United Arab Emirates' }, { code: 'CN', name: 'China' }, { code: 'TW', name: 'Taiwan' },
  { code: 'HK', name: 'Hong Kong' }, { code: 'IN', name: 'India' }, { code: 'TH', name: 'Thailand' },
  { code: 'ID', name: 'Indonesia' }, { code: 'MY', name: 'Malaysia' }, { code: 'PH', name: 'Philippines' },
  { code: 'KH', name: 'Cambodia' }, { code: 'LA', name: 'Laos' }, { code: 'NZ', name: 'New Zealand' },
  { code: 'MX', name: 'Mexico' }, { code: 'SA', name: 'Saudi Arabia' }, { code: 'VN', name: 'Việt Nam' },
];

const EU_CODES = 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' ');

// Thị trường xuất khẩu đã phục vụ (cấp công ty, U2): khối EU / ASEAN hoặc từng nước — không giới hạn ở EU.
export const EXPORT_MARKETS: { code: string; label: string }[] = [
  { code: 'EU', label: 'Châu Âu (EU)' },
  { code: 'ASEAN', label: 'ASEAN' },
  ...COUNTRIES.filter((c) => c.code !== 'VN').map((c) => ({ code: c.code, label: c.name })),
];
export const isEuCountry = (code: string) => EU_CODES.includes(code);

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
    // U5: người liên hệ, thành phố, điện thoại lưu server (trước đây chỉ trong trình duyệt).
    contact_name: blank(profile.contactName),
    city: blank(profile.city) ?? blank(profile.region),
    phone: blank(profile.phone),
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
    contactName: company.contact_name ?? '',
    city: company.city ?? '',
    phone: company.phone ?? '',
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
    industryOther: company.industry_other ?? '',
    country: company.country,
    phone: company.phone ?? '',
    legalRepName: company.legal_rep_name ?? '',
    legalRepTitle: company.legal_rep_title ?? '',
    issuingAuthority: company.issuing_authority ?? '',
    offeringType: company.offering_type ?? 'products',
    factoryAddress: company.factory_address ?? '',
    capacityValue: company.capacity_value ?? '',
    capacityUnit: company.capacity_unit ?? 'tonne',
    capacityPeriod: company.capacity_period ?? 'year',
    staffSize: company.company_size ?? '',
    mainCustomers: company.main_customers ?? '',
    ...Object.fromEntries(
      FACILITY_CODE_TYPES.map((type) => [
        type.field,
        (company.facility_codes ?? []).filter((c) => c.code_type === type.code).map((c) => c.code).join(', '),
      ]),
    ),
    languages: company.languages_spoken.join(','),
    markets: company.export_markets.join(','),
    logoKey: company.logo_key ?? '',
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

/**
 * Body PATCH: bỏ export_markets khi người dùng không đổi lựa chọn thị trường, để mã cũ không có trong
 * danh sách của form được giữ nguyên. So lựa chọn với phần dữ liệu đã tải mà form hiển thị được.
 */
function withoutUnchangedMarkets(body: CompanyIn, loaded: CompanyOut): CompanyIn {
  if (body.export_markets === undefined || loaded.type !== 'exporter') return body;
  const shown = new Set(loaded.export_markets.filter((m) => EXPORT_MARKETS.some((x) => x.code === m)));
  const chosen = new Set(body.export_markets);
  const unchanged = shown.size === chosen.size && [...chosen].every((m) => shown.has(m));
  if (!unchanged) return body;
  const { export_markets: _kept, ...rest } = body;
  return rest;
}

/** Tạo hồ sơ nếu chưa có, ngược lại cập nhật. */
export async function saveMyCompany(body: CompanyIn): Promise<CompanyOut> {
  const api = createApiClient();
  let result: { data?: CompanyOut; response: Response };
  try {
    const existing = await api.GET('/api/me/company');
    result =
      existing.response.ok && existing.data
        ? await api.PATCH('/api/me/company', { body: withoutUnchangedMarkets(body, existing.data) })
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

export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** Kiểm tra file logo ở trình duyệt; trả thông báo lỗi hoặc null nếu hợp lệ. */
export function logoFileError(file: File): string | null {
  if (!LOGO_TYPES.includes(file.type)) return 'Logo phải là PNG, JPEG hoặc WebP.';
  if (file.size > MAX_LOGO_BYTES) return 'Logo tối đa 2MB.';
  return null;
}

/** Tải logo lên kho qua URL ký sẵn (cần công ty đã lưu). Trả khóa để ghi vào hồ sơ. */
export async function uploadCompanyLogo(file: File): Promise<string> {
  const failed = new Error('Không tải được logo lên. Vui lòng thử lại.');
  const invalid = logoFileError(file);
  if (invalid) throw new Error(invalid);
  try {
    const { data, response } = await createApiClient().POST('/api/uploads/presign', {
      body: { purpose: 'logo', content_type: file.type as 'image/png' | 'image/jpeg' | 'image/webp' },
    });
    if (!response.ok || !data) throw failed;
    const put = await fetch(new Request(data.upload_url, { method: 'PUT', headers: { 'content-type': file.type }, body: file }));
    if (!put.ok) throw failed;
    return data.key;
  } catch {
    throw failed;
  }
}
