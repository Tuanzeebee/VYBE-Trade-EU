import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BUSINESS_MODELS,
  companyToForm,
  EXPORT_MARKETS,
  getMyCompany,
  INDUSTRIES,
  marketCode,
  profileToCompany,
  saveMyCompany,
} from '@/lib/companyApi';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const COMPANY = {
  id: 'c-1',
  slug: 'cong-ty-a',
  type: 'exporter',
  legal_name: 'Công ty A',
  registration_number: '0312345678',
  tax_id: '0312345678',
  business_type: 'TNHH',
  country: 'VN',
  industry_sector: 'agriculture',
  founded_year: 2018,
  address: 'HCM',
  website: 'https://a.vn',
  contact_email: 'a@a.vn',
  description_vi: 'Gạo',
  description_en: 'Rice',
  logo_key: null,
  export_markets: ['EU', 'DE'],
  languages_spoken: ['en', 'vi'],
  verification_status: 'unverified',
  verification_level: 'basic',
  verified_at: null,
  expires_at: null,
  profile_completeness_score: '0.00',
  created_at: '2026-09-29T00:00:00Z',
  updated_at: '2026-09-29T00:00:00Z',
};

describe('marketCode — nhãn thị trường cũ → mã lưu DB', () => {
  it.each([
    ['Châu Âu (EU)', 'EU'],
    ['EU', 'EU'],
    ['Hoa Kỳ (US)', 'US'],
    ['Hoa Kỳ', 'US'],
    ['Nhật Bản', 'JP'],
    ['Hàn Quốc (KR)', 'KR'],
    ['ASEAN', 'ASEAN'],
    ['US', 'US'],
    ['JP', 'JP'],
    ['Canada', 'CA'],
    ['Trung Đông', null],
  ])('%s → %s', (label, code) => expect(marketCode(label)).toBe(code));
});

describe('profileToCompany — form onboarding cũ → CompanyIn', () => {
  it('ánh xạ đủ trường, bỏ ô trống, thị trường lấy từ sản phẩm', () => {
    const body = profileToCompany({
      companyName: '  Công ty A ',
      taxCode: '0312345678',
      registrationNumber: '',
      businessType: 'manufacturer',
      establishedYear: '2018',
      headquartersAddress: 'HCM',
      website: 'https://a.vn',
      contactEmail: 'a@a.vn',
      descriptionVi: 'Gạo',
      descriptionEn: '',
      industrySector: 'agriculture',
      languages: 'vi,en',
      markets: 'EU,DE,EU',
    });
    expect(body).toEqual({
      legal_name: 'Công ty A',
      tax_id: '0312345678',
      registration_number: '0312345678',
      business_type: 'manufacturer',
      country: 'VN',
      founded_year: 2018,
      address: 'HCM',
      website: 'https://a.vn',
      contact_email: 'a@a.vn',
      description_vi: 'Gạo',
      description_en: null,
      industry_sector: 'agriculture',
      languages_spoken: ['vi', 'en'],
      export_markets: ['EU', 'DE'],
    });
  });

  it('thị trường xuất khẩu lấy từ ô chọn cấp công ty (mã), bỏ mã lạ; không đọc thị trường cũ theo sản phẩm', () => {
    expect(profileToCompany({ companyName: 'A', markets: 'FR, XX1, US, ASEAN,,' }).export_markets).toEqual(['FR']);
    expect(profileToCompany({ companyName: 'A', market: 'Châu Âu (EU), Nhật Bản' }).export_markets).toEqual([]);
  });

  it('năm thành lập không phải số → null (server không nhận chuỗi)', () => {
    expect(profileToCompany({ companyName: 'A', establishedYear: 'khoảng 2010' }).founded_year).toBeNull();
  });
});

describe('companyToForm — dữ liệu server → giá trị ban đầu của form cũ', () => {
  it('đổi ngược tên trường, danh sách thành chuỗi', () => {
    expect(companyToForm(COMPANY as never)).toMatchObject({
      companyName: 'Công ty A',
      taxCode: '0312345678',
      establishedYear: '2018',
      headquartersAddress: 'HCM',
      descriptionVi: 'Gạo',
      descriptionEn: 'Rice',
      industrySector: 'agriculture',
      languages: 'en,vi',
      markets: 'EU,DE',
    });
  });
});

describe('EXPORT_MARKETS', () => {
  it('chỉ gồm EU và 27 nước thành viên EU, không trùng, mã hợp lệ với backend', () => {
    const codes = EXPORT_MARKETS.map((m) => m.code);
    expect(codes).toContain('EU');
    expect(codes).toHaveLength(28);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).not.toContain('US');
    expect(codes).not.toContain('JP');
    expect(codes.filter((c) => !/^(EU|[A-Z]{2})$/.test(c))).toEqual([]);
    expect(EXPORT_MARKETS.every((m) => m.label.trim() !== '')).toBe(true);
  });
});

describe('INDUSTRIES', () => {
  it('khớp 6 nhóm ngành backend nhận', () => {
    expect(INDUSTRIES.map((i) => i.code)).toEqual([
      'agriculture',
      'seafood',
      'food_beverage',
      'textiles',
      'handicrafts',
      'spices',
    ]);
  });
});

describe('saveMyCompany', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('chưa có công ty (404) → POST tạo mới', async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (req: Request) => {
        seen.push(`${req.method} ${new URL(req.url).pathname}`);
        return req.method === 'GET' ? json(404, { error: { code: 'company_not_found' } }) : json(201, COMPANY);
      }),
    );
    const saved = await saveMyCompany({ legal_name: 'Công ty A' });
    expect(seen).toEqual(['GET /api/me/company', 'POST /api/me/company']);
    expect(saved.id).toBe('c-1');
  });

  it('đã có công ty → PATCH', async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (req: Request) => {
        seen.push(req.method);
        return json(200, COMPANY);
      }),
    );
    await saveMyCompany({ legal_name: 'Công ty A' });
    expect(seen).toEqual(['GET', 'PATCH']);
  });

  it('server từ chối dữ liệu (422) → lỗi tiếng Việt để hiện trên form', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (req: Request) => (req.method === 'GET' ? json(404, {}) : json(422, { detail: [] }))),
    );
    await expect(saveMyCompany({ legal_name: 'A' })).rejects.toThrow(
      'Thông tin doanh nghiệp chưa hợp lệ. Vui lòng kiểm tra lại.',
    );
  });

  it('getMyCompany: 404 → null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(404, {})));
    expect(await getMyCompany()).toBeNull();
  });
});

describe('BUSINESS_MODELS (B3)', () => {
  it('khớp ba giá trị backend nhận: sản xuất, thương mại, cả hai', () => {
    expect(BUSINESS_MODELS.map((m) => m.code)).toEqual(['manufacturer', 'trader', 'both']);
    expect(BUSINESS_MODELS.every((m) => m.label.trim() !== '')).toBe(true);
  });

  it('profileToCompany: chỉ nhận mã hợp lệ, hình thức pháp lý cũ (TNHH…) không gửi lên', () => {
    expect(profileToCompany({ companyName: 'A', businessType: 'trader' }).business_type).toBe('trader');
    expect(profileToCompany({ companyName: 'A', businessType: 'TNHH' }).business_type).toBeNull();
    expect(profileToCompany({ companyName: 'A', businessType: '' }).business_type).toBeNull();
  });

  it('companyToForm: dữ liệu cũ (TNHH) hiện như chưa chọn để người dùng chọn lại', () => {
    expect(companyToForm({ ...COMPANY, business_type: 'both' } as never).businessType).toBe('both');
    expect(companyToForm({ ...COMPANY, business_type: 'TNHH' } as never).businessType).toBe('');
  });
});
