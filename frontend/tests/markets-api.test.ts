import { describe, expect, it, vi } from 'vitest';
import { rankMarkets } from '../lib/marketsApi';

const post = vi.fn();
vi.mock('../lib/api/client', () => ({ createApiClient: () => ({ POST: post }) }));

describe('rankMarkets', () => {
  it('gửi số tiền dạng chuỗi và bỏ roo_status khi chưa kiểm tra', async () => {
    post.mockResolvedValue({ data: { rows: [] }, response: { status: 200, ok: true } });
    const outcome = await rankMarkets({ hsCode: '03061792', productValue: '100000' });
    expect(outcome.ok).toBe(true);
    expect(post).toHaveBeenCalledWith('/api/public/markets', {
      body: { hs_code: '03061792', product_value: '100000' },
    });
  });

  it('gửi roo_status khi có', async () => {
    post.mockResolvedValue({ data: { rows: [] }, response: { status: 200, ok: true } });
    await rankMarkets({ hsCode: '03061792', productValue: '100000', rooStatus: 'pass' });
    expect(post).toHaveBeenLastCalledWith('/api/public/markets', {
      body: { hs_code: '03061792', product_value: '100000', roo_status: 'pass' },
    });
  });

  it.each([
    [429, 'rate_limited'],
    [422, 'invalid'],
    [500, 'network'],
  ])('HTTP %i → %s', async (status, error) => {
    post.mockResolvedValue({ data: undefined, response: { status, ok: false } });
    expect(await rankMarkets({ hsCode: '03061792', productValue: '1' })).toEqual({ ok: false, error });
  });

  it('lỗi mạng → network', async () => {
    post.mockRejectedValue(new Error('down'));
    expect(await rankMarkets({ hsCode: '03061792', productValue: '1' })).toEqual({ ok: false, error: 'network' });
  });
});
