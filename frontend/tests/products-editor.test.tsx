import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProductsEditor from '@/components/ProductsEditor';
import { LanguageProvider } from '@/context/LanguageContext';
import { emptyDraft, type ProductDraft } from '@/lib/productsApi';

const upload = vi.fn();

vi.mock('@/lib/productsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/productsApi')>()),
  uploadProductImage: (file: File) => upload(file),
}));

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter/onboarding',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const RICE = {
  code: '100630',
  formatted: '1006.30',
  name_vi: 'Gạo xát',
  name_en: 'Semi-milled or wholly milled rice',
  chapter: '10',
  category: 'agriculture',
  supported: true,
};

const COFFEE = {
  code: '090111',
  formatted: '0901.11',
  name_vi: 'Cà phê chưa rang, chưa khử caffeine',
  name_en: 'Coffee, not roasted, not decaffeinated',
  chapter: '09',
  category: 'agriculture',
  supported: true,
};

let latest: ProductDraft[] = [];

function Harness({ initial = [] }: { initial?: ProductDraft[] }) {
  const [products, setProducts] = useState<ProductDraft[]>(initial);
  latest = products;
  return (
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <ProductsEditor
          products={products}
          onChange={(next) => {
            latest = next;
            setProducts(next);
          }}
        />
      </LanguageProvider>
    </NextIntlClientProvider>
  );
}

const card = (index = 0) => screen.getAllByRole('group', { name: /^Sản phẩm \d+/ })[index];
const add = () => fireEvent.click(screen.getByRole('button', { name: /Thêm sản phẩm/ }));

describe('ProductsEditor', () => {
  // Không trả về mock: vitest coi giá trị trả về của beforeEach là hàm dọn dẹp và sẽ gọi nó.
  beforeEach(() => {
    upload.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('danh sách trống: hiện hướng dẫn thay vì để trống, có nút thêm', () => {
    render(<Harness />);
    expect(screen.getByRole('status')).toHaveTextContent('Chưa có sản phẩm');
    expect(screen.getByRole('button', { name: /Thêm sản phẩm/ })).toBeInTheDocument();
  });

  it('thêm sản phẩm → thẻ trống có đủ ô theo backlog, mã HS bắt buộc', () => {
    render(<Harness />);
    add();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    const c = within(card());
    expect(c.getByLabelText(/Tên sản phẩm/)).toBeRequired();
    expect(c.getByRole('combobox', { name: /Mã HS/ })).toBeRequired();
    for (const label of [/Giá thấp nhất/, /Giá cao nhất/, /Tiền tệ/, /Đơn vị giá/, /^MOQ/, /Đơn vị MOQ/, /Mô tả \(tiếng Việt\)/, /Mô tả \(tiếng Anh\)/]) {
      expect(c.getByLabelText(label)).toBeInTheDocument();
    }
    expect((c.getByLabelText(/Tiền tệ/) as HTMLSelectElement).value).toBe('USD');
    expect(c.getByRole('checkbox', { name: /Hiển thị công khai/ })).toBeChecked();
  });

  it('không còn các trường của form cũ: sản phẩm chính, quy cách đóng gói, năng lực cung ứng, thị trường', () => {
    render(<Harness initial={[emptyDraft()]} />);
    for (const gone of [/Sản phẩm chính/, /Quy cách đóng gói/, /Năng lực cung ứng/, /Thị trường xuất khẩu/, /Danh mục/]) {
      expect(screen.queryByText(gone)).not.toBeInTheDocument();
    }
  });

  it('sửa các ô cập nhật đúng bản nháp', () => {
    render(<Harness initial={[emptyDraft()]} />);
    const c = within(card());
    fireEvent.change(c.getByLabelText(/Tên sản phẩm/), { target: { value: 'Gạo ST25' } });
    fireEvent.change(c.getByLabelText(/Giá thấp nhất/), { target: { value: '480' } });
    fireEvent.change(c.getByLabelText(/Giá cao nhất/), { target: { value: '560.5' } });
    fireEvent.change(c.getByLabelText(/Tiền tệ/), { target: { value: 'EUR' } });
    fireEvent.change(c.getByLabelText(/Đơn vị giá/), { target: { value: 'tonne' } });
    fireEvent.change(c.getByLabelText(/^MOQ/), { target: { value: '25' } });
    fireEvent.change(c.getByLabelText(/Đơn vị MOQ/), { target: { value: 'container_20ft' } });
    fireEvent.change(c.getByLabelText(/Mô tả \(tiếng Anh\)/), { target: { value: 'Rice' } });
    fireEvent.click(c.getByRole('checkbox', { name: /Hiển thị công khai/ }));
    expect(latest[0]).toMatchObject({
      name: 'Gạo ST25',
      priceMin: '480',
      priceMax: '560.5',
      currency: 'EUR',
      unit: 'tonne',
      moq: '25',
      moqUnit: 'container_20ft',
      descriptionEn: 'Rice',
      isActive: false,
    });
  });

  it('chọn mã HS từ gợi ý ghi vào bản nháp', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify([RICE]), { status: 200, headers: { 'content-type': 'application/json' } })),
    );
    render(<Harness initial={[emptyDraft()]} />);
    fireEvent.change(within(card()).getByRole('combobox', { name: /Mã HS/ }), { target: { value: 'gao' } });
    fireEvent.click(await screen.findByRole('option', { name: /1006\.30/ }));
    expect(latest[0].hs).toMatchObject({ code: '100630', formatted: '1006.30' });
  });

  it('xóa sản phẩm chỉ bỏ đúng thẻ đó', () => {
    const a = { ...emptyDraft(), name: 'A' };
    const b = { ...emptyDraft(), name: 'B' };
    render(<Harness initial={[a, b]} />);
    fireEvent.click(within(card(0)).getByRole('button', { name: /Xóa sản phẩm/ }));
    expect(latest.map((p) => p.name)).toEqual(['B']);
    expect(screen.getAllByRole('group', { name: /^Sản phẩm \d+/ })).toHaveLength(1);
  });

  it('sản phẩm đã lưu hiện sẵn mã HS và ảnh', () => {
    const saved: ProductDraft = {
      ...emptyDraft(),
      id: 'p-1',
      name: 'Gạo',
      hs: { code: '100630', formatted: '1006.30', name_vi: 'Gạo xát', name_en: 'Rice' },
      images: [{ key: 'products/c/1.png', url: 'https://cdn/1.png' }],
    };
    render(<Harness initial={[saved]} />);
    const c = within(card());
    expect((c.getByRole('combobox', { name: /Mã HS/ }) as HTMLInputElement).value).toBe('1006.30 — Gạo xát');
    expect(c.getByRole('img', { name: /Ảnh 1/ })).toHaveAttribute('src', 'https://cdn/1.png');
  });

  it('tải ảnh lên thành công: thêm vào sản phẩm đúng thẻ', async () => {
    upload.mockResolvedValue({ key: 'products/c/new.png', url: 'blob:new' });
    render(<Harness initial={[emptyDraft(), emptyDraft()]} />);
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    fireEvent.change(within(card(1)).getByLabelText(/Thêm ảnh/), { target: { files: [file] } });
    await waitFor(() => expect(latest[1].images).toEqual([{ key: 'products/c/new.png', url: 'blob:new' }]));
    expect(latest[0].images).toEqual([]);
    expect(upload).toHaveBeenCalledWith(file);
  });

  it('tải ảnh lỗi: báo lỗi, không thêm ảnh, sản phẩm vẫn sửa/lưu được', async () => {
    upload.mockRejectedValue(new Error('Không tải được ảnh lên. Bạn vẫn có thể lưu sản phẩm không có ảnh.'));
    render(<Harness initial={[emptyDraft()]} />);
    fireEvent.change(within(card()).getByLabelText(/Thêm ảnh/), {
      target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
    });
    expect(await within(card()).findByRole('alert')).toHaveTextContent('Không tải được ảnh lên');
    expect(latest[0].images).toEqual([]);
    fireEvent.change(within(card()).getByLabelText(/Tên sản phẩm/), { target: { value: 'Vẫn sửa được' } });
    expect(latest[0].name).toBe('Vẫn sửa được');
  });

  it('xóa ảnh khỏi sản phẩm', () => {
    const p: ProductDraft = {
      ...emptyDraft(),
      images: [
        { key: 'k1', url: 'u1' },
        { key: 'k2', url: 'u2' },
      ],
    };
    render(<Harness initial={[p]} />);
    fireEvent.click(within(card()).getAllByRole('button', { name: /Xóa ảnh/ })[0]);
    expect(latest[0].images).toEqual([{ key: 'k2', url: 'u2' }]);
  });

  it('đủ 10 ảnh thì không cho thêm nữa', () => {
    const p: ProductDraft = {
      ...emptyDraft(),
      images: Array.from({ length: 10 }, (_, i) => ({ key: `k${i}`, url: `u${i}` })),
    };
    render(<Harness initial={[p]} />);
    expect(within(card()).queryByLabelText(/Thêm ảnh/)).not.toBeInTheDocument();
    expect(within(card()).getByText(/Đã đủ 10 ảnh/)).toBeInTheDocument();
  });

  it('tải ảnh chậm xong sau khi người dùng vừa sửa tên: không làm mất chữ vừa gõ', async () => {
    let finish: (value: { key: string; url: string }) => void = () => {};
    upload.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<Harness initial={[emptyDraft()]} />);
    fireEvent.change(within(card()).getByLabelText(/Thêm ảnh/), {
      target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
    });
    fireEvent.change(within(card()).getByLabelText(/Tên sản phẩm/), { target: { value: 'Gõ trong lúc chờ' } });
    finish({ key: 'k', url: 'u' });
    await waitFor(() => expect(latest[0].images).toHaveLength(1));
    expect(latest[0].name).toBe('Gõ trong lúc chờ');
  });

  function stubHs(options: unknown[]) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(options), { status: 200, headers: { 'content-type': 'application/json' } })),
    );
  }

  async function pick(query: string, optionName: RegExp) {
    fireEvent.change(within(card()).getByRole('combobox', { name: /Mã HS/ }), { target: { value: query } });
    fireEvent.click(await screen.findByRole('option', { name: optionName }));
  }

  it('chọn mã HS khi ô tên còn trống: tên tự điền bằng tên mã HS', async () => {
    stubHs([RICE]);
    render(<Harness initial={[emptyDraft()]} />);
    await pick('gao', /1006\.30/);
    expect(latest[0].name).toBe('Gạo xát');
    expect((within(card()).getByLabelText(/Tên sản phẩm/) as HTMLInputElement).value).toBe('Gạo xát');
  });

  it('tên seller đã gõ không bị ghi đè khi chọn mã HS', async () => {
    stubHs([RICE]);
    render(<Harness initial={[{ ...emptyDraft(), name: 'Gạo ST25' }]} />);
    await pick('gao', /1006\.30/);
    expect(latest[0].name).toBe('Gạo ST25');
  });

  it('đổi sang mã HS khác: tên tự điền đổi theo, nếu seller chưa sửa', async () => {
    stubHs([RICE, COFFEE]);
    render(<Harness initial={[emptyDraft()]} />);
    await pick('gao', /1006\.30/);
    await pick('ca phe', /0901\.11/);
    expect(latest[0].name).toBe('Cà phê chưa rang, chưa khử caffeine');
  });

  it('seller sửa tay tên đã tự điền rồi đổi mã HS: giữ tên seller sửa', async () => {
    stubHs([RICE, COFFEE]);
    render(<Harness initial={[emptyDraft()]} />);
    await pick('gao', /1006\.30/);
    fireEvent.change(within(card()).getByLabelText(/Tên sản phẩm/), { target: { value: 'Gạo ST25 đặc biệt' } });
    await pick('ca phe', /0901\.11/);
    expect(latest[0].name).toBe('Gạo ST25 đặc biệt');
  });

  it('StrictMode: đổi sang mã HS khác thì tên tự điền đổi theo', async () => {
    stubHs([RICE, COFFEE]);
    render(
      <React.StrictMode>
        <Harness initial={[emptyDraft()]} />
      </React.StrictMode>
    );
    await pick('gao', /1006\.30/);
    await pick('ca phe', /0901\.11/);
    expect(latest[0].name).toBe('Cà phê chưa rang, chưa khử caffeine');
  });

  it('StrictMode: seller sửa tay tên đã tự điền rồi đổi mã HS thì giữ tên', async () => {
    stubHs([RICE, COFFEE]);
    render(
      <React.StrictMode>
        <Harness initial={[emptyDraft()]} />
      </React.StrictMode>
    );
    await pick('gao', /1006\.30/);
    fireEvent.change(within(card()).getByLabelText(/Tên sản phẩm/), { target: { value: 'Gạo ST25 đặc biệt' } });
    await pick('ca phe', /0901\.11/);
    expect(latest[0].name).toBe('Gạo ST25 đặc biệt');
  });

  it('tên HS dài 300 ký tự: cắt xuống 255 ký tự', async () => {
    const LONG_NAME = {
      ...COFFEE,
      name_vi: 'A'.repeat(300),
    };
    stubHs([LONG_NAME]);
    render(<Harness initial={[emptyDraft()]} />);
    await pick('ca phe', /0901\.11/);
    expect(latest[0].name).toBe('A'.repeat(255));
    expect(latest[0].name.length).toBe(255);
  });

  it('chọn mã HS: hiện thuế MFN so với EVFTA ngay trong thẻ sản phẩm', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (req: Request) => {
        const path = new URL(req.url).pathname;
        const body =
          path === '/api/exporter/tariff-preview'
            ? {
                status: 'ok',
                hs_code: '100630',
                hs_formatted: '1006.30',
                mfn_rate: '12.0000',
                evfta_rate: '6.0000',
                staging_category: null,
                zero_from: null,
                quota_note: null,
                condition_note: null,
                quota_note_en: null,
                condition_note_en: null,
                source_url: null,
              }
            : [RICE];
        return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
      }),
    );
    render(<Harness initial={[emptyDraft()]} />);
    fireEvent.change(within(card()).getByRole('combobox', { name: /Mã HS/ }), { target: { value: 'gao' } });
    fireEvent.click(await screen.findByRole('option', { name: /1006\.30/ }));
    expect(await within(card()).findByText(/MFN 12%/)).toBeInTheDocument();
    expect(within(card()).getByText(/EVFTA 6%/)).toBeInTheDocument();
  });

  it('chưa chọn mã HS: không gọi tra thuế', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<Harness initial={[emptyDraft()]} />);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
