import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TrustScoreBadge from '@/components/TrustScoreBadge';
import TrustScorePanel from '@/components/TrustScorePanel';
import { LanguageProvider } from '@/context/LanguageContext';
import { translateText } from '@/i18n/translate';
import type { TrustScore } from '@/lib/trustApi';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter/verification',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const TRUST: TrustScore = {
  score: '62',
  computed_at: '2026-10-03T09:00:00Z',
  new_on_platform: true,
  uses_draft_criteria: true,
  method_url: '/trust-score',
  disclaimer_vi: 'x',
  disclaimer_en: 'x',
  components: [
    { component: 'documents', label_vi: 'Giấy tờ đã kiểm', label_en: 'Checked documents', score: '71', criteria: [{ fact_key: 'legal_verified', label_vi: 'Pháp lý doanh nghiệp đã được VYBE Trade đối chiếu', label_en: 'Legal', weight: '15', value: '1', draft: true }] },
    { component: 'automated', label_vi: 'Kiểm tự động', label_en: 'Automated checks', score: '40', criteria: [] },
    { component: 'behaviour', label_vi: 'Hành vi trên nền tảng', label_en: 'Platform behaviour', score: null, criteria: [{ fact_key: 'response_rate', label_vi: 'Tỷ lệ trả lời', label_en: 'Reply rate', weight: '20', value: null, draft: true }] },
  ],
  self_declared: ['capacity', 'main_customers'],
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('Điểm tín nhiệm (U23)', () => {
  it('seller thấy điểm tổng, điểm thành phần, "Mới trên nền tảng", tiêu chí nháp và dữ kiện tự khai', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(200, TRUST)));
    render(
      <NextIntlClientProvider locale="vi" messages={{}}>
        <LanguageProvider>
          <TrustScorePanel />
        </LanguageProvider>
      </NextIntlClientProvider>,
    );
    const section = await screen.findByRole('region', { name: 'Điểm tín nhiệm' });
    expect(within(section).getByTestId('trust-total')).toHaveTextContent('62/100');
    expect(section).toHaveTextContent('Mới trên nền tảng');
    expect(section).toHaveTextContent('Không phải chứng nhận hay xếp hạng tín dụng.');
    expect(section).toHaveTextContent('Tiêu chí đang là bản nháp minh hoạ, chờ duyệt.');
    expect(within(section).getByLabelText('Giấy tờ đã kiểm')).toHaveTextContent('Pháp lý doanh nghiệp đã được VYBE Trade đối chiếu100%');
    expect(within(section).getByLabelText('Hành vi trên nền tảng')).toHaveTextContent('chưa tính');
    expect(section).toHaveTextContent('Tự khai (không tính điểm): Năng lực sản xuất, Khách hàng chính');
    expect(within(section).getByRole('link', { name: 'Xem phương pháp' })).toHaveAttribute('href', '/vi/trust-score');
  });

  it('huy hiệu công khai có (i) dẫn tới trang phương pháp; không có điểm thì không hiện', () => {
    const intl = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="vi" messages={{}}>{ui}</NextIntlClientProvider>);
    const { container } = intl(<TrustScoreBadge trust={TRUST} locale="vi" />);
    const badge = screen.getByTestId('trust-score');
    expect(badge).toHaveTextContent('Điểm tín nhiệm: 62/100');
    // E1: dấu (*) ngay sau điểm; rê chuột ra giải thích điểm do hệ thống VYBE Trade tính.
    expect(badge).toHaveTextContent('62/100(*)');
    expect(within(badge).getByText('(*)').getAttribute('title')).toContain('do hệ thống VYBE Trade tính');
    const info = within(badge).getByRole('link');
    expect(info.getAttribute('title')).toContain('do hệ thống VYBE Trade tính');
    expect(info).toHaveAttribute('href', '/vi/trust-score');
    container.remove();
    const { container: empty } = intl(<TrustScoreBadge trust={{ ...TRUST, score: null }} locale="vi" />);
    expect(empty).toBeEmptyDOMElement();
    expect(translateText('Mới trên nền tảng', 'en')).toBe('New on the platform');
  });
});
