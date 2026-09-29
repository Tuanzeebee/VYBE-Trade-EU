import rawCatalog from './catalog.json';

export type Locale = 'vi' | 'en' | 'fr' | 'ja';
export const LOCALES = { vi: 'vi-VN', en: 'en-US', fr: 'fr-FR', ja: 'ja-JP' };
const catalog: Record<string, string[]> = rawCatalog;
const index = { en: 0, fr: 1, ja: 2 } as const;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = Object.entries(catalog).filter(([source]) => /\{\d+\}/.test(source) && source.replace(/\{\d+\}/g, '').trim().length > 3)
  .map(([source, values]) => ({ values, keys: [...source.matchAll(/\{(\d+)\}/g)].map((match) => match[1]),
    regex: new RegExp('^' + source.split(/(\{\d+\})/).map((part) => /^\{\d+\}$/.test(part) ? '(.*?)' : escape(part)).join('') + '$') }));

export function translateText<T>(value: T, language: Locale): T {
  if (language === 'vi' || typeof value !== 'string') return value;
  const source = value.replace(/\s+/g, ' ').trim();
  const exact = catalog[source]?.[index[language]];
  if (exact) return (value.match(/^\s*/)?.[0] + exact + value.match(/\s*$/)?.[0]) as T;
  for (const pattern of patterns) {
    const match = source.match(pattern.regex);
    if (!match) continue;
    const params = Object.fromEntries(pattern.keys.map((key, position) => [key, translateText(match[position + 1], language)]));
    return pattern.values[index[language]].replace(/\{(\d+)\}/g, (_, key) => params[key] ?? '') as T;
  }
  const parts = value.split(/(, | \/ | • )/);
  if (parts.length > 1) return parts.map((part) => /^(, | \/ | • )$/.test(part) ? part : translateText(part, language)).join('') as T;
  return value;
}
