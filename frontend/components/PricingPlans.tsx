'use client';

// Bảng giá (U19): mục thu phí lấy từ API (dữ liệu có admin chỉnh, giá tạm tính chờ khách chốt).
// Buyer và mọi công cụ tuân thủ luôn miễn phí. Thanh toán = chuyển khoản theo mã đơn, admin xác nhận.
import React, { useEffect, useState } from 'react';
import { Check, Landmark, ShieldCheck, FileText, Eye, type LucideIcon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link, useRouter } from '../i18n/navigation';
import { createOrder, formatMoney, listBillingItems, type BillingItem } from '../lib/billingApi';
import type { DemoUser } from '../lib/demoAuth';

const FREE_FEATURES = [
  'Hồ sơ doanh nghiệp và xác minh Cơ bản',
  'Niêm yết sản phẩm, nhận yêu cầu báo giá và nhắn tin với buyer',
  'Công cụ tính thuế, quy tắc xuất xứ và EUR.1 nháp',
  'Trợ lý',
  'Gợi ý thị trường EU và bản tóm tắt báo cáo go-to-market',
  'Buyer: tìm nhà cung cấp, nhắn tin, gửi yêu cầu báo giá — miễn phí',
];

const ICONS: Record<string, LucideIcon> = {
  verification_enhanced_review: ShieldCheck,
  gtm_report_full: FileText,
  profile_viewers_full: Eye,
};

const ORDER_ERRORS = {
  role: 'Mục này dành cho doanh nghiệp bán hàng (seller).',
  company: 'Hãy hoàn thành hồ sơ doanh nghiệp trước khi đặt mua.',
  network: 'Không kết nối được máy chủ. Vui lòng thử lại.',
} as const;

export default function PricingPlans({ account }: { account: DemoUser | null }) {
  const { tr, language } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<BillingItem[] | null | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void listBillingItems().then((rows) => active && setItems(rows));
    return () => {
      active = false;
    };
  }, []);

  const buy = async (item: BillingItem) => {
    setError('');
    if (!account) return router.push('/login');
    if (account.role !== 'seller') return setError(ORDER_ERRORS.role);
    setBusy(item.code);
    const result = await createOrder(item.code);
    setBusy(null);
    if (result.ok) return router.push(`/exporter/billing?order=${result.data.id}`);
    if (result.error === 'login') return router.push('/login');
    setError(ORDER_ERRORS[result.error]);
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 text-left sm:px-8">
      <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">{tr('Bảng giá')}</h1>
      <p className="mt-3 max-w-3xl text-slate-600">
        {tr('Buyer và mọi công cụ tuân thủ luôn miễn phí. Doanh nghiệp bán hàng chỉ trả cho dịch vụ thêm, thanh toán bằng chuyển khoản ngân hàng.')}
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <section aria-label={tr('Miễn phí')} className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">{tr('Miễn phí')}</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                {tr(feature)}
              </li>
            ))}
          </ul>
        </section>

        <section aria-label={tr('Dịch vụ trả phí cho seller')}>
          <h2 className="text-xl font-bold text-slate-900">{tr('Dịch vụ trả phí cho seller')}</h2>
          {items === undefined && <p className="mt-4 text-sm text-slate-500">{tr('Đang tải…')}</p>}
          {items === null && (
            <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
              {tr('Không tải được bảng giá. Vui lòng thử lại.')}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
              {tr(error)}
            </p>
          )}
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {items?.map((item) => {
              const Icon = ICONS[item.feature] ?? Landmark;
              return (
                <li key={item.code} aria-label={language === 'en' ? item.name_en : item.name_vi} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6">
                  <Icon className="h-6 w-6 text-[#083832]" aria-hidden="true" />
                  <h3 className="mt-3 text-lg font-bold text-slate-900">{language === 'en' ? item.name_en : item.name_vi}</h3>
                  <p className="mt-1 flex-1 text-sm text-slate-600">{(language === 'en' ? item.description_en : item.description_vi) ?? ''}</p>
                  <p className="mt-4 text-2xl font-extrabold text-slate-900">{formatMoney(item.price, item.currency, language)}</p>
                  <p className="text-xs text-slate-500">{item.duration_days ? tr(`Dùng trong ${item.duration_days} ngày`) : tr('Không giới hạn thời gian')}</p>
                  {item.price_is_placeholder && (
                    <p className="mt-2 inline-block w-fit rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">{tr('Giá tạm tính — chờ chốt')}</p>
                  )}
                  <button type="button" disabled={busy === item.code} onClick={() => void buy(item)} className="mt-4 rounded-xl bg-[#083832] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    {tr(busy === item.code ? 'Đang tạo đơn…' : 'Đặt mua')}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section aria-label={tr('Cách thanh toán')} className="mt-12 rounded-3xl bg-slate-50 p-6">
        <h2 className="text-lg font-bold text-slate-900">{tr('Cách thanh toán')}</h2>
        <ol className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
          <li>{tr('Đặt mua: hệ thống tạo đơn với mã tham chiếu riêng.')}</li>
          <li>{tr('Chuyển khoản đúng số tiền, ghi mã tham chiếu vào nội dung chuyển khoản.')}</li>
          <li>{tr('Đội ngũ VYBE đối soát và xác nhận; dịch vụ mở ngay, bạn nhận thông báo.')}</li>
        </ol>
        <p className="mt-4 text-xs text-slate-500">
          {tr('Hoá đơn VAT xuất theo thông tin bạn cung cấp. Thanh toán qua nền tảng (bảo lãnh, ký quỹ) sẽ có ở giai đoạn sau.')}{' '}
          {account?.role === 'seller' && (
            <Link href="/exporter/billing" className="font-semibold underline">
              {tr('Xem đơn của bạn')}
            </Link>
          )}
        </p>
      </section>
    </main>
  );
}
