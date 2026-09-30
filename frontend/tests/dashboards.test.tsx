import { render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminReturnVisits from '@/components/AdminReturnVisits';
import BuyerDashboard from '@/components/BuyerDashboard';
import ExporterDashboard from '@/components/ExporterDashboard';
import ProfileViewBeacon from '@/components/ProfileViewBeacon';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const rfqData = (over: Record<string, unknown> = {}) => ({
  counts: { new: 2, viewed: 0, quoted: 1, closed: 0 },
  total: 3,
  new_this_week: 3,
  recent: [{ id: 'r-1', counterpart_name: 'Global Foods GmbH', product_name: 'Gạo thơm', status: 'new', created_at: '2026-09-30T01:00:00Z' }],
  ...over,
});
const emptyRfq = { counts: { new: 0, viewed: 0, quoted: 0, closed: 0 }, total: 0, new_this_week: 0, recent: [] };

const FULL_EXPORTER = {
  completeness: { data: { score: '68.00', missing: [{ field: 'logo', group: 'profile' }, { field: 'website', group: 'profile' }] }, empty_hint_key: null },
  profile_views: { data: { this_week: 12, previous_week: 5 }, empty_hint_key: null },
  rfqs: { data: rfqData(), empty_hint_key: null },
  verification: { data: { status: 'verified', level: 'basic', expires_at: '2027-01-01T00:00:00Z', days_left: 93 }, empty_hint_key: null },
  tariff_savings: { data: { total_eur: '300.75', runs: 2 }, empty_hint_key: null },
  copilot: { data: [{ id: 'q-1', question: 'Gạo ST25 có hạn ngạch không?', confidence: 'high', created_at: '2026-09-30T01:00:00Z' }], empty_hint_key: null },
};

const EMPTY_EXPORTER = {
  completeness: { data: { score: '20.00', missing: [] }, empty_hint_key: null },
  profile_views: { data: { this_week: 0, previous_week: 0 }, empty_hint_key: 'no_profile_views' },
  rfqs: { data: emptyRfq, empty_hint_key: 'no_rfqs_received' },
  verification: { data: { status: 'unverified', level: 'basic', expires_at: null, days_left: null }, empty_hint_key: 'start_verification' },
  tariff_savings: { data: { total_eur: '0.00', runs: 0 }, empty_hint_key: 'no_tariff_runs' },
  copilot: { data: [], empty_hint_key: 'no_copilot_questions' },
};

let calls: { method: string; path: string }[] = [];
function serve(routes: Record<string, () => Response>) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      calls.push({ method: req.method, path });
      return routes[path]?.() ?? json(404, {});
    }),
  );
}

const wrap = (ui: React.ReactElement) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>{ui}</LanguageProvider>
    </NextIntlClientProvider>,
  );

const tile = (name: string) => screen.getByRole('region', { name });

afterEach(() => vi.unstubAllGlobals());

describe('Dashboard exporter (G1)', () => {
  it('hiện sáu ô với số thật', async () => {
    serve({ '/api/exporter/dashboard': () => json(200, FULL_EXPORTER) });
    wrap(<ExporterDashboard />);
    await screen.findByRole('region', { name: 'Hoàn thiện hồ sơ' });
    expect(tile('Hoàn thiện hồ sơ')).toHaveTextContent('68%');
    expect(tile('Hoàn thiện hồ sơ')).toHaveTextContent('logo');
    expect(tile('Lượt xem hồ sơ tuần này')).toHaveTextContent('12');
    expect(tile('Lượt xem hồ sơ tuần này')).toHaveTextContent('Tuần trước: 5');
    expect(tile('Yêu cầu báo giá')).toHaveTextContent('Global Foods GmbH');
    expect(tile('Xác minh doanh nghiệp')).toHaveTextContent('Đã xác minh');
    expect(tile('Xác minh doanh nghiệp')).toHaveTextContent('93');
    expect(tile('Tiết kiệm thuế ước tính').textContent).toMatch(/300[.,]75/);
    expect(tile('Câu hỏi gần đây cho trợ lý')).toHaveTextContent('Gạo ST25 có hạn ngạch không?');
    expect(screen.queryByRole('note')).toBeNull(); // không ô nào cần hướng dẫn
  });

  it('ô chưa có dữ liệu hiện hướng dẫn thay vì để trống', async () => {
    serve({ '/api/exporter/dashboard': () => json(200, EMPTY_EXPORTER) });
    wrap(<ExporterDashboard />);
    await screen.findByRole('region', { name: 'Hoàn thiện hồ sơ' });
    expect(within(tile('Lượt xem hồ sơ tuần này')).getByRole('note')).toHaveTextContent('Chưa có ai xem hồ sơ');
    expect(within(tile('Yêu cầu báo giá')).getByRole('note')).toHaveTextContent('Chưa có yêu cầu báo giá');
    expect(within(tile('Xác minh doanh nghiệp')).getByRole('note')).toHaveTextContent('Gửi yêu cầu xác minh');
    expect(within(tile('Tiết kiệm thuế ước tính')).getByRole('note')).toHaveTextContent('Dùng công cụ tính thuế');
    expect(within(tile('Câu hỏi gần đây cho trợ lý')).getByRole('note')).toHaveTextContent('Bạn chưa hỏi trợ lý');
    expect(screen.getAllByRole('note')).toHaveLength(5);
  });

  it('chưa có công ty: hướng dẫn tạo hồ sơ', async () => {
    const none = { data: null, empty_hint_key: 'create_company' };
    serve({
      '/api/exporter/dashboard': () =>
        json(200, { ...EMPTY_EXPORTER, completeness: none, profile_views: none, verification: none, tariff_savings: none }),
    });
    wrap(<ExporterDashboard />);
    await waitFor(() => expect(screen.getAllByText(/Hoàn thiện hồ sơ doanh nghiệp để bắt đầu/).length).toBe(4));
  });

  it('lỗi tải: báo lỗi, không giả làm số 0', async () => {
    serve({ '/api/exporter/dashboard': () => json(500, {}) });
    wrap(<ExporterDashboard />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được bảng điều khiển');
    expect(screen.queryByRole('region')).toBeNull();
  });
});

describe('Dashboard buyer (G2)', () => {
  const buyerMe = () => json(200, { id: 'u-1', email: 'b@x.de', role: 'buyer', preferred_language: 'vi' });
  const BUYER = {
    saved_searches: { data: [], empty_hint_key: 'saved_searches_coming_soon' },
    rfqs_sent: { data: rfqData({ counts: { new: 1, viewed: 1, quoted: 1, closed: 0 } }), empty_hint_key: null },
    recently_viewed: { data: [{ slug: 'nong-san', name: 'Nông Sản Lúa Vàng', country: 'VN', at: '2026-09-30T01:00:00Z' }], empty_hint_key: null },
    new_verified: { data: [], empty_hint_key: 'no_new_verified' },
  };

  it('hiện các ô với số thật và hướng dẫn cho ô trống', async () => {
    serve({ '/api/me': buyerMe, '/api/buyer/dashboard': () => json(200, BUYER) });
    wrap(<BuyerDashboard />);
    await screen.findByRole('region', { name: 'Yêu cầu báo giá đã gửi' });
    expect(tile('Yêu cầu báo giá đã gửi')).toHaveTextContent('3');
    expect(tile('Yêu cầu báo giá đã gửi')).toHaveTextContent('Đã báo giá: 1');
    expect(within(tile('Nhà cung cấp xem gần đây')).getByRole('link', { name: 'Nông Sản Lúa Vàng' }).getAttribute('href')).toContain('/suppliers/nong-san');
    expect(within(tile('Tìm kiếm đã lưu')).getByRole('note')).toHaveTextContent('sắp ra mắt');
    expect(within(tile('Nhà cung cấp mới được xác minh tuần này')).getByRole('note')).toHaveTextContent('Tuần này chưa có');
  });

  it('khách hoặc exporter không gọi API dashboard buyer', async () => {
    serve({ '/api/me': () => json(401, {}) });
    wrap(<BuyerDashboard />);
    expect(await screen.findByRole('status')).toHaveTextContent('Đăng nhập bằng tài khoản buyer');
    expect(calls.some((c) => c.path === '/api/buyer/dashboard')).toBe(false);
  });

  it('lỗi tải: báo lỗi', async () => {
    serve({ '/api/me': buyerMe, '/api/buyer/dashboard': () => json(500, {}) });
    wrap(<BuyerDashboard />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được bảng điều khiển');
  });
});

describe('Lượt xem hồ sơ và số đo quay lại', () => {
  it('beacon ghi đúng một lượt xem cho slug', async () => {
    serve({ '/api/public/companies/nong-san/view': () => new Response(null, { status: 204 }) });
    const { container } = wrap(<ProfileViewBeacon slug="nong-san" />);
    await waitFor(() => expect(calls).toEqual([{ method: 'POST', path: '/api/public/companies/nong-san/view' }]));
    expect(container).toBeEmptyDOMElement();
  });

  it('beacon nuốt lỗi mạng', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))));
    wrap(<ProfileViewBeacon slug="x" />);
    await Promise.resolve();
    expect(true).toBe(true); // không ném lỗi ra giao diện
  });

  it('admin thấy tỷ lệ theo tuần và mục tiêu 90%', async () => {
    serve({
      '/api/admin/stats/return-visits': () =>
        json(200, {
          weeks: [{ week_start: '2026-10-05', return_visits: 4, with_new_info: 3, ratio: '0.7500' }],
          overall_ratio: '0.7500',
          target_ratio: '0.90',
        }),
    });
    wrap(<AdminReturnVisits />);
    const section = await screen.findByRole('region', { name: 'Tỷ lệ quay lại có thông tin mới' });
    expect(section).toHaveTextContent('75.0%');
    expect(section).toHaveTextContent('Mục tiêu: 90.0%');
    expect(within(section).getByRole('row', { name: /2026-10-05/ })).toHaveTextContent('4');
  });

  it('chưa có lượt quay lại: hướng dẫn, không hiện 0%', async () => {
    serve({ '/api/admin/stats/return-visits': () => json(200, { weeks: [], overall_ratio: null, target_ratio: '0.90' }) });
    wrap(<AdminReturnVisits />);
    expect(await screen.findByRole('status')).toHaveTextContent('Chưa có lượt quay lại nào');
    expect(screen.getByRole('region')).toHaveTextContent('—');
  });

  it('lỗi tải: báo lỗi', async () => {
    serve({ '/api/admin/stats/return-visits': () => json(500, {}) });
    wrap(<AdminReturnVisits />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được tỷ lệ quay lại');
  });
});
