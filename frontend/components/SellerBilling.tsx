'use client';

// Đơn và quyền dùng của seller (U19). Đơn đang chờ hiện hướng dẫn chuyển khoản; nội dung chuyển
// khoản là mã tham chiếu để đội ngũ VYBE đối soát. Không có cổng thanh toán.
import React, { useCallback, useEffect, useState } from 'react';
import { Landmark, AlertTriangle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import {
  cancelMyOrder,
  formatMoney,
  listMyEntitlements,
  listMyOrders,
  ORDER_STATUS_LABELS,
  type Entitlement,
  type Order,
} from '../lib/billingApi';

const FEATURE_LABELS: Record<string, string> = {
  verification_enhanced_review: 'Duyệt xác minh Nâng cao',
  gtm_report_full: 'Báo cáo go-to-market đầy đủ',
  profile_viewers_full: 'Danh sách đầy đủ ai đã xem hồ sơ',
};

function TransferBox({ order }: { order: Order }) {
  const { tr, language } = useLanguage();
  const bank = order.bank_transfer;
  if (!bank) return null;
  const rows: [string, string][] = [
    ['Ngân hàng', bank.bank_name],
    ['Chủ tài khoản', bank.account_name],
    ['Số tài khoản', bank.account_number],
    ...(bank.iban ? ([['IBAN', bank.iban]] as [string, string][]) : []),
    ...(bank.swift ? ([['SWIFT', bank.swift]] as [string, string][]) : []),
    ['Số tiền', formatMoney(order.amount, order.currency, language)],
    ['Nội dung chuyển khoản', bank.transfer_note],
  ];
  return (
    <div className="mt-3 rounded-2xl border border-teal-200 bg-teal-50/60 p-4" aria-label={tr('Hướng dẫn chuyển khoản')}>
      <p className="flex items-center gap-2 text-sm font-semibold text-[#083832]">
        <Landmark className="h-4 w-4" aria-hidden="true" />
        {tr('Hướng dẫn chuyển khoản')}
      </p>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt className="text-slate-500">{tr(label)}</dt>
            <dd className="font-semibold text-slate-900">{value}</dd>
          </React.Fragment>
        ))}
      </dl>
      <p className="mt-2 text-xs text-slate-600">{tr('Ghi đúng nội dung chuyển khoản để được xác nhận nhanh. Dịch vụ mở ngay khi đội ngũ VYBE xác nhận đã nhận tiền.')}</p>
      {bank.is_demo_account && (
        <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-amber-800">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {tr('Tài khoản minh hoạ cho bản demo — không chuyển tiền thật.')}
        </p>
      )}
    </div>
  );
}

export default function SellerBilling() {
  const { tr, language } = useLanguage();
  const highlight = useSearchParams()?.get('order') ?? null;
  const [orders, setOrders] = useState<Order[] | null | undefined>(undefined);
  const [grants, setGrants] = useState<Entitlement[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setOrders(await listMyOrders());
    setGrants((await listMyEntitlements()) ?? []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async (order: Order) => {
    setError('');
    if (!(await cancelMyOrder(order.id))) setError('Không huỷ được đơn. Vui lòng thử lại.');
    await load();
  };
  const date = (iso: string) => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium' }).format(new Date(iso));

  return (
    <section aria-label={tr('Gói dịch vụ & thanh toán')} className="space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">{tr('Gói dịch vụ & thanh toán')}</h2>
        <Link href="/pricing" className="text-sm font-semibold text-teal-800 underline">
          {tr('Xem bảng giá')}
        </Link>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900">{tr('Dịch vụ đang dùng')}</h3>
        {grants.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">{tr('Bạn đang dùng gói miễn phí.')}</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {grants.map((g) => (
              <li key={g.order_id}>
                • {tr(FEATURE_LABELS[g.feature] ?? g.feature)} — {g.valid_until ? tr(`hết hạn ${date(g.valid_until)}`) : tr('không giới hạn thời gian')}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900">{tr('Đơn của bạn')}</h3>
        {error && (
          <p role="alert" className="mt-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {tr(error)}
          </p>
        )}
        {orders === null && <p className="mt-2 text-sm text-rose-700">{tr('Không tải được danh sách đơn.')}</p>}
        {orders && orders.length === 0 && <p className="mt-2 text-sm text-slate-500">{tr('Chưa có đơn nào.')}</p>}
        {orders && orders.length > 0 && (
          <ul className="mt-2 space-y-3">
            {orders.map((order) => (
              <li
                key={order.id}
                aria-label={order.reference}
                className={`rounded-2xl border bg-white p-4 text-sm ${order.id === highlight ? 'border-[#083832] ring-1 ring-[#083832]' : 'border-slate-200'}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold text-slate-900">{language === 'en' ? order.item_name_en : order.item_name_vi}</p>
                  <span className="text-xs font-semibold text-slate-600">{tr(ORDER_STATUS_LABELS[order.status])}</span>
                </div>
                <p className="mt-1 text-slate-600">
                  {order.reference} · {formatMoney(order.amount, order.currency, language)} · {date(order.created_at)}
                </p>
                <TransferBox order={order} />
                {order.status === 'pending' && (
                  <button type="button" onClick={() => void cancel(order)} className="mt-3 text-xs font-semibold text-rose-700 underline">
                    {tr('Huỷ đơn')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
