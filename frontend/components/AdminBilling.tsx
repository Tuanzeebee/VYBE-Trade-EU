'use client';

// Thanh toán (U19): admin đối soát sao kê rồi bấm "Đã nhận chuyển khoản" → cấp quyền dùng (ghi nhật
// ký; bấm lại không có tác dụng). Chỉnh giá các mục thu phí (giá tạm tính chờ khách chốt).
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  adminDecideOrder,
  adminListItems,
  adminListOrders,
  adminUpdateItem,
  formatMoney,
  ORDER_STATUS_LABELS,
  type AdminBillingItem,
  type AdminOrder,
  type OrderStatus,
} from '../lib/billingApi';

const FILTERS: ('' | OrderStatus)[] = ['pending', 'paid', 'cancelled', ''];

function OrderRow({ order, onDone }: { order: AdminOrder; onDone: (ok: boolean) => void }) {
  const { tr, language } = useLanguage();
  const [action, setAction] = useState<'confirm-payment' | 'cancel' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!action) return;
    setBusy(true);
    const ok = await adminDecideOrder(order.id, action, note);
    setBusy(false);
    setAction(null);
    onDone(ok);
  };
  return (
    <li aria-label={order.reference} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-bold text-slate-900">
          {order.reference} · {order.company_name}
        </p>
        <span className="text-xs font-semibold text-slate-600">{tr(ORDER_STATUS_LABELS[order.status])}</span>
      </div>
      <p className="mt-1 text-slate-700">
        {language === 'en' ? order.item_name_en : order.item_name_vi} · {formatMoney(order.amount, order.currency, language)}
      </p>
      {order.invoice_info?.tax_code && (
        <p className="text-xs text-slate-500">
          {tr('Xuất hoá đơn')}: {order.invoice_info.company_name ?? ''} · {tr('MST')} {order.invoice_info.tax_code}
        </p>
      )}
      {order.admin_note && <p className="mt-1 text-xs text-slate-500">{order.admin_note}</p>}
      {order.status === 'pending' && !action && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setAction('confirm-payment')} className="rounded-lg bg-[#083832] px-3 py-1.5 text-xs font-semibold text-white">
            {tr('Đã nhận chuyển khoản')}
          </button>
          <button type="button" onClick={() => setAction('cancel')} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
            {tr('Huỷ đơn')}
          </button>
        </div>
      )}
      {action && (
        <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-800">
            {tr(action === 'confirm-payment' ? 'Xác nhận đã nhận đúng số tiền với nội dung là mã đơn?' : 'Huỷ đơn này?')}
          </p>
          <label className="block text-xs text-slate-600">
            {tr('Ghi chú đối soát (không bắt buộc)')}
            <input value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm" />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => void submit()} className="rounded-lg bg-[#083832] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
              {tr('Xác nhận')}
            </button>
            <button type="button" onClick={() => setAction(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
              {tr('Thôi')}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function ItemRow({ item, onSaved }: { item: AdminBillingItem; onSaved: (ok: boolean) => void }) {
  const { tr, language } = useLanguage();
  const [price, setPrice] = useState(item.price);
  const save = async (body: Parameters<typeof adminUpdateItem>[1]) => onSaved(await adminUpdateItem(item.code, body));
  return (
    <tr className="border-t border-slate-100">
      <td className="py-2">{language === 'en' ? item.name_en : item.name_vi}</td>
      <td className="py-2">
        <label className="sr-only" htmlFor={`price-${item.code}`}>
          {tr('Giá')}
        </label>
        <input id={`price-${item.code}`} value={price} onChange={(e) => setPrice(e.target.value)} className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-sm" /> {item.currency}
      </td>
      <td className="py-2 text-xs">{item.price_is_placeholder ? tr('Tạm tính') : tr('Đã chốt')}</td>
      <td className="py-2 text-xs">{tr(item.is_active ? 'Đang bán' : 'Đã ẩn')}</td>
      <td className="space-x-2 py-2 text-right">
        <button type="button" onClick={() => void save({ price: price.trim(), price_is_placeholder: false })} className="text-xs font-semibold text-teal-800 underline">
          {tr('Lưu giá đã chốt')}
        </button>
        <button type="button" onClick={() => void save({ is_active: !item.is_active })} className="text-xs font-semibold text-slate-700 underline">
          {tr(item.is_active ? 'Ẩn' : 'Bán lại')}
        </button>
      </td>
    </tr>
  );
}

export default function AdminBilling() {
  const { tr } = useLanguage();
  const [filter, setFilter] = useState<'' | OrderStatus>('pending');
  const [orders, setOrders] = useState<AdminOrder[] | null | undefined>(undefined);
  const [items, setItems] = useState<AdminBillingItem[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setOrders(await adminListOrders(filter || undefined));
    setItems((await adminListItems()) ?? []);
  }, [filter]);
  useEffect(() => {
    void load();
  }, [load]);

  const done = (ok: boolean) => {
    setMessage(ok ? { ok, text: 'Đã cập nhật.' } : { ok, text: 'Không cập nhật được. Vui lòng thử lại.' });
    void load();
  };

  return (
    <section aria-label={tr('Thanh toán')} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">{tr('Đơn chuyển khoản')}</h2>
        <label className="text-xs font-semibold text-slate-700">
          {tr('Trạng thái')}{' '}
          <select value={filter} onChange={(e) => setFilter(e.target.value as '' | OrderStatus)} className="ml-1 rounded-lg border border-slate-200 px-2 py-1 text-xs">
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {tr(f ? ORDER_STATUS_LABELS[f] : 'Tất cả')}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`rounded-xl p-3 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>
          {tr(message.text)}
        </p>
      )}
      {orders === null && <p className="text-sm text-rose-700">{tr('Không tải được danh sách đơn.')}</p>}
      {orders && orders.length === 0 && <p className="text-sm text-slate-500">{tr('Không có đơn nào.')}</p>}
      {orders && orders.length > 0 && (
        <ul className="space-y-3">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} onDone={done} />
          ))}
        </ul>
      )}
      <div>
        <h2 className="text-xl font-bold text-slate-900">{tr('Mục thu phí')}</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="py-2">{tr('Mục')}</th>
                <th className="py-2">{tr('Giá')}</th>
                <th className="py-2">{tr('Trạng thái giá')}</th>
                <th className="py-2">{tr('Hiển thị')}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <ItemRow key={`${item.code}-${item.price}-${item.is_active}`} item={item} onSaved={done} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
