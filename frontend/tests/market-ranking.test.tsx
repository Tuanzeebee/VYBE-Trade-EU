import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import MarketRanking from '@/components/MarketRanking';
import { LanguageProvider } from '@/context/LanguageContext';
import type { MarketsResult } from '@/lib/marketsApi';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/tools/tariff',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const NO_NUMBERS = { rank: null, duty: null, vat_rate: null, vat: null, total: null, label_languages: null, note: null, note_en: null };
const ranked = (country: string, over: Record<string, unknown> = {}) => ({
  country,
  status: 'ranked',
  rank: 1,
  duty: '0.00',
  vat_rate: '7.0000',
  vat: '700.00',
  total: '700.00',
  label_languages: 'de',
  note: null,
  note_en: null,
  ...over,
});
const data = (over: Record<string, unknown>): MarketsResult =>
  ({
    check_id: 'm-1',
    status: 'ok',
    basis: 'evfta',
    hs_code: '03061792',
    hs_formatted: '0306.17.92',
    product_value: '100000.00',
    duty_rate: '0.0000',
    rows: [],
    ...over,
  }) as MarketsResult;

function renderRanking(value: MarketsResult) {
  return render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <MarketRanking data={value} />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

describe('Bảng thị trường nên xuất', () => {
  it('unsupported chỉ hiện thông báo, không có con số', () => {
    const { container } = renderRanking(data({ status: 'unsupported', basis: null, duty_rate: null }));
    expect(container).toHaveTextContent('chưa được hỗ trợ');
    expect(container.textContent).not.toMatch(/€|\d/);
  });

  it('needs_review chỉ hiện thông báo, không có con số', () => {
    const { container } = renderRanking(data({ status: 'needs_review', basis: null, duty_rate: null }));
    expect(container).toHaveTextContent('cần kiểm tra thêm');
    expect(container.textContent).not.toMatch(/€|\d/);
  });

  it('nước no_data không hiện số nào, chỉ được đếm là chưa có dữ liệu', () => {
    renderRanking(data({ rows: [ranked('FR'), { country: 'DE', status: 'no_data', ...NO_NUMBERS }] }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('region')).toHaveTextContent('Chưa có dữ liệu cho 1 nước EU còn lại');
  });

  it('không có nước nào xếp hạng được: nói chưa có dữ liệu VAT đã duyệt, không có số', () => {
    renderRanking(data({ rows: [{ country: 'DE', status: 'no_data', ...NO_NUMBERS }] }));
    expect(screen.getByText(/Chưa có dữ liệu VAT đã duyệt/)).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('tiêu đề nêu mã HS và giá trị lô hàng đã xếp hạng', () => {
    renderRanking(data({ rows: [ranked('FR')] }));
    const region = screen.getByRole('region');
    expect(region).toHaveTextContent('0306.17.92');
    expect(region).toHaveTextContent('100.000');
  });

  it('vat_rate rỗng thì không hiện "(0%)" giả', () => {
    renderRanking(data({ rows: [ranked('FR', { vat_rate: null })] }));
    expect(screen.getByRole('region').textContent).not.toContain('(0%)');
  });
});
