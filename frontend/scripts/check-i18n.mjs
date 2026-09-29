// Kiểm chuỗi giao diện (A3): mọi chuỗi tiếng Việt truyền vào tr('…') phải có bản dịch trong i18n/catalog.json.
// Chạy: npm run i18n:check  (thoát mã 1 nếu còn chuỗi thiếu bản dịch). Cũng được test tự động gọi.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Trong vitest (jsdom) import.meta.url không phải file: — khi đó chạy từ thư mục frontend/.
const isFile = import.meta.url.startsWith('file:');
const root = isFile ? join(dirname(fileURLToPath(import.meta.url)), '..') : process.cwd();
const VIETNAMESE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
// tr("…"), tr('…') hoặc tr(`…`) không nội suy; chấp nhận thêm đối số phía sau.
const LITERAL = /\btr\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([^`$\\]*)`)\s*[,)]/g;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (path.endsWith('.tsx')) yield path;
  }
}

const unescape = (text) => text.replace(/\\(['"\\])/g, '$1');
const normalize = (text) => text.replace(/\s+/g, ' ').trim();

/** Trả về { file, text }[] các chuỗi tr() tiếng Việt chưa có bản dịch khác chữ gốc. */
export function findMissing(catalog) {
  const missing = [];
  for (const base of ['components', 'app']) {
    for (const file of walk(join(root, base))) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(LITERAL)) {
        const text = normalize(unescape(match[1] ?? match[2] ?? match[3] ?? ''));
        if (!VIETNAMESE.test(text)) continue;
        const entry = catalog[text];
        if (!entry || !entry[0] || entry[0] === text) missing.push({ file: relative(root, file), text });
      }
    }
  }
  return missing;
}

// Chữ tiếng Việt nằm thẳng trong JSX (giữa > và <) mà không qua tr(). Chỉ báo, chưa chặn: code cũ còn nhiều.
const JSX_TEXT = />([^<>{}]*)</g;

export function findHardcoded() {
  const found = [];
  for (const base of ['components', 'app']) {
    for (const file of walk(join(root, base))) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(JSX_TEXT)) {
        const text = normalize(match[1]);
        // Bỏ đoạn mã TypeScript bị khớp nhầm (generic, so sánh, chú thích).
        if (VIETNAMESE.test(text) && !/[;()=]/.test(text)) found.push({ file: relative(root, file), text });
      }
    }
  }
  return found;
}

if (isFile && process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const catalog = JSON.parse(readFileSync(join(root, 'i18n/catalog.json'), 'utf8'));
  const missing = findMissing(catalog);
  const hardcoded = findHardcoded();
  if (hardcoded.length > 0) {
    console.warn(`i18n:check — CẢNH BÁO: ${hardcoded.length} chuỗi tiếng Việt viết thẳng trong JSX (chưa qua tr()):`);
    for (const { file, text } of hardcoded.slice(0, 20)) console.warn(`  ${file}: ${text}`);
    if (process.argv.includes('--strict')) process.exit(1);
  }
  if (missing.length === 0) {
    console.log('i18n:check — mọi chuỗi tr() đều có bản dịch.');
  } else {
    console.error(`i18n:check — ${missing.length} chuỗi chưa có bản dịch tiếng Anh:`);
    for (const { file, text } of missing) console.error(`  ${file}: ${text}`);
    process.exit(1);
  }
}
