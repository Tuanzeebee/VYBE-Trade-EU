import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import OwnerChecks from '@/components/OwnerChecks';
import { AdminChecks } from '@/components/VerificationChecks';
import { LanguageProvider } from '@/context/LanguageContext';
import type { Check } from '@/lib/checksApi';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/admin',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const check = (code: string, status: Check['status'], over: Partial<Check> = {}): Check => ({
  check_code: code,
  status,
  detail: {},
  source: 'rule',
  manual: false,
  checked_at: '2026-10-03T09:00:00Z',
  ...over,
});

type Call = { method: string; path: string; body: unknown };
let calls: Call[] = [];
function serve(routes: (call: Call) => Response | undefined) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      const text = req.method === 'GET' ? '' : await req.text();
      const call = { method: req.method, path: url.pathname, body: text ? JSON.parse(text) : null };
      calls.push(call);
      return routes(call) ?? json(404, {});
    }),
  );
}

const wrap = (ui: React.ReactElement) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>{ui}</LanguageProvider>
    </NextIntlClientProvider>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('Kiểm tự động và kiểm tay (U21)', () => {
  it('seller thấy gợi ý: mail miễn phí cần xem thêm, website không truy cập được', async () => {
    const hint = { code: 'seafood_without_establishment', severity: 'warning', owner_visible: true, message_vi: 'Thủy sản vào EU phải từ cơ sở được EU cấp phép.', message_en: 'Seafood must come from an approved establishment.' };
    serve((call) => {
      if (call.path === '/api/me/verification-checks') return json(200, [check('email_free_mail', 'warning'), check('website_live', 'fail')]);
      if (call.path === '/api/exporter/consistency-hints') return json(200, [hint]);
      return undefined;
    });
    wrap(<OwnerChecks />);
    const section = await screen.findByRole('region', { name: 'Kiểm tự động hồ sơ' });
    expect(within(section).getByRole('listitem', { name: 'Email theo tên miền công ty (không phải mail miễn phí)' })).toHaveTextContent('Cần xem thêm');
    expect(within(section).getByRole('listitem', { name: 'Website truy cập được' })).toHaveTextContent('Không đạt');
    expect(await within(section).findByTestId('consistency-hints')).toHaveTextContent('Thủy sản vào EU phải từ cơ sở được EU cấp phép.');
  });

  it('admin ghi kết quả kiểm tay Cổng ĐKDN (bắt buộc ghi chú) và chạy lại kiểm tra', async () => {
    const changed = vi.fn();
    serve((call) => (call.method === 'POST' ? json(call.path.endsWith('/run') ? 202 : 201, {}) : undefined));
    wrap(<AdminChecks companyId="c-1" country="VN" checks={[check('vies_vat', 'unknown')]} onChanged={changed} />);
    const group = screen.getByRole('group', { name: 'Kiểm tự động và kiểm tay' });
    expect(within(group).getByRole('link', { name: 'Mở Cổng đăng ký doanh nghiệp' })).toHaveAttribute('href', 'https://dangkykinhdoanh.gov.vn');
    fireEvent.click(within(group).getByRole('button', { name: 'Lưu kết quả kiểm tay' }));
    expect(await within(group).findByRole('status')).toHaveTextContent('Vui lòng ghi chú kết quả đối chiếu.');
    fireEvent.change(within(group).getByLabelText('Ghi chú đối chiếu'), { target: { value: 'MST đang hoạt động' } });
    fireEvent.click(within(group).getByRole('button', { name: 'Lưu kết quả kiểm tay' }));
    expect(await within(group).findByText('Đã ghi kết quả kiểm tay.')).toBeInTheDocument();
    expect(calls[0]).toMatchObject({
      path: '/api/admin/companies/c-1/checks',
      body: { check_code: 'national_registry', status: 'pass', note: 'MST đang hoạt động', url: 'https://dangkykinhdoanh.gov.vn' },
    });
    expect(changed).toHaveBeenCalled();
    fireEvent.click(within(group).getByRole('button', { name: 'Chạy lại kiểm tra' }));
    expect(await within(group).findByText(/Đã xếp lịch kiểm lại/)).toBeInTheDocument();
    expect(calls.at(-1)?.path).toBe('/api/admin/companies/c-1/checks/run');
  });
});
