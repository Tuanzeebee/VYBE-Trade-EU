import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import JourneyHome from '@/components/JourneyHome';
import { LanguageProvider } from '@/context/LanguageContext';
import type { ExporterDashboardData } from '@/lib/dashboardApi';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const STEPS = ['company', 'products', 'evidence', 'verification', 'market', 'tariff', 'requests', 'services'];

function data(nextStep: string | null, over: Partial<ExporterDashboardData> = {}): ExporterDashboardData {
  return {
    completeness: { data: null, empty_hint_key: 'create_company' },
    profile_views: { data: { this_week: 4, previous_week: 1 }, empty_hint_key: null },
    rfqs: { data: null, empty_hint_key: 'no_rfqs_received' },
    verification: { data: null, empty_hint_key: 'create_company' },
    tariff_savings: { data: null, empty_hint_key: 'no_tariff_runs' },
    copilot: { data: [], empty_hint_key: 'no_copilot_questions' },
    journey: {
      next_step: nextStep,
      steps: STEPS.map((key, i) => ({ key, track: i < 4 ? 'product' : 'sales', done: false })),
      product_done: 1,
      product_total: 4,
      sales_done: 0,
      sales_total: 4,
    },
    ...over,
  } as ExporterDashboardData;
}

const wrap = (ui: React.ReactElement) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>{ui}</LanguageProvider>
    </NextIntlClientProvider>,
  );

describe('Trang Hành trình (N1, N3)', () => {
  it('MỘT việc tiếp theo với một nút Bắt đầu mở đúng tab', () => {
    const go = vi.fn();
    wrap(<JourneyHome data={data('products')} onGoTab={go} />);
    expect(screen.getByRole('heading', { name: 'Sản phẩm' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Bắt đầu' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(go).toHaveBeenCalledWith('products');
  });

  it('bước ngoài workspace (tính thuế) là link tới công cụ, không phải nút chuyển tab', () => {
    wrap(<JourneyHome data={data('tariff')} onGoTab={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Bắt đầu' })).toHaveAttribute('href', expect.stringContaining('/tools/tariff'));
  });

  it('hai thanh tiến độ hiện số bước đã xong', () => {
    wrap(<JourneyHome data={data('products')} onGoTab={vi.fn()} />);
    expect(screen.getByRole('progressbar', { name: 'Hoàn thiện sản phẩm' })).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByRole('progressbar', { name: 'Bán hàng' })).toHaveAttribute('aria-valuenow', '0');
  });

  it('xong hết: không còn nút Bắt đầu, có lời nhắc theo dõi Request', () => {
    wrap(<JourneyHome data={data(null)} onGoTab={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Bắt đầu' })).toBeNull();
    expect(screen.getByText(/Theo dõi Request mới/)).toBeInTheDocument();
  });

  it('không còn ô câu hỏi trợ lý; ô lượt xem hồ sơ dẫn tới danh sách người xem', () => {
    wrap(<JourneyHome data={data('company')} onGoTab={vi.fn()} />);
    expect(screen.queryByText(/Câu hỏi gần đây cho trợ lý/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Xem ai đã xem hồ sơ' })).toHaveAttribute('href', expect.stringContaining('/exporter/profile-views'));
  });

  it('lỗi tải: báo lỗi; đang tải: báo đang tải', () => {
    const { unmount } = wrap(<JourneyHome data={null} onGoTab={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được bảng điều khiển');
    unmount();
    wrap(<JourneyHome data={undefined} onGoTab={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
