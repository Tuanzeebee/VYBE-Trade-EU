// Nội dung pháp lý (E4) do PO/luật cung cấp trong content/legal/<trang>.<locale>.md — code KHÔNG tự soạn điều khoản.
// Thiếu file thì trang hiện thông báo "đang hoàn thiện" thay vì bịa nội dung.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type LegalPage = 'terms-buyer' | 'terms-enterprise' | 'privacy';
export type LegalBlock = { kind: 'h1' | 'h2' | 'p'; text: string };

const DEFAULT_DIR = join(process.cwd(), 'content', 'legal');

/** Đọc file .md theo locale, rơi về tiếng Việt; không có file nào → null. */
export function readLegalSource(page: LegalPage, locale: string, dir = DEFAULT_DIR): string | null {
  for (const code of [locale, 'vi']) {
    const path = join(dir, `${page}.${code}.md`);
    if (existsSync(path)) return readFileSync(path, 'utf8');
  }
  return null;
}

/** Markdown tối giản: '# ', '## ' và đoạn văn cách nhau bằng dòng trống. Không diễn giải HTML. */
export function parseLegal(source: string): LegalBlock[] {
  return source
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk): LegalBlock => {
      if (chunk.startsWith('## ')) return { kind: 'h2', text: chunk.slice(3).trim() };
      if (chunk.startsWith('# ')) return { kind: 'h1', text: chunk.slice(2).trim() };
      return { kind: 'p', text: chunk.replace(/\n/g, ' ') };
    });
}
