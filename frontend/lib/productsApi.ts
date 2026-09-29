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

export interface ProductDraft {
  /** Khóa cục bộ ổn định cho React (bằng id server nếu đã lưu). */
  key: string;
  /** id trên server; chưa có nghĩa là sản phẩm mới. */
  id?: string;
  name: string;
  hs: HsSelection | null;
  priceMin: string;
  priceMax: string;
  currency: Currency;
  unit: string;
  moq: string;
  moqUnit: string;
  descriptionVi: string;
  descriptionEn: string;
  isActive: boolean;
  images: { key: string; url: string }[];
}

export function emptyDraft(): ProductDraft {
  return {
    key: crypto.randomUUID(),
    name: '',
    hs: null,
    priceMin: '',
    priceMax: '',
    currency: 'USD',
    unit: '',
    moq: '',
    moqUnit: '',
    descriptionVi: '',
    descriptionEn: '',
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
    priceMin: p.price_min ?? '',
    priceMax: p.price_max ?? '',
    currency: p.currency as Currency,
    unit: p.unit ?? '',
    moq: p.moq ?? '',
    moqUnit: p.moq_unit ?? '',
    descriptionVi: p.description_vi ?? '',
    descriptionEn: p.description_en ?? '',
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

/** Kiểm tra hợp lệ rồi đổi bản nháp thành body gửi server. Ném lỗi tiếng Việt nếu không hợp lệ. */
export function draftToBody(d: ProductDraft): ProductIn {
  const name = d.name.trim();
  if (!name) throw new Error('Mỗi sản phẩm cần có tên.');
  if (!d.hs) throw new Error(`Sản phẩm "${name}" chưa chọn mã HS.`);
  const priceMin = parseAmount('Giá thấp nhất', d.priceMin);
  const priceMax = parseAmount('Giá cao nhất', d.priceMax);
  if (priceMin && priceMax && Number(priceMin) > Number(priceMax)) {
    throw new Error('Giá thấp nhất không được lớn hơn giá cao nhất.');
  }
  return {
    name,
    hs_code: d.hs.code,
    description_vi: blank(d.descriptionVi),
    description_en: blank(d.descriptionEn),
    price_min: priceMin,
    price_max: priceMax,
    currency: d.currency,
    unit: (blank(d.unit) as UnitCode | null) ?? null,
    moq: parseAmount('MOQ', d.moq),
    moq_unit: (blank(d.moqUnit) as UnitCode | null) ?? null,
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
