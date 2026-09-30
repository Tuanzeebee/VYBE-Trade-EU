import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  authorityDisplay,
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
  industry_other: null,
  phone: null,
  legal_rep_name: null,
  legal_rep_title: null,
  issuing_authority: null,
  offering_type: 'products',
  factory_address: null,
  capacity_value: null,
  capacity_unit: null,
  capacity_period: null,
  main_customers: null,
  location_public: false,
  facility_codes: [],
  company_size: null,
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
      industry_other: null,
      phone: null,
      legal_rep_name: null,
      legal_rep_title: null,
      issuing_authority: null,
      offering_type: 'products',
      factory_address: null,
      capacity_value: null,
      capacity_unit: null,
      capacity_period: null,
      company_size: null,
      main_customers: null,
      facility_codes: [],
      languages_spoken: ['vi', 'en'],
      export_markets: ['EU', 'DE'],
    });
  });

  it('U2: sản phẩm/dịch vụ, người đại diện, năng lực và mã cơ sở', () => {
    const body = profileToCompany({
      companyName: 'A',
      country: 'TH',
      offeringType: 'both',
      legalRepName: ' Nguyễn Văn Trí ',
      legalRepTitle: 'Giám đốc',
      phone: '+84 28 3829 9842',
      issuingAuthority: 'Sở Kế hoạch và Đầu tư TP. HCM',
      capacityValue: '1500,5',
      capacityUnit: 'tonne',
      capacityPeriod: 'month',
      staffSize: '51_200',
      growingAreaCodes: 'VN-DL-1, VN-DL-2; VN-DL-1',
      packingCodes: '',
      establishmentCodes: 'DL 123',
      industrySector: 'seafood',
      industryOther: 'bỏ vì không chọn Khác',
    });
    expect(body).toMatchObject({
      country: 'TH',
      offering_type: 'both',
      legal_rep_name: 'Nguyễn Văn Trí',
      issuing_authority: 'Sở Kế hoạch và Đầu tư TP. HCM',
      capacity_value: '1500.5',
      capacity_unit: 'tonne',
      capacity_period: 'month',
      company_size: '51_200',
      industry_other: null,
      facility_codes: [
        { code_type: 'growing_area', code: 'VN-DL-1' },
        { code_type: 'growing_area', code: 'VN-DL-2' },
        { code_type: 'establishment', code: 'DL 123' },
      ],
    });
  });

  it('U2: sản lượng không hợp lệ → không gửi cả đơn vị lẫn kỳ; ngành Khác giữ tên tự ghi', () => {
    const body = profileToCompany({ companyName: 'A', capacityValue: 'nhiều', industrySector: 'other', industryOther: 'Dược liệu' });
    expect([body.capacity_value, body.capacity_unit, body.capacity_period]).toEqual([null, null, null]);
    expect(body.industry_other).toBe('Dược liệu');
  });

  it('thị trường xuất khẩu lấy từ ô chọn cấp công ty (mã), bỏ mã lạ; không đọc thị trường cũ theo sản phẩm', () => {
    expect(profileToCompany({ companyName: 'A', markets: 'FR, XX1, US, ASEAN,,' }).export_markets).toEqual(['FR', 'US', 'ASEAN']);
    expect(profileToCompany({ companyName: 'A', market: 'Châu Âu (EU), Nhật Bản' }).export_markets).toEqual([]);
  });

  it('năm thành lập không phải số → null (server không nhận chuỗi)', () => {
    expect(profileToCompany({ companyName: 'A', establishedYear: 'khoảng 2010' }).founded_year).toBeNull();
  });
});

describe('companyToForm — trường U2', () => {
  it('đổi ngược mã cơ sở, năng lực và loại hình cung cấp', () => {
    const form = companyToForm({
      ...COMPANY,
      offering_type: 'services',
      country: 'TH',
      capacity_value: '1500.00',
      capacity_unit: 'kg',
      capacity_period: 'month',
      facility_codes: [
        { code_type: 'growing_area', code: 'A' },
        { code_type: 'growing_area', code: 'B' },
        { code_type: 'establishment', code: 'DL 1' },
      ],
    } as never);
    expect(form).toMatchObject({
      offeringType: 'services',
      country: 'TH',
      capacityValue: '1500.00',
      capacityUnit: 'kg',
      capacityPeriod: 'month',
      growingAreaCodes: 'A, B',
      packingCodes: '',
      establishmentCodes: 'DL 1',
    });
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

describe('EXPORT_MARKETS (U2: không giới hạn ở EU)', () => {
  it('gồm khối EU/ASEAN và các nước lớn ngoài EU, không trùng, không có Việt Nam, mã hợp lệ với backend', () => {
    const codes = EXPORT_MARKETS.map((m) => m.code);
    for (const code of ['EU', 'ASEAN', 'DE', 'US', 'JP', 'KR', 'CN', 'AU']) expect(codes).toContain(code);
    expect(codes).not.toContain('VN');
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.filter((c) => !/^(EU|ASEAN|[A-Z]{2})$/.test(c))).toEqual([]);
    expect(EXPORT_MARKETS.every((m) => m.label.trim() !== '')).toBe(true);
  });
});

describe('INDUSTRIES', () => {
  it('khớp bảng industries của backend, có "Khác"', () => {
    expect(INDUSTRIES.map((i) => i.code)).toEqual([
      'agriculture',
      'fruits_vegetables',
      'coffee_tea',
      'seafood',
      'food_beverage',
      'spices',
      'textiles',
      'handicrafts',
      'other',
    ]);
  });
});

describe('authorityDisplay — Sở KH&ĐT đã hợp nhất vào Sở Tài chính (01/03/2025)', () => {
  it.each([
    ['Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh', 'Sở Tài chính TP. Hồ Chí Minh', true],
    ['Sở Kế hoạch & Đầu tư Đà Nẵng', 'Sở Tài chính Đà Nẵng', true],
    ['Sở KH&ĐT Hà Nội', 'Sở Tài chính Hà Nội', true],
    ['Sở Tài chính Cần Thơ', 'Sở Tài chính Cần Thơ', false],
    ['Handelsregister Hamburg', 'Handelsregister Hamburg', false],
    ['', '', false],
  ])('%s → %s', (raw, text, renamed) => expect(authorityDisplay(raw)).toEqual({ text, renamed }));
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

  describe('thị trường xuất khẩu khi PATCH (dữ liệu cũ giữ nguyên)', () => {
    async function patchBody(loaded: string[], profileMarkets: string) {
      let sent: Record<string, unknown> | null = null;
      vi.stubGlobal(
        'fetch',
        vi.fn(async (req: Request) => {
          if (req.method === 'GET') return json(200, { ...COMPANY, export_markets: loaded });
          sent = (await req.json()) as Record<string, unknown>;
          return json(200, COMPANY);
        }),
      );
      await saveMyCompany(profileToCompany({ companyName: 'Công ty A', markets: profileMarkets }));
      return sent as Record<string, unknown> | null;
    }

    it('không đổi lựa chọn (chỉ có dòng cũ US/JP) → không gửi export_markets', async () => {
      const body = await patchBody(['US', 'JP'], 'US,JP');
      expect(body).not.toBeNull();
      expect(body).not.toHaveProperty('export_markets');
    });

    it('không đổi lựa chọn EU (kèm dòng cũ US) → không gửi export_markets', async () => {
      expect(await patchBody(['EU', 'DE', 'US'], 'EU,DE,US')).not.toHaveProperty('export_markets');
    });

    it('người dùng đổi lựa chọn → gửi đúng lựa chọn mới (mọi nước)', async () => {
      expect((await patchBody(['US'], 'US,FR'))?.export_markets).toEqual(['US', 'FR']);
    });

    it('bỏ hết thị trường EU đã chọn → gửi danh sách rỗng để xóa', async () => {
      expect((await patchBody(['EU', 'US'], ''))?.export_markets).toEqual([]);
    });

    it('tạo mới (POST) vẫn gửi export_markets', async () => {
      let sent: Record<string, unknown> | null = null;
      vi.stubGlobal(
        'fetch',
        vi.fn(async (req: Request) => {
          if (req.method === 'GET') return json(404, {});
          sent = (await req.json()) as Record<string, unknown>;
          return json(201, COMPANY);
        }),
      );
      await saveMyCompany(profileToCompany({ companyName: 'A', markets: 'FR' }));
      expect((sent as Record<string, unknown> | null)?.export_markets).toEqual(['FR']);
    });
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
