'use client';

// Ô chọn mã HS có gợi ý (B4). Dùng chung cho sản phẩm, máy tính thuế/xuất xứ, bộ lọc danh bạ.
import React, { useEffect, useId, useState } from 'react';
import { createApiClient } from '../lib/api/client';
import type { components } from '../lib/api/schema';
import { useLanguage } from '../context/LanguageContext';

export type HsCodeOption = components['schemas']['HsCodeOut'];

const DEBOUNCE_MS = 250;
type Status = 'idle' | 'loading' | 'ready' | 'error';

interface HsCodePickerProps {
  /** Nhãn hiển thị (đã dịch bởi nơi gọi). */
  label: string;
  value: HsCodeOption | null;
  onChange: (value: HsCodeOption | null) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function HsCodePicker({ label, value, onChange, required, disabled, className }: HsCodePickerProps) {
  const { tr, language } = useLanguage();
  const uid = useId();
  const listId = `${uid}-list`;
  const nameOf = (hs: HsCodeOption) => (language === 'en' ? hs.name_en : hs.name_vi);
  const display = (hs: HsCodeOption) => `${hs.formatted} — ${nameOf(hs)}`;

  const [text, setText] = useState(value ? display(value) : '');
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<HsCodeOption[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // Lấy gợi ý sau khi ngừng gõ; kết quả của lần gõ cũ bị bỏ (cancelled) để không ghi đè lần mới.
  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setStatus('loading');
      try {
        const { data, response } = await createApiClient().GET('/api/public/hs-codes', {
          params: { query: { q: query } },
        });
        if (cancelled) return;
        if (!response.ok || !data) throw new Error('bad response');
        setOptions(data);
        setActive(-1);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function handleInput(next: string) {
    setText(next);
    if (value) onChange(null); // sửa chữ = bỏ lựa chọn cũ
    const trimmed = next.trim();
    setQuery(trimmed);
    if (trimmed) {
      setOpen(true);
    } else {
      setOpen(false);
      setOptions([]);
      setStatus('idle');
    }
  }

  function choose(hs: HsCodeOption) {
    setText(display(hs));
    setQuery('');
    setOptions([]);
    setStatus('idle');
    setOpen(false);
    onChange(hs);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
    } else if (event.key === 'ArrowDown' && options.length) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === 'ArrowUp' && options.length) {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open && active >= 0) {
      event.preventDefault();
      choose(options[active]);
    }
  }

  const showList = open && status === 'ready' && options.length > 0;
  const optionId = (hs: HsCodeOption) => `${uid}-${hs.code}`;

  return (
    <div className={`relative ${className ?? ''}`}>
      <label htmlFor={`${uid}-input`} className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        id={`${uid}-input`}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? optionId(options[active]) : undefined}
        autoComplete="off"
        required={required}
        disabled={disabled}
        value={text}
        onChange={(event) => handleInput(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tr('Gõ tên sản phẩm hoặc mã HS, ví dụ: gạo, rice, 1006')}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832] disabled:opacity-60"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {options.map((hs, index) => (
            <li
              key={hs.code}
              id={optionId(hs)}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(hs)}
              className={`flex cursor-pointer items-start justify-between gap-3 px-4 py-2 text-sm ${
                index === active ? 'bg-teal-50' : 'hover:bg-slate-50'
              }`}
            >
              <span>
                <span className="font-semibold text-slate-900">{hs.formatted}</span>
                <span className="ml-2 text-slate-700">{nameOf(hs)}</span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  hs.supported ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-900'
                }`}
              >
                {tr(hs.supported ? 'Đã hỗ trợ máy tính' : 'Chưa hỗ trợ máy tính')}
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && status === 'ready' && options.length === 0 && (
        <p role="status" className="mt-2 text-xs text-slate-600">
          {tr('Không tìm thấy mã HS phù hợp')}
        </p>
      )}
      {open && status === 'error' && (
        <p role="alert" className="mt-2 text-xs text-rose-700">
          {tr('Không tải được danh sách mã HS. Vui lòng thử lại.')}
        </p>
      )}
    </div>
  );
}
