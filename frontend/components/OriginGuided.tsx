'use client';

// Kiểm tra xuất xứ có hướng dẫn cho mã đã có dữ liệu Chương 3/7/8. Hai phần tách riêng để trang chia
// hai cột: OriginGuided (cột câu hỏi: các câu hỏi và ô trả lời lấy từ backend theo loại quy tắc) và
// OriginResultPanel (cột kết quả). Ba trạng thái riêng Đạt / Không đạt / Chưa kết luận; thiếu dữ liệu
// thì "Chưa kết luận", không bao giờ "Không đạt". Không có tính năng cấp C/O.
import React, { useState } from 'react';
import { CheckCircle2, HelpCircle, Info, XCircle } from 'lucide-react';
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

const VERDICT = {
  pass: {
    title: 'Đạt',
    summary: 'Theo dữ liệu hiện có, lô hàng đáp ứng quy tắc xuất xứ.',
    Icon: CheckCircle2,
    box: 'border-emerald-200 bg-emerald-50',
    text: 'text-emerald-900',
  },
  fail: {
    title: 'Không đạt',
    summary: 'Theo dữ liệu hiện có, lô hàng chưa đáp ứng quy tắc xuất xứ.',
    Icon: XCircle,
    box: 'border-rose-200 bg-rose-50',
    text: 'text-rose-900',
  },
  inconclusive: {
    title: 'Chưa kết luận',
    summary: 'Chưa đủ căn cứ để kết luận. Xem phần cần bổ sung bên dưới.',
    Icon: HelpCircle,
    box: 'border-amber-200 bg-amber-50',
    text: 'text-amber-900',
  },
  unsupported: {
    title: 'Chưa hỗ trợ',
    summary: 'Mã hàng này chưa có quy tắc xuất xứ trong dữ liệu của hệ thống.',
    Icon: Info,
    box: 'border-slate-200 bg-slate-50',
    text: 'text-slate-900',
  },
} as const;

const EVIDENCE_GROUPS: { blocks: EvidenceItem['blocks']; title: string }[] = [
  { blocks: 'IMPORT', title: 'Bắt buộc để nhập khẩu vào EU' },
  { blocks: 'TARIFF_PREFERENCE', title: 'Để hưởng ưu đãi thuế' },
  { blocks: 'NONE', title: 'Hồ sơ lưu trữ' },
];

const EVIDENCE_TAG: Record<EvidenceItem['status'], { text: string; tone: string }> = {
  REQUIRED: { text: 'Bắt buộc', tone: 'bg-emerald-100 text-emerald-800' },
  NEEDS_INPUT: { text: 'Tùy thông tin lô hàng', tone: 'bg-slate-100 text-slate-700' },
  CHECK_REQUIRED: { text: 'Cần kiểm tra thêm', tone: 'bg-amber-100 text-amber-800' },
};

const field =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]';
const label = 'block text-sm font-semibold text-slate-700';
const sectionTitle = 'text-xs font-semibold uppercase tracking-wide text-slate-500';

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

/** Danh sách giấy tờ cần chuẩn bị, nhóm theo mức chặn; bỏ huy hiệu của nền tảng (không phải giấy tờ của lô). */
function EvidenceList({ result }: { result: OriginResult }) {
  const { tr, language } = useLanguage();
  const items = (result.required_evidence?.items ?? []).filter((item) => item.layer !== 'PLATFORM_BADGE');
  if (items.length === 0) return null;
  const name = (item: EvidenceItem) => (language === 'vi' ? item.name_vi : item.name_en || item.name_vi);
  return (
    <section data-testid="evidence-list" className="space-y-3">
      <h3 className={sectionTitle}>{tr('Giấy tờ cần chuẩn bị cho lô này')}</h3>
      {EVIDENCE_GROUPS.map(({ blocks, title }) => {
        const group = items.filter((item) => item.blocks === blocks);
        if (group.length === 0) return null;
        return (
          <div key={blocks}>
            <p className="text-sm font-semibold text-slate-900">{tr(title)}</p>
            <ul className="mt-1.5 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {group.map((item) => {
                const tag = EVIDENCE_TAG[item.status];
                return (
                  <li key={item.code} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-sm">
                    <span className="text-slate-800">
                      {name(item)}
                      {item.scope === 'COMPANY' && <span className="ml-1.5 text-[11px] text-slate-500">· {tr('Cấp công ty')}</span>}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tag.tone}`}>{tr(tag.text)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function RuleDetails({ result }: { result: OriginResult }) {
  const { tr, language } = useLanguage();
  const rule = language === 'vi' ? result.rule_text_vi : result.rule_text_en || result.rule_text_vi;
  const rows: [string, string | null][] = [
    ['Quy tắc áp dụng', rule],
    ['Thao tác chưa đủ để tạo xuất xứ', result.insufficient_operations_vi],
    ['Dung sai', result.tolerance_note_vi],
    ['Mức rủi ro', result.risk_note_vi],
  ];
  const shown = rows.filter((row): row is [string, string] => Boolean(row[1]));
  if (shown.length === 0) return null;
  return (
    <details data-testid="rule-details" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">{tr('Chi tiết quy tắc')}</summary>
      <dl className="mt-2 space-y-2">
        {shown.map(([title, value]) => (
          <div key={title}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{tr(title)}</dt>
            <dd className="mt-0.5 text-slate-700">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/** Cột kết quả: kết luận → lý do / việc cần bổ sung → tiết kiệm → giấy tờ → chi tiết quy tắc. Chỉ MỘT lưu ý. */
export function OriginResultPanel({ data, goodsName }: { data: OriginResult; goodsName: string }) {
  const { tr, language } = useLanguage();
  const verdict = VERDICT[data.status];
  const money = (value: string) =>
    new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-GB', { style: 'currency', currency: 'EUR' }).format(Number(value));

  return (
    <section aria-label={tr('Kết quả')} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className={`flex items-start gap-3 rounded-xl border p-4 ${verdict.box}`}>
        <verdict.Icon className={`mt-0.5 h-7 w-7 shrink-0 ${verdict.text}`} aria-hidden />
        <div>
          <p className={`text-2xl font-extrabold leading-tight ${verdict.text}`}>{tr(verdict.title)}</p>
          <p className="mt-1 text-sm text-slate-700">{tr(verdict.summary)}</p>
        </div>
      </div>
      <UnreviewedNotice state={data.review_state} compact />

      {data.reasons.length > 0 && (
        <section className="space-y-1.5">
          <h3 className={sectionTitle}>{tr('Lý do')}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
            {data.reasons.map((r) => (
              <li key={r.code}>{language === 'vi' ? r.vi : r.en}</li>
            ))}
          </ul>
        </section>
      )}

      {data.status === 'inconclusive' && data.inputs_missing.length > 0 && (
        <section className="space-y-1.5">
          <h3 className={sectionTitle}>{tr('Cần bổ sung')}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
            {data.inputs_missing.map((name) => (
              <li key={name}>{tr(LABELS[name] ?? name)}</li>
            ))}
          </ul>
        </section>
      )}

      {data.savings !== null && (
        <div className="rounded-xl bg-slate-50 p-3" data-testid="origin-savings">
          <p className="text-xs font-semibold text-slate-500">{tr('Tiết kiệm thuế của lô nếu được hưởng ưu đãi')}</p>
          <p className="mt-0.5 text-xl font-extrabold text-slate-900">{money(data.savings)}</p>
        </div>
      )}

      <EvidenceList result={data} />
      <RuleDetails result={data} />

      <p className="text-[11px] leading-relaxed text-slate-500">
        {tr('Kết quả chỉ mang tính tham khảo. Cơ quan cấp chứng nhận xuất xứ chính thức là Bộ Công Thương.')}
      </p>
      {data.status === 'pass' && <Eur1DraftPanel checkId={data.check_id} goodsName={goodsName} />}
    </section>
  );
}

/** Cột câu hỏi: ô trả lời theo loại quy tắc + thông tin lô; gửi xong gọi onResult. */
export default function OriginGuided({
  hsCode,
  questions,
  onResult,
}: {
  hsCode: string;
  questions: OriginQuestions;
  onResult: (result: OriginResult | null) => void;
}) {
  const { tr, language } = useLanguage();
  const [answers, setAnswers] = useState<Answers>({});
  const [consignment, setConsignment] = useState('');
  const [rawSource, setRawSource] = useState('');
  const [fresh, setFresh] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (name: string, value: string) => setAnswers((current) => ({ ...current, [name]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    onResult(null);
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
    if (outcome.ok) onResult(outcome.data);
    else setError(ERRORS[outcome.error]);
  };

  return (
    <div data-testid="origin-guided">
      {questions.requires_expert && (
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          {tr('Quy tắc này cần chuyên gia xác nhận nên hệ thống chỉ có thể trả "Chưa kết luận".')}
        </p>
      )}
      {questions.questions.length > 0 && (
        <ol className="mb-5 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          {questions.questions.map((q) => (
            <li key={q.order}>{language === 'vi' ? q.text_vi : q.text_en || q.text_vi}</li>
          ))}
        </ol>
      )}
      <form onSubmit={submit} noValidate className="space-y-5">
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
    </div>
  );
}
