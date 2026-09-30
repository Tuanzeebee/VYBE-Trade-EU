// Máy tính quy tắc xuất xứ (C4): gọi POST /api/public/roo. Số tiền luôn là CHUỖI, không qua float.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type RooResult = components['schemas']['RooOut'];
export type MaterialBody = components['schemas']['MaterialIn'];

export const MAX_MATERIALS = 50;

export interface MaterialDraft {
  origin: string;
  value: string;
  hs: string;
}

export const emptyMaterial = (): MaterialDraft => ({ origin: '', value: '', hs: '' });

/** '3901.10' / '3901 10' → '390110'; không phải 6–8 chữ số → null. */
export function normalizeHs(raw: string): string | null {
  const digits = raw.replace(/[\s.]/g, '');
  return /^[0-9]{6,8}$/.test(digits) ? digits : null;
}

export type RooError = 'rate_limited' | 'invalid' | 'network';
export type RooOutcome = { ok: true; data: RooResult } | { ok: false; error: RooError };

export async function calculateRoo(input: {
  hsCode: string;
  exWorksValue: string | null;
  materialsDeclared: boolean;
  materials: MaterialBody[];
}): Promise<RooOutcome> {
  try {
    const { data, response } = await createApiClient().POST('/api/public/roo', {
      body: {
        hs_code: input.hsCode,
        ex_works_value: input.exWorksValue,
        materials_declared: input.materialsDeclared,
        materials: input.materials,
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
