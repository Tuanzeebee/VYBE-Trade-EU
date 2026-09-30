// Xếp hạng thị trường EU: gọi POST /api/public/markets. Số tiền luôn là CHUỖI, không qua float.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type MarketsResult = components['schemas']['MarketsOut'];
export type MarketRow = components['schemas']['MarketRowOut'];
export type RooStatus = 'pass' | 'fail' | 'inconclusive';

export type MarketsError = 'rate_limited' | 'invalid' | 'network';
export type MarketsOutcome = { ok: true; data: MarketsResult } | { ok: false; error: MarketsError };

export const isRooStatus = (value: string | undefined): value is RooStatus =>
  value === 'pass' || value === 'fail' || value === 'inconclusive';

export async function rankMarkets(input: {
  hsCode: string;
  productValue: string;
  rooStatus?: RooStatus;
}): Promise<MarketsOutcome> {
  try {
    const { data, response } = await createApiClient().POST('/api/public/markets', {
      body: {
        hs_code: input.hsCode,
        product_value: input.productValue,
        ...(input.rooStatus ? { roo_status: input.rooStatus } : {}),
      },
    });
    if (response.status === 429) return { ok: false, error: 'rate_limited' };
    if (response.status === 422) return { ok: false, error: 'invalid' };
    if (!response.ok || !data) return { ok: false, error: 'network' };
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'network' };
  }
}
