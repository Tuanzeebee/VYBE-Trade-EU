'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Check, Globe, Sparkles } from 'lucide-react';
import { useLanguage, LANGUAGES, LanguageCode } from '../context/LanguageContext.tsx';
import CountryFlag from './CountryFlag.tsx';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LanguageSelectorModal({ isOpen, onClose }: LanguageSelectorModalProps) {
  const { tr, language, setLanguage, t } = useLanguage();

  if (!isOpen) return null;

  const handleSelectLanguage = (code: LanguageCode) => {
    setLanguage(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-left">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Globe className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              {tr(t.header.languageSelect)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {tr("Choose your preferred language / Choisissez votre langue / 言語を選択")}</p>
          </div>
        </div>

        {/* Language Options List */}
        <div className="space-y-2.5 mb-6">
          {LANGUAGES.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelectLanguage(lang.code)}
                className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left cursor-pointer group ${
                  isSelected 
                    ? 'bg-blue-50/80 border-blue-400/90 shadow-2xs' 
                    : 'bg-white hover:bg-slate-50/80 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {/* Flag Icon */}
                  <div className="w-8 h-5.5 rounded-md overflow-hidden flex items-center justify-center shadow-xs border border-slate-200/60">
                    <CountryFlag code={lang.code} className="w-full h-full" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                        {lang.nativeName}
                      </span>
                      <span className="text-xs text-slate-400 font-normal">
                        {tr("(")}{tr(lang.name)}{tr(")")}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {tr(lang.country)}
                    </span>
                  </div>
                </div>

                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 group-hover:text-blue-600 font-medium">
                    {tr(language === 'vi' ? 'Chọn' : language === 'fr' ? 'Choisir' : language === 'ja' ? '選択' : 'Select')}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Note / Tip */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-600 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            {tr(language === 'vi'
              ? 'Hệ thống tự động lưu tùy chọn ngôn ngữ cho các phiên làm việc tiếp theo.'
              : language === 'fr'
              ? 'La plateforme enregistre automatiquement votre langue pour vos prochaines visites.'
              : language === 'ja'
              ? '選択した言語はブラウザに自動保存され、次回訪問時にも適用されます。'
              : 'The platform automatically remembers your language preference across sessions.')}
          </span>
        </div>

      </div>
    </div>
  );
}
