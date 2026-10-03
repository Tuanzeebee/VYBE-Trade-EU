'use client';

// Thanh tiến trình các bước onboarding — dùng chung cho seller và buyer. Markup truy cập được:
// nav > ol > button, aria-current="step"; bước đã qua hiện dấu tích.
import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export function OnboardingStepper({
  steps,
  current,
  onSelect,
  allowFutureJump = false,
  label = 'Tiến trình Company Onboarding',
}: {
  steps: string[];
  /** Bước hiện tại, đếm từ 1. */
  current: number;
  onSelect: (step: number) => void;
  /** Cho bấm sang bước phía trước chưa tới (seller); mặc định chỉ được quay lại. */
  allowFutureJump?: boolean;
  label?: string;
}) {
  const { tr } = useLanguage();
  return (
    <nav aria-label={tr(label)} className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pt-6 sm:pt-8 pb-4">
      <ol className="flex items-center justify-center flex-wrap gap-3 sm:gap-6 lg:gap-8 select-none">
        {steps.map((name, index) => {
          const n = index + 1;
          const active = current === n;
          const done = current > n;
          return (
            <React.Fragment key={name}>
              {index > 0 && (
                <li aria-hidden="true" className="hidden sm:flex text-slate-300">
                  <ArrowRight className="w-3.5 h-3.5" />
                </li>
              )}
              <li>
                <button
                  type="button"
                  disabled={!allowFutureJump && n > current}
                  aria-current={active ? 'step' : undefined}
                  onClick={() => onSelect(n)}
                  className="flex items-center gap-2.5 pb-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      active ? 'bg-[#083832] text-white' : done ? 'bg-emerald-600 text-white' : 'bg-slate-100 border border-slate-200 text-slate-500'
                    }`}
                  >
                    {done ? <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" /> : n}
                  </span>
                  <span className={`text-xs sm:text-[13px] ${active ? 'font-bold text-slate-900 border-b-2 border-[#083832] pb-0.5' : 'font-medium text-slate-500'}`}>
                    {tr(name)}
                  </span>
                </button>
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
