'use client';
import { LANGUAGES, useLanguage, type LanguageCode } from '../context/LanguageContext';

export default function LanguageSelect() {
  const { language, setLanguage, t } = useLanguage();
  return <select aria-label={t.header.languageSelect} value={language} onChange={(event) => setLanguage(event.target.value as LanguageCode)} className="max-w-28 rounded-full border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-2 focus:outline-teal-700">
    {LANGUAGES.map((option) => <option key={option.code} value={option.code}>{option.nativeName}</option>)}
  </select>;
}
