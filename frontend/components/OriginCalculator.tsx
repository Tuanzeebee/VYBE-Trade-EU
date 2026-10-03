'use client';

// Kiểm tra xuất xứ hàng hóa EVFTA (C4). Khách dùng không cần đăng nhập.
// Ba trạng thái riêng: Đạt / Không đạt / Chưa kết luận (thêm "ngoài phạm vi dữ liệu"). Không có tính năng cấp C/O.
import React, { useEffect, useRef, useState } from 'react';
import HsCodePicker, { type HsCodeOption } from './HsCodePicker';
import Eur1DraftPanel from './Eur1DraftPanel';
import OriginGuided, { OriginResultPanel } from './OriginGuided';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import {
  calculateRoo,
  emptyMaterial,
  MAX_MATERIALS,
  normalizeHs,
  type MaterialBody,
  type MaterialDraft,
  type RooOutcome,
  type RooResult,
} from '../lib/originApi';
import { parseAmount } from '../lib/tariffApi';
import { fetchOriginQuestions, type OriginQuestions, type OriginResult } from '../lib/complianceApi';

type Declared = 'undeclared' | 'none' | 'list';

const ERRORS = {
  rate_limited: 'Bạn đã kiểm tra quá nhiều lần. Vui lòng thử lại sau một phút.',
  invalid: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại mã HS, giá xuất xưởng và nguyên liệu.',
  network: 'Không kết nối được máy chủ. Vui lòng thử lại.',
} as const;

const REASONS: Record<string, string> = {
  requires_expert: 'Trường hợp này cần chuyên gia đánh giá nên hệ thống không tự kết luận.',
  ambiguous_rule: 'Có nhiều hơn một quy tắc cho mã HS này nên cần chuyên gia đánh giá.',
  materials_not_declared: 'Bạn chưa khai nguyên liệu nên chưa thể kết luận.',
  insufficient_data: 'Còn thiếu dữ liệu để kết luận (ví dụ giá xuất xưởng hoặc mã HS của nguyên liệu).',
};

const pct = (value: string) => `${Number(value)}%`;

function Result({ data, goodsName }: { data: RooResult; goodsName: string }) {
  const { tr } = useLanguage();
  const headline = { pass: 'Đạt', fail: 'Không đạt', inconclusive: 'Chưa kết luận', unsupported: 'Chưa hỗ trợ' }[data.status];
  const tone = { pass: 'text-emerald-800', fail: 'text-rose-800', inconclusive: 'text-amber-800', unsupported: 'text-slate-800' }[data.status];

  return (
    <section aria-label={tr('Kết quả')} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className={`text-3xl font-extrabold ${tone}`}>{tr(headline)}</p>
      {data.status === 'unsupported' && (
        <p className="mt-3 text-sm text-slate-700">
          {tr('Mã HS này nằm ngoài phạm vi dữ liệu của hệ thống. Điều đó không có nghĩa là hàng hóa không có quy tắc xuất xứ; vui lòng liên hệ để được tư vấn.')}
        </p>
      )}
      {data.status === 'inconclusive' && data.reason && REASONS[data.reason] && (
        <p className="mt-3 text-sm text-slate-700">{tr(REASONS[data.reason])}</p>
      )}
      {(data.status === 'pass' || data.status === 'fail') && data.nom_pct !== null && (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-semibold text-slate-500">{tr('Nguyên liệu không xuất xứ (NOM)')}</dt>
            <dd className="text-lg font-bold text-slate-900">{pct(data.nom_pct)}</dd>
          </div>
          {data.threshold_pct !== null && (
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold text-slate-500">{tr('Ngưỡng tối đa')}</dt>
              <dd className="text-lg font-bold text-slate-900">{pct(data.threshold_pct)}</dd>
            </div>
          )}
        </dl>
      )}
      {data.rule_text && <p className="mt-3 text-sm text-slate-700">{data.rule_text}</p>}
      <p className="mt-5 text-xs text-slate-500">
        {tr('Kết quả chỉ mang tính tham khảo. Cơ quan cấp chứng nhận xuất xứ chính thức là Bộ Công Thương.')}
      </p>
      {data.status !== 'unsupported' && (
        <Link href={`/tools/tariff?roo=${data.status}`} className="mt-4 inline-block text-sm font-semibold text-[#083832] underline">
          {tr('Xem thị trường EU nên xuất')}
        </Link>
      )}
      {data.status === 'pass' && <Eur1DraftPanel checkId={data.check_id} goodsName={goodsName} />}
    </section>
  );
}

export default function OriginCalculator() {
  const { tr } = useLanguage();
  const [hs, setHs] = useState<HsCodeOption | null>(null);
  const [exWorks, setExWorks] = useState('');
  const [declared, setDeclared] = useState<Declared>('undeclared');
  const [materials, setMaterials] = useState<MaterialDraft[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RooResult | null>(null);
  // Mã đã có dữ liệu Chương 3/7/8 → máy tính có hướng dẫn; còn lại dùng form nguyên liệu (máy tính cũ).
  const [questions, setQuestions] = useState<OriginQuestions | null>(null);
  const [checking, setChecking] = useState(false);
  const code = hs?.code ?? null;
  useEffect(() => {
    setQuestions(null);
    setResult(null);
    if (!code) return;
    let active = true;
    setChecking(true);
    fetchOriginQuestions(code).then((q) => {
      if (!active) return;
      setQuestions(q);
      setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [code]);
  const guided = questions?.status === 'ok' ? questions : null;
  const [guidedResult, setGuidedResult] = useState<OriginResult | null>(null);
  const resultRef = useRef<HTMLElement>(null);
  useEffect(() => setGuidedResult(null), [code]);
  const shown = guidedResult ?? result;
  // Màn hình hẹp xếp một cột: cuộn tới kết quả khi có (hai cột thì kết quả đã nằm cạnh câu hỏi).
  useEffect(() => {
    if (!shown || typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 1024px)').matches) return;
    resultRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [shown]);

  const choose = (next: Declared) => {
    setDeclared(next);
    if (next !== 'list') setMaterials([]);
    else if (materials.length === 0) setMaterials([emptyMaterial()]);
  };
  const update = (index: number, patch: Partial<MaterialDraft>) =>
    setMaterials((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResult(null);
    setError('');
    if (!hs) return setError('Vui lòng chọn mã HS.');
    let exWorksValue: string | null = null;
    if (exWorks.trim() !== '') {
      exWorksValue = parseAmount(exWorks);
      if (!exWorksValue) {
        return setError('Giá xuất xưởng phải là số dương, tối đa 2 chữ số thập phân (ví dụ 1000 hoặc 1000.50).');
      }
    }
    const body: MaterialBody[] = [];
    for (const [index, row] of materials.entries()) {
      const origin = row.origin.trim().toUpperCase();
      const value = parseAmount(row.value);
      const hsCode = row.hs.trim() === '' ? null : normalizeHs(row.hs);
      if (!/^[A-Z]{2}$/.test(origin) || !value || (row.hs.trim() !== '' && !hsCode)) {
        return setError(
          `Nguyên liệu ${index + 1}: cần mã nước 2 chữ cái (ví dụ CN), giá trị là số dương và mã HS 6–8 chữ số (nếu có).`,
        );
      }
      body.push({ origin_country: origin, value, ...(hsCode ? { hs_code: hsCode } : {}) });
    }
    setBusy(true);
    const outcome: RooOutcome = await calculateRoo({
      hsCode: hs.code,
      exWorksValue,
      materialsDeclared: declared !== 'undeclared',
      materials: body,
    });
    setBusy(false);
    if (outcome.ok) setResult(outcome.data);
    else setError(ERRORS[outcome.error]);
  };

  const field =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]';
  const label = 'block text-sm font-semibold text-slate-700';
  const radios: { value: Declared; text: string }[] = [
    { value: 'undeclared', text: 'Chưa khai nguyên liệu' },
    { value: 'none', text: 'Không có nguyên liệu nhập khẩu' },
    { value: 'list', text: 'Có nguyên liệu nhập khẩu (khai bên dưới)' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{tr('Kiểm tra xuất xứ hàng hóa')}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {tr('Kiểm tra hàng Việt Nam xuất sang EU có đạt quy tắc xuất xứ hay không. Mọi số tiền dùng cùng một đơn vị tiền tệ.')}
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
        <div>
          <h2 className="text-base font-bold text-slate-900">{tr('Trả lời câu hỏi')}</h2>
          <div className="mt-3">
            <HsCodePicker label={tr('Sản phẩm (mã HS)')} value={hs} onChange={setHs} />
          </div>
          {checking && <p className="mt-3 text-sm text-slate-500">{tr('Đang tải câu hỏi...')}</p>}
          {guided && code && (
            <div className="mt-6">
              <OriginGuided key={code} hsCode={code} questions={guided} onResult={setGuidedResult} />
            </div>
          )}
      {!guided && !checking && (
      <form onSubmit={submit} noValidate className="mt-6 space-y-5">
        <div>
          <label htmlFor="roo-exworks" className={label}>
            {tr('Giá xuất xưởng (EXW)')}
          </label>
          <input id="roo-exworks" inputMode="decimal" value={exWorks} onChange={(e) => setExWorks(e.target.value)} className={field} />
        </div>
        <fieldset>
          <legend className={label}>{tr('Nguyên liệu nhập khẩu')}</legend>
          <div className="mt-2 space-y-2">
            {radios.map((r) => (
              <label key={r.value} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="declared"
                  checked={declared === r.value}
                  onChange={() => choose(r.value)}
                  className="accent-[#083832]"
                />
                {tr(r.text)}
              </label>
            ))}
          </div>
        </fieldset>
        {declared === 'list' && (
          <div className="space-y-4">
            {materials.map((row, index) => (
              <fieldset key={index} aria-label={`${tr('Nguyên liệu')} ${index + 1}`} className="rounded-xl border border-slate-200 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor={`m-origin-${index}`} className={label}>
                      {tr('Nước xuất xứ (mã 2 chữ cái)')}
                    </label>
                    <input
                      id={`m-origin-${index}`}
                      maxLength={2}
                      value={row.origin}
                      onChange={(e) => update(index, { origin: e.target.value })}
                      placeholder="CN"
                      className={field}
                    />
                  </div>
                  <div>
                    <label htmlFor={`m-value-${index}`} className={label}>
                      {tr('Giá trị nguyên liệu')}
                    </label>
                    <input
                      id={`m-value-${index}`}
                      inputMode="decimal"
                      value={row.value}
                      onChange={(e) => update(index, { value: e.target.value })}
                      className={field}
                    />
                  </div>
                  <div>
                    <label htmlFor={`m-hs-${index}`} className={label}>
                      {tr('Mã HS nguyên liệu (nếu có)')}
                    </label>
                    <input id={`m-hs-${index}`} value={row.hs} onChange={(e) => update(index, { hs: e.target.value })} className={field} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMaterials((rows) => rows.filter((_, i) => i !== index))}
                  className="mt-3 text-sm font-semibold text-rose-700 hover:underline"
                >
                  {tr('Xóa nguyên liệu')} {index + 1}
                </button>
              </fieldset>
            ))}
            <button
              type="button"
              disabled={materials.length >= MAX_MATERIALS}
              onClick={() => setMaterials((rows) => [...rows, emptyMaterial()])}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              {tr('Thêm nguyên liệu')}
            </button>
          </div>
        )}
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
          {tr(busy ? 'Đang kiểm tra...' : 'Kiểm tra xuất xứ')}
        </button>
      </form>
      )}
        </div>
        <aside ref={resultRef} className="lg:sticky lg:top-24">
          <h2 className="text-base font-bold text-slate-900">{tr('Kết quả kiểm tra')}</h2>
          <div className="mt-3">
            {guided && guidedResult ? (
              <OriginResultPanel data={guidedResult} goodsName={hs?.name_en ?? ''} />
            ) : !guided && result ? (
              <Result data={result} goodsName={hs?.name_en ?? ''} />
            ) : (
              <p data-testid="result-placeholder" className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                {tr('Trả lời các câu hỏi bên trái rồi bấm "Kiểm tra xuất xứ". Kết luận, lý do và danh sách giấy tờ cần chuẩn bị sẽ hiện ở đây.')}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
