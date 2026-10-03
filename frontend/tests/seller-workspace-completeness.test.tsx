import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SellerWorkspace from '@/components/SellerWorkspace';
import { LanguageProvider } from '@/context/LanguageContext';
import type { DemoUser } from '@/lib/demoAuth';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const ACCOUNT: DemoUser = {
  id: 'u-1',
  name: 'Nguyễn A',
  email: 'a@congtya.vn',
  company: 'Công ty A',
  role: 'seller',
  onboardingCompleted: true,
  onboardingVersion: 2,
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const COMPANY = {
  id: 'c1', slug: 'cong-ty-a', type: 'exporter', legal_name: 'Công ty A', registration_number: null, tax_id: '0312345678',
  business_type: 'manufacturer', country: 'VN', industry_sector: 'agriculture', founded_year: 2015, address: null,
  website: null, contact_email: 'a@congtya.vn', description_vi: null, description_en: null, logo_key: null, export_markets: [],
  industry_other: null, phone: null, legal_rep_name: null, legal_rep_title: null, issuing_authority: null, offering_type: 'products',
  factory_address: null, capacity_value: null, capacity_unit: null, capacity_period: null, main_customers: null, location_public: false, facility_codes: [],
  languages_spoken: [], company_size: null, procurement_estimate: null, vat_number: null, eori_number: null, hide_profile_views: false, sourcing_categories: [],
  verification_status: 'unverified', verification_level: 'basic', verified_at: null, expires_at: null,
  profile_completeness_score: '40.00', created_at: '2026-09-29T00:00:00Z', updated_at: '2026-09-29T00:00:00Z',
};

function serve() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === '/api/me/company') return json(200, COMPANY);
      if (path === '/api/me/company/completeness') {
        return json(200, {
          score: '55.00',
          missing: [
            { field: 'description_en', group: 'intro', weight: '10.00' },
            { field: 'product_hs', group: 'products', weight: '10.00' },
          ],
        });
      }
      if (path === '/api/exporter/products') return json(200, []);
      throw new Error(`unexpected ${path}`);
    }),
  );
}

function renderWorkspace(tab: 'profile' | 'products' | 'overview', onNavigateOnboarding = vi.fn()) {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <SellerWorkspace
          account={ACCOUNT}
          initialTab={tab}
          onLogout={vi.fn()}
          onNavigateHome={vi.fn()}
          onNavigateOnboarding={onNavigateOnboarding}
        />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
  return { onNavigateOnboarding };
}

describe('SellerWorkspace — mức độ hoàn thiện hồ sơ (B3)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('tab Hồ sơ hiện phần trăm và việc cần bổ sung từ server', async () => {
    serve();
    renderWorkspace('profile');
    expect(await screen.findByText('55% hoàn thiện')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mô tả tiếng Anh (≥ 150 ký tự)' })).toBeInTheDocument();
  });

  it('bấm một việc còn thiếu mở form hồ sơ đúng bước (không truyền nhầm sự kiện chuột)', async () => {
    serve();
    const { onNavigateOnboarding } = renderWorkspace('profile');
    fireEvent.click(await screen.findByRole('button', { name: /Mô tả tiếng Anh/ }));
    fireEvent.click(screen.getByRole('button', { name: /Sản phẩm kèm mã HS/ }));
    expect(onNavigateOnboarding.mock.calls).toEqual([[1], [2]]);
  });

  it('nút "Thêm sản phẩm mới" mở hộp thoại ngay trong workspace, không đẩy về wizard (U3)', async () => {
    serve();
    const { onNavigateOnboarding } = renderWorkspace('products');
    fireEvent.click(await screen.findByRole('button', { name: /Thêm sản phẩm mới/ }));
    expect(await screen.findByRole('dialog', { name: 'Thêm sản phẩm' })).toBeInTheDocument();
    expect(onNavigateOnboarding).not.toHaveBeenCalled();
  });

  it('thẻ hoàn thiện chỉ nằm ở tab Hồ sơ', async () => {
    serve();
    renderWorkspace('overview');
    await screen.findByRole('button', { name: 'Tin nhắn' });
    expect(screen.queryByText(/% hoàn thiện/)).not.toBeInTheDocument();
  });
});
