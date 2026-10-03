// Hội thoại (theo RFQ hoặc trực tiếp — U7) và tin nhắn (F2, F3). Polling do component đảm nhiệm (cursor `after`).
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type Conversation = components['schemas']['ConversationOut'];
export type Message = components['schemas']['MessageOut'];

export const MESSAGE_POLL_MS = 7_000;

/** null = lỗi tải (giao diện báo lỗi thay vì hiện rỗng). */
export async function listConversations(): Promise<Conversation[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/me/conversations');
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function listMessages(conversationId: string, after?: string): Promise<Message[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/me/conversations/{conversation_id}/messages', {
      params: { path: { conversation_id: conversationId }, query: after ? { after } : {} },
    });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function sendMessage(conversationId: string, body: string): Promise<Message | null> {
  try {
    const { data, response } = await createApiClient().POST('/api/me/conversations/{conversation_id}/messages', {
      params: { path: { conversation_id: conversationId } },
      body: { body },
    });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export type StartError = 'rate_limited' | 'not_found' | 'company_required' | 'self' | 'invalid' | 'unauthorized' | 'network';
export type StartOutcome = { ok: true; data: Conversation } | { ok: false; error: StartError };

const codeOf = (error: unknown): string | undefined => (error as { error?: { code?: string } } | undefined)?.error?.code;

/** U7: nhắn tin trực tiếp tới nhà cung cấp (theo slug hồ sơ công khai); đã có hội thoại thì gửi tiếp. */
export async function startConversation(supplierSlug: string, body: string): Promise<StartOutcome> {
  try {
    const { data, error, response } = await createApiClient().POST('/api/me/conversations', {
      body: { supplier_slug: supplierSlug, body },
    });
    if (response.ok && data) return { ok: true, data };
    if (response.status === 401 || response.status === 403) return { ok: false, error: 'unauthorized' };
    if (response.status === 404) return { ok: false, error: 'not_found' };
    if (response.status === 409 && codeOf(error) === 'company_required') return { ok: false, error: 'company_required' };
    if (response.status === 422 && codeOf(error) === 'cannot_message_self') return { ok: false, error: 'self' };
    if (response.status === 422) return { ok: false, error: 'invalid' };
    if (response.status === 429) return { ok: false, error: 'rate_limited' };
    return { ok: false, error: 'network' };
  } catch {
    return { ok: false, error: 'network' };
  }
}
