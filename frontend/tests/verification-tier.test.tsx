import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TierBadge, { tierTooltip } from '@/components/TierBadge';
import VerificationTier from '@/components/VerificationTier';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter/verification',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const requirement = (tier: number, code: string, state: string, over: Record<string, unknown> = {}) => ({
  tier,
  kind: 'evidence',
  code,
  label_vi: `Yêu cầu ${code}`,
  label_en: `Requirement ${code}`,
  is_required: true,
  reviewed: false,
  state,
  ...over,
});

const overview = (over: Record<string, unknown> = {}) => ({
  company_kind: 'product_seller',
  status: 'verified',
  tier: 1,
  tier_name_vi: 'Cơ bản',
  tier_name_en: 'Basic',
  verified_at: '2026-09-01T00:00:00Z',
  tier_reviewed_at: '2026-09-01T00:00:00Z',
  tier_expires_at: null,
  expires_at: '2027-09-01T00:00:00Z',
  next_tier: 2,
  next_tier_paid: true,
  entitled: false,
  pending_tier_request: false,
  request_error: 'entitlement_required',
  requirements: [requirement(1, 'business_registration', 'met'), requirement(2, 'export_contract', 'missing'), requirement(2, 'factory_video', 'manual', { kind: 'manual', is_required: false })],
  ...over,
});

let posts: unknown[] = [];
function serve(first: unknown, afterPost?: unknown) {
  posts = [];
  let current = first;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const { pathname } = new URL(req.url);
      if (pathname === '/api/me/verification-tier') return json(200, current);
      if (pathname === '/api/exporter/verification-tier-requests') {
        posts.push(JSON.parse(await req.text()));
        current = afterPost ?? current;
        return json(201, {});
      }
      return json(404, {});
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

describe('Cấp xác minh (U20)', () => {
  it('cấp Cơ bản: danh sách kiểm theo cấp, lên Nâng cao cần mua gói → nút khoá, dẫn tới bảng giá', async () => {
    serve(overview());
    wrap(<VerificationTier />);
    const section = await screen.findByRole('region', { name: 'Cấp xác minh' });
    expect(within(section).getByTestId('current-tier')).toHaveTextContent('Cơ bản');
    expect(section).toHaveTextContent('Yêu cầu export_contractChưa có');
    expect(section).toHaveTextContent('Quản trị viên kiểm tay');
    expect(section).toHaveTextContent('bản nháp, chờ bộ phận pháp lý duyệt');
    expect(within(section).getByRole('button', { name: 'Yêu cầu duyệt cấp Nâng cao' })).toBeDisabled();
    expect(within(section).getByRole('link', { name: 'Đặt mua gói duyệt Nâng cao' })).toHaveAttribute('href', '/vi/pricing');
  });

  it('đã mua gói: gửi yêu cầu lên cấp, hiện thông báo đang chờ', async () => {
    serve(overview({ entitled: true, request_error: null }), overview({ entitled: true, pending_tier_request: true, request_error: 'request_pending' }));
    wrap(<VerificationTier />);
    fireEvent.click(await screen.findByRole('button', { name: 'Yêu cầu duyệt cấp Nâng cao' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Đã gửi yêu cầu lên cấp');
    expect(posts).toEqual([{ target_tier: 2 }]);
    expect(screen.getByText('Bạn đã có yêu cầu lên cấp đang chờ duyệt.')).toBeInTheDocument();
  });

  it('huy hiệu công khai: một huy hiệu kèm tên cấp; tooltip ghi ai kiểm, ngày, hạn, phạm vi', () => {
    render(<TierBadge tier={2} locale="vi" reviewedAt="2026-10-01T00:00:00Z" expiresAt="2027-10-01T00:00:00Z" />);
    const badge = screen.getByTestId('verified-badge');
    expect(badge).toHaveTextContent('Đã xác minh· Nâng cao');
    expect(badge.getAttribute('title')).toContain('Kiểm bởi đội ngũ VYBE Trade');
    expect(badge.getAttribute('title')).toContain('Phạm vi: năng lực');
    expect(tierTooltip(1, 'en')).toContain('Checked by the VYBE Trade team');
    expect(tierTooltip(1, 'en')).toContain('Scope: company legal status');
  });
});
