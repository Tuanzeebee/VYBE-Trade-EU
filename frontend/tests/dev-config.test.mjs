import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import postcss from 'postcss';
import config from '../postcss.config.mjs';

const require = createRequire(import.meta.url);

test('PostCSS compiles Tailwind and browser prefixes with installed plugins', async () => {
  const plugins = Object.entries(config.plugins).map(([name, options]) => require(name)(options));
  const result = await postcss(plugins).process('@tailwind utilities; .probe { user-select: none; }', {
    from: 'app/globals.css',
  });
  assert.match(result.css, /\.flex\s*\{/);
  assert.match(result.css, /-webkit-user-select:\s*none/);
});

test('component sources parse as TypeScript JSX', async () => {
  for (const name of await readdir(new URL('../components/', import.meta.url))) {
    if (!name.endsWith('.tsx')) continue;
    const source = await readFile(new URL(`../components/${name}`, import.meta.url), 'utf8');
    const parsed = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.equal(parsed.parseDiagnostics.length, 0, name);
  }
});
