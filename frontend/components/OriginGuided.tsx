'use client';

// Máy tính xuất xứ có hướng dẫn cho mã đã có dữ liệu Chương 3/7/8: câu hỏi và trường trả lời lấy từ
// backend theo loại quy tắc. Ba trạng thái riêng Đạt / Không đạt / Chưa kết luận; thiếu dữ liệu thì
// "Chưa kết luận", không bao giờ "Không đạt". Không có tính năng cấp C/O.
import React, { useState } from 'react';
import Eur1DraftPanel from './Eur1DraftPanel';
import UnreviewedNotice from './UnreviewedNotice';
import { useLanguage } from '../context/LanguageContext';
import {
  buildOriginBody,
  calculateOrigin,
  isInputVisible,
  type Answers,
  type EvidenceItem,
  type OriginError,
  type OriginInput,
  type OriginQuestions,
  type OriginResult,
} from '../lib/complianceApi';
import { parseAmount } from '../lib/tariffApi';

const ERRORS: Record<OriginError, string> = {
  rate_limited: 'Bạn đã kiểm tra quá nhiều lần. Vui lòng thử lại sau một phút.',
  invalid: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các câu trả lời.',
  network: 'Không kết nối được máy chủ. Vui lòng thử lại.',
};

const LABELS: Record<string, string> = {
  transit_third_country: 'Hàng có quá cảnh, lưu kho hoặc chia lô ở nước thứ ba không?',
  transit_handling: 'Ở nước thứ ba, hàng được xử lý thế nào?',
  only_article6_operations:
    'Mọi công đoạn tại Việt Nam trên nguyên liệu nhập khẩu chỉ là thao tác đơn giản (đóng gói lại, đông lạnh, phân loại...)?',
  sourcing: 'Nguồn sản phẩm / nguyên liệu',
  vessel_registered_vn_eu: 'Tàu đăng ký tại Việt Nam hoặc EU?',
  vessel_flag_vn_eu: 'Tàu mang cờ Việt Nam hoặc EU?',
  vessel_ownership_pct: 'Tỷ lệ sở hữu tàu của công dân/pháp nhân Việt Nam hoặc EU (%)',
  materials_outside_territorial_sea: 'Nguyên liệu được đánh bắt ngoài lãnh hải Việt Nam?',
  restricted_nonorig_pct_weight: 'Tỷ lệ nguyên liệu nhập khẩu không thuần túy theo trọng lượng (%)',
  restricted_nonorig_pct_value: 'Tỷ lệ nguyên liệu nhập khẩu không thuần túy theo giá xuất xưởng (%)',
  sugar_pct_weight: 'Tỷ lệ đường thêm vào (% trọng lượng)',
};

const OPTIONS: Record<string, string> = {
  STORAGE_UNDER_CUSTOMS: 'Chỉ lưu kho / chia lô dưới giám sát hải quan',
  PROCESSED: 'Có gia công ngoài bảo quản và dán nhãn',
  FARMED_IN_VN: 'Nuôi tại Việt Nam (kể cả từ giống nhập khẩu)',
  CAUGHT_IN_VN_TERRITORIAL_SEA: 'Đánh bắt trong lãnh hải Việt Nam',
  CAUGHT_BY_VESSEL: 'Đánh bắt bằng tàu ngoài lãnh hải',
  IMPORTED: 'Nhập khẩu, chỉ sơ chế',
};

const STATUS_STYLE = {
  pass: ['Đạt', 'text-emerald-800'],
  fail: ['Không đạt', 'text-rose-800'],
  inconclusive: ['Chưa kết luận', 'text-amber-800'],
  unsupported: ['Chưa hỗ trợ', 'text-slate-800'],
} as const;

const EVIDENCE_STATUS: Record<EvidenceItem['status'], string> = {
  REQUIRED: 'Bắt buộc',
  NEEDS_INPUT: 'Cần thêm thông tin để xác định',
  CHECK_REQUIRED: 'Cần kiểm tra thêm (chưa có dữ liệu danh mục)',
};

const BLOCKS: Record<EvidenceItem['blocks'], string> = {
  IMPORT: 'Chặn nhập khẩu nếu thiếu',
  TARIFF_PREFERENCE: 'Cần để hưởng ưu đãi thuế',
  NONE: 'Hồ sơ lưu',
};

const field =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]';
const label = 'block text-sm font-semibold text-slate-700';

function YesNo({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  const { tr } = useLanguage();
  const choices = [
    ['yes', 'Có'],
    ['no', 'Không'],
    ['', 'Chưa rõ'],
  ] as const;
  return (
    <div className="mt-2 flex flex-wrap gap-4">
      {choices.map(([v, text]) => (
        <label key={text} className="flex items-center gap-2 text-sm text-slate-700">
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} className="accent-[#083832]" />
          {tr(text)}
        </label>
      ))}
    </div>
  );
}

function Question({ input, value, onChange }: { input: OriginInput; value: string; onChange: (v: string) => void }) {
  const { tr } = useLanguage();
  const id = `origin-${input.name}`;
  const text = tr(LABELS[input.name] ?? input.name);
  if (input.kind === 'boolean') {
    return (
      <fieldset>
        <legend className={label}>{text}</legend>
        <YesNo name={id} value={value} onChange={onChange} />
      </fieldset>
    );
  }
  if (input.kind === 'enum') {
    return (
      <div>
        <label htmlFor={id} className={label}>
          {text}
        </label>
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={field}>
          <option value="">{tr('Chưa rõ')}</option>
          {input.options.map((o) => (
            <option key={o} value={o}>
              {tr(OPTIONS[o] ?? o)}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div>
      <label htmlFor={id} className={label}>
        {text}
      </label>
      <input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0 – 100" className={field} />
    </div>
  );
}

function EvidenceList({ result }: { result: OriginResult }) {
  const { tr, language } = useLanguage();
  const block = result.required_evidence;
  if (!block || block.items.length === 0) return null;
  const name = (item: EvidenceItem) => (language === 'vi' ? item.name_vi : item.name_en || item.name_vi);
  return (
    <div className="mt-6" data-testid="evidence-list">
      <h2 className="text-base font-bold text-slate-900">{tr('Bằng chứng cần chuẩn bị cho lô này')}</h2>
      <UnreviewedNotice state={block.review_state} />
      <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
        {block.items.map((item) => (
          <li key={item.code} className="p-3 text-sm">
            <p className="font-semibold text-slate-900">{name(item)}</p>
            <p className="mt-1 text-xs text-slate-600">
              {tr(BLOCKS[item.blocks])} · {tr(EVIDENCE_STATUS[item.status])}
              {item.scope === 'COMPANY' ? ` · ${tr('Cấp công ty')}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Result({ data, goodsName }: { data: OriginResult; goodsName: string }) {
  const { tr, language } = useLanguage();
  const [headline, tone] = STATUS_STYLE[data.status];
  const money = (value: string) =>
    new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-GB', { style: 'currency', currency: 'EUR' }).format(Number(value));
  const notes = [data.insufficient_operations_vi, data.tolerance_note_vi, data.risk_note_vi].filter(Boolean) as string[];

  return (
    <section aria-label={tr('Kết quả')} className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className={`text-3xl font-extrabold ${tone}`}>{tr(headline)}</p>
      <ul className="mt-3 space-y-1 text-sm text-slate-700">
        {data.reasons.map((r) => (
          <li key={r.code}>{language === 'vi' ? r.vi : r.en}</li>
        ))}
      </ul>
      {data.status === 'inconclusive' && data.inputs_missing.length > 0 && (
        <div className="mt-3 text-sm text-slate-700">
          <p className="font-semibold">{tr('Còn thiếu câu trả lời cho:')}</p>
          <ul className="mt-1 list-disc pl-5">
            {data.inputs_missing.map((name) => (
              <li key={name}>{tr(LABELS[name] ?? name)}</li>
            ))}
          </ul>
        </div>
      )}
      {data.savings !== null && (
        <p className="mt-4 text-sm text-slate-700" data-testid="origin-savings">
          {tr('Tiết kiệm thuế của lô nếu được hưởng ưu đãi')}: <strong>{money(data.savings)}</strong>
        </p>
      )}
      <UnreviewedNotice state={data.review_state} />
      {data.rule_text_vi && <p className="mt-3 text-sm text-slate-700">{language === 'vi' ? data.rule_text_vi : data.rule_text_en || data.rule_text_vi}</p>}
      {notes.map((note) => (
        <p key={note} className="mt-2 text-xs text-slate-600">
          {note}
        </p>
      ))}
      <EvidenceList result={data} />
      <p className="mt-5 text-xs text-slate-500">
        {tr('Kết quả chỉ mang tính tham khảo. Cơ quan cấp chứng nhận xuất xứ chính thức là Bộ Công Thương.')}
      </p>
      {data.status === 'pass' && <Eur1DraftPanel checkId={data.check_id} goodsName={goodsName} />}
    </section>
  );
}

export default function OriginGuided({ hsCode, goodsName, questions }: { hsCode: string; goodsName: string; questions: OriginQuestions }) {
  const { tr, language } = useLanguage();
  const [answers, setAnswers] = useState<Answers>({});
  const [consignment, setConsignment] = useState('');
  const [rawSource, setRawSource] = useState('');
  const [fresh, setFresh] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OriginResult | null>(null);
  const set = (name: string, value: string) => setAnswers((current) => ({ ...current, [name]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResult(null);
    setError('');
    let consignmentValue: string | null = null;
    if (consignment.trim() !== '') {
      consignmentValue = parseAmount(consignment);
      if (!consignmentValue) return setError('Trị giá lô phải là số dương, tối đa 2 chữ số thập phân (ví dụ 5000 hoặc 5000.50).');
    }
    const built = buildOriginBody(hsCode, questions.inputs, answers, { consignmentValue, rawMaterialSource: rawSource, isFresh: fresh });
    if (!built.ok) return setError('Tỷ lệ phần trăm phải là số từ 0 đến 100, tối đa 2 chữ số thập phân.');
    setBusy(true);
    const outcome = await calculateOrigin(built.body);
    setBusy(false);
    if (outcome.ok) setResult(outcome.data);
    else setError(ERRORS[outcome.error]);
  };

  return (
    <div data-testid="origin-guided">
      <UnreviewedNotice state={questions.review_state} />
      {questions.requires_expert && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          {tr('Quy tắc này cần chuyên gia xác nhận nên hệ thống chỉ có thể trả "Chưa kết luận".')}
        </p>
      )}
      {questions.questions.length > 0 && (
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          {questions.questions.map((q) => (
            <li key={q.order}>{language === 'vi' ? q.text_vi : q.text_en || q.text_vi}</li>
          ))}
        </ol>
      )}
      <form onSubmit={submit} noValidate className="mt-6 space-y-5">
        {questions.inputs
          .filter((input) => isInputVisible(input, answers))
          .map((input) => (
            <Question key={input.name} input={input} value={answers[input.name] ?? ''} onChange={(v) => set(input.name, v)} />
          ))}
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700">{tr('Thông tin lô hàng (để lập danh sách bằng chứng)')}</p>
          <label htmlFor="origin-consignment" className={`${label} mt-3`}>
            {tr('Trị giá lô hàng (EUR)')}
          </label>
          <input id="origin-consignment" inputMode="decimal" value={consignment} onChange={(e) => setConsignment(e.target.value)} className={field} />
          <label htmlFor="origin-raw-source" className={`${label} mt-3`}>
            {tr('Nguồn nguyên liệu của lô')}
          </label>
          <select id="origin-raw-source" value={rawSource} onChange={(e) => setRawSource(e.target.value)} className={field}>
            <option value="">{tr('Chưa rõ')}</option>
            <option value="AQUACULTURE">{tr('Nuôi trồng')}</option>
            <option value="WILD_CAUGHT">{tr('Đánh bắt tự nhiên')}</option>
            <option value="GROWN">{tr('Trồng trọt')}</option>
          </select>
          <fieldset className="mt-3">
            <legend className={label}>{tr('Hàng tươi?')}</legend>
            <YesNo name="origin-fresh" value={fresh} onChange={setFresh} />
          </fieldset>
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
          {tr(busy ? 'Đang kiểm tra...' : 'Kiểm tra xuất xứ')}
        </button>
      </form>
      {result && <Result data={result} goodsName={goodsName} />}
    </div>
  );
}
