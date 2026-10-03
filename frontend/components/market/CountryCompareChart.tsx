'use client';

// So sánh các nước: cột theo tiêu chí chọn được (nhập khẩu, tăng trưởng, thị phần Việt Nam, điểm) và
// biểu đồ bong bóng quy mô – tăng trưởng (cỡ bong bóng = thị phần Việt Nam). Nước thiếu số liệu cho một
// tiêu chí bị bỏ khỏi biểu đồ và được ghi chú; không vẽ thành 0.
import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { useLanguage } from '../../context/LanguageContext';
import { eurCompact, percentOf, regionName, type MarketItem } from '../../lib/marketInsightsApi';
import { AXIS_TICK, ChartFrame, COLORS, num, RowTooltip } from './chartKit';

type Metric = 'import_value' | 'import_cagr' | 'vn_share' | 'score';
const METRICS: { key: Metric; label: string }[] = [
  { key: 'import_value', label: 'Nhập khẩu' },
  { key: 'import_cagr', label: 'Tăng trưởng/năm' },
  { key: 'vn_share', label: 'Thị phần Việt Nam' },
  { key: 'score', label: 'Điểm' },
];

interface Row {
  country: string;
  name: string;
  value: number;
  importValue: number;
  cagr: number | null;
  vnShare: number | null;
  score: number | null;
}

interface Bubble {
  name: string;
  x: number;
  y: number;
  z: number;
}

export function CountryCompareChart({ countries }: { countries: MarketItem[] }) {
  const { tr, language } = useLanguage();
  const [metric, setMetric] = useState<Metric>('import_value');

  const fmt = (m: Metric, v: number) =>
    m === 'import_value' ? eurCompact(v, language) : m === 'score' ? v.toFixed(1) : percentOf(v, language);
  const pick = (c: MarketItem, m: Metric) => num(m === 'score' ? c.score : c[m]);

  const all = countries.map((c) => ({ c, name: regionName(c.country, language) }));
  const rows: Row[] = all
    .flatMap(({ c, name }) => {
      const value = pick(c, metric);
      const importValue = num(c.import_value);
      return value === null || importValue === null
        ? []
        : [{ country: c.country, name, value, importValue, cagr: num(c.import_cagr), vnShare: num(c.vn_share), score: num(c.score) }];
    })
    .sort((a, b) => b.value - a.value);
  const omitted = all.filter(({ c }) => pick(c, metric) === null).map(({ name }) => name);

  const bubbles: Bubble[] = all.flatMap(({ c, name }) => {
    const x = num(c.import_value);
    const y = num(c.import_cagr);
    const z = num(c.vn_share);
    return x === null || y === null ? [] : [{ name, x, y, z: z ?? 0 }];
  });

  if (rows.length === 0 && bubbles.length === 0) {
    return (
      <p role="status" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
        {tr('Chưa đủ số liệu để vẽ biểu đồ so sánh.')}
      </p>
    );
  }
  const label = tr(METRICS.find((m) => m.key === metric)?.label ?? '');
  const tip = (p: unknown) => (
    <RowTooltip<Row>
      {...(p as { active?: boolean; payload?: { payload?: Row }[] })}
      title={(r) => r.name}
      lines={(r) => [
        [tr('Nhập khẩu'), eurCompact(r.importValue, language)],
        [tr('Tăng trưởng/năm'), r.cagr === null ? '—' : percentOf(r.cagr, language)],
        [tr('Thị phần Việt Nam'), r.vnShare === null ? '—' : percentOf(r.vnShare, language)],
        [tr('Điểm'), r.score === null ? '—' : r.score.toFixed(1)],
      ]}
    />
  );

  const selector = (
    <div className="flex items-center gap-2">
      <label htmlFor="market-metric" className="text-xs font-semibold text-slate-700">
        {tr('Xếp theo')}
      </label>
      <select
        id="market-metric"
        value={metric}
        onChange={(e) => setMetric(e.target.value as Metric)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
      >
        {METRICS.map((m) => (
          <option key={m.key} value={m.key}>
            {tr(m.label)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-4">
      {selector}
      {rows.length > 0 && (
        <ChartFrame
          title={`${tr('Xếp theo')}: ${label}`}
          summary={`${tr('Biểu đồ cột')} ${label}. ${rows.map((r) => `${r.name} ${fmt(metric, r.value)}`).join('; ')}`}
          height={Math.max(200, rows.length * 36 + 40)}
          note={omitted.length > 0 ? `${tr('Chưa có số liệu')}: ${omitted.join(', ')}` : undefined}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 8 }}>
              <CartesianGrid horizontal={false} stroke={COLORS.grid} />
              <XAxis type="number" tickFormatter={(v: number) => fmt(metric, v)} tick={AXIS_TICK} />
              <YAxis type="category" dataKey="name" width={96} tick={AXIS_TICK} interval={0} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} content={tip} />
              <Bar dataKey="value" fill={COLORS.main} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                <LabelList dataKey="value" position="right" formatter={(v: unknown) => fmt(metric, Number(v))} fill={COLORS.text} fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      )}
      {bubbles.length > 0 && (
        <ChartFrame
          title={tr('Quy mô và tăng trưởng nhập khẩu')}
          summary={`${tr('Biểu đồ bong bóng: trị giá nhập khẩu và tăng trưởng/năm, cỡ bong bóng là thị phần Việt Nam')}. ${bubbles.map((b) => `${b.name}: ${eurCompact(b.x, language)}, ${percentOf(b.y, language)}`).join('; ')}`}
          height={320}
          note={tr('Cỡ bong bóng = thị phần Việt Nam. Nước chưa có số liệu tăng trưởng không hiện.')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 16, right: 24, bottom: 28, left: 8 }}>
              <CartesianGrid stroke={COLORS.grid} />
              <XAxis
                type="number"
                dataKey="x"
                name={tr('Nhập khẩu')}
                tickFormatter={(v: number) => eurCompact(v, language)}
                tick={AXIS_TICK}
                label={{ value: tr('Trị giá nhập khẩu'), position: 'insideBottom', offset: -12, fill: COLORS.text, fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={tr('Tăng trưởng/năm')}
                tickFormatter={(v: number) => percentOf(v, language)}
                tick={AXIS_TICK}
                width={56}
              />
              <ZAxis type="number" dataKey="z" range={[70, 420]} name={tr('Thị phần Việt Nam')} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={(p) => (
                  <RowTooltip<Bubble>
                    {...(p as unknown as { active?: boolean; payload?: { payload?: Bubble }[] })}
                    title={(b) => b.name}
                    lines={(b) => [
                      [tr('Nhập khẩu'), eurCompact(b.x, language)],
                      [tr('Tăng trưởng/năm'), percentOf(b.y, language)],
                      [tr('Thị phần Việt Nam'), percentOf(b.z, language)],
                    ]}
                  />
                )}
              />
              <Scatter data={bubbles} fill={COLORS.potential} fillOpacity={0.65} isAnimationActive={false}>
                <LabelList dataKey="name" position="top" fill={COLORS.text} fontSize={11} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ChartFrame>
      )}
    </div>
  );
}
