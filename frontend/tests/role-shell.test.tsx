import { render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BuyerShell } from '@/components/app-shell/BuyerShell';
import VerificationStatusCard from '@/components/VerificationStatusCard';
import type { CompanyOut } from '@/lib/companyApi';
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

function serve(opts: { role: 'buyer' | 'exporter' | null; company?: Record<string, unknown> | null }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === '/api/me') {
        return opts.role
          ? json(200, { id: 'u-1', email: 'alex@globalfoods.de', role: opts.role, preferred_language: 'vi' })
          : json(401, {});
      }
      if (path === '/api/me/company') return opts.company ? json(200, opts.company) : json(404, {});
      if (path === '/api/me/notifications/unread-count') return json(200, { count: 0 });
      return json(404, {});
    }),
  );
}

function renderShell(path: string) {
  window.history.replaceState(null, '', `/vi${path}`);
  return render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <BuyerShell>
          <p>nội dung trang</p>
        </BuyerShell>
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

describe('BuyerShell', () => {
  beforeEach(() => {
    replace.mockClear();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('buyer đã có hồ sơ: có menu riêng tới các mục buyer, đánh dấu mục đang mở', async () => {
    serve({ role: 'buyer', company: { id: 'c-2', legal_name: 'Global Foods GmbH' } });
    renderShell('/buyer/rfqs');
    expect(await screen.findByText('nội dung trang')).toBeInTheDocument();
    const nav = screen.getAllByRole('navigation', { name: 'Menu buyer' })[0];
    const hrefs = Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(
      expect.arrayContaining(['/vi/buyer', '/vi/suppliers', '/vi/buyer/rfqs', '/vi/buyer/messages', '/vi/buyer/notifications']),
    );
    expect(nav.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe('/vi/buyer/rfqs');
    expect(replace).not.toHaveBeenCalled();
  });

  it('buyer chưa có hồ sơ trên server → chuyển tới onboarding, không hiện nội dung', async () => {
    serve({ role: 'buyer', company: null });
    renderShell('/buyer');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/buyer/onboarding'));
    expect(screen.queryByText('nội dung trang')).not.toBeInTheDocument();
  });

  it('khách không thấy menu buyer (giữ khung công khai)', async () => {
    serve({ role: null });
    renderShell('/buyer');
    expect(await screen.findByText('nội dung trang')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Menu buyer' })).not.toBeInTheDocument();
  });
});

const company = (status: CompanyOut['verification_status']) =>
  ({ slug: 'cong-ty-b', verification_status: status, profile_completeness_score: '72.00' }) as CompanyOut;

function renderCard(status: CompanyOut['verification_status'], onNavigateTab = vi.fn()) {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <VerificationStatusCard company={company(status)} onNavigateTab={onNavigateTab} onEditProfile={vi.fn()} />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

describe('VerificationStatusCard', () => {
  it.each([
    ['unverified', 'Hồ sơ chưa được xác minh', 'Tiếp tục xác minh'],
    ['pending', 'Hồ sơ đang chờ duyệt', 'Xem tiến trình xác minh'],
    ['rejected', 'Yêu cầu xác minh chưa được chấp nhận', 'Xem lý do và gửi lại'],
  ] as const)('%s: hiện đúng thông điệp và đưa tới tab xác minh', (status, title, cta) => {
    const onNavigateTab = vi.fn();
    renderCard(status, onNavigateTab);
    expect(screen.getByText(title)).toBeInTheDocument();
    screen.getByRole('button', { name: cta }).click();
    expect(onNavigateTab).toHaveBeenCalledWith('verification');
  });

  it('verified: dẫn tới hồ sơ công khai, không còn nút gửi xác minh', () => {
    renderCard('verified');
    expect(screen.getByRole('link', { name: 'Xem hồ sơ công khai' }).getAttribute('href')).toBe('/vi/suppliers/cong-ty-b');
    expect(screen.queryByRole('button', { name: 'Tiếp tục xác minh' })).not.toBeInTheDocument();
  });

  it('hiện % hoàn thiện hồ sơ thật', () => {
    renderCard('unverified');
    expect(screen.getByText(/72%/)).toBeInTheDocument();
  });
});
