import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SellerProfileRoute } from '@/components/routes/AccountRoutes';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => window.location.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function serve() {
  localStorage.setItem('vybe_profiles_v2', JSON.stringify({ 'u-1': { onboardingCompleted: true, onboardingVersion: 2 } }));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === '/api/me') return json(200, { id: 'u-1', email: 'a@x.vn', role: 'exporter', preferred_language: 'vi' });
      if (path === '/api/me/company') return json(404, {});
      if (path === '/api/exporter/products') return json(200, []);
      throw new Error(`unexpected ${path}`);
    }),
  );
}

function open(search: string) {
  window.history.replaceState(null, '', `/vi/exporter/profile${search}`);
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <SellerProfileRoute />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

describe('/exporter/profile mở đúng bước theo ?step= (link từ danh sách còn thiếu)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('?step=1 mở bước thông tin doanh nghiệp', async () => {
    serve();
    open('?step=1');
    expect(await screen.findByLabelText(/Mô tả doanh nghiệp \(tiếng Anh\)/)).toBeInTheDocument();
  });

  it('?step=2 mở bước sản phẩm', async () => {
    serve();
    open('?step=2');
    expect(await screen.findByRole('button', { name: /Thêm sản phẩm/ })).toBeInTheDocument();
  });

  it.each(['', '?step=9', '?step=abc', '?step=0', '?step=-1'])('giá trị %s không hợp lệ → bước mặc định (sản phẩm)', async (search) => {
    serve();
    open(search);
    expect(await screen.findByRole('button', { name: /Thêm sản phẩm/ })).toBeInTheDocument();
  });
});
