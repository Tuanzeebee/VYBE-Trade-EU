import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminBilling from '@/components/AdminBilling';
import PricingPlans from '@/components/PricingPlans';
import ProfileViewers from '@/components/ProfileViewers';
import SellerBilling from '@/components/SellerBilling';
import { LanguageProvider } from '@/context/LanguageContext';
import { translateText } from '@/i18n/translate';
import { formatMoney } from '@/lib/billingApi';
import type { DemoUser } from '@/lib/demoAuth';

const push = vi.fn();
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/pricing',
  useSearchParams: () => new URLSearchParams('order=o-1'),
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const ITEMS = [
  { code: 'verification_enhanced', name_vi: 'Duyệt xác minh Nâng cao', name_en: 'Enhanced verification review', description_vi: 'Đối chiếu chứng nhận.', description_en: 'Certificates checked.', audience: 'exporter', feature: 'verification_enhanced_review', price: '2000000.00', currency: 'VND', duration_days: 365, price_is_placeholder: true },
  { code: 'gtm_report_full', name_vi: 'Báo cáo go-to-market đầy đủ', name_en: 'Full go-to-market report', description_vi: 'Mọi phần và PDF.', description_en: 'All sections and PDF.', audience: 'exporter', feature: 'gtm_report_full', price: '1500000.00', currency: 'VND', duration_days: 90, price_is_placeholder: false },
];

const ORDER = {
  id: 'o-1',
  item_code: 'gtm_report_full',
  item_name_vi: 'Báo cáo go-to-market đầy đủ',
  item_name_en: 'Full go-to-market report',
  feature: 'gtm_report_full',
  amount: '1500000.00',
  currency: 'VND',
  reference: 'VYBE7K2M9Q',
  status: 'pending',
  invoice_info: { company_name: 'Công ty TNHH Nông Sản Việt', tax_code: '0314892345' },
  created_at: '2026-10-02T08:00:00Z',
  paid_at: null,
  cancelled_at: null,
  bank_transfer: { bank_name: 'Ngân hàng minh hoạ (chờ PO cung cấp)', account_name: 'VYBE TRADE (DEMO)', account_number: '0000000000', iban: null, swift: null, transfer_note: 'VYBE7K2M9Q', is_demo_account: true },
};

type Call = { method: string; path: string; body: unknown };
let calls: Call[] = [];
function serve(routes: (call: Call) => Response | undefined) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      const text = req.method === 'GET' ? '' : await req.text();
      const call = { method: req.method, path: url.pathname + url.search, body: text ? JSON.parse(text) : null };
      calls.push(call);
      return routes(call) ?? json(404, {});
    }),
  );
}

const seller = { id: 'u', name: 'A', email: 'a@x.vn', company: 'X', role: 'seller', onboardingCompleted: true } as DemoUser;
const wrap = (ui: React.ReactElement) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>{ui}</LanguageProvider>
    </NextIntlClientProvider>,
  );

afterEach(() => {
  push.mockReset();
  vi.unstubAllGlobals();
});

describe('Bảng giá và thanh toán chuyển khoản (U19)', () => {
  it('bảng giá lấy từ API, gắn nhãn giá tạm tính; seller đặt mua → sang trang đơn', async () => {
    serve((call) => {
      if (call.path === '/api/public/billing-items') return json(200, ITEMS);
      if (call.path === '/api/me/orders' && call.method === 'POST') return json(201, ORDER);
      return undefined;
    });
    wrap(<PricingPlans account={seller} />);
    const card = await screen.findByRole('listitem', { name: 'Duyệt xác minh Nâng cao' });
    expect(card).toHaveTextContent('2.000.000');
    expect(card).toHaveTextContent('Dùng trong 365 ngày');
    expect(card).toHaveTextContent('Giá tạm tính — chờ chốt');
    const report = screen.getByRole('listitem', { name: 'Báo cáo go-to-market đầy đủ' });
    expect(report).not.toHaveTextContent('Giá tạm tính');
    expect(screen.getByRole('region', { name: 'Miễn phí' })).toHaveTextContent('Công cụ tính thuế, quy tắc xuất xứ và EUR.1 nháp');
    fireEvent.click(within(report).getByRole('button', { name: 'Đặt mua' }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringMatching(/\/exporter\/billing\?order=o-1$/)));
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ item_code: 'gtm_report_full' });
  });

  it('chưa đăng nhập → trang đăng nhập; buyer → báo mục dành cho seller, không gọi API', async () => {
    serve((call) => (call.path === '/api/public/billing-items' ? json(200, ITEMS) : undefined));
    const { unmount } = wrap(<PricingPlans account={null} />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Đặt mua' }))[0]);
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/\/login$/));
    unmount();
    wrap(<PricingPlans account={{ ...seller, role: 'buyer' }} />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Đặt mua' }))[0]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Mục này dành cho doanh nghiệp bán hàng (seller).');
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('trang đơn: hướng dẫn chuyển khoản với mã tham chiếu, cảnh báo tài khoản minh hoạ, huỷ đơn', async () => {
    let orders = [ORDER];
    serve((call) => {
      if (call.path === '/api/me/orders') return json(200, orders);
      if (call.path === '/api/me/entitlements') return json(200, [{ feature: 'profile_viewers_full', valid_from: '2026-09-01T00:00:00Z', valid_until: '2026-12-01T00:00:00Z', order_id: 'o-0' }]);
      if (call.path === '/api/me/orders/o-1/cancel') {
        orders = [{ ...ORDER, status: 'cancelled', bank_transfer: null } as unknown as typeof ORDER];
        return json(200, orders[0]);
      }
      return undefined;
    });
    wrap(<SellerBilling />);
    const item = await screen.findByRole('listitem', { name: 'VYBE7K2M9Q' });
    const box = within(item).getByLabelText('Hướng dẫn chuyển khoản');
    expect(box).toHaveTextContent('Nội dung chuyển khoảnVYBE7K2M9Q');
    expect(box).toHaveTextContent('Số tài khoản0000000000');
    expect(box).toHaveTextContent('Tài khoản minh hoạ cho bản demo — không chuyển tiền thật.');
    expect(item.className).toContain('ring-1'); // đơn vừa tạo (?order=o-1) được làm nổi
    expect(screen.getByText(/Danh sách đầy đủ ai đã xem hồ sơ — hết hạn/)).toBeInTheDocument();
    fireEvent.click(within(item).getByRole('button', { name: 'Huỷ đơn' }));
    expect(await screen.findByText('Đã huỷ')).toBeInTheDocument();
    expect(screen.queryByLabelText('Hướng dẫn chuyển khoản')).toBeNull();
  });

  it('admin: xác nhận đã nhận chuyển khoản kèm ghi chú đối soát', async () => {
    const admin = { ...ORDER, company_id: 'c-1', company_name: 'Công ty TNHH Nông Sản Việt', admin_note: null };
    serve((call) => {
      if (call.path.startsWith('/api/admin/orders') && call.method === 'GET') return json(200, [admin]);
      if (call.path === '/api/admin/billing-items') return json(200, ITEMS.map((i) => ({ ...i, is_active: true, sort_order: 1, updated_at: null })));
      if (call.method === 'POST') return json(200, { ...ORDER, status: 'paid' });
      return undefined;
    });
    wrap(<AdminBilling />);
    const row = await screen.findByRole('listitem', { name: 'VYBE7K2M9Q' });
    expect(row).toHaveTextContent('MST 0314892345');
    expect(calls[0].path).toBe('/api/admin/orders?status=pending');
    fireEvent.click(within(row).getByRole('button', { name: 'Đã nhận chuyển khoản' }));
    fireEvent.change(within(row).getByLabelText('Ghi chú đối soát (không bắt buộc)'), { target: { value: 'Sao kê VCB 02/10' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Xác nhận' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Đã cập nhật.');
    expect(calls.find((c) => c.method === 'POST')).toMatchObject({ path: '/api/admin/orders/o-1/confirm-payment', body: { note: 'Sao kê VCB 02/10' } });
  });

  it('ai đã xem hồ sơ: chưa mua gói thì báo số buyer bị ẩn và dẫn tới bảng giá', async () => {
    serve((call) =>
      call.path.startsWith('/api/exporter/profile-viewers')
        ? json(200, { days: 30, total_views: 5, guest_views: 0, anonymous_company_views: 0, full: false, hidden_viewers: 2, viewers: [{ legal_name: 'Buyer 4 GmbH', country: 'DE', business_type: null, views: 1, last_viewed_at: '2026-10-01T08:00:00Z' }] })
        : undefined,
    );
    wrap(<ProfileViewers />);
    const upsell = await screen.findByTestId('viewers-upsell');
    expect(upsell).toHaveTextContent('Còn 2 buyer đã xác minh khác đã xem hồ sơ.');
    expect(within(upsell).getByRole('link', { name: 'Mở danh sách đầy đủ' })).toHaveAttribute('href', '/vi/pricing');
  });

  it('định dạng tiền và câu mẫu dịch sang tiếng Anh', () => {
    expect(formatMoney('1500000.00', 'VND', 'vi').replace(/\s/g, ' ')).toBe('1.500.000 ₫');
    expect(formatMoney('49.90', 'EUR', 'en')).toBe('€49.90');
    expect(translateText('Dùng trong 90 ngày', 'en')).toBe('Valid for 90 days');
    expect(translateText('Còn 2 buyer đã xác minh khác đã xem hồ sơ.', 'en')).toBe('2 more verified buyers viewed your profile.');
  });
});
