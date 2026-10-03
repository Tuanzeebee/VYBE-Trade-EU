// Trợ lý (D2, D3): gọi /api/public/copilot/*. Không có phiên thì vẫn dùng được.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type AskResult = components['schemas']['AskOut'];
export type Citation = components['schemas']['CitationOut'];
export type Confidence = AskResult['confidence'];

export type CopilotError = 'rate_limited' | 'invalid' | 'network';
export type AskOutcome = { ok: true; data: AskResult } | { ok: false; error: CopilotError };
export type SimpleOutcome = { ok: true } | { ok: false; error: CopilotError };

const fail = (status: number): { ok: false; error: CopilotError } => ({
  ok: false,
  error: status === 429 ? 'rate_limited' : status === 422 ? 'invalid' : 'network',
});

export async function askCopilot(input: { question: string; hsCode?: string; language: 'vi' | 'en' }): Promise<AskOutcome> {
  try {
    const { data, response } = await createApiClient().POST('/api/public/copilot/ask', {
      body: { question: input.question, language: input.language, ...(input.hsCode ? { hs_code: input.hsCode } : {}) },
    });
    if (!response.ok || !data) return fail(response.status);
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'network' };
  }
}

export async function sendFeedback(queryId: string, wasHelpful: boolean): Promise<SimpleOutcome> {
  try {
    const { response } = await createApiClient().POST('/api/public/copilot/queries/{query_id}/feedback', {
      params: { path: { query_id: queryId } },
      body: { was_helpful: wasHelpful },
    });
    return response.ok ? { ok: true } : fail(response.status);
  } catch {
    return { ok: false, error: 'network' };
  }
}

export async function escalate(queryId: string, contactEmail?: string): Promise<SimpleOutcome> {
  try {
    const { response } = await createApiClient().POST('/api/public/copilot/queries/{query_id}/escalate', {
      params: { path: { query_id: queryId } },
      body: contactEmail ? { contact_email: contactEmail } : {},
    });
    return response.ok ? { ok: true } : fail(response.status);
  } catch {
    return { ok: false, error: 'network' };
  }
}
