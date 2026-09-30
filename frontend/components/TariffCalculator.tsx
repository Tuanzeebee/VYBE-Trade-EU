'use client';

// Máy tính tiết kiệm thuế EVFTA (C2). Khách dùng không cần đăng nhập.
// unsupported / needs_review KHÔNG hiện con số nào — con số chỉ đến từ dòng thuế đã duyệt (backend).
import React, { useState } from 'react';
import HsCodePicker, { type HsCodeOption } from './HsCodePicker';
import { useLanguage } from '../context/LanguageContext';
import MarketRanking from './MarketRanking';
import { isRooStatus, rankMarkets, type MarketsResult, type RooStatus } from '../lib/marketsApi';
import { calculateTariff, EU_COUNTRIES, parseAmount, type TariffOutcome, type TariffResult } from '../lib/tariffApi';

const MAX_SHIPMENTS = 10000;

const ERRORS = {
  rate_limited: 'Bạn đã tính quá nhiều lần. Vui lòng thử lại sau một phút.',
  invalid: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại mã HS, nước nhập khẩu và giá trị lô hàng.',
  network: 'Không kết nối được máy chủ. Vui lòng thử lại.',
} as const;

/** '12.0000' → '12%' (bỏ số 0 thừa; chỉ để hiển thị). */
const percent = (rate: string) => `${Number(rate)}%`;

function Result({ data }: { data: TariffResult }) {
  const { tr, language } = useLanguage();
  const money = (value: string) =>
    new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'vi-VN', { style: 'currency', currency: 'EUR' }).format(Number(value));
  // Ghi chú là dữ liệu do luật TM nhập (vi); giao diện EN dùng bản EN nếu có, thiếu thì rơi về bản vi.
  const pick = (vi: string | null, en: string | null) => (language === 'en' ? en || vi : vi);
  const notes = [...new Set([pick(data.quota_note, data.quota_note_en), pick(data.condition_note, data.condition_note_en)])].filter(Boolean);

  return (
    <section aria-label={tr('Kết quả')} className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      {data.status === 'ok' && data.savings !== null && data.mfn_duty !== null && data.evfta_duty !== null && (
        <>
          <p className="text-sm font-semibold text-slate-600">{tr('Tiết kiệm mỗi lô')}</p>
          <p className="mt-1 text-4xl font-extrabold text-[#083832]">{money(data.savings)}</p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold text-slate-500">
                {tr('Thuế MFN')} ({percent(data.mfn_rate ?? '0')})
              </dt>
              <dd className="text-lg font-bold text-slate-900">{money(data.mfn_duty)}</dd>
            </div>
            <div className="rounded-xl bg-teal-50 p-4">
              <dt className="text-xs font-semibold text-teal-800">
                {tr('Thuế EVFTA')} ({percent(data.evfta_rate ?? '0')})
              </dt>
              <dd className="text-lg font-bold text-teal-900">{money(data.evfta_duty)}</dd>
            </div>
          </dl>
          {data.annual_savings !== null && (
            <p className="mt-4 text-sm text-slate-700">
              {tr('Tiết kiệm mỗi năm')}: <strong>{money(data.annual_savings)}</strong>
            </p>
          )}
        </>
      )}
      {data.status === 'unsupported' && (
        <p className="text-base font-semibold text-slate-800">
          {tr('Mã HS này chưa được hỗ trợ. Vui lòng liên hệ để được tư vấn.')}
        </p>
      )}
      {data.status === 'needs_review' && (
        <p className="text-base font-semibold text-amber-800">
          {tr('Trường hợp này cần kiểm tra thêm (ví dụ hạn ngạch hoặc thuế tuyệt đối), nên chúng tôi không đưa ra con số.')}
        </p>
      )}
      {notes.map((note) => (
        <p key={note} className="mt-3 text-sm text-slate-700">
          {note}
        </p>
      ))}
      <p className="mt-5 text-xs text-slate-500">
        {tr('Kết quả chỉ mang tính tham khảo, không thay thế tư vấn pháp lý hoặc xác nhận của cơ quan hải quan.')}
      </p>
      <a
        href={`/suppliers?hs=${data.hs_code}`}
        className="mt-4 inline-block rounded-xl bg-[#083832] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#062924]"
      >
        {tr('Xem nhà cung cấp cho mã HS này')}
      </a>
    </section>
  );
}

export default function TariffCalculator({ initialRoo }: { initialRoo?: RooStatus }) {
  const { tr } = useLanguage();
  const [hs, setHs] = useState<HsCodeOption | null>(null);
  const [destination, setDestination] = useState('DE');
  const [value, setValue] = useState('');
  const [shipments, setShipments] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TariffResult | null>(null);
  const [roo, setRoo] = useState<RooStatus | ''>(initialRoo ?? '');
  const [markets, setMarkets] = useState<MarketsResult | null>(null);
  const [marketsBusy, setMarketsBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResult(null);
    setMarkets(null);
    setError('');
    if (!hs) return setError('Vui lòng chọn mã HS.');
    const amount = parseAmount(value);
    if (!amount) {
      return setError('Giá trị lô hàng phải là số dương, tối đa 2 chữ số thập phân (ví dụ 10000 hoặc 10000.50).');
    }
    const count = shipments.trim() === '' ? undefined : Number(shipments);
    if (count !== undefined && !(Number.isInteger(count) && count >= 1 && count <= MAX_SHIPMENTS)) {
      return setError('Số lô hàng mỗi năm phải là số nguyên từ 1 đến 10000.');
    }
    setBusy(true);
    const outcome: TariffOutcome = await calculateTariff({
      hsCode: hs.code,
      destination,
      productValue: amount,
      shipmentsPerYear: count,
    });
    setBusy(false);
    if (outcome.ok) setResult(outcome.data);
    else setError(ERRORS[outcome.error]);
  };

  const showMarkets = async () => {
    if (!hs) return;
    const amount = parseAmount(value);
    if (!amount) return;
    setMarketsBusy(true);
    setError('');
    const outcome = await rankMarkets({ hsCode: hs.code, productValue: amount, rooStatus: roo || undefined });
    setMarketsBusy(false);
    if (outcome.ok) setMarkets(outcome.data);
    else setError(ERRORS[outcome.error]);
  };

  const field =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]';
  const label = 'block text-sm font-semibold text-slate-700';

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{tr('Máy tính tiết kiệm thuế EVFTA')}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {tr('Nhập mã HS, nước EU nhập khẩu và giá trị lô hàng để ước tính thuế nhập khẩu tiết kiệm được nhờ EVFTA.')}
      </p>
      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <HsCodePicker label={tr('Sản phẩm (mã HS)')} value={hs} onChange={setHs} />
        <div>
          <label htmlFor="tariff-destination" className={label}>
            {tr('Nước EU nhập khẩu')}
          </label>
          <select id="tariff-destination" value={destination} onChange={(e) => setDestination(e.target.value)} className={field}>
            {EU_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tariff-value" className={label}>
            {tr('Giá trị lô hàng (EUR)')}
          </label>
          <input id="tariff-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="tariff-shipments" className={label}>
            {tr('Số lô hàng mỗi năm (không bắt buộc)')}
          </label>
          <input id="tariff-shipments" inputMode="numeric" value={shipments} onChange={(e) => setShipments(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="tariff-roo" className={label}>
            {tr('Kết quả kiểm tra xuất xứ (nếu đã có)')}
          </label>
          <select id="tariff-roo" value={roo} onChange={(e) => setRoo(isRooStatus(e.target.value) ? e.target.value : '')} className={field}>
            <option value="">{tr('Chưa kiểm tra')}</option>
            <option value="pass">{tr('Đạt')}</option>
            <option value="fail">{tr('Không đạt')}</option>
            <option value="inconclusive">{tr('Chưa kết luận')}</option>
          </select>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {tr(error)}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-[#083832] px-6 py-3 text-sm font-semibold text-white hover:bg-[#062924] disabled:opacity-60"
        >
          {tr(busy ? 'Đang tính...' : 'Tính tiết kiệm thuế')}
        </button>
      </form>
      {result && <Result data={result} />}
      {result && result.status === 'ok' && (
        <button
          type="button"
          disabled={marketsBusy}
          onClick={() => void showMarkets()}
          className="mt-4 rounded-xl border border-[#083832] px-5 py-2.5 text-sm font-semibold text-[#083832] hover:bg-slate-50 disabled:opacity-60"
        >
          {tr(marketsBusy ? 'Đang tính...' : 'Xem thị trường nên xuất')}
        </button>
      )}
      {markets && <MarketRanking data={markets} />}
    </div>
  );
}
