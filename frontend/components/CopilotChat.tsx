'use client';

// Trợ lý AI tuân thủ (D2, D3). Khách dùng không cần đăng nhập.
// Câu trả lời luôn kèm trích dẫn và mức tin cậy; ngoài phạm vi hoặc tin cậy thấp thì đưa nút chuyển chuyên gia.
import React, { useState } from 'react';
import HsCodePicker, { type HsCodeOption } from './HsCodePicker';
import { useLanguage } from '../context/LanguageContext';
import { askCopilot, escalate, sendFeedback, type AskResult, type Confidence, type CopilotError } from '../lib/copilotApi';

const ERRORS: Record<CopilotError, string> = {
  rate_limited: 'Bạn đã hỏi quá nhiều lần. Vui lòng thử lại sau một phút.',
  invalid: 'Câu hỏi chưa hợp lệ. Vui lòng nhập ít nhất 3 ký tự.',
  network: 'Không kết nối được máy chủ. Vui lòng thử lại.',
};

const BADGES: Record<Confidence, { label: string; className: string }> = {
  high: { label: 'Độ tin cậy cao', className: 'bg-emerald-100 text-emerald-900' },
  medium: { label: 'Độ tin cậy trung bình', className: 'bg-amber-100 text-amber-900' },
  low: { label: 'Độ tin cậy thấp', className: 'bg-orange-100 text-orange-900' },
  out_of_scope: { label: 'Ngoài phạm vi', className: 'bg-slate-200 text-slate-900' },
};

type Step = 'idle' | 'sent' | 'error';

function Answer({ data }: { data: AskResult }) {
  const { tr } = useLanguage();
  const badge = BADGES[data.confidence];
  const [helpful, setHelpful] = useState<'none' | 'sent' | 'error'>('none');
  const [email, setEmail] = useState('');
  const [ticket, setTicket] = useState<'none' | 'sending' | 'sent' | 'need_email' | 'error'>('none');

  const rate = async (value: boolean) => {
    const outcome = await sendFeedback(data.query_id, value);
    setHelpful(outcome.ok ? 'sent' : 'error');
  };
  const requestExpert = async () => {
    setTicket('sending');
    const outcome = await escalate(data.query_id, email.trim() || undefined);
    if (outcome.ok) setTicket('sent');
    else setTicket(outcome.error === 'invalid' ? 'need_email' : 'error');
  };

  return (
    <section aria-label={tr('Câu trả lời')} className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${badge.className}`}>{tr(badge.label)}</span>
      {data.confidence === 'out_of_scope' ? (
        <p className="mt-3 text-base font-semibold text-slate-800">
          {tr('Chúng tôi chưa đủ căn cứ trong tài liệu đã duyệt để trả lời câu hỏi này.')}
        </p>
      ) : (
        <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-slate-900">{data.answer}</p>
      )}

      {data.citations.length > 0 && (
        <div className="mt-5">
          <h2 className="text-sm font-bold text-slate-700">{tr('Nguồn trích dẫn')}</h2>
          <ol className="mt-2 space-y-2">
            {data.citations.map((c, index) => (
              <li key={c.chunk_id} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-800">
                <span className="font-semibold">[{index + 1}]</span> {c.title} — {c.heading}
                <div className="text-xs text-slate-600">
                  {c.source_url ? (
                    <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="underline">
                      {c.source}
                    </a>
                  ) : (
                    c.source
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="mt-5 text-xs text-slate-600">
        {tr('Trợ lý chỉ trả lời từ tài liệu đã được duyệt và không thay thế tư vấn pháp lý.')}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        {helpful === 'sent' ? (
          <p role="status" className="text-sm text-slate-700">
            {tr('Cảm ơn phản hồi của bạn.')}
          </p>
        ) : (
          <>
            <span className="text-sm font-semibold text-slate-700">{tr('Câu trả lời có hữu ích không?')}</span>
            <button type="button" onClick={() => rate(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              {tr('Hữu ích')}
            </button>
            <button type="button" onClick={() => rate(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              {tr('Chưa hữu ích')}
            </button>
            {helpful === 'error' && (
              <p role="alert" className="w-full text-sm text-rose-700">
                {tr('Không gửi được phản hồi. Vui lòng thử lại.')}
              </p>
            )}
          </>
        )}
      </div>

      {data.can_escalate && (
        <div className="mt-4 rounded-xl bg-amber-50 p-4">
          {ticket === 'sent' ? (
            <p role="status" className="text-sm font-semibold text-amber-900">
              {tr('Đã chuyển câu hỏi cho chuyên gia. Chúng tôi sẽ liên hệ qua email của bạn.')}
            </p>
          ) : (
            <>
              <label htmlFor="copilot-email" className="block text-sm font-semibold text-amber-900">
                {tr('Email nhận phản hồi từ chuyên gia')}
              </label>
              <input
                id="copilot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900"
              />
              <button
                type="button"
                onClick={requestExpert}
                disabled={ticket === 'sending'}
                className="mt-3 rounded-xl bg-[#083832] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#062924] disabled:opacity-60"
              >
                {tr('Chuyển chuyên gia')}
              </button>
              {ticket === 'need_email' && (
                <p role="alert" className="mt-2 text-sm text-rose-700">
                  {tr('Vui lòng nhập email hợp lệ để chuyên gia liên hệ.')}
                </p>
              )}
              {ticket === 'error' && (
                <p role="alert" className="mt-2 text-sm text-rose-700">
                  {tr('Không gửi được yêu cầu. Vui lòng thử lại.')}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

export default function CopilotChat() {
  const { tr, language } = useLanguage();
  const [question, setQuestion] = useState('');
  const [hs, setHs] = useState<HsCodeOption | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AskResult | null>(null);
  const [step, setStep] = useState<Step>('idle');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResult(null);
    setError('');
    if (question.trim().length < 3) return setError(ERRORS.invalid);
    setBusy(true);
    const outcome = await askCopilot({ question: question.trim(), hsCode: hs?.code, language: language === 'en' ? 'en' : 'vi' });
    setBusy(false);
    if (outcome.ok) {
      setResult(outcome.data);
      setStep('sent');
    } else {
      setError(ERRORS[outcome.error]);
      setStep('error');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8" data-step={step}>
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{tr('Trợ lý tuân thủ EVFTA')}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {tr('Hỏi về thuế, quy tắc xuất xứ và thủ tục EVFTA. Mọi câu trả lời đều có trích dẫn từ tài liệu đã được duyệt.')}
      </p>
      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <div>
          <label htmlFor="copilot-question" className="block text-sm font-semibold text-slate-700">
            {tr('Câu hỏi của bạn')}
          </label>
          <textarea
            id="copilot-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={1000}
            rows={4}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]"
          />
          <p className="mt-1 text-xs text-slate-600">{tr('Vui lòng không nhập thông tin cá nhân vào câu hỏi.')}</p>
        </div>
        <HsCodePicker label={tr('Mã HS liên quan (không bắt buộc)')} value={hs} onChange={setHs} />
        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {tr(error)}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[#083832] px-5 py-3 text-sm font-semibold text-white hover:bg-[#062924] disabled:opacity-60 sm:w-auto"
        >
          {tr(busy ? 'Đang trả lời...' : 'Hỏi trợ lý')}
        </button>
      </form>
      {result && <Answer key={result.query_id} data={result} />}
    </div>
  );
}
