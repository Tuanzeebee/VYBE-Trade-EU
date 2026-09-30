import { describe, expect, it } from 'vitest';
import {
  buyerProfileToCompany,
  COMPANY_SIZES,
  companyToForm,
  countryCode,
  countryName,
  COUNTRIES,
  PROCUREMENT_ESTIMATES,
  type CompanyOut,
} from '@/lib/companyApi';

const BUYER = {
  id: 'c-2',
  slug: 'global-foods',
  type: 'buyer',
  legal_name: 'Global Foods Trading GmbH',
  registration_number: null,
  tax_id: null,
  business_type: 'Nhà nhập khẩu',
  country: 'DE',
  industry_sector: null,
  founded_year: null,
  address: null,
  website: 'https://globalfoods.example.de',
  contact_email: 'sourcing@globalfoods.example.de',
  description_vi: null,
  description_en: null,
  logo_key: null,
  industry_other: null,
  phone: null,
  legal_rep_name: null,
  legal_rep_title: null,
  issuing_authority: null,
  offering_type: null,
  factory_address: null,
  capacity_value: null,
  capacity_unit: null,
  capacity_period: null,
  main_customers: null,
  location_public: false,
  facility_codes: [],
  export_markets: [],
  languages_spoken: [],
  company_size: '51_200',
  procurement_estimate: '500k_2m',
  vat_number: 'DE123456789',
  eori_number: 'DE123456789012',
  sourcing_categories: ['agriculture', 'spices'],
  verification_status: 'unverified',
  verification_level: 'basic',
  verified_at: null,
  expires_at: null,
  profile_completeness_score: '0.00',
  created_at: '2026-09-29T00:00:00Z',
  updated_at: '2026-09-29T00:00:00Z',
} as CompanyOut;

describe('COUNTRIES', () => {
  it('có đủ 27 nước EU cùng vài thị trường nhập khẩu lớn khác', () => {
    const codes = COUNTRIES.map((c) => c.code);
    for (const eu of ['DE', 'FR', 'NL', 'IT', 'ES', 'PL', 'CZ', 'IE', 'SE', 'BE']) expect(codes).toContain(eu);
    for (const other of ['US', 'GB', 'JP', 'KR', 'CA', 'AU', 'SG', 'AE']) expect(codes).toContain(other);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.filter((c) => c.length !== 2)).toEqual([]);
  });

  it('countryCode / countryName đổi qua lại; không nhận ra → null', () => {
    expect(countryCode('Germany')).toBe('DE');
    expect(countryCode('DE')).toBe('DE');
    expect(countryName('DE')).toBe('Germany');
    expect(countryCode('Atlantis')).toBeNull();
    expect(countryName('ZZ')).toBe('ZZ');
  });
});

describe('nhãn ↔ mã của quy mô và ước lượng mua hàng', () => {
  it('khớp các giá trị backend nhận', () => {
    expect(COMPANY_SIZES.map((s) => s.code)).toEqual(['1_10', '11_50', '51_200', '201_500', 'gt_500']);
    expect(PROCUREMENT_ESTIMATES.map((s) => s.code)).toEqual(['lt_100k', '100k_500k', '500k_2m', '2m_10m', 'gt_10m']);
  });

  it('nhãn quy mô giữ đúng chữ của form cũ', () => {
    expect(COMPANY_SIZES.map((s) => s.label)).toEqual([
      '1–10 nhân sự',
      '11–50 nhân sự',
      '51–200 nhân sự',
      '201–500 nhân sự',
      'Trên 500 nhân sự',
    ]);
  });
});

describe('buyerProfileToCompany — form buyer cũ → CompanyIn', () => {
  it('ánh xạ đủ trường buyer, nhóm hàng theo nhãn', () => {
    expect(
      buyerProfileToCompany({
        companyName: ' Global Foods Trading GmbH ',
        country: 'Germany',
        companySize: '51–200 nhân sự',
        businessType: 'Nhà nhập khẩu',
        website: 'https://globalfoods.example.de',
        contactEmail: 'sourcing@globalfoods.example.de',
        vatNumber: ' DE123456789 ',
        eoriNumber: ' DE123456789012 ',
        procurementEstimate: '500.000 – 2 triệu EUR/năm',
        interest: 'Nông sản, Gia vị & Hương liệu',
      }),
    ).toEqual({
      legal_name: 'Global Foods Trading GmbH',
      country: 'DE',
      company_size: '51_200',
      business_type: 'Nhà nhập khẩu',
      website: 'https://globalfoods.example.de',
      contact_email: 'sourcing@globalfoods.example.de',
      contact_name: null,
      city: null,
      phone: null,
      registration_number: null,
      vat_number: 'DE123456789',
      eori_number: 'DE123456789012',
      procurement_estimate: '500k_2m',
      sourcing_categories: ['agriculture', 'spices'],
    });
  });

  it('U5: người liên hệ, thành phố, điện thoại được gửi lên server', () => {
    const body = buyerProfileToCompany({ companyName: 'A', country: 'Germany', contactName: ' Anna ', city: 'Hamburg', phone: '+49 40 123' });
    expect([body.contact_name, body.city, body.phone]).toEqual(['Anna', 'Hamburg', '+49 40 123']);
  });

  it('bỏ ô trống, nhóm hàng lạ và trùng; không gửi trường của exporter', () => {
    const body = buyerProfileToCompany({
      companyName: 'A',
      country: 'France',
      companySize: '',
      vatNumber: '',
      procurementEstimate: '',
      interest: 'Thủy sản, Thủy sản, Không có nhóm này',
    });
    expect(body.company_size).toBeNull();
    expect(body.vat_number).toBeNull();
    expect(body.eori_number).toBeNull();
    expect(body.procurement_estimate).toBeNull();
    expect(body.sourcing_categories).toEqual(['seafood']);
    expect(body).not.toHaveProperty('export_markets');
    expect(body).not.toHaveProperty('languages_spoken');
  });

  it('quốc gia không nhận ra → ném lỗi tiếng Việt, không gửi lên server', () => {
    expect(() => buyerProfileToCompany({ companyName: 'A', country: 'Atlantis' })).toThrow(
      'Vui lòng chọn quốc gia từ danh sách.',
    );
  });
});

describe('companyToForm — hồ sơ buyer từ server → form cũ', () => {
  it('đổi mã thành nhãn hiển thị', () => {
    expect(companyToForm(BUYER)).toMatchObject({
      companyName: 'Global Foods Trading GmbH',
      country: 'Germany',
      companySize: '51–200 nhân sự',
      businessType: 'Nhà nhập khẩu',
      website: 'https://globalfoods.example.de',
      contactEmail: 'sourcing@globalfoods.example.de',
      vatNumber: 'DE123456789',
      eoriNumber: 'DE123456789012',
      procurementEstimate: '500.000 – 2 triệu EUR/năm',
      interest: 'Nông sản, Gia vị & Hương liệu',
    });
  });

  it('không lẫn trường của exporter', () => {
    expect(companyToForm(BUYER)).not.toHaveProperty('taxCode');
    expect(companyToForm(BUYER)).not.toHaveProperty('languages');
  });
});
