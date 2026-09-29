import { describe, expect, it } from 'vitest';
import catalog from '../i18n/catalog.json';
import { findHardcoded, findMissing } from '../scripts/check-i18n.mjs';

describe('Song ngữ toàn hệ thống (A3)', () => {
  it('mọi chuỗi tiếng Việt trong tr() đều có bản dịch tiếng Anh', () => {
    const missing: { file: string; text: string }[] = findMissing(catalog);
    expect(missing.map((m) => `${m.file}: ${m.text}`)).toEqual([]);
  });

  it('không còn chuỗi tiếng Việt viết thẳng trong JSX', () => {
    const hardcoded: { file: string; text: string }[] = findHardcoded();
    expect(hardcoded.map((h) => `${h.file}: ${h.text}`)).toEqual([]);
  });

  it('bộ kiểm bắt được chuỗi thiếu bản dịch', () => {
    const withoutOne = { ...catalog } as Record<string, string[]>;
    delete withoutOne['Đăng nhập'];
    const missing: { file: string; text: string }[] = findMissing(withoutOne);
    expect(missing.some((m) => m.text === 'Đăng nhập')).toBe(true);
  });

  it('bản dịch trùng chữ gốc bị coi là chưa dịch', () => {
    const untranslated = { ...catalog, 'Đăng nhập': ['Đăng nhập', 'x', 'x'] } as Record<string, string[]>;
    const missing: { file: string; text: string }[] = findMissing(untranslated);
    expect(missing.some((m) => m.text === 'Đăng nhập')).toBe(true);
  });
});
