import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CompletenessCard from '@/components/CompletenessCard';
import { LanguageProvider } from '@/context/LanguageContext';
import { getCompleteness } from '@/lib/companyApi';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const item = (field: string, group: string, weight = '10.00') => ({ field, group, weight });

function serve(body: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn(async () => json(status, body)));
}

function renderCard(onNavigate = vi.fn()) {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <CompletenessCard onNavigate={onNavigate} />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
  return { onNavigate };
}

describe('getCompleteness', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('trả điểm và danh sách còn thiếu; lỗi hoặc chưa có hồ sơ → null', async () => {
    serve({ score: '55.00', missing: [item('description_en', 'intro')] });
    expect(await getCompleteness()).toEqual({ score: '55.00', missing: [item('description_en', 'intro')] });
    serve({ error: { code: 'company_not_found' } }, 404);
    expect(await getCompleteness()).toBeNull();
    serve({}, 500);
    expect(await getCompleteness()).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('network'))));
    expect(await getCompleteness()).toBeNull();
  });
});

describe('CompletenessCard', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('hiện phần trăm hoàn thiện (làm tròn xuống, không bao giờ khoe 100% khi chưa đủ)', async () => {
    serve({ score: '67.50', missing: [item('description_en', 'intro')] });
    renderCard();
    expect(await screen.findByText('67% hoàn thiện')).toBeInTheDocument();
  });

  it.each([
    ['0.00', '0% hoàn thiện'],
    ['99.60', '99% hoàn thiện'],
    ['100.00', '100% hoàn thiện'],
    ['12.50', '12% hoàn thiện'],
  ])('điểm %s hiển thị %s', async (score, text) => {
    serve({ score, missing: [] });
    renderCard();
    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it('thanh tiến độ có role progressbar, giá trị 0–100 và nhãn', async () => {
    serve({ score: '67.50', missing: [item('description_en', 'intro')] });
    renderCard();
    const bar = await screen.findByRole('progressbar', { name: 'Mức độ hoàn thiện hồ sơ' });
    expect(bar).toHaveAttribute('aria-valuenow', '67');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('liệt kê phần còn thiếu đúng thứ tự server trả về, bằng chữ dễ hiểu', async () => {
    serve({
      score: '40.00',
      missing: [
        item('description_en', 'intro', '10.00'),
        item('product_hs', 'products', '10.00'),
        item('tax_id', 'legal', '10.00'),
      ],
    });
    renderCard();
    const list = await screen.findByRole('list', { name: 'Việc cần bổ sung' });
    const labels = within(list).getAllByRole('button').map((b) => b.textContent);
    expect(labels).toEqual([
      'Mô tả tiếng Anh (≥ 150 ký tự)',
      'Sản phẩm kèm mã HS',
      'Mã số thuế / ĐKKD',
    ]);
  });

  it('bấm một mục dẫn tới đúng bước cần điền: hồ sơ = 1, sản phẩm = 2, bằng chứng = 3', async () => {
    serve({
      score: '40.00',
      missing: [
        item('description_en', 'intro'),
        item('export_markets', 'capability'),
        item('tax_id', 'legal'),
        item('product_image', 'products'),
        item('evidence', 'evidence'),
      ],
    });
    const { onNavigate } = renderCard();
    fireEvent.click(await screen.findByRole('button', { name: /Mô tả tiếng Anh/ }));
    fireEvent.click(screen.getByRole('button', { name: /Thị trường xuất khẩu/ }));
    fireEvent.click(screen.getByRole('button', { name: /Mã số thuế/ }));
    fireEvent.click(screen.getByRole('button', { name: /Ảnh sản phẩm/ }));
    fireEvent.click(screen.getByRole('button', { name: /Bằng chứng/ }));
    expect(onNavigate.mock.calls.map((c) => c[0])).toEqual([1, 1, 1, 2, 3]);
  });

  it('hồ sơ đã đầy đủ: báo đã đủ, không có danh sách trống', async () => {
    serve({ score: '100.00', missing: [] });
    renderCard();
    expect(await screen.findByText('Hồ sơ đã đầy đủ thông tin cần thiết.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('khóa lạ (dữ liệu cấu hình mới) vẫn hiển thị được, không làm hỏng thẻ', async () => {
    serve({ score: '10.00', missing: [item('mot_truong_moi', 'legal')] });
    renderCard();
    expect(await screen.findByRole('button', { name: 'mot_truong_moi' })).toBeInTheDocument();
  });

  it('ghi rõ điểm này không phải kết quả xác minh và không hiện huy hiệu xác minh', async () => {
    serve({ score: '95.00', missing: [item('website', 'intro')] });
    renderCard();
    expect(await screen.findByText('Điểm này chỉ đo mức đầy đủ của hồ sơ, không phải kết quả xác minh.')).toBeInTheDocument();
    expect(screen.queryByText(/Đã xác minh|Verified/i)).not.toBeInTheDocument();
  });

  it('đang tải: báo đang tính; lỗi: báo lỗi và không hiện phần trăm', async () => {
    serve({}, 500);
    renderCard();
    expect(screen.getByText('Đang tính điểm hoàn thiện…')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được điểm hoàn thiện hồ sơ.');
    expect(screen.queryByText(/% hoàn thiện/)).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
