'use client';

// Trình soạn danh sách sản phẩm của exporter (B5, U3). Hỏi vừa đủ: tên (gõ tên → gợi ý mã HS), mã HS,
// bậc giá theo số lượng (hoặc giá ước tính), MOQ, quy cách đóng gói, OEM/thương hiệu riêng, mô tả MỘT
// ngôn ngữ (bản kia hệ thống dịch máy), ảnh, hiển thị công khai.
import React, { useId, useRef, useState } from 'react';
import { Camera, Plus, Trash2, X } from 'lucide-react';
import HsCodePicker, { type HsCodeOption } from './HsCodePicker';
import HsSuggestions from './HsSuggestions';
import TariffPanel from './TariffPanel';
import { useLanguage } from '../context/LanguageContext';
import {
  BRAND_MODELS,
  CHANNELS,
  CURRENCIES,
  MAX_IMAGES,
  PACK_TYPES,
  PACK_UNITS,
  PACK_UNIT_LABELS,
  UNITS,
  emptyDraft,
  emptyPackaging,
  emptyTier,
  uploadProductImage,
  type BrandModel,
  type Currency,
  type PackagingDraft,
  type ProductDraft,
  type TierDraft,
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

export function ProductCard({
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
  const { tr, language } = useLanguage();
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const set = <K extends keyof ProductDraft>(field: K, value: ProductDraft[K]) =>
    onUpdate((p) => ({ ...p, [field]: value }));

  // Tên đã tự điền từ mã HS gần nhất: chỉ tên còn đúng bằng chuỗi này mới bị thay khi đổi mã HS.
  const autoName = useRef('');

  function chooseHs(hs: HsCodeOption | null) {
    onUpdate((p) => {
      if (hs === null) return { ...p, hs: null };
      const suggested = (language === 'en' ? hs.name_en : hs.name_vi).slice(0, 255);
      const replace = p.name.trim() === '' || p.name === autoName.current;
      if (replace) autoName.current = suggested;
      return { ...p, hs, name: replace ? suggested : p.name };
    });
  }

  const setTier = (index: number, change: Partial<TierDraft>) =>
    onUpdate((p) => ({ ...p, tiers: p.tiers.map((t, i) => (i === index ? { ...t, ...change } : t)) }));
  const setPack = (index: number, change: Partial<PackagingDraft>) =>
    onUpdate((p) => ({ ...p, packagings: p.packagings.map((x, i) => (i === index ? { ...x, ...change } : x)) }));
  const primaryField = product.descriptionLang === 'en' ? 'descriptionEn' : 'descriptionVi';
  const secondaryField = product.descriptionLang === 'en' ? 'descriptionVi' : 'descriptionEn';
  const secondaryMachine = product.descriptionLang === 'en' ? product.descriptionViMachine : product.descriptionEnMachine;
  const [showSecondary, setShowSecondary] = useState(false);

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

      {!product.hs && <HsSuggestions name={product.name} onPick={chooseHs} />}
      <HsCodePicker
        label={`${tr('Mã HS')} *`}
        required
        value={product.hs}
        onChange={chooseHs}
      />
      {!product.hs && (
        <p className="text-[11px] text-slate-500 -mt-2">
          {tr('Không chắc mã HS? Gõ tên sản phẩm ở trên (ví dụ "cá tra", "hạt điều") rồi chọn gợi ý phù hợp nhất.')}
        </p>
      )}
      {product.hs && <TariffPanel hsCode={product.hs.code} />}

      <fieldset className="space-y-3">
        <legend className={LABEL}>{tr('Giá bán')} *</legend>
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold" role="radiogroup" aria-label={tr('Cách báo giá')}>
          {(['tiers', 'estimate'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={product.pricingMode === mode}
              onClick={() => set('pricingMode', mode)}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${product.pricingMode === mode ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600'}`}
            >
              {tr(mode === 'tiers' ? 'Giá theo số lượng đặt' : 'Giá ước tính')}
            </button>
          ))}
        </div>
        {product.pricingMode === 'tiers' ? (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500">{tr('Mua càng nhiều giá càng tốt — như Alibaba. Bậc đầu tiên thường là MOQ.')}</p>
            {product.tiers.map((tier, tierIndex) => (
              <div key={tierIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <div>
                  <label htmlFor={id(`tq${tierIndex}`)} className={LABEL}>{tr('Từ số lượng')}</label>
                  <input id={id(`tq${tierIndex}`)} inputMode="decimal" value={tier.minQuantity} onChange={(e) => setTier(tierIndex, { minQuantity: e.target.value })} className={FIELD} placeholder="25" />
                </div>
                <div>
                  <label htmlFor={id(`tp${tierIndex}`)} className={LABEL}>{tr('Đơn giá')}</label>
                  <input id={id(`tp${tierIndex}`)} inputMode="decimal" value={tier.unitPrice} onChange={(e) => setTier(tierIndex, { unitPrice: e.target.value })} className={FIELD} placeholder="560.00" />
                </div>
                <button
                  type="button"
                  aria-label={tr('Xóa bậc giá')}
                  disabled={product.tiers.length === 1}
                  onClick={() => onUpdate((p) => ({ ...p, tiers: p.tiers.filter((_, i) => i !== tierIndex) }))}
                  className="mb-1 p-1.5 rounded-lg text-slate-500 hover:text-rose-700 disabled:opacity-30 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {product.tiers.length < 6 && (
              <button type="button" onClick={() => onUpdate((p) => ({ ...p, tiers: [...p.tiers, emptyTier()] }))} className="text-[11px] font-semibold text-teal-800 hover:underline cursor-pointer">
                {tr('+ Thêm bậc giá')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={id('pmin')} className={LABEL}>{tr('Giá ước tính')} *</label>
              <input id={id('pmin')} inputMode="decimal" value={product.priceMin} onChange={(e) => set('priceMin', e.target.value)} className={FIELD} placeholder="520.00" />
            </div>
            <div>
              <label htmlFor={id('pmax')} className={LABEL}>{tr('Đến (nếu là khoảng giá)')}</label>
              <input id={id('pmax')} inputMode="decimal" value={product.priceMax} onChange={(e) => set('priceMax', e.target.value)} className={FIELD} placeholder="560.00" />
            </div>
          </div>
        )}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={id('cur')} className={LABEL}>{tr('Tiền tệ')} *</label>
          <select id={id('cur')} required value={product.currency} onChange={(e) => set('currency', e.target.value as Currency)} className={FIELD}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={id('unit')} className={LABEL}>{tr('Đơn vị giá')} *</label>
          <select id={id('unit')} required value={product.unit} onChange={(e) => set('unit', e.target.value)} className={FIELD}>
            <option value="">{tr('Chọn đơn vị')}</option>
            {UNITS.map((u) => <option key={u.code} value={u.code}>{tr(u.label)}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={id('moq')} className={LABEL}>
            {tr('MOQ (số lượng đặt tối thiểu)')}{product.pricingMode === 'estimate' ? ' *' : ''}
          </label>
          <input id={id('moq')} required={product.pricingMode === 'estimate'} inputMode="decimal" value={product.moq} onChange={(e) => set('moq', e.target.value)} className={FIELD} placeholder={product.pricingMode === 'tiers' ? tr('Mặc định = bậc giá đầu') : '25'} />
        </div>
        <div>
          <label htmlFor={id('moqunit')} className={LABEL}>{tr('Đơn vị MOQ')} *</label>
          <select id={id('moqunit')} required value={product.moqUnit} onChange={(e) => set('moqUnit', e.target.value)} className={FIELD}>
            <option value="">{tr('Chọn đơn vị')}</option>
            {UNITS.map((u) => <option key={u.code} value={u.code}>{tr(u.label)}</option>)}
          </select>
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className={LABEL}>{tr('Quy cách đóng gói')}</legend>
        <p className="text-[11px] text-slate-500 -mt-1">{tr('Ví dụ: bao 25 kg cho nhà hàng, túi 1 kg cho siêu thị. Buyer lọc theo quy cách phù hợp kênh bán.')}</p>
        {product.packagings.map((pack, packIndex) => (
          <div key={packIndex} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1.3fr_1.6fr_auto] gap-2 items-end">
            <div>
              <label htmlFor={id(`ps${packIndex}`)} className={LABEL}>{tr('Khối lượng')}</label>
              <input id={id(`ps${packIndex}`)} inputMode="decimal" value={pack.packSize} onChange={(e) => setPack(packIndex, { packSize: e.target.value })} className={FIELD} placeholder="25" />
            </div>
            <div>
              <label htmlFor={id(`pu${packIndex}`)} className={LABEL}>{tr('Đơn vị')}</label>
              <select id={id(`pu${packIndex}`)} value={pack.packUnit} onChange={(e) => setPack(packIndex, { packUnit: e.target.value })} className={FIELD}>
                {PACK_UNITS.map((u) => <option key={u} value={u}>{tr(PACK_UNIT_LABELS[u])}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={id(`pt${packIndex}`)} className={LABEL}>{tr('Loại bao bì')}</label>
              <select id={id(`pt${packIndex}`)} value={pack.packType} onChange={(e) => setPack(packIndex, { packType: e.target.value })} className={FIELD}>
                {PACK_TYPES.map((t) => <option key={t.code} value={t.code}>{tr(t.label)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={id(`pc${packIndex}`)} className={LABEL}>{tr('Phù hợp kênh')}</label>
              <select id={id(`pc${packIndex}`)} value={pack.channel} onChange={(e) => setPack(packIndex, { channel: e.target.value })} className={FIELD}>
                {CHANNELS.map((c) => <option key={c.code} value={c.code}>{tr(c.label)}</option>)}
              </select>
            </div>
            <button
              type="button"
              aria-label={tr('Xóa quy cách')}
              onClick={() => onUpdate((p) => ({ ...p, packagings: p.packagings.filter((_, i) => i !== packIndex) }))}
              className="mb-1 p-1.5 rounded-lg text-slate-500 hover:text-rose-700 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {product.packagings.length < 10 && (
          <button type="button" onClick={() => onUpdate((p) => ({ ...p, packagings: [...p.packagings, emptyPackaging()] }))} className="text-[11px] font-semibold text-teal-800 hover:underline cursor-pointer">
            {tr('+ Thêm quy cách')}
          </button>
        )}
      </fieldset>

      <div>
        <label htmlFor={id('brand')} className={LABEL}>{tr('Hình thức kinh doanh sản phẩm')}</label>
        <select id={id('brand')} value={product.brandModel} onChange={(e) => set('brandModel', e.target.value as BrandModel)} className={FIELD}>
          <option value="">{tr('Chọn (không bắt buộc)')}</option>
          {BRAND_MODELS.map((m) => <option key={m.code} value={m.code}>{tr(m.label)}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label htmlFor={id('desc')} className={LABEL}>{tr('Mô tả sản phẩm')}</label>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[10px] font-semibold" role="radiogroup" aria-label={tr('Ngôn ngữ mô tả')}>
            {(['vi', 'en'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                role="radio"
                aria-checked={product.descriptionLang === lang}
                onClick={() => set('descriptionLang', lang)}
                className={`px-2.5 py-1 rounded-md cursor-pointer ${product.descriptionLang === lang ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600'}`}
              >
                {tr(lang === 'vi' ? 'Viết bằng tiếng Việt' : 'Viết bằng tiếng Anh')}
              </button>
            ))}
          </div>
        </div>
        <textarea
          id={id('desc')}
          rows={3}
          maxLength={5000}
          value={product[primaryField]}
          onChange={(e) => onUpdate((p) => ({ ...p, [primaryField]: e.target.value }))}
          className={`${FIELD} resize-y`}
          placeholder={tr('Giống, tiêu chuẩn, độ ẩm, hạn dùng…')}
        />
        <p className="text-[11px] text-slate-500">
          {tr(product.descriptionLang === 'vi'
            ? 'Chỉ cần viết một ngôn ngữ — hệ thống tự dịch sang tiếng Anh cho buyer quốc tế.'
            : 'Chỉ cần viết một ngôn ngữ — hệ thống tự dịch sang tiếng Việt.')}
        </p>
        {(showSecondary || product[secondaryField]) ? (
          <div>
            <label htmlFor={id('desc2')} className={LABEL}>
              {tr(product.descriptionLang === 'vi' ? 'Bản tiếng Anh' : 'Bản tiếng Việt')}
              {secondaryMachine && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{tr('Dịch máy — sửa được')}</span>}
            </label>
            <textarea
              id={id('desc2')}
              rows={3}
              maxLength={5000}
              value={product[secondaryField]}
              onChange={(e) => onUpdate((p) => ({ ...p, [secondaryField]: e.target.value }))}
              className={`${FIELD} resize-y`}
            />
          </div>
        ) : (
          <button type="button" onClick={() => setShowSecondary(true)} className="text-[11px] font-semibold text-teal-800 hover:underline cursor-pointer">
            {tr(product.descriptionLang === 'vi' ? '+ Tự viết bản tiếng Anh (không bắt buộc)' : '+ Tự viết bản tiếng Việt (không bắt buộc)')}
          </button>
        )}
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
