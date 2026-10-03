import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProductDialog from '@/components/ProductDialog';
import { LanguageProvider } from '@/context/LanguageContext';
import { emptyDraft } from '@/lib/productsApi';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter/products',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const CATFISH = {
  code: '030462',
  formatted: '0304.62',
  name_vi: 'Phi lê cá tra đông lạnh',
  name_en: 'Frozen fillets of catfish (Pangasius spp.)',
  chapter: '03',
  category: 'seafood',
  supported: true,
};

function serve(calls: { method: string; path: string; body?: unknown }[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url);
      const body = req.method === 'POST' ? await req.json() : undefined;
      calls.push({ method: req.method, path: url.pathname, body });
      if (url.pathname === '/api/public/hs-codes') return json(200, url.searchParams.get('q')?.toLowerCase().includes('cá tra') ? [CATFISH] : []);
      if (url.pathname === '/api/exporter/tariff-preview') return json(200, { status: 'unsupported' });
      if (url.pathname === '/api/exporter/products' && req.method === 'POST') {
        return json(201, { id: 'p-new', name: 'Cá tra phi lê', hs_code: '030462', images: [], price_tiers: [], packagings: [] });
      }
      throw new Error(`unexpected ${req.method} ${url.pathname}`);
    }),
  );
}

function renderDialog(onSaved = vi.fn()) {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <ProductDialog initial={emptyDraft()} onClose={vi.fn()} onSaved={onSaved} onDeleted={vi.fn()} />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
  return onSaved;
}

describe('ProductDialog + gợi ý mã HS theo tên (U3)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('gõ tên "cá tra" → gợi ý mã HS; bấm gợi ý thì chọn mã, không đổi tên đã gõ', async () => {
    serve([]);
    renderDialog();
    const dialog = within(screen.getByRole('dialog', { name: 'Thêm sản phẩm' }));
    fireEvent.change(dialog.getByLabelText(/Tên sản phẩm/), { target: { value: 'Cá tra phi lê' } });
    fireEvent.click(await dialog.findByRole('button', { name: /0304\.62/ }, { timeout: 2000 }));
    expect(dialog.getByRole('combobox', { name: /Mã HS/ })).toHaveValue('0304.62 — Phi lê cá tra đông lạnh');
    expect(dialog.getByLabelText(/Tên sản phẩm/)).toHaveValue('Cá tra phi lê');
  });

  it('lưu gửi POST với bậc giá rồi báo về workspace', async () => {
    const calls: { method: string; path: string; body?: unknown }[] = [];
    serve(calls);
    const onSaved = renderDialog();
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText(/Tên sản phẩm/), { target: { value: 'Cá tra phi lê' } });
    fireEvent.click(await dialog.findByRole('button', { name: /0304\.62/ }, { timeout: 2000 }));
    fireEvent.change(dialog.getByLabelText(/Từ số lượng/), { target: { value: '10' } });
    fireEvent.change(dialog.getByLabelText(/^Đơn giá/), { target: { value: '2.9' } });
    fireEvent.change(dialog.getByLabelText(/Đơn vị giá/), { target: { value: 'kg' } });
    fireEvent.change(dialog.getByLabelText(/Đơn vị MOQ/), { target: { value: 'tonne' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Lưu sản phẩm' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const post = calls.find((c) => c.method === 'POST');
    expect(post?.body).toMatchObject({ hs_code: '030462', price_tiers: [{ min_quantity: '10', unit_price: '2.9' }] });
  });

  it('thiếu bậc giá: báo lỗi ngay trong hộp thoại, không gọi API', async () => {
    const calls: { method: string; path: string; body?: unknown }[] = [];
    serve(calls);
    renderDialog();
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText(/Tên sản phẩm/), { target: { value: 'Cá tra phi lê' } });
    fireEvent.click(await dialog.findByRole('button', { name: /0304\.62/ }, { timeout: 2000 }));
    fireEvent.change(dialog.getByLabelText(/Đơn vị giá/), { target: { value: 'kg' } });
    fireEvent.change(dialog.getByLabelText(/Đơn vị MOQ/), { target: { value: 'tonne' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Lưu sản phẩm' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('chưa nhập bậc giá');
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });
});
