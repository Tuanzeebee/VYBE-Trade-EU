'use client';
import React, { useState } from 'react';
import { ChevronDown, Globe, Sparkles } from 'lucide-react';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';
import CountryFlag from './CountryFlag';
import LanguageSelectorModal from './LanguageSelectorModal';

/** Chọn ngôn ngữ giao diện (cờ + danh sách + modal chi tiết). Dùng chung cho landing, onboarding và workspace. */
export default function LanguageSelect() {
  const { tr, language, setLanguage, t } = useLanguage();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  return (
    <>
    <div className="relative">
      <button 
        onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
        aria-expanded={isLangMenuOpen}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 text-slate-700 hover:text-slate-900 transition-all rounded-full hover:bg-slate-50 border border-slate-200 bg-white cursor-pointer shadow-2xs group"
        title={tr(t.header.languageSelect)}
      >
        <div className="w-4.5 h-3 rounded-[2px] overflow-hidden border border-slate-200/80 shadow-2xs shrink-0 flex items-center justify-center">
          <CountryFlag code={language} className="w-full h-full" />
        </div>
        <span className="text-[11px] font-bold uppercase text-slate-700 tracking-wider leading-none">
          {tr(language)}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-transform duration-150 shrink-0 ${isLangMenuOpen ? 'rotate-180 text-slate-600' : ''}`} />
      </button>

      {/* Quick Language Dropdown Menu */}
      {isLangMenuOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-left">
          <div className="px-3.5 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>{tr(t.header.languageSelect)}</span>
            <Globe className="w-3.5 h-3.5 text-blue-600" />
          </div>
          {LANGUAGES.map((lang) => {
            const isCurrent = language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsLangMenuOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                  isCurrent ? 'bg-blue-50/70 text-blue-900 font-bold' : 'text-slate-700 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-4 rounded-xs overflow-hidden border border-slate-200/60 shadow-2xs shrink-0 flex items-center justify-center">
                    <CountryFlag code={lang.code} className="w-full h-full" />
                  </div>
                  <div className="text-left">
                    <span className="block leading-tight">{lang.nativeName}</span>
                    <span className="text-[10px] text-slate-400 block">{tr(lang.country)}</span>
                  </div>
                </div>
                {isCurrent && (
                  <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></div>
                )}
              </button>
            );
          })}

          <div className="pt-2 mt-1 border-t border-slate-100 px-2">
            <button
              onClick={() => {
                setIsLangMenuOpen(false);
                setIsLangModalOpen(true);
              }}
              className="w-full py-1.5 px-2 rounded-xl text-[11px] text-blue-600 hover:bg-blue-50 font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>{tr(language === 'vi' ? 'Xem cờ & chi tiết ngôn ngữ' : language === 'fr' ? 'Détails des langues & drapeaux' : language === 'ja' ? '言語と国旗の詳細一覧' : 'View all flags & languages')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
      <LanguageSelectorModal isOpen={isLangModalOpen} onClose={() => setIsLangModalOpen(false)} />
    </>
  );
}
