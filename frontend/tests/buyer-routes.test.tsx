import { render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingRoute } from '@/components/routes/AccountRoutes';
import { LanguageProvider } from '@/context/LanguageContext';

const replace = vi.fn();

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => window.location.pathname,
  useRouter: () => ({ push: vi.fn(), replace, prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
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

describe('route onboarding của buyer dùng dữ liệu server (B2)', () => {
  beforeEach(() => replace.mockClear());
  afterEach(() => vi.unstubAllGlobals());

  it('buyer đã có hồ sơ trên server (đổi máy) → không phải làm lại onboarding, chuyển về khu vực buyer', async () => {
    serve(BUYER);
    renderBuyerOnboarding();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/suppliers'));
    expect(screen.queryByDisplayValue('Global Foods Trading GmbH')).not.toBeInTheDocument();
  });

  it('lần đầu (chưa có hồ sơ): form trống, không gọi ghi dữ liệu', async () => {
    serve(null);
    renderBuyerOnboarding();
    await screen.findByDisplayValue('alex@globalfoods.de');
    expect(screen.queryByDisplayValue('Global Foods Trading GmbH')).not.toBeInTheDocument();
    expect(calls.filter((c) => c.method !== 'GET')).toEqual([]);
  });
});
