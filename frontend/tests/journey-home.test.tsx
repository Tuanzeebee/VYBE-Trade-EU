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

const STEPS = ['company', 'evidence', 'verification', 'market', 'tariff', 'origin', 'requests', 'services'];

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
      steps: STEPS.map((key, i) => ({ key, track: i < 3 ? 'product' : 'sales', done: false })),
      product_done: 1,
      product_total: 3,
      sales_done: 0,
      sales_total: 5,
    },
    ...over,
  } as ExporterDashboardData;
}

const COMPANY = {
  slug: 'cong-ty-a', verification_status: 'unverified', profile_completeness_score: '40.00',
} as never;

const wrap = (ui: React.ReactElement) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>{ui}</LanguageProvider>
    </NextIntlClientProvider>,
  );

describe('Trang Hành trình (N1, N3)', () => {
  it('MỘT việc tiếp theo với một nút Bắt đầu mở đúng tab', () => {
    const go = vi.fn();
    wrap(<JourneyHome data={data('evidence')} onGoTab={go} />);
    expect(screen.getByRole('heading', { name: 'Nhà máy, chứng nhận và chất lượng' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Bắt đầu' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(go).toHaveBeenCalledWith('licenses');
  });

  it('bước ngoài workspace (tính thuế) là link tới công cụ, không phải nút chuyển tab', () => {
    wrap(<JourneyHome data={data('tariff')} onGoTab={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Bắt đầu' })).toHaveAttribute('href', expect.stringContaining('/tools/tariff'));
  });

  it('bước xuất xứ là link riêng tới công cụ xuất xứ', () => {
    wrap(<JourneyHome data={data('origin')} onGoTab={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Xuất xứ và pháp lý' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bắt đầu' })).toHaveAttribute('href', expect.stringContaining('/tools/origin'));
  });

  it('Hoàn thiện hồ sơ và Xác minh là MỘT thẻ; tiến độ Bán hàng là thanh nhỏ riêng', () => {
    wrap(<JourneyHome data={data('evidence')} onGoTab={vi.fn()} company={COMPANY} onEditProfile={vi.fn()} />);
    expect(screen.getAllByRole('progressbar', { name: 'Hoàn thiện hồ sơ' })).toHaveLength(1);
    expect(screen.getByRole('progressbar', { name: 'Hoàn thiện hồ sơ' })).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText('Hồ sơ chưa được xác minh')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Bán hàng' })).toHaveAttribute('aria-valuenow', '0');
  });

  it('hiện ngành hàng từ sản phẩm; chưa có sản phẩm thì hiện hướng dẫn', () => {
    const { unmount } = wrap(<JourneyHome data={data('company')} onGoTab={vi.fn()} products={[{ hs_name_vi: 'Gạo xát' } as never]} />);
    expect(screen.getByText(/Ngành hàng/).closest('p')).toHaveTextContent('Gạo xát');
    unmount();
    wrap(<JourneyHome data={data('company')} onGoTab={vi.fn()} products={[]} />);
    expect(screen.getByText(/Thêm sản phẩm kèm mã HS/)).toBeInTheDocument();
  });

  it('ô Yêu cầu báo giá mới có đúng nhãn', () => {
    wrap(<JourneyHome data={data('company')} onGoTab={vi.fn()} />);
    expect(screen.getByText('Yêu cầu báo giá mới')).toBeInTheDocument();
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
