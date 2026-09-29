'use client';

// Trình soạn danh sách sản phẩm của exporter (B5). Chỉ các trường theo backlog:
// tên, mã HS (bắt buộc), giá, tiền tệ, đơn vị, MOQ, mô tả vi/en, ảnh, hiển thị công khai.
import React, { useId, useRef, useState } from 'react';
import { Camera, Plus, X } from 'lucide-react';
import HsCodePicker from './HsCodePicker';
import { useLanguage } from '../context/LanguageContext';
import {
  CURRENCIES,
  MAX_IMAGES,
  UNITS,
  emptyDraft,
  uploadProductImage,
  type Currency,
  type ProductDraft,
} from '../lib/productsApi';

const FIELD =
  'w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-[#083832]';
const LABEL = 'block text-[11px] font-medium text-slate-600 mb-1';

interface ProductsEditorProps {
  products: ProductDraft[];
  onChange: (next: ProductDraft[]) => void;
}

export default function ProductsEditor({ products, onChange }: ProductsEditorProps) {
  const { tr } = useLanguage();
  // Cập nhật theo bản mới nhất (tải ảnh có thể xong sau khi người dùng đã sửa chỗ khác).
  const latest = useRef(products);
  latest.current = products;

  function commit(next: ProductDraft[]) {
    latest.current = next;
    onChange(next);
  }

  function update(key: string, change: (p: ProductDraft) => ProductDraft) {
    commit(latest.current.map((p) => (p.key === key ? change(p) : p)));
  }

  return (
    <div className="space-y-4">
      {products.length === 0 && (
        <p role="status" className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-700">
          {tr('Chưa có sản phẩm. Hãy thêm ít nhất một sản phẩm kèm mã HS để buyer tìm thấy bạn.')}
        </p>
      )}
      {products.map((product, index) => (
        <ProductCard
          key={product.key}
          index={index}
          product={product}
          onUpdate={(change) => update(product.key, change)}
          onRemove={() => commit(latest.current.filter((p) => p.key !== product.key))}
        />
      ))}
      <button
        type="button"
        onClick={() => commit([...latest.current, emptyDraft()])}
        className="px-4 py-2 rounded-xl bg-[#0b1e2e] hover:bg-[#081622] text-white text-xs sm:text-[13px] font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        <span>{tr('Thêm sản phẩm')}</span>
      </button>
    </div>
  );
}

function ProductCard({
  index,
  product,
  onUpdate,
  onRemove,
}: {
  index: number;
  product: ProductDraft;
  onUpdate: (change: (p: ProductDraft) => ProductDraft) => void;
  onRemove: () => void;
}) {
  const { tr } = useLanguage();
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const set = <K extends keyof ProductDraft>(field: K, value: ProductDraft[K]) =>
    onUpdate((p) => ({ ...p, [field]: value }));

  async function handleFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    setImageError('');
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const image = await uploadProductImage(file);
        onUpdate((p) => (p.images.length >= MAX_IMAGES ? p : { ...p, images: [...p.images, image] }));
      }
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Không tải được ảnh lên.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      role="group"
      aria-label={`${tr('Sản phẩm')} ${index + 1}`}
      className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <label htmlFor={id('name')} className={LABEL}>
            {tr('Tên sản phẩm')} *
          </label>
          <input
            id={id('name')}
            required
            maxLength={255}
            value={product.name}
            onChange={(e) => set('name', e.target.value)}
            className={`${FIELD} text-sm font-semibold`}
            placeholder={tr('Ví dụ: Gạo thơm Jasmine xuất khẩu')}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={tr('Xóa sản phẩm')}
          title={tr('Xóa sản phẩm')}
          className="mt-6 p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <HsCodePicker
        label={`${tr('Mã HS')} *`}
        required
        value={product.hs}
        onChange={(hs) => set('hs', hs)}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label htmlFor={id('pmin')} className={LABEL}>{tr('Giá thấp nhất')}</label>
          <input id={id('pmin')} inputMode="decimal" value={product.priceMin} onChange={(e) => set('priceMin', e.target.value)} className={FIELD} placeholder="480.00" />
        </div>
        <div>
          <label htmlFor={id('pmax')} className={LABEL}>{tr('Giá cao nhất')}</label>
          <input id={id('pmax')} inputMode="decimal" value={product.priceMax} onChange={(e) => set('priceMax', e.target.value)} className={FIELD} placeholder="560.50" />
        </div>
        <div>
          <label htmlFor={id('cur')} className={LABEL}>{tr('Tiền tệ')}</label>
          <select id={id('cur')} value={product.currency} onChange={(e) => set('currency', e.target.value as Currency)} className={FIELD}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={id('unit')} className={LABEL}>{tr('Đơn vị giá')}</label>
          <select id={id('unit')} value={product.unit} onChange={(e) => set('unit', e.target.value)} className={FIELD}>
            <option value="">{tr('Chọn đơn vị')}</option>
            {UNITS.map((u) => <option key={u.code} value={u.code}>{tr(u.label)}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={id('moq')} className={LABEL}>{tr('MOQ (số lượng đặt tối thiểu)')}</label>
          <input id={id('moq')} inputMode="decimal" value={product.moq} onChange={(e) => set('moq', e.target.value)} className={FIELD} placeholder="25" />
        </div>
        <div>
          <label htmlFor={id('moqunit')} className={LABEL}>{tr('Đơn vị MOQ')}</label>
          <select id={id('moqunit')} value={product.moqUnit} onChange={(e) => set('moqUnit', e.target.value)} className={FIELD}>
            <option value="">{tr('Chọn đơn vị')}</option>
            {UNITS.map((u) => <option key={u.code} value={u.code}>{tr(u.label)}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={id('dvi')} className={LABEL}>{tr('Mô tả (tiếng Việt)')}</label>
          <textarea id={id('dvi')} rows={3} maxLength={5000} value={product.descriptionVi} onChange={(e) => set('descriptionVi', e.target.value)} className={`${FIELD} resize-y`} />
        </div>
        <div>
          <label htmlFor={id('den')} className={LABEL}>{tr('Mô tả (tiếng Anh)')}</label>
          <textarea id={id('den')} rows={3} maxLength={5000} value={product.descriptionEn} onChange={(e) => set('descriptionEn', e.target.value)} className={`${FIELD} resize-y`} />
        </div>
      </div>

      <div>
        <span className={LABEL}>{tr('Ảnh sản phẩm')}</span>
        <div className="flex flex-wrap items-center gap-3">
          {product.images.map((image, imageIndex) => (
            <div key={image.key} className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              <img src={image.url} alt={`${tr('Ảnh')} ${imageIndex + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                aria-label={`${tr('Xóa ảnh')} ${imageIndex + 1}`}
                onClick={() => onUpdate((p) => ({ ...p, images: p.images.filter((i) => i.key !== image.key) }))}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {product.images.length < MAX_IMAGES ? (
            <label className="w-20 h-20 rounded-xl border border-dashed border-slate-300 text-slate-600 flex flex-col items-center justify-center gap-1 text-[10px] font-medium cursor-pointer hover:bg-slate-50">
              <Camera className="w-5 h-5" />
              <span>{uploading ? tr('Đang tải…') : tr('Thêm ảnh')}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                disabled={uploading}
                className="sr-only"
                onChange={(e) => {
                  void handleFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          ) : (
            <span className="text-xs text-slate-600">{tr('Đã đủ 10 ảnh')}</span>
          )}
        </div>
        {imageError && (
          <p role="alert" className="mt-2 text-xs text-rose-700">{tr(imageError)}</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-xs sm:text-[13px] text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={product.isActive}
          onChange={(e) => set('isActive', e.target.checked)}
          className="h-4 w-4 accent-teal-800"
        />
        {tr('Hiển thị công khai')}
      </label>
    </div>
  );
}
