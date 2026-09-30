'use client';

// Báo giá của một RFQ (U8). Seller gửi báo giá có cấu trúc (đơn giá, Incoterm, đặt cọc %, điều khoản
// phần còn lại, thời gian giao, hiệu lực); buyer chấp nhận hoặc từ chối. Thanh toán vẫn diễn ra ngoài
// nền tảng — chấp nhận là đồng ý điều khoản, không phải thanh toán.
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { CURRENCIES, INCOTERMS, type Incoterm, type Rfq } from '../lib/rfqApi';
import {
  BALANCE_TERMS,
  DEPOSIT_PRESETS,
  QUOTE_STATUS_LABELS,
  balanceLabel,
  createQuote,
  decideQuote,
  listQuotes,
  previewAmounts,
  withdrawQuote,
  type BalanceTerms,
  type Quote,
  type QuoteError,
} from '../lib/quotesApi';
import { parseAmount } from '../lib/tariffApi';

const ERRORS: Record<QuoteError, string> = {
  terms: 'Điều khoản chưa hợp lệ: đặt cọc 100% thì không còn phần phải trả, và ngày hiệu lực phải trong 180 ngày tới.',
  closed: 'Yêu cầu báo giá đã đóng.',
  accepted: 'Buyer đã chấp nhận một báo giá cho yêu cầu này.',
  expired: 'Báo giá đã hết hiệu lực. Hãy đề nghị nhà cung cấp gửi báo giá mới.',
  invalid: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
  network: 'Không kết nối được máy chủ. Vui lòng thử lại.',
};

const STATUS_TONE: Record<string, string> = {
  sent: 'bg-teal-100 text-teal-900',
  accepted: 'bg-emerald-100 text-emerald-900',
  declined: 'bg-rose-100 text-rose-800',
  withdrawn: 'bg-slate-100 text-slate-700',
  superseded: 'bg-slate-100 text-slate-700',
  expired: 'bg-amber-100 text-amber-900',
};

const field =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]';
const label = 'block text-xs font-semibold text-slate-700';

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

function QuoteForm({ rfq, onSent }: { rfq: Rfq; onSent: () => void }) {
  const { tr } = useLanguage();
  const [unitPrice, setUnitPrice] = useState('');
  const [currency, setCurrency] = useState(rfq.currency);
  const [incoterm, setIncoterm] = useState<Incoterm>(rfq.incoterms);
  const [place, setPlace] = useState('');
  const [deposit, setDeposit] = useState<number>(30);
  const [balance, setBalance] = useState<BalanceTerms>('against_bl_copy');
  const [leadTime, setLeadTime] = useState('30');
  const [validUntil, setValidUntil] = useState(inDays(14));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const preview = previewAmounts(unitPrice, rfq.quantity, deposit);
  const chooseDeposit = (value: number) => {
    setDeposit(value);
    if (value === 100) setBalance('none');
    else if (balance === 'none') setBalance('against_bl_copy');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const price = parseAmount(unitPrice);
    if (!price) return setError('Đơn giá phải là số dương, tối đa 2 chữ số thập phân.');
    const days = Number(leadTime);
    if (!Number.isInteger(days) || days < 1 || days > 365) return setError('Thời gian giao hàng phải từ 1 đến 365 ngày.');
    setBusy(true);
    const outcome = await createQuote(rfq.id, {
      unit_price: price,
      currency,
      incoterm,
      named_place: place.trim() || null,
      deposit_percent: deposit,
      balance_terms: balance,
      lead_time_days: days,
      valid_until: validUntil,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (!outcome.ok) return setError(ERRORS[outcome.error]);
    onSent();
  };

  return (
    <form onSubmit={submit} noValidate aria-label={tr('Gửi báo giá')} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
      <div>
        <label htmlFor={`q-price-${rfq.id}`} className={label}>{tr(`Đơn giá (/${rfq.unit})`)}</label>
        <input id={`q-price-${rfq.id}`} inputMode="decimal" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={field} />
      </div>
      <div>
        <label htmlFor={`q-currency-${rfq.id}`} className={label}>{tr('Tiền tệ')}</label>
        <select id={`q-currency-${rfq.id}`} value={currency} onChange={(e) => setCurrency(e.target.value)} className={field}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`q-incoterm-${rfq.id}`} className={label}>{tr('Điều kiện giao hàng (Incoterms)')}</label>
        <select id={`q-incoterm-${rfq.id}`} value={incoterm} onChange={(e) => setIncoterm(e.target.value as Incoterm)} className={field}>
          {INCOTERMS.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`q-place-${rfq.id}`} className={label}>{tr('Địa điểm giao (không bắt buộc)')}</label>
        <input id={`q-place-${rfq.id}`} value={place} maxLength={100} onChange={(e) => setPlace(e.target.value)} placeholder={tr('Ví dụ: Cát Lái, TP.HCM')} className={field} />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className={label}>{tr('Đặt cọc')}</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {DEPOSIT_PRESETS.map((p) => (
            <label key={p} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold ${deposit === p ? 'border-[#083832] bg-teal-50 text-[#083832]' : 'border-slate-300 bg-white text-slate-700'}`}>
              <input type="radio" name={`q-deposit-${rfq.id}`} className="sr-only" checked={deposit === p} onChange={() => chooseDeposit(p)} />
              {p}%
            </label>
          ))}
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <label htmlFor={`q-balance-${rfq.id}`} className={label}>{tr('Phần còn lại')}</label>
        <select id={`q-balance-${rfq.id}`} value={balance} disabled={deposit === 100} onChange={(e) => setBalance(e.target.value as BalanceTerms)} className={field}>
          {BALANCE_TERMS.filter((b) => (deposit === 100 ? b.code === 'none' : b.code !== 'none')).map((b) => (
            <option key={b.code} value={b.code}>{tr(b.label)}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`q-lead-${rfq.id}`} className={label}>{tr('Thời gian giao hàng (ngày)')}</label>
        <input id={`q-lead-${rfq.id}`} inputMode="numeric" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} className={field} />
      </div>
      <div>
        <label htmlFor={`q-valid-${rfq.id}`} className={label}>{tr('Báo giá có hiệu lực đến')}</label>
        <input id={`q-valid-${rfq.id}`} type="date" min={inDays(0)} max={inDays(180)} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={field} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`q-notes-${rfq.id}`} className={label}>{tr('Ghi chú (không bắt buộc)')}</label>
        <textarea id={`q-notes-${rfq.id}`} rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} className={field} />
      </div>
      {preview && (
        <p data-testid="quote-preview" className="text-xs text-slate-700 sm:col-span-2">
          {tr('Tổng')}: <strong>{preview.total} {currency}</strong> ({rfq.quantity} {rfq.unit}) · {tr('Đặt cọc')} {deposit}%: <strong>{preview.deposit} {currency}</strong>
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2">{tr(error)}</p>
      )}
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className="rounded-xl bg-[#083832] px-4 py-2 text-sm font-semibold text-white hover:bg-[#062924] disabled:opacity-60">
          {tr(busy ? 'Đang gửi...' : 'Gửi báo giá')}
        </button>
      </div>
    </form>
  );
}

export default function QuotePanel({ rfq, role, onChanged }: { rfq: Rfq; role: 'buyer' | 'exporter'; onChanged: () => void }) {
  const { tr, language } = useLanguage();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState('');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [composing, setComposing] = useState(false);

  const load = useCallback(async () => {
    const list = await listQuotes(rfq.id);
    setFailed(list === null);
    setQuotes(list ?? []);
  }, [rfq.id]);
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (run: () => ReturnType<typeof decideQuote>) => {
    setError('');
    const outcome = await run();
    if (!outcome.ok) setError(ERRORS[outcome.error]);
    await load();
    onChanged();
  };

  if (failed) return <p role="alert" className="text-xs text-rose-700">{tr('Không tải được báo giá. Vui lòng thử lại.')}</p>;
  if (quotes === null) return null;
  const accepted = quotes.some((q) => q.status === 'accepted');
  const canQuote = role === 'exporter' && rfq.status !== 'closed' && !accepted;
  const date = (iso: string) => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium' }).format(new Date(iso));

  return (
    <section aria-label={tr('Báo giá')} className="space-y-3">
      <h3 className="text-sm font-bold text-slate-900">{tr('Báo giá')}</h3>
      {quotes.length === 0 && (
        <p className="text-xs text-slate-600">
          {tr(role === 'buyer' ? 'Nhà cung cấp chưa gửi báo giá.' : 'Bạn chưa gửi báo giá cho yêu cầu này.')}
        </p>
      )}
      <ul className="space-y-2">
        {quotes.map((q) => (
          <li key={q.id} aria-label={`${tr('Báo giá')} ${q.unit_price} ${q.currency}`} className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-900">
                {q.unit_price} {q.currency}/{q.unit} · {q.incoterm}
                {q.named_place && ` ${q.named_place}`}
              </span>
              <span data-testid="quote-status" className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[q.status] ?? STATUS_TONE.withdrawn}`}>
                {tr(QUOTE_STATUS_LABELS[q.status] ?? q.status)}
              </span>
            </div>
            <dl className="mt-2 grid gap-1 sm:grid-cols-2">
              <div><dt className="inline font-semibold">{tr('Tổng')}: </dt><dd className="inline">{q.total_amount} {q.currency} ({q.quantity} {q.unit})</dd></div>
              <div><dt className="inline font-semibold">{tr('Đặt cọc')}: </dt><dd className="inline">{q.deposit_percent}% — {q.deposit_amount} {q.currency}</dd></div>
              <div className="sm:col-span-2"><dt className="inline font-semibold">{tr('Phần còn lại')}: </dt><dd className="inline">{tr(balanceLabel(q.balance_terms))}</dd></div>
              <div><dt className="inline font-semibold">{tr('Giao hàng sau')}: </dt><dd className="inline">{tr(`${q.lead_time_days} ngày`)}</dd></div>
              <div><dt className="inline font-semibold">{tr('Hiệu lực đến')}: </dt><dd className="inline">{date(q.valid_until)}</dd></div>
            </dl>
            {q.notes && <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-2">{q.notes}</p>}
            {q.decision_reason && <p className="mt-2 text-slate-600">{tr('Lý do')}: {q.decision_reason}</p>}
            {q.status === 'accepted' && (
              <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-emerald-900">
                {tr('Hai bên hoàn tất hợp đồng và thanh toán trực tiếp với nhau; VYBE Trade chưa xử lý thanh toán.')}
              </p>
            )}
            {role === 'buyer' && q.status === 'sent' && (
              <div className="mt-3 space-y-2">
                <input
                  aria-label={tr('Lý do từ chối (không bắt buộc)')}
                  value={reasons[q.id] ?? ''}
                  maxLength={2000}
                  onChange={(e) => setReasons((r) => ({ ...r, [q.id]: e.target.value }))}
                  placeholder={tr('Lý do từ chối (không bắt buộc)')}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void act(() => decideQuote(q.id, 'accept'))} className="rounded-lg bg-[#083832] px-3 py-1.5 text-xs font-semibold text-white">
                    {tr('Chấp nhận báo giá')}
                  </button>
                  <button type="button" onClick={() => void act(() => decideQuote(q.id, 'decline', reasons[q.id]))} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800">
                    {tr('Từ chối')}
                  </button>
                </div>
              </div>
            )}
            {role === 'exporter' && (q.status === 'sent' || q.status === 'expired') && (
              <button type="button" onClick={() => void act(() => withdrawQuote(q.id))} className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800">
                {tr('Rút báo giá')}
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{tr(error)}</p>}
      {canQuote &&
        (composing ? (
          <QuoteForm
            rfq={rfq}
            onSent={() => {
              setComposing(false);
              void load();
              onChanged();
            }}
          />
        ) : (
          <button type="button" onClick={() => setComposing(true)} className="rounded-lg bg-[#083832] px-3 py-1.5 text-xs font-semibold text-white">
            {tr(quotes.some((q) => q.status === 'sent' || q.status === 'expired') ? 'Gửi báo giá mới (thay báo giá hiện tại)' : 'Tạo báo giá')}
          </button>
        ))}
    </section>
  );
}
