// Hội thoại theo RFQ và tin nhắn (F2, F3). Polling do component đảm nhiệm (cursor `after`).
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
