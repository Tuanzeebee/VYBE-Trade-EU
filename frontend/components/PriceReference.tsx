'use client';

// Giá tham khảo nhập khẩu EU (U17) trong form sản phẩm: đơn giá EUR/kg từ Việt Nam, trung bình ngoài EU
// và vài đối thủ, năm gần nhất (Eurostat). CHỈ THAM KHẢO — không phải giá sàn hay giá chống bán phá giá.
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { createApiClient } from '../lib/api/client';
import type { components } from '../lib/api/schema';
import { regionName } from '../lib/marketInsightsApi';

type PriceReferenceData = components['schemas']['PriceReferenceOut'];

async function fetchPriceReference(hs: string): Promise<PriceReferenceData | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/public/markets/price-reference', { params: { query: { hs } } });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export default function PriceReference({ hsCode }: { hsCode: string }) {
  const { tr, language } = useLanguage();
  const [data, setData] = useState<PriceReferenceData | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    if (!/^[0-9]{6,8}$/.test(hsCode)) return;
    void fetchPriceReference(hsCode).then((result) => {
      if (active) setData(result);
    });
    return () => {
      active = false;
    };
  }, [hsCode]);

  if (!data || data.status !== 'ok') return null;
  const price = (value: string) => `${Number(value).toFixed(2)} EUR/kg`;
  return (
    <div role="note" data-testid="price-reference" className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
      <p className="font-semibold text-slate-900">{tr(`Giá tham khảo nhập khẩu EU năm ${data.year}`)}</p>
      <ul className="mt-1 space-y-0.5">
        {data.vietnam && (
          <li>
            {tr('Từ Việt Nam')}: <strong>{price(data.vietnam.unit_price)}</strong>
          </li>
        )}
        {data.extra_eu_average && (
          <li>
            {tr('Trung bình hàng ngoài EU')}: {price(data.extra_eu_average.unit_price)}
          </li>
        )}
        {(data.competitors ?? []).map((c) => (
          <li key={c.partner}>
            {regionName(c.partner, language)}: {price(c.unit_price)}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-slate-500">
        {tr('Nguồn')}: {data.source}. {tr('Chỉ để tham khảo khi định giá, không phải giá sàn.')}
      </p>
    </div>
  );
}
