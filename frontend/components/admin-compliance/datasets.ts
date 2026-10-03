// Khai báo bốn nhóm dữ liệu tuân thủ: cột bảng, trường form, chú thích và lời gọi API (C1, C4, C6).
// Chuỗi tiếng Việt ở đây được dịch khi hiển thị bằng tr() (xem i18n/catalog.json).
import {
  createCountryTerm,
  createEvidenceRule,
  createEvidenceType,
  createRooRule,
  createTariffLine,
  createTradeAgreement,
  createProductSubtype,
  createTariffQuota,
  createSectorAlert,
  deleteCountryTerm,
  deleteEvidenceRule,
  deleteRooRule,
  deleteTariffLine,
  deleteTradeAgreement,
  deleteProductSubtype,
  deleteTariffQuota,
  deleteSectorAlert,
  listCountryTerms,
  listEvidenceRules,
  listEvidenceTypes,
  listRooRules,
  listTariffLines,
  listTradeAgreements,
  listProductSubtypes,
  listTariffQuotas,
  listSectorAlerts,
  reviewCountryTerm,
  reviewEvidenceRule,
  reviewEvidenceType,
  reviewRooRule,
  reviewTariffLine,
  reviewTradeAgreement,
  reviewProductSubtype,
  reviewTariffQuota,
  reviewSectorAlert,
  updateCountryTerm,
  updateEvidenceRule,
  updateEvidenceType,
  updateRooRule,
  updateTariffLine,
  updateTradeAgreement,
  updateProductSubtype,
  updateTariffQuota,
  updateSectorAlert,
  type CountryTermInput,
  type CountryTermPatch,
  type EvidenceRuleInput,
  type EvidenceRulePatch,
  type EvidenceTypeInput,
  type EvidenceTypePatch,
  type RooRuleInput,
  type RooRulePatch,
  type TariffLineInput,
  type TariffLinePatch,
  type TradeAgreementInput,
  type TradeAgreementPatch,
  type ProductSubtypeInput,
  type ProductSubtypePatch,
  type TariffQuotaInput,
  type TariffQuotaPatch,
  type SectorAlertInput,
  type SectorAlertPatch,
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
  xlsxPath?: string;
  xlsxName?: string;
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
  { term: 'Thuế ưu đãi', text: 'Thuế ưu đãi hiện hành theo hiệp định của dòng (mặc định EVFTA), tính bằng %.' },
  { term: 'Hiệp định', text: 'Mã hiệp định (EVFTA, UKVFTA, CPTPP…). Hiệp định áp dụng cho một thị trường chỉ suy ra từ dòng thuế đã duyệt.' },
  { term: 'Hạn ngạch', text: 'Có = hàng chịu hạn ngạch thuế quan. Công cụ chỉ tính kịch bản trong / ngoài hạn ngạch khi có dòng Hạn ngạch và phân nhóm đủ điều kiện đã duyệt; còn lại trả "cần xem xét", không trả 0%.' },
  { term: 'Nơi đến', text: 'EU nếu áp dụng biểu thuế chung của cả liên minh thuế quan; nước khác dùng mã ISO-2 (GB, JP, KR…).' },
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

const TERMS_LEGEND: LegendItem[] = [
  { term: 'VAT nhập khẩu', text: 'Thuế suất VAT (%) áp cho mã hàng này tại nước nhập khẩu. Công thức: VAT = (trị giá + thuế nhập khẩu) × VAT.' },
  { term: 'Nước', text: 'Mã ISO-2 của nước thành viên EU. Nước chưa có dòng đã duyệt hiện "chưa có dữ liệu", không có con số.' },
  { term: 'Ngôn ngữ nhãn', text: 'Mã ngôn ngữ nhãn bắt buộc tại nước đó (de, fr, nl…).' },
  { term: 'Trùng hiệu lực', text: 'Hai dòng đã duyệt cùng mã HS, cùng nước, cùng hiệu lực sẽ làm nước đó bị coi là chưa có dữ liệu. Đặt Đến ngày cho dòng cũ.' },
];

const validity: Field[] = [
  { key: 'valid_from', label: 'Từ ngày', kind: 'date', required: true, help: 'Ngày bắt đầu hiệu lực.' },
  { key: 'valid_until', label: 'Đến ngày', kind: 'date', help: 'Ngày ĐÃ hết hiệu lực, phải sau Từ ngày. Để trống = không thời hạn.' },
];

const AGREEMENT_LEGEND: LegendItem[] = [
  { term: 'Mã', text: 'Mã hiệp định (chữ in hoa, số, gạch dưới), vd EVFTA, UKVFTA. Không đổi được sau khi tạo.' },
  { term: 'Nước đối tác', text: 'Mã ISO-2 cách nhau bằng dấu phẩy; EU = liên minh thuế quan. Chỉ để hiển thị — hiệp định áp dụng luôn suy ra từ dòng thuế đã duyệt.' },
  { term: 'Bản nháp', text: 'Danh sách ban đầu là bản nháp: luật TM rà tên, đối tác, ngày hiệu lực và nguồn rồi bấm duyệt.' },
];

const SUBTYPE_LEGEND: LegendItem[] = [
  { term: 'Mã', text: 'Chữ thường, số, gạch dưới (vd rice_fragrant_listed). Không đổi được sau khi tạo.' },
  { term: 'Tiền tố HS', text: '4–8 chữ số; phân nhóm áp cho mọi mã HS bắt đầu bằng tiền tố này (vd 1006).' },
  { term: 'Đủ điều kiện', text: 'Phân nhóm chỉ đủ điều kiện khi được liệt kê trong dòng Hạn ngạch đã duyệt. Giống ngoài danh sách (vd ST25 khi chưa được xác nhận) → "cần xem xét".' },
];

const QUOTA_LEGEND: LegendItem[] = [
  { term: 'Thuế trong / ngoài hạn ngạch', text: 'ad_valorem: nhập % ; specific: nhập số tiền EUR trên một đơn vị (Đơn vị thuế tuyệt đối). mixed → công cụ trả "cần xem xét".' },
  { term: 'Phân nhóm đủ điều kiện', text: 'Mã phân nhóm cách nhau bằng dấu phẩy. Chỉ phân nhóm đã duyệt trong danh sách này mới có kịch bản.' },
  { term: 'Sửa đổi §6.4', text: 'Kịch bản hạn ngạch cần luật TM ký sửa đổi AGENTS.md §6.4 trước khi dùng dữ liệu thật ở production.' },
];

/** Dòng minh hoạ (U14): không duyệt được, chỉ hiện khi cờ DEMO bật ngoài production. */
export const DEMO_MARK = 'Minh hoạ';
const demoMark = (value: string, demo: boolean | undefined) => (demo ? `${value} · ${DEMO_MARK}` : value);

const ALERT_LEGEND: LegendItem[] = [
  { term: 'Tiền tố HS', text: 'Một hoặc nhiều tiền tố 2–8 chữ số, cách nhau bằng dấu phẩy (vd 03, 1604). Cảnh báo hiện trong kết quả thuế, form sản phẩm và báo cáo.' },
  { term: 'Mức độ', text: 'info = thông tin; warning = cần lưu ý; critical = rủi ro cao.' },
  { term: DEMO_MARK, text: 'Dòng minh hoạ chỉ hiện khi cờ DEMO_COMPLIANCE_DATA bật ngoài production, kèm banner; không duyệt được thành dữ liệu thật.' },
];

const splitList = (value: unknown) =>
  String(value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

export const DATASETS: Dataset[] = [
  {
    key: 'tariff',
    label: 'Dòng thuế',
    columns: ['Mã HS', 'Nơi đến', 'Hiệp định', 'Loại thuế', 'MFN', 'Thuế ưu đãi', 'Hạn ngạch', 'Từ ngày', 'Đến ngày'],
    fields: [
      { key: 'hs_code', label: 'Mã HS', kind: 'text', required: true, help: '6–8 chữ số, phải có trong danh mục HS.' },
      { key: 'destination', label: 'Nơi đến', kind: 'text', required: true, initial: 'EU', help: 'EU = biểu thuế chung của liên minh thuế quan; nước khác nhập mã ISO-2 (vd GB, JP).' },
      { key: 'agreement_code', label: 'Hiệp định', kind: 'text', required: true, initial: 'EVFTA', help: 'Mã hiệp định trong danh sách Hiệp định thương mại (vd EVFTA, UKVFTA, CPTPP).' },
      { key: 'duty_type', label: 'Loại thuế', kind: 'select', required: true, options: ['ad_valorem', 'specific', 'mixed'], initial: 'ad_valorem', help: 'Xem chú thích: chỉ ad_valorem cho ra con số thuế.' },
      { key: 'mfn_rate', label: 'MFN (%)', kind: 'decimal', help: '0–100, tối đa 4 chữ số thập phân.' },
      { key: 'mfn_specific', label: 'Thuế tuyệt đối/hỗn hợp', kind: 'text', help: 'Dạng văn bản, vd "176 EUR/100 kg".' },
      { key: 'evfta_rate_current', label: 'Thuế ưu đãi hiện hành (%)', kind: 'decimal', help: 'Theo hiệp định ở trên; 0–100, tối đa 4 chữ số thập phân.' },
      { key: 'staging_category', label: 'Lộ trình cắt giảm', kind: 'text', help: 'Ký hiệu nhóm cắt giảm, vd A, B5.' },
      { key: 'zero_from', label: 'Ngày về 0%', kind: 'date' },
      { key: 'quota_required', label: 'Hạn ngạch', kind: 'bool', initial: false },
      { key: 'quota_note', label: 'Ghi chú hạn ngạch', kind: 'textarea' },
      { key: 'condition_note', label: 'Điều kiện áp dụng', kind: 'textarea' },
      { key: 'quota_note_en', label: 'Ghi chú hạn ngạch (tiếng Anh)', kind: 'textarea', help: 'Hiện cho người dùng giao diện tiếng Anh; để trống thì hiện bản tiếng Việt.' },
      { key: 'condition_note_en', label: 'Điều kiện áp dụng (tiếng Anh)', kind: 'textarea' },
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
        cells: [demoMark(r.hs_code, r.is_demo), r.destination, r.agreement_code, r.duty_type, pct(r.mfn_rate), pct(r.evfta_rate_current), yesNo(r.quota_required), r.valid_from, r.valid_until ?? NO_EXPIRY],
        values: {
          hs_code: r.hs_code,
          destination: r.destination,
          agreement_code: r.agreement_code,
          duty_type: r.duty_type,
          mfn_rate: plain(r.mfn_rate),
          mfn_specific: text(r.mfn_specific),
          evfta_rate_current: plain(r.evfta_rate_current),
          staging_category: text(r.staging_category),
          zero_from: text(r.zero_from),
          quota_required: r.quota_required,
          quota_note: text(r.quota_note),
          condition_note: text(r.condition_note),
          quota_note_en: text(r.quota_note_en),
          condition_note_en: text(r.condition_note_en),
          source_url: text(r.source_url),
          valid_from: r.valid_from,
          valid_until: text(r.valid_until),
        },
        search: searchable(r.hs_code, r.destination, r.agreement_code, r.duty_type, r.staging_category, r.mfn_specific, r.quota_note, r.condition_note, r.quota_note_en, r.condition_note_en, r.source_url),
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
    key: 'terms',
    label: 'VAT theo nước',
    columns: ['Mã HS', 'Nước', 'VAT (%)', 'Ngôn ngữ nhãn', 'Từ ngày', 'Đến ngày'],
    fields: [
      { key: 'hs_code', label: 'Mã HS', kind: 'text', required: true, help: '6–8 chữ số, phải có trong danh mục HS. Dùng đúng mã của dòng thuế.' },
      { key: 'country', label: 'Nước', kind: 'select', required: true, options: EU_MEMBERS, initial: 'DE' },
      { key: 'vat_rate', label: 'VAT nhập khẩu (%)', kind: 'decimal', required: true, help: '0–100, tối đa 4 chữ số thập phân.' },
      { key: 'label_languages', label: 'Ngôn ngữ nhãn', kind: 'text', help: 'Mã ngôn ngữ, vd de, fr, nl.' },
      { key: 'note', label: 'Lưu ý theo nước', kind: 'textarea' },
      { key: 'note_en', label: 'Lưu ý theo nước (tiếng Anh)', kind: 'textarea', help: 'Hiện cho người dùng giao diện tiếng Anh; để trống thì hiện bản tiếng Việt.' },
      { key: 'source', label: 'Nguồn', kind: 'textarea' },
      ...validity,
    ],
    legend: TERMS_LEGEND,
    load: async () =>
      ((await listCountryTerms()) ?? null)?.map((r) => ({
        id: r.id,
        reviewed: r.reviewed_by !== null,
        canDelete: r.reviewed_by === null,
        cells: [r.hs_code, r.country, pct(r.vat_rate), text(r.label_languages), r.valid_from, r.valid_until ?? NO_EXPIRY],
        values: {
          hs_code: r.hs_code,
          country: r.country,
          vat_rate: plain(r.vat_rate),
          label_languages: text(r.label_languages),
          note: text(r.note),
          note_en: text(r.note_en),
          source: text(r.source),
          valid_from: r.valid_from,
          valid_until: text(r.valid_until),
        },
        search: searchable(r.hs_code, r.country, r.label_languages, r.note, r.note_en, r.source),
      })) ?? null,
    create: (body) => createCountryTerm(body as unknown as CountryTermInput),
    update: (id, body) => updateCountryTerm(id, body as CountryTermPatch),
    review: reviewCountryTerm,
    remove: deleteCountryTerm,
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
  {
    key: 'agreements',
    label: 'Hiệp định thương mại',
    columns: ['Mã', 'Tên', 'Nước đối tác', 'Hiệu lực từ'],
    fields: [
      { key: 'code', label: 'Mã', kind: 'text', required: true, locked: true, help: 'Chữ in hoa, số, gạch dưới (2–16 ký tự).' },
      { key: 'name_vi', label: 'Tên (tiếng Việt)', kind: 'text', required: true },
      { key: 'name_en', label: 'Tên (tiếng Anh)', kind: 'text', required: true },
      { key: 'partners', label: 'Nước đối tác', kind: 'text', help: 'Mã ISO-2 cách nhau bằng dấu phẩy, vd JP, KR hoặc EU.' },
      { key: 'in_force_from', label: 'Hiệu lực từ', kind: 'date' },
      { key: 'source_url', label: 'Nguồn (URL)', kind: 'text' },
      { key: 'note', label: 'Ghi chú', kind: 'textarea' },
    ],
    legend: AGREEMENT_LEGEND,
    load: async () =>
      ((await listTradeAgreements()) ?? null)?.map((r) => ({
        id: r.id,
        reviewed: r.reviewed_by !== null,
        canDelete: r.reviewed_by === null,
        cells: [r.code, r.name_vi, r.partners.join(', '), r.in_force_from ?? '—'],
        values: {
          code: r.code,
          name_vi: r.name_vi,
          name_en: r.name_en,
          partners: r.partners.join(', '),
          in_force_from: text(r.in_force_from),
          source_url: text(r.source_url),
          note: text(r.note),
        },
        search: searchable(r.code, r.name_vi, r.name_en, r.partners.join(' ')),
      })) ?? null,
    create: (body) => createTradeAgreement({ ...body, partners: splitList(body.partners) } as unknown as TradeAgreementInput),
    update: (id, body) => {
      const patch: Body = { ...body };
      delete patch.code;
      if ('partners' in patch) patch.partners = splitList(patch.partners);
      return updateTradeAgreement(id, patch as TradeAgreementPatch);
    },
    review: reviewTradeAgreement,
    remove: deleteTradeAgreement,
  },
  {
    key: 'subtypes',
    label: 'Phân nhóm sản phẩm',
    columns: ['Mã', 'Tiền tố HS', 'Tên'],
    fields: [
      { key: 'code', label: 'Mã', kind: 'text', required: true, locked: true, help: 'Chữ thường, số, gạch dưới.' },
      { key: 'hs_prefix', label: 'Tiền tố HS', kind: 'text', required: true, help: '4–8 chữ số, vd 1006 hoặc 100630.' },
      { key: 'name_vi', label: 'Tên (tiếng Việt)', kind: 'text', required: true },
      { key: 'name_en', label: 'Tên (tiếng Anh)', kind: 'text', required: true },
      { key: 'description_vi', label: 'Mô tả (tiếng Việt)', kind: 'textarea', help: 'Vd danh sách giống đủ điều kiện.' },
      { key: 'description_en', label: 'Mô tả (tiếng Anh)', kind: 'textarea' },
      { key: 'source', label: 'Nguồn', kind: 'textarea' },
    ],
    legend: SUBTYPE_LEGEND,
    load: async () =>
      ((await listProductSubtypes()) ?? null)?.map((r) => ({
        id: r.id,
        reviewed: r.reviewed_by !== null,
        canDelete: r.reviewed_by === null,
        cells: [demoMark(r.code, r.is_demo), r.hs_prefix, r.name_vi],
        values: {
          code: r.code,
          hs_prefix: r.hs_prefix,
          name_vi: r.name_vi,
          name_en: r.name_en,
          description_vi: text(r.description_vi),
          description_en: text(r.description_en),
          source: text(r.source),
        },
        search: searchable(r.code, r.hs_prefix, r.name_vi, r.name_en, r.description_vi),
      })) ?? null,
    create: (body) => createProductSubtype(body as unknown as ProductSubtypeInput),
    update: (id, body) => updateProductSubtype(id, body as ProductSubtypePatch),
    review: reviewProductSubtype,
    remove: deleteProductSubtype,
  },
  {
    key: 'quotas',
    label: 'Hạn ngạch thuế quan',
    columns: ['Hiệp định', 'Nơi đến', 'Tiền tố HS', 'Khối lượng', 'Trong hạn ngạch', 'Ngoài hạn ngạch', 'Từ ngày', 'Đến ngày'],
    fields: [
      { key: 'agreement_code', label: 'Hiệp định', kind: 'text', required: true, initial: 'EVFTA' },
      { key: 'destination', label: 'Nơi đến', kind: 'text', required: true, initial: 'EU' },
      { key: 'hs_prefix', label: 'Tiền tố HS', kind: 'text', required: true },
      { key: 'quota_code', label: 'Số hạn ngạch', kind: 'text', help: 'Số thứ tự hạn ngạch (order number) nếu có.' },
      { key: 'quota_year', label: 'Năm', kind: 'int' },
      { key: 'volume', label: 'Khối lượng hạn ngạch', kind: 'decimal', required: true },
      { key: 'volume_unit', label: 'Đơn vị khối lượng', kind: 'select', options: ['tonne', 'kg', 'piece', 'liter'], initial: 'tonne' },
      { key: 'in_quota_duty_type', label: 'Loại thuế trong hạn ngạch', kind: 'select', required: true, options: ['ad_valorem', 'specific', 'mixed'], initial: 'ad_valorem' },
      { key: 'in_quota_rate', label: 'Thuế trong hạn ngạch (%)', kind: 'decimal' },
      { key: 'in_quota_specific', label: 'Thuế tuyệt đối trong hạn ngạch (EUR/đơn vị)', kind: 'decimal' },
      { key: 'out_quota_duty_type', label: 'Loại thuế ngoài hạn ngạch', kind: 'select', required: true, options: ['ad_valorem', 'specific', 'mixed'], initial: 'ad_valorem' },
      { key: 'out_quota_rate', label: 'Thuế ngoài hạn ngạch (%)', kind: 'decimal' },
      { key: 'out_quota_specific', label: 'Thuế tuyệt đối ngoài hạn ngạch (EUR/đơn vị)', kind: 'decimal' },
      { key: 'specific_unit', label: 'Đơn vị thuế tuyệt đối', kind: 'select', options: ['tonne', 'kg', 'piece', 'liter'], help: 'Bắt buộc khi có thuế tuyệt đối.' },
      { key: 'eligible_subtypes', label: 'Phân nhóm đủ điều kiện', kind: 'text', help: 'Mã phân nhóm cách nhau bằng dấu phẩy.' },
      { key: 'licence_note_vi', label: 'Giấy phép / chứng nhận (tiếng Việt)', kind: 'textarea' },
      { key: 'licence_note_en', label: 'Giấy phép / chứng nhận (tiếng Anh)', kind: 'textarea' },
      { key: 'allocation_note_vi', label: 'Cách phân bổ (tiếng Việt)', kind: 'textarea' },
      { key: 'allocation_note_en', label: 'Cách phân bổ (tiếng Anh)', kind: 'textarea' },
      { key: 'source_url', label: 'Nguồn (URL)', kind: 'text' },
      ...validity,
    ],
    legend: QUOTA_LEGEND,
    load: async () =>
      ((await listTariffQuotas()) ?? null)?.map((r) => ({
        id: r.id,
        reviewed: r.reviewed_by !== null,
        canDelete: r.reviewed_by === null,
        cells: [
          demoMark(r.agreement_code, r.is_demo),
          r.destination,
          r.hs_prefix,
          `${plain(r.volume)} ${r.volume_unit}`,
          r.in_quota_duty_type === 'specific' ? `${plain(r.in_quota_specific)} EUR/${r.specific_unit ?? ''}` : pct(r.in_quota_rate),
          r.out_quota_duty_type === 'specific' ? `${plain(r.out_quota_specific)} EUR/${r.specific_unit ?? ''}` : pct(r.out_quota_rate),
          r.valid_from,
          r.valid_until ?? NO_EXPIRY,
        ],
        values: {
          agreement_code: r.agreement_code,
          destination: r.destination,
          hs_prefix: r.hs_prefix,
          quota_code: text(r.quota_code),
          quota_year: r.quota_year === null ? '' : String(r.quota_year),
          volume: plain(r.volume),
          volume_unit: r.volume_unit,
          in_quota_duty_type: r.in_quota_duty_type,
          in_quota_rate: plain(r.in_quota_rate),
          in_quota_specific: plain(r.in_quota_specific),
          out_quota_duty_type: r.out_quota_duty_type,
          out_quota_rate: plain(r.out_quota_rate),
          out_quota_specific: plain(r.out_quota_specific),
          specific_unit: text(r.specific_unit),
          eligible_subtypes: r.eligible_subtypes.join(', '),
          licence_note_vi: text(r.licence_note_vi),
          licence_note_en: text(r.licence_note_en),
          allocation_note_vi: text(r.allocation_note_vi),
          allocation_note_en: text(r.allocation_note_en),
          source_url: text(r.source_url),
          valid_from: r.valid_from,
          valid_until: text(r.valid_until),
        },
        search: searchable(r.agreement_code, r.destination, r.hs_prefix, r.quota_code, r.eligible_subtypes.join(' ')),
      })) ?? null,
    create: (body) => createTariffQuota({ ...body, eligible_subtypes: splitList(body.eligible_subtypes) } as unknown as TariffQuotaInput),
    update: (id, body) => {
      const patch: Body = { ...body };
      if ('eligible_subtypes' in patch) patch.eligible_subtypes = splitList(patch.eligible_subtypes);
      return updateTariffQuota(id, patch as TariffQuotaPatch);
    },
    review: reviewTariffQuota,
    remove: deleteTariffQuota,
  },
  {
    key: 'alerts',
    label: 'Cảnh báo ngành',
    columns: ['Mã', 'Tiền tố HS', 'Mức độ', 'Tiêu đề', 'Từ ngày', 'Đến ngày'],
    fields: [
      { key: 'code', label: 'Mã', kind: 'text', required: true, locked: true, help: 'Chữ thường, số, gạch dưới.' },
      { key: 'hs_prefixes', label: 'Tiền tố HS', kind: 'text', required: true, help: 'Cách nhau bằng dấu phẩy, vd 03, 1604.' },
      { key: 'severity', label: 'Mức độ', kind: 'select', required: true, options: ['info', 'warning', 'critical'], initial: 'warning' },
      { key: 'title_vi', label: 'Tiêu đề (tiếng Việt)', kind: 'text', required: true },
      { key: 'title_en', label: 'Tiêu đề (tiếng Anh)', kind: 'text', required: true },
      { key: 'body_vi', label: 'Nội dung (tiếng Việt)', kind: 'textarea' },
      { key: 'body_en', label: 'Nội dung (tiếng Anh)', kind: 'textarea' },
      { key: 'source_url', label: 'Nguồn (URL)', kind: 'text' },
      ...validity,
    ],
    legend: ALERT_LEGEND,
    load: async () =>
      ((await listSectorAlerts()) ?? null)?.map((r) => ({
        id: r.id,
        reviewed: r.reviewed_by !== null,
        canDelete: r.reviewed_by === null,
        cells: [demoMark(r.code, r.is_demo), r.hs_prefixes.join(', '), r.severity, r.title_vi, r.valid_from, r.valid_until ?? NO_EXPIRY],
        values: {
          code: r.code,
          hs_prefixes: r.hs_prefixes.join(', '),
          severity: r.severity,
          title_vi: r.title_vi,
          title_en: r.title_en,
          body_vi: text(r.body_vi),
          body_en: text(r.body_en),
          source_url: text(r.source_url),
          valid_from: r.valid_from,
          valid_until: text(r.valid_until),
        },
        search: searchable(r.code, r.hs_prefixes.join(' '), r.title_vi, r.title_en, r.body_vi),
      })) ?? null,
    create: (body) => createSectorAlert({ ...body, hs_prefixes: splitList(body.hs_prefixes) } as unknown as SectorAlertInput),
    update: (id, body) => {
      const patch: Body = { ...body };
      if ('hs_prefixes' in patch) patch.hs_prefixes = splitList(patch.hs_prefixes);
      return updateSectorAlert(id, patch as SectorAlertPatch);
    },
    review: reviewSectorAlert,
    remove: deleteSectorAlert,
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
