// Hồ sơ doanh nghiệp trên server (B1). Chuyển qua lại giữa form onboarding cũ (chuỗi) và API.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type CompanyOut = components['schemas']['CompanyOut'];
export type CompanyIn = components['schemas']['CompanyIn'];
export type Industry = NonNullable<CompanyIn['industry_sector']>;

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

/** Nhãn thị trường của giao diện cũ → mã lưu DB (ISO-2, EU, ASEAN). Không nhận ra → null. */
export function marketCode(label: string): string | null {
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
  const markets = (profile.market ?? '')
    .split(',')
    .map((m) => marketCode(m))
    .filter((m): m is string => m !== null);
  const languages = (profile.languages ?? '').split(',').map((l) => l.trim()).filter(Boolean);
  const taxId = blank(profile.taxCode);
  return {
    legal_name: (profile.companyName ?? '').trim(),
    tax_id: taxId,
    // Ở Việt Nam mã số doanh nghiệp trên giấy ĐKKD trùng mã số thuế.
    registration_number: blank(profile.registrationNumber) ?? taxId,
    business_type: blank(profile.businessType),
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

/** Dữ liệu server → giá trị ban đầu cho form cũ (trang sửa hồ sơ). */
export function companyToForm(company: CompanyOut): Record<string, string> {
  return {
    companyName: company.legal_name,
    taxCode: company.tax_id ?? '',
    registrationNumber: company.registration_number ?? '',
    businessType: company.business_type ?? '',
    establishedYear: company.founded_year ? String(company.founded_year) : '',
    headquartersAddress: company.address ?? '',
    website: company.website ?? '',
    contactEmail: company.contact_email ?? '',
    descriptionVi: company.description_vi ?? '',
    descriptionEn: company.description_en ?? '',
    industrySector: company.industry_sector ?? '',
    languages: company.languages_spoken.join(','),
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
