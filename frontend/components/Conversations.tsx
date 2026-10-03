'use client';

// Hội thoại theo RFQ (F2) với dịch máy từng tin (F3). Cập nhật gần thời gian thực bằng polling.
// Tin của bên kia hiện bản dịch (nếu có) kèm nút xem bản gốc; nếu chưa dịch được thì hiện bản gốc.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDemoSession } from './app-shell/useDemoSession';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import {
  MESSAGE_POLL_MS,
  listConversations,
  listMessages,
  sendMessage,
  type Conversation,
  type Message,
} from '../lib/conversationsApi';

function Bubble({ message }: { message: Message }) {
  const { tr } = useLanguage();
  const [original, setOriginal] = useState(false);
  const shown = original ? message.body_original : message.body;
  return (
    <li className={`flex ${message.mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${message.mine ? 'bg-[#083832] text-white' : 'bg-slate-100 text-slate-900'}`}>
        <p className="whitespace-pre-line">{shown}</p>
        {message.translated && (
          <button
            type="button"
            onClick={() => setOriginal((v) => !v)}
            className={`mt-1 text-xs underline ${message.mine ? 'text-teal-100' : 'text-slate-600'}`}
          >
            {tr(original ? 'Xem bản dịch' : 'Xem bản gốc')}
          </button>
        )}
      </div>
    </li>
  );
}


function VerifiedTag({ verified }: { verified: boolean }) {
  const { tr } = useLanguage();
  return (
    <span data-testid="counterpart-verification" className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${verified ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
      {tr(verified ? 'Đã xác minh' : 'Chưa xác minh')}
    </span>
  );
}

function Thread({ conversation, onActivity }: { conversation: Conversation; onActivity: () => void }) {
  const { tr } = useLanguage();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const lastId = useRef<string | undefined>(undefined);
  const bottom = useRef<HTMLLIElement | null>(null);

  const merge = useCallback((incoming: Message[]) => {
    if (incoming.length === 0) return;
    lastId.current = incoming[incoming.length - 1].id;
    setMessages((current) => {
      const known = new Set((current ?? []).map((m) => m.id));
      return [...(current ?? []), ...incoming.filter((m) => !known.has(m.id))];
    });
  }, []);

  useEffect(() => {
    let active = true;
    lastId.current = undefined;
    setMessages(null);
    setFailed(false);
    listMessages(conversation.id).then((list) => {
      if (!active) return;
      setFailed(list === null);
      setMessages([]);
      if (list) merge(list);
      onActivity();
    });
    const timer = setInterval(async () => {
      const list = await listMessages(conversation.id, lastId.current);
      if (active && list && list.length > 0) {
        merge(list);
        onActivity();
      }
    }, MESSAGE_POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [conversation.id, merge, onActivity]);

  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: 'end' });
  }, [messages?.length]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    const sent = await sendMessage(conversation.id, body);
    setSending(false);
    if (sent) {
      setDraft('');
      merge([sent]);
      onActivity();
    } else {
      setError('Không gửi được tin nhắn. Vui lòng thử lại.');
    }
  };

  return (
    <section aria-label={tr('Nội dung hội thoại')} className="flex min-h-[24rem] flex-col rounded-2xl border border-slate-200 bg-white">
      <header className="border-b border-slate-100 p-4">
        <h2 className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
          {conversation.counterpart_name}
          <VerifiedTag verified={conversation.counterpart_verified} />
        </h2>
        <p className="text-xs text-slate-600">{conversation.product_name || tr('Tin nhắn trực tiếp')}</p>
      </header>
      {failed ? (
        <p role="alert" className="m-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr('Không tải được tin nhắn. Vui lòng thử lại.')}
        </p>
      ) : messages !== null && messages.length === 0 ? (
        <p role="status" className="m-4 text-sm text-slate-600">
          {tr('Chưa có tin nhắn. Hãy gửi lời chào đầu tiên; tin nhắn sẽ được dịch sang ngôn ngữ của người nhận.')}
        </p>
      ) : (
        <ul className="flex-1 space-y-2 overflow-y-auto p-4">
          {(messages ?? []).map((m) => (
            <Bubble key={m.id} message={m} />
          ))}
          <li ref={bottom} aria-hidden="true" />
        </ul>
      )}
      <form onSubmit={send} className="border-t border-slate-100 p-3">
        {error && (
          <p role="alert" className="mb-2 text-sm text-rose-700">
            {tr(error)}
          </p>
        )}
        <label htmlFor="message-body" className="sr-only">
          {tr('Tin nhắn')}
        </label>
        <div className="flex gap-2">
          <textarea
            id="message-body"
            rows={2}
            maxLength={4000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#083832]"
          />
          <button
            type="submit"
            disabled={sending || draft.trim() === ''}
            className="self-end rounded-xl bg-[#083832] px-4 py-2 text-sm font-semibold text-white hover:bg-[#062924] disabled:opacity-60"
          >
            {tr('Gửi')}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function Conversations() {
  const { tr } = useLanguage();
  const { user, ready } = useDemoSession();
  const params = useSearchParams();
  const [list, setList] = useState<Conversation[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await listConversations();
    setFailed(result === null);
    if (result) setList(result);
  }, []);

  useEffect(() => {
    if (ready && user) void refresh();
  }, [ready, user, refresh]);

  // ?rfq= hoặc ?c= chọn sẵn hội thoại; mặc định là hội thoại đầu tiên (mới nhất).
  useEffect(() => {
    if (!list || selected) return;
    const rfq = params.get('rfq');
    const id = params.get('c');
    const wanted = list.find((c) => (rfq && c.rfq_id === rfq) || (id && c.id === id)) ?? list[0];
    if (wanted) setSelected(wanted.id);
  }, [list, selected, params]);

  if (!ready) return null;
  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <h1 className="text-2xl font-extrabold text-slate-900">{tr('Hội thoại')}</h1>
        <p role="status" className="mt-6 rounded-xl bg-white p-6 text-sm text-slate-700">
          {tr('Đăng nhập để xem hội thoại của bạn.')}{' '}
          <Link href="/login" className="font-semibold underline">
            {tr('Đăng nhập')}
          </Link>
        </p>
      </main>
    );
  }

  const current = list?.find((c) => c.id === selected) ?? null;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{tr('Hội thoại')}</h1>
      {failed ? (
        <p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          {tr('Không tải được danh sách hội thoại. Vui lòng thử lại.')}
        </p>
      ) : list !== null && list.length === 0 ? (
        <p role="status" className="mt-6 rounded-xl bg-white p-6 text-sm text-slate-700">
          {tr('Chưa có hội thoại nào. Nhắn tin cho nhà cung cấp từ hồ sơ của họ, hoặc gửi yêu cầu báo giá.')}
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-[18rem_1fr]">
          <ul aria-label={tr('Danh sách hội thoại')} className="space-y-2">
            {(list ?? []).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelected(c.id)}
                  aria-current={c.id === selected}
                  className={`w-full rounded-xl border p-3 text-left text-sm ${c.id === selected ? 'border-[#083832] bg-teal-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{c.counterpart_name}</span>
                    {c.unread_count > 0 && (
                      <span data-testid="unread" className="rounded-full bg-rose-600 px-2 text-xs font-bold text-white">
                        {c.unread_count}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-slate-600">{c.product_name || tr('Tin nhắn trực tiếp')}</span>
                  {c.last_message && <span className="mt-1 block truncate text-xs text-slate-500">{c.last_message}</span>}
                </button>
              </li>
            ))}
          </ul>
          {current && <Thread key={current.id} conversation={current} onActivity={refresh} />}
        </div>
      )}
    </main>
  );
}
