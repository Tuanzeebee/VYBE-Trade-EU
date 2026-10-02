'use client';

// Công cụ tính thuế (C2; tên mới từ U11 — tên hiệp định chỉ hiện trong kết quả). Khách dùng không cần đăng nhập.
// unsupported / needs_review KHÔNG hiện con số nào — con số chỉ đến từ dòng thuế đã duyệt (backend).
import React, { useEffect, useRef, useState } from 'react';
import HsCodePicker, { type HsCodeOption } from './HsCodePicker';
import { useLanguage } from '../context/LanguageContext';
import MarketRanking from './MarketRanking';
import SectorAlerts, { DemoDataBanner } from './SectorAlerts';
import { isRooStatus, rankMarkets, type MarketsResult, type RooStatus } from '../lib/marketsApi';
import UnreviewedNotice from './UnreviewedNotice';
import ValuationBreakdown from './ValuationBreakdown';
import {
  calculateTariff,
  EU_COUNTRIES,
  fetchTariffOptions,
  INCOTERMS,
  isEuMember,
  OTHER_MARKETS,
  parseAmount,
  parseCost,
  QUOTA_CONDITIONS,
  QUOTA_REVIEW_MESSAGES,
  type Agreement,
  type Incoterm,
  type QuotaAllocated,
  type Subtype,
  type TariffOutcome,
  type TariffResult,
  VALUATION_REVIEW_MESSAGES,
} from '../lib/tariffApi';

const MAX_SHIPMENTS = 10000;
const IMPORT_DATE_MIN = '2020-08-01';
const CURRENCY_OPTIONS = ['EUR', 'USD', 'VND'];

/** Ngày nhập khẩu muộn nhất cho phép: 3 năm kể từ hôm nay (khớp backend). */
function importDateMax(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 3);
  return d.toISOString().slice(0, 10);
}

const ERRORS = {
  rate_limited: 'Bạn đã tính quá nhiều lần. Vui lòng thử lại sau một phút.',
  invalid: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại mã HS, nước nhập khẩu và giá trị lô hàng.',
  agreement_required: 'Thị trường này có nhiều hiệp định. Vui lòng chọn hiệp định áp dụng.',
  network: 'Không kết nối được máy chủ. Vui lòng thử lại.',
} as const;
const MISSING_INPUTS = 'Vui lòng bấm Tính tiết kiệm thuế trước khi xem thị trường nên xuất.';

/** Đầu vào của lần tính thuế đã thành công — bảng xếp hạng chỉ dùng đúng các giá trị này. */
type Submitted = { hsCode: string; amount: string; roo: RooStatus | '' };

/** '12.0000' → '12%' (bỏ số 0 thừa; chỉ để hiển thị). */
const percent = (rate: string) => `${Number(rate)}%`;

// U13: kịch bản trong / ngoài hạn ngạch — luôn kèm điều kiện, không trình bày như 0% vô điều kiện.
function QuotaScenarios({ data }: { data: TariffResult }) {
  const { tr, language } = useLanguage();
  const money = (value: string) =>
    new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'vi-VN', { style: 'currency', currency: 'EUR' }).format(Number(value));
  const pick = (vi: string | null | undefined, en: string | null | undefined) => (language === 'en' ? en || vi : vi);
  const unit = data.quota?.specific_unit === 'tonne' ? tr('tấn') : (data.quota?.specific_unit ?? '');
  const scenarios = data.scenarios ?? [];
  const label = (kind: string) => tr(kind === 'in_quota' ? 'Trong hạn ngạch' : 'Ngoài hạn ngạch');
  const basis = (s: (typeof scenarios)[number]) =>
    s.duty_type === 'specific' && s.specific !== null ? `${Number(s.specific)} EUR/${unit}` : percent(s.rate ?? '0');
  const licence = pick(data.quota?.licence_note_vi, data.quota?.licence_note_en);
  const allocation = pick(data.quota?.allocation_note_vi, data.quota?.allocation_note_en);

  return (
    <div data-testid="quota-scenarios">
      <p className="text-sm font-semibold text-slate-600">{tr('Kịch bản hạn ngạch thuế quan')}</p>
      {data.subtype && (
        <p className="mt-1 text-xs text-slate-600">
          {tr('Phân nhóm')}: {language === 'en' ? data.subtype.name_en : data.subtype.name_vi}
          {data.quantity ? ` · ${tr('Khối lượng')}: ${data.quantity} ${unit}` : ''}
        </p>
      )}
      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-slate-500">
            <th className="py-2 font-semibold">{tr('Kịch bản')}</th>
            <th className="py-2 font-semibold">{tr('Mức thuế')}</th>
            <th className="py-2 text-right font-semibold">{tr('Tiền thuế')}</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s) => (
            <tr key={s.kind} className="border-t border-slate-100" data-testid={`scenario-${s.kind}`}>
              <td className="py-2 font-semibold text-slate-900">{label(s.kind)}</td>
              <td className="py-2 text-slate-700">{basis(s)}</td>
              <td className="py-2 text-right font-bold text-slate-900">{money(s.duty)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.savings !== null && (
        <p className="mt-3 text-sm text-slate-800">
          {tr('Chênh lệch nếu được phân bổ hạn ngạch')}: <strong>{money(data.savings)}</strong>
        </p>
      )}
      {data.quota_allocated === 'no' && (
        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{tr('Bạn cho biết chưa được phân bổ hạn ngạch: lô hàng sẽ chịu thuế ngoài hạn ngạch.')}</p>
      )}
      {data.quota_allocated === 'unknown' && (
        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{tr('Chưa rõ đã được phân bổ hạn ngạch hay chưa: hãy xác nhận với nhà nhập khẩu trước khi chốt giá.')}</p>
      )}
      <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-700">{tr('Điều kiện áp dụng')}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-700" data-testid="quota-conditions">
        {(data.conditions ?? []).map((c) => (
          <li key={c}>{tr(QUOTA_CONDITIONS[c] ?? c)}</li>
        ))}
      </ul>
      {data.quota && (
        <p className="mt-3 text-xs text-slate-600">
          {tr('Hạn ngạch')}: {Number(data.quota.volume).toLocaleString(language === 'en' ? 'en-GB' : 'vi-VN')} {data.quota.volume_unit === 'tonne' ? tr('tấn') : data.quota.volume_unit}
          {data.quota.quota_year ? ` / ${data.quota.quota_year}` : ''}
          {data.quota.quota_code ? ` · ${data.quota.quota_code}` : ''}
        </p>
      )}
      {licence && <p className="mt-1 text-xs text-slate-600">{licence}</p>}
      {allocation && <p className="mt-1 text-xs text-slate-600">{allocation}</p>}
    </div>
  );
}

function Result({ data }: { data: TariffResult }) {
  const { tr, language } = useLanguage();
  const money = (value: string) =>
    new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'vi-VN', {
      style: 'currency',
      currency: data.valuation?.currency ?? 'EUR',
    }).format(Number(value));
  // Ghi chú là dữ liệu do luật TM nhập (vi); giao diện EN dùng bản EN nếu có, thiếu thì rơi về bản vi.
  const pick = (vi: string | null, en: string | null) => (language === 'en' ? en || vi : vi);
  const notes = [...new Set([pick(data.quota_note, data.quota_note_en), pick(data.condition_note, data.condition_note_en)])].filter(Boolean);
  const agreementName = data.agreement ? (language === 'en' ? data.agreement.name_en : data.agreement.name_vi) : null;

  return (
    <section aria-label={tr('Kết quả')} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      {data.data_status === 'demo_unreviewed' && data.review_state !== 'UNREVIEWED' && <DemoDataBanner />}
      {data.status === 'ok' && data.savings !== null && data.mfn_duty !== null && data.evfta_duty !== null && (
        <>
          <p className="text-sm font-semibold text-slate-600">{tr('Tiết kiệm mỗi lô')}</p>
          <p className="mt-1 text-4xl font-extrabold text-[#083832]">{money(data.savings)}</p>
          <UnreviewedNotice state={data.review_state} />
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold text-slate-500">
                {tr('Thuế MFN')} ({percent(data.mfn_rate ?? '0')})
              </dt>
              <dd className="text-lg font-bold text-slate-900">{money(data.mfn_duty)}</dd>
            </div>
            <div className="rounded-xl bg-teal-50 p-4">
              <dt className="text-xs font-semibold text-teal-800" data-testid="preferential-label">
                {tr('Thuế ưu đãi')}
                {agreementName ? ` · ${agreementName}` : ''} ({percent(data.evfta_rate ?? '0')})
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
      {(data.status === 'ok' || data.status === 'needs_review') && <ValuationBreakdown data={data} />}
      {data.status === 'unsupported' && (
        <p className="text-base font-semibold text-slate-800">
          {tr('Mã HS này chưa được hỗ trợ. Vui lòng liên hệ để được tư vấn.')}
        </p>
      )}
      {data.status === 'quota_scenarios' && <QuotaScenarios data={data} />}
      {data.status === 'needs_review' && (
        <p className="text-base font-semibold text-amber-800" data-testid="review-message">
          {tr(
            (data.review_reason && (QUOTA_REVIEW_MESSAGES[data.review_reason] ?? VALUATION_REVIEW_MESSAGES[data.review_reason])) ||
              'Trường hợp này cần kiểm tra thêm (ví dụ hạn ngạch hoặc thuế tuyệt đối), nên chúng tôi không đưa ra con số.',
          )}
        </p>
      )}
      {notes.map((note) => (
        <p key={note} className="mt-3 text-sm text-slate-700">
          {note}
        </p>
      ))}
      <SectorAlerts alerts={data.alerts ?? []} />
      <p className="mt-5 text-xs text-slate-500">
        {tr('Kết quả chỉ mang tính tham khảo, không thay thế tư vấn pháp lý hoặc xác nhận của cơ quan hải quan.')}
      </p>
      <a
        href={`/suppliers?hs=${data.hs_code.slice(0, 6)}`}
        className="mt-4 inline-block rounded-xl bg-[#083832] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#062924]"
      >
        {tr('Xem nhà cung cấp cho mã HS này')}
      </a>
    </section>
  );
}

export default function TariffCalculator({ initialRoo }: { initialRoo?: RooStatus }) {
  const { tr, language } = useLanguage();
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
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  // U12: hiệp định có dữ liệu đã duyệt cho (mã HS, thị trường); nhiều hơn một thì người dùng chọn.
  const [agreements, setAgreements] = useState<Agreement[] | null>(null);
  const [agreement, setAgreement] = useState('');
  // U13: hàng có hạn ngạch đã duyệt → hỏi phân nhóm, đã được phân bổ chưa, khối lượng.
  const [subtypes, setSubtypes] = useState<Subtype[]>([]);
  const [quotaAgreements, setQuotaAgreements] = useState<string[]>([]);
  const [subtype, setSubtype] = useState('');
  const [allocated, setAllocated] = useState<QuotaAllocated | ''>('');
  const [quantity, setQuantity] = useState('');
  // C2-A: trị giá tính thuế. Một đơn vị tiền tệ cho cả form, không quy đổi.
  const [currency, setCurrency] = useState('EUR');
  const [incoterm, setIncoterm] = useState<Incoterm | ''>('');
  const [freight, setFreight] = useState('');
  const [insurance, setInsurance] = useState('');
  const [postBorder, setPostBorder] = useState('');
  const [importDate, setImportDate] = useState('');
  const incotermInfo = INCOTERMS.find((i) => i.code === incoterm);
  const resultRef = useRef<HTMLElement>(null);
  // Màn hình hẹp xếp một cột: cuộn tới kết quả khi có (hai cột thì kết quả đã nằm cạnh form).
  useEffect(() => {
    if (!result || typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 1024px)').matches) return;
    resultRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [result]);

  useEffect(() => {
    setAgreements(null);
    setAgreement('');
    setSubtypes([]);
    setQuotaAgreements([]);
    setSubtype('');
    if (!hs) return;
    let active = true;
    void fetchTariffOptions(hs.code, destination).then((options) => {
      if (!active) return;
      setAgreements(options?.agreements ?? []);
      setSubtypes(options?.subtypes ?? []);
      setQuotaAgreements(options?.quota_agreements ?? []);
      if (options && options.agreements.length === 1) setAgreement(options.agreements[0].code);
    });
    return () => {
      active = false;
    };
  }, [hs, destination]);

  const effectiveAgreement = agreement || (isEuMember(destination) ? 'EVFTA' : '');
  const hasQuota = Boolean(hs) && effectiveAgreement !== '' && quotaAgreements.includes(effectiveAgreement);

  // Đổi mã HS, giá trị hoặc kết quả RoO thì bảng xếp hạng cũ không còn mô tả đầu vào hiện tại.
  const changeHs = (option: HsCodeOption | null) => {
    setHs(option);
    setMarkets(null);
  };
  const changeValue = (next: string) => {
    setValue(next);
    setMarkets(null);
  };
  const changeRoo = (next: RooStatus | '') => {
    setRoo(next);
    setMarkets(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResult(null);
    setMarkets(null);
    setSubmitted(null);
    setError('');
    if (!hs) return setError('Vui lòng chọn mã HS.');
    if (agreements && agreements.length > 1 && !agreement) return setError(ERRORS.agreement_required);
    const amount = parseAmount(value);
    if (!amount) {
      return setError('Giá trị lô hàng phải là số dương, tối đa 2 chữ số thập phân (ví dụ 10000 hoặc 10000.50).');
    }
    const qty = quantity.trim() === '' ? undefined : parseAmount(quantity);
    if (qty === null) return setError('Khối lượng phải là số dương, tối đa 2 chữ số thập phân.');
    const count = shipments.trim() === '' ? undefined : Number(shipments);
    if (count !== undefined && !(Number.isInteger(count) && count >= 1 && count <= MAX_SHIPMENTS)) {
      return setError('Số lô hàng mỗi năm phải là số nguyên từ 1 đến 10000.');
    }
    const cost = (raw: string, show: boolean) => (show && raw.trim() !== '' ? parseCost(raw) : undefined);
    const costs = {
      freight: cost(freight, Boolean(incotermInfo?.costs.includes('freight'))),
      insurance: cost(insurance, Boolean(incotermInfo?.costs.includes('insurance'))),
      postBorder: cost(postBorder, Boolean(incotermInfo?.costs.includes('postBorder'))),
    };
    if (Object.values(costs).some((c) => c === null)) {
      return setError('Chi phí phải là số không âm, tối đa 2 chữ số thập phân (ví dụ 3000 hoặc 3000.50).');
    }
    if (importDate && (importDate < IMPORT_DATE_MIN || importDate > importDateMax())) {
      return setError('Ngày nhập khẩu phải từ 01/08/2020 đến tối đa 3 năm kể từ hôm nay.');
    }
    setBusy(true);
    const outcome: TariffOutcome = await calculateTariff({
      hsCode: hs.code,
      destination,
      productValue: amount,
      shipmentsPerYear: count,
      agreement: agreement || undefined,
      subtypeCode: hasQuota ? subtype || undefined : undefined,
      quantity: hasQuota ? qty : undefined,
      quotaAllocated: hasQuota ? allocated || undefined : undefined,
      incoterm: incoterm || undefined,
      currency: currency !== 'EUR' ? currency : undefined,
      freight: costs.freight ?? undefined,
      insurance: costs.insurance ?? undefined,
      postBorderCosts: costs.postBorder ?? undefined,
      importDate: importDate || undefined,
    });
    setBusy(false);
    if (outcome.ok) {
      setResult(outcome.data);
      setSubmitted({ hsCode: hs.code, amount, roo });
    } else setError(ERRORS[outcome.error]);
  };

  const showMarkets = async () => {
    if (!submitted) return setError(MISSING_INPUTS);
    setMarketsBusy(true);
    setMarkets(null);
    setError('');
    const outcome = await rankMarkets({
      hsCode: submitted.hsCode,
      productValue: submitted.amount,
      rooStatus: submitted.roo || undefined,
    });
    setMarketsBusy(false);
    if (outcome.ok) setMarkets(outcome.data);
    else setError(ERRORS[outcome.error]);
  };

  const field =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]';
  const label = 'block text-sm font-semibold text-slate-700';

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{tr('Công cụ tính thuế')}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {tr('Nhập mã HS, thị trường nhập khẩu và giá trị lô hàng để ước tính thuế nhập khẩu và khoản tiết kiệm nhờ hiệp định thương mại tự do (FTA).')}
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
      <div>
      <h2 className="text-base font-bold text-slate-900">{tr('Thông tin lô hàng')}</h2>
      <form onSubmit={submit} noValidate className="mt-4 space-y-5">
        <HsCodePicker label={tr('Sản phẩm (mã HS)')} value={hs} onChange={changeHs} />
        <div>
          <label htmlFor="tariff-destination" className={label}>
            {tr('Thị trường nhập khẩu')}
          </label>
          <select id="tariff-destination" value={destination} onChange={(e) => setDestination(e.target.value)} className={field}>
            <optgroup label={tr('Liên minh châu Âu (EU)')}>
              {EU_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {tr(c.name)}
                </option>
              ))}
            </optgroup>
            <optgroup label={tr('Thị trường khác')}>
              {OTHER_MARKETS.map((c) => (
                <option key={c.code} value={c.code}>
                  {tr(c.name)}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        {hs && agreements !== null && agreements.length > 1 && (
          <div>
            <label htmlFor="tariff-agreement" className={label}>
              {tr('Hiệp định áp dụng')}
            </label>
            <select id="tariff-agreement" value={agreement} onChange={(e) => setAgreement(e.target.value)} className={field}>
              <option value="">{tr('Chọn hiệp định')}</option>
              {agreements.map((a) => (
                <option key={a.code} value={a.code}>
                  {language === 'en' ? a.name_en : a.name_vi}
                </option>
              ))}
            </select>
          </div>
        )}
        {hs && agreements !== null && agreements.length === 1 && !isEuMember(destination) && (
          <p className="text-xs text-slate-600" data-testid="agreement-note">
            {tr('Hiệp định áp dụng')}: {language === 'en' ? agreements[0].name_en : agreements[0].name_vi}
          </p>
        )}
        {hasQuota && (
          <fieldset className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4" data-testid="quota-fields">
            <legend className="px-1 text-sm font-bold text-amber-900">{tr('Mặt hàng có hạn ngạch thuế quan')}</legend>
            <div>
              <label htmlFor="tariff-subtype" className={label}>
                {tr('Phân nhóm hàng')}
              </label>
              <select id="tariff-subtype" value={subtype} onChange={(e) => setSubtype(e.target.value)} className={field}>
                <option value="">{tr('Chọn phân nhóm')}</option>
                {subtypes.map((s) => (
                  <option key={s.code} value={s.code}>
                    {language === 'en' ? s.name_en : s.name_vi}
                  </option>
                ))}
              </select>
            </div>
            <fieldset>
              <legend className={label}>{tr('Bạn đã được phân bổ hạn ngạch chưa?')}</legend>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                {(
                  [
                    ['yes', 'Đã được phân bổ'],
                    ['no', 'Chưa'],
                    ['unknown', 'Không rõ'],
                  ] as const
                ).map(([code, text]) => (
                  <label key={code} className="flex items-center gap-2">
                    <input type="radio" name="quota-allocated" checked={allocated === code} onChange={() => setAllocated(code)} />
                    {tr(text)}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="tariff-quantity" className={label}>
                {tr('Khối lượng lô hàng (tấn)')}
              </label>
              <input id="tariff-quantity" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={field} />
              <p className="mt-1 text-xs text-slate-600">{tr('Cần khi thuế tính theo khối lượng (thuế tuyệt đối).')}</p>
            </div>
          </fieldset>
        )}
        {hs && agreements !== null && agreements.length === 0 && (
          <p role="status" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900" data-testid="no-agreement">
            {tr('Chưa có dữ liệu thuế đã được chuyên gia duyệt cho mã HS và thị trường này.')}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
          <div>
            <label htmlFor="tariff-value" className={label}>
              {tr(`Giá trị lô hàng (${currency})`)}
            </label>
            <input id="tariff-value" inputMode="decimal" value={value} onChange={(e) => changeValue(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="tariff-currency" className={label}>
              {tr('Tiền tệ')}
            </label>
            <select id="tariff-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={field}>
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-700">{tr('Điều kiện giao hàng và chi phí')}</legend>
          <p className="text-xs text-slate-600">
            {tr('EU và Anh tính thuế trên trị giá CIF tại cửa khẩu nhập (giá hàng cộng cước và bảo hiểm quốc tế). Chọn đúng điều kiện trong hợp đồng và khai chi phí để trị giá chính xác.')}
          </p>
          <div>
            <label htmlFor="tariff-incoterm" className={label}>
              {tr('Điều kiện giao hàng (Incoterm)')}
            </label>
            <select id="tariff-incoterm" value={incoterm} onChange={(e) => setIncoterm(e.target.value as Incoterm | '')} className={field}>
              <option value="">{tr('Chưa chọn')}</option>
              {INCOTERMS.map((i) => (
                <option key={i.code} value={i.code}>
                  {tr(i.label)}
                </option>
              ))}
            </select>
          </div>
          {incoterm === 'DDP' && (
            <p role="status" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              {tr(VALUATION_REVIEW_MESSAGES.ddp_not_supported)}
            </p>
          )}
          {incotermInfo?.costs.includes('freight') && (
            <div>
              <label htmlFor="tariff-freight" className={label}>
                {tr('Cước vận chuyển quốc tế (đến cửa khẩu nhập)')}
              </label>
              <input id="tariff-freight" inputMode="decimal" value={freight} onChange={(e) => setFreight(e.target.value)} className={field} />
            </div>
          )}
          {incotermInfo?.costs.includes('insurance') && (
            <div>
              <label htmlFor="tariff-insurance" className={label}>
                {tr('Phí bảo hiểm hàng hóa quốc tế')}
              </label>
              <input id="tariff-insurance" inputMode="decimal" value={insurance} onChange={(e) => setInsurance(e.target.value)} className={field} />
            </div>
          )}
          {incotermInfo?.costs.includes('postBorder') && (
            <div>
              <label htmlFor="tariff-post-border" className={label}>
                {tr('Chi phí sau cửa khẩu nhập (vận chuyển nội địa, dỡ hàng...)')}
              </label>
              <input id="tariff-post-border" inputMode="decimal" value={postBorder} onChange={(e) => setPostBorder(e.target.value)} className={field} />
            </div>
          )}
        </fieldset>
        <div>
          <label htmlFor="tariff-import-date" className={label}>
            {tr('Ngày nhập khẩu dự kiến (không bắt buộc, mặc định hôm nay)')}
          </label>
          <input
            id="tariff-import-date"
            type="date"
            min={IMPORT_DATE_MIN}
            max={importDateMax()}
            value={importDate}
            onChange={(e) => setImportDate(e.target.value)}
            className={field}
          />
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
          <select id="tariff-roo" value={roo} onChange={(e) => changeRoo(isRooStatus(e.target.value) ? e.target.value : '')} className={field}>
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
      </div>
      <aside ref={resultRef} className="lg:sticky lg:top-24">
        <h2 className="text-base font-bold text-slate-900">{tr('Kết quả tính thuế')}</h2>
        <div className="mt-4">
          {result ? (
            <Result data={result} />
          ) : (
            <p data-testid="result-placeholder" className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              {tr('Nhập thông tin lô hàng bên trái rồi bấm "Tính tiết kiệm thuế". Trị giá tính thuế, thuế phải nộp và khoản tiết kiệm nhờ FTA sẽ hiện ở đây.')}
            </p>
          )}
          {result && result.status === 'ok' && (result.agreement?.code ?? 'EVFTA') === 'EVFTA' && (
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
      </aside>
      </div>
    </div>
  );
}
