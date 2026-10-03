'use client';

// Thêm / sửa MỘT sản phẩm ngay trong workspace (U3): không đẩy seller về wizard 4 bước.
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ProductCard } from './ProductsEditor';
import { deleteProduct, saveProduct, type ProductDraft, type ProductOut } from '../lib/productsApi';

interface Props {
  initial: ProductDraft;
  onClose: () => void;
  onSaved: (product: ProductOut) => void;
  onDeleted: (id: string) => void;
}

export default function ProductDialog({ initial, onClose, onSaved, onDeleted }: Props) {
  const { tr } = useLanguage();
  const [draft, setDraft] = useState<ProductDraft>(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const editing = Boolean(initial.id);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function save() {
    setError('');
    setBusy(true);
    try {
      onSaved(await saveProduct(draft));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không lưu được sản phẩm. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial.id) return;
    setError('');
    setBusy(true);
    try {
      await deleteProduct(initial.id);
      onDeleted(initial.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không xóa được sản phẩm. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-dialog-title"
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-4 sm:p-6 shadow-2xl text-left"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 id="product-dialog-title" className="text-lg font-bold text-slate-900">
            {tr(editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm')}
          </h2>
          <button type="button" onClick={onClose} aria-label={tr('Đóng')} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <ProductCard index={0} product={draft} onUpdate={(change) => setDraft((d) => change(d))} onRemove={onClose} />
        {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{tr(error)}</p>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          {editing ? (
            <button type="button" disabled={busy} onClick={remove} className="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-50 disabled:opacity-50 cursor-pointer">
              {tr('Xóa sản phẩm')}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer">
              {tr('Hủy')}
            </button>
            <button type="button" disabled={busy} onClick={save} className="px-5 py-2 rounded-xl bg-[#083832] hover:bg-[#062924] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer">
              {tr(busy ? 'Đang lưu…' : 'Lưu sản phẩm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
