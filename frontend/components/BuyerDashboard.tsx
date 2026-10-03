'use client';

// Dashboard buyer (G2): RFQ đã gửi, nhà cung cấp xem gần đây, nhà cung cấp mới được xác minh trong
// nhóm hàng quan tâm, tìm kiếm đã lưu (P1 — hiện là hướng dẫn). Cần phiên buyer.
import React, { useEffect, useState } from 'react';
import DashboardTile from './DashboardTile';
import { useDemoSession } from './app-shell/useDemoSession';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import { countryName } from '../lib/suppliersApi';
import { fetchBuyerDashboard, type BuyerDashboardData } from '../lib/dashboardApi';
import { STATUS_LABELS, type RfqStatus } from '../lib/rfqApi';
import { PageLoader } from './PageLoader';

function Suppliers({ items }: { items: { slug: string; name: string; country: string }[] }) {
  return (
    <ul className="space-y-1 text-sm">
      {items.map((s) => (
        <li key={s.slug}>
          <Link href={`/suppliers/${s.slug}`} className="font-semibold text-teal-800 underline">
            {s.name}
          </Link>{' '}
          <span className="text-slate-600">({countryName(s.country)})</span>
        </li>
      ))}
    </ul>
  );
}

export default function BuyerDashboard() {
  const { tr } = useLanguage();
  const { user, ready } = useDemoSession();
  const [data, setData] = useState<BuyerDashboardData | null | undefined>(undefined);

  useEffect(() => {
    if (!ready || user?.role !== 'buyer') return;
    let active = true;
    fetchBuyerDashboard().then((d) => active && setData(d));
    return () => {
      active = false;
    };
  }, [ready, user]);

  if (!ready) return <PageLoader />;
  if (user?.role !== 'buyer') {
    return (
      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <h1 className="text-2xl font-extrabold text-slate-900">{tr('Bảng điều khiển')}</h1>
        <p role="status" className="mt-6 rounded-xl bg-white p-6 text-sm text-slate-700">
          {tr('Đăng nhập bằng tài khoản buyer để xem bảng điều khiển.')}{' '}
          <Link href="/login" className="font-semibold underline">
            {tr('Đăng nhập')}
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{tr('Bảng điều khiển')}</h1>
      {/* U5: điều buyer cần nhất là nguồn cung ổn định, giảm rủi ro khi đổi nhà cung cấp (demo 30/9). */}
      <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/60 p-4 text-sm text-teal-900">
        <p className="font-semibold">{tr('Tìm nguồn cung ổn định, giảm rủi ro khi đổi nhà cung cấp.')}</p>
        <p className="mt-1 text-xs text-teal-800">
          {tr('Nhà cung cấp trong danh bạ đã được kiểm tra pháp lý; xem năng lực, sản lượng và thị trường đã xuất khẩu trước khi liên hệ.')}{' '}
          <Link href="/buyer/profile" className="font-semibold underline">{tr('Cập nhật nhu cầu mua hàng')}</Link>
        </p>
      </div>
      {data === undefined ? null : data === null ? (
        <p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          {tr('Không tải được bảng điều khiển. Vui lòng thử lại.')}
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <DashboardTile title="Tìm kiếm đã lưu" hint={data.saved_searches.empty_hint_key} />
          <DashboardTile title="Yêu cầu báo giá đã gửi" hint={data.rfqs_sent.empty_hint_key}>
            {data.rfqs_sent.data && data.rfqs_sent.data.total > 0 && (
              <>
                <p className="text-3xl font-extrabold text-[#083832]">{data.rfqs_sent.data.total}</p>
                <p className="text-xs text-slate-600">
                  {(['new', 'viewed', 'quoted', 'closed'] as RfqStatus[]).map((s) => `${tr(STATUS_LABELS[s])}: ${data.rfqs_sent.data?.counts[s] ?? 0}`).join(' · ')}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {data.rfqs_sent.data.recent.map((r) => (
                    <li key={r.id}>
                      {r.counterpart_name} — {r.product_name} ({tr(STATUS_LABELS[r.status as RfqStatus] ?? r.status)})
                    </li>
                  ))}
                </ul>
                <Link href="/buyer/rfqs" className="mt-2 inline-block text-sm font-semibold text-teal-800 underline">
                  {tr('Xem tất cả')}
                </Link>
              </>
            )}
          </DashboardTile>
          <DashboardTile title="Nhà cung cấp xem gần đây" hint={data.recently_viewed.empty_hint_key}>
            <Suppliers items={data.recently_viewed.data} />
          </DashboardTile>
          <DashboardTile title="Nhà cung cấp mới được xác minh tuần này" hint={data.new_verified.empty_hint_key}>
            <Suppliers items={data.new_verified.data} />
          </DashboardTile>
        </div>
      )}
    </main>
  );
}
