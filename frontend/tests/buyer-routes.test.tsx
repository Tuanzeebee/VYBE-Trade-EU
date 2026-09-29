import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OnboardingRoute } from '@/components/routes/AccountRoutes';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => window.location.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const ME = { id: 'u-2', email: 'alex@globalfoods.de', role: 'buyer', preferred_language: 'vi' };

const BUYER = {
  id: 'c-2',
  type: 'buyer',
  legal_name: 'Global Foods Trading GmbH',
  country: 'DE',
  company_size: '51_200',
  business_type: 'Nhà nhập khẩu',
  website: null,
  contact_email: 'alex@globalfoods.de',
  vat_number: 'DE123456789',
  procurement_estimate: '500k_2m',
  sourcing_categories: ['agriculture', 'spices'],
  export_markets: [],
  languages_spoken: [],
};

let calls: { method: string; path: string; body: unknown }[] = [];

function serve(company: Record<string, unknown> | null) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      const body = req.method === 'GET' ? null : await req.clone().json();
      calls.push({ method: req.method, path, body });
      if (path === '/api/me') return json(200, ME);
      if (path === '/api/me/company') {
        if (req.method === 'GET') return company ? json(200, company) : json(404, {});
        return json(req.method === 'POST' ? 201 : 200, { ...BUYER, ...(body as object) });
      }
      throw new Error(`unexpected ${path}`);
    }),
  );
}

function renderBuyerOnboarding() {
  window.history.replaceState(null, '', '/vi/buyer/onboarding');
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <OnboardingRoute />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

const next = () => fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/ }));

describe('route onboarding của buyer dùng dữ liệu server (B2)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('nạp hồ sơ buyer đã lưu vào form', async () => {
    serve(BUYER);
    renderBuyerOnboarding();
    expect(await screen.findByDisplayValue('Global Foods Trading GmbH')).toBeInTheDocument();
    expect(screen.getByDisplayValue('DE123456789')).toBeInTheDocument();
    expect((screen.getByRole('combobox', { name: /Quốc gia/ }) as HTMLSelectElement).value).toBe('Germany');
  });

  it('lần đầu (chưa có hồ sơ): form trống, không gọi ghi dữ liệu', async () => {
    serve(null);
    renderBuyerOnboarding();
    await screen.findByDisplayValue('alex@globalfoods.de');
    expect(screen.queryByDisplayValue('Global Foods Trading GmbH')).not.toBeInTheDocument();
    expect(calls.filter((c) => c.method !== 'GET')).toEqual([]);
  });

  it('hoàn tất onboarding: lưu hồ sơ buyer lên server (PATCH vì đã có), gửi nhóm hàng theo mã', async () => {
    serve(BUYER);
    renderBuyerOnboarding();
    await screen.findByDisplayValue('Global Foods Trading GmbH');
    fireEvent.change(screen.getByRole('combobox', { name: /Khu vực/ }), { target: { value: 'Châu Âu' } });
    next(); // → bước 2 (nhóm hàng đã có từ server)
    fireEvent.change(screen.getByLabelText(/Khối lượng dự kiến/), { target: { value: '20' } });
    fireEvent.change(screen.getByRole('combobox', { name: /Tần suất/ }), { target: { value: 'Hàng quý' } });
    next(); // → bước 3
    next(); // → bước 4
    fireEvent.click(screen.getByRole('checkbox', { name: /Tôi xác nhận/ }));
    fireEvent.click(screen.getByRole('button', { name: /Hoàn tất/ }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    const saved = calls.find((c) => c.method === 'PATCH')!;
    expect(saved.path).toBe('/api/me/company');
    expect(saved.body).toMatchObject({
      legal_name: 'Global Foods Trading GmbH',
      country: 'DE',
      company_size: '51_200',
      vat_number: 'DE123456789',
      procurement_estimate: '500k_2m',
      sourcing_categories: ['agriculture', 'spices'],
    });
    expect(saved.body).not.toHaveProperty('export_markets');
  });
});
