import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', 'components');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.tsx') ? [full] : [];
  });
}

const sources = walk(root).map((f) => [f.slice(root.length + 1), readFileSync(f, 'utf8')] as const);

describe('nhãn hiển thị (N2)', () => {
  it('không còn "Trợ lý AI tuân thủ" hay "Công cụ tuân thủ" trong component', () => {
    for (const [name, src] of sources) {
      expect(src, name).not.toMatch(/Trợ lý AI tuân thủ|Công cụ tuân thủ/);
    }
  });

  it('không còn chữ "RFQ" trong chuỗi hiển thị', () => {
    for (const [name, src] of sources) {
      const shown = [...src.matchAll(/tr\((["'`])([^"'`]*)\1/g)].map((m) => m[2]);
      expect(
        shown.filter((s) => /\bRFQ\b/.test(s)),
        name,
      ).toEqual([]);
    }
  });

  it('trang chủ không còn "Hỗ trợ bởi AI"', () => {
    const lang = readFileSync(join(__dirname, '..', 'context', 'LanguageContext.tsx'), 'utf8');
    expect(lang).not.toMatch(/Hỗ trợ bởi AI|AI-Powered/);
    // Cả bản fr và ja của thẻ tính năng cũng không còn chữ AI/IA.
    expect(lang).not.toMatch(/Propulsé par l’IA|AI搭載/);
  });
});
