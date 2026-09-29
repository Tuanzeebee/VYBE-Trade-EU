import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import postcss from 'postcss';
import config from '../postcss.config.mjs';

const require = createRequire(import.meta.url);

test('buyer country suggestions filter and support keyboard selection without submitting', async () => {
  const source = await readFile(new URL('../components/BuyerOnboarding.tsx', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const state = [];
  let cursor = 0;
  const hooks = { ...React, useEffect: () => {}, useRef: () => ({ current: null }),
    useState: (initial) => {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], (value) => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
  };
  const exports = {};
  runInNewContext(outputText, { exports, require: (name) => {
    if (name === 'react') return hooks;
    if (name === 'lucide-react') return require(name);
    if (name.includes('LanguageContext')) return { useLanguage: () => ({ tr: (value) => value }) };
    return { default: () => null };
  } });
  function input() {
    cursor = 0;
    const tree = exports.default({ user: { company: 'Buyer', name: 'Buyer', email: 'buyer@example.com' } });
    function find(node) {
      if (!React.isValidElement(node)) return undefined;
      if (node.props.autoComplete === 'country-name') return node;
      return React.Children.toArray(node.props.children).map(find).find(Boolean);
    }
    return find(tree);
  }
  assert.equal(input().props.role, 'combobox');
  input().props.onFocus();
  input().props.onChange({ target: { value: 'ger' } });
  assert.equal(input().props['aria-expanded'], true);
  input().props.onKeyDown({ key: 'ArrowDown', preventDefault() {} });
  let prevented = false;
  input().props.onKeyDown({ key: 'Enter', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(input().props.value, 'Germany');
  assert.equal(input().props['aria-expanded'], false);
  input().props.onChange({ target: { value: 'Vietnam' } });
  assert.equal(input().props.value, 'Vietnam');
  assert.equal(input().props.required, true);
});

test('saved language does not change the first hydration render', async () => {
  const source = await readFile(new URL('../context/LanguageContext.tsx', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const render = (localStorage) => {
    const exports = {};
    runInNewContext(outputText, {
      exports, localStorage,
      require: (name) => name === 'react' ? React : { translateText: (value) => value },
    });
    const { LanguageProvider, useLanguage } = exports;
    function Navigation() {
      return React.createElement('button', null, useLanguage().t.nav.solutions);
    }
    return renderToStaticMarkup(React.createElement(LanguageProvider, null, React.createElement(Navigation)));
  };
  const server = render(undefined);
  assert.equal(server, '<button>Giải pháp</button>');
  for (const saved of ['en', 'fr', 'ja', 'invalid']) {
    assert.equal(render({ getItem: () => saved }), server, saved);
  }
  assert.equal(render({ getItem: () => { throw new Error('Storage blocked'); } }), server);
});

test('ESLint loads Next.js rules and catches explicit any in TSX', async () => {
  const { ESLint } = await import('eslint');
  const eslint = new ESLint();
  const [result] = await eslint.lintText('const value: any = 1; export default value;', {
    filePath: 'app/lint-probe.tsx',
  });
  assert.ok(result.messages.some(({ ruleId }) => ruleId === '@typescript-eslint/no-explicit-any'));
  const config = await eslint.calculateConfigForFile('app/lint-probe.tsx');
  assert.ok(config.rules['@next/next/no-img-element']);
});

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
