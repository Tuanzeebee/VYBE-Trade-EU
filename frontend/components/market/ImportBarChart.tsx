'use client';

// Trị giá nhập khẩu của các nước được gợi ý: nhóm thị trường chính (top 3) và thị trường tiềm năng.
// Số liệu từ Eurostat qua API; chỉ vẽ nước có trị giá hợp lệ.
import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLanguage } from '../../context/LanguageContext';
import { eurCompact, percentOf, regionName, type MarketItem } from '../../lib/marketInsightsApi';
import { AXIS_TICK, ChartFrame, COLORS, num, RowTooltip } from './chartKit';

interface Row {
  country: string;
  name: string;
  value: number;
  group: 'main' | 'potential';
  vnShare: string;
  cagr: string | null;
}

export function ImportBarChart({ top, potential }: { top: MarketItem[]; potential: MarketItem[] }) {
  const { tr, language } = useLanguage();
  const toRows = (items: MarketItem[], group: Row['group']): Row[] =>
    items.flatMap((m) => {
      const value = num(m.import_value);
      return value === null
        ? []
        : [{ country: m.country, name: regionName(m.country, language), value, group, vnShare: m.vn_share, cagr: m.import_cagr ?? null }];
    });
  const rows = [...toRows(top, 'main'), ...toRows(potential, 'potential')];
  if (rows.length === 0) return null;

  const summary = `${tr('Biểu đồ cột: trị giá nhập khẩu theo nước')}. ${rows.map((r) => `${r.name} ${eurCompact(r.value, language)}`).join('; ')}`;
  return (
    <ChartFrame
      title={tr('Quy mô nhập khẩu theo nước')}
      summary={summary}
      height={Math.max(180, rows.length * 44 + 40)}
      legend={[
        { color: COLORS.main, label: tr('Thị trường tiêu thụ chính') },
        ...(potential.length > 0 ? [{ color: COLORS.potential, label: tr('Thị trường tiềm năng') }] : []),
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 8 }}>
          <CartesianGrid horizontal={false} stroke={COLORS.grid} />
          <XAxis type="number" tickFormatter={(v: number) => eurCompact(v, language)} tick={AXIS_TICK} />
          <YAxis type="category" dataKey="name" width={96} tick={AXIS_TICK} interval={0} />
          <Tooltip
            cursor={{ fill: '#f1f5f9' }}
            content={(p) => (
              <RowTooltip<Row>
                {...(p as unknown as { active?: boolean; payload?: { payload?: Row }[] })}
                title={(r) => r.name}
                lines={(r) => [
                  [tr('Nhập khẩu'), eurCompact(r.value, language)],
                  [tr('Thị phần Việt Nam'), percentOf(r.vnShare, language)],
                  ...(r.cagr === null ? [] : ([[tr('Tăng trưởng/năm'), percentOf(r.cagr, language)]] as [string, string][])),
                ]}
              />
            )}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.country} fill={r.group === 'main' ? COLORS.main : COLORS.potential} />
            ))}
            <LabelList dataKey="value" position="right" formatter={(v: unknown) => eurCompact(Number(v), language)} fill={COLORS.text} fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
