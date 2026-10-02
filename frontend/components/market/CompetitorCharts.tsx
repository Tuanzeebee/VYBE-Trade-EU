'use client';

// Nguồn cung ngoài EU vào EU: thị phần (Việt Nam tô nổi bật) và đơn giá EUR/kg. Nước thiếu đơn giá bị bỏ
// khỏi biểu đồ đơn giá và được ghi chú, không vẽ thành 0.
import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLanguage } from '../../context/LanguageContext';
import { eurCompact, percentOf, regionName, type MarketRecommendation } from '../../lib/marketInsightsApi';
import { AXIS_TICK, ChartFrame, COLORS, num, RowTooltip } from './chartKit';

type Competitor = MarketRecommendation['competitors'][number];

interface Row {
  partner: string;
  name: string;
  share: number;
  shareText: string;
  value: string;
  price: number | null;
  isVn: boolean;
}

const fill = (isVn: boolean) => (isVn ? COLORS.vn : COLORS.other);

export function CompetitorCharts({ competitors }: { competitors: Competitor[] }) {
  const { tr, language } = useLanguage();
  const rows: Row[] = competitors.flatMap((c) => {
    const share = num(c.share);
    return share === null
      ? []
      : [{ partner: c.partner, name: regionName(c.partner, language), share, shareText: percentOf(c.share, language), value: c.value, price: num(c.unit_price), isVn: c.partner === 'VN' }];
  });
  if (rows.length === 0) return null;
  const priced = rows.filter((r) => r.price !== null);
  const missing = rows.filter((r) => r.price === null).map((r) => r.name);
  const tip = (p: unknown) => (
    <RowTooltip<Row>
      {...(p as { active?: boolean; payload?: { payload?: Row }[] })}
      title={(r) => r.name}
      lines={(r) => [
        [tr('Trị giá'), eurCompact(r.value, language)],
        [tr('Thị phần'), r.shareText],
        [tr('Đơn giá (EUR/kg)'), r.price === null ? '—' : r.price.toFixed(2)],
      ]}
    />
  );
  const legend = [
    { color: COLORS.vn, label: tr('Việt Nam') },
    { color: COLORS.other, label: tr('Nước khác') },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ChartFrame
        title={tr('Thị phần nguồn cung ngoài EU')}
        summary={`${tr('Biểu đồ cột: thị phần theo nước cung cấp')}. ${rows.map((r) => `${r.name} ${r.shareText}`).join('; ')}`}
        height={Math.max(180, rows.length * 40 + 40)}
        legend={legend}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 52, bottom: 4, left: 8 }}>
            <CartesianGrid horizontal={false} stroke={COLORS.grid} />
            <XAxis type="number" domain={[0, 1]} tickFormatter={(v: number) => percentOf(v, language)} tick={AXIS_TICK} />
            <YAxis type="category" dataKey="name" width={84} tick={AXIS_TICK} interval={0} />
            <Tooltip cursor={{ fill: '#f1f5f9' }} content={tip} />
            <Bar dataKey="share" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.partner} fill={fill(r.isVn)} />
              ))}
              <LabelList dataKey="share" position="right" formatter={(v: unknown) => percentOf(Number(v), language)} fill={COLORS.text} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      {priced.length > 0 ? (
        <ChartFrame
          title={tr('Đơn giá nhập khẩu (EUR/kg)')}
          summary={`${tr('Biểu đồ cột: đơn giá theo nước cung cấp')}. ${priced.map((r) => `${r.name} ${(r.price as number).toFixed(2)}`).join('; ')}`}
          height={Math.max(180, priced.length * 40 + 40)}
          legend={legend}
          note={missing.length > 0 ? `${tr('Chưa có đơn giá')}: ${missing.join(', ')}` : undefined}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priced} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 8 }}>
              <CartesianGrid horizontal={false} stroke={COLORS.grid} />
              <XAxis type="number" tick={AXIS_TICK} />
              <YAxis type="category" dataKey="name" width={84} tick={AXIS_TICK} interval={0} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} content={tip} />
              <Bar dataKey="price" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {priced.map((r) => (
                  <Cell key={r.partner} fill={fill(r.isVn)} />
                ))}
                <LabelList dataKey="price" position="right" formatter={(v: unknown) => Number(v).toFixed(2)} fill={COLORS.text} fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      ) : (
        <p role="status" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
          {tr('Chưa có đơn giá của các nước cung cấp để vẽ biểu đồ.')}
        </p>
      )}
    </div>
  );
}
