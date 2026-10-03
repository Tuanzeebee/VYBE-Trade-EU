import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchShippingHints, insuranceFromRate } from '@/lib/shippingHintsApi';

describe('insuranceFromRate', () => {
  it('tính phí bảo hiểm = tỷ lệ % × giá trị lô hàng, 2 chữ số', () => {
    expect(insuranceFromRate('2.0000', 50000)).toBe('1000.00');
    expect(insuranceFromRate('0.1500', 50000)).toBe('75.00');
  });
  it('không NaN khi thiếu giá trị', () => {
    expect(insuranceFromRate('2.0000', 0)).toBe('0.00');
  });
});

describe('fetchShippingHints', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('trả dữ liệu khi server ok', async () => {
    const body = { freight: [], insurance: null };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })));
    expect(await fetchShippingHints('DE')).toEqual(body);
  });

  it('lỗi mạng hoặc 500 → null, không ném', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await fetchShippingHints('DE')).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
    expect(await fetchShippingHints('DE')).toBeNull();
  });
});
