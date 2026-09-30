import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TariffPanel from '@/components/TariffPanel';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const base = {
  hs_code: '090111',
  hs_formatted: '0901.11',
  mfn_rate: null,
  evfta_rate: null,
  staging_category: null,
  zero_from: null,
  quota_note: null,
  condition_note: null,
  quota_note_en: null,
  condition_note_en: null,
  source_url: null,
};

function serve(body: unknown, status = 200) {
  const fetchMock = vi.fn(async (_req: Request) => json(status, body));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPanel(variant: 'summary' | 'full' = 'summary', hsCode = '090111') {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <TariffPanel hsCode={hsCode} variant={variant} />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

describe('TariffPanel', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('ok: hiện thuế MFN, thuế EVFTA và chênh lệch', async () => {
    serve({ ...base, status: 'ok', mfn_rate: '12.0000', evfta_rate: '6.0000' });
    renderPanel();
    expect(await screen.findByText('MFN 12%')).toBeInTheDocument();
    expect(screen.getByText('EVFTA 6%')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/6/);
  });

  it('full: hiện lộ trình, năm về 0%, ghi chú điều kiện và nguồn', async () => {
    serve({
      ...base,
      status: 'ok',
      mfn_rate: '12.0000',
      evfta_rate: '6.0000',
      staging_category: 'B5',
      zero_from: '2030-01-01',
      condition_note: 'Cần EUR.1',
      source_url: 'https://example.test/tariff',
    });
    renderPanel('full');
    expect(await screen.findByText('B5')).toBeInTheDocument();
    expect(screen.getByText(/2030/)).toBeInTheDocument();
    expect(screen.getByText('Cần EUR.1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Nguồn/ })).toHaveAttribute('href', 'https://example.test/tariff');
  });

  it('needs_review: nêu lý do, không có con số thuế nào', async () => {
    serve({ ...base, status: 'needs_review', mfn_rate: '12.0000', evfta_rate: '6.0000', staging_category: 'B5', zero_from: '2030-01-01', quota_note: 'Hạn ngạch gạo' });
    renderPanel();
    expect(await screen.findByText(/cần chuyên gia xem lại/i)).toBeInTheDocument();
    expect(screen.getByText('Hạn ngạch gạo')).toBeInTheDocument();
    expect(screen.queryByText(/\d+(\.\d+)?\s*%/)).not.toBeInTheDocument();
  });

  it('needs_review, full: có ghi chú điều kiện nhưng vẫn không có con số thuế', async () => {
    serve({
      ...base,
      status: 'needs_review',
      mfn_rate: '12.0000',
      evfta_rate: '6.0000',
      staging_category: 'B5',
      zero_from: '2030-01-01',
      quota_note: 'Hạn ngạch gạo',
      condition_note: 'Cần EUR.1',
    });
    renderPanel('full');
    expect(await screen.findByText('Cần EUR.1')).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it.each([
    ['thiếu thuế MFN', { mfn_rate: null, evfta_rate: '6.0000' }],
    ['thiếu thuế EVFTA', { mfn_rate: '12.0000', evfta_rate: null }],
    ['thuế không phải số', { mfn_rate: 'abc', evfta_rate: '6.0000' }],
  ])('ok nhưng %s: coi là lỗi, không hiện 0% hay NaN', async (_name, rates) => {
    serve({ ...base, status: 'ok', ...rates });
    renderPanel();
    expect(await screen.findByText(/Không tải được thông tin thuế/)).toBeInTheDocument();
    expect(screen.queryByText(/%|NaN/)).not.toBeInTheDocument();
  });

  it('unsupported: nói chưa hỗ trợ, không có con số nào', async () => {
    serve({ ...base, status: 'unsupported', mfn_rate: '12.0000', evfta_rate: '6.0000', staging_category: 'B5', zero_from: '2030-01-01' });
    renderPanel();
    expect(await screen.findByText(/chưa có dữ liệu thuế/i)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('mạng lỗi: báo lỗi nhẹ và cho thử lại', async () => {
    const fetchMock = vi.fn(async (_req: Request): Promise<Response> => {
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPanel();
    expect(await screen.findByText(/Không tải được thông tin thuế/)).toBeInTheDocument();
    fetchMock.mockImplementation(async () => json(200, { ...base, status: 'unsupported' }));
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
    await waitFor(() => expect(screen.queryByText(/Không tải được thông tin thuế/)).not.toBeInTheDocument());
  });

  it('phản hồi không đúng dạng: coi là lỗi, không hiện số bậy', async () => {
    serve([{ code: '100630' }]);
    renderPanel();
    expect(await screen.findByText(/Không tải được thông tin thuế/)).toBeInTheDocument();
  });

  it('gọi đúng route với mã HS', async () => {
    const fetchMock = serve({ ...base, status: 'unsupported' });
    renderPanel('summary', '100630');
    await screen.findByText(/chưa có dữ liệu thuế/i);
    const url = new URL(fetchMock.mock.calls[0][0].url);
    expect(url.pathname).toBe('/api/exporter/tariff-preview');
    expect(url.searchParams.get('hs_code')).toBe('100630');
  });
});

describe('TariffPanel — dữ liệu minh hoạ và cảnh báo ngành (U14)', () => {
  afterEach(() => vi.unstubAllGlobals());

  const IUU = {
    code: 'iuu_yellow_card',
    severity: 'warning',
    title_vi: 'Thẻ vàng IUU của EU đối với thủy sản khai thác Việt Nam',
    title_en: 'EU IUU yellow card for Vietnamese wild-caught seafood',
    body_vi: 'Lô hàng thủy sản khai thác cần giấy chứng nhận khai thác hợp lệ.',
    body_en: null,
    source_url: null,
    data_status: 'demo_unreviewed',
  };

  it('dữ liệu minh hoạ: hiện banner; cảnh báo ngành gắn nhãn minh hoạ', async () => {
    serve({ ...base, hs_code: '030462', status: 'ok', mfn_rate: '9.0000', evfta_rate: '0.0000', data_status: 'demo_unreviewed', alerts: [IUU] });
    renderPanel('summary', '030462');
    expect(await screen.findByTestId('demo-banner')).toHaveTextContent('Dữ liệu minh hoạ — chưa được chuyên gia pháp lý duyệt');
    const alerts = screen.getByRole('list', { name: 'Cảnh báo ngành' });
    expect(alerts).toHaveTextContent('Thẻ vàng IUU');
    expect(alerts).toHaveTextContent('Minh hoạ');
  });

  it('dữ liệu đã duyệt: không có banner; cảnh báo vẫn hiện cả khi mã chưa được hỗ trợ', async () => {
    serve({ ...base, hs_code: '030462', status: 'unsupported', data_status: null, alerts: [{ ...IUU, data_status: 'reviewed' }] });
    renderPanel('summary', '030462');
    expect(await screen.findByText(/chưa có dữ liệu thuế được duyệt/)).toBeInTheDocument();
    expect(screen.queryByTestId('demo-banner')).toBeNull();
    expect(screen.getByRole('list', { name: 'Cảnh báo ngành' })).not.toHaveTextContent('Minh hoạ');
  });
});
