'use client';

// Form yêu cầu báo giá (F1) trên hồ sơ nhà cung cấp. Khách và exporter được hướng dẫn thay vì thấy form vô dụng.
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import { useDemoSession } from './app-shell/useDemoSession';
import { COUNTRIES } from '../lib/companyApi';
import { CURRENCIES, INCOTERMS, createRfq, getRfqQuota, type Incoterm, type RfqError, type RfqQuota } from '../lib/rfqApi';
import { parseAmount } from '../lib/tariffApi';

export interface RfqProduct {
  id: string;
  name: string;
  unit: string | null;
}

const ERRORS: Record<RfqError, string> = {
  not_verified: 'Doanh nghiệp của bạn cần được xác minh trước khi gửi yêu cầu báo giá.',
  rate_limited: 'Bạn đã gửi quá nhiều yêu cầu báo giá hôm nay. Vui lòng thử lại vào ngày mai.',
  company_required: 'Vui lòng hoàn thiện hồ sơ doanh nghiệp của bạn trước khi gửi yêu cầu báo giá.',
  product_not_found: 'Sản phẩm này hiện không còn nhận yêu cầu báo giá.',
  invalid: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại số lượng, giá, ngày cần hàng và điểm đến.',
  unauthorized: 'Chỉ tài khoản buyer đã đăng nhập mới gửi được yêu cầu báo giá.',
  network: 'Không kết nối được máy chủ. Vui lòng thử lại.',
};

const field =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]';
const label = 'block text-xs font-semibold text-slate-700';

export default function RfqForm({ products, supplierName }: { products: RfqProduct[]; supplierName: string }) {
  const { tr } = useLanguage();
  const { user, ready } = useDemoSession();
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState(products[0]?.unit ?? 'kg');
  const [targetPrice, setTargetPrice] = useState('');
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>('EUR');
  const [incoterms, setIncoterms] = useState<Incoterm>('CIF');
  const [country, setCountry] = useState('DE');
  const [port, setPort] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [quota, setQuota] = useState<RfqQuota | null>(null);
  const isBuyer = user?.role === 'buyer';

  // U6: buyer chưa xác minh vẫn gửi được, chỉ có hạn mức thấp hơn — báo trước thay vì chỉ báo lỗi 429.
  useEffect(() => {
    if (!isBuyer) return;
    let active = true;
    void getRfqQuota().then((q) => {
      if (active) setQuota(q);
    });
    return () => {
      active = false;
    };
  }, [isBuyer]);

  if (!ready) return null;
  if (products.length === 0) return null;
  if (!user) {
    return (
      <section aria-label={tr('Yêu cầu báo giá')} className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">{tr('Yêu cầu báo giá')}</h2>
        <p className="mt-2 text-sm text-slate-700">{tr('Đăng nhập bằng tài khoản buyer để gửi yêu cầu báo giá cho nhà cung cấp này.')}</p>
        <div className="mt-3 flex gap-3">
          <Link href="/login" className="rounded-xl bg-[#083832] px-4 py-2 text-sm font-semibold text-white">
            {tr('Đăng nhập')}
          </Link>
          <Link href="/register" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800">
            {tr('Đăng ký buyer')}
          </Link>
        </div>
      </section>
    );
  }
  if (user.role !== 'buyer') {
    return (
      <p role="status" className="mt-8 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
        {tr('Chỉ tài khoản buyer mới gửi được yêu cầu báo giá.')}
      </p>
    );
  }
  if (sent) {
    return (
      <section role="status" className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm font-semibold text-emerald-900">
          {tr('Đã gửi yêu cầu báo giá tới')} {supplierName}.
        </p>
        <Link href="/buyer/rfqs" className="mt-2 inline-block text-sm font-semibold text-emerald-900 underline">
          {tr('Xem các yêu cầu đã gửi')}
        </Link>
      </section>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const amount = parseAmount(quantity);
    if (!amount) return setError('Số lượng phải là số dương, tối đa 2 chữ số thập phân.');
    const price = targetPrice.trim() === '' ? null : parseAmount(targetPrice);
    if (targetPrice.trim() !== '' && !price) return setError('Giá mục tiêu phải là số dương, tối đa 2 chữ số thập phân.');
    if (!unit.trim()) return setError('Vui lòng nhập đơn vị tính.');
    if (!requiredDate) return setError('Vui lòng chọn ngày cần hàng.');
    setBusy(true);
    const outcome = await createRfq({
      product_id: productId,
      quantity: amount,
      unit: unit.trim(),
      target_price: price,
      currency,
      incoterms,
      destination_country: country,
      destination_port: port.trim() || null,
      required_date: requiredDate,
      message: message.trim() || null,
    });
    setBusy(false);
    if (outcome.ok) setSent(true);
    else setError(ERRORS[outcome.error]);
  };

  return (
    <section aria-label={tr('Yêu cầu báo giá')} id="rfq" className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold text-slate-900">{tr('Yêu cầu báo giá')}</h2>
      <form onSubmit={submit} noValidate className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="rfq-product" className={label}>{tr('Sản phẩm')}</label>
          <select
            id="rfq-product"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setUnit(products.find((p) => p.id === e.target.value)?.unit ?? unit);
            }}
            className={field}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rfq-quantity" className={label}>{tr('Số lượng')}</label>
          <input id="rfq-quantity" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="rfq-unit" className={label}>{tr('Đơn vị')}</label>
          <input id="rfq-unit" value={unit} maxLength={32} onChange={(e) => setUnit(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="rfq-price" className={label}>{tr('Giá mục tiêu (không bắt buộc)')}</label>
          <input id="rfq-price" inputMode="decimal" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="rfq-currency" className={label}>{tr('Tiền tệ')}</label>
          <select id="rfq-currency" value={currency} onChange={(e) => setCurrency(e.target.value as (typeof CURRENCIES)[number])} className={field}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rfq-incoterms" className={label}>{tr('Điều kiện giao hàng (Incoterms)')}</label>
          <select id="rfq-incoterms" value={incoterms} onChange={(e) => setIncoterms(e.target.value as Incoterm)} className={field}>
            {INCOTERMS.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rfq-date" className={label}>{tr('Ngày cần hàng')}</label>
          <input
            id="rfq-date"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={requiredDate}
            onChange={(e) => setRequiredDate(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="rfq-country" className={label}>{tr('Quốc gia nhận hàng')}</label>
          <select id="rfq-country" value={country} onChange={(e) => setCountry(e.target.value)} className={field}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rfq-port" className={label}>{tr('Cảng nhận hàng (không bắt buộc)')}</label>
          <input id="rfq-port" value={port} maxLength={100} onChange={(e) => setPort(e.target.value)} className={field} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="rfq-message" className={label}>{tr('Lời nhắn (không bắt buộc)')}</label>
          <textarea id="rfq-message" rows={3} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} className={field} />
        </div>
        {quota && (
          <p data-testid="rfq-quota" className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 sm:col-span-2">
            {tr(`Còn ${quota.remaining}/${quota.limit} yêu cầu báo giá trong 24 giờ.`)}
            {!quota.verified && (
              <>
                {' '}
                {tr('Doanh nghiệp chưa xác minh vẫn gửi được; xác minh (không bắt buộc) để có hạn mức cao hơn.')}{' '}
                <Link href="/buyer/profile" className="font-semibold text-teal-800 underline">
                  {tr('Xác minh doanh nghiệp')}
                </Link>
              </>
            )}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2">{tr(error)}</p>
        )}
        <div className="sm:col-span-2">
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#083832] px-5 py-3 text-sm font-semibold text-white hover:bg-[#062924] disabled:opacity-60 sm:w-auto">
            {tr(busy ? 'Đang gửi...' : 'Gửi yêu cầu báo giá')}
          </button>
        </div>
      </form>
    </section>
  );
}
