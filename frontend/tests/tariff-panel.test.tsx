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
    expect(await screen.findByText(/MFN/)).toHaveTextContent('12');
    expect(screen.getByText(/EVFTA/)).toHaveTextContent('6');
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
    serve({ ...base, status: 'needs_review', quota_note: 'Hạn ngạch gạo' });
    renderPanel();
    expect(await screen.findByText(/cần chuyên gia xem lại/i)).toBeInTheDocument();
    expect(screen.getByText('Hạn ngạch gạo')).toBeInTheDocument();
    expect(screen.queryByText(/\d+(\.\d+)?\s*%/)).not.toBeInTheDocument();
  });

  it('unsupported: nói chưa hỗ trợ, không có con số nào', async () => {
    serve({ ...base, status: 'unsupported' });
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
    expect(await screen.findByRole('alert')).toHaveTextContent(/Không tải được thông tin thuế/);
    fetchMock.mockImplementation(async () => json(200, { ...base, status: 'unsupported' }));
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('phản hồi không đúng dạng: coi là lỗi, không hiện số bậy', async () => {
    serve([{ code: '100630' }]);
    renderPanel();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
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
