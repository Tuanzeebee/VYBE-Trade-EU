'use client';

// Cột giới thiệu bên trái của onboarding — dùng chung cho seller và buyer (chỉ trình bày).
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface OnboardingBenefit {
  icon: LucideIcon;
  title: string;
  text: string;
}

export function OnboardingAside({
  kicker,
  heading,
  description,
  benefits,
}: {
  kicker: string;
  heading: React.ReactNode;
  description: React.ReactNode;
  benefits: OnboardingBenefit[];
}) {
  const { tr } = useLanguage();
  return (
    <aside className="lg:col-span-5 relative">
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-64 h-64 opacity-15 pointer-events-none select-none" aria-hidden="true">
        <svg viewBox="0 0 200 200" className="w-full h-full text-teal-800" fill="currentColor">
          <path d="M 40 40 Q 90 20 130 50 Q 150 80 120 110 Q 70 120 40 40 Z" opacity="0.4" />
          <path d="M 80 120 Q 120 100 160 140 Q 130 180 90 170 Q 70 140 80 120 Z" opacity="0.3" />
        </svg>
      </div>
      <div className="relative">
        <div className="inline-flex items-center gap-2 mb-4 select-none">
          <span className="w-4 h-4 rounded-full bg-[#0d9488]/15 flex items-center justify-center" aria-hidden="true">
            <span className="w-2 h-0.5 rounded-full bg-[#0d9488]" />
          </span>
          <span className="text-[11px] sm:text-xs font-bold text-[#0d9488] tracking-widest uppercase">{tr(kicker)}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-slate-900 tracking-tight leading-[1.2] mb-3">{heading}</h1>
        <p className="text-slate-600 text-sm sm:text-[15px] leading-relaxed max-w-md mb-8 sm:mb-10 font-normal">{description}</p>
        <div className="space-y-5 select-none">
          {benefits.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center shrink-0 text-slate-800">
                <Icon className="w-5 h-5 stroke-[1.8]" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-snug">{tr(title)}</h2>
                <p className="text-xs text-slate-500 mt-0.5 font-normal">{tr(text)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
