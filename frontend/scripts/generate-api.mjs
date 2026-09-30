// Sinh kiểu TypeScript cho client API từ OpenAPI của backend.
// Chạy sau MỌI thay đổi schema/route backend: npm run generate:api
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import openapiTS, { astToString } from 'openapi-typescript';

const backendDir = fileURLToPath(new URL('../../backend/', import.meta.url));
const outDir = new URL('../lib/api/', import.meta.url);

const exportScript =
  'import json, sys; from app.main import app; sys.stdout.write(json.dumps(app.openapi(), indent=2, ensure_ascii=False))';

const raw = execFileSync('uv', ['run', '--quiet', 'python', '-c', exportScript], {
  cwd: backendDir,
  encoding: 'utf8',
  // Docstring tiếng Việt: stdout Python trên Windows mặc định cp1252.
  env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
});
const spec = JSON.parse(raw);

writeFileSync(new URL('openapi.json', outDir), `${JSON.stringify(spec, null, 2)}\n`);
// Trường có giá trị mặc định ở backend là tùy chọn khi gửi lên.
const ast = await openapiTS(spec, { defaultNonNullable: false });
writeFileSync(
  new URL('schema.d.ts', outDir),
  `// File sinh tự động bởi scripts/generate-api.mjs — không sửa tay.\n${astToString(ast)}`,
);
console.log(`generate:api — ${Object.keys(spec.paths ?? {}).length} path`);
