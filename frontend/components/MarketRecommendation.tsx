'use client';

// Gợi ý thị trường EU (U16): top 3 nước tiêu thụ chính + 2 nước tiềm năng, mỗi nước có lý do bằng số;
// đối thủ và thị phần; bảng so sánh các nước. Số liệu: Eurostat Comext — không có số nào tự điền.
import React, { useState } from 'react';
import { Search, TrendingUp, Target } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import {
  eurCompact,
  fetchRecommendation,
  percentOf,
  QUICK_PRODUCTS,
  reasonText,
  regionName,
  type MarketItem,
  type MarketRecommendation as Recommendation,
} from '../lib/marketInsightsApi';
import dynamic from 'next/dynamic';
import { HhiMeter } from './market/HhiMeter';

// Thư viện biểu đồ nặng (~100 kB): chỉ tải khi đã có kết quả tìm kiếm, trang đầu vẫn nhẹ (mục tiêu <3s trên 4G).
const ChartSkeleton = () => <div aria-busy="true" className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />;
const ImportBarChart = dynamic(() => import('./market/ImportBarChart').then((m) => m.ImportBarChart), { ssr: false, loading: ChartSkeleton });
const CompetitorCharts = dynamic(() => import('./market/CompetitorCharts').then((m) => m.CompetitorCharts), { ssr: false, loading: ChartSkeleton });
const CountryCompareChart = dynamic(() => import('./market/CountryCompareChart').then((m) => m.CountryCompareChart), { ssr: false, loading: ChartSkeleton });

/** Bảng số liệu gốc của biểu đồ: thu gọn mặc định, dùng cho đối chiếu số và trình đọc màn hình. */
function DataTable({ children }: { children: React.ReactNode }) {
  const { tr } = useLanguage();
  return (
    <details className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
      <summary className="cursor-pointer text-sm font-semibold text-teal-800">{tr('Xem bảng số liệu')}</summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

function MarketCard({ market, rank, tone }: { market: MarketItem; rank: number; tone: 'main' | 'potential' }) {
  const { tr, language } = useLanguage();
  return (
    <li className={`rounded-2xl border p-4 ${tone === 'main' ? 'border-emerald-200 bg-emerald-50/50' : 'border-sky-200 bg-sky-50/50'}`} aria-label={regionName(market.country, language)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-base font-bold text-slate-900">
          {rank}. {regionName(market.country, language)}
        </p>
        <span className="text-xs font-semibold text-slate-600">
          {tr('Điểm')} {Number(market.score).toFixed(1)}
        </span>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-slate-700">
        {market.reasons?.map((reason) => (
          <li key={reason.code}>• {tr(reasonText(reason, language))}</li>
        ))}
      </ul>
    </li>
  );
}

export default function MarketRecommendation({ initialQuery = '' }: { initialQuery?: string }) {
  const { tr, language } = useLanguage();
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState<Recommendation | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const search = async (q: string) => {
    setError('');
    if (!q.trim()) return setError('Vui lòng nhập tên sản phẩm.');
    setQuery(q);
    setBusy(true);
    const result = await fetchRecommendation({ q });
    setBusy(false);
    if (!result) return setError('Không kết nối được máy chủ. Vui lòng thử lại.');
    setData(result);
  };

  const familyName = data?.family ? (language === 'en' ? data.family.name_en : data.family.name_vi) : '';

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{tr('Gợi ý thị trường EU')}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {tr('Nhập tên sản phẩm để xem nước EU nhập khẩu nhiều, tăng trưởng tốt và nơi hàng Việt Nam còn dư địa — tính từ thống kê hải quan EU (Eurostat).')}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void search(query);
        }}
        className="mt-6 flex flex-col gap-3 sm:flex-row"
      >
        <label htmlFor="market-q" className="sr-only">
          {tr('Sản phẩm')}
        </label>
        <input
          id="market-q"
          value={query}
          maxLength={100}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr('hạt điều, tiêu, cá tra…')}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]"
        />
        <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#083832] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          <Search className="h-4 w-4" aria-hidden="true" />
          {tr(busy ? 'Đang phân tích…' : 'Xem gợi ý')}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_PRODUCTS.map((p) => (
          <button key={p} type="button" onClick={() => void search(p)} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            {tr(p)}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr(error)}
        </p>
      )}

      {data?.status === 'no_data' && (
        <p role="status" className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          {tr(data.family ? 'Chưa có thống kê đã nạp cho nhóm sản phẩm này.' : 'Chưa nhận ra sản phẩm này. Thử một nhóm có sẵn:')}{' '}
          {!data.family && data.suggestions?.map((s) => (language === 'en' ? s.name_en : s.name_vi)).join(', ')}
        </p>
      )}

      {data?.status === 'ok' && (
        <div className="mt-8 space-y-8" data-testid="market-results">
          <p className="text-sm text-slate-700">
            <strong>{familyName}</strong> · {tr('Năm')} {data.year} · {data.family?.products.map((c) => `HS ${c}`).join(', ')}
          </p>
          <section aria-label={tr('Thị trường tiêu thụ chính')}>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <TrendingUp className="h-5 w-5 text-emerald-700" aria-hidden="true" />
              {tr('Thị trường tiêu thụ chính')}
            </h2>
            <ol className="mt-3 grid gap-3 md:grid-cols-3">
              {data.top_markets.map((m, i) => (
                <MarketCard key={m.country} market={m} rank={i + 1} tone="main" />
              ))}
            </ol>
          </section>
          {data.potential_markets.length > 0 && (
            <section aria-label={tr('Thị trường tiềm năng')}>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Target className="h-5 w-5 text-sky-700" aria-hidden="true" />
                {tr('Thị trường tiềm năng')}
              </h2>
              <ol className="mt-3 grid gap-3 md:grid-cols-2">
                {data.potential_markets.map((m, i) => (
                  <MarketCard key={m.country} market={m} rank={i + 1} tone="potential" />
                ))}
              </ol>
            </section>
          )}
          <section aria-label={tr('Biểu đồ nhập khẩu')}>
            <ImportBarChart top={data.top_markets} potential={data.potential_markets} />
          </section>
          {data.competitors.length > 0 && (
            <section aria-label={tr('Đối thủ cạnh tranh')}>
              <h2 className="text-lg font-bold text-slate-900">{tr('Nguồn cung ngoài EU vào EU')}</h2>
              <p className="mt-1 text-xs text-slate-600">
                {data.vn_rank ? tr(`Việt Nam đứng thứ ${data.vn_rank}`) : tr('Việt Nam chưa có trong nhóm nguồn cung')}
                {data.vn_extra_eu_share ? ` · ${percentOf(data.vn_extra_eu_share, language)}` : ''}
                {data.hhi ? ` · HHI ${Number(data.hhi).toFixed(0)}` : ''}
              </p>
              <div className="mt-3 space-y-4">
                <HhiMeter hhi={data.hhi} />
                <CompetitorCharts competitors={data.competitors} />
              </div>
              <DataTable>
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-600">
                  <tr>
                    <th className="py-2">{tr('Nước cung cấp')}</th>
                    <th className="py-2 text-right">{tr('Trị giá')}</th>
                    <th className="py-2 text-right">{tr('Thị phần')}</th>
                    <th className="py-2 text-right">{tr('Đơn giá (EUR/kg)')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.competitors.map((c) => (
                    <tr key={c.partner} className={`border-t border-slate-100 ${c.partner === 'VN' ? 'font-bold text-[#083832]' : ''}`}>
                      <td className="py-2">{regionName(c.partner, language)}</td>
                      <td className="py-2 text-right">{eurCompact(c.value, language)}</td>
                      <td className="py-2 text-right">{percentOf(c.share, language)}</td>
                      <td className="py-2 text-right">{c.unit_price ? Number(c.unit_price).toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </DataTable>
            </section>
          )}
          <section aria-label={tr('So sánh các nước')}>
            <h2 className="text-lg font-bold text-slate-900">{tr('So sánh các nước')}</h2>
            <div className="mt-3">
              <CountryCompareChart countries={data.countries.slice(0, 10)} />
            </div>
            <DataTable>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="text-xs text-slate-600">
                  <tr>
                    <th className="py-2">{tr('Nước')}</th>
                    <th className="py-2 text-right">{tr('Nhập khẩu')}</th>
                    <th className="py-2 text-right">{tr('Tăng trưởng/năm')}</th>
                    <th className="py-2 text-right">{tr('Thị phần Việt Nam')}</th>
                    <th className="py-2 text-right">{tr('Đơn giá hàng VN (EUR/kg)')}</th>
                    <th className="py-2 text-right">{tr('Điểm')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.countries.slice(0, 10).map((m) => (
                    <tr key={m.country} className="border-t border-slate-100">
                      <td className="py-2">{regionName(m.country, language)}</td>
                      <td className="py-2 text-right">{eurCompact(m.import_value, language)}</td>
                      <td className="py-2 text-right">{m.import_cagr === null ? '—' : percentOf(m.import_cagr, language)}</td>
                      <td className="py-2 text-right">{percentOf(m.vn_share, language)}</td>
                      <td className="py-2 text-right">{m.vn_unit_price ? Number(m.vn_unit_price).toFixed(2) : '—'}</td>
                      <td className="py-2 text-right">{Number(m.score).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </DataTable>
          </section>
          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600" data-testid="market-method">
            {tr('Nguồn')}: {data.source}
            {data.retrieved_at ? ` · ${tr('cập nhật')} ${new Date(data.retrieved_at).toLocaleDateString(language === 'en' ? 'en-GB' : 'vi-VN')}` : ''}.{' '}
            {tr('Điểm tổng hợp quy mô, tăng trưởng, thị phần và tăng trưởng của hàng Việt Nam; nhóm xét là 10 nước nhập khẩu nhiều nhất. Gợi ý mang tính tham khảo, không thay thế nghiên cứu thị trường.')}
          </p>
          <Link href="/tools/tariff" className="inline-block text-sm font-semibold text-teal-800 underline">
            {tr('Tính thuế nhập khẩu cho sản phẩm này')}
          </Link>
        </div>
      )}
    </div>
  );
}
