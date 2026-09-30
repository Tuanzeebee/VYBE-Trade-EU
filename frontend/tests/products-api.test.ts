import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  draftFromProduct,
  draftToBody,
  emptyDraft,
  formatMoq,
  formatPrice,
  getMyProducts,
  syncProducts,
  uploadProductImage,
  UNITS,
  type ProductDraft,
  type ProductOut,
} from '@/lib/productsApi';

const RICE = { code: '100630', formatted: '1006.30', name_vi: 'Gạo xát', name_en: 'Semi-milled or wholly milled rice' };

const draft = (patch: Partial<ProductDraft> = {}): ProductDraft => ({
  ...emptyDraft(),
  name: 'Gạo thơm Jasmine',
  hs: RICE,
  priceMin: '480',
  unit: 'tonne',
  moq: '25',
  moqUnit: 'tonne',
  ...patch,
});

const SERVER = (id: string, patch: Partial<ProductOut> = {}): ProductOut => ({
  id,
  name: 'Gạo thơm Jasmine',
  hs_code: '100630',
  hs_formatted: '1006.30',
  hs_name_vi: 'Gạo xát',
  hs_name_en: 'Semi-milled or wholly milled rice',
  description_vi: null,
  description_en: null,
  price_min: '480.00',
  price_max: '560.50',
  currency: 'USD',
  unit: 'tonne',
  moq: '25.00',
  moq_unit: 'tonne',
  is_active: true,
  approval_status: 'approved',
  images: [{ key: 'products/c/1.png', url: 'https://cdn/1.png' }],
  created_at: '2026-09-29T00:00:00Z',
  ...patch,
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('draftToBody — bản nháp → ProductIn', () => {
  it('ánh xạ đủ trường; số tiền giữ nguyên dạng chuỗi (không qua float)', () => {
    const body = draftToBody(
      draft({
        priceMin: ' 480.50 ',
        priceMax: '560',
        currency: 'EUR',
        unit: 'tonne',
        moq: '25',
        moqUnit: 'container_20ft',
        descriptionVi: ' Gạo thơm ',
        descriptionEn: '',
        isActive: false,
        images: [{ key: 'products/c/a.png', url: 'blob:x' }],
      }),
    );
    expect(body).toEqual({
      name: 'Gạo thơm Jasmine',
      hs_code: '100630',
      description_vi: 'Gạo thơm',
      description_en: null,
      price_min: '480.50',
      price_max: '560',
      currency: 'EUR',
      unit: 'tonne',
      moq: '25',
      moq_unit: 'container_20ft',
      is_active: false,
      image_keys: ['products/c/a.png'],
    });
  });

  it('giá cao nhất là tùy chọn: để trống → null', () => {
    expect(draftToBody(draft()).price_max).toBeNull();
  });

  it.each([
    [{ priceMin: '' }, 'chưa nhập giá'],
    [{ unit: '' }, 'chưa chọn đơn vị giá'],
    [{ moq: '' }, 'chưa nhập MOQ'],
    [{ moqUnit: '' }, 'chưa chọn đơn vị MOQ'],
  ] as [Partial<ProductDraft>, string][])('trường bắt buộc bị bỏ trống %j → lỗi', (patch, message) => {
    expect(() => draftToBody(draft(patch))).toThrow(message);
  });

  it('thiếu mã HS → lỗi rõ ràng, không thể lưu', () => {
    expect(() => draftToBody(draft({ hs: null }))).toThrow('Sản phẩm "Gạo thơm Jasmine" chưa chọn mã HS.');
  });

  it('thiếu tên → lỗi', () => {
    expect(() => draftToBody(draft({ name: '   ' }))).toThrow('Mỗi sản phẩm cần có tên.');
  });

  it.each(['-1', '0', 'abc', '1e6', '10.999', '1,5', '1000000000000', '1 000', '.5', '5.'])(
    'giá không hợp lệ %s bị chặn trước khi gửi',
    (bad) => {
      expect(() => draftToBody(draft({ priceMin: bad }))).toThrow(/Giá thấp nhất không hợp lệ/);
    },
  );

  it('MOQ không hợp lệ bị chặn', () => {
    expect(() => draftToBody(draft({ moq: '0' }))).toThrow(/MOQ không hợp lệ/);
  });

  it('giá thấp nhất lớn hơn giá cao nhất bị chặn; bằng nhau thì được', () => {
    expect(() => draftToBody(draft({ priceMin: '600', priceMax: '500' }))).toThrow(
      'Giá thấp nhất không được lớn hơn giá cao nhất.',
    );
    expect(draftToBody(draft({ priceMin: '500', priceMax: '500' })).price_max).toBe('500');
  });
});

describe('draftFromProduct / emptyDraft', () => {
  it('sản phẩm từ server → bản nháp có id và ảnh', () => {
    const d = draftFromProduct(SERVER('p-1'));
    expect(d).toMatchObject({
      id: 'p-1',
      name: 'Gạo thơm Jasmine',
      priceMin: '480.00',
      priceMax: '560.50',
      currency: 'USD',
      unit: 'tonne',
      moq: '25.00',
      moqUnit: 'tonne',
      isActive: true,
    });
    expect(d.hs).toMatchObject({ code: '100630', formatted: '1006.30' });
    expect(d.images).toEqual([{ key: 'products/c/1.png', url: 'https://cdn/1.png' }]);
  });

  it('bản nháp trống không có mã HS và có key cục bộ khác nhau', () => {
    const a = emptyDraft();
    const b = emptyDraft();
    expect(a.hs).toBeNull();
    expect(a.id).toBeUndefined();
    expect(a.key).not.toBe(b.key);
    expect(a.currency).toBe('USD');
    expect(a.isActive).toBe(true);
  });
});

describe('định dạng hiển thị', () => {
  it('giá, đơn vị và MOQ', () => {
    expect(formatPrice(SERVER('p'))).toBe('480.00 – 560.50 USD / Tấn');
    expect(formatPrice(SERVER('p', { price_max: null }))).toBe('Từ 480.00 USD / Tấn');
    expect(formatPrice(SERVER('p', { price_min: null }))).toBe('Đến 560.50 USD / Tấn');
    expect(formatPrice(SERVER('p', { price_min: null, price_max: null }))).toBe('');
    expect(formatMoq(SERVER('p'))).toBe('25.00 Tấn');
    expect(formatMoq(SERVER('p', { moq: null }))).toBe('');
  });

  it('nhận hàm dịch cho chữ Từ/Đến và tên đơn vị (giao diện tiếng Anh)', () => {
    const t = (text: string) => ({ Từ: 'From', Đến: 'Up to', Tấn: 'Tonne' })[text] ?? text;
    expect(formatPrice(SERVER('p', { price_max: null }), t)).toBe('From 480.00 USD / Tonne');
    expect(formatPrice(SERVER('p', { price_min: null }), t)).toBe('Up to 560.50 USD / Tonne');
    expect(formatPrice(SERVER('p'), t)).toBe('480.00 – 560.50 USD / Tonne');
    expect(formatMoq(SERVER('p'), t)).toBe('25.00 Tonne');
  });

  it('bảng đơn vị khớp backend', () => {
    expect(UNITS.map((u) => u.code)).toEqual(['kg', 'tonne', 'piece', 'carton', 'liter', 'container_20ft', 'container_40ft']);
  });
});

describe('syncProducts', () => {
  afterEach(() => vi.unstubAllGlobals());

  function serve(existing: ProductOut[], failOn?: (method: string, path: string) => Response | undefined) {
    const calls: { method: string; path: string; body: unknown }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (req: Request) => {
        const path = new URL(req.url).pathname;
        const body = req.method === 'GET' || req.method === 'DELETE' ? null : await req.clone().json();
        calls.push({ method: req.method, path, body });
        const forced = failOn?.(req.method, path);
        if (forced) return forced;
        if (req.method === 'GET') return json(200, existing);
        if (req.method === 'DELETE') return new Response(null, { status: 204 });
        const id = path.split('/').pop() ?? 'new';
        return json(req.method === 'POST' ? 201 : 200, SERVER(req.method === 'POST' ? 'created' : id));
      }),
    );
    return calls;
  }

  it('sản phẩm mới → POST; đã có → PATCH; đã bỏ → DELETE', async () => {
    const calls = serve([SERVER('keep'), SERVER('drop')]);
    await syncProducts([draft({ id: 'keep', key: 'keep' }), draft({ name: 'Mới' })]);
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'GET /api/exporter/products',
      'PATCH /api/exporter/products/keep',
      'POST /api/exporter/products',
      'DELETE /api/exporter/products/drop',
    ]);
    expect(calls[2].body).toMatchObject({ name: 'Mới', hs_code: '100630' });
  });

  it('kiểm tra hợp lệ toàn bộ TRƯỚC khi ghi: một sản phẩm thiếu mã HS thì không gọi API nào', async () => {
    const calls = serve([]);
    await expect(syncProducts([draft(), draft({ name: 'Thiếu HS', hs: null })])).rejects.toThrow('chưa chọn mã HS');
    expect(calls).toEqual([]);
  });

  it('server từ chối (422) → lỗi nêu tên sản phẩm', async () => {
    serve([], (method) => (method === 'POST' ? json(422, { error: { code: 'invalid_hs_code' } }) : undefined));
    await expect(syncProducts([draft({ name: 'Cà phê' })])).rejects.toThrow(
      'Sản phẩm "Cà phê" chưa hợp lệ. Vui lòng kiểm tra mã HS, giá và ảnh.',
    );
  });

  it('không tải được danh sách hiện có → không xóa/ghi gì thêm', async () => {
    const calls = serve([], (method) => (method === 'GET' ? json(500, {}) : undefined));
    await expect(syncProducts([draft()])).rejects.toThrow('Không kết nối được máy chủ');
    expect(calls).toHaveLength(1);
  });

  it('danh sách rỗng → xóa hết sản phẩm cũ', async () => {
    const calls = serve([SERVER('a'), SERVER('b')]);
    await syncProducts([]);
    expect(calls.filter((c) => c.method === 'DELETE').map((c) => c.path)).toEqual([
      '/api/exporter/products/a',
      '/api/exporter/products/b',
    ]);
  });
});

describe('getMyProducts', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('trả danh sách; chưa có công ty (404) → []; lỗi khác → null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(200, [SERVER('p')])));
    expect((await getMyProducts())?.map((p) => p.id)).toEqual(['p']);
    vi.stubGlobal('fetch', vi.fn(async () => json(404, {})));
    expect(await getMyProducts()).toEqual([]);
    vi.stubGlobal('fetch', vi.fn(async () => json(500, {})));
    expect(await getMyProducts()).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('network'))));
    expect(await getMyProducts()).toBeNull();
  });
});

describe('uploadProductImage', () => {
  afterEach(() => vi.unstubAllGlobals());

  const file = (type: string, size = 10) => new File([new Uint8Array(size)], 'a', { type });

  it('xin URL ký sẵn rồi PUT file kèm content-type, trả khóa và ảnh xem trước', async () => {
    const seen: { method: string; url: string; type: string | null }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (req: Request) => {
        seen.push({ method: req.method, url: req.url, type: req.headers.get('content-type') });
        if (new URL(req.url).pathname === '/api/uploads/presign') {
          return json(200, { upload_url: 'https://s3.test/put/products/c/1.png', key: 'products/c/1.png' });
        }
        return new Response(null, { status: 200 });
      }),
    );
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    const result = await uploadProductImage(file('image/png'));
    expect(result).toEqual({ key: 'products/c/1.png', url: 'blob:preview' });
    expect(seen[0]).toMatchObject({ method: 'POST' });
    expect(seen[1]).toEqual({ method: 'PUT', url: 'https://s3.test/put/products/c/1.png', type: 'image/png' });
  });

  it.each(['application/pdf', 'image/gif', ''])('loại file %s bị từ chối, không gọi mạng', async (type) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(uploadProductImage(file(type))).rejects.toThrow('Ảnh phải là PNG, JPEG hoặc WebP.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('file quá 5MB bị từ chối', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await expect(uploadProductImage(file('image/png', 5 * 1024 * 1024 + 1))).rejects.toThrow('Ảnh tối đa 5MB.');
  });

  it('kho lưu trữ lỗi → báo lỗi nhưng cho biết vẫn lưu được sản phẩm không ảnh', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (req: Request) =>
        new URL(req.url).pathname === '/api/uploads/presign'
          ? json(200, { upload_url: 'https://s3.test/x', key: 'products/c/1.png' })
          : new Response(null, { status: 503 }),
      ),
    );
    await expect(uploadProductImage(file('image/webp'))).rejects.toThrow(
      'Không tải được ảnh lên. Bạn vẫn có thể lưu sản phẩm không có ảnh.',
    );
  });

  it('không xin được URL ký sẵn (403/404/mạng) → cùng thông báo lỗi', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(404, {})));
    await expect(uploadProductImage(file('image/png'))).rejects.toThrow('Không tải được ảnh lên');
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('network'))));
    await expect(uploadProductImage(file('image/png'))).rejects.toThrow('Không tải được ảnh lên');
  });
});
