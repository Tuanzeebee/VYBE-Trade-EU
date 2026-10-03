// Báo giá RFQ (U8): seller gửi báo giá có cấu trúc, buyer chấp nhận / từ chối. Tiền luôn là CHUỖI.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type Quote = components['schemas']['QuoteOut'];
export type QuoteInput = components['schemas']['QuoteIn'];
export type BalanceTerms = QuoteInput['balance_terms'];

export const DEPOSIT_PRESETS = [0, 30, 50, 100] as const;

export const BALANCE_TERMS: { code: BalanceTerms; label: string }[] = [
  { code: 'tt_before_shipment', label: 'Chuyển khoản (T/T) phần còn lại trước khi giao hàng' },
  { code: 'against_bl_copy', label: 'Chuyển khoản (T/T) khi nhận bản sao vận đơn (B/L)' },
  { code: 'lc_at_sight', label: 'Thư tín dụng trả ngay (L/C at sight)' },
  { code: 'none', label: 'Không còn phần phải trả (đã đặt cọc 100%)' },
];

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  sent: 'Đang chờ buyer',
  accepted: 'Đã chấp nhận',
  declined: 'Bị từ chối',
  withdrawn: 'Đã rút',
  superseded: 'Đã thay bằng báo giá mới',
  expired: 'Hết hiệu lực',
};

export const balanceLabel = (code: BalanceTerms) => BALANCE_TERMS.find((b) => b.code === code)?.label ?? code;

const CENTS = /^(\d{1,12})(?:\.(\d{1,2}))?$/;
const toHundredths = (raw: string): bigint | null => {
  const match = CENTS.exec(raw.trim());
  return match ? BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0')) : null;
};
const halfUp = (value: bigint, divisor: bigint) => (value * 2n + divisor) / (divisor * 2n);
const fromCents = (cents: bigint) => `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;

/** Xem trước tổng tiền và tiền cọc (số nguyên, làm tròn half-up như backend); null nếu nhập chưa hợp lệ. */
export function previewAmounts(unitPrice: string, quantity: string, depositPercent: number): { total: string; deposit: string } | null {
  const price = toHundredths(unitPrice);
  const qty = toHundredths(quantity);
  if (price === null || qty === null || price === 0n || qty === 0n) return null;
  const total = halfUp(price * qty, 100n);
  const deposit = halfUp(total * BigInt(depositPercent), 100n);
  return { total: fromCents(total), deposit: fromCents(deposit) };
}

/** null = lỗi tải. */
export async function listQuotes(rfqId: string): Promise<Quote[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/me/rfqs/{rfq_id}/quotes', { params: { path: { rfq_id: rfqId } } });
    return response.ok && Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export type QuoteError = 'terms' | 'closed' | 'accepted' | 'expired' | 'invalid' | 'network';
export type QuoteOutcome = { ok: true; data: Quote } | { ok: false; error: QuoteError };

const codeOf = (error: unknown): string | undefined => (error as { error?: { code?: string } } | undefined)?.error?.code;

function failure(status: number, error: unknown): QuoteOutcome {
  const code = codeOf(error);
  if (code === 'balance_terms_mismatch' || code === 'valid_until_in_past' || code === 'valid_until_too_far') return { ok: false, error: 'terms' };
  if (code === 'rfq_closed') return { ok: false, error: 'closed' };
  if (code === 'quote_already_accepted') return { ok: false, error: 'accepted' };
  if (code === 'quote_expired') return { ok: false, error: 'expired' };
  if (status === 422 || status === 409) return { ok: false, error: 'invalid' };
  return { ok: false, error: 'network' };
}

export async function createQuote(rfqId: string, body: QuoteInput): Promise<QuoteOutcome> {
  try {
    const { data, error, response } = await createApiClient().POST('/api/exporter/rfqs/{rfq_id}/quotes', {
      params: { path: { rfq_id: rfqId } },
      body,
    });
    return response.ok && data ? { ok: true, data } : failure(response.status, error);
  } catch {
    return { ok: false, error: 'network' };
  }
}

export async function decideQuote(quoteId: string, decision: 'accept' | 'decline', reason?: string): Promise<QuoteOutcome> {
  try {
    const { data, error, response } = await createApiClient().POST('/api/buyer/quotes/{quote_id}/decision', {
      params: { path: { quote_id: quoteId } },
      body: { decision, reason: reason?.trim() || null },
    });
    return response.ok && data ? { ok: true, data } : failure(response.status, error);
  } catch {
    return { ok: false, error: 'network' };
  }
}

export async function withdrawQuote(quoteId: string): Promise<QuoteOutcome> {
  try {
    const { data, error, response } = await createApiClient().POST('/api/exporter/quotes/{quote_id}/withdraw', {
      params: { path: { quote_id: quoteId } },
    });
    return response.ok && data ? { ok: true, data } : failure(response.status, error);
  } catch {
    return { ok: false, error: 'network' };
  }
}
