// Bước Giấy phép và chứng nhận hiện bằng chứng theo mã HS của sản phẩm đã khai; form sản phẩm nhập
// mã HS trước, tên tự điền theo mã; dòng lưu ý cỡ nhỏ trong khung xem thuế.
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EvidenceManager from '@/components/EvidenceManager';
import ProductsEditor from '@/components/ProductsEditor';
import TariffPanel from '@/components/TariffPanel';
import UnreviewedNotice from '@/components/UnreviewedNotice';
import { LanguageProvider } from '@/context/LanguageContext';
import { emptyDraft } from '@/lib/productsApi';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter/onboarding',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const wrap = (node: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>{node}</LanguageProvider>
    </NextIntlClientProvider>,
  );

const item = (over: Record<string, unknown>) => ({
  code: 'EUR1',
  name_vi: 'C/O mẫu EUR.1',
  name_en: 'EUR.1 movement certificate',
  layer: 'TARIFF',
  scope: 'SHIPMENT',
  blocks: 'TARIFF_PREFERENCE',
  legal_status: 'VERIFIED',
  status: 'NEEDS_INPUT',
  conditions: ['CONSIGNMENT_GT_6000'],
  review_state: 'UNREVIEWED',
  ...over,
});

const REQUIREMENTS = (over: Record<string, unknown> = {}) => ({
  eur1_threshold_eur: '6000',
  products: [
    {
      hs_code: '08109020',
      hs_formatted: '0810.90.20',
      name_vi: 'Thanh long, vải, chanh leo, mít, khế… tươi',
      name_en: 'Pitahaya, lychee, passion fruit, jackfruit, carambola… fresh',
      items: [
        item({ code: 'PHYTO_CERT', name_vi: 'Chứng nhận kiểm dịch thực vật', blocks: 'IMPORT', status: 'REQUIRED', conditions: ['ALWAYS'] }),
        item({}),
        item({ code: 'ORIGIN_DECLARATION', name_vi: 'Tự chứng nhận xuất xứ', conditions: ['CONSIGNMENT_LE_6000'] }),
        item({ code: 'OFFICIAL_CERT_2019_1793', name_vi: 'Giấy chứng nhận chính thức theo QĐ 2019/1793', blocks: 'IMPORT', status: 'CHECK_REQUIRED', conditions: ['IF_LISTED_2019_1793'] }),
      ],
    },
  ],
  review_state: 'UNREVIEWED',
  disclaimer: 'x',
  ...over,
});

function serveManager(requirements: unknown, checklist: unknown[] = []) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === '/api/exporter/evidence-types') return json(200, []);
      if (path === '/api/exporter/evidences/checklist') return json(200, checklist);
      if (path === '/api/exporter/evidences') return json(200, []);
      if (path === '/api/exporter/products') return json(200, [{ id: 'p-1', name: 'Thanh long', hs_code: '08109020' }]);
      if (path === '/api/exporter/evidence-requirements') return json(200, requirements);
      throw new Error(`unexpected ${path}`);
    }),
  );
}

describe('Bằng chứng theo mã HS đã khai (bước Giấy phép và chứng nhận)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('có yêu cầu theo mã HS: khu riêng liệt kê giấy tờ kèm điều kiện, không hiện "chưa có danh sách"', async () => {
    serveManager(REQUIREMENTS());
    wrap(<EvidenceManager />);
    const region = await screen.findByRole('region', { name: 'Giấy tờ cần chuẩn bị theo sản phẩm của bạn' });
    expect(within(region).getByText(/0810\.90\.20 — Thanh long/)).toBeInTheDocument();
    expect(within(region).getByText('Chứng nhận kiểm dịch thực vật')).toBeInTheDocument();
    expect(within(region).getByText('Luôn cần')).toBeInTheDocument();
    // điều kiện ngưỡng EUR.1 lấy từ cấu hình của backend, không viết cứng trong giao diện
    expect(within(region).getByText(/Lô trên 6\.000 EUR/)).toBeInTheDocument();
    expect(within(region).getByText(/Lô từ 6\.000 EUR trở xuống/)).toBeInTheDocument();
    expect(within(region).getByText(/chưa có dữ liệu danh mục/)).toBeInTheDocument();
    // không còn khung "Chưa có danh sách bằng chứng bắt buộc" mâu thuẫn với giấy tờ ở trên
    expect(screen.queryByRole('region', { name: 'Danh sách kiểm theo nhóm hàng' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Chưa có danh sách bằng chứng bắt buộc/)).not.toBeInTheDocument();
  });

  it('dòng chưa duyệt: có lưu ý cỡ nhỏ ở đầu danh sách', async () => {
    serveManager(REQUIREMENTS());
    wrap(<EvidenceManager />);
    const list = await screen.findByTestId('product-requirements');
    const notice = within(list).getByTestId('unreviewed-notice');
    expect(notice.className).toMatch(/text-xs/);
    expect(notice.compareDocumentPosition(within(list).getAllByRole('list')[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('đã duyệt hết: không có lưu ý', async () => {
    serveManager(REQUIREMENTS({ review_state: 'REVIEWED', disclaimer: null }));
    wrap(<EvidenceManager />);
    await screen.findByTestId('product-requirements');
    expect(screen.queryByTestId('unreviewed-notice')).not.toBeInTheDocument();
  });

  it('không có yêu cầu nào theo mã HS: giữ thông báo cũ', async () => {
    serveManager({ eur1_threshold_eur: '6000', products: [], review_state: 'REVIEWED', disclaimer: null });
    wrap(<EvidenceManager />);
    expect(await screen.findByText(/Chưa có danh sách bằng chứng bắt buộc cho nhóm hàng của bạn/)).toBeInTheDocument();
    expect(screen.queryByTestId('product-requirements')).not.toBeInTheDocument();
  });

  it('API lỗi: không giả vờ có dữ liệu, giữ thông báo cũ', async () => {
    serveManager(undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (req: Request) => {
        const path = new URL(req.url).pathname;
        if (path === '/api/exporter/evidence-requirements') return json(500, {});
        if (path === '/api/exporter/evidence-types' || path === '/api/exporter/evidences/checklist' || path === '/api/exporter/evidences') return json(200, []);
        if (path === '/api/exporter/products') return json(200, [{ id: 'p-1', name: 'Thanh long', hs_code: '08109020' }]);
        throw new Error(`unexpected ${path}`);
      }),
    );
    wrap(<EvidenceManager />);
    expect(await screen.findByText(/Chưa có danh sách bằng chứng bắt buộc cho nhóm hàng của bạn/)).toBeInTheDocument();
  });
});

describe('Form sản phẩm: nhập mã HS trước', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('ô Mã HS nằm trước ô Tên sản phẩm', () => {
    wrap(<ProductsEditor products={[emptyDraft()]} onChange={() => {}} />);
    const hs = screen.getByRole('combobox', { name: /Mã HS/ });
    const name = screen.getByLabelText(/Tên sản phẩm/);
    expect(hs.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/Gõ tên sản phẩm .* vào ô Mã HS/)).toBeInTheDocument();
  });
});

describe('Lưu ý chưa duyệt cỡ nhỏ', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('compact dùng chữ nhỏ; mặc định giữ cỡ chữ nội dung chính', () => {
    const { rerender } = wrap(<UnreviewedNotice state="UNREVIEWED" compact />);
    expect(screen.getByTestId('unreviewed-notice').className).toMatch(/text-xs/);
    rerender(
      <NextIntlClientProvider locale="vi" messages={{}}>
        <LanguageProvider>
          <UnreviewedNotice state="UNREVIEWED" />
        </LanguageProvider>
      </NextIntlClientProvider>,
    );
    expect(screen.getByTestId('unreviewed-notice').className).toMatch(/text-base/);
  });

  it('khung xem thuế tại sản phẩm dùng lưu ý cỡ nhỏ, nằm dưới dòng MFN → EVFTA', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(200, {
          status: 'ok',
          hs_code: '08109020',
          hs_formatted: '0810.90.20',
          mfn_rate: '0.0000',
          evfta_rate: '0.0000',
          staging_category: null,
          zero_from: null,
          quota_note: null,
          condition_note: null,
          quota_note_en: null,
          condition_note_en: null,
          source_url: null,
          review_state: 'UNREVIEWED',
          unreviewed_components: ['tariff_line'],
          disclaimer: 'x',
        }),
      ),
    );
    wrap(<TariffPanel hsCode="08109020" />);
    const notice = await screen.findByTestId('unreviewed-notice');
    await waitFor(() => expect(notice.className).toMatch(/text-xs/));
    expect(screen.getByText('MFN 0%')).toBeInTheDocument();
  });
});
