// Sản phẩm của exporter trên server (B5). Chuyển qua lại giữa bản nháp trong form và API.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type ProductOut = components['schemas']['ProductOut'];
export type ProductIn = components['schemas']['ProductIn'];
export type UnitCode = NonNullable<ProductIn['unit']>;
export type Currency = NonNullable<ProductIn['currency']>;

/** Phần của một mã HS mà bản nháp cần giữ để hiển thị (HsCodeOption đầy đủ cũng dùng được). */
export interface HsSelection {
  code: string;
  formatted: string;
  name_vi: string;
  name_en: string;
}

export const UNITS: { code: UnitCode; label: string }[] = [
  { code: 'kg', label: 'Kg' },
  { code: 'tonne', label: 'Tấn' },
  { code: 'piece', label: 'Cái' },
  { code: 'carton', label: 'Thùng' },
  { code: 'liter', label: 'Lít' },
  { code: 'container_20ft', label: 'Container 20ft' },
  { code: 'container_40ft', label: 'Container 40ft' },
];

export const CURRENCIES: Currency[] = ['USD', 'EUR', 'VND'];
export const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export type BrandModel = '' | 'oem' | 'own_brand' | 'both';
export type PricingMode = 'tiers' | 'estimate';
export interface TierDraft {
  minQuantity: string;
  unitPrice: string;
}
export interface PackagingDraft {
  packSize: string;
  packUnit: string;
  packType: string;
  channel: string;
}

// U3: gia công OEM hay bán thương hiệu riêng — quyết định cách đi thị trường (báo cáo go-to-market).
export const BRAND_MODELS: { code: Exclude<BrandModel, ''>; label: string }[] = [
  { code: 'oem', label: 'Gia công OEM (in nhãn cho khách)' },
  { code: 'own_brand', label: 'Bán thương hiệu riêng' },
  { code: 'both', label: 'Cả hai' },
];
export const PACK_UNITS = ['g', 'kg', 'tonne', 'ml', 'liter', 'piece'] as const;
export const PACK_UNIT_LABELS: Record<string, string> = { g: 'g', kg: 'kg', tonne: 'Tấn', ml: 'ml', liter: 'Lít', piece: 'Cái' };
export const PACK_TYPES: { code: string; label: string }[] = [
  { code: 'bag', label: 'Túi / bao' },
  { code: 'sack', label: 'Bao tải' },
  { code: 'carton', label: 'Thùng carton' },
  { code: 'box', label: 'Hộp' },
  { code: 'can', label: 'Lon' },
  { code: 'bottle', label: 'Chai' },
  { code: 'jar', label: 'Hũ' },
  { code: 'bulk', label: 'Hàng xá (bulk)' },
  { code: 'other', label: 'Khác' },
];
// Kênh bán ảnh hưởng quy cách: Horeca lấy bao lớn, siêu thị lấy gói nhỏ (demo 30/9).
export const CHANNELS: { code: string; label: string }[] = [
  { code: 'any', label: 'Mọi kênh' },
  { code: 'horeca', label: 'Nhà hàng, khách sạn (Horeca)' },
  { code: 'retail', label: 'Siêu thị, bán lẻ' },
  { code: 'industrial', label: 'Nhà máy chế biến' },
];

export interface ProductDraft {
  /** Khóa cục bộ ổn định cho React (bằng id server nếu đã lưu). */
  key: string;
  /** id trên server; chưa có nghĩa là sản phẩm mới. */
  id?: string;
  name: string;
  hs: HsSelection | null;
  /** tiers = bậc giá theo số lượng (mặc định); estimate = giá ước tính (một mức hoặc khoảng). */
  pricingMode: PricingMode;
  tiers: TierDraft[];
  priceMin: string;
  priceMax: string;
  currency: Currency;
  unit: string;
  moq: string;
  moqUnit: string;
  /** Ngôn ngữ người bán viết mô tả; bản còn lại hệ thống dịch máy. */
  descriptionLang: 'vi' | 'en';
  descriptionVi: string;
  descriptionEn: string;
  descriptionViMachine: boolean;
  descriptionEnMachine: boolean;
  brandModel: BrandModel;
  packagings: PackagingDraft[];
  isActive: boolean;
  images: { key: string; url: string }[];
}

export function emptyTier(): TierDraft {
  return { minQuantity: '', unitPrice: '' };
}

export function emptyPackaging(): PackagingDraft {
  return { packSize: '', packUnit: 'kg', packType: 'bag', channel: 'any' };
}

export function emptyDraft(): ProductDraft {
  return {
    key: crypto.randomUUID(),
    name: '',
    hs: null,
    pricingMode: 'tiers',
    tiers: [emptyTier()],
    priceMin: '',
    priceMax: '',
    currency: 'USD',
    unit: '',
    moq: '',
    moqUnit: '',
    descriptionLang: 'vi',
    descriptionVi: '',
    descriptionEn: '',
    descriptionViMachine: false,
    descriptionEnMachine: false,
    brandModel: '',
    packagings: [],
    isActive: true,
    images: [],
  };
}

export function draftFromProduct(p: ProductOut): ProductDraft {
  return {
    key: p.id,
    id: p.id,
    name: p.name,
    hs: { code: p.hs_code, formatted: p.hs_formatted, name_vi: p.hs_name_vi, name_en: p.hs_name_en },
    pricingMode: (p.price_tiers ?? []).length > 0 || !p.price_min ? 'tiers' : 'estimate',
    tiers: (p.price_tiers ?? []).length > 0
      ? (p.price_tiers ?? []).map((t) => ({ minQuantity: t.min_quantity, unitPrice: t.unit_price }))
      : [emptyTier()],
    priceMin: (p.price_tiers ?? []).length > 0 ? '' : p.price_min ?? '',
    priceMax: (p.price_tiers ?? []).length > 0 ? '' : p.price_max ?? '',
    currency: p.currency as Currency,
    unit: p.unit ?? '',
    moq: p.moq ?? '',
    moqUnit: p.moq_unit ?? '',
    descriptionLang: p.description_source_lang === 'en' || (!p.description_vi && p.description_en) ? 'en' : 'vi',
    descriptionVi: p.description_vi ?? '',
    descriptionEn: p.description_en ?? '',
    descriptionViMachine: p.description_vi_machine ?? false,
    descriptionEnMachine: p.description_en_machine ?? false,
    brandModel: (p.brand_model ?? '') as BrandModel,
    packagings: (p.packagings ?? []).map((x) => ({ packSize: x.pack_size, packUnit: x.pack_unit, packType: x.pack_type, channel: x.channel })),
    isActive: p.is_active,
    images: p.images.map((image) => ({ key: image.key, url: image.url })),
  };
}

const blank = (value: string) => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

// Số dương tối đa 12 chữ số nguyên + 2 thập phân (khớp Numeric(14,2) ở backend); giữ dạng chuỗi.
function parseAmount(label: string, text: string): string | null {
  const value = text.trim();
  if (value === '') return null;
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(value) || Number(value) <= 0) {
    throw new Error(`${label} không hợp lệ (số dương, dùng dấu chấm cho phần thập phân, tối đa 2 chữ số).`);
  }
  return value;
}

function parsePackSize(text: string): string {
  const value = text.trim().replace(',', '.');
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(value) || Number(value) <= 0) {
    throw new Error('Quy cách đóng gói không hợp lệ (số dương, tối đa 3 chữ số thập phân).');
  }
  return value;
}

/** Kiểm tra hợp lệ rồi đổi bản nháp thành body gửi server. Ném lỗi tiếng Việt nếu không hợp lệ.
 *  U3: bậc giá theo số lượng thay cho giá thấp/cao nhất; MOQ tự lấy theo bậc đầu nếu bỏ trống. */
export function draftToBody(d: ProductDraft): ProductIn {
  const name = d.name.trim();
  if (!name) throw new Error('Mỗi sản phẩm cần có tên.');
  if (!d.hs) throw new Error(`Sản phẩm "${name}" chưa chọn mã HS.`);
  if (!blank(d.unit)) throw new Error(`Sản phẩm "${name}" chưa chọn đơn vị giá.`);
  const tiers = d.pricingMode === 'tiers'
    ? d.tiers
        .filter((t) => t.minQuantity.trim() || t.unitPrice.trim())
        .map((t) => ({ min_quantity: parseAmount('Số lượng', t.minQuantity), unit_price: parseAmount('Đơn giá', t.unitPrice) }))
    : [];
  if (tiers.some((t) => !t.min_quantity || !t.unit_price)) throw new Error(`Sản phẩm "${name}": mỗi bậc giá cần cả số lượng và đơn giá.`);
  const priceTiers = (tiers as { min_quantity: string; unit_price: string }[]).sort((a, b) => Number(a.min_quantity) - Number(b.min_quantity));
  if (new Set(priceTiers.map((t) => Number(t.min_quantity))).size !== priceTiers.length) {
    throw new Error(`Sản phẩm "${name}": hai bậc giá không được cùng số lượng.`);
  }
  const priceMin = d.pricingMode === 'estimate' ? parseAmount('Giá ước tính', d.priceMin) : null;
  const priceMax = d.pricingMode === 'estimate' ? parseAmount('Giá cao nhất', d.priceMax) : null;
  if (d.pricingMode === 'tiers' && priceTiers.length === 0) throw new Error(`Sản phẩm "${name}" chưa nhập bậc giá.`);
  if (d.pricingMode === 'estimate' && !priceMin) throw new Error(`Sản phẩm "${name}" chưa nhập giá.`);
  if (priceMin && priceMax && Number(priceMin) > Number(priceMax)) {
    throw new Error('Giá thấp nhất không được lớn hơn giá cao nhất.');
  }
  const moq = parseAmount('MOQ', d.moq);
  if (!moq && priceTiers.length === 0) throw new Error(`Sản phẩm "${name}" chưa nhập MOQ.`);
  if (!blank(d.moqUnit)) throw new Error(`Sản phẩm "${name}" chưa chọn đơn vị MOQ.`);
  const packagings = d.packagings
    .filter((x) => x.packSize.trim())
    .map((x) => ({
      pack_size: parsePackSize(x.packSize),
      pack_unit: x.packUnit as NonNullable<ProductIn['packagings']>[number]['pack_unit'],
      pack_type: x.packType as NonNullable<ProductIn['packagings']>[number]['pack_type'],
      channel: x.channel as NonNullable<ProductIn['packagings']>[number]['channel'],
    }));
  return {
    name,
    hs_code: d.hs.code,
    description_vi: blank(d.descriptionVi),
    description_en: blank(d.descriptionEn),
    description_source_lang: d.descriptionLang,
    price_min: priceMin,
    price_max: priceMax,
    price_tiers: priceTiers,
    currency: d.currency,
    unit: (blank(d.unit) as UnitCode | null) ?? null,
    moq,
    moq_unit: (blank(d.moqUnit) as UnitCode | null) ?? null,
    brand_model: d.brandModel || null,
    packagings,
    is_active: d.isActive,
    image_keys: d.images.map((image) => image.key),
  };
}

type Translate = (text: string) => string;
const identity: Translate = (text) => text;
const unitLabel = (code: string | null | undefined, t: Translate) => {
  const label = UNITS.find((u) => u.code === code)?.label;
  return label ? t(label) : '';
};

/** "25 kg / Túi" — quy cách để hiện trên thẻ sản phẩm. */
export function formatPackaging(x: { pack_size: string; pack_unit: string; pack_type: string }, t: Translate = identity): string {
  const size = String(Number(x.pack_size));
  const type = PACK_TYPES.find((p) => p.code === x.pack_type)?.label ?? x.pack_type;
  return `${size} ${t(PACK_UNIT_LABELS[x.pack_unit] ?? x.pack_unit)} / ${t(type)}`;
}

/** Bậc giá: "≥ 25 Tấn: 560.00 USD" từng dòng. */
export function formatTiers(
  p: Pick<ProductOut, 'price_tiers' | 'currency' | 'unit' | 'moq_unit'>,
  t: Translate = identity,
): string[] {
  const qtyUnit = unitLabel(p.moq_unit, t);
  const priceUnit = unitLabel(p.unit, t);
  return (p.price_tiers ?? []).map(
    (tier) => `≥ ${tier.min_quantity}${qtyUnit ? ` ${qtyUnit}` : ''}: ${tier.unit_price} ${p.currency}${priceUnit ? ` / ${priceUnit}` : ''}`,
  );
}


/** Giá hiển thị; truyền hàm dịch (tr) để chữ Từ/Đến và đơn vị đúng ngôn ngữ giao diện. */
export function formatPrice(
  p: Pick<ProductOut, 'price_min' | 'price_max' | 'currency' | 'unit'>,
  t: Translate = identity,
): string {
  let range = '';
  if (p.price_min && p.price_max) range = `${p.price_min} – ${p.price_max}`;
  else if (p.price_min) range = `${t('Từ')} ${p.price_min}`;
  else if (p.price_max) range = `${t('Đến')} ${p.price_max}`;
  if (!range) return '';
  const unit = unitLabel(p.unit, t);
  return `${range} ${p.currency}${unit ? ` / ${unit}` : ''}`;
}

export function formatMoq(p: Pick<ProductOut, 'moq' | 'moq_unit'>, t: Translate = identity): string {
  if (!p.moq) return '';
  const unit = unitLabel(p.moq_unit, t);
  return unit ? `${p.moq} ${unit}` : p.moq;
}

const NETWORK = 'Không kết nối được máy chủ. Vui lòng thử lại.';
const UPLOAD_FAILED = 'Không tải được ảnh lên. Bạn vẫn có thể lưu sản phẩm không có ảnh.';

/** Danh sách sản phẩm của tôi. Chưa có công ty (404) → []; lỗi khác → null. */
export async function getMyProducts(): Promise<ProductOut[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/exporter/products');
    if (response.status === 404) return [];
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

function saveError(status: number, name: string): Error {
  if (status === 422) return new Error(`Sản phẩm "${name}" chưa hợp lệ. Vui lòng kiểm tra mã HS, giá và ảnh.`);
  if (status === 404) return new Error('Chưa có hồ sơ doanh nghiệp. Hãy lưu thông tin doanh nghiệp trước.');
  return new Error(`Không lưu được sản phẩm "${name}". Vui lòng thử lại.`);
}

/**
 * Đưa danh sách sản phẩm trong form lên server: mới → POST, đã có → PATCH, đã bỏ → DELETE.
 * Kiểm tra hợp lệ TOÀN BỘ trước khi ghi để không lưu dở dang vì lỗi nhập liệu.
 */
export async function syncProducts(drafts: ProductDraft[]): Promise<ProductOut[]> {
  const bodies = drafts.map((d) => draftToBody(d));
  const api = createApiClient();
  try {
    const listed = await api.GET('/api/exporter/products');
    if (!listed.response.ok || !listed.data) throw new Error(NETWORK);
    const existingIds = new Set(listed.data.map((p) => p.id));
    const keptIds = new Set<string>();
    const saved: ProductOut[] = [];
    for (const [index, draft] of drafts.entries()) {
      const body = bodies[index];
      const update = draft.id !== undefined && existingIds.has(draft.id);
      const result = update
        ? await api.PATCH('/api/exporter/products/{product_id}', {
            params: { path: { product_id: draft.id as string } },
            body,
          })
        : await api.POST('/api/exporter/products', { body });
      if (!result.response.ok || !result.data) throw saveError(result.response.status, body.name);
      if (update) keptIds.add(draft.id as string);
      saved.push(result.data);
    }
    for (const product of listed.data) {
      if (keptIds.has(product.id)) continue;
      await api.DELETE('/api/exporter/products/{product_id}', {
        params: { path: { product_id: product.id } },
      });
    }
    return saved;
  } catch (error) {
    if (error instanceof Error && error.message !== 'Failed to fetch' && !(error instanceof TypeError)) throw error;
    throw new Error(NETWORK);
  }
}

/** Tải ảnh lên kho qua URL ký sẵn. Trả khóa lưu vào sản phẩm và địa chỉ xem trước tại chỗ. */
export async function uploadProductImage(file: File): Promise<{ key: string; url: string }> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('Ảnh phải là PNG, JPEG hoặc WebP.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Ảnh tối đa 5MB.');
  try {
    const { data, response } = await createApiClient().POST('/api/uploads/presign', {
      body: { purpose: 'product_image', content_type: file.type as 'image/png' | 'image/jpeg' | 'image/webp' },
    });
    if (!response.ok || !data) throw new Error(UPLOAD_FAILED);
    const put = await fetch(
      new Request(data.upload_url, { method: 'PUT', headers: { 'content-type': file.type }, body: file }),
    );
    if (!put.ok) throw new Error(UPLOAD_FAILED);
    return { key: data.key, url: URL.createObjectURL(file) };
  } catch {
    throw new Error(UPLOAD_FAILED);
  }
}

/** Lưu MỘT sản phẩm (U3: thêm/sửa ngay trong workspace, không đẩy về wizard). */
export async function saveProduct(draft: ProductDraft): Promise<ProductOut> {
  const body = draftToBody(draft);
  const api = createApiClient();
  let result: { data?: ProductOut; response: Response };
  try {
    result = draft.id
      ? await api.PATCH('/api/exporter/products/{product_id}', { params: { path: { product_id: draft.id } }, body })
      : await api.POST('/api/exporter/products', { body });
  } catch {
    throw new Error(NETWORK);
  }
  if (!result.response.ok || !result.data) throw saveError(result.response.status, body.name);
  return result.data;
}

export async function deleteProduct(id: string): Promise<void> {
  let response: Response;
  try {
    ({ response } = await createApiClient().DELETE('/api/exporter/products/{product_id}', { params: { path: { product_id: id } } }));
  } catch {
    throw new Error(NETWORK);
  }
  if (!response.ok && response.status !== 404) throw new Error('Không xóa được sản phẩm. Vui lòng thử lại.');
}
