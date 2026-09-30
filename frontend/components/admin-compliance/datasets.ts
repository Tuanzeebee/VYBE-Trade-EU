// Khai báo bốn nhóm dữ liệu tuân thủ: cột bảng, trường form, chú thích và lời gọi API (C1, C4, C6).
// Chuỗi tiếng Việt ở đây được dịch khi hiển thị bằng tr() (xem i18n/catalog.json).
import {
  createEvidenceRule,
  createEvidenceType,
  createRooRule,
  createTariffLine,
  deleteEvidenceRule,
  deleteRooRule,
  deleteTariffLine,
  listEvidenceRules,
  listEvidenceTypes,
  listRooRules,
  listTariffLines,
  reviewEvidenceRule,
  reviewEvidenceType,
  reviewRooRule,
  reviewTariffLine,
  updateEvidenceRule,
  updateEvidenceType,
  updateRooRule,
  updateTariffLine,
  type EvidenceRuleInput,
  type EvidenceRulePatch,
  type EvidenceTypeInput,
  type EvidenceTypePatch,
  type RooRuleInput,
  type RooRulePatch,
  type TariffLineInput,
  type TariffLinePatch,
} from '../../lib/adminApi';

export type FieldKind = 'text' | 'textarea' | 'date' | 'bool' | 'decimal' | 'int' | 'select';
export type FieldValue = string | boolean;

export interface Field {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  options?: readonly string[];
  help?: string;
  /** Khóa nhận diện: nhập khi thêm mới, không sửa được sau đó. */
  locked?: boolean;
  /** Giá trị ban đầu của form thêm mới. */
  initial?: FieldValue;
}

export interface Row {
  id: string;
  reviewed: boolean;
  canDelete: boolean;
  cells: string[];
  values: Record<string, FieldValue>;
  search: string;
}

export interface LegendItem {
  term: string;
  text: string;
}

export type Body = Record<string, unknown>;

export interface Dataset {
  key: string;
  label: string;
  columns: string[];
  fields: Field[];
  legend: LegendItem[];
  /** Đường dẫn gốc của nhóm dữ liệu, dùng cho template / xuất / nhập Excel. */
  xlsxPath: string;
  xlsxName: string;
  load: () => Promise<Row[] | null>;
  create: (body: Body) => Promise<void>;
  update: (id: string, body: Body) => Promise<void>;
  review: (id: string) => Promise<void>;
  remove: ((id: string) => Promise<void>) | null;
}

export const YES = 'Có';
export const NO = 'Không';
export const REQUIRED = 'Bắt buộc';
export const REMINDER = 'Chỉ nhắc';
export const NO_EXPIRY = 'Không thời hạn';
/** Ô bảng mang giá trị cố định cần dịch. */
export const TRANSLATED_CELLS = [YES, NO, REQUIRED, REMINDER, NO_EXPIRY];

const EU_MEMBERS = 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' ');
export const DESTINATIONS = ['EU', ...EU_MEMBERS] as const;

const pct = (value: string | null | undefined) => (value == null ? '—' : `${Number(value)}%`);
const yesNo = (value: boolean) => (value ? YES : NO);

/** "7.5000" → "7.5": chỉ để hiện trong form, không đi qua số thực. */
const plain = (value: string | null | undefined) => (value == null ? '' : value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value);
const text = (value: string | null | undefined) => value ?? '';

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();
}

const searchable = (...parts: (string | null | undefined)[]) => normalizeSearch(parts.filter(Boolean).join(' '));

const COMMON_LEGEND: LegendItem[] = [
  { term: 'Chưa duyệt', text: 'Dữ liệu mới thêm, mới nhập hoặc vừa sửa. Không hiện công khai và máy tính tuân thủ chưa dùng.' },
  { term: 'Đã duyệt', text: 'Đã có người duyệt. Sửa lại sẽ đưa dòng về Chưa duyệt. Dòng thuế và quy tắc xuất xứ đã duyệt không xóa được: đặt Đến ngày để ngừng áp dụng.' },
];

const TARIFF_LEGEND: LegendItem[] = [
  { term: 'ad_valorem', text: 'Thuế theo phần trăm trị giá hàng. Chỉ loại này mới cho ra con số thuế trong máy tính.' },
  { term: 'specific', text: 'Thuế tuyệt đối: số tiền cố định trên mỗi đơn vị (kg, tấn…), ghi ở trường thuế tuyệt đối. Máy tính không tự quy đổi mà trả về "cần xem xét".' },
  { term: 'mixed', text: 'Thuế hỗn hợp: kết hợp phần trăm và thuế tuyệt đối. Máy tính trả về "cần xem xét".' },
  { term: 'MFN', text: 'Thuế tối huệ quốc áp cho hàng không hưởng ưu đãi EVFTA, tính bằng %.' },
  { term: 'EVFTA', text: 'Thuế ưu đãi EVFTA hiện hành, tính bằng %.' },
  { term: 'Hạn ngạch', text: 'Có = hàng chịu hạn ngạch thuế quan. Máy tính trả về "cần xem xét", không trả 0%.' },
  { term: 'Nơi đến', text: 'Mã ISO-2 của nước EU, hoặc EU nếu áp dụng biểu thuế chung của cả liên minh thuế quan.' },
  { term: 'Từ ngày / Đến ngày', text: 'Ngày bắt đầu hiệu lực và ngày đã hết hiệu lực. Đến ngày để trống nghĩa là không thời hạn.' },
];

const ROO_LEGEND: LegendItem[] = [
  { term: 'WO', text: 'Xuất xứ thuần túy: hàng được sản xuất hoàn toàn tại nước xuất khẩu.' },
  { term: 'CTH', text: 'Chuyển đổi nhóm HS: nguyên liệu không xuất xứ phải khác nhóm HS 4 số với thành phẩm.' },
  { term: 'MaxNOM', text: 'Nguyên liệu không xuất xứ tối đa một tỷ lệ % giá xuất xưởng. Bắt buộc nhập Ngưỡng NOM.' },
  { term: 'CTH_OR_MaxNOM', text: 'Đạt CTH hoặc MaxNOM là được. Bắt buộc nhập Ngưỡng NOM.' },
  { term: 'Ngưỡng NOM', text: 'Chỉ nhập cho MaxNOM và CTH_OR_MaxNOM; phải để trống với WO và CTH.' },
  { term: 'Cần chuyên gia', text: 'Có = quy tắc phức tạp; máy tính luôn trả về "chưa kết luận" và chuyển cho chuyên gia.' },
  { term: 'Từ ngày / Đến ngày', text: 'Ngày bắt đầu hiệu lực và ngày đã hết hiệu lực. Đến ngày để trống nghĩa là không thời hạn.' },
];

const TYPE_LEGEND: LegendItem[] = [
  { term: 'Mã', text: 'Định danh duy nhất: chữ thường, số, gạch dưới, bắt đầu bằng chữ (vd iso_9001). Không đổi được sau khi tạo.' },
  { term: 'Nhóm', text: 'Nhóm gom loại bằng chứng: origin, quality, social, technical, lab…' },
  { term: 'Hạn (tháng)', text: 'Số tháng bằng chứng có hiệu lực kể từ ngày cấp. Để trống nếu không tự tính hạn.' },
  { term: 'Đang bật', text: 'Không = exporter không thể nộp loại bằng chứng này nữa.' },
];

const RULE_LEGEND: LegendItem[] = [
  { term: 'Nhóm hàng', text: 'Nhóm hàng trong danh mục HS (vd agriculture, seafood).' },
  { term: 'Bắt buộc', text: 'Tính vào điều kiện đạt EVFTA-verified của nhà xuất khẩu.' },
  { term: 'Chỉ nhắc', text: 'Chỉ nhắc nhà xuất khẩu, không tính vào điều kiện đạt.' },
];

const validity: Field[] = [
  { key: 'valid_from', label: 'Từ ngày', kind: 'date', required: true, help: 'Ngày bắt đầu hiệu lực.' },
  { key: 'valid_until', label: 'Đến ngày', kind: 'date', help: 'Ngày ĐÃ hết hiệu lực, phải sau Từ ngày. Để trống = không thời hạn.' },
];

export const DATASETS: Dataset[] = [
  {
    key: 'tariff',
    label: 'Dòng thuế',
    columns: ['Mã HS', 'Nơi đến', 'Loại thuế', 'MFN', 'EVFTA', 'Hạn ngạch', 'Từ ngày', 'Đến ngày'],
    fields: [
      { key: 'hs_code', label: 'Mã HS', kind: 'text', required: true, help: '6–8 chữ số, phải có trong danh mục HS.' },
      { key: 'destination', label: 'Nơi đến', kind: 'select', required: true, options: DESTINATIONS, initial: 'EU' },
      { key: 'duty_type', label: 'Loại thuế', kind: 'select', required: true, options: ['ad_valorem', 'specific', 'mixed'], initial: 'ad_valorem', help: 'Xem chú thích: chỉ ad_valorem cho ra con số thuế.' },
      { key: 'mfn_rate', label: 'MFN (%)', kind: 'decimal', help: '0–100, tối đa 4 chữ số thập phân.' },
      { key: 'mfn_specific', label: 'Thuế tuyệt đối/hỗn hợp', kind: 'text', help: 'Dạng văn bản, vd "176 EUR/100 kg".' },
      { key: 'evfta_rate_current', label: 'EVFTA hiện hành (%)', kind: 'decimal', help: '0–100, tối đa 4 chữ số thập phân.' },
      { key: 'staging_category', label: 'Lộ trình cắt giảm', kind: 'text', help: 'Ký hiệu nhóm cắt giảm, vd A, B5.' },
      { key: 'zero_from', label: 'Ngày về 0%', kind: 'date' },
      { key: 'quota_required', label: 'Hạn ngạch', kind: 'bool', initial: false },
      { key: 'quota_note', label: 'Ghi chú hạn ngạch', kind: 'textarea' },
      { key: 'condition_note', label: 'Điều kiện áp dụng', kind: 'textarea' },
      { key: 'source_url', label: 'Nguồn (URL)', kind: 'text' },
      ...validity,
    ],
    legend: TARIFF_LEGEND,
    xlsxPath: '/api/admin/tariff-lines',
    xlsxName: 'tariff-lines',
    load: async () =>
      ((await listTariffLines()) ?? null)?.map((r) => ({
        id: r.id,
        reviewed: r.reviewed_by !== null,
        canDelete: r.reviewed_by === null,
        cells: [r.hs_code, r.destination, r.duty_type, pct(r.mfn_rate), pct(r.evfta_rate_current), yesNo(r.quota_required), r.valid_from, r.valid_until ?? NO_EXPIRY],
        values: {
          hs_code: r.hs_code,
          destination: r.destination,
          duty_type: r.duty_type,
          mfn_rate: plain(r.mfn_rate),
          mfn_specific: text(r.mfn_specific),
          evfta_rate_current: plain(r.evfta_rate_current),
          staging_category: text(r.staging_category),
          zero_from: text(r.zero_from),
          quota_required: r.quota_required,
          quota_note: text(r.quota_note),
          condition_note: text(r.condition_note),
          source_url: text(r.source_url),
          valid_from: r.valid_from,
          valid_until: text(r.valid_until),
        },
        search: searchable(r.hs_code, r.destination, r.duty_type, r.staging_category, r.mfn_specific, r.quota_note, r.condition_note, r.source_url),
      })) ?? null,
    create: (body) => createTariffLine(body as unknown as TariffLineInput),
    update: (id, body) => updateTariffLine(id, body as TariffLinePatch),
    review: reviewTariffLine,
    remove: deleteTariffLine,
  },
  {
    key: 'roo',
    label: 'Quy tắc xuất xứ',
    columns: ['Mã HS', 'Loại quy tắc', 'Ngưỡng NOM', 'Cần chuyên gia', 'Từ ngày', 'Đến ngày'],
    fields: [
      { key: 'hs_code', label: 'Mã HS', kind: 'text', required: true, help: '6–8 chữ số, phải có trong danh mục HS.' },
      { key: 'rule_type', label: 'Loại quy tắc', kind: 'select', required: true, options: ['WO', 'CTH', 'MaxNOM', 'CTH_OR_MaxNOM'], initial: 'WO' },
      { key: 'threshold_pct', label: 'Ngưỡng NOM (%)', kind: 'decimal', help: 'Bắt buộc với MaxNOM và CTH_OR_MaxNOM; để trống với WO và CTH.' },
      { key: 'rule_text', label: 'Nguyên văn quy tắc', kind: 'textarea' },
      { key: 'requires_expert', label: 'Cần chuyên gia', kind: 'bool', initial: false },
      { key: 'source', label: 'Nguồn', kind: 'text' },
      ...validity,
    ],
    legend: ROO_LEGEND,
    xlsxPath: '/api/admin/roo-rules',
    xlsxName: 'roo-rules',
    load: async () =>
      ((await listRooRules()) ?? null)?.map((r) => ({
        id: r.id,
        reviewed: r.reviewed_by !== null,
        canDelete: r.reviewed_by === null,
        cells: [r.hs_code, r.rule_type, pct(r.threshold_pct), yesNo(r.requires_expert), r.valid_from, r.valid_until ?? NO_EXPIRY],
        values: {
          hs_code: r.hs_code,
          rule_type: r.rule_type,
          threshold_pct: plain(r.threshold_pct),
          rule_text: text(r.rule_text),
          requires_expert: r.requires_expert,
          source: text(r.source),
          valid_from: r.valid_from,
          valid_until: text(r.valid_until),
        },
        search: searchable(r.hs_code, r.rule_type, r.rule_text, r.source),
      })) ?? null,
    create: (body) => createRooRule(body as unknown as RooRuleInput),
    update: (id, body) => updateRooRule(id, body as RooRulePatch),
    review: reviewRooRule,
    remove: deleteRooRule,
  },
  {
    key: 'types',
    label: 'Loại bằng chứng',
    columns: ['Mã', 'Tên', 'Nhóm', 'Hạn (tháng)', 'Đang bật'],
    fields: [
      { key: 'code', label: 'Mã', kind: 'text', required: true, locked: true, help: 'Chữ thường, số, gạch dưới; không đổi được sau khi tạo.' },
      { key: 'name_vi', label: 'Tên (tiếng Việt)', kind: 'text', required: true },
      { key: 'name_en', label: 'Tên (tiếng Anh)', kind: 'text', required: true },
      { key: 'group', label: 'Nhóm', kind: 'text', required: true, help: 'origin, quality, social, technical, lab…' },
      { key: 'validity_months', label: 'Hạn (tháng)', kind: 'int', help: 'Số nguyên > 0; để trống nếu không tự tính hạn.' },
      { key: 'is_active', label: 'Đang bật', kind: 'bool', initial: true },
      { key: 'source', label: 'Nguồn', kind: 'textarea' },
    ],
    legend: TYPE_LEGEND,
    xlsxPath: '/api/admin/evidence-types',
    xlsxName: 'evidence-types',
    load: async () =>
      ((await listEvidenceTypes()) ?? null)?.map((r) => ({
        id: r.code,
        reviewed: r.reviewed_by !== null,
        canDelete: false,
        cells: [r.code, r.name_vi, r.group, r.validity_months === null ? '—' : String(r.validity_months), yesNo(r.is_active)],
        values: {
          code: r.code,
          name_vi: r.name_vi,
          name_en: r.name_en,
          group: r.group,
          validity_months: r.validity_months === null ? '' : String(r.validity_months),
          is_active: r.is_active,
          source: text(r.source),
        },
        search: searchable(r.code, r.name_vi, r.name_en, r.group, r.source),
      })) ?? null,
    create: (body) => createEvidenceType(body as unknown as EvidenceTypeInput),
    update: (id, body) => updateEvidenceType(id, body as EvidenceTypePatch),
    review: reviewEvidenceType,
    remove: null,
  },
  {
    key: 'rules',
    label: 'Luật bằng chứng theo nhóm hàng',
    columns: ['Nhóm hàng', 'Loại bằng chứng', 'Mức độ', 'Ghi chú'],
    fields: [
      { key: 'category', label: 'Nhóm hàng', kind: 'text', required: true, help: 'Nhóm hàng trong danh mục HS, vd agriculture.' },
      { key: 'evidence_type_code', label: 'Loại bằng chứng', kind: 'text', required: true, help: 'Mã loại bằng chứng đã tồn tại.' },
      { key: 'is_required', label: 'Bắt buộc', kind: 'bool', initial: true, help: 'Bỏ chọn = chỉ nhắc.' },
      { key: 'note', label: 'Ghi chú', kind: 'textarea' },
    ],
    legend: RULE_LEGEND,
    xlsxPath: '/api/admin/evidence-rules',
    xlsxName: 'evidence-rules',
    load: async () =>
      ((await listEvidenceRules()) ?? null)?.map((r) => ({
        id: r.id,
        reviewed: r.reviewed_by !== null,
        canDelete: true,
        cells: [r.category, r.evidence_type_code, r.is_required ? REQUIRED : REMINDER, r.note ?? '—'],
        values: { category: r.category, evidence_type_code: r.evidence_type_code, is_required: r.is_required, note: text(r.note) },
        search: searchable(r.category, r.evidence_type_code, r.note),
      })) ?? null,
    create: (body) => createEvidenceRule(body as unknown as EvidenceRuleInput),
    update: (id, body) => updateEvidenceRule(id, body as EvidenceRulePatch),
    review: reviewEvidenceRule,
    remove: deleteEvidenceRule,
  },
];

export { COMMON_LEGEND };

/** Giá trị form → body gửi API. Thêm mới: bỏ ô trống. Sửa: chỉ gửi trường đã đổi, ô trống → null. */
export function buildBody(fields: Field[], state: Record<string, FieldValue>, initial: Record<string, FieldValue> | null): Body {
  const body: Body = {};
  for (const field of fields) {
    if (initial && field.locked) continue;
    const value = state[field.key];
    if (initial && value === initial[field.key]) continue;
    if (field.kind === 'bool') body[field.key] = value === true;
    else if (value === '' || value === undefined) {
      if (initial) body[field.key] = null;
    } else if (field.kind === 'int') body[field.key] = Number(value);
    else body[field.key] = String(value).trim();
  }
  return body;
}

export function initialState(fields: Field[], values: Record<string, FieldValue> | null): Record<string, FieldValue> {
  return Object.fromEntries(fields.map((f) => [f.key, values ? values[f.key] : (f.initial ?? (f.kind === 'bool' ? false : ''))]));
}

/** Trường bắt buộc còn trống → khóa của trường đầu tiên thiếu, hoặc null nếu đủ. */
export function firstMissing(fields: Field[], state: Record<string, FieldValue>, editing: boolean): Field | null {
  return fields.find((f) => f.required && !(editing && f.locked) && String(state[f.key]).trim() === '') ?? null;
}
