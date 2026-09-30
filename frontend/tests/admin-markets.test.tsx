import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminMarkets from '@/components/AdminMarkets';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/admin',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const BATCH = { id: 'b-1', source: 'eurostat_comext', params: {}, status: 'failed', rows_imported: 0, error: 'Eurostat 503', created_at: '2026-10-01T00:00:00Z', finished_at: null };
let posts: string[] = [];

function serve() {
  posts = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      if (req.method === 'POST') {
        posts.push(url.pathname + url.search);
        return json(url.pathname.endsWith('/file') ? 201 : 202, { ...BATCH, status: 'queued', error: null });
      }
      if (url.pathname === '/api/admin/trade-imports/priority-products') {
        return json(200, [{ hs_code: '030462', family: 'pangasius', name_vi: 'Phi lê cá tra đông lạnh', name_en: 'Frozen pangasius fillets', keywords: ['cá tra'] }]);
      }
      if (url.pathname === '/api/admin/trade-imports') return json(200, [BATCH]);
      return json(404, {});
    }),
  );
}

const renderPanel = () =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <AdminMarkets />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );

describe('Thống kê thương mại (admin, U15)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('liệt kê lô nạp kèm lỗi và mã ưu tiên; bấm nạp gửi yêu cầu tạo lô', async () => {
    serve();
    renderPanel();
    expect(await screen.findByTestId('trade-batch')).toHaveTextContent('Eurostat 503');
    expect(await screen.findByText(/030462 Phi lê cá tra đông lạnh/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nạp dữ liệu Eurostat cho mã ưu tiên' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Đã xếp hàng nạp dữ liệu Eurostat');
    expect(posts).toEqual(['/api/admin/trade-imports']);
  });

  it('nạp file CSV gửi kèm nguồn đã chọn', async () => {
    serve();
    renderPanel();
    await screen.findByTestId('trade-batch');
    const file = new File(['reporter,partner,product,year,flow,value_eur,quantity_kg\n'], 'flows.csv', { type: 'text/csv' });
    fireEvent.change(screen.getByLabelText('File CSV thống kê'), { target: { files: [file] } });
    await waitFor(() => expect(posts).toEqual(['/api/admin/trade-imports/file?source=eurostat_comext']));
  });
});
