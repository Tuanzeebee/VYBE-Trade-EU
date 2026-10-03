import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingRoute } from '@/components/routes/OnboardingRoute';
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
      const body = req.method === 'GET' ? null : await req.clone().json().catch(() => null);
      calls.push({ method: req.method, path, body });
      if (path === '/api/me') return json(200, ME);
      if (path === '/api/me/company') {
        if (req.method === 'GET') return company ? json(200, company) : json(404, {});
        return json(req.method === 'POST' ? 201 : 200, { ...BUYER, ...(body as object) });
      }
      if (path === '/api/buyer/sourcing-needs') return json(200, { ...(body as object), budget_currency: 'EUR', certifications_wanted: [] });
      if (path === '/api/buyer/verification-requests') return json(201, { id: 'r-1', status: 'pending', created_at: '2026-10-05T00:00:00Z' });
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

  const submitStep = () => fireEvent.submit(screen.getByRole('button', { name: /Tiếp tục|Hoàn tất/ }).closest('form') as HTMLFormElement);

  async function fillAndFinish(opts: { identifier: Record<string, string> }) {
    renderBuyerOnboarding();
    fireEvent.change(await screen.findByLabelText(/Tên công ty/), { target: { value: 'Global Foods GmbH' } });
    fireEvent.change(screen.getByRole('combobox', { name: /Quốc gia/ }), { target: { value: 'Germany' } });
    fireEvent.change(screen.getByLabelText(/Thành phố/), { target: { value: 'Hamburg' } });
    submitStep();
    await screen.findByText('Bước 2 / 4');
    for (const [label, value] of Object.entries(opts.identifier)) {
      fireEvent.change(screen.getByLabelText(new RegExp(label)), { target: { value } });
    }
    submitStep();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Thủy sản' }));
    submitStep();
    await screen.findByTestId('buyer-review');
    submitStep();
  }

  it('hoàn tất 4 bước có mã định danh: lưu công ty (kèm VAT, LEI, địa chỉ), nhu cầu, rồi tự gửi yêu cầu xác minh', async () => {
    serve(null);
    await fillAndFinish({ identifier: { 'Mã số VAT': 'DE123456789', 'Mã LEI': '5493001kjtiigc8y1r12', 'Địa chỉ đăng ký': 'Hafenstraße 12, Hamburg' } });
    await waitFor(() => expect(calls.some((c) => c.path === '/api/buyer/verification-requests')).toBe(true));
    const company = calls.find((c) => c.method === 'POST' && c.path === '/api/me/company');
    expect(company?.body).toMatchObject({
      legal_name: 'Global Foods GmbH',
      vat_number: 'DE123456789',
      lei_code: '5493001KJTIIGC8Y1R12',
      address: 'Hafenstraße 12, Hamburg',
      sourcing_categories: ['seafood'],
    });
    expect(calls.some((c) => c.method === 'PUT' && c.path === '/api/buyer/sourcing-needs')).toBe(true);
  });

  it('chỉ khai LEI cũng đủ để tự gửi yêu cầu xác minh', async () => {
    serve(null);
    await fillAndFinish({ identifier: { 'Mã LEI': '5493001KJTIIGC8Y1R12' } });
    await waitFor(() => expect(calls.some((c) => c.path === '/api/buyer/verification-requests')).toBe(true));
  });

  it('không khai mã định danh thì không gọi API xác minh (xác minh buyer là tuỳ chọn)', async () => {
    serve(null);
    await fillAndFinish({ identifier: {} });
    await waitFor(() => expect(calls.some((c) => c.path === '/api/buyer/sourcing-needs')).toBe(true));
    expect(calls.some((c) => c.path === '/api/buyer/verification-requests')).toBe(false);
  });

  it('chỉ khai cơ quan và địa chỉ đăng ký (không có mã) thì không tự gửi xác minh', async () => {
    serve(null);
    await fillAndFinish({ identifier: { 'Cơ quan đăng ký': 'Handelsregister Hamburg' } });
    await waitFor(() => expect(calls.some((c) => c.path === '/api/buyer/sourcing-needs')).toBe(true));
    expect(calls.some((c) => c.path === '/api/buyer/verification-requests')).toBe(false);
  });
});
