import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyDraft, saveProduct } from '@/lib/productsApi';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('giới hạn gói Basic (N8)', () => {
  it('server trả 409 product_limit_reached → thông báo nâng gói, không phải lỗi chung', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(409, { error: { code: 'product_limit_reached', message: 'limit' } })));
    const draft = {
      ...emptyDraft(),
      name: 'Gạo thơm',
      hs: { code: '100630', formatted: '1006.30', name_vi: 'Gạo xát', name_en: 'Rice', chapter: '10', category: 'agriculture', supported: true },
      unit: 'kg',
      moqUnit: 'kg',
      tiers: [{ minQuantity: '1', unitPrice: '10' }],
    } as never;
    await expect(saveProduct(draft)).rejects.toThrow('Gói hiện tại cho phép số sản phẩm có hạn. Nâng cấp gói để thêm sản phẩm.');
  });
});
