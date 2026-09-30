'use client';

// Gõ tên sản phẩm → gợi ý mã HS (U3, demo 30/9: "họ chỉ cần ghi cá tra là ra mã"). Seller vẫn có thể
// tự chọn mã khác ở ô Mã HS; gợi ý chỉ là lối tắt, không tự chọn thay người dùng.
import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { createApiClient } from '../lib/api/client';
import { useLanguage } from '../context/LanguageContext';
import type { HsCodeOption } from './HsCodePicker';

const DEBOUNCE_MS = 400;
const LIMIT = 3;

export default function HsSuggestions({ name, onPick }: { name: string; onPick: (hs: HsCodeOption) => void }) {
  const { tr, language } = useLanguage();
  const [options, setOptions] = useState<HsCodeOption[]>([]);
  const query = name.trim();

  useEffect(() => {
    if (query.length < 2) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { data, response } = await createApiClient().GET('/api/public/hs-codes', { params: { query: { q: query } } });
        if (!cancelled) setOptions(response.ok && data ? data.slice(0, LIMIT) : []);
      } catch {
        if (!cancelled) setOptions([]);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  if (options.length === 0) return null;
  return (
    <div className="rounded-xl bg-teal-50/70 border border-teal-100 p-3" aria-live="polite">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-900 mb-2">
        <Sparkles className="w-3.5 h-3.5" />
        {tr('Gợi ý mã HS theo tên sản phẩm')}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((hs) => (
          <button
            key={hs.code}
            type="button"
            onClick={() => onPick(hs)}
            className="text-left px-3 py-1.5 rounded-lg bg-white border border-teal-200 hover:border-teal-600 text-[11px] text-slate-800 cursor-pointer"
          >
            <span className="font-bold text-teal-900">{hs.formatted}</span> — {language === 'en' ? hs.name_en : hs.name_vi}
          </button>
        ))}
      </div>
    </div>
  );
}
