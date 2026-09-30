import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProfileViewers from '@/components/ProfileViewers';
import { LanguageProvider } from '@/context/LanguageContext';
import { describe as describeNotification } from '@/lib/notificationsApi';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter/profile-views',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let searches: string[] = [];
function serve(status = 200) {
  searches = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      if (url.pathname !== '/api/exporter/profile-viewers') return json(404, {});
      searches.push(url.search);
      if (status !== 200) return json(status, {});
      return json(200, {
        days: Number(url.searchParams.get('days')),
        total_views: 9,
        guest_views: 4,
        anonymous_company_views: 3,
        viewers: [
          { legal_name: 'Named Foods GmbH', country: 'DE', business_type: 'importer', views: 2, last_viewed_at: '2026-09-30T08:00:00Z' },
        ],
      });
    }),
  );
}

const wrap = () =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <ProfileViewers />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('Ai đã xem hồ sơ (U9)', () => {
  it('đếm khách và doanh nghiệp ẩn danh; chỉ liệt kê tên buyer đã xác minh', async () => {
    serve();
    wrap();
    const list = await screen.findByRole('list');
    expect(within(list).getByText('Named Foods GmbH')).toBeInTheDocument();
    expect(within(list).getByRole('listitem')).toHaveTextContent('2 lượt xem');
    const section = screen.getByRole('region', { name: 'Ai đã xem hồ sơ của bạn' });
    expect(section).toHaveTextContent('Tổng lượt xem9');
    expect(section).toHaveTextContent('Khách chưa đăng nhập4');
    expect(section).toHaveTextContent('Doanh nghiệp ẩn danh3');
    expect(section).toHaveTextContent('không lộ danh tính');
    expect(searches).toEqual(['?days=30']);
  });

  it('đổi khoảng thời gian gọi lại với days mới', async () => {
    serve();
    wrap();
    await screen.findByRole('list');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '90' } });
    await waitFor(() => expect(searches).toContain('?days=90'));
  });

  it('lỗi tải: báo lỗi, không giả làm rỗng', async () => {
    serve(500);
    wrap();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được dữ liệu lượt xem');
  });

  it('thông báo profile_viewed nêu tên buyer; thiếu tên vẫn có câu chung', () => {
    expect(describeNotification({ type: 'profile_viewed', payload: { viewer_name: 'Named Foods GmbH' } })).toBe('Named Foods GmbH vừa xem hồ sơ của bạn.');
    expect(describeNotification({ type: 'profile_viewed', payload: {} })).toBe('Một buyer đã xác minh vừa xem hồ sơ của bạn.');
  });
});
